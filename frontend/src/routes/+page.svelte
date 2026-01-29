<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Canvas, T } from "@threlte/core";
    import { spring } from "svelte/motion"; // Keep spring for rotation only
    import { fade } from "svelte/transition";
    import { OrbitControls } from "@threlte/extras";
    import {
        holdingsStore,
        totalPortfolioValue,
        totalPnL,
    } from "$lib/stores/holdings";
    import {
        animationController,
        type CameraState,
    } from "$lib/controllers/AnimationController";
    import { gestureBus } from "$lib/services/gestureBus";
    import Scene3D from "$lib/components/Scene3D/Scene3D.svelte";
    import { kite } from "$lib/services/kite";
    import { etfStore } from "$lib/services/etfService";
    import { DEFAULT_ETF, SUPPORTED_ETFS } from "$lib/config/etfs";

    // Components
    import BrandCard from "$lib/components/UI/BrandCard.svelte";
    import FaceTracker from "$lib/components/Tracking/FaceTracker.svelte";
    import PriceTargetOverlay from "$lib/components/UI/PriceTargetOverlay.svelte";
    import ControlCenter from "$lib/components/UI/ControlCenter.svelte";
    import DynamicIsland from "$lib/components/UI/DynamicIsland.svelte";
    import ETFSelector from "$lib/components/UI/ETFSelector.svelte";
    import ZoomIndicator from "$lib/components/UI/ZoomIndicator.svelte";
    import PortfolioSolarSystem from "$lib/components/UI/PortfolioSolarSystem.svelte";
    import { isDeviceSupported } from "$lib/utils/DeviceGuard";

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
    import { ordersStore, hasPendingOrders } from "$lib/stores/orders";
    import { dynamicIsland } from "$lib/stores/dynamicIsland";
    import { selectedETFStore } from "$lib/stores/selectedETF";

    // Kite Login State
    let kiteStatus = "Not Connected";
    let kiteState: "NOT_CONFIGURED" | "CONFIGURED" | "CONNECTED" =
        "NOT_CONFIGURED";
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

    function handleConnect() {
        const apiKey = localStorage.getItem("kite_api_key");
        if (!apiKey) {
            // Ideally should open Control Center here, but since it's user-driven usually they're already there.
            // ControlCenter component handles the UI for missing keys.
            return;
        }
        isConnecting = true;
        // Redirect to Kite Login
        window.location.href = `https://kite.trade/connect/login?v=3&api_key=${apiKey}`;
    }

    // Device support check
    let deviceSupport: { supported: boolean; reason?: string } = {
        supported: true,
    };

    onMount(async () => {
        // Check device compatibility first
        deviceSupport = isDeviceSupported();
        if (!deviceSupport.supported) {
            return; // Don't initialize if device not supported
        }

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
            // Fresh login flow
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
                ordersStore.startPolling(3000); // Poll orders more frequently

                // Immediately refresh chart data after login
                etfStore.refresh();

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
        } else {
            // No request token - check if existing session is valid
            // Try to fetch margins to verify session
            try {
                const margins = await kite.getMargins();
                if (
                    margins &&
                    (margins.available_cash !== undefined ||
                        margins.available_margin !== undefined)
                ) {
                    // Session is valid! Start polling
                    console.log(
                        "[Session] Existing session detected, starting polling...",
                    );
                    kiteStatus = "Connected";
                    positionsStore.startPolling(5000);
                    ordersStore.startPolling(3000);

                    // Immediately refresh chart data for existing session
                    etfStore.refresh();
                }
            } catch (e) {
                // No valid session - that's fine, user needs to login
                console.log("[Session] No existing session found");
            }
        }
    });

    // Stop polling on unmount
    onDestroy(() => {
        positionsStore.stopPolling();
        ordersStore.stopPolling();
    });

    // Currently selected ETF
    let selectedETF = DEFAULT_ETF;

    // Reactive values from store
    $: candles = $etfStore.candles;
    $: livePrice = $etfStore.ltp;
    $: priceChangePercent = $etfStore.changePercent;

    // Dynamic Island Priority: Pending Orders > P&L (only for selected ETF)
    // Explicitly track positions array to ensure reactivity when positions load after login
    $: positionsCount = $positionsStore.positions.length;
    $: pendingOrdersCount = $ordersStore.pendingOrders.length;

    $: {
        // Force reactivity by reading these values
        const _p = positionsCount;
        const _o = pendingOrdersCount;

        // Check for pending orders first (higher priority)
        const pendingForSymbol = $ordersStore.pendingOrders.filter(
            (o) => o.symbol === selectedETF.symbol,
        );

        if (pendingForSymbol.length > 0) {
            // Show pending order status for selected ETF
            const firstPending = pendingForSymbol[0];
            dynamicIsland.setPendingOrder({
                symbol: firstPending.symbol,
                action: firstPending.transactionType,
                quantity: firstPending.quantity,
                price: firstPending.price,
                pendingCount: pendingForSymbol.length,
            });
        } else {
            // Check for position matching selected ETF
            const matchingPosition = $positionsStore.positions.find(
                (p) => p.symbol === selectedETF.symbol,
            );

            if (matchingPosition) {
                // Show P&L ONLY for the selected ETF
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
                // No position for selected ETF - collapse to ticker mode
                dynamicIsland.collapse();
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
        if ($etfStore.ltp > 0 && !dynamicIsland.isPortfolioMode()) {
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
        selectedETFStore.set(etf); // Update store so DynamicIsland can access it
        etfStore.switchETF(etf);

        // Show confirmation in Dynamic Island FIRST (takes priority over ticker)
        dynamicIsland.show(
            {
                type: "api",
                message: `Switched to ${etf.name}`,
                severity: "success",
            },
            1500,
        );

        // Update ticker with new symbol (saved for when notification collapses)
        dynamicIsland.updateTicker({
            symbol: etf.symbol,
            price: $etfStore.ltp || 0,
            change: $etfStore.change || 0,
            changePercent: $etfStore.changePercent || 0,
        });
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
    const baseCamY = 10; // Fixed Y position
    const baseCamZ = 45; // Closer for bigger candles

    // Camera position now controlled by AnimationController (RAF-based)
    let camPos = { x: baseCamX, y: baseCamY, z: baseCamZ };

    // Spring for smooth parallax rotation only (minimal)
    const camRot = spring({ x: 0, y: 0 }, { stiffness: 0.12, damping: 0.8 });

    // Track zoom percentage for UI display
    $: zoomPercent = Math.round(
        $twoHandPinch.isActive
            ? (baseCamZ / (animationController.getTarget().z || baseCamZ)) * 100
            : 100,
    );

    // Connect AnimationController to camera position
    onMount(() => {
        animationController.onUpdate = (state: CameraState) => {
            camPos = state;
        };

        // Listen for zoom events from gestureBus
        const unsubZoom = gestureBus.on("ZOOM_UPDATE", (event) => {
            // AnimationController handles the actual update in FaceTracker
            // This is for any additional UI sync
        });

        return () => {
            unsubZoom();
        };
    });

    // Reactive parallax updates - very subtle (rotation only)
    $: {
        // Minimal position offsets for parallax (very subtle)
        const xOffset = $headPosition.x * $sensitivity * 3;
        const yOffset = $headPosition.y * $sensitivity * 2;

        camRot.set({ x: yOffset * 0.005, y: xOffset * 0.005 });

        // Update parallax via AnimationController
        animationController.setParallax(xOffset, yOffset);
    }

    // === PORTFOLIO BUBBLE CLOUD STATE ===
    let showPortfolioCloud = false;
    let lastToggleTime = 0;
    const TOGGLE_COOLDOWN_MS = 1500; // 1.5 second cooldown

    onMount(() => {
        // Listen for Victory gesture to toggle bubble cloud
        const unsubVictory = gestureBus.on("VICTORY_DETECTED", () => {
            const now = Date.now();
            if (now - lastToggleTime < TOGGLE_COOLDOWN_MS) {
                console.log("[Victory] Ignored - cooldown active");
                return;
            }
            lastToggleTime = now;
            showPortfolioCloud = !showPortfolioCloud;
            console.log(
                "[Victory] Toggled showPortfolioCloud:",
                showPortfolioCloud,
            );

            // Update Dynamic Island based on state
            if (showPortfolioCloud) {
                dynamicIsland.setPortfolio({
                    totalValue: $totalPortfolioValue,
                    totalPnL: $totalPnL,
                    holdingsCount: $holdingsStore.holdings.length,
                });
            } else {
                dynamicIsland.collapse();
            }

            // Haptic feedback if available (macOS WebKit)
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(20);
            }
        });

        // Listen for Fist gesture to close if open
        const unsubFist = gestureBus.on("FIST_DETECTED", () => {
            const now = Date.now();
            if (now - lastToggleTime < TOGGLE_COOLDOWN_MS) {
                return;
            }
            if (showPortfolioCloud) {
                lastToggleTime = now;
                showPortfolioCloud = false;
                console.log("[Fist] Closed portfolio view");
            }
        });

        return () => {
            unsubVictory();
            unsubFist();
        };
    });
</script>

<!-- Keyboard handler -->
<svelte:window on:keydown={handleKeyDown} />

<!-- Device Not Supported Overlay -->
{#if !deviceSupport.supported}
    <div
        class="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center"
    >
        <div class="max-w-md mx-auto p-8 text-center">
            <div class="text-6xl mb-6">🖥️</div>
            <h1 class="text-2xl font-bold text-white mb-4">Desktop Required</h1>
            <p class="text-white/70 text-lg mb-6">{deviceSupport.reason}</p>
            <div class="flex flex-col gap-3 text-white/50 text-sm">
                <div class="flex items-center justify-center gap-2">
                    <span>✓</span> Desktop/Laptop computer
                </div>
                <div class="flex items-center justify-center gap-2">
                    <span>✓</span> Webcam for gesture tracking
                </div>
                <div class="flex items-center justify-center gap-2">
                    <span>✓</span> Chrome or Safari browser
                </div>
            </div>
        </div>
    </div>
{/if}

<div
    class="h-screen w-full overflow-hidden relative font-sans"
    style={showPortfolioCloud
        ? "background: #0F1115;"
        : `background: 
        radial-gradient(ellipse at 40% 20%, rgba(139, 92, 246, 0.18) 0%, transparent 45%),
        radial-gradient(ellipse at 80% 70%, rgba(99, 102, 241, 0.12) 0%, transparent 40%),
        radial-gradient(ellipse at 20% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 35%),
        linear-gradient(135deg, #1e1b2e 0%, #181526 35%, #13111f 70%, #0e0c18 100%);
    `}
    on:wheel={handleWheel}
>
    <!-- 3D Scene Layer -->
    <!-- 3D Scene Layer -->
    <div class="absolute inset-0 z-0">
        <Canvas shadows>
            <!-- Global Camera (Shared) -->
            <T.PerspectiveCamera
                makeDefault
                position={showPortfolioCloud
                    ? [0, 0, 120]
                    : [camPos.x, camPos.y, camPos.z]}
                fov={55}
            >
                <OrbitControls
                    target={showPortfolioCloud ? [0, 0, 0] : [25, 0, 0]}
                    enableDamping
                    enablePan={false}
                    maxPolarAngle={Math.PI / 2.2}
                />
            </T.PerspectiveCamera>

            <!-- Only render normal scene if cloud is NOT visible -->
            {#if !showPortfolioCloud}
                <Scene3D
                    {candles}
                    cameraPosition={camPos}
                    cameraRotation={$camRot}
                />
            {/if}

            <!-- Portfolio Solar System (3D Content) -->
            <PortfolioSolarSystem visible={showPortfolioCloud} />
        </Canvas>
    </div>

    <!-- Portfolio Treemap Overlay (HTML) - TEXT ONLY, no blocking background -->
    {#if showPortfolioCloud}
        <div
            class="fixed inset-0 z-30 overflow-hidden pointer-events-none"
            transition:fade={{ duration: 400 }}
        >
            <!-- Title Only (Values now in Dynamic Island) -->
            <div class="absolute top-10 w-full text-center z-50">
                <h1
                    class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50 tracking-widest uppercase"
                >
                    Portfolio Hologram
                </h1>
            </div>

            <!-- Loading/Error State -->
            {#if $holdingsStore.isLoading}
                <div
                    class="absolute inset-0 flex items-center justify-center z-50"
                >
                    <div class="text-white/60 text-lg font-mono animate-pulse">
                        Loading portfolio data...
                    </div>
                </div>
            {:else if $holdingsStore.error}
                <div
                    class="absolute inset-0 flex items-center justify-center z-50"
                >
                    <div class="text-rose-400 text-lg font-mono">
                        Error: {$holdingsStore.error}
                    </div>
                </div>
            {:else if $holdingsStore.holdings.length === 0}
                <div
                    class="absolute inset-0 flex items-center justify-center z-50"
                >
                    <div class="text-white/40 text-lg font-mono">
                        No holdings found. Please login to Kite first.
                    </div>
                </div>
            {/if}

            <!-- Hint -->
            <div
                class="absolute bottom-10 w-full text-center text-white/30 text-xs font-mono tracking-widest uppercase animate-pulse"
            >
                Head Movement Enabled • Pinch to Zoom • Fist to Close
            </div>
        </div>
    {/if}

    {#if !showPortfolioCloud}
        <!-- Zoom Indicator -->
        <ZoomIndicator
            zoomLevel={zoomPercent}
            isPinching={$twoHandPinch.isActive}
        />

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
    {/if}

    <!-- UI Layer -->
    <div
        class="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between"
    >
        <!-- Top Row -->
        <div class="flex justify-between items-start pointer-events-auto">
            <!-- Left Column: Brand Only -->
            <div class="flex flex-col justify-between h-full">
                <!-- 3D Brand Card -->
                {#if !showPortfolioCloud}
                    <BrandCard />
                {/if}
            </div>
        </div>

        <!-- Zoom indicator -->
        {#if !showPortfolioCloud}
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
        {/if}
    </div>

    <!-- Dynamic Island Notification Center -->
    <DynamicIsland />

    {#if !showPortfolioCloud}
        <!-- ETF Selector -->
        <ETFSelector
            etfs={SUPPORTED_ETFS}
            {selectedETF}
            onSelect={switchToETF}
        />

        <!-- Hover-to-Target Price Selector -->
        <PriceTargetOverlay
            minPrice={minLow}
            maxPrice={maxHigh}
            ltp={$etfStore.ltp}
            symbol={selectedETF.symbol}
        />
    {/if}

    <!-- NEW Control Center (Bottom Right) -->
    <ControlCenter
        isLive={$isTracking}
        {kiteState}
        loading={isConnecting}
        on:connect={handleConnect}
    />

    <!-- Face Tracker -->
    <FaceTracker />
</div>

<style>
    :global(body) {
        background: #0a0a14;
    }
</style>
