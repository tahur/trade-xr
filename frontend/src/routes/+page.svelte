<script lang="ts">
    import { onMount } from "svelte";
    import { Canvas } from "@threlte/core";
    import { T } from "@threlte/core";
    import { OrbitControls } from "@threlte/extras";
    import { spring } from "svelte/motion";
    import { generateCandles } from "$lib/services/mockData";
    import CandlestickChart from "$lib/components/Chart3D/CandlestickChart.svelte";
    import { kite } from "$lib/services/kite";

    // Components
    import BrandCard from "$lib/components/UI/BrandCard.svelte";
    import FaceTracker from "$lib/components/Tracking/FaceTracker.svelte";
    import PriceTargetOverlay from "$lib/components/UI/PriceTargetOverlay.svelte";
    import CameraStatus from "$lib/components/UI/CameraStatus.svelte";
    import PriceCard from "$lib/components/UI/PriceCard.svelte";
    import SettingsCard from "$lib/components/UI/SettingsCard.svelte";

    // Stores
    import {
        headPosition,
        sensitivity,
        zoomLevel,
        twoHandPinch,
    } from "$lib/stores/tracking";
    import { tradingStore } from "$lib/stores/trading";
    import { tradingHandPreference, gestureState } from "$lib/stores/gesture";

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
            try {
                await kite.login(requestToken);
                kiteStatus = "Connected";
                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname,
                );
            } catch (e) {
                console.error("Kite Login Error:", e);
                kiteStatus = "Connection Failed";
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

    // Data
    const candles = generateCandles(50);
    const lastCandlePrice = candles[candles.length - 1].close;
    const minLow = Math.min(...candles.map((c) => c.low));
    const maxHigh = Math.max(...candles.map((c) => c.high));
    const centerPrice = (minLow + maxHigh) / 2;

    // Base camera position
    const baseCamX = 60;
    const baseCamY = centerPrice + 40;
    const baseCamZ = 120;

    // Spring for smooth camera motion
    const camPos = spring(
        { x: baseCamX, y: baseCamY, z: baseCamZ },
        { stiffness: 0.08, damping: 0.6 },
    );

    // Reactive camera updates
    $: {
        const xOffset = $headPosition.x * $sensitivity * 50;
        const yOffset = $headPosition.y * $sensitivity * 20;
        const zOffset = ($headPosition.z - 0.45) * -300;
        const zoomMultiplier = $zoomLevel;

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

<div
    class="h-screen w-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] overflow-hidden relative font-sans"
    style="background: radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 40%), linear-gradient(to bottom right, #1a1a2e, #16213e, #0f0f23);"
>
    <!-- 3D Scene Layer -->
    <div class="absolute inset-0 z-0">
        <Canvas shadows>
            <!-- Isometric Camera -->
            <T.PerspectiveCamera
                makeDefault
                position={[$camPos.x, $camPos.y, $camPos.z]}
                fov={30}
            >
                <OrbitControls
                    target={[0, centerPrice, 0]}
                    enableDamping
                    enablePan={false}
                    maxPolarAngle={Math.PI / 2.2}
                />
            </T.PerspectiveCamera>

            <!-- Ambient lighting - soft lavender for visionOS feel -->
            <T.AmbientLight intensity={0.35} color="#c4b5fd" />

            <!-- Key light (main) - cool white with slight blue tint -->
            <T.DirectionalLight
                position={[50, 100, 80]}
                intensity={0.7}
                color="#f0f4ff"
                castShadow
                shadow.mapSize={[2048, 2048]}
            />

            <!-- Purple accent light from left - visionOS spatial -->
            <T.PointLight
                position={[-60, centerPrice, 40]}
                intensity={0.5}
                color="#a78bfa"
                distance={200}
            />

            <!-- Cyan accent from right - for spatial depth -->
            <T.PointLight
                position={[60, centerPrice + 20, 30]}
                intensity={0.4}
                color="#67e8f9"
                distance={150}
            />

            <!-- Rim light from behind - soft pink glow -->
            <T.PointLight
                position={[0, centerPrice, -80]}
                intensity={0.35}
                color="#f472b6"
                distance={200}
            />

            <!-- The Chart -->
            <CandlestickChart data={candles} />

            <!-- Ethereal glass floor - visionOS spatial -->
            <T.Mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, minLow - 5, 0]}
                receiveShadow
            >
                <T.PlaneGeometry args={[300, 300]} />
                <T.MeshStandardMaterial
                    color="#1e1b4b"
                    roughness={0.2}
                    metalness={0.6}
                    envMapIntensity={0.8}
                    transparent
                    opacity={0.85}
                />
            </T.Mesh>

            <!-- Subtle grid on floor - soft purple lines -->
            <T.GridHelper
                args={[200, 40, 0x6366f1, 0x312e81]}
                position={[0, minLow - 4.9, 0]}
            />
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
            <div>
                <PriceCard price={lastCandlePrice} />
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
