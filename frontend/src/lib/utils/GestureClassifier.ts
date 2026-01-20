/**
 * GestureClassifier - Pure functions for gesture recognition
 * Extracted from FaceTracker.svelte for modularity and testability
 */

import { GESTURE_THRESHOLDS, EMA_PRESETS } from '$lib/config/gestures';

// Types
export interface HandLandmarks {
    [index: number]: { x: number; y: number; z?: number };
}

export type GestureType =
    | 'None'
    | 'Closed_Fist'
    | 'Thumbs_Up'
    | 'Thumbs_Down'
    | 'Pointing_Up'
    | 'Victory'
    | 'Open_Palm';

export interface GestureResult {
    gesture: GestureType;
    isPinching: boolean;
    fingerCount: number;
    handPosition: { x: number; y: number };
    handSide: 'Left' | 'Right' | 'Unknown';
    isStable: boolean;
}

// ===================== UTILITY FUNCTIONS =====================

/**
 * Exponential Moving Average for signal smoothing
 */
export function ema(current: number, previous: number, alpha: number = EMA_PRESETS.SNAPPY): number {
    return alpha * current + (1 - alpha) * previous;
}

/**
 * Calculate distance between two points
 */
export function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Check if a finger is extended (tip higher than PIP joint)
 */
export function isFingerExtended(landmarks: HandLandmarks, tipIdx: number, pipIdx: number): boolean {
    return landmarks[tipIdx].y < landmarks[pipIdx].y;
}

// ===================== PINCH DETECTION =====================

/**
 * Detect pinch with hysteresis to prevent flickering
 */
export function detectPinch(
    landmarks: HandLandmarks,
    currentlyPinching: boolean
): { isPinching: boolean; pinchDistance: number } {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    const pinchDistance = distance(thumbTip, indexTip);

    // Hysteresis thresholds
    const threshold = currentlyPinching
        ? GESTURE_THRESHOLDS.PINCH_EXIT
        : GESTURE_THRESHOLDS.PINCH_ENTER;

    return {
        isPinching: pinchDistance < threshold,
        pinchDistance
    };
}

// ===================== THUMBS UP DETECTION =====================

/**
 * Score-based thumbs up detection for reliability
 * Returns a score 0-5 where >= 2.5 is considered thumbs up
 */
export function getThumbsUpScore(landmarks: HandLandmarks): number {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const wrist = landmarks[0];
    const indexKnuckle = landmarks[5];

    let score = 0;

    // 1. Thumb tip is higher than thumb IP (thumb pointing up)
    if (thumbTip.y < thumbIP.y - 0.015) score += 1;

    // 2. Thumb tip is higher than wrist
    if (thumbTip.y < wrist.y - 0.02) score += 1;

    // 3. Thumb is extended outward from palm
    const thumbDist = distance(thumbTip, indexKnuckle);
    if (thumbDist > 0.08) score += 1;

    // 4. Other fingers are closed
    const otherFingersClosed =
        landmarks[8].y > landmarks[5].y &&   // Index
        landmarks[12].y > landmarks[9].y &&  // Middle
        landmarks[16].y > landmarks[13].y && // Ring
        landmarks[20].y > landmarks[17].y;   // Pinky
    if (otherFingersClosed) score += 1;

    // 5. Thumb is on correct side (partial point)
    if (Math.abs(thumbTip.x - indexKnuckle.x) > 0.05) score += 0.5;

    return score;
}

/**
 * Detect thumbs up gesture
 */
export function isThumbsUp(landmarks: HandLandmarks): boolean {
    return getThumbsUpScore(landmarks) >= GESTURE_THRESHOLDS.THUMBS_UP_SCORE;
}

// ===================== THUMBS DOWN DETECTION =====================

/**
 * Score-based thumbs down detection (inverse of thumbs up)
 * Returns a score 0-5 where >= 2.5 is considered thumbs down
 */
