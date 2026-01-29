<script lang="ts">
    import { onMount } from "svelte";
    import { spring } from "svelte/motion";
    import {
        holdingsStore,
        totalPortfolioValue,
        totalPnL,
        type Holding,
    } from "$lib/stores/holdings";
    import { headPosition, isTracking, zoomLevel } from "$lib/stores/tracking";
    import { T, useTask } from "@threlte/core";
    import { Text } from "@threlte/extras";

    // Props
    export let visible = false;

    // Data
    $: holdings = $holdingsStore.holdings;
    $: isLoading = $holdingsStore.isLoading;
    $: totalValue = $totalPortfolioValue;

    // Fetch data when visible
    $: if (visible && holdings.length === 0 && !isLoading) {
        holdingsStore.fetch();
    }

    // --- Solar System Layout Engine ---
    type PlanetNode = {
        x: number;
        y: number;
        z: number;
        r: number;
        orbitRadius: number;
        angle: number;
        speed: number;
        color: string;
        borderColor: string;
        data: Holding;
    };

    let planets: PlanetNode[] = [];
    let orbits: number[] = [];

    // Layout Configuration - Matching code.html proportions
    const CENTER_RADIUS = 24; // Larger center hub
    const ORBIT_GAP = 28;
    const BASE_PLANET_SIZE = 5;

    // Colors from code.html
    const COLORS = {
        blue: {
            fill: "rgba(10, 132, 255, 0.35)",
            border: "#0A84FF",
            glow: "rgba(10, 132, 255, 0.25)",
        },
        emerald: {
            fill: "rgba(48, 209, 88, 0.35)",
            border: "#30D158",
            glow: "rgba(48, 209, 88, 0.25)",
        },
        purple: {
            fill: "rgba(191, 90, 242, 0.35)",
            border: "#BF5AF2",
            glow: "rgba(191, 90, 242, 0.25)",
        },
    };

    function getPlanetColors(pnl: number) {
        if (pnl > 2.0) return COLORS.emerald;
        if (pnl > 0) return COLORS.blue;
        return COLORS.purple;
    }

    $: if (holdings.length > 0) {
        const sorted = [...holdings].sort((a, b) => {
            const valA = a.value || a.quantity * a.last_price;
            const valB = b.value || b.quantity * b.last_price;
            return valB - valA;
        });

        const newPlanets: PlanetNode[] = [];
        const newOrbits: number[] = [];

        let currentOrbitIndex = 0;
        let currentOrbitRadius = CENTER_RADIUS + ORBIT_GAP;
        let itemsInCurrentOrbit = 0;

        const getOrbitCapacity = (r: number) =>
            Math.max(4, Math.floor((2 * Math.PI * r) / (BASE_PLANET_SIZE * 5)));

        let currentOrbitCapacity = getOrbitCapacity(currentOrbitRadius);
        newOrbits.push(currentOrbitRadius);

        sorted.forEach((h) => {
            const value = h.value || h.quantity * h.last_price;
            const sizeRatio = value / (sorted[0].value || 1);
            const planetRadius = Math.max(
                3,
                Math.min(8, BASE_PLANET_SIZE * (0.7 + sizeRatio * 0.5)),
            );

            if (itemsInCurrentOrbit >= currentOrbitCapacity) {
                currentOrbitIndex++;
                currentOrbitRadius += ORBIT_GAP;
                itemsInCurrentOrbit = 0;
                currentOrbitCapacity = getOrbitCapacity(currentOrbitRadius);
                newOrbits.push(currentOrbitRadius);
            }

            const angleStep = (2 * Math.PI) / currentOrbitCapacity;
            const angle = itemsInCurrentOrbit * angleStep - Math.PI / 2;
            const colors = getPlanetColors(h.pnl);

            newPlanets.push({
                x: Math.cos(angle) * currentOrbitRadius,
                y: Math.sin(angle) * currentOrbitRadius,
                z: 0,
                r: planetRadius,
                orbitRadius: currentOrbitRadius,
                angle: angle,
                speed:
                    (Math.random() * 0.03 + 0.01) *
                    (currentOrbitIndex % 2 === 0 ? 1 : -1),
                color: colors.border,
                borderColor: colors.border,
                data: h,
            });

            itemsInCurrentOrbit++;
        });

        planets = newPlanets;
        orbits = newOrbits;
    }

    // --- Interaction ---
    const sceneRot = spring({ x: 0, y: 0 }, { stiffness: 0.04, damping: 0.85 });

    $: {
        if ($isTracking) {
            sceneRot.set({
                x: $headPosition.y * 0.08,
                y: $headPosition.x * 0.12,
            });
        }
    }

    // Animation Loop
    let time = 0;
    useTask((delta) => {
        time += delta;
    });

    let hoveredIndex: number | null = null;

    // Ring material - matching code.html glass-ring style
    // background: rgba(255, 255, 255, 0.03); border: 2px solid rgba(255, 255, 255, 0.08);
    const ringMaterial = {
        color: "#ffffff",
        transparent: true,
        opacity: 0.03,
        side: 2,
    };

    const ringBorderMaterial = {
        color: "#ffffff",
        transparent: true,
        opacity: 0.08,
        side: 2,
    };
