<script lang="ts">
    import {
        gestureState,
        zoomCooldownActive,
        tradingHandPreference,
    } from "$lib/stores/gesture";
    import { twoHandPinch } from "$lib/stores/tracking";
    import { placeOrder } from "$lib/services/orderService";
    import { ema, EMA_PRESETS } from "$lib/utils/ema";
    import {
        gestureEngine,
        acquireTrading,
        acquireConfirming,
        releaseTrading,
    } from "$lib/services/gestureEngine";
    import { gestureBus } from "$lib/services/gestureBus";
    import { TIMING } from "$lib/config/timing";
    import DynamicConfirmZone from "./DynamicConfirmZone.svelte";
    import { fade, scale } from "svelte/transition";
    import { onMount, onDestroy } from "svelte";

    // Track if zoom is blocking us (from event bus)
    let isZoomBlocking = false;

    // Post-order cooldown to prevent re-triggering
    let orderCooldownActive = false;

    export let minPrice: number;
    export let maxPrice: number;
    export let ltp: number = 0; // Last Traded Price - center point
    export let symbol: string = "SILVERCASE"; // Current ETF symbol

    // Price range based on LTP (±5% range around LTP)
    $: priceRange = ltp > 0 ? ltp * 0.05 : (maxPrice - minPrice) / 2;
    $: effectiveMin = ltp > 0 ? ltp - priceRange : minPrice;
    $: effectiveMax = ltp > 0 ? ltp + priceRange : maxPrice;

    // === STATE MACHINE (BUY/SELL based on gesture) ===
    type State =
        | "IDLE"
        | "TARGETING"
        | "LOCKED"
        | "CONFIRMING"
        | "ORDER_PLACED";
    let state: State = "IDLE";
    let lockedPrice: number | null = null;
    let lockTime: number | null = null; // Track when locked for cooldown
    let confirmedOrderSide: "BUY" | "SELL" = "BUY"; // Track which gesture triggered order

    // === EMA SMOOTHING - FASTER for snappy response ===
    let smoothedHandY = 0.5;
    const EMA_ALPHA = EMA_PRESETS.SNAPPY; // 0.7 for fast response (was ULTRA_SMOOTH)

    // Debounce timers
    let entryDebounce: ReturnType<typeof setTimeout> | null = null;
    let lockDebounce: ReturnType<typeof setTimeout> | null = null;
    let confirmDebounce: ReturnType<typeof setTimeout> | null = null;
    let orderDebounce: ReturnType<typeof setTimeout> | null = null;

    // === TIMING CONSTANTS FROM CONFIG ===
    const ENTRY_DELAY_MS = TIMING.GESTURE.ENTRY_DELAY_MS;
    const LOCK_DELAY_MS = TIMING.GESTURE.LOCK_DELAY_MS;
    const CONFIRM_DELAY_MS = TIMING.GESTURE.CONFIRM_DELAY_MS;
    const ORDER_DELAY_MS = TIMING.GESTURE.ORDER_DELAY_MS;
    const POST_LOCK_COOLDOWN = TIMING.GESTURE.POST_LOCK_COOLDOWN; // Reduced cooldown (was 500ms)

    function clearAllTimers() {
        if (entryDebounce) clearTimeout(entryDebounce);
        if (lockDebounce) clearTimeout(lockDebounce);
        if (confirmDebounce) clearTimeout(confirmDebounce);
        if (orderDebounce) clearTimeout(orderDebounce);
        entryDebounce = lockDebounce = confirmDebounce = orderDebounce = null;
    }

    function resetState() {
        clearAllTimers();
        // Release trading context
        releaseTrading();
        state = "IDLE";
        lockedPrice = null;
        lockTime = null;
    }

    // Reset state WITH cooldown - prevents immediate re-triggering after order flow completes
    let cooldownTimer: ReturnType<typeof setTimeout> | null = null;
    function resetWithCooldown(cooldownMs: number = 3000) {
        resetState();
        orderCooldownActive = true;
        if (cooldownTimer) clearTimeout(cooldownTimer);
        cooldownTimer = setTimeout(() => {
            orderCooldownActive = false;
            cooldownTimer = null;
        }, cooldownMs);
    }

    onDestroy(clearAllTimers);

    // Subscribe to gestureBus for immediate zoom blocking
    let unsubZoomStart: (() => void) | null = null;
    let unsubZoomUpdate: (() => void) | null = null;
    let unsubZoomEnd: (() => void) | null = null;
    let zoomBlockingTimer: ReturnType<typeof setTimeout> | null = null;

    onMount(() => {
        // Zoom starts - immediately cancel any trading state
        unsubZoomStart = gestureBus.on("ZOOM_START", () => {
            isZoomBlocking = true;
            if (state !== "IDLE" && state !== "ORDER_PLACED") {
                resetState();
            }
        });

        // Also cancel on zoom update (in case we missed ZOOM_START)
        unsubZoomUpdate = gestureBus.on("ZOOM_UPDATE", () => {
            isZoomBlocking = true;
            if (state !== "IDLE" && state !== "ORDER_PLACED") {
                resetState();
            }
        });

        // Zoom ends - allow trading after cooldown
        unsubZoomEnd = gestureBus.on("ZOOM_END", () => {
            // Keep blocking for cooldown period
            if (zoomBlockingTimer) clearTimeout(zoomBlockingTimer);
            zoomBlockingTimer = setTimeout(() => {
                isZoomBlocking = false;
                zoomBlockingTimer = null;
            }, 300); // Match ZOOM_COOLDOWN_MS
        });
    });

    onDestroy(() => {
        unsubZoomStart?.();
        unsubZoomUpdate?.();
        unsubZoomEnd?.();
        if (cooldownTimer) clearTimeout(cooldownTimer);
        if (zoomBlockingTimer) clearTimeout(zoomBlockingTimer);
    });

    // === EMA SMOOTHED HAND POSITION ===
    $: {
        const rawY = $gestureState.handPosition.y;
        smoothedHandY = ema(rawY, smoothedHandY, EMA_ALPHA);
    }

    $: screenY = Math.max(8, Math.min(92, smoothedHandY * 100));

    // Is hand valid? Block during zoom cooldown and check hand preference
    // CRITICAL: Use BOTH store check AND event-based flag for reliable blocking
    $: isZooming =
        $twoHandPinch.isActive ||
        $zoomCooldownActive ||
        isZoomBlocking ||
        $gestureState.numHandsDetected >= 2;
    $: isPreferredHand =
        $gestureState.primaryHandSide === $tradingHandPreference;
    $: isValidHand =
        $gestureState.isHandDetected &&
        $gestureState.numHandsDetected === 1 &&
        isPreferredHand &&
        !isZooming;

    // Combined check including order cooldown and engine lock
    function canActivate(): boolean {
        return (
            isValidHand &&
            !orderCooldownActive &&
            gestureEngine.canAcquire("TRADING")
        );
    }

    $: currentGesture = $gestureState.detectedGesture;
    $: isPinching = $gestureState.isPinching;

    // Price calculation with EMA - LTP centered
    // Hand at center (y=0.5) = LTP
    // Hand above (y<0.5) = price above LTP
    // Hand below (y>0.5) = price below LTP
    function handYToPrice(y: number): number {
        const clamped = Math.max(0.1, Math.min(0.9, y));
        // Invert Y so higher hand = higher price
        // Center at 0.5 = LTP
        return effectiveMin + (effectiveMax - effectiveMin) * (1 - clamped);
    }

    $: hoverPrice = handYToPrice(smoothedHandY);
    $: displayPrice = lockedPrice ?? hoverPrice;
    $: priceOffset = ltp > 0 ? displayPrice - ltp : 0;
    $: priceOffsetPercent = ltp > 0 ? (priceOffset / ltp) * 100 : 0;

    // === STATE MACHINE ===
    $: {
        // CANCEL: Closed Fist
        if (currentGesture === "Closed_Fist" && isValidHand) {
            resetState();
        }

        // IDLE → TARGETING (only with Pointing_Up gesture)
        else if (
            state === "IDLE" &&
            canActivate() &&
            currentGesture === "Pointing_Up" &&
            $gestureState.isHandStable &&
            !isPinching
        ) {
            if (!entryDebounce) {
                entryDebounce = setTimeout(() => {
                    if (
                        $gestureState.isHandDetected &&
                        $gestureState.detectedGesture === "Pointing_Up" &&
                        state === "IDLE" &&
                        acquireTrading()
                    ) {
                        state = "TARGETING";
                    }
                    entryDebounce = null;
                }, ENTRY_DELAY_MS);
            }
        } else if (state === "IDLE" && entryDebounce && !isValidHand) {
            clearTimeout(entryDebounce);
            entryDebounce = null;
        }

        // TARGETING → IDLE (hand lost)
        else if (state === "TARGETING" && !isValidHand) {
            resetState();
        }

        // TARGETING → LOCKED (pinch + STABLE HAND)
        else if (state === "TARGETING" && isPinching) {
            // CRITICAL: Prevent locking if hand is moving fast (swiping)
            const isStable = $gestureState.isHandStable;

            if (isStable && !lockDebounce) {
                lockDebounce = setTimeout(() => {
                    if (
                        $gestureState.isPinching &&
                        state === "TARGETING" &&
                        $gestureState.isHandStable // Check again after delay
                    ) {
                        lockedPrice = hoverPrice;
                        lockTime = Date.now(); // Track when locked
                        state = "LOCKED";
                    }
                    lockDebounce = null;
                }, LOCK_DELAY_MS);
            }
        } else if (state === "TARGETING" && !isPinching && lockDebounce) {
            clearTimeout(lockDebounce);
            lockDebounce = null;
        }

        // LOCKED → CONFIRMING (Point Up - after cooldown and pinch released)
        else if (
            state === "LOCKED" &&
            currentGesture === "Pointing_Up" &&
            !isPinching &&
            lockTime !== null &&
            Date.now() - lockTime > POST_LOCK_COOLDOWN
        ) {
            if (!confirmDebounce) {
                confirmDebounce = setTimeout(() => {
                    if (
                        $gestureState.detectedGesture === "Pointing_Up" &&
                        !$gestureState.isPinching &&
                        state === "LOCKED" &&
                        acquireConfirming()
                    ) {
                        state = "CONFIRMING";
                    }
                    confirmDebounce = null;
                }, CONFIRM_DELAY_MS);
            }
        } else if (
            state === "LOCKED" &&
            (currentGesture !== "Pointing_Up" || isPinching) &&
            confirmDebounce
        ) {
            clearTimeout(confirmDebounce);
            confirmDebounce = null;
        }

        // CONFIRMING → ORDER_PLACED (Thumbs Up = BUY, Thumbs Down = SELL)
        else if (
            state === "CONFIRMING" &&
            (currentGesture === "Thumbs_Up" || currentGesture === "Thumbs_Down")
        ) {
            if (!orderDebounce) {
                const gestureForOrder = currentGesture; // Capture current gesture
                orderDebounce = setTimeout(async () => {
                    const currentG = $gestureState.detectedGesture;
                    if (
                        (currentG === "Thumbs_Up" ||
                            currentG === "Thumbs_Down") &&
                        state === "CONFIRMING"
                    ) {
                        if (lockedPrice) {
                            // Determine side based on gesture
                            const orderSide =
                                currentG === "Thumbs_Up" ? "BUY" : "SELL";
                            confirmedOrderSide = orderSide;

                            // Use centralized order service - await result
                            const result = await placeOrder({
                                symbol,
                                side: orderSide,
                                quantity: 1,
                                price: lockedPrice,
                            });

                            if (result.success) {
                                state = "ORDER_PLACED";
                                // Show success modal, then reset with cooldown
                                setTimeout(() => resetWithCooldown(), 2500);
                            } else {
                                // Order failed - reset with cooldown to prevent immediate re-trigger
                                resetWithCooldown();
                            }
                        }
                    }
                    orderDebounce = null;
                }, ORDER_DELAY_MS);
            }
        } else if (
            state === "CONFIRMING" &&
            currentGesture !== "Thumbs_Up" &&
            currentGesture !== "Thumbs_Down" &&
            orderDebounce
        ) {
            clearTimeout(orderDebounce);
            orderDebounce = null;
        }

        // CONFIRMING → LOCKED: Only go back on explicit cancel (Closed_Fist) or hand lost
        // This allows grace period when transitioning from Point_Up to Thumbs_Up
        else if (
            state === "CONFIRMING" &&
            (currentGesture === "Closed_Fist" || !isValidHand)
        ) {
            if (currentGesture === "Closed_Fist") {
                resetState();
            } else {
                state = "LOCKED";
            }
        }
    }

    // === DYNAMIC ZONE HANDLERS ===
    async function handleConfirmZoneConfirm() {
        if (lockedPrice && state === "CONFIRMING") {
            // Determine order side based on current gesture
            const currentG = $gestureState.detectedGesture;
            const orderSide = currentG === "Thumbs_Down" ? "SELL" : "BUY";
            confirmedOrderSide = orderSide;

            const result = await placeOrder({
                symbol,
                side: orderSide,
                quantity: 1,
                price: lockedPrice,
            });

            if (result.success) {
                state = "ORDER_PLACED";
                // Show success modal, then reset with cooldown
                setTimeout(() => resetWithCooldown(), 2500);
            } else {
                // Order failed - reset with cooldown to prevent immediate re-trigger
                resetWithCooldown();
            }
        }
    }

    function handleConfirmZoneCancel() {
        if (state === "CONFIRMING") {
            resetState();
        }
    }

    // Visual states
    $: isTargeting = state === "TARGETING";
    $: isLocked =
        state === "LOCKED" ||
        state === "CONFIRMING" ||
        state === "ORDER_PLACED";
    $: showConfirmZone = state === "CONFIRMING";
    $: showOrderSuccess = state === "ORDER_PLACED";
