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
            maxNumHands: 2, // Enable 2 hands for max 10 count
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
            if (
                results.multiHandLandmarks &&
                results.multiHandLandmarks.length > 0
            ) {
                // Use first hand for main interactions (pinch/drag)
                const primaryHand = results.multiHandLandmarks[0];
                const thumbTip = primaryHand[4];
                const indexTip = primaryHand[8];
                const handY = primaryHand[9].y;

                // Pinch Logic (Primary Hand)
                const distance = Math.sqrt(
                    Math.pow(thumbTip.x - indexTip.x, 2) +
                        Math.pow(thumbTip.y - indexTip.y, 2),
                );
                const isPinching = distance < 0.05;

                // --- Gesture & Finger Counting Logic (All Hands) ---
                let totalFingers = 0;
                let primaryGesture = "None";

                // Helper to check finger extension
                const isExtended = (
                    landmarks: any[],
                    tipIdx: number,
                    pipIdx: number,
                ) => {
                    return landmarks[tipIdx].y < landmarks[pipIdx].y; // Simple Y check for upright hand
                };

                // Analyze Primary Hand for Gesture Class
                const idxOpen = isExtended(primaryHand, 8, 5);
                const midOpen = isExtended(primaryHand, 12, 9);
                const ringOpen = isExtended(primaryHand, 16, 13);
                const pinkyOpen = isExtended(primaryHand, 20, 17);
                // Thumb is tricky, ignore for simple gesture class, focus on clear fingers
                const fingersUp = [
                    idxOpen,
                    midOpen,
                    ringOpen,
                    pinkyOpen,
                ].filter(Boolean).length;

                if (fingersUp === 0) {
                    primaryGesture = "Closed_Fist";
                } else if (fingersUp === 1 && idxOpen) {
                    primaryGesture = "Pointing_Up";
                } else if (fingersUp === 2 && idxOpen && midOpen) {
                    primaryGesture = "Victory";
                } else if (fingersUp === 4 || fingersUp === 5) {
                    // broad open
                    primaryGesture = "Open_Palm";
                }

                // Count ALL fingers across ALL hands
                results.multiHandLandmarks.forEach((hand) => {
                    if (isExtended(hand, 8, 5)) totalFingers++;
                    if (isExtended(hand, 12, 9)) totalFingers++;
                    if (isExtended(hand, 16, 13)) totalFingers++;
                    if (isExtended(hand, 20, 17)) totalFingers++;
                    // Basic thumb check: x dif relative to pinky?
                    // Let's just assume thumb is open if x distance to pinky base is large?
                    // Or simplified: Just count thumb if tip.x isn't "inside" palm.
                    // For now, let's stick to 4 reliable fingers for simplicity?
                    // USER said "max 10 allowed". So thumb MUST be included.

                    // Simple Thumb Check: Compare Tip X to IPM (3) X.
                    // Left interaction: Thumb Tip X < IP X. Right interaction: Thumb Tip X > IP X.
                    // Instead of complex handedness check, let's assume if it's far from index base.
                    const thumbDist = Math.sqrt(
                        Math.pow(hand[4].x - hand[17].x, 2),
                    ); // Tip to pinky base
                    if (thumbDist > 0.15) totalFingers++; // Heuristic
                });

                gestureState.update((s) => ({
                    ...s,
                    isHandDetected: true,
                    handPosition: { x: primaryHand[9].x, y: handY },
                    isPinching,
                    pinchDistance: distance,
                    detectedGesture: primaryGesture as any,
                    fingerCount: totalFingers,
                }));
            } else {
                gestureState.update((s) => ({
                    ...s,
                    isHandDetected: false,
                    isPinching: false,
                    detectedGesture: "None",
                    fingerCount: 0,
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
