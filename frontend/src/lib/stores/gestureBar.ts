/**
 * Gesture Bar Store - Manages context-aware bottom bar state
 * Similar to Dynamic Island, adapts content based on user action
 */
import { writable } from 'svelte/store';

export type GestureBarMode = 'idle' | 'zoom' | 'targeting' | 'locked' | 'confirming' | 'portfolio';

export interface GestureBarState {
    mode: GestureBarMode;
    zoomLevel: number;      // Percentage for zoom mode
    price: number | null;   // Price for price picker modes
}

const initialState: GestureBarState = {
    mode: 'idle',
    zoomLevel: 100,
    price: null
};

function createGestureBarStore() {
    const { subscribe, set, update } = writable<GestureBarState>(initialState);

    return {
        subscribe,

        /**
         * Set mode to idle (default gesture hints)
         */
        setIdle: () => {
            update(state => ({
                ...state,
                mode: 'idle',
                price: null
            }));
        },

        /**
         * Set portfolio mode (portfolio view gestures)
         */
        setPortfolio: () => {
            update(state => ({
                ...state,
                mode: 'portfolio',
                price: null
            }));
        },

        /**
         * Set zoom mode with current zoom level
         */
        setZoom: (zoomLevel: number) => {
            update(state => ({
                ...state,
                mode: 'zoom',
                zoomLevel
            }));
        },

        /**
         * Update zoom level without changing mode
         */
        updateZoomLevel: (zoomLevel: number) => {
            update(state => {
                if (state.mode === 'zoom') {
                    return { ...state, zoomLevel };
                }
                return state;
            });
        },

        /**
         * Set targeting mode (price picker active)
         */
        setTargeting: () => {
            update(state => ({
                ...state,
                mode: 'targeting',
                price: null
            }));
        },

        /**
         * Set locked mode with locked price
         */
        setLocked: (price: number) => {
            update(state => ({
                ...state,
                mode: 'locked',
                price
            }));
        },

        /**
         * Set confirming mode (ready for buy/sell)
         */
        setConfirming: (price: number) => {
            update(state => ({
                ...state,
                mode: 'confirming',
                price
            }));
        },

        /**
         * Reset to idle
         */
        reset: () => {
            set(initialState);
        }
    };
}

export const gestureBar = createGestureBarStore();
