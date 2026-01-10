<script lang="ts">
    import { onMount } from "svelte";
    import { spring } from "svelte/motion"; // New import
    import { gestureState } from "$lib/stores/gesture";
    import { tradingStore } from "$lib/stores/trading";

    export let currentPrice: number = 0;
    export let gestureSensitivity: number = 0.08; // Configurable sensitivity

    // Slider State
    let startHandY: number | null = null;
    let startHandX: number | null = null;
    let startPrice: number = 0;

    // Smooth Price Store (Spring Physics)
    const selectedPrice = spring(0, {
        stiffness: 0.1, // Lower stiffness = smoother/slower follow
        damping: 0.8, // Higher damping = less oscillation
    });

    // Peristent State
    let confirmedPrice: number | null = null;

    let isVisible = false;
    let isLocked = false;

    // Reactivity
    $: {
        if ($gestureState.isPinching) {
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
                    // Sensitivity: Configurable via prop (default 0.08)
                    const percentChange = dy * gestureSensitivity;
                    const target = startPrice * (1 + percentChange);
                    selectedPrice.set(target); // Spring animates to this
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
            class={`absolute top-0 right-32 bottom-0 w-32 flex items-center transition-all duration-300 ${isVisible && !isLocked ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`}
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
                    class="text-[9px] uppercase text-zinc-500 font-bold tracking-widest mb-0.5"
                >
                    SET PRICE
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
            class={`absolute top-16 left-1/2 -translate-x-1/2 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) transform ${confirmedPrice !== null ? "translate-y-0 opacity-100 scale-100" : "-translate-y-20 opacity-0 scale-90"}`}
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
            </div>
        </div>
    </div>
{/if}
