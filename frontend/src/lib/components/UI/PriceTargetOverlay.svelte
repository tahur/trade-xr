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

    // === STATE MACHINE (BUY ONLY) ===
    type State =
        | "IDLE"
        | "TARGETING"
        | "LOCKED"
        | "CONFIRMING"
        | "ORDER_PLACED";
    let state: State = "IDLE";
    let lockedPrice: number | null = null;
    let lockTime: number | null = null; // Track when locked for cooldown

    // === EMA SMOOTHING - FASTER for snappy response ===
    let smoothedHandY = 0.5;
    const EMA_ALPHA = EMA_PRESETS.SNAPPY; // 0.7 for fast response (was ULTRA_SMOOTH)

    // Debounce timers
    let entryDebounce: ReturnType<typeof setTimeout> | null = null;
    let lockDebounce: ReturnType<typeof setTimeout> | null = null;
    let confirmDebounce: ReturnType<typeof setTimeout> | null = null;
    let orderDebounce: ReturnType<typeof setTimeout> | null = null;

    // === TIMING CONSTANTS ===
    const ENTRY_DELAY_MS = 200;
    const LOCK_DELAY_MS = 350;
    const CONFIRM_DELAY_MS = 400; // Faster confirm transition
    const ORDER_DELAY_MS = 500; // Faster thumbs up response (was 800ms)
    const POST_LOCK_COOLDOWN = 400; // Reduced cooldown (was 500ms)

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

    onDestroy(clearAllTimers);

    // Subscribe to gestureBus for immediate zoom blocking
    let unsubZoomStart: (() => void) | null = null;
    let unsubZoomEnd: (() => void) | null = null;

    onMount(() => {
        // Zoom starts - immediately cancel any trading state
        unsubZoomStart = gestureBus.on("ZOOM_START", () => {
            isZoomBlocking = true;
            if (state !== "IDLE" && state !== "ORDER_PLACED") {
                resetState();
            }
        });

        // Also cancel on zoom update (in case we missed ZOOM_START)
        gestureBus.on("ZOOM_UPDATE", () => {
            isZoomBlocking = true;
            if (state !== "IDLE" && state !== "ORDER_PLACED") {
                resetState();
            }
        });

        // Zoom ends - allow trading after cooldown
        unsubZoomEnd = gestureBus.on("ZOOM_END", () => {
            // Keep blocking for cooldown period
            setTimeout(() => {
                isZoomBlocking = false;
            }, 300); // Match ZOOM_COOLDOWN_MS
        });
    });

    onDestroy(() => {
        unsubZoomStart?.();
        unsubZoomEnd?.();
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

        // IDLE → TARGETING (only when not in order cooldown)
        else if (
            state === "IDLE" &&
            canActivate() &&
            $gestureState.isHandStable &&
            !isPinching
        ) {
            if (!entryDebounce) {
                entryDebounce = setTimeout(() => {
                    if (
                        $gestureState.isHandDetected &&
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

        // CONFIRMING → ORDER_PLACED (Thumbs Up)
        else if (state === "CONFIRMING" && currentGesture === "Thumbs_Up") {
            if (!orderDebounce) {
                orderDebounce = setTimeout(async () => {
                    if (
                        $gestureState.detectedGesture === "Thumbs_Up" &&
                        state === "CONFIRMING"
                    ) {
                        if (lockedPrice) {
                            // Use centralized order service - await result
                            const result = await placeOrder({
                                symbol,
                                side: "BUY",
                                quantity: 1,
                                price: lockedPrice,
                            });

                            if (result.success) {
                                state = "ORDER_PLACED";
                                // Activate post-order cooldown to prevent re-triggering
                                orderCooldownActive = true;
                                setTimeout(() => {
                                    orderCooldownActive = false;
                                }, 3000);
                                setTimeout(resetState, 2500);
                            } else {
                                // Order failed - go back to LOCKED state
                                state = "LOCKED";
                            }
                        }
                    }
                    orderDebounce = null;
                }, ORDER_DELAY_MS);
            }
        } else if (
            state === "CONFIRMING" &&
            currentGesture !== "Thumbs_Up" &&
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
            const result = await placeOrder({
                symbol,
                side: "BUY",
                quantity: 1,
                price: lockedPrice,
            });

            if (result.success) {
                state = "ORDER_PLACED";
                orderCooldownActive = true;
                setTimeout(() => {
                    orderCooldownActive = false;
                }, 3000);
                setTimeout(resetState, 2500);
            } else {
                // Order failed - go back to LOCKED state
                state = "LOCKED";
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
        ? { side: "BUY", quantity: 1, price: lockedPrice }
        : null}
    on:confirm={handleConfirmZoneConfirm}
    on:cancel={handleConfirmZoneCancel}
/>

{#if state !== "IDLE"}
    <!-- === PRICE LINE - GPU accelerated === -->
    <div
        class="fixed left-0 right-0 pointer-events-none z-40"
        style="top: 0; transform: translateY({screenY}vh); will-change: transform;"
    >
        <!-- Line -->
        <div
            class="h-0.5 w-full transition-colors duration-200
                {state === 'CONFIRMING'
                ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent'
                : isLocked
                  ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-violet-400 to-transparent'}"
            style="opacity: {isLocked || state === 'CONFIRMING' ? 1 : 0.7}"
        ></div>

        <!-- === HINT TEXT ON LINE (Above & Below) - Right side before card === -->
        {#if !showOrderSuccess}
            <!-- Above Line - Next Action -->
            <div
                class="absolute right-[160px] -top-6 text-[11px] font-semibold text-right
                {state === 'CONFIRMING'
                    ? 'text-amber-400'
                    : isLocked
                      ? 'text-emerald-400'
                      : 'text-violet-400'}"
            >
                {#if state === "CONFIRMING"}
                    👍 Hold in zone
                {:else if isLocked}
                    ☝️ Point up to confirm
                {:else}
                    👌 Pinch to lock
                {/if}
            </div>

            <!-- Below Line - Cancel hint -->
            <div
                class="absolute right-[160px] top-3 text-[10px] text-white/30 text-right"
            >
                ✊ Fist to cancel
            </div>
        {/if}

        <!-- === PRICE CARD (visionOS Glass) === -->
        <div
            class="absolute right-4 -translate-y-1/2 min-w-[140px]"
            transition:scale={{ duration: 150, start: 0.9 }}
        >
            <div
                class="relative px-5 py-4 rounded-2xl backdrop-blur-md border
                    {isLocked
                    ? 'bg-emerald-500/25 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
                    : 'bg-white/15 border-white/30 shadow-lg shadow-violet-500/15'}"
                style="will-change: transform, opacity;"
            >
                <!-- Inner glow -->
                <div
                    class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none"
                ></div>

                <!-- Status Label -->
                <div class="relative flex items-center gap-2 mb-1">
                    {#if showOrderSuccess}
                        <svg
                            class="w-3.5 h-3.5 text-emerald-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="2.5"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                            />
                        </svg>
                        <span
                            class="text-[10px] font-black uppercase tracking-wider text-emerald-300"
                        >
                            ORDER PLACED
                        </span>
                    {:else if isLocked}
                        <span
                            class="px-2 py-0.5 rounded-md bg-emerald-500/40 text-[9px] font-black uppercase tracking-wider text-emerald-200"
                        >
                            BUY
                        </span>
                        <svg
                            class="w-3 h-3 text-emerald-400"
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
                        <span
                            class="text-[10px] font-bold uppercase tracking-wider text-emerald-200/80"
                        >
                            LOCKED
                        </span>
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
                            class="text-[10px] font-bold uppercase tracking-wider text-violet-200/80"
                        >
                            TARGET PRICE
                        </span>
                    {/if}
                </div>

                <!-- Price -->
                <div
                    class="relative text-2xl font-mono font-black tracking-tight
                        {isLocked
                        ? 'text-white drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'text-white/90'}"
                >
                    ₹{displayPrice.toFixed(2)}
                </div>

                <!-- Price Offset Indicator (subtle) -->
                {#if ltp > 0 && !showOrderSuccess}
                    <div
                        class="mt-1 flex items-center gap-1.5 text-[11px] font-mono"
                    >
                        <span class="text-white/40">LTP</span>
                        <span
                            class={priceOffset >= 0
                                ? "text-emerald-400"
                                : "text-red-400"}
                        >
                            {priceOffset >= 0 ? "+" : ""}{priceOffset.toFixed(
                                2,
                            )}
                        </span>
                        <span class="text-white/30">
                            ({priceOffset >= 0
                                ? "+"
                                : ""}{priceOffsetPercent.toFixed(1)}%)
                        </span>
                    </div>
                {/if}
            </div>
        </div>

        <!-- === HINT CARD (Left Side) === -->
        {#if !showOrderSuccess}
            <div
                class="absolute left-4 -translate-y-1/2"
                transition:fade={{ duration: 100 }}
            >
                <div
                    class="px-4 py-2 rounded-xl backdrop-blur-xl bg-black/40 border border-white/10 flex items-center gap-2"
                >
                    {#if isTargeting}
                        <span class="text-base">👌</span>
                        <span class="text-xs font-semibold text-violet-300">
                            Pinch to lock price
                        </span>
                    {:else if state === "LOCKED"}
                        <span class="text-base">☝️</span>
                        <span class="text-xs font-semibold text-emerald-300">
                            Point up to confirm
                        </span>
                    {:else if showConfirmZone}
                        <span class="text-base animate-pulse">👍</span>
                        <span
                            class="text-xs font-semibold text-emerald-300 animate-pulse"
                        >
                            Hold thumbs up in zone!
                        </span>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
{/if}

<!-- === SUCCESS MODAL === -->
{#if showOrderSuccess}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        transition:scale={{ duration: 200, start: 0.8 }}
    >
        <div
            class="relative px-14 py-10 rounded-3xl backdrop-blur-3xl
                bg-gradient-to-br from-emerald-500/50 via-green-400/40 to-cyan-500/30
                border border-emerald-300/60 shadow-[0_30px_100px_rgba(16,185,129,0.5)]"
        >
            <div
                class="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/15 to-transparent pointer-events-none"
            ></div>

            <div class="relative text-center">
                <!-- Success Checkmark Icon -->
                <div class="flex items-center justify-center mb-4">
                    <div
                        class="w-16 h-16 rounded-full bg-emerald-500/30 flex items-center justify-center"
                    >
                        <svg
                            class="w-10 h-10 text-emerald-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="2.5"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                            />
                        </svg>
                    </div>
                </div>
                <div class="text-2xl font-black text-white">ORDER PLACED</div>
                <div class="text-xl font-mono font-bold text-emerald-100 mt-2">
                    ₹{(lockedPrice ?? 0).toFixed(2)}
                </div>
            </div>
        </div>
    </div>
{/if}
