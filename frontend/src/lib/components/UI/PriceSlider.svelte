<script lang="ts">
    import { onMount } from "svelte";
    import { gestureState } from "$lib/stores/gesture";
    import { tradingStore } from "$lib/stores/trading";

    export let currentPrice: number = 0;

    // Slider State
    let startHandY: number | null = null;
    let startHandX: number | null = null;
    let startPrice: number = 0;
    let selectedPrice: number = 0;
    let isVisible = false;
    let isLocked = false;

    // Reactivity
    $: {
        if ($gestureState.isPinching) {
            // Start Pinching (Logic fixed to allow re-edit)
            if (startHandY === null) {
                isVisible = true;
                isLocked = false; // Reset lock to allow adjustment
                startHandY = $gestureState.handPosition.y;
                startHandX = $gestureState.handPosition.x;
                startPrice = currentPrice;
                selectedPrice = currentPrice;
            } else if (startHandY !== null && startHandX !== null) {
                // Dragging Logic
                const dy = startHandY - $gestureState.handPosition.y;
                const dx = $gestureState.handPosition.x - startHandX;

                // 1. Check for Lock (Slide RIGHT)
                if (dx > 0.1) {
                    isLocked = true;
                } else if (dx < 0.05) {
                    // Slide back left to unlock
                    isLocked = false;
                }

                if (!isLocked) {
                    const percentChange = dy * 0.2;
                    selectedPrice = startPrice * (1 + percentChange);
                }
            }
        } else {
            // Released Pinch
            if (isVisible) {
                // Sticky: Only hide if NOT locked
                if (!isLocked) {
                    isVisible = false;
                }
                // Always reset hand tracking on release
                startHandY = null;
                startHandX = null;
            }
        }
    }

    // Visual Helpers
    $: priceDiff = selectedPrice - startPrice;
    $: percentDiff = ((priceDiff / startPrice) * 100).toFixed(2);
    $: isPositive = priceDiff >= 0;
</script>

{#if isVisible || isLocked}
    <!-- Container -->
    <div class="fixed inset-0 pointer-events-none z-50">
        <!-- 1. ADJUST MODE: Side Slider -->
        <div
            class={`absolute top-0 right-32 bottom-0 w-32 flex items-center transition-all duration-300 ${isLocked ? "opacity-0 translate-x-10" : "opacity-100 translate-x-0"}`}
        >
            <!-- Track -->
            <div
                class="relative h-2/3 w-1.5 bg-white/20 backdrop-blur-md rounded-full mx-auto overflow-hidden border border-white/30 shadow-lg"
            >
                <div
                    class="absolute top-1/2 left-0 right-0 h-0.5 bg-white/60 shadow-[0_0_5px_white]"
                ></div>
                <div
                    class={`absolute w-full left-0 right-0 transition-all duration-75 ${isPositive ? "bottom-1/2 bg-emerald-400" : "top-1/2 bg-rose-400"}`}
                    style={`height: ${Math.min(Math.abs(((selectedPrice - startPrice) / (startPrice * 0.1)) * 50), 50)}%`}
                ></div>
            </div>

            <!-- Compact High-Contrast Card -->
            <div
                class="absolute right-8 p-3 rounded-xl bg-[#E8E8E8] border border-white shadow-xl text-right min-w-[140px] transition-all duration-100 ease-out"
                style={`top: ${50 - ((selectedPrice - startPrice) / (startPrice * 0.1)) * 40}%; transform: translateY(-50%)`}
            >
                <div
                    class="text-[9px] uppercase text-zinc-500 font-bold tracking-widest mb-0.5"
                >
                    SET PRICE
                </div>
                <div
                    class="text-2xl font-mono text-zinc-900 font-bold tracking-tight"
                >
                    {selectedPrice.toFixed(2)}
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
        <div
            class={`absolute top-16 left-1/2 -translate-x-1/2 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) transform ${isLocked ? "translate-y-0 opacity-100 scale-100" : "-translate-y-20 opacity-0 scale-90"}`}
        >
            <div
                class="px-6 py-3 rounded-2xl bg-[#F0F0F0] border-2 border-white/80 shadow-2xl text-center min-w-[180px]"
            >
                <div
                    class="text-[10px] uppercase text-zinc-500 font-bold tracking-[0.2em] mb-1"
                >
                    CONFIRMED
                </div>
                <div
                    class="text-3xl font-mono text-zinc-900 font-extrabold tracking-tighter"
                >
                    {selectedPrice.toFixed(2)}
                </div>
            </div>
        </div>
    </div>
{/if}
