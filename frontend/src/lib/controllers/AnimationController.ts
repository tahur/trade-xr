// Physics-based Animation Controller
// Uses Damped Harmonic Oscillator for organic, butter-smooth movement

export interface CameraState {
    x: number;
    y: number;
    z: number;
}

export interface PhysicsConfig {
    stiffness: number; // Force pulling towards target (Target: 150-250)
    damping: number;   // Friction opposing velocity (Target: 15-25)
    mass: number;      // "Heaviness" of the camera (Target: 1-2)
    precision: number; // Minimum velocity to keep simulating
    basePosition: CameraState;
}

class AnimationController {
    private running = false;
    private rafId: number | null = null;

    // Position state
    private current: CameraState;
    private target: CameraState;

    // Physics state (Velocity)
    private velocity: CameraState = { x: 0, y: 0, z: 0 };

    // Configuration
    private config: PhysicsConfig;

    // Time delta tracking
    private lastTime: number = 0;

    // Callback for updates
    public onUpdate: ((state: CameraState) => void) | null = null;

    constructor(config: Partial<PhysicsConfig> & { basePosition: CameraState }) {
        this.config = {
            stiffness: 220, // Snappy but organic
            damping: 20,    // No over-oscillation (critical damping territory)
            mass: 1.2,      // Slight weight for "momentum" feel
            precision: 0.001,
            ...config
        };
        this.current = { ...this.config.basePosition };
        this.target = { ...this.config.basePosition };
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.loop();
        console.log('[AnimationController] Physics Engine Started');
    }

    stop(): void {
        this.running = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private loop = (): void => {
        if (!this.running) return;

        const now = performance.now();
        // Cap delta time to prevent physics explosions on lag spikes (max 64ms)
        const dt = Math.min((now - this.lastTime) / 1000, 0.064);
        this.lastTime = now;

        // --- PHYSICS STEP (Hooke's Law) ---
        // Force = -k * displacement - damping * velocity
        // Acceleration = Force / Mass

        let needsUpdate = false;

        (['x', 'y', 'z'] as const).forEach(axis => {
            const displacement = this.current[axis] - this.target[axis];

            // Optimization: If very close and stopped, snap to target
            if (Math.abs(displacement) < this.config.precision && Math.abs(this.velocity[axis]) < this.config.precision) {
                this.current[axis] = this.target[axis];
                this.velocity[axis] = 0;
                return;
            }

            needsUpdate = true;

            const springForce = -this.config.stiffness * displacement;
            const dampingForce = -this.config.damping * this.velocity[axis];
            const acceleration = (springForce + dampingForce) / this.config.mass;

            this.velocity[axis] += acceleration * dt;
            this.current[axis] += this.velocity[axis] * dt;
        });

        if (needsUpdate && this.onUpdate) {
            this.onUpdate({ ...this.current });
        }

        this.rafId = requestAnimationFrame(this.loop);
    };

    /**
     * Set zoom level (affects Z position)
     */
    setZoom(zoomMultiplier: number): void {
        // Clamp heavily to prevent camera clipping
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
        // Reset velocity on jump to prevent slingshot
        this.velocity = { x: 0, y: 0, z: 0 };
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
     * Update stiffness dynamically
     */
    setStiffness(stiffness: number): void {
        this.config.stiffness = stiffness;
    }

    /**
     * Preserve zoom momentum for smooth coast when zoom gesture ends
     * Resets target to base position but allows smooth coast back
     */
    preserveZoomMomentum(): void {
        // Reset target to base position - we want to coast BACK to normal
        this.target.z = this.config.basePosition.z;
        this.target.x = this.config.basePosition.x;
        this.target.y = this.config.basePosition.y;

        // Limit velocity to prevent runaway zoom when hands suddenly removed
        // Only preserve small velocity for natural deceleration feeling
        const maxVelocity = 5; // Cap velocity to prevent sudden jumps
        this.velocity.z = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocity.z * 0.2));
        this.velocity.x = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocity.x * 0.1));
        this.velocity.y = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocity.y * 0.1));
    }
}

// === SINGLETON INSTANCE ===
const BASE_CAM_X = 25;
const BASE_CAM_Y = 10;
const BASE_CAM_Z = 45;

export const animationController = new AnimationController({
    basePosition: { x: BASE_CAM_X, y: BASE_CAM_Y, z: BASE_CAM_Z }
});

// Auto-start when imported
if (typeof window !== 'undefined') {
    animationController.start();
}
