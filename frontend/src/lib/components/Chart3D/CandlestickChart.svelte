<script lang="ts">
    import { T } from "@threlte/core";
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

    // Candle rendering constants
    const CANDLE_WIDTH = 0.6;
    const CANDLE_DEPTH = 0.36;
    const WICK_RADIUS = 0.04;
</script>

<T.Group position={[-centerOffset, 0, 0]}>
    <!-- Iterate over data to render candles inline (optimized single component) -->
    {#each data as candle, i}
        {@const isBullish = candle.close >= candle.open}
        {@const bodyHeight = Math.max(
            0.15,
            Math.abs(candle.close - candle.open) * scaleFactor,
        )}
        {@const bodyY =
            ((candle.open + candle.close) / 2 - centerPrice) * scaleFactor}
        {@const wickHeight = Math.max(
            0.1,
            (candle.high - candle.low) * scaleFactor,
        )}
        {@const wickY =
            ((candle.high + candle.low) / 2 - centerPrice) * scaleFactor}
        {@const xPos = i * spacing}
        {@const isLatest = i === data.length - 1}
        {@const color = isBullish ? "#22c55e" : "#ef4444"}
        {@const wickColor = isBullish ? "#16a34a" : "#dc2626"}
        {@const glowColor = isBullish ? "#4ade80" : "#f87171"}

        <T.Group position={[xPos, 0, 0]}>
            <!-- Candle Body -->
            <T.Mesh position={[0, bodyY, 0]} castShadow receiveShadow>
                <T.BoxGeometry
                    args={[CANDLE_WIDTH, bodyHeight, CANDLE_DEPTH]}
                />
                <T.MeshStandardMaterial
                    {color}
                    emissive={glowColor}
                    emissiveIntensity={isLatest ? 1.0 : 0.4}
                    roughness={0.15}
                    metalness={0.6}
                    transparent
                    opacity={0.95}
                />
            </T.Mesh>

            <!-- Wick -->
            <T.Mesh position={[0, wickY, 0]} castShadow>
                <T.CylinderGeometry
                    args={[WICK_RADIUS, WICK_RADIUS, wickHeight, 6]}
                />
                <T.MeshStandardMaterial
                    color={wickColor}
                    roughness={0.4}
                    metalness={0.3}
                />
            </T.Mesh>
        </T.Group>
    {/each}
</T.Group>
