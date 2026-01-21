<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { FaceMesh } from "@mediapipe/face_mesh";
    import { Hands } from "@mediapipe/hands";
    import { Camera } from "@mediapipe/camera_utils";
    import {
        headPosition,
        isTracking,
        twoHandPinch,
        zoomLevel,
        cameraLabel,
        isCameraEnabled,
    } from "$lib/stores/tracking";
    import { gestureState, zoomCooldownActive } from "$lib/stores/gesture";
    import {
        gestureEngine,
        acquireZoom,
        releaseZoom,
    } from "$lib/services/gestureEngine";
    import { animationController } from "$lib/controllers/AnimationController";
    import { gestureBus } from "$lib/services/gestureBus";

    let videoElement: HTMLVideoElement;
    let faceMesh: FaceMesh;
    let hands: Hands;
    let camera: Camera | null = null;
    let isCameraRunning = false;

    // Two-hand zoom state
    let wasZooming = false;
    let zoomStartDistance = 0;
    let baseZoom = 1.0;
    let lastHandDist = 0; // For velocity calculation

    // Cooldown timer after zoom ends
    let cooldownTimer: ReturnType<typeof setTimeout> | null = null;
    const ZOOM_COOLDOWN_MS = 300; // 0.3 seconds cooldown after zoom

    // Frame throttling for MediaPipe CPU optimization
    let frameCount = 0;

    // === SIGNAL PROCESSING LAYER ===
    // EMA Smoothing State
    const EMA_ALPHA = 0.7; // Higher = faster response (0.7 = snappy, 0.5 = balanced)
    let smoothedPinchDistance = 0.1; // Start closer to pinch range
    let smoothedHandX = 0.5;
    let smoothedHandY = 0.5;

    // Velocity Tracking
    let lastHandX = 0.5;
    let lastHandY = 0.5;
    let lastFrameTime = 0;
    let velocityX = 0;
    let velocityY = 0;

    // Hysteresis for Pinch Detection - TIGHTER thresholds to prevent false positives
    let isPinchingState = false;
    const PINCH_ENTER_THRESHOLD = 0.045; // Tighter - require clear pinch
    const PINCH_EXIT_THRESHOLD = 0.07; // Less tolerance - quicker release detection

    // Pinch confirmation - require sustained pinch to prevent accidental triggers
    let pinchStartTime: number | null = null;
    const PINCH_CONFIRM_MS = 80; // Must hold pinch for 80ms to confirm
    let confirmedPinch = false;

    // EMA helper function
    const ema = (
        current: number,
        previous: number,
        alpha: number = EMA_ALPHA,
    ) => alpha * current + (1 - alpha) * previous;

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
            // ============ TWO-HAND PINCH ZOOM ============
            if (
                results.multiHandLandmarks &&
                results.multiHandLandmarks.length === 2
            ) {
                // Calculate center of each hand (using middle finger MCP landmark 9)
                const hand1Center = {
                    x: results.multiHandLandmarks[0][9].x,
                    y: results.multiHandLandmarks[0][9].y,
                };
                const hand2Center = {
                    x: results.multiHandLandmarks[1][9].x,
                    y: results.multiHandLandmarks[1][9].y,
                };

                // Distance between hand centers
                const handDist = Math.sqrt(
                    Math.pow(hand1Center.x - hand2Center.x, 2) +
                        Math.pow(hand1Center.y - hand2Center.y, 2),
                );

                if (!wasZooming) {
                    // Try to acquire zoom context
                    if (acquireZoom()) {
                        wasZooming = true;
                        zoomStartDistance = handDist;
                        baseZoom = $zoomLevel;
                        lastHandDist = handDist;

                        // Emit ZOOM_START event to immediately cancel any trading state
                        gestureBus.emit("ZOOM_START");
                    }
                }

                // Calculate velocity for momentum (smoothed)
                const velocity = (handDist - (lastHandDist || handDist)) * 10;
                lastHandDist = handDist;

                // Calculate zoom factor with INCREASED sensitivity
                // Amplify the ratio difference for faster zoom response
                const distanceRatio = zoomStartDistance / handDist;
                // Power of 1.5 makes small movements more impactful
                const amplifiedRatio = Math.pow(distanceRatio, 1.5);
                const newZoom = Math.max(
                    0.3,
                    Math.min(3.0, baseZoom * amplifiedRatio),
                );

                // DIRECT RAF UPDATE - bypasses spring for instant response
                animationController.setZoom(newZoom);

                // Emit event for any listeners
                gestureBus.emit("ZOOM_UPDATE", {
                    handDistance: handDist,
                    initialDistance: zoomStartDistance,
                    delta: distanceRatio - 1,
                    zoomFactor: newZoom,
                });

                // Still update stores for UI display
                zoomLevel.set(newZoom);
                twoHandPinch.set({
                    isActive: true,
                    handDistance: handDist,
                    initialDistance: zoomStartDistance,
                    velocity: velocity,
                });
            } else {
                // Less than 2 hands - end zoom gesture
                if (wasZooming) {
                    wasZooming = false;
                    // Release zoom context with cooldown
                    releaseZoom();

                    // Emit zoom end event
                    gestureBus.emit("ZOOM_END");

                    zoomCooldownActive.set(true);
                    if (cooldownTimer) clearTimeout(cooldownTimer);
                    cooldownTimer = setTimeout(() => {
                        zoomCooldownActive.set(false);
                    }, ZOOM_COOLDOWN_MS);
                }
                twoHandPinch.set({
                    isActive: false,
                    handDistance: 0,
                    initialDistance: 0,
                    velocity: 0,
                });
            }

            // ============ SINGLE HAND GESTURES ============
            if (
                results.multiHandLandmarks &&
                results.multiHandLandmarks.length > 0
            ) {
                const numHands = results.multiHandLandmarks.length;

                // Use first hand for main interactions (pinch/drag)
                const primaryHand = results.multiHandLandmarks[0];
                const thumbTip = primaryHand[4];
                const indexTip = primaryHand[8];
                const handY = primaryHand[9].y;

                // Get handedness from MediaPipe (note: it's mirrored in webcam)
                // MediaPipe's handedness is unreliable, so we combine with position
                const rawHandedness =
                    results.multiHandedness?.[0]?.label || "Unknown";

                // More reliable: Use hand position in mirrored view
                // In mirrored webcam: user's RIGHT hand appears on LEFT side (x < 0.5)
                // We prioritize position over MediaPipe's label for reliability
                const handCenterX = primaryHand[9].x;
                const positionBasedSide = handCenterX < 0.5 ? "Right" : "Left";

                // Use position-based detection (more reliable in mirrored view)
                const primaryHandSide = positionBasedSide;

                // === SMOOTHED PINCH DETECTION ===
                const rawDistance = Math.sqrt(
                    Math.pow(thumbTip.x - indexTip.x, 2) +
                        Math.pow(thumbTip.y - indexTip.y, 2),
                );

                // Apply EMA smoothing to reduce jitter
                smoothedPinchDistance = ema(rawDistance, smoothedPinchDistance);

                // Smooth hand position
                const rawHandX = primaryHand[9].x;
                const rawHandY = primaryHand[9].y;
                smoothedHandX = ema(rawHandX, smoothedHandX);
                smoothedHandY = ema(rawHandY, smoothedHandY);

                // === VELOCITY TRACKING ===
                const now = performance.now();
                const dt = (now - lastFrameTime) / 1000;
                if (dt > 0 && dt < 0.5) {
                    // Ignore large gaps
                    velocityX = (smoothedHandX - lastHandX) / dt;
                    velocityY = (smoothedHandY - lastHandY) / dt;
                }
                lastFrameTime = now;
                lastHandX = smoothedHandX;
                lastHandY = smoothedHandY;

                // === HYSTERESIS FOR PINCH STATE ===
                const rawPinching =
                    smoothedPinchDistance <
                    (isPinchingState
                        ? PINCH_EXIT_THRESHOLD
                        : PINCH_ENTER_THRESHOLD);

                if (rawPinching) {
                    if (!isPinchingState) {
                        // Starting a new pinch - track start time
                        if (pinchStartTime === null) {
                            pinchStartTime = performance.now();
                        }
                        // Check if pinch has been held long enough
                        const pinchDuration =
                            performance.now() - pinchStartTime;
                        if (pinchDuration >= PINCH_CONFIRM_MS) {
                            isPinchingState = true;
                            confirmedPinch = true;
                        }
                    } else {
                        // Already pinching, keep confirmed
                        confirmedPinch = true;
                    }
                } else {
                    // Not pinching - reset
                    isPinchingState = false;
                    confirmedPinch = false;
                    pinchStartTime = null;
                }

                // Determine if hand is stable (STRICTER velocity check)
                const isHandStable =
                    Math.abs(velocityX) < 0.3 && Math.abs(velocityY) < 0.3;

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
                    // Check for Thumbs Up vs Thumbs Down vs Fist
                    // === IMPROVED THUMBS UP/DOWN DETECTION ===
                    const thumbTip = primaryHand[4];
                    const thumbIP = primaryHand[3];
                    const thumbMCP = primaryHand[2];
                    const wrist = primaryHand[0];
                    const indexKnuckle = primaryHand[5];
                    const indexTip = primaryHand[8];
                    const pinkyTip = primaryHand[20];

                    // Common checks
                    const thumbExtended =
                        Math.hypot(
                            thumbTip.x - indexKnuckle.x,
                            thumbTip.y - indexKnuckle.y,
                        ) > 0.08;

                    const otherFingersClosed =
                        primaryHand[8].y > primaryHand[5].y && // Index
                        primaryHand[12].y > primaryHand[9].y && // Middle
                        primaryHand[16].y > primaryHand[13].y && // Ring
                        primaryHand[20].y > primaryHand[17].y; // Pinky

                    const thumbOnSide =
                        Math.abs(thumbTip.x - indexKnuckle.x) > 0.05;

                    // === THUMBS UP CHECKS ===
                    const thumbPointingUp = thumbTip.y < thumbIP.y - 0.015;
                    const thumbAboveWrist = thumbTip.y < wrist.y - 0.02;

                    const thumbsUpScore =
                        (thumbPointingUp ? 1 : 0) +
                        (thumbAboveWrist ? 1 : 0) +
                        (thumbExtended ? 1 : 0) +
                        (otherFingersClosed ? 1 : 0) +
                        (thumbOnSide ? 0.5 : 0);

                    // === THUMBS DOWN CHECKS ===
                    const thumbPointingDown = thumbTip.y > thumbIP.y + 0.015;
                    const thumbBelowWrist = thumbTip.y > wrist.y + 0.02;

                    const thumbsDownScore =
                        (thumbPointingDown ? 1 : 0) +
                        (thumbBelowWrist ? 1 : 0) +
                        (thumbExtended ? 1 : 0) +
                        (otherFingersClosed ? 1 : 0) +
                        (thumbOnSide ? 0.5 : 0);

                    // Determine gesture - thumbs up takes priority if both score high
                    if (thumbsUpScore >= 2.5) {
                        primaryGesture = "Thumbs_Up";
                    } else if (thumbsDownScore >= 2.5) {
                        primaryGesture = "Thumbs_Down";
                    } else if (otherFingersClosed && thumbExtended) {
                        // Fallback: if fist is closed and thumb is out, check direction
                        if (thumbPointingUp) {
                            primaryGesture = "Thumbs_Up";
                        } else if (thumbPointingDown) {
                            primaryGesture = "Thumbs_Down";
                        } else {
                            primaryGesture = "Closed_Fist";
                        }
                    } else {
                        primaryGesture = "Closed_Fist";
                    }
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

                // Update store with SMOOTHED values
                gestureState.update((s) => ({
                    ...s,
                    isHandDetected: true,
                    handPosition: { x: smoothedHandX, y: smoothedHandY },
                    isPinching: isPinchingState,
                    pinchDistance: smoothedPinchDistance,
                    detectedGesture: primaryGesture as any,
                    fingerCount: totalFingers,
                    primaryHandSide: primaryHandSide as any,
                    numHandsDetected: numHands,
                    handVelocity: { x: velocityX, y: velocityY },
                    isHandStable,
                }));
            } else {
                gestureState.update((s) => ({
                    ...s,
                    isHandDetected: false,
                    isPinching: false,
                    detectedGesture: "None",
                    fingerCount: 0,
                    primaryHandSide: "Unknown",
                    numHandsDetected: 0,
                }));
            }
        });

        if (videoElement) {
            camera = new Camera(videoElement, {
                onFrame: async () => {
                    // Throttle face mesh to every other frame for CPU savings
                    // Hand tracking runs every frame for responsiveness
                    if (frameCount++ % 2 === 0) {
                        await faceMesh.send({ image: videoElement });
                    }
                    await hands.send({ image: videoElement });
                },
                width: 640,
                height: 480,
            });
            // Camera start handled by reactive statement below

            // Extract Camera Label
            setTimeout(async () => {
                try {
                    // Method 1: Try from video element stream
                    const stream = videoElement.srcObject as MediaStream;
                    if (stream) {
                        const track = stream.getVideoTracks()[0];
                        if (track && track.label) {
                            cameraLabel.set(track.label);
                            return;
                        }
                    }

                    // Method 2: Fallback to enumerateDevices (likely the first videoinput)
                    const devices =
                        await navigator.mediaDevices.enumerateDevices();
                    const videoInput = devices.find(
                        (d) => d.kind === "videoinput",
                    );
                    if (videoInput) {
                        cameraLabel.set(videoInput.label || "Webcam");
                    } else {
                        cameraLabel.set("Webcam");
                    }
                } catch (e) {
                    console.error("Error getting camera label:", e);
                    cameraLabel.set("Camera");
                }
            }, 1000); // Wait a bit for stream to init
        }
    });

    onDestroy(() => {
        if (camera) camera.stop();
    });

    // Reactive Camera Control
    $: if (camera) {
        if ($isCameraEnabled && !isCameraRunning) {
            camera.start();
            isCameraRunning = true;
        } else if (!$isCameraEnabled && isCameraRunning) {
            camera.stop();
            isCameraRunning = false;
            $isTracking = false;
        }
    }