</script>

<!-- Dynamic Confirmation Zone -->
<DynamicConfirmZone
    isActive={showConfirmZone}
    orderDetails={lockedPrice
        ? {
              side:
                  $gestureState.detectedGesture === "Thumbs_Down"
                      ? "SELL"
                      : "BUY",
              quantity: 1,
              price: lockedPrice,
          }
        : null}
    on:confirm={handleConfirmZoneConfirm}
    on:cancel={handleConfirmZoneCancel}
/>

{#if state !== "IDLE" && state !== "ORDER_PLACED"}
    <!-- === HOLOGRAPHIC TARGETING LINE === -->
    <div
        class="fixed left-0 right-0 pointer-events-none z-40"
        style="top: 0; transform: translateY({screenY}vh); will-change: transform;"
    >
        <!-- Main Line with Glow -->
        <div class="relative">
            <!-- Glow Layer -->
            <div
                class="absolute inset-0 h-1 blur-sm transition-all duration-300
                    {state === 'CONFIRMING'
                    ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent'
                    : isLocked
                      ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent' // Locked = Cyan (Neutral/Frozen)
                      : 'bg-gradient-to-r from-transparent via-violet-500 to-transparent'}"
                style="opacity: {isLocked ? 0.8 : 0.5}"
            ></div>
            <!-- Core Line -->
            <div
                class="h-[2px] w-full transition-colors duration-200
                    {state === 'CONFIRMING'
                    ? 'bg-gradient-to-r from-transparent via-amber-300 to-transparent'
                    : isLocked
                      ? 'bg-gradient-to-r from-transparent via-cyan-300 to-transparent' // Locked = Cyan
                      : 'bg-gradient-to-r from-transparent via-violet-400 to-transparent'}"
            ></div>
        </div>

        {#if !showOrderSuccess}
            <!-- === CENTERED HUD INSTRUCTION === -->
            <div
                class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                transition:scale={{ duration: 150, start: 0.9 }}
            >
                <div
                    class="px-5 py-2 backdrop-blur-xl rounded-full border flex items-center gap-3 shadow-2xl
                        {state === 'CONFIRMING'
                        ? 'bg-amber-950/60 border-amber-500/40' // Confirming = Amber (Warning/Action)
                        : state === 'LOCKED'
                          ? 'bg-cyan-950/60 border-cyan-500/40' // Locked = Cyan (Neutral/Ready)
                          : 'bg-slate-950/60 border-violet-500/40'}"
                >
                    {#if isTargeting}
                        <span class="text-lg">👌</span>
                        <span
                            class="text-xs font-bold uppercase tracking-widest text-violet-300"
                        >
                            Pinch to Lock
                        </span>
                    {:else if state === "LOCKED"}
                        <span class="text-lg">☝️</span>
                        <span
                            class="text-xs font-bold uppercase tracking-widest text-cyan-300"
                        >
                            Point Up to Confirm
                        </span>
                    {:else if showConfirmZone}
                        <span class="text-lg animate-pulse">👍/👎</span>
                        <span
                            class="text-xs font-bold uppercase tracking-widest text-amber-300 animate-pulse"
                        >
                            Hold: UP=Buy / DOWN=Sell
                        </span>
                    {/if}
                </div>
            </div>

            <!-- === PRICE TAG (Premium Right-Side Design) === -->
            <div
                class="absolute right-0 -translate-y-1/2 flex items-center"
                transition:fade={{ duration: 150 }}
            >
                <!-- Holographic Price Plate -->
                <!-- Holographic Price Plate -->
                <div
                    class="relative pl-6 pr-5 py-3 rounded-l-2xl border-y border-l backdrop-blur-xl shadow-2xl
                        {state === 'LOCKED' || state === 'CONFIRMING'
                        ? 'bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-violet-500/50' // Locked/Confirming = Violet
                        : state === 'ORDER_PLACED'
                          ? confirmedOrderSide === 'BUY'
                              ? 'bg-gradient-to-r from-emerald-950/80 to-emerald-900/60 border-emerald-500/50'
                              : 'bg-gradient-to-r from-rose-950/80 to-rose-900/60 border-rose-500/50'
                          : 'bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-violet-500/40'}"
                >
                    <!-- Inner Shine -->
                    <div
                        class="absolute inset-0 rounded-l-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"
                    ></div>

                    <!-- Status Badge -->
                    <div class="flex items-center gap-2 mb-1">
                        {#if isLocked}
                            <!-- Locked State (Neutral/Ready) -->
                            <span
                                class="px-2 py-0.5 rounded-md bg-violet-500/30 text-[9px] font-black uppercase tracking-wider text-violet-300 border border-violet-500/30"
                            >
                                LOCKED
                            </span>
                            <svg
                                class="w-3 h-3 text-violet-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="2.5"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                                />
                            </svg>
                        {:else}
                            <svg
                                class="w-3 h-3 text-violet-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="2"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                />
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                            <span
                                class="text-[10px] font-semibold uppercase tracking-wider text-violet-400/80"
                            >
                                Target
                            </span>
                        {/if}
                    </div>

                    <!-- Price Value -->
                    <div class="flex items-baseline gap-1">
                        <span
                            class="text-sm font-medium {isLocked
                                ? 'text-violet-400/60'
                                : 'text-violet-400/60'}">₹</span
                        >
                        <span
                            class="text-3xl font-mono font-black tracking-tight text-white
                            {isLocked
                                ? 'drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]'
                                : 'drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]'}"
                        >
                            {displayPrice.toFixed(2)}
                        </span>
                    </div>

                    <!-- Delta from LTP -->
                    {#if ltp > 0}
                        <div
                            class="flex items-center gap-2 mt-1 text-[10px] font-mono"
                        >
                            <span class="text-white/30">vs LTP</span>
                            <span
                                class={priceOffset >= 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"}
                            >
                                {priceOffset >= 0
                                    ? "+"
                                    : ""}{priceOffset.toFixed(2)}
                            </span>
                            <span class="text-white/20">|</span>
                            <span
                                class={priceOffset >= 0
                                    ? "text-emerald-400/60"
                                    : "text-rose-400/60"}
                            >
                                {priceOffsetPercent >= 0
                                    ? "+"
                                    : ""}{priceOffsetPercent.toFixed(2)}%
                            </span>
                        </div>
                    {/if}
                </div>

                <!-- Edge Connector -->
                <div
                    class="w-1 h-10 {isLocked
                        ? 'bg-cyan-500/50'
                        : 'bg-violet-500/40'} rounded-r"
                ></div>
            </div>

            <!-- === CANCEL HINT (Left Side) === -->
            <div
                class="absolute left-4 -translate-y-1/2"
                transition:fade={{ duration: 100 }}
            >
                <div
                    class="px-3 py-1.5 rounded-lg bg-slate-950/50 backdrop-blur-sm border border-white/10 text-[10px] text-white/40 font-medium"
                >
                    ✊ Fist to cancel
                </div>
            </div>
        {/if}
    </div>
{/if}

<!-- === SUCCESS MODAL (Premium Holographic) === -->
{#if showOrderSuccess}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        transition:scale={{ duration: 250, start: 0.9, opacity: 0 }}
    >
        <div
            class="relative px-12 py-10 rounded-[32px] backdrop-blur-2xl
                {confirmedOrderSide === 'BUY'
                ? 'bg-gradient-to-br from-emerald-950/90 via-emerald-900/80 to-cyan-950/70 border-emerald-400/40 shadow-[0_0_60px_rgba(16,185,129,0.4)]'
                : 'bg-gradient-to-br from-rose-950/90 via-rose-900/80 to-purple-950/70 border-rose-400/40 shadow-[0_0_60px_rgba(244,63,94,0.4)]'}"
        >
            <!-- Ambient Glow -->
            <div
                class="absolute inset-0 blur-3xl -z-10 rounded-full
                {confirmedOrderSide === 'BUY'
                    ? 'bg-emerald-500/10'
                    : 'bg-rose-500/10'}"
            ></div>

            <!-- Inner Shine -->
            <div
                class="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none"
            ></div>

            <div class="relative text-center flex flex-col items-center">
                <!-- Animated Checkmark Ring -->
                <div class="mb-5 relative">
                    <div
                        class="absolute inset-0 blur-xl rounded-full animate-pulse
                        {confirmedOrderSide === 'BUY'
                            ? 'bg-emerald-500/30'
                            : 'bg-rose-500/30'}"
                    ></div>
                    <div
                        class="w-20 h-20 rounded-full border-2 flex items-center justify-center relative z-10
                        {confirmedOrderSide === 'BUY'
                            ? 'bg-emerald-500/20 border-emerald-400/60'
                            : 'bg-rose-500/20 border-rose-400/60'}"
                    >
                        {#if confirmedOrderSide === "BUY"}
                            <svg
                                class="w-10 h-10 text-emerald-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="3"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M4.5 12.75l6 6 9-13.5"
                                />
                            </svg>
                        {:else}
                            <!-- Sell Icon / Down Arrow -->
                            <svg
                                class="w-10 h-10 text-rose-300 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="3"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
                                />
                            </svg>
                        {/if}
                    </div>
                </div>

                <div
                    class="text-3xl font-black text-white tracking-tight mb-1
                    {confirmedOrderSide === 'BUY'
                        ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'}"
                >
                    {confirmedOrderSide === "BUY"
                        ? "BUY ORDER SENT"
                        : "SELL ORDER SENT"}
                </div>
                <div
                    class="text-[11px] font-semibold uppercase tracking-[0.2em] mb-4
                    {confirmedOrderSide === 'BUY'
                        ? 'text-emerald-300/70'
                        : 'text-rose-300/70'}"
                >
                    Executed Successfully
                </div>

                <div
                    class="px-6 py-3 rounded-xl bg-slate-950/50 flex flex-col items-center gap-1
                    {confirmedOrderSide === 'BUY'
                        ? 'border border-emerald-500/30'
                        : 'border border-rose-500/30'}"
                >
                    <span
                        class="text-[10px] uppercase font-bold tracking-wider
                        {confirmedOrderSide === 'BUY'
                            ? 'text-emerald-400/60'
                            : 'text-rose-400/60'}">Fill Price</span
                    >
                    <span
                        class="text-2xl font-mono font-black tracking-tight
                        {confirmedOrderSide === 'BUY'
                            ? 'text-emerald-200 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                            : 'text-rose-200 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]'}"
                    >
                        ₹{(lockedPrice ?? 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    </div>
{/if}
