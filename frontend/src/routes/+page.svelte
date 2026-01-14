<script lang="ts">
    import { onMount } from "svelte";
    import { Canvas } from "@threlte/core";
    import { T } from "@threlte/core";
    import { OrbitControls } from "@threlte/extras";
    import { spring } from "svelte/motion";
    import CandlestickChart from "$lib/components/Chart3D/CandlestickChart.svelte";
    import { kite } from "$lib/services/kite";
    import { etfStore } from "$lib/services/etfService";
    import { DEFAULT_ETF, SUPPORTED_ETFS } from "$lib/config/etfs";

    // Components
    import BrandCard from "$lib/components/UI/BrandCard.svelte";
    import FaceTracker from "$lib/components/Tracking/FaceTracker.svelte";
    import PriceTargetOverlay from "$lib/components/UI/PriceTargetOverlay.svelte";
    import CameraStatus from "$lib/components/UI/CameraStatus.svelte";
    import PriceCard from "$lib/components/UI/PriceCard.svelte";
    import SettingsCard from "$lib/components/UI/SettingsCard.svelte";
    import DynamicIsland from "$lib/components/UI/DynamicIsland.svelte";

    // Stores
    import {
        headPosition,
        sensitivity,
        smoothZoom,
        twoHandPinch,
    } from "$lib/stores/tracking";
    import { tradingStore } from "$lib/stores/trading";
    import { tradingHandPreference, gestureState } from "$lib/stores/gesture";
    import { dynamicIsland } from "$lib/stores/dynamicIsland";

    // Kite Logic
    let kiteStatus = "Not Connected";
    const KITE_API_KEY = "4o72jub8tyqey769";

    onMount(async () => {
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
                dynamicIsland.show(
                    {
                        type: "api",
                        message: "Connected to Kite API ✓",
                        severity: "success",
                    },
                    2500,
                );

                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname,
                );
            } catch (e) {
                console.error("Kite Login Error:", e);
                kiteStatus = "Connection Failed";
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

    function loginToZerodha() {
        if (!KITE_API_KEY || KITE_API_KEY === "your_api_key_here") {
            alert("Please set your KITE_API_KEY in +page.svelte code!");
            return;
        }
        window.location.href = `https://kite.trade/connect/login?v=3&api_key=${KITE_API_KEY}`;
    }

    // Currently selected ETF
    let selectedETF = DEFAULT_ETF;

    // Reactive values from store
    $: candles = $etfStore.candles;
    $: livePrice = $etfStore.ltp;
    $: priceChangePercent = $etfStore.changePercent;
    $: priceTrend = $etfStore.change >= 0 ? "up" : "down";
    $: isChartLoading = $etfStore.isLoading;

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
        selectedETF = etf;
        etfStore.switchETF(etf);
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
            <!-- Camera pointing at chart -->
            <T.PerspectiveCamera
                makeDefault
                position={[$camPos.x, $camPos.y, $camPos.z]}
                fov={55}
            >
                <OrbitControls
                    target={[25, 0, 0]}
                    enableDamping
                    enablePan={false}
                    maxPolarAngle={Math.PI / 2.2}
                />
            </T.PerspectiveCamera>

            <!-- Professional Trading Terminal Lighting -->

            <!-- Ambient - warm terminal glow (INCREASED) -->
            <T.AmbientLight intensity={0.65} color="#e8ddff" />

            <!-- Main monitor backlight (from behind screen) -->
            <T.PointLight
                position={[25, 10, -25]}
                intensity={1.5}
                color="#9d8aff"
                distance={150}
            />

            <!-- Key light (simulating overhead office lighting) - BRIGHTER -->
            <T.DirectionalLight
                position={[40, 80, 60]}
                intensity={1.2}
                color="#ffffff"
                castShadow
                shadow.mapSize={[2048, 2048]}
            />

            <!-- Warm desk lamp from right - BRIGHTER -->
            <T.SpotLight
                position={[70, 30, 40]}
                intensity={0.9}
                color="#ffd89b"
                angle={0.4}
                penumbra={0.5}
                distance={120}
            />

            <!-- Cool accent from left (screen reflection) -->
            <T.PointLight
                position={[-10, 15, 30]}
                intensity={0.9}
                color="#6ee7f9"
                distance={100}
            />

            <!-- Subtle rim light for depth -->
            <T.PointLight
                position={[25, 5, -35]}
                intensity={0.7}
                color="#a78bfa"
                distance={100}
            />

            <!-- Additional fill light from front for better visibility -->
            <T.PointLight
                position={[25, 20, 80]}
                intensity={0.8}
                color="#f0e6ff"
                distance={150}
            />

            <!-- Soft side fill from right -->
            <T.PointLight
                position={[80, 10, 0]}
                intensity={0.5}
                color="#fff5e1"
                distance={120}
            />

            <!-- The Chart - only render when data is loaded -->
            {#if candles.length > 0}
                <CandlestickChart data={candles} />
            {/if}

            <!-- Professional trading floor/desk -->
            <T.Mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[25, -12, 40]}
                receiveShadow
            >
                <T.PlaneGeometry args={[220, 220]} />
                <T.MeshStandardMaterial
                    color="#1a1625"
                    roughness={0.4}
                    metalness={0.3}
                    transparent
                    opacity={0.95}
                />
            </T.Mesh>

            <!-- Premium grid (subtle, professional) -->
            <T.GridHelper
                args={[200, 50, 0x5b4d9d, 0x2d2540]}
                position={[25, -11.8, 40]}
            />

            <!-- Monitor bezel/frame effect -->
            <T.Mesh position={[25, 25, -32]}>
                <T.PlaneGeometry args={[220, 90]} />
                <T.MeshStandardMaterial
                    color="#0d0a1a"
                    roughness={0.6}
                    metalness={0.4}
                    transparent
                    opacity={0.85}
                />
            </T.Mesh>

            <!-- Vertical grid on back (monitor screen effect) -->
            <T.GridHelper
                args={[180, 35, 0x4a3d7a, 0x1e1830]}
                rotation={[Math.PI / 2, 0, 0]}
                position={[25, 25, -31]}
            />

            <!-- Side panels for depth (trading terminal walls) -->
            <!-- Left panel -->
            <T.Mesh position={[-65, 10, 0]} rotation={[0, Math.PI / 2, 0]}>
                <T.PlaneGeometry args={[150, 60]} />
                <T.MeshStandardMaterial
                    color="#12101d"
                    roughness={0.7}
                    metalness={0.2}
                    transparent
                    opacity={0.7}
                />
            </T.Mesh>

            <!-- Right panel -->
            <T.Mesh position={[115, 10, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <T.PlaneGeometry args={[150, 60]} />
                <T.MeshStandardMaterial
                    color="#12101d"
                    roughness={0.7}
                    metalness={0.2}
                    transparent
                    opacity={0.7}
                />
            </T.Mesh>
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
            <!-- Left Column: Brand + Settings -->
            <div class="flex flex-col gap-4">
                <!-- 3D Brand Card -->
                <BrandCard />

                <!-- Camera Status -->
                <CameraStatus />

                <!-- Kite Status -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="mt-2 glass-panel p-2 rounded-lg text-center cursor-pointer hover:bg-white/10 transition-colors"
                    on:click={loginToZerodha}
                    role="button"
                    tabindex="0"
                >
                    <p
                        class="text-[10px] font-mono text-slate-400 uppercase tracking-widest"
                    >
                        KITE API
                    </p>
                    <p
                        class={`text-xs font-bold ${kiteStatus === "Connected" ? "text-emerald-400" : "text-slate-500"}`}
                    >
                        {kiteStatus}
                    </p>
                </div>

                <!-- Settings Card -->
                <SettingsCard />
            </div>

            <!-- Right Column: Price Display -->
            <!-- Replaced by Dynamic Island
            <div>
                <PriceCard
                    price={livePrice}
                    symbol={selectedETF.symbol}
                    trend={priceTrend}
                    changePercent={priceChangePercent}
                />
            </div>
            -->
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

    <!-- Hover-to-Target Price Selector -->
    <PriceTargetOverlay minPrice={minLow} maxPrice={maxHigh} />

    <!-- Face Tracker -->
    <FaceTracker />
</div>

<style>
    :global(body) {
        background: #0a0a14;
    }
</style>
