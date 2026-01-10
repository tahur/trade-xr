<script lang="ts">
    import { onMount } from "svelte";
    import { spring } from "svelte/motion";
    import { fade } from "svelte/transition";
    import { gestureState } from "$lib/stores/gesture";
    import { tradingStore } from "$lib/stores/trading";

    export let currentPrice: number = 0;
    export let gestureSensitivity: number = 0.08;

    // Slider State
    let startHandY: number | null = null;
    let startHandX: number | null = null;
    let startPrice: number = 0;

    // Smooth Price Store (Spring Physics)

    // Smooth Price Store (Spring Physics)
    const selectedPrice = spring(0, {
        stiffness: 0.1, // Lower stiffness = smoother/slower follow
        damping: 0.8, // Higher damping = less oscillation
    });

    // Order Flow State
    let isOrderWindowOpen = false;
    let orderPlaced = false;

    // Quantity State (Scrubbing)
    const selectedQty = spring(1, { stiffness: 0.1, damping: 0.5 });
    let startQty: number = 1;
    let startQtyHandX: number | null = null;

    // Peristent State
    let confirmedPrice: number | null = null;

    let isVisible = false;
    let isLocked = false;

    // Reactivity
    // Reactivity for Gestures
    $: {
        // 1. OPEN ORDER WINDOW: Point Up when Price Confirmed
        if (confirmedPrice !== null && !isOrderWindowOpen && !orderPlaced) {
            if ($gestureState.detectedGesture === "Pointing_Up") {
                isOrderWindowOpen = true;
                // Initialize Qty
                selectedQty.set(1, { hard: true });
            }
            // CANCEL/RESET: Closed Fist clears confirmed price
            if ($gestureState.detectedGesture === "Closed_Fist") {
                confirmedPrice = null;
                isOrderWindowOpen = false;
                // Reset slider spring?
                selectedPrice.set(currentPrice, { hard: true });
            }
        }

        // 2. INSIDE ORDER WINDOW
        if (isOrderWindowOpen) {
            // A) QUANTITY ADJUSTMENT (Pinch & Drag)
            if ($gestureState.isPinching) {
                if (startQtyHandX === null) {
                    // Start Scrubbing
                    startQtyHandX = $gestureState.handPosition.x;
                    startQty = $selectedQty;
                } else {
                    // Dragging
                    const dx = $gestureState.handPosition.x - startQtyHandX;
                    // Sensitivity: 1.0 movement = +100 units? Adjust as needed
                    // Let's say full screen width (1.0) = 50 units change
                    const change = dx * 100;
                    const target = Math.max(1, Math.round(startQty + change));
                    selectedQty.set(target);
                }
            } else {
                startQtyHandX = null;
            }

            // B) CONFIRM: Thumbs Up
            if ($gestureState.detectedGesture === "Thumbs_Up") {
                console.log(
                    `[ORDER] Placed Limit Order: Price ${confirmedPrice}, Qty ${Math.round($selectedQty)}`,
                );
                orderPlaced = true;
                // Close window after delay?
                setTimeout(() => {
                    isOrderWindowOpen = false;
                    confirmedPrice = null; // Reset flow
                    orderPlaced = false;
                }, 2000);
            }

            // C) CANCEL: Closed Fist
            if ($gestureState.detectedGesture === "Closed_Fist") {
                isOrderWindowOpen = false;
                confirmedPrice = null; // Clear everything
            }
        }
    }

    // Slider Logic (Price Adjustment - Only when window CLOSED)
    $: {
        if (!isOrderWindowOpen && !orderPlaced) {
            if ($gestureState.isPinching) {
                // ... (Keep existing pinch logic, but maybe disable if Order Window is open?)
                // Disable pinch adjustment if Order Window is open!
                if (!isOrderWindowOpen && !orderPlaced) {
                    // Start Pinching
                    if (startHandY === null) {
                        isVisible = true;
                        isLocked = false;
                        startHandY = $gestureState.handPosition.y;
                        startHandX = $gestureState.handPosition.x;

                        // Start from existing confirmed price if it exists, otherwise current
                        startPrice = confirmedPrice ?? currentPrice;

                        // Hard set the spring to starting value (no animation)
                        selectedPrice.set(startPrice, { hard: true });
                    } else if (startHandY !== null && startHandX !== null) {
                        // Dragging Logic
                        const dy = startHandY - $gestureState.handPosition.y;
                        const dx = $gestureState.handPosition.x - startHandX;

                        // 1. Check for Lock (Swipe Right => Camera Left => dx < -0.1)
                        if (dx < -0.1) {
                            if (!isLocked) {
                                isLocked = true;
                                confirmedPrice = $selectedPrice; // Lock the SMOOTHED value
                            }
                        } else if (dx > -0.05) {
                            // Unlock if we slide back
                            if (isLocked) {
                                isLocked = false;
                            }
                        }

                        if (!isLocked) {
                            // Option 2: Dynamic Velocity (Non-Linear)
                            const sign = Math.sign(dy);
                            const mag = Math.abs(dy);

                            // Power of 1.5 for exponential feel
                            const nonLinearDy = sign * Math.pow(mag, 1.5);

                            // Re-calibrated sensitivity (approx 5x base due to small numbers)
                            const percentChange =
                                nonLinearDy * (gestureSensitivity * 5);

                            const target = startPrice * (1 + percentChange);
                            selectedPrice.set(target);
                        }
                    }
                }
            } else {
                // Released Pinch
                if (isVisible) {
                    if (isLocked) {
                        // Sticky: KEEP visible if locked
                        isVisible = true;
                    } else {
                        // Hide only if NOT locked
                        isVisible = false;
                    }
                    // Always reset hand tracking on release
                    startHandY = null;
                    startHandX = null;
                }
            }
        }
    }

    // Visual Helpers
    $: priceDiff = $selectedPrice - startPrice;
    $: percentDiff = ((priceDiff / startPrice) * 100).toFixed(2);
    $: isPositive = priceDiff >= 0;
