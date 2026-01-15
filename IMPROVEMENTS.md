# Improvement Ideas

A collection of planned improvements for HoloTrade. Each item includes the problem, proposed solution, and implementation steps. We'll implement these one by one.

---

## Status Legend

- 🔴 **Not Started**
- 🟡 **In Progress**
- 🟢 **Completed**

---

## 1. Gesture Engine (Centralized Gesture Management)

**Status:** 🔴 Not Started

### Problem

Gestures currently trigger multiple things simultaneously, causing conflicts:
- `FaceTracker.svelte` detects gestures and writes to `gestureStore`
- `PriceTargetOverlay.svelte` reads from store and acts
- `+page.svelte` also reads for zoom
- No arbiter decides who "owns" a gesture
- Two-hand zoom and trading gestures can conflict

### Current Flow (Broken)

```
MediaPipe → FaceTracker → gestureStore → Multiple Consumers (race!)
                                      ↓
                            PriceTargetOverlay ← conflict
                            +page.svelte (zoom) ← conflict
```

### Proposed Solution

Create a centralized `GestureEngine` service that:

1. **Single Source of Truth** - All gesture detection flows through it
2. **Gesture Lock System** - Only one consumer can "claim" a gesture
3. **Priority Queue** - Higher priority actions block lower ones
4. **Context Modes** - IDLE, ZOOMING, TRADING route gestures differently
5. **Unified Debouncing** - All timing/confirmation logic in one place

### Proposed Flow

```
MediaPipe → GestureEngine → Context Router → Single Consumer
                ↓
        ┌─────────────────────────┐
        │ Priority:               │
        │ 1. Two-hand zoom        │
        │ 2. Trading overlay      │
        │ 3. Navigation/other     │
        └─────────────────────────┘
```

### API Design

```typescript
// $lib/services/gestureEngine.ts

interface GestureEngine {
  // Context management
  currentContext: 'IDLE' | 'ZOOMING' | 'TRADING';
  
  // Lock system
  acquire(context: string): boolean;  // Try to get exclusive access
  release(context: string): void;     // Release lock
  isLocked(): boolean;
  
  // Gesture events
  onGesture(type: GestureType, callback: Function): void;
  
  // Raw data input (from FaceTracker)
  processHandData(landmarks: HandLandmarks): void;
}

// Usage in PriceTargetOverlay:
if (gestureEngine.acquire('TRADING')) {
  // We own the gesture context now
  startPriceTargeting();
}

// Usage during two-hand zoom:
if (numHands === 2) {
  gestureEngine.acquire('ZOOMING');  // Blocks trading
}
```

### Implementation Steps

- [ ] Create `$lib/services/gestureEngine.ts` with core logic
- [ ] Add context state machine (IDLE → ZOOMING, IDLE → TRADING)
- [ ] Add lock/acquire/release system
- [ ] Move gesture classification from FaceTracker to engine
- [ ] Update FaceTracker to feed raw data to engine
- [ ] Update PriceTargetOverlay to use engine's lock system
- [ ] Update +page.svelte zoom to use engine's lock system
- [ ] Add priority resolution for conflicting gestures
- [ ] Test: zoom should block trading gestures
- [ ] Test: trading lock should prevent re-triggers

### Files to Modify

| File | Change |
|------|--------|
| `gestureEngine.ts` | NEW - Core engine |
| `FaceTracker.svelte` | Feed raw data to engine |
| `PriceTargetOverlay.svelte` | Use engine's lock |
| `+page.svelte` | Use engine for zoom |
| `stores/gesture.ts` | May simplify or remove |

---

## 2. Dynamic Zone Confirmation (Single Hand)

**Status:** 🔴 Not Started

### Problem

Current thumbs-up confirmation is too easy to accidentally trigger. Users need:
- Clear visual feedback
- Progress indicator while holding
- Deliberate action that can't happen by accident
- **Single-hand operation** (no aiming to fixed position)

### Proposed Solution

**Dynamic Zone** - The confirmation zone spawns WHERE your hand already is:

1. User shows thumbs up anywhere on screen
2. Glowing ring appears AROUND current hand position
3. Ring fills as thumbs up is held steady
4. If hand moves outside ring → progress resets
5. Complete 1.5s hold → ORDER PLACED

### Visual Flow

```
Step 1: Thumbs up detected anywhere
┌────────────────────────────────────┐
│        BUY 10 @ ₹27.50             │
│                       👍           │
└────────────────────────────────────┘

Step 2: Zone spawns at hand position  
┌────────────────────────────────────┐
│        BUY 10 @ ₹27.50             │
│                  ╭────────╮        │
│                  │  👍   │ Zone    │
│                  ╰────────╯ appears│
└────────────────────────────────────┘

Step 3: Hold steady - progress ring fills
┌────────────────────────────────────┐
│        BUY 10 @ ₹27.50             │
│                  ╭────────╮        │
│                  │  👍   │ ▓▓▓░░  │
│                  ╰────────╯ 75%    │
│         "Hold steady..."           │
└────────────────────────────────────┘

Step 4: Complete → ✓ ORDER PLACED
```

