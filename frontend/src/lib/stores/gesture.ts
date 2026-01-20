import { writable } from 'svelte/store';

export type GestureMode = 'IDLE' | 'TRADING' | 'CONFIRMING' | 'PLACED';
export type HandSide = 'Left' | 'Right' | 'Unknown';

export interface GestureState {
    isHandDetected: boolean;
    handPosition: { x: number, y: number }; // Normalized 0-1
    isPinching: boolean;
    pinchDistance: number;
    targetPrice: number | null;
    mode: GestureMode;
    holdProgress: number;
    // Order Side (BUY/SELL based on hand)
    orderSide: 'BUY' | 'SELL' | null;
    // Gesture Recognition
    detectedGesture: 'None' | 'Pointing_Up' | 'Victory' | 'Closed_Fist' | 'Open_Palm' | 'Thumbs_Up' | 'Thumbs_Down';
    fingerCount: number;
    // Hand identification
    primaryHandSide: HandSide;
    numHandsDetected: number;
    // Velocity tracking for robust gestures
    handVelocity: { x: number, y: number };
    isHandStable: boolean;
}

export const gestureState = writable<GestureState>({
    isHandDetected: false,
    handPosition: { x: 0, y: 0 },
    isPinching: false,
    pinchDistance: 0,
    targetPrice: null,
    mode: 'IDLE',
    holdProgress: 0,
    orderSide: null,
    detectedGesture: 'None',
    fingerCount: 0,
    primaryHandSide: 'Unknown',
    numHandsDetected: 0,
    handVelocity: { x: 0, y: 0 },
    isHandStable: true
});

// NEW: User preference for which hand triggers trading
export const tradingHandPreference = writable<'Left' | 'Right'>('Right');

// NEW: Sensitivity for gesture detection (0-1)
export const gestureSensitivity = writable<number>(0.08);

// NEW: Cooldown state after zoom ends (prevents accidental triggers)
export const zoomCooldownActive = writable<boolean>(false);

// Helper to reset state
export const resetGesture = () => {
    gestureState.set({
        isHandDetected: false,
        handPosition: { x: 0, y: 0 },
        isPinching: false,
        pinchDistance: 0,
        targetPrice: null,
        mode: 'IDLE',
        holdProgress: 0,
        orderSide: null,
        detectedGesture: 'None',
        fingerCount: 0,
        primaryHandSide: 'Unknown',
        numHandsDetected: 0,
        handVelocity: { x: 0, y: 0 },
        isHandStable: true
    });
};
