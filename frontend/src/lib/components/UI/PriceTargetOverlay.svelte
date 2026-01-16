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
    <div
        class="fixed left-0 right-0 pointer-events-none z-40"
        style="top: 0; transform: translateY({screenY}vh); will-change: transform;"
    >
        <!-- Holographic Line -->
        <div
            class="h-[1px] w-full transition-colors duration-200
                {state === 'CONFIRMING'
                ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                : isLocked
                  ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'bg-gradient-to-r from-transparent via-violet-500/50 to-transparent'}"
            style="opacity: {isLocked || state === 'CONFIRMING' ? 1 : 0.6}"
        ></div>

        {#if !showOrderSuccess}
            <!-- === CENTER INSTRUCTION (HUD Style) === -->
            <!-- Placed directly on the line for minimal eye travel -->
            <div
                class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-2"
                transition:scale={{ duration: 150, start: 0.9 }}
            >
                {#if isTargeting}
                    <div
                        class="px-4 py-1.5 bg-[#020617]/70 backdrop-blur-md border border-violet-500/30 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    >
                        <span
                            class="text-[10px] uppercase font-bold text-violet-300 tracking-widest"
                            >Pinch to Lock</span
                        >
                    </div>
                {:else if isLocked}
                    <div
                        class="px-4 py-1.5 bg-[#020617]/70 backdrop-blur-md border border-emerald-500/30 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    >
                        <span class="text-xl">☝️</span>
                        <span
                            class="text-[10px] uppercase font-bold text-emerald-400 tracking-widest"
                            >Point Up</span
                        >
                    </div>
                {:else if showConfirmZone}
                    <!-- Minimal indicator - zone itself handles the heavy lifting -->
                {/if}
            </div>

            <!-- === PRICE TAG (Right Side - Compact Hologram) === -->
            <div
                class="absolute right-0 -translate-y-1/2 flex items-center pr-1"
                transition:fade={{ duration: 150 }}
            >
                <!-- Holographic Plate -->
                <div
                    class="relative pl-5 pr-6 py-2 bg-[#020617]/80 backdrop-blur-md border border-violet-500/30 border-r-0 rounded-l-2xl shadow-[-5px_0_20px_rgba(139,92,246,0.1)] flex flex-col items-end"
                >
                    <!-- Value -->
                    <div class="flex items-baseline gap-1">
                        <span class="text-xs font-medium text-violet-400/60"
                            >₹</span
                        >
                        <span
                            class="text-2xl font-mono font-bold tracking-tighter text-white drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                        >
                            {displayPrice.toFixed(2)}
                        </span>
                    </div>

                    <!-- Delta -->
                    {#if ltp > 0}
                        <div
                            class="flex items-center gap-2 text-[9px] font-mono tracking-wide"
                        >
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
                            <span class="text-violet-300/50">
                                {priceOffsetPercent.toFixed(2)}%
                            </span>
                        </div>
                    {/if}
                </div>

                <!-- Tick Indicator -->
                <div
                    class="h-8 w-[2px] bg-violet-500/30 ml-2 rounded-full"
                ></div>
            </div>
        {/if}
    </div>
{/if}

<!-- === SUCCESS MODAL (Premium Dark Glass) === -->
<!-- === SUCCESS MODAL (Holographic HUD) === -->
<!-- === SUCCESS MODAL (Holographic HUD - Violet) === -->
{#if showOrderSuccess}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        transition:scale={{ duration: 250, start: 0.9, opacity: 0 }}
    >
        <div
            class="relative px-10 py-8 rounded-[24px] backdrop-blur-md
                bg-[#020617]/70
                border border-violet-500/40 shadow-[0_0_40px_rgba(139,92,246,0.2)]"
        >
            <!-- Ambient Glow behind -->
            <div
                class="absolute inset-0 bg-violet-500/5 blur-3xl -z-10 rounded-full"
            ></div>

            <div class="relative text-center flex flex-col items-center">
                <!-- Success Checkmark Ring -->
                <div class="mb-4 relative">
                    <div
                        class="absolute inset-0 bg-violet-500/20 blur-xl rounded-full animate-pulse"
                    ></div>
                    <div
                        class="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/50 flex items-center justify-center relative z-10 box-shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                    >
                        <svg
                            class="w-8 h-8 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]"
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
                    </div>
                </div>

                <div
                    class="text-2xl font-black text-white tracking-tight mb-0.5 drop-shadow-[0_0_5px_rgba(139,92,246,0.5)]"
                >
                    ORDER SENT
                </div>
                <div
                    class="text-[10px] font-semibold text-violet-300/60 uppercase tracking-widest mb-3"
                >
                    Executed Successfully
                </div>

                <div
                    class="px-5 py-2 rounded-lg bg-[#020617]/50 border border-violet-500/20 flex flex-col items-center gap-0.5"
                >
                    <span
                        class="text-[9px] text-violet-400/50 uppercase font-bold tracking-wider"
                        >Fill Price</span
                    >
                    <span
                        class="text-xl font-mono font-bold text-violet-300 tracking-tight drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                    >
                        ₹{(lockedPrice ?? 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    </div>
{/if}
