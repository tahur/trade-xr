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
</script>

<!-- Camera pointing at chart -->
<T.PerspectiveCamera
    makeDefault
    position={[cameraPosition.x, cameraPosition.y, cameraPosition.z]}
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

<!-- Ambient - warm terminal glow -->
<T.AmbientLight intensity={0.65} color="#e8ddff" />

<!-- Main monitor backlight (from behind screen) -->
<T.PointLight
    position={[25, 10, -25]}
    intensity={1.5}
    color="#9d8aff"
    distance={150}
/>

<!-- Key light (simulating overhead office lighting) -->
<T.DirectionalLight
    position={[40, 80, 60]}
    intensity={1.2}
    color="#ffffff"
    castShadow
    shadow.mapSize={[2048, 2048]}
/>

<!-- Warm desk lamp from right -->
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
