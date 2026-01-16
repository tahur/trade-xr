/**
 * AnimationController - RAF-based animation for 60fps smooth updates
 * 
 * Replaces Svelte springs for camera control to achieve <50ms response
 */

// Linear interpolation - core of smooth animation
function lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
}

export interface CameraState {
    x: number;
    y: number;
    z: number;
}

interface AnimationConfig {
    lerpFactor: number;  // 0.1-0.3 recommended (higher = faster)
    basePosition: CameraState;
}

class AnimationController {
    private running = false;
    private rafId: number | null = null;

    // Current interpolated values
    private current: CameraState;

    // Target values (what we're animating toward)
    private target: CameraState;

    // Configuration
    private config: AnimationConfig;

    // Callback for updates - connected to camera
    public onUpdate: ((state: CameraState) => void) | null = null;

    constructor(config: AnimationConfig) {
        this.config = config;
        this.current = { ...config.basePosition };
        this.target = { ...config.basePosition };
    }

    /**
     * Start the animation loop
     */
    start(): void {
        if (this.running) return;
        this.running = true;
        this.loop();
        console.log('[AnimationController] Started');
    }

    /**
     * Stop the animation loop
     */
    stop(): void {
        this.running = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        console.log('[AnimationController] Stopped');
    }

    /**
     * Main animation loop - runs at 60fps
     */
    private loop = (): void => {
        if (!this.running) return;

        // Lerp each axis toward target
        this.current.x = lerp(this.current.x, this.target.x, this.config.lerpFactor);
        this.current.y = lerp(this.current.y, this.target.y, this.config.lerpFactor);
        this.current.z = lerp(this.current.z, this.target.z, this.config.lerpFactor);

        // Dispatch update to camera
        if (this.onUpdate) {
            this.onUpdate({ ...this.current });
        }

        // Schedule next frame
        this.rafId = requestAnimationFrame(this.loop);
    };

    /**
     * Set zoom level (affects Z position)
     * @param zoomMultiplier - 1.0 = normal, <1 = zoomed in, >1 = zoomed out
     */
    setZoom(zoomMultiplier: number): void {
        const clampedZoom = Math.max(0.3, Math.min(3.0, zoomMultiplier));
        this.target.z = this.config.basePosition.z * clampedZoom;
    }

    /**
     * Set parallax offset (affects X and Y)
     */
    setParallax(xOffset: number, yOffset: number): void {
        this.target.x = this.config.basePosition.x + xOffset;
        this.target.y = this.config.basePosition.y + yOffset;
    }

    /**
     * Set full target position
     */
    setTarget(x: number, y: number, z: number): void {
        this.target.x = x;
        this.target.y = y;
        this.target.z = z;
    }

    /**
     * Instant jump (no animation) - for reset
     */
    jumpTo(state: Partial<CameraState>): void {
        if (state.x !== undefined) {
            this.current.x = state.x;
            this.target.x = state.x;
        }
        if (state.y !== undefined) {
            this.current.y = state.y;
            this.target.y = state.y;
        }
        if (state.z !== undefined) {
            this.current.z = state.z;
            this.target.z = state.z;
        }
    }

    /**
     * Reset to base position (instant)
     */
    reset(): void {
        this.jumpTo(this.config.basePosition);
    }

    /**
     * Get current interpolated state
     */
    getCurrent(): CameraState {
        return { ...this.current };
    }

    /**
     * Get target state
     */
    getTarget(): CameraState {
        return { ...this.target };
    }

    /**
     * Update lerp factor dynamically
     */
    setLerpFactor(factor: number): void {
        this.config.lerpFactor = Math.max(0.05, Math.min(0.5, factor));
    }
}

// === SINGLETON INSTANCE ===
// Base camera position from +page.svelte
const BASE_CAM_X = 25;
const BASE_CAM_Y = 10;
const BASE_CAM_Z = 45;

export const animationController = new AnimationController({
    lerpFactor: 0.25,  // Fast but smooth (0.25 = ~4 frames to 90% target)
    basePosition: { x: BASE_CAM_X, y: BASE_CAM_Y, z: BASE_CAM_Z }
});

// Auto-start when imported (client-side only)
if (typeof window !== 'undefined') {
    animationController.start();
}

export type { AnimationConfig };
export { lerp };
