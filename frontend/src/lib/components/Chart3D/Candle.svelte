<script lang="ts">
    import { T } from "@threlte/core";
    import type { CandleData } from "$lib/services/mockData";

    export let data: CandleData;
    /**
     * Position index in the chart (used for Z-axis placement)
     */
    export let index: number;
    export let isLatest: boolean = false;

    $: isBullish = data.close > data.open;

    // Premium Trading Terminal Colors - richer, more saturated
    $: baseColor = isBullish ? "#00C853" : "#FF1744"; // Vibrant green/red
    $: glowColor = isBullish ? "#00E676" : "#FF5252"; // Lighter for emissive
    $: wickColor = isBullish ? "#00A844" : "#D50000"; // Slightly darker wick

    // Dimensions - slightly chunkier for better 3D presence
    const candleWidth = 0.85;
    const wickWidth = 0.12;

    // Calculate body dimensions and position
    $: bodyHeight = Math.abs(data.close - data.open);
    $: bodyY = (data.open + data.close) / 2;

    // Calculate wick dimensions and position
    $: wickHeight = data.high - data.low;
    $: wickY = (data.high + data.low) / 2;

    // Spacing between candles
    const spacing = 1.2;
    $: xPos = index * spacing; // Time on X-axis

    // Emissive intensity for latest candle (pulsing effect simulated via static glow)
    $: emissiveIntensity = isLatest ? 0.4 : 0.08;
</script>

<!-- Candle Body - Premium glass-like material -->
<T.Mesh position={[xPos, bodyY, 0]} castShadow receiveShadow>
    <T.BoxGeometry
        args={[candleWidth, Math.max(0.05, bodyHeight), candleWidth * 0.6]}
    />
    <T.MeshStandardMaterial
        color={baseColor}
        emissive={glowColor}
        {emissiveIntensity}
        roughness={0.15}
        metalness={0.6}
        transparent={true}
        opacity={0.92}
    />
</T.Mesh>

<!-- Inner glow core for depth effect -->
<T.Mesh position={[xPos, bodyY, 0]}>
    <T.BoxGeometry
        args={[
            candleWidth * 0.7,
            Math.max(0.03, bodyHeight * 0.8),
            candleWidth * 0.4,
        ]}
    />
    <T.MeshBasicMaterial color={glowColor} transparent={true} opacity={0.3} />
</T.Mesh>

<!-- Wick - thinner, metallic -->
<T.Mesh position={[xPos, wickY, 0]} castShadow>
    <T.CylinderGeometry args={[wickWidth, wickWidth, wickHeight, 6]} />
    <T.MeshStandardMaterial color={wickColor} roughness={0.4} metalness={0.3} />
</T.Mesh>
