# Suggested Optimization Strategy

## Part 1: Comprehensive Codebase Analysis

### Backend Performance
- **Blocking I/O in Async Routes**: The API routes in `orders.py`, `quote.py`, etc., are defined as `async def` but make synchronous calls to `kite_client`. This blocks the FastAPI event loop.
    - **Fix (High Priority)**: Change route definitions from `async def` to `def`. This tells FastAPI to run these routes in a thread pool.
- **Cache Strategy**: The current caching (e.g., for instrument tokens) uses a simple in-memory Python dictionary.
    - **Suggestion**: Use `lru_cache` from `functools` for method-level caching.

### Frontend Performance (Snappiness)
- **Shadow Map Resolution**: `Scene3D.svelte` uses a 2048x2048 shadow map, which is taxing for a GPU alongside MediaPipe.
    - **Fix**: Reduce to 1024x1024 or 512x512.
- **MediaPipe Throttle**: `FaceTracker.svelte` processes every frame as fast as possible.
    - **Suggestion**: Implement a throttle to skip every other frame if CPU usage is high.
- **Component Re-renders**: Complex logic inside reactive statements could be moved to derived stores.

### Code Quality (DRY/KISS)
- **Gesture Logic**: Refactor ~500 lines of gesture recognition logic in `FaceTracker.svelte` into a utility class `GestureRecognizer.ts`.
- **Magic Numbers**: Move hardcoded thresholds and colors to a `constants.ts` file.

---

## Part 2: Implementation Plan for "Snappiness"

### Goal
Eliminate "lag" during screen load, chart load, and zooming. Improve overall "snappiness" of the UI.

### Problem Analysis
1.  **Rendering Bottleneck**: The current chart renders ~50-100 separate `<Candle>` components, resulting in 150-300+ draw calls.
2.  **Shadow Performance**: The 2048x2048 shadow map is expensive to update.
3.  **Zoom Lag**: Rapid updates from the Face/Hand tracker combined with high object count causes frame drops.

### Action Plan

#### 1. Refactor `CandlestickChart` to use `InstancedMesh`
Instead of iterating and creating individual `Candle` components, we will use `Three.js` `InstancedMesh` to render all candles in a single draw call.

- **[MODIFY]** `CandlestickChart.svelte`:
    - Remove `{#each}` loop for `<Candle>`.
    - Implement `T.InstancedMesh` for Candle Bodies (BoxGeometry) and Wicks (CylinderGeometry).
    - Split into `GreenCandles` and `RedCandles` groups for simpler material management.
- **[DELETE]** `Candle.svelte`: Obsolete component.

#### 2. Optimize `Scene3D` Lighting
Reduce shadow map resolution to improve GPU performance.

- **[MODIFY]** `Scene3D.svelte`:
    - Change `shadow.mapSize={[2048, 2048]}` to `[1024, 1024]`.
    - Ensure "Glow" objects do not cast shadows.

#### 3. Add Preload/Preconnect
- Add `<link rel="preconnect">` for any external fonts or CDN resources in `app.html` or `+layout.svelte`.

### Verification Plan
1.  **Load Test**: Refresh page. Time to "chart visible" should be near-instant.
2.  **Zoom Test**: Rapid pinch zoom. Success criteria: Smooth 60fps animation.
3.  **Visual Check**: Ensure candles still look correct (Green/Red colors, wicks aligned).
