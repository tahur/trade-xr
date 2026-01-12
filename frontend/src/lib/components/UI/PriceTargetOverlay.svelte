<script lang="ts">
    import { gestureState, tradingHandPreference } from "$lib/stores/gesture";
    import { twoHandPinch } from "$lib/stores/tracking";
    import { fade } from "svelte/transition";
    import { onDestroy } from "svelte";

    export let minPrice: number;
    export let maxPrice: number;

    // === STATE MACHINE ===
    type State =
        | "IDLE"
        | "TARGETING"
        | "LOCKED"
        | "CONFIRMING"
        | "ORDER_PLACED";
    let state: State = "IDLE";
    let lockedPrice: number | null = null;

    // Debounce timers to prevent rapid state changes
    let lockDebounce: ReturnType<typeof setTimeout> | null = null;
    let confirmDebounce: ReturnType<typeof setTimeout> | null = null;
    let orderDebounce: ReturnType<typeof setTimeout> | null = null;

    const LOCK_DELAY_MS = 300; // Must pinch for 300ms to lock
    const CONFIRM_DELAY_MS = 500; // Must point up for 500ms to show confirm
    const ORDER_DELAY_MS = 800; // Must thumbs up for 800ms to place order

    function clearAllTimers() {
        if (lockDebounce) clearTimeout(lockDebounce);
        if (confirmDebounce) clearTimeout(confirmDebounce);
        if (orderDebounce) clearTimeout(orderDebounce);
        lockDebounce = null;
        confirmDebounce = null;
        orderDebounce = null;
    }

    onDestroy(clearAllTimers);

    // Map hand Y to screen percentage for overlay positioning
    $: handY = $gestureState.handPosition.y;
    $: screenY = Math.max(10, Math.min(90, handY * 100));

    // Is hand valid for targeting?
    $: isValidHand =
        $gestureState.isHandDetected &&
        $gestureState.numHandsDetected === 1 &&
        $gestureState.primaryHandSide === $tradingHandPreference &&
        !$twoHandPinch.isActive;

    $: currentGesture = $gestureState.detectedGesture;
    $: isPinching = $gestureState.isPinching;

    // Hover price from hand position
    function handYToPrice(handY: number): number {
        const clampedY = Math.max(0.1, Math.min(0.9, handY));
        const normalized = 1 - clampedY;
        return minPrice + (maxPrice - minPrice) * normalized;
    }

    $: hoverPrice = handYToPrice(handY);
    $: displayPrice = lockedPrice !== null ? lockedPrice : hoverPrice;

    // === STATE MACHINE TRANSITIONS ===
    $: {
        // RESET: Closed Fist from ANY state
        if (currentGesture === "Closed_Fist" && isValidHand) {
            clearAllTimers();
            state = "IDLE";
            lockedPrice = null;
        }

        // IDLE → TARGETING: Hand detected and not pinching
        else if (
            state === "IDLE" &&
            isValidHand &&
            !isPinching &&
            currentGesture !== "Closed_Fist"
        ) {
            state = "TARGETING";
        }

        // TARGETING → IDLE: Hand lost
        else if (state === "TARGETING" && !isValidHand) {
            clearAllTimers();
            state = "IDLE";
        }

        // TARGETING → LOCKED: Pinch detected (with debounce)
        else if (
            state === "TARGETING" &&
            isPinching &&
            currentGesture !== "Closed_Fist"
        ) {
            if (!lockDebounce) {
                lockDebounce = setTimeout(() => {
                    if ($gestureState.isPinching && state === "TARGETING") {
                        lockedPrice = hoverPrice;
                        state = "LOCKED";
                    }
                    lockDebounce = null;
                }, LOCK_DELAY_MS);
            }
        }
        // Cancel lock debounce if pinch released
        else if (state === "TARGETING" && !isPinching && lockDebounce) {
            clearTimeout(lockDebounce);
            lockDebounce = null;
        }

        // LOCKED → CONFIRMING: Point Up detected (with debounce)
        else if (state === "LOCKED" && currentGesture === "Pointing_Up") {
            if (!confirmDebounce) {
                confirmDebounce = setTimeout(() => {
                    if (
                        $gestureState.detectedGesture === "Pointing_Up" &&
                        state === "LOCKED"
                    ) {
                        state = "CONFIRMING";
                    }
                    confirmDebounce = null;
                }, CONFIRM_DELAY_MS);
            }
        }
        // Cancel confirm debounce if gesture changed
        else if (
            state === "LOCKED" &&
            currentGesture !== "Pointing_Up" &&
            confirmDebounce
        ) {
            clearTimeout(confirmDebounce);
            confirmDebounce = null;
        }

        // CONFIRMING → ORDER_PLACED: Thumbs Up detected (with debounce)
        else if (state === "CONFIRMING" && currentGesture === "Thumbs_Up") {
            if (!orderDebounce) {
                orderDebounce = setTimeout(() => {
                    if (
                        $gestureState.detectedGesture === "Thumbs_Up" &&
                        state === "CONFIRMING"
                    ) {
                        console.log("[ORDER] Placed at price:", lockedPrice);
                        state = "ORDER_PLACED";
                        // Auto reset after showing success
                        setTimeout(() => {
                            state = "IDLE";
                            lockedPrice = null;
                        }, 2000);
                    }
                    orderDebounce = null;
                }, ORDER_DELAY_MS);
            }
        }
        // Cancel order debounce if gesture changed
        else if (
            state === "CONFIRMING" &&
            currentGesture !== "Thumbs_Up" &&
            orderDebounce
        ) {
            clearTimeout(orderDebounce);
            orderDebounce = null;
        }

        // CONFIRMING → LOCKED: Go back if no longer pointing up or thumbs up
        else if (
            state === "CONFIRMING" &&
            currentGesture !== "Pointing_Up" &&
            currentGesture !== "Thumbs_Up"
        ) {
            state = "LOCKED";
        }

        // LOCKED → TARGETING: Release pinch to go back
        else if (
            state === "LOCKED" &&
            !isPinching &&
            currentGesture !== "Pointing_Up"
        ) {
            // Stay locked, don't go back automatically
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
    <!-- Horizontal line across screen -->
    <div
        class="fixed left-0 right-0 pointer-events-none z-40 transition-all duration-100"
        style="top: {screenY}%"
    >
        <div
            class="h-0.5 w-full {isLocked ? 'bg-emerald-400' : 'bg-yellow-400'}"
            style="opacity: {isLocked ? 1 : 0.6}"
        ></div>

        <!-- Price label -->
        <div
            class="absolute right-4 -translate-y-1/2 px-4 py-2 rounded-lg shadow-xl {isLocked
                ? 'bg-emerald-500'
                : 'bg-yellow-400'}"
            transition:fade={{ duration: 100 }}
        >
            <div
                class="text-[10px] font-bold uppercase tracking-wider {isLocked
                    ? 'text-emerald-100'
                    : 'text-black/60'} mb-0.5"
            >
                {#if showOrderSuccess}
                    🚀 ORDER PLACED
                {:else if isLocked}
                    ✓ LOCKED
                {:else}
                    TARGET
                {/if}
            </div>
            <div
                class="text-2xl font-mono font-bold {isLocked
                    ? 'text-white'
                    : 'text-black'}"
            >
                ₹{displayPrice.toFixed(2)}
            </div>
        </div>

        <!-- Hint on left side -->
        {#if !showOrderSuccess}
            <div
                class="absolute left-4 -translate-y-1/2 text-xs font-bold bg-black/70 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/10"
            >
                {#if isTargeting}
                    <span class="text-yellow-400"
                        >👌 Hold PINCH ({LOCK_DELAY_MS}ms) → Lock</span
                    >
                {:else if state === "LOCKED"}
                    <span class="text-emerald-400"
                        >👆 Hold POINT UP → Trade</span
                    >
                    <span class="text-slate-400 mx-2">|</span>
                    <span class="text-rose-400">✊ FIST → Clear</span>
                {:else if showConfirmDialog}
                    <span class="text-emerald-400 animate-pulse"
                        >👍 Hold THUMBS UP → Confirm!</span
                    >
                {/if}
            </div>
        {/if}
    </div>
{/if}

{#if showConfirmDialog}
    <!-- Order confirmation overlay -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        transition:fade
    >
        <div
            class="bg-emerald-500/90 backdrop-blur-md text-white px-8 py-6 rounded-2xl shadow-2xl text-center"
        >
            <div class="text-lg font-bold mb-2">CONFIRM ORDER</div>
            <div class="text-4xl font-mono font-bold">
                ₹{(lockedPrice ?? 0).toFixed(2)}
            </div>
            <div class="mt-4 text-emerald-100 text-sm animate-pulse">
                👍 Hold Thumbs Up ({ORDER_DELAY_MS}ms)
            </div>
        </div>
    </div>
{/if}

{#if showOrderSuccess}
    <!-- Success message -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        transition:fade
    >
        <div
            class="bg-emerald-600 text-white px-12 py-8 rounded-2xl shadow-2xl text-center"
        >
            <div class="text-6xl mb-4">🚀</div>
            <div class="text-2xl font-bold">ORDER PLACED!</div>
            <div class="text-xl font-mono mt-2">
                ₹{(lockedPrice ?? 0).toFixed(2)}
            </div>
        </div>
    </div>
{/if}
