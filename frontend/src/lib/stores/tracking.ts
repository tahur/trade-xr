import { writable, derived } from 'svelte/store';
import { spring } from 'svelte/motion';

export interface HeadPosition {
    x: number;
    y: number;
    z: number;
}

export interface TwoHandPinch {
    isActive: boolean;           // Both hands detected
    handDistance: number;        // Distance between hand centers (0-1)
    initialDistance: number;     // Distance when pinch started (for relative zoom)
    velocity: number;            // Rate of change for momentum
}

// Stores
export const headPosition = writable<HeadPosition>({ x: 0, y: 0, z: 0 });
export const isTracking = writable<boolean>(false);
export const cameraLabel = writable<string>(""); // Active camera name
export const sensitivity = writable<number>(5); // Default sensitivity multiplier

// Two-hand zoom state
export const twoHandPinch = writable<TwoHandPinch>({
    isActive: false,
    handDistance: 0,
    initialDistance: 0,
    velocity: 0
});

// Raw zoom level (1.0 = normal, <1 = zoomed in, >1 = zoomed out)
export const zoomLevel = writable<number>(1.0);

// Smooth zoom with spring interpolation - TUNED for snappy response
export const smoothZoom = spring(1.0, {
    stiffness: 0.5,  // Increased from 0.1 for much faster response
    damping: 0.8     // Slightly higher to reduce oscillation
});

// Keep smooth zoom synced with raw zoom
zoomLevel.subscribe(value => {
    smoothZoom.set(value);
});

// Zoom bounds
export const ZOOM_MIN = 0.3;  // Maximum zoom in
export const ZOOM_MAX = 3.0;  // Maximum zoom out

// Clamp zoom to bounds
export function clampZoom(value: number): number {
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
}

// Reset function
export const resetTracking = () => {
    headPosition.set({ x: 0, y: 0, z: 0 });
    zoomLevel.set(1.0);
    smoothZoom.set(1.0, { hard: true }); // Instant reset
    twoHandPinch.set({ isActive: false, handDistance: 0, initialDistance: 0, velocity: 0 });
};

export const isCameraEnabled = writable<boolean>(true);

