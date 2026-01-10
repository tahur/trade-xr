<script lang="ts">
    import { T } from "@threlte/core";
    import type { CandleData } from "$lib/services/mockData";

    export let data: CandleData;
    /**
     * Position index in the chart (used for Z-axis placement)
     */
    export let index: number;

    $: isBullish = data.close > data.open;
    // TradingView Official Colors
    $: color = isBullish ? "#089981" : "#F23645";

    // Dimensions
    const candleWidth = 0.8;
    const wickWidth = 0.15;

    // Calculate body dimensions and position
    $: bodyHeight = Math.abs(data.close - data.open);
    $: bodyY = (data.open + data.close) / 2;

    // Calculate wick dimensions and position
    $: wickHeight = data.high - data.low;
    $: wickY = (data.high + data.low) / 2;

    // Spacing between candles
    const spacing = 1.2;
    $: xPos = index * spacing; // Time on X-axis
</script>

<!-- Candle Body -->
<T.Mesh position={[xPos, bodyY, 0]} castShadow receiveShadow>
    <T.CylinderGeometry
        args={[
            candleWidth / 2,
            candleWidth / 2,
            Math.max(0.01, bodyHeight),
            16,
        ]}
    />
    <T.MeshStandardMaterial {color} roughness={0.3} metalness={0.2} />
</T.Mesh>

<!-- Wick -->
<T.Mesh position={[xPos, wickY, 0]} castShadow receiveShadow>
    <T.CylinderGeometry args={[wickWidth, wickWidth, wickHeight, 8]} />
    <T.MeshStandardMaterial {color} />
</T.Mesh>
