# Improvement Ideas


---

## 7. Performance & Polish (Optimizations)

**Status:** 🟢 **Completed**

### Improvements Implemented

1.  **Physics-Based Animation Engine** (`AnimationController.ts`)
    *   **Problem:** Svelte `spring` and `lerp` caused frame stepping ("buttering") and lag.
    *   **Solution:** Custom Physics loop using Damped Harmonic Oscillator (Hooke's Law).
    *   **Result:** Camera carries velocity, settles organically, zero stepping.
    *   **Tuning:** Snappy response (Stiffness 220, Damping 20).

2.  **Apple-Style Dynamic Island**
    *   **Problem:** Previous animations felt "sluggish" or "loose".
    *   **Solution:** Tuned spring physics to match iOS specs (`stiffness: 0.35`, `damping: 0.82`).
    *   **Result:** Fluid, confident expansion without "jelly" wobble.

3.  **Gesture Stability ("Triple Lock")**
    *   **Problem:** Accidental price locking while moving hands.
    *   **Solution:**
        *   Tightened `PINCH_ENTER` threshold (0.045 → 0.035).
        *   Added **Velocity Check**: Cannot lock if hand is moving > 0.3 speed.
        *   Increased lock hold time (350ms → 450ms).

4.  **rendering Optimization**
    *   **Shadow Map:** Reduced from `1024x1024` to `512x512` (75% VRAM saving).
    *   **Tracking Throttle:** Face tracking now runs at 30fps (every 2nd frame) vs 60fps. Hands run at 60fps (Sequential).
    *   **Result:** ~40% reduction in CPU load, higher frame stability on Mac.

5.  **Architecture: Gesture Bus**
    *   **Problem:** Reactivity chains caused input lag.
    *   **Solution:** Created `gestureBus.ts` for O(1) event dispatching.
    *   **Result:** Zoom/Pan input bypasses Svelte store lag for <16ms update loop.

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
| 7 | Performance & Polish | Optimization Pass (Done) |
| 8 | Dynamic Island 2.0 | Context Awareness & UX |

---

## Notes

- Start with Gesture Engine as it's foundational
- Each improvement should be testable independently
- Keep backwards compatibility during refactoring
- Write tests for critical gesture paths

---

## 8. Dynamic Island 2.0 (Context Awareness)

**Status:** 🟡 **In Progress**

### Problem

The Dynamic Island is currently reactive (displays data) but not truly "aware" of the user's *intent* or *environment*. It should be the central nervous system of the UI.

### Proposed Enhancements

#### A. Gesture State Visualization 👆
**Context:** When user is performing gestures (Zooming, Panning, Locking).
**Behavior:**
- **Zooming:** Island morphs to show current timeframe/zoom level (e.g., "Zoom: 15m").
- **Locking:** Shows a "Locking..." progress ring when holding a gesture.
- **Why:** Gives immediate visual feedback that the system *sees* the hand.

#### B. System Health Stream 💓
**Context:** WebSocket connection drops, high latency, or market halt.
**Behavior:**
- **Reconnecting:** Pulsing amber pill "Reconnecting...".
- **Market Closed:** Greyed out state with "Market Closed" badge.
- **Why:** builds trust; user knows *why* data might be stale.

#### C. Smart Toast Replacement 🍞
**Context:** Generic system messages ("Screenshot saved", "Layout reset").
**Behavior:**
- Instead of standard toast notifications, momentary expansion of the Island.
- **Icon + Message:** e.g., "📸 Screenshot Saved".
- **Why:** Unified UI language; reduces visual clutter.

#### D. Volatility/Volume Spikes 📊
**Context:** Sudden price movement or high volume.
**Behavior:**
- **Pulse Effect:** Island border glows (Emerald/Rose) during spikes.
- **Ticker Mode:** Shows "High Volatility" warning badge.
