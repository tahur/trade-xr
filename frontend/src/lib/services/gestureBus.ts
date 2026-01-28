/**
 * GestureBus - Decoupled event dispatch for gestures
 * 
 * Enables instant communication without store subscription delays
 */

// === EVENT TYPES ===
export type GestureEventType =
    | 'ZOOM_START'
    | 'ZOOM_UPDATE'
    | 'ZOOM_END'
    | 'PINCH_START'
    | 'PINCH_HOLD'
    | 'PINCH_END'
    | 'HAND_DETECTED'
    | 'HAND_LOST'
    | 'FIST_DETECTED'
    | 'POINT_UP_DETECTED'
    | 'THUMBS_UP_DETECTED'
    | 'VICTORY_DETECTED'
    | 'GESTURE_CHANGED';

export interface GestureEvent {
    type: GestureEventType;
    timestamp: number;
    payload?: any;
}

// Zoom-specific payload
export interface ZoomPayload {
    handDistance: number;
    initialDistance: number;
    delta: number;
    zoomFactor: number;
}

// Hand payload
export interface HandPayload {
    numHands: number;
    position: { x: number; y: number };
    gesture: string;
    handSide: 'Left' | 'Right' | 'Unknown';
}

type GestureHandler = (event: GestureEvent) => void;

class GestureBus {
    private listeners = new Map<GestureEventType, Set<GestureHandler>>();
    private allListeners = new Set<GestureHandler>();
    private lastEvent: GestureEvent | null = null;

    /**
     * Subscribe to a specific gesture event type
     */
    on(type: GestureEventType, handler: GestureHandler): () => void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.listeners.get(type)?.delete(handler);
        };
    }

    /**
     * Subscribe to all events
     */
    onAll(handler: GestureHandler): () => void {
        this.allListeners.add(handler);
        return () => {
            this.allListeners.delete(handler);
        };
    }

    /**
     * Subscribe to multiple event types
     */
    onMany(types: GestureEventType[], handler: GestureHandler): () => void {
        const unsubscribers = types.map(type => this.on(type, handler));
        return () => unsubscribers.forEach(unsub => unsub());
    }

    /**
     * Emit a gesture event - instant dispatch to all subscribers
     */
    emit(type: GestureEventType, payload?: any): void {
        const event: GestureEvent = {
            type,
            timestamp: performance.now(),
            payload
        };

        this.lastEvent = event;

        // Notify specific listeners
        const handlers = this.listeners.get(type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(event);
                } catch (e) {
                    console.error(`[GestureBus] Handler error for ${type}:`, e);
                }
            });
        }

        // Notify all-event listeners
        this.allListeners.forEach(handler => {
            try {
                handler(event);
            } catch (e) {
                console.error(`[GestureBus] All-handler error:`, e);
            }
        });
    }

    /**
     * Get last emitted event
     */
    getLastEvent(): GestureEvent | null {
        return this.lastEvent;
    }

    /**
     * Check if event type was recently emitted
     */
    wasRecentlyEmitted(type: GestureEventType, withinMs: number = 100): boolean {
        if (!this.lastEvent) return false;
        if (this.lastEvent.type !== type) return false;
        return performance.now() - this.lastEvent.timestamp < withinMs;
    }

    /**
     * Clear all listeners (for cleanup)
     */
    clear(): void {
        this.listeners.clear();
        this.allListeners.clear();
        this.lastEvent = null;
    }
}

// === SINGLETON INSTANCE ===
export const gestureBus = new GestureBus();
