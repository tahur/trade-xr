/**
 * Exponential Moving Average (EMA) smoothing function.
 * Used for smoothing noisy sensor data like hand/head tracking positions.
 * 
 * @param current - The new raw value
 * @param previous - The previous smoothed value
 * @param alpha - Smoothing factor (0-1). Higher = faster response, lower = smoother
 * @returns Smoothed value
 */
export function ema(current: number, previous: number, alpha: number = 0.7): number {
    return alpha * current + (1 - alpha) * previous;
}

/**
 * Apply EMA smoothing to a 2D position
 */
export function emaPosition(
    current: { x: number; y: number },
    previous: { x: number; y: number },
    alpha: number = 0.7
): { x: number; y: number } {
    return {
        x: ema(current.x, previous.x, alpha),
        y: ema(current.y, previous.y, alpha)
    };
}

/**
 * Default alpha values for different use cases
 */
export const EMA_PRESETS = {
    SNAPPY: 0.7,      // Fast response, some smoothing
    BALANCED: 0.5,    // Equal balance
    SMOOTH: 0.3,      // Heavy smoothing, slower response
    ULTRA_SMOOTH: 0.15 // Very smooth, noticeable lag
} as const;
