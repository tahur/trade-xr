<script lang="ts">
    import { onMount } from "svelte";
    import { spring } from "svelte/motion";
    import { fade, scale } from "svelte/transition";
    import {
        holdingsStore,
        totalPortfolioValue,
        totalPnL,
        type Holding,
    } from "$lib/stores/holdings";
    import { headPosition, isTracking, zoomLevel } from "$lib/stores/tracking";
    import { treemap, treemapSquarify, hierarchy } from "d3-hierarchy";
    import { BoxGeometry, MeshPhysicalMaterial, Color } from "three";
    import { T } from "@threlte/core";
    import { Text } from "@threlte/extras";

    // Props
    export let visible = false;

    // Data
    $: holdings = $holdingsStore.holdings;
    $: isLoading = $holdingsStore.isLoading;
    $: totalValue = $totalPortfolioValue;
    $: totalPnLValue = $totalPnL;

    // Fetch data when visible
    $: if (visible && holdings.length === 0 && !isLoading) {
        console.log("[PortfolioTreemap] Visible and no holdings - fetching...");
        holdingsStore.fetch();
    }

    // Debug: Log when holdings change
    $: if (holdings.length > 0) {
        console.log(
            "[PortfolioTreemap] Holdings loaded:",
            holdings.length,
            "items",
        );
    }

    // --- Treemap Layout Logic ---
    type TreemapNode = {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        data: {
            name: string;
            value: number;
            holding: Holding;
        };
    };

    let nodes: any[] = [];
    const CONTAINER_WIDTH = 120; // 3D units
    const CONTAINER_HEIGHT = 70; // 16:9 aspect roughly

    $: if (holdings.length > 0) {
        const root = hierarchy({
            name: "root",
            children: holdings.map((h) => ({
                name: h.tradingsymbol,
                value: h.value || h.quantity * h.last_price,
                holding: h,
            })),
        })
            .sum((d: any) => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        const layout = treemap()
            .tile(treemapSquarify)
            .size([CONTAINER_WIDTH, CONTAINER_HEIGHT])
            .paddingInner(1)
            .paddingOuter(0)
            .round(false);

        layout(root as any);
        nodes = root.leaves();
    }

    // --- Parallax & Interactvity ---
    // Scene rotation based on head position
    const sceneRot = spring({ x: 0, y: 0 }, { stiffness: 0.08, damping: 0.8 });

    // Light position moves opposite to head to simulate reflection
    const lightPos = spring({ x: 0, y: 0 }, { stiffness: 0.1, damping: 0.9 });

    $: {
        if ($isTracking) {
            sceneRot.set({
                x: $headPosition.y * 0.15, // Tilt X
                y: $headPosition.x * 0.25, // Pan Y
            });
            lightPos.set({
                x: -$headPosition.x * 80,
                y: -$headPosition.y * 60,
            });
        } else {
            sceneRot.set({ x: 0, y: 0 });
            lightPos.set({ x: 0, y: 0 });
        }
    }

    // --- Materials (Reused for efficiency) ---
    // High-end glass material settings - ADJUSTED FOR VISIBILITY
    const glassMaterialStats = {
        transmission: 0.3, // Reduced from 0.95 - less transparent
        thickness: 2.0, // Thicker glass
        roughness: 0.05, // Smoother
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        metalness: 0.2, // Slight metallic sheen
        envMapIntensity: 2.0, // Stronger reflections
        ior: 1.5,
        transparent: true,
        opacity: 0.85, // Added base opacity
    };

    // Color helpers - BRIGHTER COLORS
    function getGlassColor(pnl: number): string {
        return pnl >= 0 ? "#22c55e" : "#ef4444"; // Brighter green-500 or red-500
    }

    function getEmissiveColor(pnl: number): string {
        return pnl >= 0 ? "#10b981" : "#f43f5e"; // Brighter emit
    }

    // Hover state
    let hoveredIndex: number | null = null;
</script>

{#if visible}
    <!-- Fullscreen 2D Overlay (Title & Background) -->

    <!-- 3D Scene Content (Injected into Canvas via Threlte) -->
    <T.Group
        position={[0, 0, 0]}
        rotation={[$sceneRot.x, $sceneRot.y, 0]}
        scale={$zoomLevel * 0.8}
    >
        <!-- Dynamic Moving Light (Simulates User Reflection) -->
        <T.PointLight
            position={[$lightPos.x, $lightPos.y, 80]}
            intensity={5}
            color="#ffffff"
            distance={300}
            decay={1}
        />

        <!-- Strong Front Light -->
        <T.DirectionalLight
            position={[0, 50, 100]}
            intensity={3}
            color="#ffffff"
        />

        <!-- Ambient Fill - Much brighter -->
        <T.AmbientLight intensity={1.5} />

        <!-- Center the Treemap group -->
        <T.Group position={[-CONTAINER_WIDTH / 2, -CONTAINER_HEIGHT / 2, 0]}>
            {#each nodes as node, i (node.data.holding.tradingsymbol)}
                {@const w = node.x1 - node.x0}
                {@const h = node.y1 - node.y0}
                {@const x = node.x0 + w / 2}
                {@const y = CONTAINER_HEIGHT - (node.y0 + h / 2)}
                <!-- Flip Y for 3D -->
                {@const z = 0}
                {@const pnl = node.data.holding.pnl}
                {@const isHovered = hoveredIndex === i}

                <!-- Glass Block -->
                <T.Mesh
                    position={[x, y, isHovered ? 5 : 0]}
                    on:pointerover={() => (hoveredIndex = i)}
                    on:pointerout={() => (hoveredIndex = null)}
                    rotation={[isHovered ? 0.05 : 0, isHovered ? 0.05 : 0, 0]}
                >
                    <!-- Beveled Box for nice glass edges -->
                    <T.BoxGeometry args={[w - 0.5, h - 0.5, 4]} />

                    <T.MeshPhysicalMaterial
                        color={getGlassColor(pnl)}
                        emissive={getEmissiveColor(pnl)}
                        emissiveIntensity={isHovered ? 0.8 : 0.3}
                        {...glassMaterialStats}
                    />

                    <!-- Text Label (Floating above glass) - Only if block is large enough -->
                    {#if Math.min(w, h) > 8}
                        <Text
                            position={[0, 0, 2.2]}
                            text={node.data.name}
                            fontSize={Math.max(2, Math.min(w, h) * 0.18)}
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.03}
                            outlineColor="#000000"
                        />
                    {/if}

                    <!-- Detail Text (Visible on larger blocks or hover) -->
                    {#if isHovered || Math.min(w, h) > 18}
                        <Text
                            position={[
                                0,
                                -Math.max(3, Math.min(w, h) * 0.22),
                                2.2,
                            ]}
                            text={`${pnl >= 0 ? "+" : ""}${node.data.holding.day_change_percentage.toFixed(2)}%`}
                            fontSize={Math.max(1.5, Math.min(w, h) * 0.1)}
                            color={pnl >= 0 ? "#6ee7b7" : "#fda4af"}
                            anchorX="center"
                            anchorY="top"
                        />
                    {/if}
                </T.Mesh>
            {/each}
        </T.Group>
    </T.Group>
{/if}
