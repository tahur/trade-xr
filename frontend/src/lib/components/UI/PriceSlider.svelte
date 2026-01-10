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
        class="fixed top-0 right-32 bottom-0 w-24 flex items-center z-50 pointer-events-none"
    >
        <!-- Slider Track -->
        <div
            class="relative h-2/3 w-2 bg-slate-800/80 rounded-full mx-auto overflow-hidden"
        >
            <!-- Center Line -->
            <div
                class="absolute top-1/2 left-0 right-0 h-0.5 bg-white/50"
            ></div>

            <!-- Fill Bar -->
            <div
                class={`absolute w-full transition-all duration-75 ${isPositive ? "bottom-1/2 bg-green-500" : "top-1/2 bg-red-500"}`}
                style={`height: ${Math.min(Math.abs(((selectedPrice - startPrice) / (startPrice * 0.1)) * 50), 50)}%`}
            ></div>
        </div>

        <!-- Floating Label -->
        <div
            class="absolute right-8 p-3 rounded-xl bg-slate-900/90 border border-slate-700 backdrop-blur-md shadow-2xl text-right min-w-[140px]"
            style={`top: ${50 - ((selectedPrice - startPrice) / (startPrice * 0.1)) * 40}%`}
        >
            <div
                class="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1"
            >
                Target Price
            </div>
            <div class="text-2xl font-mono text-white font-bold">
                {selectedPrice.toFixed(2)}
            </div>
            <div
                class={`text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}
            >
                {isPositive ? "+" : ""}{percentDiff}%
            </div>
        </div>
    </div>
{/if}
