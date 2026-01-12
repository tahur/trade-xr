import { writable } from 'svelte/store';

export interface HeadPosition {
    x: number;
    y: number;
    z: number;
}

export interface TwoHandPinch {
    isActive: boolean;           // Both hands detected
    handDistance: number;        // Distance between hand centers (0-1)
    initialDistance: number;     // Distance when pinch started (for relative zoom)
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
    initialDistance: 0
});

// Zoom level (1.0 = normal, <1 = zoomed in, >1 = zoomed out)
export const zoomLevel = writable<number>(1.0);

// Reset function
export const resetTracking = () => {
    headPosition.set({ x: 0, y: 0, z: 0 });
    zoomLevel.set(1.0);
    twoHandPinch.set({ isActive: false, handDistance: 0, initialDistance: 0 });
};
