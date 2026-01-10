<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { FaceMesh } from "@mediapipe/face_mesh";
    import { Hands } from "@mediapipe/hands";
    import { Camera } from "@mediapipe/camera_utils";
    import { headPosition, isTracking } from "$lib/stores/tracking";
    import { gestureState } from "$lib/stores/gesture";

    let videoElement: HTMLVideoElement;
    let faceMesh: FaceMesh;
    let hands: Hands;
    let camera: Camera | null = null;

    onMount(async () => {
        // --- Face Mesh Setup ---
        faceMesh = new FaceMesh({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results) => {
            if (
                results.multiFaceLandmarks &&
                results.multiFaceLandmarks.length > 0
            ) {
                $isTracking = true;
                const landmarks = results.multiFaceLandmarks[0];
                const nose = landmarks[1];

                // Depth Estimate
                const leftCheek = landmarks[234];
                const rightCheek = landmarks[454];
                const dist = Math.sqrt(
                    Math.pow(leftCheek.x - rightCheek.x, 2) +
                        Math.pow(leftCheek.y - rightCheek.y, 2),
                );

                headPosition.set({
                    x: (nose.x - 0.5) * -1,
                    y: (nose.y - 0.5) * -1,
                    z: dist,
                });
            } else {
                $isTracking = false;
            }
        });

        // --- Hands Setup ---
        hands = new Hands({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
            if (
                results.multiHandLandmarks &&
                results.multiHandLandmarks.length > 0
            ) {
                const landmarks = results.multiHandLandmarks[0];
                const thumbTip = landmarks[4];
                const indexTip = landmarks[8];
                const handY = landmarks[9].y; // Middle finger knuckle as hand centerY

                // Calculate Pinch Distance
                const distance = Math.sqrt(
                    Math.pow(thumbTip.x - indexTip.x, 2) +
                        Math.pow(thumbTip.y - indexTip.y, 2),
                );

                const isPinching = distance < 0.05;

                gestureState.update((s) => ({
                    ...s,
                    isHandDetected: true,
                    handPosition: { x: landmarks[9].x, y: handY },
                    isPinching,
                    pinchDistance: distance,
                }));
            } else {
                gestureState.update((s) => ({
                    ...s,
                    isHandDetected: false,
                    isPinching: false,
                }));
            }
        });

        if (videoElement) {
            camera = new Camera(videoElement, {
                onFrame: async () => {
                    // Send to both models
                    await faceMesh.send({ image: videoElement });
                    await hands.send({ image: videoElement });
                },
                width: 640,
                height: 480,
            });
            await camera.start();
        }
    });

    onDestroy(() => {
        if (camera) camera.stop();
    });
</script>

<div
    class="fixed bottom-4 right-4 z-50 overflow-hidden rounded-lg border border-slate-700 bg-black/50 w-32 h-24 shadow-lg pointer-events-auto"
>
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
        bind:this={videoElement}
        class="w-full h-full object-cover opacity-50"
        playsinline
    ></video>

    <div class="absolute top-1 right-1">
        <div
            class={`h-2 w-2 rounded-full ${$isTracking ? "bg-green-500" : "bg-red-500"}`}
        ></div>
    </div>
</div>
