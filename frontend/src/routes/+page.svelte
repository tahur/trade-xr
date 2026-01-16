<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Canvas } from "@threlte/core";
    import { spring } from "svelte/motion";
    import Scene3D from "$lib/components/Scene3D/Scene3D.svelte";
    import { kite } from "$lib/services/kite";
    import { etfStore } from "$lib/services/etfService";
    import { DEFAULT_ETF, SUPPORTED_ETFS } from "$lib/config/etfs";

    // Components
    import BrandCard from "$lib/components/UI/BrandCard.svelte";
    import FaceTracker from "$lib/components/Tracking/FaceTracker.svelte";
    import PriceTargetOverlay from "$lib/components/UI/PriceTargetOverlay.svelte";
    import StatusBar from "$lib/components/UI/StatusBar.svelte";
    import SettingsCard from "$lib/components/UI/SettingsCard.svelte";
    import DynamicIsland from "$lib/components/UI/DynamicIsland.svelte";
    import ETFSelector from "$lib/components/UI/ETFSelector.svelte";
    import ApiKeyModal from "$lib/components/UI/ApiKeyModal.svelte";

    // Stores
    import {
        headPosition,
        sensitivity,
        smoothZoom,
        twoHandPinch,
        isTracking,
    } from "$lib/stores/tracking";
    import { tradingStore } from "$lib/stores/trading";
    import { positionsStore, hasOpenPositions } from "$lib/stores/positions";
    import { dynamicIsland } from "$lib/stores/dynamicIsland";

    // Kite Login State
    let kiteStatus = "Not Connected";
    let kiteState: "NOT_CONFIGURED" | "CONFIGURED" | "CONNECTED" =
        "NOT_CONFIGURED";
    let showApiModal = false;
    let isConnecting = false;

    function updateKiteState() {
        if (kiteStatus === "Connected") {
            kiteState = "CONNECTED";
            return;
        }

        const k = localStorage.getItem("kite_api_key");
        const s = localStorage.getItem("kite_api_secret");

        if (k && s) {
            kiteState = "CONFIGURED";
        } else {
            kiteState = "NOT_CONFIGURED";
        }
    }

    // React to status changes
    $: kiteStatus, updateKiteState();

    function handleSetup() {
        showApiModal = true;
    }

    function handleConnect() {
        const apiKey = localStorage.getItem("kite_api_key");
        if (!apiKey) {
            showApiModal = true;
            return;
        }
        isConnecting = true;
        // Redirect to Kite Login
        window.location.href = `https://kite.trade/connect/login?v=3&api_key=${apiKey}`;
    }

    onMount(async () => {
        updateKiteState();

        // --- BYOK: Auto-configure Backend ---
        const storedKey = localStorage.getItem("kite_api_key");
        const storedSecret = localStorage.getItem("kite_api_secret");

        if (storedKey && storedSecret) {
            try {
                await fetch("http://127.0.0.1:8000/config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        api_key: storedKey,
                        api_secret: storedSecret,
                    }),
                });
                console.log("[BYOK] Backend configured from storage.");
            } catch (e) {
                console.error("[BYOK] Auto-config failed:", e);
            }
        }

        // Handle Zerodha Redirect
        const urlParams = new URLSearchParams(window.location.search);
        const requestToken = urlParams.get("request_token");

        if (requestToken) {
            kiteStatus = "Connecting...";
            isConnecting = true;
            dynamicIsland.show(
                {
                    type: "api",
                    message: "Connecting to Kite API...",
                    severity: "info",
                },
                2000,
            );

            try {
                await kite.login(requestToken);
                kiteStatus = "Connected";
                isConnecting = false;
                dynamicIsland.show(
                    {
                        type: "api",
                        message: "Connected to Kite API ✓",
                        severity: "success",
                    },
                    2500,
                );

                // Start polling real positions from Kite
                positionsStore.startPolling(5000); // Poll every 5 seconds

                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname,
                );
            } catch (e) {
                console.error("Kite Login Error:", e);
                kiteStatus = "Connection Failed";
                isConnecting = false;
                dynamicIsland.show(
                    {
                        type: "api",
                        message: "Kite API Connection Failed",
                        severity: "error",
                    },
                    3000,
                );
            }
        }
    });

    // Stop polling on unmount
    onDestroy(() => {
        positionsStore.stopPolling();
    });

    // Currently selected ETF
    let selectedETF = DEFAULT_ETF;

    // Reactive values from store
    $: candles = $etfStore.candles;
    $: livePrice = $etfStore.ltp;
    $: priceChangePercent = $etfStore.changePercent;

    // Sync REAL P&L to Dynamic Island - show selected ETF's position or aggregate
    $: {
        if ($hasOpenPositions) {
            // Find position matching currently selected ETF
            const matchingPosition = $positionsStore.positions.find(
                (p) => p.symbol === selectedETF.symbol,
            );

            if (matchingPosition) {
                // Show P&L for the selected ETF
                const pnlPercent =
                    matchingPosition.averagePrice > 0
                        ? (matchingPosition.pnl /
                              (matchingPosition.averagePrice *
                                  Math.abs(matchingPosition.quantity))) *
                          100
                        : 0;

                dynamicIsland.setLiveActivity({
                    symbol: matchingPosition.symbol,
                    pnl: matchingPosition.pnl,
                    pnlPercent: pnlPercent,
                    avgPrice: matchingPosition.averagePrice,
                    currentPrice: matchingPosition.lastPrice,
                    position: "OPEN",
                });
            } else {
                // No position for selected ETF - show aggregate
                const firstPos = $positionsStore.positions[0];
                dynamicIsland.setLiveActivity({
                    symbol: `${$positionsStore.positions.length} positions`,
                    pnl: $positionsStore.totalPnl,
                    pnlPercent: $positionsStore.totalPnlPercent,
                    avgPrice: firstPos?.averagePrice || 0,
                    currentPrice: firstPos?.lastPrice || 0,
                    position: "OPEN",
                });
            }
        }
    }

    // Reactive chart bounds - default to reasonable values if no data
    $: minLow =
        candles.length > 0 ? Math.min(...candles.map((c) => c.low)) : 25;
    $: maxHigh =
        candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : 30;
    $: centerPrice = (minLow + maxHigh) / 2;

    // Sync Dynamic Island with ETF data
    $: {
        if ($etfStore.ltp > 0) {
            dynamicIsland.updateTicker({
                symbol: selectedETF.symbol,
                price: $etfStore.ltp,
                change: $etfStore.change,
                changePercent: $etfStore.changePercent,
            });
        }
    }

    // Start polling on mount
    onMount(() => {
        etfStore.startPolling(selectedETF);

        return () => {
            etfStore.stopPolling();
        };
    });

    // Function to switch ETF
    function switchToETF(etf: typeof selectedETF) {
        // Don't do anything if selecting the same ETF
        if (etf.symbol === selectedETF.symbol) return;

        selectedETF = etf;
        etfStore.switchETF(etf);

        // Immediately update ticker with new symbol (price will update when data arrives)
        // This ensures the correct symbol is saved for when the notification collapses
        dynamicIsland.updateTicker({
            symbol: etf.symbol,
            price: $etfStore.ltp || 0,
            change: $etfStore.change || 0,
            changePercent: $etfStore.changePercent || 0,
        });

        // Show confirmation in Dynamic Island
        dynamicIsland.show(
            {
                type: "api",
                message: `Switched to ${etf.name}`,
                severity: "success",
            },
            1500,
        );
    }

    // Import zoomLevel for scroll wheel control
    import {
        zoomLevel,
        ZOOM_MIN,
        ZOOM_MAX,
        clampZoom,
    } from "$lib/stores/tracking";

    // Scroll wheel zoom handler
    function handleWheel(event: WheelEvent) {
        event.preventDefault();
        const delta = event.deltaY * 0.003; // Increased sensitivity (3x)
        zoomLevel.update((z) => clampZoom(z + delta));
    }

    // Keyboard zoom shortcuts (+ and -)
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "+" || event.key === "=") {
            zoomLevel.update((z) => clampZoom(z - 0.2)); // Zoom in (faster)
        } else if (event.key === "-" || event.key === "_") {
            zoomLevel.update((z) => clampZoom(z + 0.2)); // Zoom out (faster)
        } else if (event.key === "0") {
            zoomLevel.set(1.0); // Reset zoom
        }
    }

    // Base camera position - trading desk perspective (looking at monitor)
    const baseCamX = 25; // Center X to see all 50 candles
    $: baseCamY = 8; // Lowered for larger chart view
    const baseCamZ = 45; // Closer for bigger candles (was 60)

    // Spring for smooth camera motion
    const camPos = spring(
        { x: baseCamX, y: 10, z: baseCamZ },
        { stiffness: 0.08, damping: 0.6 },
    );

    // Reactive camera updates - responds to centerPrice changes
    $: {
        const xOffset = $headPosition.x * $sensitivity * 50;
        const yOffset = $headPosition.y * $sensitivity * 20;
        const zOffset = ($headPosition.z - 0.45) * -300;
        const zoomMultiplier = $smoothZoom; // Use smooth spring zoom

        camPos.set({
            x: baseCamX + xOffset,
            y: baseCamY + yOffset,
            z: Math.max(
                50,
                Math.min(300, (baseCamZ + zOffset) * zoomMultiplier),
            ),
        });
    }
