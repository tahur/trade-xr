import { writable } from 'svelte/store';

export type GestureMode = 'IDLE' | 'TRADING' | 'CONFIRMING' | 'PLACED';

export interface GestureState {
    isHandDetected: boolean;
    handPosition: { x: number, y: number }; // Normalized 0-1
    isPinching: boolean;
    pinchDistance: number; // Normalized 0-1 usually, but here likely raw distance
    targetPrice: number | null;
    mode: GestureMode;
    holdProgress: number; // 0 to 100 for confirmation
}

export const gestureState = writable<GestureState>({
    isHandDetected: false,
    handPosition: { x: 0, y: 0 },
    isPinching: false,
    pinchDistance: 0,
    targetPrice: null,
    mode: 'IDLE',
    holdProgress: 0
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
        holdProgress: 0
    });
};
