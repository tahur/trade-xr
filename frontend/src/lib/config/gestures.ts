/**
 * Gesture-related constants - Centralized configuration for all gesture thresholds
 */

// Pinch detection thresholds
export const GESTURE_THRESHOLDS = {
    /** Distance threshold to start pinching (stricter) */
    PINCH_ENTER: 0.045,
    /** Distance threshold to stop pinching (more lenient) */
    PINCH_EXIT: 0.07,
    /** Minimum ms to hold pinch before confirming */
    PINCH_CONFIRM_MS: 80,
    /** Velocity threshold for stable hand detection */
    VELOCITY_STABLE: 0.3,
    /** Thumbs up score threshold */
    THUMBS_UP_SCORE: 2.5,
} as const;

// EMA smoothing presets
export const EMA_PRESETS = {
    ULTRA_SMOOTH: 0.15,
    SMOOTH: 0.3,
    BALANCED: 0.5,
    SNAPPY: 0.7,
    INSTANT: 0.9,
} as const;

// Timing constants for trading state machine
export const TRADING_TIMING = {
    /** Delay before entering targeting mode */
    ENTRY_DELAY_MS: 200,
    /** Delay before locking price after pinch */
    LOCK_DELAY_MS: 350,
    /** Delay before confirming after point-up */
    CONFIRM_DELAY_MS: 400,
    /** Delay before placing order after thumbs-up */
    ORDER_DELAY_MS: 500,
    /** Cooldown after locking price */
    POST_LOCK_COOLDOWN: 400,
} as const;

// Zoom configuration
export const ZOOM_CONFIG = {
    /** Cooldown ms after zoom gesture ends */
    COOLDOWN_MS: 300,
    /** Minimum zoom level */
    MIN: 0.3,
    /** Maximum zoom level */
    MAX: 3.0,
    /** Power factor for amplifying zoom */
    AMPLIFY_POWER: 1.5,
} as const;

// Gesture Engine configuration
export const ENGINE_CONFIG = {
    ZOOM_COOLDOWN_MS: 300,
    TRADING_COOLDOWN_MS: 200,
    MIN_LOCK_DURATION_MS: 100,
    CONFIRM_HOLD_MS: 3000,
    CONFIRM_ZONE_RADIUS: 0.12,
} as const;
