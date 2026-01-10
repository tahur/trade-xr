import { writable } from 'svelte/store';

export type GestureMode = 'IDLE' | 'TRADING' | 'CONFIRMING' | 'PLACED';

export interface GestureState {
    isHandDetected: boolean;
    handPosition: { x: number, y: number }; // Normalized 0-1
    isPinching: boolean;
    pinchDistance: number;
    targetPrice: number | null;
    mode: GestureMode;
    holdProgress: number;
    // New Fields for Order Flow
    detectedGesture: 'None' | 'Pointing_Up' | 'Victory' | 'Closed_Fist' | 'Open_Palm';
    fingerCount: number;
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
    fingerCount: 0
});

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
        fingerCount: 0
    });
};
