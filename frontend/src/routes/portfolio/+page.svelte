<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { goto } from "$app/navigation";
    import { spring } from "svelte/motion";
    import {
        holdingsStore,
        totalPortfolioValue,
        totalInvestedValue,
        type Holding,
    } from "$lib/stores/holdings";
    import { headPosition, zoomLevel, isTracking } from "$lib/stores/tracking";
    import { gestureBus } from "$lib/services/gestureBus";
    import { gestureBar } from "$lib/stores/gestureBar";
    import FaceTracker from "$lib/components/Tracking/FaceTracker.svelte";
    import BrandCard from "$lib/components/UI/BrandCard.svelte";
    import GestureGuide from "$lib/components/UI/GestureGuide.svelte";

    // Reactive data
    $: holdings = $holdingsStore.holdings;
    $: isLoading = $holdingsStore.isLoading;
    $: error = $holdingsStore.error;
    $: totalValue = $totalPortfolioValue;
    $: investedValue = $totalInvestedValue;

    // Parallax configuration
    const PARALLAX_MULTIPLIERS = [0.3, 0.6, 1.0]; // inner, middle, outer
    const PARALLAX_STRENGTH = 18; // pixels of movement

    // Spring configs for smooth, bouncy motion
    const springConfig = { stiffness: 0.08, damping: 0.35 };

    // Spring-animated offsets for each ring
    const innerSpring = spring({ x: 0, y: 0 }, springConfig);
    const middleSpring = spring({ x: 0, y: 0 }, springConfig);
    const outerSpring = spring(
        { x: 0, y: 0 },
        { stiffness: 0.06, damping: 0.3 },
    ); // Outer moves slower

    // Update springs when head position changes
    $: if ($isTracking) {
        innerSpring.set({
            x: $headPosition.x * PARALLAX_MULTIPLIERS[0] * PARALLAX_STRENGTH,
            y:
                $headPosition.y *
                PARALLAX_MULTIPLIERS[0] *
                PARALLAX_STRENGTH *
                0.7,
        });
        middleSpring.set({
            x: $headPosition.x * PARALLAX_MULTIPLIERS[1] * PARALLAX_STRENGTH,
            y:
                $headPosition.y *
                PARALLAX_MULTIPLIERS[1] *
                PARALLAX_STRENGTH *
                0.7,
        });
        outerSpring.set({
            x: $headPosition.x * PARALLAX_MULTIPLIERS[2] * PARALLAX_STRENGTH,
            y:
                $headPosition.y *
                PARALLAX_MULTIPLIERS[2] *
                PARALLAX_STRENGTH *
                0.7,
        });
    } else {
        innerSpring.set({ x: 0, y: 0 });
        middleSpring.set({ x: 0, y: 0 });
        outerSpring.set({ x: 0, y: 0 });
    }

    // Reactive spring values
    $: innerOffset = $innerSpring;
    $: middleOffset = $middleSpring;
    $: outerOffset = $outerSpring;

    // Gesture navigation
    let lastGestureTime = 0;
    const GESTURE_COOLDOWN = 1500;

    onMount(() => {
        // Set gesture bar to portfolio mode
        gestureBar.setPortfolio();

        if (holdings.length === 0) {
            holdingsStore.fetch();
        }

        // Listen for Fist gesture to go back
        const unsubFist = gestureBus.on("FIST_DETECTED", () => {
            const now = Date.now();
            if (now - lastGestureTime < GESTURE_COOLDOWN) return;
            lastGestureTime = now;
            console.log("[Portfolio] Fist detected - navigating back");
            goto("/");
        });

        return () => {
            unsubFist();
            // Reset gesture bar when leaving
            gestureBar.setIdle();
        };
    });

    // Layout configuration - SCALED DOWN to fit viewport
    const VIEW_SIZE = 100; // Using percentage-based positioning
    const CENTER = 50;

    // Ring sizes scaled to fit (percentages)
    const CENTER_SIZE = 22; // % of container
    const RING_SIZES = [38, 58, 78]; // Inner, middle, outer ring sizes (% of container)
    const RING_RADII = [17, 27, 37]; // Radii for planet positioning (% from center)

    const MIN_PLANET_SIZE = 50; // px
    const MAX_PLANET_SIZE = 90; // px

    // Colors - Maroon/Red for losses instead of purple
    const COLORS = {
        blue: {
            bg: "rgba(10, 132, 255, 0.35)",
            border: "rgba(10, 132, 255, 0.8)",
            glow: "rgba(10, 132, 255, 0.25)",
        },
        emerald: {
            bg: "rgba(48, 209, 88, 0.35)",
            border: "rgba(48, 209, 88, 0.8)",
            glow: "rgba(48, 209, 88, 0.25)",
        },
        maroon: {
            bg: "rgba(220, 53, 69, 0.35)",
            border: "rgba(220, 53, 69, 0.8)",
            glow: "rgba(220, 53, 69, 0.25)",
        },
    };

    function getColors(pnl: number) {
        if (pnl > 2.0) return COLORS.emerald;
        if (pnl > 0) return COLORS.blue;
        return COLORS.maroon;
    }

    // Calculate orbital layout
    type Planet = {
        x: number; // % from left
        y: number; // % from top
        size: number; // px
        colors: typeof COLORS.blue;
        holding: Holding;
        orbitIndex: number;
    };

    let planets: Planet[] = [];

    $: if (holdings.length > 0) {
        const sorted = [...holdings].sort((a, b) => {
            const valA = a.value || a.quantity * a.last_price;
            const valB = b.value || b.quantity * b.last_price;
            return valB - valA;
        });

        const maxValue =
            sorted[0]?.value ||
            sorted[0]?.quantity * sorted[0]?.last_price ||
            1;
        const newPlanets: Planet[] = [];

        // Capacity per orbit
        const capacities = [5, 7, 10]; // Inner to outer
        let orbitIndex = 0;
        let itemsInOrbit = 0;

        sorted.forEach((h) => {
            if (
                orbitIndex < RING_RADII.length &&
                itemsInOrbit >= capacities[orbitIndex]
            ) {
                orbitIndex++;
                itemsInOrbit = 0;
            }

            const currentOrbitIndex = Math.min(
                orbitIndex,
                RING_RADII.length - 1,
            );
            const radius = RING_RADII[currentOrbitIndex];
            const capacity = capacities[currentOrbitIndex];

            const value = h.value || h.quantity * h.last_price;
            const sizeRatio = value / maxValue;
            const planetSize =
                MIN_PLANET_SIZE +
                (MAX_PLANET_SIZE - MIN_PLANET_SIZE) * sizeRatio;

            const angleStep = (2 * Math.PI) / capacity;
            const offset = currentOrbitIndex * 0.25;
            const angle = itemsInOrbit * angleStep - Math.PI / 2 + offset;

            newPlanets.push({
                x: CENTER + Math.cos(angle) * radius,
                y: CENTER + Math.sin(angle) * radius,
                size: planetSize,
                colors: getColors(h.day_change_percentage),
                holding: h,
                orbitIndex: currentOrbitIndex,
            });

            itemsInOrbit++;
        });

        planets = newPlanets;
    }

    // Hover state
    let hoveredSymbol: string | null = null;

    // Calculate total P&L
    $: totalPnL = totalValue - investedValue;
    $: totalPnLPercent =
        investedValue > 0 ? (totalPnL / investedValue) * 100 : 0;

    // Calculate today's gain
    $: todaysGain = holdings.reduce((sum, h) => sum + (h.day_change || 0), 0);
    $: todaysGainPercent =
        investedValue > 0 ? (todaysGain / investedValue) * 100 : 0;
