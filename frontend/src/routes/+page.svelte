<script lang="ts">
    import { onMount } from "svelte";
    import { spring } from "svelte/motion";
    import { Canvas } from "@threlte/core";
    import { T } from "@threlte/core";
    import { OrbitControls } from "@threlte/extras";
    import { generateCandles } from "$lib/services/mockData";
    import CandlestickChart from "$lib/components/Chart3D/CandlestickChart.svelte";

    // Components
    import FaceTracker from "$lib/components/Tracking/FaceTracker.svelte";
    import PriceSlider from "$lib/components/UI/PriceSlider.svelte";
    // import OrderPanel from '$lib/components/UI/OrderPanel.svelte';
    // import PositionsList from '$lib/components/UI/PositionsList.svelte';

    // Stores
    import { headPosition, sensitivity } from "$lib/stores/tracking";
    import { tradingStore } from "$lib/stores/trading";

    // Data
    const candles = generateCandles(50);
    const lastCandlePrice = candles[candles.length - 1].close;
    const minLow = Math.min(...candles.map((c) => c.low));
    const centerPrice = (minLow + lastCandlePrice) / 2;

    // --- Isometric Camera Logic ---
    // Telephoto lens (Low FOV) creates isometric "flat" look

    let baseCamX = 100; // Far right
    let baseCamY = centerPrice + 100; // High up
    let baseCamZ = 250; // Far back

    // Spring for smooth camera motion
    const camPos = spring(
        { x: baseCamX, y: baseCamY, z: baseCamZ },
        {
            stiffness: 0.1,
            damping: 0.4,
        },
    );

    // Reactively update spring target based on head position
    $: {
        const xOffset = $headPosition.x * $sensitivity * 100; // Boosted for isometric distance
        const yOffset = $headPosition.y * $sensitivity * 100;

        // Restore Auto-Zoom (Head Depth)
        const zOffset = ($headPosition.z - 0.45) * -400; // Stronger zoom for distance

        camPos.set({
            x: baseCamX + xOffset,
            y: baseCamY + yOffset,
            // Clamp min Z prevents clipping
            z: Math.max(150, baseCamZ + zOffset),
        });
    }

    onMount(() => {});
</script>

<div class="h-screen w-full bg-[#131722] overflow-hidden relative font-sans">
    <!-- 3D Scene Layer -->
    <div class="absolute inset-0 z-0">
        <Canvas shadows>
            <T.PerspectiveCamera
                makeDefault
                position={[$camPos.x, $camPos.y, $camPos.z]}
                fov={25}
            >
                <OrbitControls target={[0, centerPrice, 0]} enableDamping />
            </T.PerspectiveCamera>

            <T.AmbientLight intensity={0.4} />
            <T.DirectionalLight
                position={[50, 100, 50]}
                intensity={1.5}
                castShadow
                shadow.mapSize={[2048, 2048]}
            />

            <CandlestickChart data={candles} />

            <!-- Floor Receiver -->
            <T.Mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, minLow - 10, 0]}
                receiveShadow
            >
                <T.PlaneGeometry args={[1000, 1000]} />
                <T.MeshStandardMaterial color="#131722" roughness={0.8} />
            </T.Mesh>

            <!-- Grid: Subtle Slate lines -->
            <T.GridHelper
                args={[200, 50, 0x2a2e39, 0x2a2e39]}
                position={[0, minLow - 9.9, 0]}
            />
            <T.AxesHelper args={[10]} position={[0, minLow - 9.9, 0]} />
        </Canvas>
    </div>

    <!-- UI Layer (Minimal) -->
    <div
        class="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between"
    >
        <!-- Top Bar -->
        <div class="flex justify-between items-start">
            <div>
                <h1 class="text-3xl font-bold tracking-tight text-white/50">
                    HoloTrade
                </h1>
                <div class="flex items-center gap-2 mt-2">
                    <div class="w-1.5 h-1.5 rounded-full bg-green-500/50"></div>
                    <p class="text-xs text-slate-500">Cinematic Mode</p>
                </div>
            </div>

            <!-- UI Hidden -->
            <!-- <div class="pointer-events-auto">
                <OrderPanel currentPrice={lastCandlePrice} />
            </div> -->
        </div>

        <!-- Bottom: Positions & Sensitivity -->
        <div class="flex items-end justify-between gap-6 pointer-events-auto">
            <!-- <PositionsList /> -->

            <!-- Controls (Minimal) -->
            <div
                class="bg-black/40 p-4 rounded-lg backdrop-blur-md border border-white/10 text-white w-64 mb-1"
            >
                <label
                    for="sensitivity"
                    class="block text-xs uppercase tracking-wider mb-2 opacity-90"
                >
                    Parallax Sensitivity
                </label>
                <input
                    id="sensitivity"
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    bind:value={$sensitivity}
                    class="w-full h-1 bg-slate-700/50 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        </div>
    </div>

    <PriceSlider currentPrice={lastCandlePrice} />
    <!-- Tracker (Invisible/Minimised) -->
    <FaceTracker />
</div>
