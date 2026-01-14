<script lang="ts">
    import { T } from "@threlte/core";
    import type { CandleData } from "$lib/services/mockData";

    // Candle data
    export let candle: CandleData;
    export let index: number;
    export let isLatest: boolean = false;

    // Dynamic scaling props from parent
    export let centerPrice: number;
    export let scaleFactor: number;

    $: isBullish = candle.close > candle.open;

    // High-contrast colors
    $: baseColor = isBullish ? "#22c55e" : "#ef4444";
    $: glowColor = isBullish ? "#4ade80" : "#f87171";
    $: wickColor = isBullish ? "#16a34a" : "#dc2626";

    // Dimensions
    const candleWidth = 0.6;
    const wickWidth = 0.08;

    // Calculate body dimensions with dynamic scaling
    // Normalize Y position: subtract centerPrice then apply scale
    $: bodyHeight = Math.max(
        0.15,
        Math.abs(candle.close - candle.open) * scaleFactor,
    );
    $: bodyY = ((candle.open + candle.close) / 2 - centerPrice) * scaleFactor;

    // Calculate wick dimensions
    $: wickHeight = Math.max(0.1, (candle.high - candle.low) * scaleFactor);
    $: wickY = ((candle.high + candle.low) / 2 - centerPrice) * scaleFactor;

    // Spacing between candles
    const spacing = 1;
    $: xPos = index * spacing;

    // Emissive intensity
    $: emissiveIntensity = isLatest ? 1.0 : 0.4;
</script>

<!-- Candle Body -->
<T.Mesh position={[xPos, bodyY, 0]} castShadow receiveShadow>
    <T.BoxGeometry args={[candleWidth, bodyHeight, candleWidth * 0.6]} />
    <T.MeshStandardMaterial
        color={baseColor}
        emissive={glowColor}
        {emissiveIntensity}
        roughness={0.15}
        metalness={0.6}
        transparent={true}
        opacity={0.95}
    />
</T.Mesh>

<!-- Inner glow core -->
<T.Mesh position={[xPos, bodyY, 0]}>
    <T.BoxGeometry
        args={[
            candleWidth * 0.6,
            Math.max(0.08, bodyHeight * 0.7),
            candleWidth * 0.35,
        ]}
    />
    <T.MeshBasicMaterial color={glowColor} transparent={true} opacity={0.4} />
</T.Mesh>

<!-- Wick -->
<T.Mesh position={[xPos, wickY, 0]} castShadow>
    <T.CylinderGeometry args={[wickWidth, wickWidth, wickHeight, 6]} />
    <T.MeshStandardMaterial color={wickColor} roughness={0.4} metalness={0.3} />
</T.Mesh>
