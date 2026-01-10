<script lang="ts">
    import { onMount } from "svelte";
    import { gestureState } from "$lib/stores/gesture";
    import { tradingStore } from "$lib/stores/trading";

    export let currentPrice: number = 0;

    // Slider State
    let startHandY: number | null = null;
    let startPrice: number = 0;
    let selectedPrice: number = 0;
    let isVisible = false;

    // Reactivity
    $: {
        // Activation Logic
        if ($gestureState.isPinching) {
            if (!isVisible) {
                // Just Started Pinching
                isVisible = true;
                startHandY = $gestureState.handPosition.y;
                startPrice = currentPrice;
                selectedPrice = currentPrice;
            } else if (startHandY !== null) {
                // Dragging Logic
                const dy = startHandY - $gestureState.handPosition.y; // Positive = Moving Up

                // Sensitivity: Full screen height (1.0) = +/- 10% change
                const percentChange = dy * 0.2; // 20% range total

                selectedPrice = startPrice * (1 + percentChange);
            }
        } else {
            // Released Pinch
            if (isVisible) {
                isVisible = false;
                startHandY = null;
                // Optionally trigger order here?
                // For now, just a selector.
                // tradingStore.placeOrder('BUY', 1, selectedPrice);
            }
        }
    }

    // Visual Helper
    $: priceDiff = selectedPrice - startPrice;
    $: percentDiff = ((priceDiff / startPrice) * 100).toFixed(2);
    $: isPositive = priceDiff >= 0;
</script>

{#if isVisible}
    <div
        class="fixed top-0 right-32 bottom-0 w-40 flex items-center z-50 pointer-events-none"
    >
        <!-- Ruler Track -->
        <div
            class="relative h-2/3 w-16 bg-white/20 backdrop-blur-2xl rounded-2xl mx-auto overflow-hidden border border-white/40 shadow-xl flex flex-col justify-between py-4"
        >
            <!-- Tick Marks Generator -->
            {#each Array(40) as _, i}
                <div
                    class={`w-full h-[1px] ${i % 5 === 0 ? "bg-black/30 w-3/4 self-end" : "bg-black/10 w-1/3 self-end mr-2"}`}
                ></div>
            {/each}

            <!-- Center Indicator Line -->
            <div
                class="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10"
            ></div>

            <!-- Dynamic Filled Zone -->
            <div
                class={`absolute w-full transition-all duration-75 left-0 right-0 opacity-20 ${isPositive ? "bottom-1/2 bg-green-500" : "top-1/2 bg-red-500"}`}
                style={`height: ${Math.min(Math.abs(((selectedPrice - startPrice) / (startPrice * 0.1)) * 50), 50)}%`}
            ></div>
        </div>

        <!-- Floating Label Card (Apple Style) -->
        <div
            class="absolute right-20 p-4 rounded-xl bg-white/40 border border-white/60 backdrop-blur-2xl shadow-2xl text-right min-w-[160px] transition-all duration-100 ease-out"
            style={`top: ${50 - ((selectedPrice - startPrice) / (startPrice * 0.1)) * 40}%; transform: translateY(-50%)`}
        >
            <div
                class="text-[10px] uppercase text-slate-800 font-bold tracking-widest mb-1"
            >
                SET PRICE
            </div>
            <div class="text-3xl font-mono text-black font-bold tracking-tight">
                {selectedPrice.toFixed(2)}
            </div>
            <div
                class={`text-sm font-medium mt-1 flex justify-end items-center gap-1 ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
            >
                <span>{isPositive ? "▲" : "▼"}</span>
                <span>{percentDiff}%</span>
            </div>
        </div>
    </div>
{/if}