</script>

<div
    class="fixed bottom-6 right-6 z-50 overflow-hidden rounded-lg border border-slate-700 bg-black/50 w-40 shadow-lg pointer-events-auto"
>
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
        bind:this={videoElement}
        class="w-full h-24 object-cover opacity-50"
        playsinline
    ></video>

    <!-- Debug Info Overlay -->
    <div
        class="p-1.5 text-[9px] font-mono text-white/80 space-y-0.5 bg-black/60"
    >
        <div class="flex justify-between">
            <span>Hand:</span>
            <span
                class={$gestureState.isHandDetected
                    ? "text-green-400"
                    : "text-red-400"}
            >
                {$gestureState.isHandDetected
                    ? $gestureState.primaryHandSide
                    : "None"}
            </span>
        </div>
        <div class="flex justify-between">
            <span>Pinch:</span>
            <span
                class={$gestureState.isPinching
                    ? "text-yellow-400"
                    : "text-slate-400"}
            >
                {$gestureState.pinchDistance.toFixed(3)}
                {$gestureState.isPinching ? "✓" : ""}
            </span>
        </div>
        <div class="flex justify-between">
            <span>Hands#:</span>
            <span>{$gestureState.numHandsDetected}</span>
        </div>
        <div class="flex justify-between">
            <span>Gest:</span>
            <span class="text-cyan-400 truncate max-w-[60px]"
                >{$gestureState.detectedGesture}</span
            >
        </div>
    </div>

    <div class="absolute top-1 right-1">
        <div
            class={`h-2 w-2 rounded-full ${$isTracking ? "bg-green-500" : "bg-red-500"}`}
        ></div>
    </div>
</div>