</script>

{#if isVisible || confirmedPrice !== null}
    <!-- Container -->
    <div class="fixed inset-0 pointer-events-none z-50">
        <!-- 1. ADJUST MODE: Side Slider -->
        <!-- Visible when adjusting and NOT locked yet -->
        <div
            class={`absolute top-0 right-32 bottom-0 w-32 flex items-center transition-all duration-300 ${isVisible && !isLocked && !isOrderWindowOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`}
        >
            <!-- Track -->
            <div
                class="relative h-2/3 w-1.5 bg-white/20 backdrop-blur-md rounded-full mx-auto overflow-hidden border border-white/30 shadow-lg"
            >
                <div
                    class="absolute top-1/2 left-0 right-0 h-0.5 bg-white/60 shadow-[0_0_5px_white]"
                ></div>
                <!-- Use $selectedPrice for reactive reads -->
                <div
                    class={`absolute w-full left-0 right-0 transition-all duration-75 ${isPositive ? "bottom-1/2 bg-emerald-400" : "top-1/2 bg-rose-400"}`}
                    style={`height: ${Math.min(Math.abs((($selectedPrice - startPrice) / (startPrice * 0.1)) * 50), 50)}%`}
                ></div>
            </div>

            <!-- Rectangular High-Contrast Card -->
            <div
                class="absolute right-8 p-3 bg-[#E8E8E8] border border-white shadow-xl text-right min-w-[140px] transition-all duration-100 ease-out rounded-sm"
                style={`top: ${50 - (($selectedPrice - startPrice) / (startPrice * 0.1)) * 40}%; transform: translateY(-50%)`}
            >
                <div
                    class="text-[9px] uppercase text-zinc-500 font-bold tracking-widest mb-0.5 flex justify-between"
                >
                    <span>SET PRICE</span>
                    <span class="text-emerald-500">⚡️ DYNAMIC</span>
                </div>
                <!-- Use $selectedPrice -->
                <div
                    class="text-2xl font-mono text-zinc-900 font-bold tracking-tight"
                >
                    {$selectedPrice.toFixed(2)}
                </div>
                <div
                    class={`text-xs font-bold mt-0.5 flex justify-end items-center gap-1 ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
                >
                    <span>{isPositive ? "▲" : "▼"}</span>
                    <span>{percentDiff}%</span>
                </div>
                <!-- Instruction Hint -->
                <div
                    class="mt-2 text-[9px] uppercase font-bold text-zinc-400 flex items-center justify-end gap-1"
                >
                    <span>SWIPE RIGHT TO LOCK →</span>
                </div>
            </div>
        </div>

        <!-- 2. LOCKED MODE: Sticky Top Tile -->
        <!-- Always visible if confirmedPrice exists -->
        <div
            class={`absolute top-16 left-1/2 -translate-x-1/2 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) transform ${confirmedPrice !== null && !isOrderWindowOpen && !orderPlaced ? "translate-y-0 opacity-100 scale-100" : "-translate-y-20 opacity-0 scale-90"}`}
        >
            <div
                class={`px-6 py-3 rounded-sm bg-[#F0F0F0] border-2 border-white/80 shadow-2xl text-center min-w-[180px] transition-opacity duration-300 ${isVisible && !isLocked ? "opacity-50" : "opacity-100"}`}
            >
                <div
                    class="text-[10px] uppercase text-zinc-500 font-bold tracking-[0.2em] mb-1"
                >
                    CONFIRMED
                </div>
                <div
                    class="text-3xl font-mono text-zinc-900 font-extrabold tracking-tighter"
                >
                    {(confirmedPrice ?? 0).toFixed(2)}
                </div>
                <!-- Prompt for Next Step -->
                <div
                    class="mt-2 text-[10px] uppercase font-bold text-emerald-600 flex items-center justify-center gap-1 animate-pulse"
                >
                    <span>👆 POINT UP TO TRADE</span>
                    <span class="text-zinc-400 mx-1">|</span>
                    <span class="text-rose-500">✊ FIST TO CLEAR</span>
                </div>
            </div>
        </div>

        <!-- 3. ORDER QUANTITY WINDOW (New) -->
        {#if isOrderWindowOpen}
            <div
                class="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
                transition:fade
            >
                <div
                    class="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-emerald-500/30"
                >
                    <h2
                        class="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4"
                    >
                        Place Limit Order
                    </h2>

                    <div class="mb-6">
                        <div class="text-xs text-zinc-400 mb-1">PRICE</div>
                        <div class="text-4xl font-mono font-bold text-zinc-800">
                            {(confirmedPrice ?? 0).toFixed(2)}
                        </div>
                    </div>

                    <div
                        class="mb-8 p-6 bg-emerald-50 rounded-lg border border-emerald-100"
                    >
                        <div
                            class="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2"
                        >
                            QUANTITY
                        </div>
                        <div
                            class="text-5xl font-mono font-bold text-emerald-600 mb-2"
                        >
                            {Math.round($selectedQty)}
                        </div>

                        <!-- Visual Scrubber Track -->
                        <div
                            class="h-1.5 w-full bg-emerald-200 rounded-full overflow-hidden relative mt-4"
                        >
                            <!-- Indication of "infinite" roll? Or just a center pip? -->
                            <div
                                class="absolute top-0 bottom-0 bg-emerald-500 w-1/3 left-1/2 -translate-x-1/2 transition-transform duration-75"
                                style={`transform: translateX(${startQtyHandX && $gestureState.handPosition.x ? ($gestureState.handPosition.x - startQtyHandX) * 200 : 0}px) translateX(-50%)`}
                            ></div>
                        </div>
                        <div
                            class="text-[10px] text-emerald-400 mt-2 font-bold uppercase flex items-center justify-center gap-2"
                        >
                            <span>← PINCH & DRAG →</span>
                        </div>
                    </div>

                    <div
                        class="flex justify-between items-center text-[10px] font-bold uppercase text-zinc-400 tracking-wide border-t pt-4 border-zinc-100"
                    >
                        <div class="flex items-center gap-1">
                            <span class="text-xl">✊</span> CANCEL
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-xl">👍</span> CONFIRM
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <!-- 4. VICTORY SUCCESS MESSAGE -->
        {#if orderPlaced}
            <div
                class="absolute inset-0 flex items-center justify-center z-[70]"
            >
                <div
                    class="bg-emerald-500 text-white px-8 py-6 rounded-2xl shadow-[0_20px_60px_rgba(16,185,129,0.4)] text-center transform scale-125"
                >
                    <div class="text-6xl mb-2">🚀</div>
                    <div class="text-2xl font-bold tracking-tight">
                        ORDER PLACED!
                    </div>
                    <div class="text-emerald-100 font-mono mt-1">
                        {(confirmedPrice ?? 0).toFixed(2)} x {Math.round(
                            $selectedQty,
                        )}
                    </div>
                </div>
            </div>
        {/if}
    </div>
{/if}