</script>

<!-- Keyboard handler -->
<svelte:window on:keydown={handleKeyDown} />

<div
    class="h-screen w-full overflow-hidden relative font-sans"
    style="background: 
        radial-gradient(ellipse at 40% 20%, rgba(139, 92, 246, 0.18) 0%, transparent 45%),
        radial-gradient(ellipse at 80% 70%, rgba(99, 102, 241, 0.12) 0%, transparent 40%),
        radial-gradient(ellipse at 20% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 35%),
        linear-gradient(135deg, #1e1b2e 0%, #181526 35%, #13111f 70%, #0e0c18 100%);
    "
    on:wheel={handleWheel}
>
    <!-- 3D Scene Layer -->
    <div class="absolute inset-0 z-0">
        <Canvas shadows>
            <Scene3D {candles} cameraPosition={$camPos} />
        </Canvas>
    </div>

    <!-- Holographic Frame Border -->
    <div class="absolute inset-0 pointer-events-none z-5">
        <!-- Top edge glow -->
        <div
            class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
        ></div>
        <!-- Bottom edge glow -->
        <div
            class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
        ></div>
        <!-- Left edge glow -->
        <div
            class="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent"
        ></div>
        <!-- Right edge glow -->
        <div
            class="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent"
        ></div>

        <!-- Corner accents -->
        <div
            class="absolute top-3 left-3 w-8 h-8 border-l-2 border-t-2 border-cyan-500/40"
        ></div>
        <div
            class="absolute top-3 right-3 w-8 h-8 border-r-2 border-t-2 border-cyan-500/40"
        ></div>
        <div
            class="absolute bottom-3 left-3 w-8 h-8 border-l-2 border-b-2 border-cyan-500/40"
        ></div>
        <div
            class="absolute bottom-3 right-3 w-8 h-8 border-r-2 border-b-2 border-cyan-500/40"
        ></div>
    </div>

    <!-- UI Layer -->
    <div
        class="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between"
    >
        <!-- Top Row -->
        <div class="flex justify-between items-start pointer-events-auto">
            <!-- Left Column: Brand + Settings (Simplified) -->
            <div class="flex flex-col justify-between h-full">
                <!-- 3D Brand Card -->
                <BrandCard />

                <!-- Settings Card -->
                <SettingsCard />
            </div>
        </div>

        <!-- Zoom indicator -->
        <div class="text-right mb-2">
            <p class="text-[10px] text-slate-500 uppercase tracking-widest">
                Zoom
            </p>
            <p
                class={`text-sm font-mono transition-colors ${$twoHandPinch.isActive ? "text-yellow-400" : "text-cyan-400/70"}`}
            >
                {(100 / $zoomLevel).toFixed(0)}%
            </p>
            {#if $twoHandPinch.isActive}
                <p class="text-[9px] text-yellow-400/60 mt-1 animate-pulse">
                    ✋ PINCH ZOOM ✋
                </p>
            {/if}
        </div>
    </div>

    <!-- Dynamic Island Notification Center -->
    <DynamicIsland />

    <!-- ETF Selector -->
    <ETFSelector etfs={SUPPORTED_ETFS} {selectedETF} onSelect={switchToETF} />

    <!-- Hover-to-Target Price Selector -->
    <PriceTargetOverlay
        minPrice={minLow}
        maxPrice={maxHigh}
        symbol={selectedETF.symbol}
    />

    <!-- Consolidated Status Bar (bottom-left) -->
    <StatusBar
        isLive={$isTracking}
        {kiteState}
        loading={isConnecting}
        on:setup={handleSetup}
        on:connect={handleConnect}
    />

    <!-- API Key Modal (Global) -->
    <ApiKeyModal
        isOpen={showApiModal}
        on:close={() => {
            showApiModal = false;
            updateKiteState();
        }}
    />

    <!-- Face Tracker -->
    <FaceTracker />
</div>

<style>
    :global(body) {
        background: #0a0a14;
    }
</style>
