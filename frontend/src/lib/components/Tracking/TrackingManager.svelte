<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { FaceMesh } from "@mediapipe/face_mesh";
    import { Hands } from "@mediapipe/hands";
    import { Camera } from "@mediapipe/camera_utils";

    import { headPosition, isTracking } from "$lib/stores/tracking";
    import { gestureState, resetGesture } from "$lib/stores/gesture";

    export let currentMarketPrice = 1000;

    let videoElement: HTMLVideoElement;
    let camera: Camera | null = null;
    let faceMesh: FaceMesh;
    let hands: Hands;

    // Gesture Constants
    const PINCH_THRESHOLD = 0.08;
    const MOVEMENT_THRESHOLD = 0.005; // Strict stability
    const ADJUSTMENT_SENSITIVITY = 1000; // Price range scaling
    const HOLD_DURATION = 1500; // 1.5s hold (faster than 2s)

    // Internal State
    let startPinchTime = 0;
    let startHandY = 0;
    let startPrice = 0;
    let lastHandY = 0;

    onMount(async () => {
        // Face Mesh Setup
        faceMesh = new FaceMesh({
            locateFile: (f) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
        });
        faceMesh.setOptions({ maxNumFaces: 1 });
        faceMesh.onResults((results) => {
            if (results.multiFaceLandmarks?.[0]) {
                $isTracking = true;
                const n = results.multiFaceLandmarks[0][1];
                headPosition.set({
                    x: (n.x - 0.5) * -1,
                    y: (n.y - 0.5) * -1,
                    z: 0,
                });
            } else {
                $isTracking = false;
            }
        });

        // Hands Setup
        hands = new Hands({
            locateFile: (f) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
        });
        hands.setOptions({ maxNumHands: 1 });
        hands.onResults(onHandResults);

        // Camera
        if (videoElement) {
            camera = new Camera(videoElement, {
                onFrame: async () => {
                    await faceMesh.send({ image: videoElement });
                    await hands.send({ image: videoElement });
                },
                width: 640,
                height: 480,
            });
            await camera.start();
        }
    });

    function onHandResults(results: any) {
        const marks = results.multiHandLandmarks?.[0];
        if (marks) {
            const index = marks[8];
            const thumb = marks[4];

            // Update Store (Invert X)
            gestureState.update((s) => ({
                ...s,
                isHandDetected: true,
                handPosition: { x: 1 - index.x, y: index.y },
            }));

            // Pinch Check
            const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
            gestureState.update((s) => ({ ...s, pinchDistance: dist }));

            if (dist < PINCH_THRESHOLD) {
                if (!$gestureState.isPinching) {
                    // START PINCH
                    startPinch(index.y);
                } else {
                    // UPDATE PINCH
                    updatePinch(index.y);
                }
            } else {
                if ($gestureState.isPinching) endPinch(); // RELEASE
            }
        } else {
            gestureState.update((s) => ({ ...s, isHandDetected: false }));
            if ($gestureState.isPinching) endPinch();
        }
    }

    function startPinch(y: number) {
        startPinchTime = Date.now();
        startHandY = y;
        lastHandY = y;
        startPrice = $gestureState.targetPrice || currentMarketPrice;

        gestureState.update((s) => ({
            ...s,
            isPinching: true,
            mode: "CONFIRMING",
            targetPrice: startPrice,
            holdProgress: 0,
        }));
    }

    function updatePinch(y: number) {
        // 1. Calculate Price Shift
        // Moving hand UP (smaller Y) should Increase Price.
        // Delta = Start - Current. If Start=0.5, Current=0.4 (Up), Delta=0.1.
        const deltaY = startHandY - y;
        const priceDelta = deltaY * ADJUSTMENT_SENSITIVITY;
        const newPrice = startPrice + priceDelta;

        // 2. Stability Check
        const velocity = Math.abs(y - lastHandY);
        lastHandY = y;

        if (velocity < MOVEMENT_THRESHOLD) {
            // Stable -> Advance Timer
            const elapsed = Date.now() - startPinchTime;
            const progress = Math.min(100, (elapsed / HOLD_DURATION) * 100);

            gestureState.update((s) => ({
                ...s,
                targetPrice: newPrice,
                holdProgress: progress,
            }));

            if (progress >= 100 && $gestureState.mode !== "PLACED") {
                confirmOrder();
            }
        } else {
            // Moving -> Reset Timer
            startPinchTime = Date.now();
            gestureState.update((s) => ({
                ...s,
                targetPrice: newPrice,
                holdProgress: 0,
            }));
        }
    }

    function endPinch() {
        startPinchTime = 0;
        gestureState.update((s) => ({
            ...s,
            isPinching: false,
            mode: "IDLE",
            holdProgress: 0,
        }));
    }

    function confirmOrder() {
        gestureState.update((s) => ({ ...s, mode: "PLACED" }));
        setTimeout(() => resetGesture(), 3000);
    }

    onDestroy(() => {});
</script>

<div
    class="fixed bottom-4 right-4 z-50 rounded-lg overflow-hidden border border-slate-700 bg-black/50 w-32 h-24 pointer-events-auto"
>
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
        bind:this={videoElement}
        class="w-full h-full object-cover opacity-50"
        playsinline
    ></video>
</div>
