<!--
    OffAxisCamera.svelte
    
    Implements off-axis projection (asymmetric frustum) based on head tracking.
    The camera stays fixed, but the projection matrix shifts to create the
    "window into 3D space" illusion as described in OFFAXIS_RESEARCH.md.
-->
<script lang="ts">
    import { T, useThrelte } from "@threlte/core";
    import { OrbitControls } from "@threlte/extras";
    import { onMount } from "svelte";
    import * as THREE from "three";

    // Props
    export let position: [number, number, number] = [100, 100, 200];
    export let target: [number, number, number] = [0, 0, 0];
    export let fov = 25;
    export let near = 0.1;
    export let far = 2000;

    // Head tracking input (normalized -1 to 1)
    export let headX = 0;
    export let headY = 0;
    export let headZ = 0.6; // Estimated distance from screen in meters

    // Calibration
    export let screenWidthMeters = 0.5; // ~20" monitor
    export let sensitivity = 0.3;
    export let smoothing = 0.12;

    // Enable/disable off-axis mode
    export let enabled = true;

    // Internal state
    let camera: THREE.PerspectiveCamera;
    let smoothedX = 0;
    let smoothedY = 0;
    let smoothedZ = 0.6;

    // Update projection matrix based on head position
    function updateOffAxisProjection() {
        if (!camera || !enabled) return;

        // Apply smoothing
        smoothedX += (headX * sensitivity * 0.15 - smoothedX) * smoothing;
        smoothedY += (headY * sensitivity * 0.1 - smoothedY) * smoothing;
        smoothedZ += ((headZ > 0 ? headZ : 0.6) - smoothedZ) * smoothing;

        // Clamp distance
        const eyeZ = Math.max(0.3, Math.min(1.5, smoothedZ));

        // Screen dimensions in meters
        const aspect = camera.aspect;
        const halfWidth = screenWidthMeters / 2;
        const halfHeight = halfWidth / aspect;

        // Calculate asymmetric frustum bounds
        // Eye position shifts the frustum in the opposite direction
        const left = ((-halfWidth - smoothedX) * near) / eyeZ;
        const right = ((halfWidth - smoothedX) * near) / eyeZ;
        const bottom = ((-halfHeight - smoothedY) * near) / eyeZ;
        const top = ((halfHeight - smoothedY) * near) / eyeZ;

        // Apply off-axis projection matrix
        camera.projectionMatrix.makePerspective(
            left,
            right,
            bottom,
            top,
            near,
            far,
        );
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }

    // Standard perspective (when off-axis disabled)
    function updateStandardProjection() {
        if (!camera) return;
        camera.fov = fov;
        camera.near = near;
        camera.far = far;
        camera.updateProjectionMatrix();
    }

    // Reactive updates
    $: if (enabled && camera) {
        updateOffAxisProjection();
    }

    $: if (!enabled && camera) {
        updateStandardProjection();
    }

    // Animation frame for continuous updates
    let animationId: number;

    onMount(() => {
        const animate = () => {
            if (enabled) {
                updateOffAxisProjection();
            }
            animationId = requestAnimationFrame(animate);
        };
        animationId = requestAnimationFrame(animate);

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    });
</script>

<T.PerspectiveCamera
    makeDefault
    bind:ref={camera}
    {position}
    {fov}
    {near}
    {far}
>
    <OrbitControls
        {target}
        enableDamping
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
    />
</T.PerspectiveCamera>