export function getThumbsDownScore(landmarks: HandLandmarks): number {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const wrist = landmarks[0];
    const indexKnuckle = landmarks[5];

    let score = 0;

    // 1. Thumb tip is LOWER than thumb IP (thumb pointing down)
    if (thumbTip.y > thumbIP.y + 0.015) score += 1;

    // 2. Thumb tip is LOWER than wrist (hand inverted or thumb down)
    if (thumbTip.y > wrist.y + 0.02) score += 1;

    // 3. Thumb is extended outward from palm
    const thumbDist = distance(thumbTip, indexKnuckle);
    if (thumbDist > 0.08) score += 1;

    // 4. Other fingers are closed
    const otherFingersClosed =
        landmarks[8].y > landmarks[5].y &&   // Index
        landmarks[12].y > landmarks[9].y &&  // Middle
        landmarks[16].y > landmarks[13].y && // Ring
        landmarks[20].y > landmarks[17].y;   // Pinky
    if (otherFingersClosed) score += 1;

    // 5. Thumb is on correct side (partial point)
    if (Math.abs(thumbTip.x - indexKnuckle.x) > 0.05) score += 0.5;

    return score;
}

/**
 * Detect thumbs down gesture
 */
export function isThumbsDown(landmarks: HandLandmarks): boolean {
    return getThumbsDownScore(landmarks) >= GESTURE_THRESHOLDS.THUMBS_UP_SCORE;
}

// ===================== FINGER COUNTING =====================

/**
 * Count extended fingers on a hand
 */
export function countFingers(landmarks: HandLandmarks): number {
    let count = 0;

    // Index, Middle, Ring, Pinky
    if (isFingerExtended(landmarks, 8, 5)) count++;
    if (isFingerExtended(landmarks, 12, 9)) count++;
    if (isFingerExtended(landmarks, 16, 13)) count++;
    if (isFingerExtended(landmarks, 20, 17)) count++;

    // Thumb (heuristic based on distance from pinky base)
    const thumbDist = Math.sqrt(Math.pow(landmarks[4].x - landmarks[17].x, 2));
    if (thumbDist > 0.15) count++;

    return count;
}

// ===================== GESTURE CLASSIFICATION =====================

/**
 * Classify the primary gesture from hand landmarks
 */
export function classifyGesture(landmarks: HandLandmarks, isPinching: boolean): GestureType {
    // Count open fingers
    const indexOpen = isFingerExtended(landmarks, 8, 5);
    const middleOpen = isFingerExtended(landmarks, 12, 9);
    const ringOpen = isFingerExtended(landmarks, 16, 13);
    const pinkyOpen = isFingerExtended(landmarks, 20, 17);

    const fingersUp = [indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;

    // No fingers up
    if (fingersUp === 0) {
        // Check thumbs up vs thumbs down vs closed fist
        if (isThumbsUp(landmarks)) {
            return 'Thumbs_Up';
        }
        if (isThumbsDown(landmarks)) {
            return 'Thumbs_Down';
        }
        return 'Closed_Fist';
    }

    // Single finger up
    if (fingersUp === 1 && indexOpen) {
        return 'Pointing_Up';
    }

    // Victory sign
    if (fingersUp === 2 && indexOpen && middleOpen) {
        return 'Victory';
    }

    // Open palm
    if (fingersUp >= 4) {
        return 'Open_Palm';
    }

    return 'None';
}

// ===================== HAND SIDE DETECTION =====================

/**
 * Determine which hand (left/right) based on position in mirrored webcam
 */
export function detectHandSide(landmarks: HandLandmarks): 'Left' | 'Right' | 'Unknown' {
    const handCenterX = landmarks[9].x; // Middle finger MCP
    // In mirrored webcam: user's RIGHT hand appears on LEFT side (x < 0.5)
    return handCenterX < 0.5 ? 'Right' : 'Left';
}

// ===================== VELOCITY & STABILITY =====================

/**
 * Check if hand is stable (low velocity)
 */
export function isHandStable(velocityX: number, velocityY: number): boolean {
    return Math.abs(velocityX) < GESTURE_THRESHOLDS.VELOCITY_STABLE
        && Math.abs(velocityY) < GESTURE_THRESHOLDS.VELOCITY_STABLE;
}

// ===================== MAIN CLASSIFIER =====================

/**
 * Full gesture classification from hand landmarks
 */
export function analyzeHand(
    landmarks: HandLandmarks,
    currentlyPinching: boolean,
    velocityX: number = 0,
    velocityY: number = 0
): GestureResult {
    const { isPinching, pinchDistance } = detectPinch(landmarks, currentlyPinching);
    const gesture = classifyGesture(landmarks, isPinching);
    const fingerCount = countFingers(landmarks);
    const handSide = detectHandSide(landmarks);
    const stable = isHandStable(velocityX, velocityY);

    return {
        gesture,
        isPinching,
        fingerCount,
        handPosition: { x: landmarks[9].x, y: landmarks[9].y },
        handSide,
        isStable: stable
    };
}
