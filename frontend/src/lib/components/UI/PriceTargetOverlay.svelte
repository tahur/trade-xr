<script lang="ts">
    import { gestureState } from "$lib/stores/gesture";
    import { tradingStore } from "$lib/stores/trading";
    import { twoHandPinch } from "$lib/stores/tracking";
    import { fade, scale } from "svelte/transition";
    import { onDestroy } from "svelte";

    export let minPrice: number;
    export let maxPrice: number;

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

    // === EMA SMOOTHING ===
    let smoothedHandY = 0.5;
    const EMA_ALPHA = 0.15; // Smoothing factor (lower = smoother, higher = responsive)

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
        state = "IDLE";
        lockedPrice = null;
        lockTime = null;
    }

    onDestroy(clearAllTimers);

    // === EMA SMOOTHED HAND POSITION ===
    $: {
        const rawY = $gestureState.handPosition.y;
        smoothedHandY = smoothedHandY + EMA_ALPHA * (rawY - smoothedHandY);
    }

    $: screenY = Math.max(8, Math.min(92, smoothedHandY * 100));

    // Is hand valid?
    $: isValidHand =
        $gestureState.isHandDetected &&
        $gestureState.numHandsDetected === 1 &&
        !$twoHandPinch.isActive;

    $: currentGesture = $gestureState.detectedGesture;
    $: isPinching = $gestureState.isPinching;

    // Price calculation with EMA
    function handYToPrice(y: number): number {
        const clamped = Math.max(0.1, Math.min(0.9, y));
        return minPrice + (maxPrice - minPrice) * (1 - clamped);
    }

    $: hoverPrice = handYToPrice(smoothedHandY);
    $: displayPrice = lockedPrice ?? hoverPrice;

    // === STATE MACHINE ===
    $: {
        // CANCEL: Closed Fist
        if (currentGesture === "Closed_Fist" && isValidHand) {
            resetState();
        }

        // IDLE → TARGETING
        else if (
            state === "IDLE" &&
            isValidHand &&
            $gestureState.isHandStable &&
            !isPinching
        ) {
            if (!entryDebounce) {
                entryDebounce = setTimeout(() => {
                    if ($gestureState.isHandDetected && state === "IDLE") {
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

        // TARGETING → LOCKED (pinch)
        else if (state === "TARGETING" && isPinching) {
            if (!lockDebounce) {
                lockDebounce = setTimeout(() => {
                    if ($gestureState.isPinching && state === "TARGETING") {
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
                        state === "LOCKED"
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
                orderDebounce = setTimeout(() => {
                    if (
                        $gestureState.detectedGesture === "Thumbs_Up" &&
                        state === "CONFIRMING"
                    ) {
                        if (lockedPrice) {
                            tradingStore.placeOrder("BUY", 1, lockedPrice);
                        }
                        state = "ORDER_PLACED";
                        setTimeout(resetState, 2500);
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

    // Visual states
    $: isTargeting = state === "TARGETING";
    $: isLocked =
        state === "LOCKED" ||
        state === "CONFIRMING" ||
        state === "ORDER_PLACED";
    $: showConfirmDialog = state === "CONFIRMING";
    $: showOrderSuccess = state === "ORDER_PLACED";
</script>

{#if state !== "IDLE"}
    <!-- === PRICE LINE === -->
    <div
        class="fixed left-0 right-0 pointer-events-none z-40 transition-all duration-75"
        style="top: {screenY}%"
    >
        <!-- Line -->
        <div
            class="h-0.5 w-full transition-colors duration-200 {isLocked
                ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent'
                : 'bg-gradient-to-r from-transparent via-violet-400 to-transparent'}"
            style="opacity: {isLocked ? 1 : 0.7}"
        ></div>

        <!-- === PRICE CARD (visionOS Glass) === -->
        <div
            class="absolute right-4 -translate-y-1/2 min-w-[140px]"
            transition:scale={{ duration: 150, start: 0.9 }}
        >
            <div
                class="relative px-5 py-4 rounded-2xl backdrop-blur-2xl border transition-all duration-300
                    {isLocked
                    ? 'bg-gradient-to-br from-emerald-500/30 via-emerald-400/20 to-cyan-500/10 border-emerald-400/40 shadow-[0_8px_32px_rgba(16,185,129,0.25)]'
                    : 'bg-gradient-to-br from-white/20 via-white/10 to-violet-500/10 border-white/30 shadow-[0_8px_32px_rgba(139,92,246,0.2)]'}"
            >
                <!-- Inner glow -->
                <div
                    class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-transparent pointer-events-none"
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
                    {:else if showConfirmDialog}
                        <span class="text-base animate-pulse">👍</span>
                        <span
                            class="text-xs font-semibold text-emerald-300 animate-pulse"
                        >
                            Thumbs up to buy!
                        </span>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
{/if}

<!-- === CONFIRMATION MODAL (visionOS Glass) === -->
{#if showConfirmDialog}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        transition:fade={{ duration: 150 }}
    >
        <div
            class="relative px-10 py-8 rounded-3xl backdrop-blur-3xl
                bg-gradient-to-br from-emerald-500/40 via-emerald-400/30 to-cyan-500/20
                border border-emerald-400/50 shadow-[0_25px_80px_rgba(16,185,129,0.4)]"
        >
            <!-- Inner glow -->
            <div
                class="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none"
            ></div>

            <div class="relative text-center">
                <div class="flex items-center justify-center gap-3 mb-3">
                    <span
                        class="px-3 py-1 rounded-lg bg-emerald-500/50 text-sm font-black uppercase text-white"
                    >
                        BUY
                    </span>
                    <span class="text-lg font-bold text-white/90"
                        >CONFIRM ORDER</span
                    >
                </div>
                <div
                    class="text-4xl font-mono font-black text-white drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                >
                    ₹{(lockedPrice ?? 0).toFixed(2)}
                </div>
                <div
                    class="mt-4 flex items-center justify-center gap-2 text-emerald-200/80 text-sm animate-pulse"
                >
                    <!-- Thumbs Up Icon -->
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                        />
                    </svg>
                    <span>Hold Thumbs Up</span>
                </div>
            </div>
        </div>
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
