import { writable } from 'svelte/store';

export interface HeadPosition {
    x: number;
    y: number;
    z: number;
}

// Stores
export const headPosition = writable<HeadPosition>({ x: 0, y: 0, z: 0 });
export const isTracking = writable<boolean>(false);
export const sensitivity = writable<number>(5); // Default sensitivity multiplier

// Reset function
export const resetTracking = () => {
    headPosition.set({ x: 0, y: 0, z: 0 });
};
