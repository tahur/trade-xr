<script lang="ts">
    import { onMount } from "svelte";
    import { gestureState } from "$lib/stores/gesture";
    import { tradingStore } from "$lib/stores/trading";

    export let currentPrice: number = 0;

    // Slider State
    let startHandY: number | null = null;
    let startHandX: number | null = null; // New: Track horizontal start
    let startPrice: number = 0;
    let selectedPrice: number = 0;
    let isVisible = false;
    let isLocked = false; // New: Selection state

    // Reactivity
    $: {
        // Activation Logic
        if ($gestureState.isPinching) {
            if (!isVisible) {
                // Just Started Pinching
                isVisible = true;
                isLocked = false;
                startHandY = $gestureState.handPosition.y;
                startHandX = $gestureState.handPosition.x; // Capture X
                startPrice = currentPrice;
                selectedPrice = currentPrice;
            } else if (startHandY !== null && startHandX !== null) {
                // Dragging Logic
                const dy = startHandY - $gestureState.handPosition.y; // Positive = Moving Up
                const dx = $gestureState.handPosition.x - startHandX; // Positive = Moving Right

                // 1. Check for Lock (Slide Right)
                // Threshold: 0.1 (approx 10% screen width)
                if (dx > 0.1) {
                    isLocked = true;
                } else if (dx < 0.05) {
                    // Slide back left to unlock
                    isLocked = false;
                }

                if (!isLocked) {
                    // Only update price if NOT locked
                    // Sensitivity: Full screen height (1.0) = +/- 10% change
                    const percentChange = dy * 0.2;
                    selectedPrice = startPrice * (1 + percentChange);
                }
            }
        } else {
            // Released Pinch
            if (isVisible) {
                isVisible = false;
                isLocked = false;
                startHandY = null;
                startHandX = null;
                // Optionally trigger order here?
            }
        }
    }

    // Visual Helper
    $: priceDiff = selectedPrice - startPrice;
    $: percentDiff = ((priceDiff / startPrice) * 100).toFixed(2);
    $: isPositive = priceDiff >= 0;
</script>

{#if isVisible}
    <!-- Container -->
    <div class="fixed inset-0 pointer-events-none z-50">
        <!-- 1. ADJUST MODE: Side Slider -->
        <div
            class={`absolute top-0 right-32 bottom-0 w-32 flex items-center transition-opacity duration-300 ${isLocked ? "opacity-0" : "opacity-100"}`}
        >
            <!-- Simple Slider Track -->
            <div
                class="relative h-2/3 w-3 bg-white/20 backdrop-blur-2xl rounded-full mx-auto overflow-hidden border border-white/30 shadow-lg"
            >
                <!-- Center Line -->
                <div
                    class="absolute top-1/2 left-0 right-0 h-0.5 bg-white/50"
                ></div>

                <!-- Dynamic Filled Zone -->
                <div
                    class={`absolute w-full transition-all duration-75 left-0 right-0 ${isPositive ? "bottom-1/2 bg-gradient-to-t from-emerald-500/80 to-emerald-400" : "top-1/2 bg-gradient-to-b from-rose-500/80 to-rose-400"}`}
                    style={`height: ${Math.min(Math.abs(((selectedPrice - startPrice) / (startPrice * 0.1)) * 50), 50)}%`}
                ></div>
            </div>

            <!-- Floating Label Card -->
            <div
                class="absolute right-20 p-4 rounded-xl bg-white/40 border border-white/60 backdrop-blur-2xl shadow-2xl text-right min-w-[160px] transition-all duration-100 ease-out"
                style={`top: ${50 - ((selectedPrice - startPrice) / (startPrice * 0.1)) * 40}%; transform: translateY(-50%)`}
            >
                <div
                    class="text-[10px] uppercase text-slate-800 font-bold tracking-widest mb-1"
                >
                    SET PRICE
                </div>
                <div
                    class="text-3xl font-mono text-black font-bold tracking-tight"
                >
                    {selectedPrice.toFixed(2)}
                </div>
                <div
                    class={`text-sm font-medium mt-1 flex justify-end items-center gap-1 ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
                >
                    <span>{isPositive ? "▲" : "▼"}</span>
                    <span>{percentDiff}%</span>
                </div>
                <div
                    class="mt-2 text-[10px] text-slate-600 border-t border-slate-400/30 pt-1 flex items-center justify-end gap-1"
                >
                    <span>SLIDE RIGHT TO LOCK</span>
                    <span>→</span>
                </div>
            </div>
        </div>

        <!-- 2. LOCKED MODE: Top Tile -->
        <!-- Center Top Position -->
        <div
            class={`absolute top-8 left-1/2 -translate-x-1/2 transition-all duration-300 transform ${isLocked ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"}`}
        >
            <div
                class="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] text-center min-w-[200px]"
            >
                <div
                    class="text-xs uppercase text-emerald-400 font-bold tracking-[0.2em] mb-1"
                >
                    PRICE LOCKED
                </div>
                <div
                    class="text-5xl font-mono text-white font-bold tracking-tighter drop-shadow-lg"
                >
                    {selectedPrice.toFixed(2)}
                </div>
                <div class="text-sm text-white/50 mt-2 font-medium">
                    RELEASE TO CONFIRM
                </div>
            </div>
        </div>
    </div>
{/if}
