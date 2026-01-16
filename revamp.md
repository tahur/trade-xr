# Gesture System Revamp - Detailed Implementation Plan

> **Target:** 50ms response time for zoom and price picker
> **Status:** Planning
> **Estimated Effort:** 4-5 hours

---

## Table of Contents

1. [Problem Analysis](#1-problem-analysis)
2. [Architecture Overview](#2-architecture-overview)
3. [Phase 1: Animation Controller](#3-phase-1-animation-controller)
4. [Phase 2: Gesture Bus](#4-phase-2-gesture-bus)
5. [Phase 3: FaceTracker Integration](#5-phase-3-facetracker-integration)
6. [Phase 4: Direct Camera Control](#6-phase-4-direct-camera-control)
7. [Phase 5: Trading Controller](#7-phase-5-trading-controller)
8. [Migration Strategy](#8-migration-strategy)
9. [Testing Checklist](#9-testing-checklist)

---

## 1. Problem Analysis

### Current Data Flow (Slow)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CURRENT PIPELINE (~200-500ms)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  MediaPipe    gestureStore      smoothZoom       camPos       Camera    │
│     ↓              ↓               ↓               ↓            ↓       │
│  [60fps] → [writable] → [spring 0.5] → [spring 0.35] → [T.Camera]       │
│                                                                          │
│  Latencies:   ~16ms      ~100-200ms      ~100-200ms        ~16ms        │
│               ─────────────────────────────────────────                  │
│                        Total: ~200-400ms                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Root Causes

| Issue | Location | Impact |
|-------|----------|--------|
| Double spring | `tracking.ts` + `+page.svelte` | 2x animation delay |
| Store subscriptions | Svelte reactivity | 16-32ms per update |
| No priority at source | `FaceTracker.svelte` | Zoom/trading conflicts |
| Cooldown race conditions | Multiple reactive blocks | Inconsistent state |

---

## 2. Architecture Overview

### Target Data Flow (Fast)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEW PIPELINE (~16-32ms)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  MediaPipe → AnimationController.setTarget() → RAF lerp → camera.z      │
│     ↓                                                                    │
│  [60fps]  →  gestureBus.emit()  →  subscribers handle instantly         │
│                     ↓                                                    │
│              gestureEngine.acquire() (priority check)                    │
│                                                                          │
│  Latencies:   ~16ms          ~1ms           ~16ms                       │
│               ────────────────────────────                               │
│                   Total: ~33ms                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `AnimationController` | RAF loop, lerp interpolation, camera updates |
| `gestureBus` | Event dispatch, decoupled communication |
| `gestureEngine` | Priority locking (already exists) |
| `TradingController` | Price picker state machine |
| `FaceTracker` | Detection only, emits events |

---

## 3. Phase 1: Animation Controller

### File: `frontend/src/lib/controllers/AnimationController.ts`

```typescript
/**
 * AnimationController - RAF-based animation for 60fps smooth updates
 * 
 * Replaces Svelte springs for camera control
 */

// Linear interpolation
function lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
}

interface CameraState {
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
    
    // Callback for updates
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
        
        // Dispatch update
        if (this.onUpdate) {
            this.onUpdate({ ...this.current });
        }
        
        // Schedule next frame
        this.rafId = requestAnimationFrame(this.loop);
    };
    
    /**
     * Set zoom level (affects Z position)
     */
    setZoom(zoomMultiplier: number): void {
        this.target.z = this.config.basePosition.z * zoomMultiplier;
    }
    
    /**
     * Set parallax offset (affects X and Y)
     */
    setParallax(xOffset: number, yOffset: number): void {
        this.target.x = this.config.basePosition.x + xOffset;
        this.target.y = this.config.basePosition.y + yOffset;
    }
    
    /**
     * Instant jump (no animation)
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
     * Get current interpolated state
     */
    getCurrent(): CameraState {
        return { ...this.current };
    }
}

// === SINGLETON INSTANCE ===
export const animationController = new AnimationController({
    lerpFactor: 0.25,  // Fast but smooth
    basePosition: { x: 25, y: 10, z: 45 }  // Match current baseCam values
});

// Auto-start when imported
if (typeof window !== 'undefined') {
    animationController.start();
}

export type { CameraState, AnimationConfig };
```

### Integration Points

1. **Import in `+page.svelte`**
2. **Call `setZoom()` from zoom gesture handler**
3. **Connect `onUpdate` to camera ref**

---

## 4. Phase 2: Gesture Bus

### File: `frontend/src/lib/services/gestureBus.ts`

```typescript
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
    delta: number;         // Change from initial
    zoomFactor: number;    // Current zoom multiplier
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
    private lastEvent: GestureEvent | null = null;
    
    /**
     * Subscribe to a gesture event type
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
     * Subscribe to multiple event types
     */
    onMany(types: GestureEventType[], handler: GestureHandler): () => void {
        const unsubscribers = types.map(type => this.on(type, handler));
        return () => unsubscribers.forEach(unsub => unsub());
    }
    
    /**
     * Emit a gesture event
     */
    emit(type: GestureEventType, payload?: any): void {
        const event: GestureEvent = {
            type,
            timestamp: performance.now(),
            payload
        };
        
        this.lastEvent = event;
        
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
    }
    
    /**
     * Get last emitted event
     */
    getLastEvent(): GestureEvent | null {
        return this.lastEvent;
    }
    
    /**
     * Clear all listeners (for cleanup)
     */
    clear(): void {
        this.listeners.clear();
    }
}

// === SINGLETON INSTANCE ===
export const gestureBus = new GestureBus();
```

### Usage Pattern

```typescript
// In FaceTracker.svelte
gestureBus.emit('ZOOM_UPDATE', { 
    zoomFactor: 1.5, 
    delta: 0.02 
});

// In +page.svelte
gestureBus.on('ZOOM_UPDATE', (event) => {
    animationController.setZoom(event.payload.zoomFactor);
});
```

---

## 5. Phase 3: FaceTracker Integration

### Modifications to `FaceTracker.svelte`

#### 5.1 Add Imports

```typescript
// Add at top of <script>
import { gestureBus } from '$lib/services/gestureBus';
import { 
    gestureEngine, 
    acquireZoom, 
    releaseZoom 
} from '$lib/services/gestureEngine';
import { animationController } from '$lib/controllers/AnimationController';
```

#### 5.2 Modify Two-Hand Zoom Block

**Current Code (lines ~170-195):**
```typescript
if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
    // ... calculate distance ...
    twoHandPinch.set({ ... });
    zoomLevel.set(newZoom);
}
```

**New Code:**
```typescript
if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
    const numHands = results.multiHandLandmarks.length;
    
    // PRIORITY: Acquire zoom context FIRST
    if (!gestureEngine.hasLock('zoom')) {
        const acquired = acquireZoom();
        if (acquired) {
            gestureBus.emit('ZOOM_START', { numHands });
        }
    }
    
    // Only process zoom if we own the context
    if (gestureEngine.hasLock('zoom')) {
        // Calculate hand distance
        const leftHand = results.multiHandLandmarks[0];
        const rightHand = results.multiHandLandmarks[1];
        
        const leftCenter = leftHand[9];  // Middle finger base
        const rightCenter = rightHand[9];
        
        const distance = Math.sqrt(
            Math.pow(leftCenter.x - rightCenter.x, 2) +
            Math.pow(leftCenter.y - rightCenter.y, 2)
        );
        
        // Initialize or calculate zoom
        if (!zoomInitialDistance) {
            zoomInitialDistance = distance;
        }
        
        const delta = distance - zoomInitialDistance;
        const zoomFactor = 1.0 + delta * 2.5;  // Amplify
        const clampedZoom = Math.max(0.3, Math.min(3.0, zoomFactor));
        
        // Emit event (instant)
        gestureBus.emit('ZOOM_UPDATE', {
            handDistance: distance,
            initialDistance: zoomInitialDistance,
            delta,
            zoomFactor: clampedZoom
        });
        
        // Direct animation update (bypasses stores)
        animationController.setZoom(clampedZoom);
        
        // Still update store for UI display
        twoHandPinch.set({
            isActive: true,
            handDistance: distance,
            initialDistance: zoomInitialDistance,
            velocity: 0
        });
    }
} else if (gestureEngine.hasLock('zoom')) {
    // Zoom ended
    releaseZoom();
    gestureBus.emit('ZOOM_END');
    zoomInitialDistance = null;
    
    twoHandPinch.set({
        isActive: false,
        handDistance: 0,
        initialDistance: 0,
        velocity: 0
    });
}
```

#### 5.3 Modify Single-Hand Gesture Block

**Add at start of single-hand detection:**
```typescript
// If zoom is active, skip single-hand processing
if (gestureEngine.getContext() === 'ZOOMING') {
    return; // Don't process single-hand gestures during zoom
}
```

#### 5.4 Emit Gesture Events

**After gesture classification:**
```typescript
// Emit gesture change event
if (newGesture !== previousGesture) {
    gestureBus.emit('GESTURE_CHANGED', {
        previous: previousGesture,
        current: newGesture,
        handSide: detectedHandSide
    });
    
    // Specific events for key gestures
    if (newGesture === 'Closed_Fist') {
        gestureBus.emit('FIST_DETECTED');
    } else if (newGesture === 'Pointing_Up') {
        gestureBus.emit('POINT_UP_DETECTED');
    } else if (newGesture === 'Thumbs_Up') {
        gestureBus.emit('THUMBS_UP_DETECTED');
    }
}
```

---

## 6. Phase 4: Direct Camera Control

### Modifications to `+page.svelte`

#### 6.1 Remove Old Springs

**Remove:**
```typescript
const camPos = spring({ ... });
const smoothZoom = ...; // Remove import
```

#### 6.2 Add Animation Controller

```typescript
import { onMount, onDestroy } from 'svelte';
import { animationController, type CameraState } from '$lib/controllers/AnimationController';
import { gestureBus } from '$lib/services/gestureBus';

// Camera position (now directly controlled)
let cameraPosition = { x: 25, y: 10, z: 45 };

onMount(() => {
    // Connect animation controller to camera
    animationController.onUpdate = (state: CameraState) => {
        cameraPosition = state;
    };
    
    // Listen to zoom events (backup/UI sync)
    const unsubZoom = gestureBus.on('ZOOM_UPDATE', (event) => {
        // Animation controller already handles this in FaceTracker
        // This is for any additional UI updates
    });
    
    return () => {
        unsubZoom();
    };
});
```

#### 6.3 Update Scene3D Binding

```svelte
<Scene3D
    candles={$candleData}
    cameraPosition={cameraPosition}
    cameraRotation={$camRot}
/>
```

---

## 7. Phase 5: Trading Controller

### File: `frontend/src/lib/controllers/TradingController.ts`

```typescript
/**
 * TradingController - Centralized state machine for price picker
 * 
 * States: IDLE → TARGETING → LOCKED → CONFIRMING → ORDER_PLACED
 */

import { writable, get } from 'svelte/store';
import { gestureBus } from '$lib/services/gestureBus';
import { 
    gestureEngine, 
    acquireTrading, 
    acquireConfirming,
    releaseTrading 
} from '$lib/services/gestureEngine';

export type TradingState = 
    | 'IDLE' 
    | 'TARGETING' 
    | 'LOCKED' 
    | 'CONFIRMING' 
    | 'ORDER_PLACED';

interface TradingData {
    state: TradingState;
    targetPrice: number | null;
    lockedPrice: number | null;
    handY: number;
}

class TradingController {
    private store = writable<TradingData>({
        state: 'IDLE',
        targetPrice: null,
        lockedPrice: null,
        handY: 0.5
    });
    
    // Expose store for Svelte reactivity
    public subscribe = this.store.subscribe;
    
    private unsubscribers: (() => void)[] = [];
    
    constructor() {
        this.setupListeners();
    }
    
    private setupListeners(): void {
        // Listen to zoom - cancels trading
        this.unsubscribers.push(
            gestureBus.on('ZOOM_START', () => {
                this.cancel();
            })
        );
        
        // Listen to fist - cancels trading
        this.unsubscribers.push(
            gestureBus.on('FIST_DETECTED', () => {
                this.cancel();
            })
        );
        
        // Listen to hand lost
        this.unsubscribers.push(
            gestureBus.on('HAND_LOST', () => {
                const current = get(this.store);
                if (current.state === 'TARGETING') {
                    this.cancel();
                }
            })
        );
    }
    
    /**
     * Start targeting mode (called on stable hand detection)
     */
    startTargeting(): boolean {
        // Check if zoom is active
        if (gestureEngine.getContext() === 'ZOOMING') {
            return false;
        }
        
        // Try to acquire trading context
        if (!acquireTrading()) {
            return false;
        }
        
        this.store.update(s => ({
            ...s,
            state: 'TARGETING',
            targetPrice: null
        }));
        
        return true;
    }
    
    /**
     * Lock price (called on pinch)
     */
    lockPrice(price: number): void {
        const current = get(this.store);
        if (current.state !== 'TARGETING') return;
        
        this.store.update(s => ({
            ...s,
            state: 'LOCKED',
            lockedPrice: price
        }));
    }
    
    /**
     * Enter confirmation mode (called on point-up)
     */
    startConfirming(): boolean {
        const current = get(this.store);
        if (current.state !== 'LOCKED') return false;
        
        if (!acquireConfirming()) return false;
        
        this.store.update(s => ({
            ...s,
            state: 'CONFIRMING'
        }));
        
        return true;
    }
    
    /**
     * Complete order (called on thumbs-up hold)
     */
    completeOrder(): void {
        const current = get(this.store);
        if (current.state !== 'CONFIRMING') return;
        
        this.store.update(s => ({
            ...s,
            state: 'ORDER_PLACED'
        }));
        
        // Reset after delay
        setTimeout(() => this.reset(), 2500);
    }
    
    /**
     * Cancel trading flow
     */
    cancel(): void {
        releaseTrading();
        this.reset();
    }
    
    /**
     * Reset to idle
     */
    reset(): void {
        this.store.set({
            state: 'IDLE',
            targetPrice: null,
            lockedPrice: null,
            handY: 0.5
        });
    }
    
    /**
     * Update hand Y position for price calculation
     */
    updateHandY(y: number): void {
        this.store.update(s => ({
            ...s,
            handY: y
        }));
    }
    
    /**
     * Cleanup
     */
    destroy(): void {
        this.unsubscribers.forEach(unsub => unsub());
    }
}

// === SINGLETON ===
export const tradingController = new TradingController();
```

### PriceTargetOverlay Integration

**Replace complex reactive logic with:**

```svelte
<script>
    import { tradingController } from '$lib/controllers/TradingController';
    
    $: state = $tradingController.state;
    $: showPicker = state === 'TARGETING' || state === 'LOCKED';
    $: showConfirmZone = state === 'CONFIRMING';
</script>

{#if showPicker}
    <!-- Price picker UI -->
{/if}

{#if showConfirmZone}
    <!-- Confirm zone UI -->
{/if}
```

---

## 8. Migration Strategy

### Step-by-Step Migration

| Step | Action | Rollback | Test |
|------|--------|----------|------|
| 1 | Create `AnimationController.ts` | Delete file | Import works |
| 2 | Create `gestureBus.ts` | Delete file | Events emit/subscribe |
| 3 | Wire animation in `+page.svelte` | Revert file | Camera moves |
| 4 | Update `FaceTracker.svelte` | Revert file | Zoom works |
| 5 | Create `TradingController.ts` | Delete file | State works |
| 6 | Update `PriceTargetOverlay.svelte` | Revert file | Picker works |
| 7 | Remove old springs | Revert | No regression |

### Commit Points

1. After Phase 1: "Add AnimationController for RAF-based camera"
2. After Phase 2: "Add GestureBus for event dispatch"
3. After Phase 3+4: "Integrate RAF zoom in FaceTracker"
4. After Phase 5: "Add TradingController for price picker"
5. Final: "Remove legacy springs, cleanup"

---

## 9. Testing Checklist

### Performance Tests

- [ ] Zoom responds in <50ms (use Chrome DevTools Timeline)
- [ ] Price picker responds in <50ms
- [ ] Maintains 60fps during gestures
- [ ] No memory leaks (RAF cleanup)

### Functional Tests

- [ ] Two-hand zoom works
- [ ] Zoom blocks price picker
- [ ] Price picker works with single hand
- [ ] Fist cancels price picker
- [ ] Fist cancels during zoom
- [ ] Point-up enters confirmation
- [ ] Thumbs-up completes order
- [ ] Order cooldown prevents re-trigger

### Regression Tests

- [ ] Keyboard zoom still works (+ / -)
- [ ] Scroll wheel zoom still works
- [ ] Head parallax still works
- [ ] ETF switching still works
- [ ] Login flow still works

---

## Files Summary

| File | Action | Lines | Complexity |
|------|--------|-------|------------|
| `AnimationController.ts` | NEW | ~120 | Medium |
| `gestureBus.ts` | NEW | ~80 | Low |
| `TradingController.ts` | NEW | ~150 | Medium |
| `FaceTracker.svelte` | MODIFY | ~50 changed | High |
| `+page.svelte` | MODIFY | ~30 changed | Medium |
| `PriceTargetOverlay.svelte` | MODIFY | ~100 changed | High |
| `tracking.ts` | MODIFY | ~10 removed | Low |

---

## Next Steps

1. Review and approve this plan
2. Commit current state as backup: `"pre-revamp backup"`
3. Implement Phase 1 (AnimationController)
4. Test zoom in isolation
5. Proceed to Phase 2-5
6. Final integration testing