</script>

<svelte:head>
    <title>Portfolio | TradeXR</title>
    <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div class="portfolio-page">
    <!-- FaceTracker for camera, gestures, and head tracking -->
    <FaceTracker />

    <!-- Brand Logo (Top Left) -->
    <div class="absolute top-6 left-6 z-50">
        <BrandCard />
    </div>

    <!-- Context-Aware Gesture Guide -->
    <GestureGuide />

    <!-- Main Content -->
    <main class="main-content">
        {#if isLoading}
            <div class="loading">Loading portfolio...</div>
        {:else if error}
            <div class="error">{error}</div>
        {:else if holdings.length === 0}
            <div class="empty">
                No holdings found. Please login to Kite first.
            </div>
        {:else}
            <!-- Solar System Container with Zoom -->
            <div class="solar-system-wrapper">
                <div
                    class="solar-system"
                    style="transform: rotateX(12deg) rotateY(-8deg) scale({$zoomLevel})"
                >
                    <!-- Orbital Rings with Parallax -->
                    <div
                        class="ring ring-outer"
                        style="--size: {RING_SIZES[2]}%; transform: translate(calc(-50% + {outerOffset.x}px), calc(-50% + {outerOffset.y}px))"
                    ></div>
                    <div
                        class="ring ring-middle"
                        style="--size: {RING_SIZES[1]}%; transform: translate(calc(-50% + {middleOffset.x}px), calc(-50% + {middleOffset.y}px))"
                    ></div>
                    <div
                        class="ring ring-inner"
                        style="--size: {RING_SIZES[0]}%; transform: translate(calc(-50% + {innerOffset.x}px), calc(-50% + {innerOffset.y}px))"
                    ></div>

                    <!-- Center Hub -->
                    <div class="center-hub" style="--size: {CENTER_SIZE}%">
                        <p class="center-label">PORTFOLIO VALUE</p>
                        <p class="center-value">
                            ₹{totalValue.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                            })}
                        </p>
                        <p
                            class="center-pnl"
                            class:positive={totalPnL >= 0}
                            class:negative={totalPnL < 0}
                        >
                            {totalPnL >= 0 ? "+" : ""}₹{totalPnL.toLocaleString(
                                undefined,
                                { maximumFractionDigits: 0 },
                            )}
                            ({totalPnLPercent >= 0
                                ? "+"
                                : ""}{totalPnLPercent.toFixed(2)}%)
                        </p>
                    </div>

                    <!-- Planets -->
                    {#each planets as planet (planet.holding.tradingsymbol)}
                        {@const h = planet.holding}
                        {@const currentValue =
                            h.value || h.quantity * h.last_price}
                        {@const invested =
                            h.investedValue || h.quantity * h.average_price}
                        {@const pnl = currentValue - invested}
                        {@const pnlPercent =
                            invested > 0 ? (pnl / invested) * 100 : 0}
                        {@const isHovered = hoveredSymbol === h.tradingsymbol}

                        <div
                            class="planet"
                            class:hovered={isHovered}
                            style="
                                left: {planet.x}%;
                                top: {planet.y}%;
                                width: {planet.size}px;
                                height: {planet.size}px;
                                --bg-color: {planet.colors.bg};
                                --border-color: {planet.colors.border};
                                --glow-color: {planet.colors.glow};
                            "
                            on:mouseenter={() =>
                                (hoveredSymbol = h.tradingsymbol)}
                            on:mouseleave={() => (hoveredSymbol = null)}
                        >
                            <!-- Default View -->
                            <span
                                class="planet-symbol"
                                style="font-size: {Math.max(
                                    9,
                                    planet.size * 0.13,
                                )}px">{h.tradingsymbol}</span
                            >
                            <span
                                class="planet-value"
                                style="font-size: {Math.max(
                                    7,
                                    planet.size * 0.1,
                                )}px"
                                >₹{currentValue.toLocaleString(undefined, {
                                    maximumFractionDigits: 0,
                                    notation: "compact",
                                })}</span
                            >

                            <!-- Hover Tooltip Card -->
                            {#if isHovered}
                                <div class="tooltip-card">
                                    <div class="tooltip-header">
                                        {h.tradingsymbol}
                                    </div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-label"
                                            >Current</span
                                        >
                                        <span class="tooltip-value"
                                            >₹{currentValue.toLocaleString(
                                                undefined,
                                                { maximumFractionDigits: 0 },
                                            )}</span
                                        >
                                    </div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-label"
                                            >Invested</span
                                        >
                                        <span class="tooltip-value"
                                            >₹{invested.toLocaleString(
                                                undefined,
                                                { maximumFractionDigits: 0 },
                                            )}</span
                                        >
                                    </div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-label">Qty</span>
                                        <span class="tooltip-value"
                                            >{h.quantity}</span
                                        >
                                    </div>
                                    <div class="tooltip-divider"></div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-label">P&L</span>
                                        <span
                                            class="tooltip-value"
                                            class:positive={pnl >= 0}
                                            class:negative={pnl < 0}
                                        >
                                            {pnl >= 0
                                                ? "+"
                                                : ""}₹{pnl.toLocaleString(
                                                undefined,
                                                { maximumFractionDigits: 0 },
                                            )}
                                            ({pnlPercent >= 0
                                                ? "+"
                                                : ""}{pnlPercent.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-label">Today</span>
                                        <span
                                            class="tooltip-value"
                                            class:positive={h.day_change_percentage >=
                                                0}
                                            class:negative={h.day_change_percentage <
                                                0}
                                        >
                                            {h.day_change_percentage >= 0
                                                ? "+"
                                                : ""}{h.day_change_percentage.toFixed(
                                                2,
                                            )}%
                                        </span>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </main>

    <!-- Footer Bar -->
    <footer class="footer-bar">
        <div class="footer-stats">
            <div class="stat-item">
                <span class="stat-label">Invested</span>
                <span class="stat-value"
                    >₹{investedValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                    })}</span
                >
            </div>
            <div class="stat-item">
                <span class="stat-label">Today's Gain</span>
                <span
                    class="stat-value"
                    class:positive={todaysGain >= 0}
                    class:negative={todaysGain < 0}
                >
                    {todaysGain >= 0 ? "+" : ""}₹{todaysGain.toLocaleString(
                        undefined,
                        { maximumFractionDigits: 0 },
                    )}
                    ({todaysGainPercent >= 0
                        ? "+"
                        : ""}{todaysGainPercent.toFixed(2)}%)
                </span>
            </div>
        </div>
        <div class="legend">
            <div class="legend-item">
                <span class="legend-dot blue"></span>
                <span>Gain</span>
            </div>
            <div class="legend-item">
                <span class="legend-dot green"></span>
                <span>Strong Gain</span>
            </div>
            <div class="legend-item">
                <span class="legend-dot red"></span>
                <span>Loss</span>
            </div>
        </div>
    </footer>
</div>

<style>
    :global(body) {
        margin: 0;
        background: #0f1115;
        font-family: "Manrope", sans-serif;
        -webkit-font-smoothing: antialiased;
    }

    .portfolio-page {
        min-height: 100vh;
        background: #0f1115;
        color: #fff;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .header h1 {
        font-size: 1.125rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin: 0;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .gesture-hint {
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.35);
        font-weight: 500;
    }

    .back-link {
        color: rgba(255, 255, 255, 0.5);
        text-decoration: none;
        font-size: 0.875rem;
        transition: color 0.2s;
    }
    .back-link:hover {
        color: #fff;
    }

    .main-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        overflow: hidden;
    }

    .loading,
    .error,
    .empty {
        font-size: 1.125rem;
        color: rgba(255, 255, 255, 0.5);
    }
    .error {
        color: #f87171;
    }

    /* Solar System Container - constrained to viewport */
    .solar-system-wrapper {
        width: min(80vh, 90vw);
        height: min(80vh, 90vw);
        perspective: 1500px;
    }

    .solar-system {
        position: relative;
        width: 100%;
        height: 100%;
        transform-style: preserve-3d;
        transition: transform 0.15s ease-out;
    }

    /* Glass Ring Styles */
    .ring {
        position: absolute;
        left: 50%;
        top: 50%;
        width: var(--size);
        height: var(--size);
        border-radius: 50%;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        background: rgba(255, 255, 255, 0.02);
        transition: transform 0.1s ease-out;
        border: 1.5px solid rgba(255, 255, 255, 0.08);
        box-shadow:
            inset 0 0 20px rgba(255, 255, 255, 0.03),
            0 0 1px rgba(255, 255, 255, 0.15);
    }

    /* Center Hub */
    .center-hub {
        position: absolute;
        left: 50%;
        top: 50%;
        width: var(--size);
        height: var(--size);
        transform: translate(-50%, -50%);
        border-radius: 50%;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        background: rgba(255, 255, 255, 0.05);
        border: 1.5px solid rgba(255, 255, 255, 0.1);
        box-shadow:
            inset 0 0 20px rgba(255, 255, 255, 0.05),
            0 0 1px rgba(255, 255, 255, 0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 5;
    }

    .center-label {
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 0.2em;
        color: #64748b;
        text-transform: uppercase;
        margin: 0 0 2px 0;
    }

    .center-value {
        font-size: 18px;
        font-weight: 800;
        color: #ffffff;
        margin: 0;
    }

    .center-divider {
        width: 40%;
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 6px 0;
    }

    .center-invested {
        font-size: 9px;
        font-weight: 500;
        color: #94a3b8;
        margin: 0;
    }

    .center-pnl {
        font-size: 10px;
        font-weight: 700;
        margin: 2px 0 0 0;
    }
    .center-pnl.positive {
        color: #30d158;
    }
    .center-pnl.negative {
        color: #dc3545;
    }

    /* Planet Bubbles */
    .planet {
        position: absolute;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background-color: var(--bg-color);
        border: 1.5px solid var(--border-color);
        box-shadow: 0 4px 20px var(--glow-color);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
            transform 0.3s ease,
            box-shadow 0.3s ease;
        z-index: 10;
        padding: 4px;
    }

    .planet:hover,
    .planet.hovered {
        transform: translate(-50%, -50%) scale(1.05);
        box-shadow: 0 8px 30px var(--glow-color);
        z-index: 100;
    }

    .planet-symbol {
        font-weight: 800;
        color: #ffffff;
        line-height: 1.1;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        letter-spacing: 0.02em;
        text-align: center;
        max-width: 90%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .planet-value {
        font-weight: 600;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.1;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        margin-top: 1px;
    }

    /* Tooltip Card */
    .tooltip-card {
        position: absolute;
        left: 110%;
        top: 50%;
        transform: translateY(-50%);
        min-width: 160px;
        padding: 12px 14px;
        background: rgba(22, 25, 30, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        pointer-events: none;
    }

    .tooltip-header {
        font-size: 12px;
        font-weight: 800;
        color: #ffffff;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tooltip-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
    }

    .tooltip-label {
        font-size: 10px;
        font-weight: 500;
        color: #64748b;
    }

    .tooltip-value {
        font-size: 10px;
        font-weight: 700;
        color: #ffffff;
    }

    .tooltip-value.positive {
        color: #30d158;
    }
    .tooltip-value.negative {
        color: #dc3545;
    }

    .tooltip-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
        margin: 6px 0;
    }

    /* Footer Bar */
    .footer-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(15, 17, 21, 0.9);
    }

    .footer-stats {
        display: flex;
        gap: 2.5rem;
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .stat-label {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #64748b;
    }

    .stat-value {
        font-size: 14px;
        font-weight: 700;
        color: #ffffff;
    }

    .stat-value.positive {
        color: #30d158;
    }
    .stat-value.negative {
        color: #dc3545;
    }

    /* Legend */
    .legend {
        display: flex;
        gap: 1.5rem;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgba(255, 255, 255, 0.5);
    }

    .legend-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
    }

    .legend-dot.blue {
        background: #0a84ff;
        box-shadow: 0 0 6px rgba(10, 132, 255, 0.6);
    }

    .legend-dot.green {
        background: #30d158;
        box-shadow: 0 0 6px rgba(48, 209, 88, 0.6);
    }

    .legend-dot.red {
        background: #dc3545;
        box-shadow: 0 0 6px rgba(220, 53, 69, 0.6);
    }
</style>
