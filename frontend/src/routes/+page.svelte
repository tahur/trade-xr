<script lang="ts">
    import { onMount } from "svelte";
    import { Canvas } from "@threlte/core";
    import { T } from "@threlte/core";
    import { OrbitControls } from "@threlte/extras";
    import { spring } from "svelte/motion";
    import { generateCandles } from "$lib/services/mockData";
    import CandlestickChart from "$lib/components/Chart3D/CandlestickChart.svelte";

    // Components
    import FaceTracker from "$lib/components/Tracking/FaceTracker.svelte";
    import PriceTargetOverlay from "$lib/components/UI/PriceTargetOverlay.svelte";

    // Stores
    import {
        headPosition,
        sensitivity,
        zoomLevel,
        twoHandPinch,
    } from "$lib/stores/tracking";
    import { tradingStore } from "$lib/stores/trading";
    import { tradingHandPreference, gestureState } from "$lib/stores/gesture";

    // Data
    const candles = generateCandles(50);
    const lastCandlePrice = candles[candles.length - 1].close;
    const minLow = Math.min(...candles.map((c) => c.low));
    const maxHigh = Math.max(...candles.map((c) => c.high));
    const centerPrice = (minLow + maxHigh) / 2;

    // Base camera position (isometric view - slightly from right and above)
    const baseCamX = 60;
    const baseCamY = centerPrice + 40;
    const baseCamZ = 120;

    // UI State
    let gestureSens = 0.08;

    // Spring for smooth camera motion
    const camPos = spring(
        { x: baseCamX, y: baseCamY, z: baseCamZ },
        { stiffness: 0.08, damping: 0.6 },
    );

    // Reactive camera updates based on head tracking + two-hand zoom
    $: {
        // Head left/right = camera orbits around chart (perspective shift)
        const xOffset = $headPosition.x * $sensitivity * 50;

        // Head up/down = subtle Y movement
        const yOffset = $headPosition.y * $sensitivity * 20;

        // Head forward/back = ZOOM (lean in = closer, lean back = further)
        // headPosition.z decreases when leaning forward
        const zOffset = ($headPosition.z - 0.45) * -300;

        // Apply two-hand pinch zoom (zoomLevel: 0.4-2.5, where 1.0 = normal)
        // Smaller zoomLevel = zoomed in (camera closer), larger = zoomed out
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

    onMount(() => {});
</script>

<div
    class="h-screen w-full bg-gradient-to-br from-[#0a0a14] via-[#0d1117] to-[#161b22] overflow-hidden relative font-sans"
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

            <!-- Ambient lighting - darker for contrast -->
            <T.AmbientLight intensity={0.15} color="#4a5568" />

            <!-- Key light (main) - warm white -->
            <T.DirectionalLight
                position={[50, 100, 80]}
                intensity={0.8}
                color="#fef3e3"
                castShadow
                shadow.mapSize={[2048, 2048]}
            />

            <!-- Blue accent light from left - stronger -->
            <T.PointLight
                position={[-60, centerPrice, 40]}
                intensity={0.6}
                color="#00a2ff"
                distance={200}
            />

            <!-- Warm accent from right - for candle glow -->
            <T.PointLight
                position={[60, centerPrice + 20, 30]}
                intensity={0.4}
                color="#ff6b00"
                distance={150}
            />

            <!-- Rim light from behind for depth -->
            <T.PointLight
                position={[0, centerPrice, -80]}
                intensity={0.3}
                color="#7c3aed"
                distance={200}
            />

            <!-- The Chart -->
            <CandlestickChart data={candles} />

            <!-- Dark reflective floor -->
            <T.Mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, minLow - 5, 0]}
                receiveShadow
            >
                <T.PlaneGeometry args={[300, 300]} />
                <T.MeshStandardMaterial
                    color="#0d1117"
                    roughness={0.1}
                    metalness={0.8}
                    envMapIntensity={0.5}
                />
            </T.Mesh>

            <!-- Subtle grid on floor (cyberpunk trading terminal) -->
            <T.GridHelper
                args={[200, 40, 0x1e3a5f, 0x0f2744]}
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
        <!-- Top Bar -->
        <div class="flex justify-between items-start">
            <div>
                <h1
                    class="text-2xl font-bold tracking-widest text-cyan-400/70 uppercase"
                >
                    HoloTrade
                </h1>
                <div class="flex items-center gap-2 mt-1">
                    <div
                        class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
                    ></div>
                    <p
                        class="text-[10px] text-slate-500 uppercase tracking-widest"
                    >
                        Live Tracking
                    </p>
                </div>
            </div>

            <!-- Price Display -->
            <div class="text-right">
                <p class="text-[10px] text-slate-500 uppercase tracking-widest">
                    Last Price
                </p>
                <p class="text-2xl font-mono text-white/90">
                    ₹{lastCandlePrice.toFixed(2)}
                </p>
            </div>
        </div>

        <!-- Bottom: Controls -->
        <div class="flex items-end justify-between gap-6 pointer-events-auto">
            <div
                class="bg-black/40 p-4 rounded-lg backdrop-blur-md border border-cyan-500/10 text-white w-56 space-y-3"
            >
                <!-- Sensitivity -->
                <div>
                    <label
                        for="sensitivity"
                        class="block text-[10px] uppercase tracking-widest mb-2 text-cyan-400/60"
                    >
                        Parallax
                    </label>
                    <input
                        id="sensitivity"
                        type="range"
                        min="0"
                        max="20"
                        step="0.5"
                        bind:value={$sensitivity}
                        class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>

                <!-- Gesture Sensitivity -->
                <div>
                    <label
                        for="gestureSens"
                        class="block text-[10px] uppercase tracking-widest mb-2 text-cyan-400/60"
                    >
                        Gesture
                    </label>
                    <input
                        id="gestureSens"
                        type="range"
                        min="0.01"
                        max="0.5"
                        step="0.01"
                        bind:value={gestureSens}
                        class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>

                <!-- Trading Hand Selector -->
                <div>
                    <label
                        class="block text-[10px] uppercase tracking-widest mb-2 text-cyan-400/60"
                    >
                        Trading Hand
                    </label>
                    <div class="flex gap-1">
                        <button
                            on:click={() => tradingHandPreference.set("Left")}
                            class={`flex-1 py-1.5 text-xs font-bold uppercase rounded transition-all ${
                                $tradingHandPreference === "Left"
                                    ? "bg-cyan-500 text-slate-900"
                                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-600/50"
                            }`}
                        >
                            ✋ Left
                        </button>
                        <button
                            on:click={() => tradingHandPreference.set("Right")}
                            class={`flex-1 py-1.5 text-xs font-bold uppercase rounded transition-all ${
                                $tradingHandPreference === "Right"
                                    ? "bg-cyan-500 text-slate-900"
                                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-600/50"
                            }`}
                        >
                            Right 🤚
                        </button>
                    </div>
                    <!-- Current detected hand indicator -->
                    {#if $gestureState.isHandDetected && $gestureState.numHandsDetected === 1}
                        <p
                            class="text-[9px] mt-1.5 text-center {$gestureState.primaryHandSide ===
                            $tradingHandPreference
                                ? 'text-emerald-400'
                                : 'text-slate-500'}"
                        >
                            {$gestureState.primaryHandSide ===
                            $tradingHandPreference
                                ? "✓ Ready"
                                : `${$gestureState.primaryHandSide} hand detected`}
                        </p>
                    {/if}
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
