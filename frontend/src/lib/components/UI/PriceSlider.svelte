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
        class="fixed top-0 right-32 bottom-0 w-32 flex items-center z-50 pointer-events-none"
    >
        <!-- Simple Slider Track (Reverted) -->
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
