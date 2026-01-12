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
    // New Fields for Order Flow
    detectedGesture: 'None' | 'Pointing_Up' | 'Victory' | 'Closed_Fist' | 'Open_Palm' | 'Thumbs_Up';
    fingerCount: number;
    // NEW: Hand identification
    primaryHandSide: HandSide;
    numHandsDetected: number;
    // NEW: Velocity tracking for robust gestures
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
    detectedGesture: 'None',
    fingerCount: 0,
    primaryHandSide: 'Unknown',
    numHandsDetected: 0,
    handVelocity: { x: 0, y: 0 },
    isHandStable: true
});

// NEW: User preference for which hand triggers trading
export const tradingHandPreference = writable<'Left' | 'Right'>('Right');

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
        detectedGesture: 'None',
        fingerCount: 0,
        primaryHandSide: 'Unknown',
        numHandsDetected: 0,
        handVelocity: { x: 0, y: 0 },
        isHandStable: true
    });
};