</script>

{#if visible}
    <!-- Ambient lighting for the scene -->
    <T.AmbientLight intensity={0.8} color="#f0f0ff" />
    <T.DirectionalLight
        position={[50, 50, 100]}
        intensity={1.2}
        color="#ffffff"
    />

    <T.Group rotation={[$sceneRot.x, $sceneRot.y, 0]} scale={$zoomLevel * 0.55}>
        <!-- CENTER HUB - Glass disc with total value -->
        <!-- Outer ring border -->
        <T.Mesh rotation={[0, 0, 0]}>
            <T.RingGeometry
                args={[CENTER_RADIUS - 0.5, CENTER_RADIUS + 0.5, 128]}
            />
            <T.MeshBasicMaterial {...ringBorderMaterial} />
        </T.Mesh>

        <!-- Inner fill -->
        <T.Mesh rotation={[0, 0, 0]}>
            <T.RingGeometry args={[0, CENTER_RADIUS, 128]} />
            <T.MeshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.06}
                side={2}
            />
        </T.Mesh>

        <!-- Center Text -->
        <Text
            position={[0, 4, 1]}
            text="CENTER"
            fontSize={2}
            color="#64748b"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.3}
        />
        <Text
            position={[0, -2, 1]}
            text={`₹${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            fontSize={4}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
        />

        <!-- ORBITAL RINGS - Glass tracks -->
        {#each orbits as radius, orbitIdx}
            <!-- Wide glass fill band -->
            <T.Mesh rotation={[0, 0, 0]}>
                <T.RingGeometry args={[radius - 6, radius + 6, 128]} />
                <T.MeshBasicMaterial {...ringMaterial} />
            </T.Mesh>

            <!-- Outer border -->
            <T.Mesh rotation={[0, 0, 0]}>
                <T.RingGeometry args={[radius + 5.5, radius + 6.5, 128]} />
                <T.MeshBasicMaterial {...ringBorderMaterial} />
            </T.Mesh>

            <!-- Inner border -->
            <T.Mesh rotation={[0, 0, 0]}>
                <T.RingGeometry args={[radius - 6.5, radius - 5.5, 128]} />
                <T.MeshBasicMaterial {...ringBorderMaterial} />
            </T.Mesh>
        {/each}

        <!-- PLANETS (Holdings) - Flat circles with glow -->
        {#each planets as planet, i (planet.data.tradingsymbol)}
            {@const isHovered = hoveredIndex === i}
            {@const currentAngle = planet.angle + time * planet.speed * 0.15}

            <T.Group
                position={[
                    Math.cos(currentAngle) * planet.orbitRadius,
                    Math.sin(currentAngle) * planet.orbitRadius,
                    2,
                ]}
            >
                <!-- Planet background fill -->
                <T.Mesh
                    on:pointerover={() => (hoveredIndex = i)}
                    on:pointerout={() => (hoveredIndex = null)}
                    scale={isHovered ? 1.15 : 1.0}
                >
                    <T.CircleGeometry args={[planet.r, 64]} />
                    <T.MeshBasicMaterial
                        color={planet.color}
                        transparent
                        opacity={0.45}
                    />
                </T.Mesh>

                <!-- Planet border ring -->
                <T.Mesh scale={isHovered ? 1.15 : 1.0}>
                    <T.RingGeometry
                        args={[planet.r - 0.3, planet.r + 0.3, 64]}
                    />
                    <T.MeshBasicMaterial
                        color={planet.borderColor}
                        transparent
                        opacity={0.9}
                    />
                </T.Mesh>

                <!-- Glow ring (outer) -->
                <T.Mesh scale={isHovered ? 1.2 : 1.0}>
                    <T.RingGeometry args={[planet.r, planet.r + 2, 64]} />
                    <T.MeshBasicMaterial
                        color={planet.borderColor}
                        transparent
                        opacity={isHovered ? 0.4 : 0.2}
                    />
                </T.Mesh>

                <!-- Symbol text -->
                <Text
                    position={[0, 0.5, 0.5]}
                    text={planet.data.tradingsymbol}
                    fontSize={Math.max(1.5, planet.r * 0.3)}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                />

                <!-- PnL text -->
                <Text
                    position={[0, -planet.r * 0.35, 0.5]}
                    text={`${planet.data.pnl >= 0 ? "+" : ""}${planet.data.day_change_percentage.toFixed(1)}%`}
                    fontSize={Math.max(1.0, planet.r * 0.2)}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="top"
                    fillOpacity={0.8}
                />
            </T.Group>
        {/each}
    </T.Group>
{/if}
