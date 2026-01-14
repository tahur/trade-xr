<script lang="ts">
    import { T } from "@threlte/core";
    import Candle from "./Candle.svelte";
    import type { CandleData } from "$lib/services/mockData";

    export let data: CandleData[] = [];

    // Calculate price range for dynamic scaling
    $: minPrice = data.length > 0 ? Math.min(...data.map((c) => c.low)) : 0;
    $: maxPrice = data.length > 0 ? Math.max(...data.map((c) => c.high)) : 1;
    $: priceRange = Math.max(maxPrice - minPrice, 0.01); // Avoid division by zero
    $: centerPrice = (minPrice + maxPrice) / 2;

    // Scale factor: normalize price range to ~20 units height for good visibility
    const TARGET_HEIGHT = 20;
    $: scaleFactor = TARGET_HEIGHT / priceRange;

    // Center the chart based on the number of candles
    const spacing = 1;
    $: centerOffset = (data.length * spacing) / 2;
</script>

<T.Group position={[-centerOffset, 0, 0]}>
    <!-- Iterate over data to render candles -->
    {#each data as candle, i}
        <Candle
            {candle}
            index={i}
            isLatest={i === data.length - 1}
            {centerPrice}
            {scaleFactor}
        />
    {/each}
</T.Group>
