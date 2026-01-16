<script lang="ts">
    import { T } from "@threlte/core";
    import { OrbitControls } from "@threlte/extras";
    import CandlestickChart from "$lib/components/Chart3D/CandlestickChart.svelte";
    import type { CandleData } from "$lib/services/mockData";

    // Props
    export let candles: CandleData[] = [];
    export let cameraPosition: { x: number; y: number; z: number } = {
        x: 25,
        y: 10,
        z: 45,
    };
    // Parallax offset (subtle position adjustment based on head tracking)
    export let cameraRotation: { x: number; y: number } = { x: 0, y: 0 };

    // Apply parallax as subtle position offset (not rotation - conflicts with OrbitControls)
    $: parallaxX = cameraRotation.y * 15; // Convert rotation to position offset
    $: parallaxY = -cameraRotation.x * 10;
</script>

<!-- Camera with OrbitControls (parallax applied via position offset) -->
<T.PerspectiveCamera
    makeDefault
    position={[
        cameraPosition.x + parallaxX,
        cameraPosition.y + parallaxY,
        cameraPosition.z,
    ]}
    fov={55}
>
    <OrbitControls
        target={[25, 0, 0]}
        enableDamping
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
    />
</T.PerspectiveCamera>

<!-- Optimization: Simplified 3-Point Lighting Setup for Performance -->

<!-- 1. Ambient - Base illumination -->
<T.AmbientLight intensity={0.8} color="#e8ddff" />

<!-- 2. Key Light - Main source (Directional) -->
<T.DirectionalLight
    position={[40, 80, 60]}
    intensity={1.5}
    color="#ffffff"
    castShadow
    shadow.mapSize={[2048, 2048]}
/>

<!-- 3. Rim/Back Light - Depth and separation -->
<T.PointLight
    position={[25, 10, -30]}
    intensity={2.0}
    color="#9d8aff"
    distance={150}
/>

<!-- 4. Fill Light - Soften shadows (opposite to key) -->
<T.PointLight
    position={[-20, 20, 40]}
    intensity={0.6}
    color="#6ee7f9"
    distance={100}
/>

<!-- The Chart - only render when data is loaded -->
{#if candles.length > 0}
    <CandlestickChart data={candles} />
{/if}

<!-- Professional trading floor/desk -->
<T.Mesh rotation={[-Math.PI / 2, 0, 0]} position={[25, -12, 40]} receiveShadow>
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
<T.GridHelper args={[200, 50, 0x5b4d9d, 0x2d2540]} position={[25, -11.8, 40]} />

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
