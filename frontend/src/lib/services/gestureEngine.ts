/**
 * Gesture Engine - Centralized gesture context management
 * 
 * Handles:
 * - Context locking (only one feature can use gestures at a time)
 * - Priority management (zoom > trading)
 * - Debouncing and cooldowns
 * - Conflict prevention
 */

import { writable, get } from 'svelte/store';

// === TYPES ===
export type GestureContext = 'IDLE' | 'ZOOMING' | 'TRADING' | 'CONFIRMING';

interface EngineState {
    context: GestureContext;
    lockOwner: string | null;
    lockTime: number | null;
    cooldownUntil: number | null;
}

// === PRIORITY ORDER ===
// Higher priority contexts can interrupt lower ones
const CONTEXT_PRIORITY: Record<GestureContext, number> = {
    'IDLE': 0,
    'TRADING': 1,
    'CONFIRMING': 2,
    'ZOOMING': 3  // Highest - zoom always wins
};

// === CONSTANTS ===
export const ENGINE_CONFIG = {
    ZOOM_COOLDOWN_MS: 300,      // Cooldown after zoom ends
    TRADING_COOLDOWN_MS: 200,   // Cooldown after trading state change
    MIN_LOCK_DURATION_MS: 100,  // Minimum time to hold a lock
    CONFIRM_HOLD_MS: 1500,      // Time to hold thumbs up for confirmation
    CONFIRM_ZONE_RADIUS: 0.12,  // 12% of viewport for confirm zone
};

// === CREATE ENGINE ===
const createGestureEngine = () => {
    const state = writable<EngineState>({
        context: 'IDLE',
        lockOwner: null,
        lockTime: null,
        cooldownUntil: null
    });

    // Derived store for easy context checking
    const context = {
        subscribe: state.subscribe,

        /**
         * Attempt to acquire a context lock
         * @param owner - Unique identifier for the requester
         * @param ctx - The context to acquire
         * @param force - If true, force acquire even if locked (for higher priority)
         * @returns true if lock acquired, false otherwise
         */
        acquire: (owner: string, ctx: GestureContext, force: boolean = false): boolean => {
            const current = get(state);
            const now = Date.now();

            // Check cooldown
            if (current.cooldownUntil && now < current.cooldownUntil) {
                return false;
            }

            // Already locked by same owner - just update context
            if (current.lockOwner === owner) {
                state.update(s => ({ ...s, context: ctx }));
                return true;
            }

            // Check if we can take over based on priority
            if (current.lockOwner !== null) {
                const currentPriority = CONTEXT_PRIORITY[current.context];
                const requestedPriority = CONTEXT_PRIORITY[ctx];

                if (force || requestedPriority > currentPriority) {
                    // Higher priority - take over
                    state.set({
                        context: ctx,
                        lockOwner: owner,
                        lockTime: now,
                        cooldownUntil: null
                    });
                    return true;
                }
                return false; // Can't override
            }

            // No lock - acquire it
            state.set({
                context: ctx,
                lockOwner: owner,
                lockTime: now,
                cooldownUntil: null
            });
            return true;
        },

        /**
         * Release a context lock
         * @param owner - The owner releasing the lock
         * @param cooldownMs - Optional cooldown before another acquire
         */
        release: (owner: string, cooldownMs: number = 0) => {
            const current = get(state);
            if (current.lockOwner === owner) {
                state.set({
                    context: 'IDLE',
                    lockOwner: null,
                    lockTime: null,
                    cooldownUntil: cooldownMs > 0 ? Date.now() + cooldownMs : null
                });
            }
        },

        /**
         * Force release any lock (emergency reset)
         */
        forceRelease: () => {
            state.set({
                context: 'IDLE',
                lockOwner: null,
                lockTime: null,
                cooldownUntil: null
            });
        },

        /**
         * Check if currently locked
         */
        isLocked: (): boolean => get(state).lockOwner !== null,

        /**
         * Get current context
         */
        getContext: (): GestureContext => get(state).context,

        /**
         * Get lock owner
         */
        getLockOwner: (): string | null => get(state).lockOwner,

        /**
         * Check if a specific owner has the lock
         */
        hasLock: (owner: string): boolean => get(state).lockOwner === owner,

        /**
         * Check if currently in cooldown
         */
        isInCooldown: (): boolean => {
            const current = get(state);
            return current.cooldownUntil !== null && Date.now() < current.cooldownUntil;
        },

        /**
         * Check if a context can be acquired (without actually acquiring)
         */
        canAcquire: (ctx: GestureContext): boolean => {
            const current = get(state);
            const now = Date.now();

            // In cooldown
            if (current.cooldownUntil && now < current.cooldownUntil) {
                return false;
            }

            // Not locked
            if (current.lockOwner === null) {
                return true;
            }

            // Check priority
            const currentPriority = CONTEXT_PRIORITY[current.context];
            const requestedPriority = CONTEXT_PRIORITY[ctx];
            return requestedPriority > currentPriority;
        }
    };

    return context;
};

// === EXPORT SINGLETON ===
export const gestureEngine = createGestureEngine();

// === CONVENIENCE HELPERS ===

/**
 * Check if zoom gesture is active
 */
export const isZoomActive = (): boolean => {
    return gestureEngine.getContext() === 'ZOOMING';
};

/**
 * Check if trading flow is active
 */
export const isTradingActive = (): boolean => {
    const ctx = gestureEngine.getContext();
    return ctx === 'TRADING' || ctx === 'CONFIRMING';
};

/**
 * Acquire zoom context (highest priority)
 */
export const acquireZoom = (): boolean => {
    return gestureEngine.acquire('zoom', 'ZOOMING', true);
};

/**
 * Release zoom context with cooldown
 */
export const releaseZoom = (): void => {
    gestureEngine.release('zoom', ENGINE_CONFIG.ZOOM_COOLDOWN_MS);
};

/**
 * Acquire trading context
 */
export const acquireTrading = (): boolean => {
    return gestureEngine.acquire('trading', 'TRADING');
};

/**
 * Upgrade trading to confirming
 */
export const acquireConfirming = (): boolean => {
    return gestureEngine.acquire('trading', 'CONFIRMING');
};

/**
 * Release trading context
 */
export const releaseTrading = (): void => {
    gestureEngine.release('trading', ENGINE_CONFIG.TRADING_COOLDOWN_MS);
};
