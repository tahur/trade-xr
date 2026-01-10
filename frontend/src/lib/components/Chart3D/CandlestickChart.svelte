<script lang="ts">
    import { T } from "@threlte/core";
    import Candle from "./Candle.svelte";
    import type { CandleData } from "$lib/services/mockData";

    export let data: CandleData[] = [];

    // Center the chart based on the number of candles
    const spacing = 1.2;
    $: centerOffset = (data.length * spacing) / 2;
</script>

<T.Group position={[-centerOffset, 0, 0]}>
    <!-- Iterate over data to render candles -->
    {#each data as candle, i}
        <Candle data={candle} index={i} />
    {/each}
</T.Group>