### Core Logic

```typescript
const ZONE_RADIUS = 0.12;          // 12% of viewport
const HOLD_DURATION_MS = 1500;     // 1.5 seconds

let zoneActive = false;
let zoneCenter = { x: 0, y: 0 };
let progress = 0;

// Spawn zone at hand position when thumbs up detected
$: if (isThumbsUp && !zoneActive) {
  zoneCenter = { ...$gestureState.handPosition };
  zoneActive = true;
}

// Track progress while in zone
$: if (zoneActive && isThumbsUp) {
  const dist = distance(handPosition, zoneCenter);
  
  if (dist < ZONE_RADIUS) {
    progress += deltaTime / HOLD_DURATION_MS;
    if (progress >= 1) confirmOrder();
  } else {
    // Hand left zone - reset
    zoneActive = false;
    progress = 0;
  }
}
```

### Implementation Steps

- [ ] Create `DynamicConfirmZone.svelte` component
- [ ] Spawn zone at hand position when thumbs up detected
- [ ] Track distance from zone center
- [ ] SVG progress ring with stroke-dasharray animation
- [ ] Reset progress when hand leaves zone
- [ ] Completion animation (checkmark + scale pop)
- [ ] Integrate with PriceTargetOverlay CONFIRMING state
- [ ] Haptic feedback on completion

### Benefits

1. **No Aiming Required** - Zone comes to your hand
2. **Single Hand Only** - No complex gestures
3. **Clear Feedback** - Progress ring shows hold time
4. **Self-Correcting** - Moving hand resets progress
5. **Familiar UX** - Similar to biometric scan patterns

---

## 3. Gesture Calibration Mode

**Status:** 🔴 Not Started

### Problem

Different users have different hand sizes, pinch distances vary.

### Proposed Solution

- Add "Calibrate Gestures" option in settings
- User performs each gesture, system records their baseline
- Thresholds adjust per-user

### Implementation Steps

- [ ] Create CalibrationModal component
- [ ] Record user's natural pinch distance
- [ ] Store calibration in localStorage
- [ ] Apply calibration to gesture thresholds

---

## 4. Voice Confirmation (Optional)

**Status:** 🔴 Not Started

### Problem

Thumbs-up might false-trigger; need stronger confirmation.

### Proposed Solution

- After thumbs-up, prompt "Say 'confirm' to place order"
- Use Web Speech API for voice recognition
- Fallback to current gesture-only flow

### Implementation Steps

- [ ] Research Web Speech API compatibility
- [ ] Create VoiceConfirmation component
- [ ] Integrate as optional confirmation step
- [ ] Add toggle in settings

---

## 5. Gesture History/Debug Panel

**Status:** 🔴 Not Started

### Problem

Hard to debug why gestures misfired.

### Proposed Solution

- Add collapsible debug panel showing:
  - Last 10 detected gestures
  - Confidence scores
  - Why each was accepted/rejected
  - Current lock state

### Implementation Steps

- [ ] Create GestureDebugPanel component
- [ ] Log gesture events with timestamps
- [ ] Show in development mode only
- [ ] Include lock/context state

---

## 6. Reduce FaceTracker Complexity

**Status:** 🔴 Not Started

### Problem

`FaceTracker.svelte` is 500+ lines mixing detection, classification, and state updates.

### Proposed Solution

After implementing Gesture Engine:
- FaceTracker only handles MediaPipe setup and teardown
- All classification moves to GestureEngine
- Creates cleaner separation of concerns

### Implementation Steps

- [ ] Move gesture classification to engine
- [ ] Move EMA smoothing to engine
- [ ] FaceTracker becomes thin wrapper
- [ ] Target: FaceTracker < 200 lines

---

## Implementation Order

| Priority | Improvement | Reason |
|----------|-------------|--------|
| 1 | Gesture Engine | Fixes core conflict issues |
| 2 | Gesture Confirmation Feedback | Better UX |
| 3 | Reduce FaceTracker | Cleanup after engine |
| 4 | Gesture Debug Panel | Helps development |
| 5 | Gesture Calibration | Nice to have |
| 6 | Voice Confirmation | Optional advanced |

---

## Notes

- Start with Gesture Engine as it's foundational
- Each improvement should be testable independently
- Keep backwards compatibility during refactoring
- Write tests for critical gesture paths
