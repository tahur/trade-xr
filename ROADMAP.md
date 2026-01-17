# HoloTrade - Roadmap & Status

> **Last Updated**: 2026-01-17  
> **Current Version**: Pre-Alpha  
> **Repository**: [github.com/tahur/holotrade](https://github.com/tahur/holotrade)

This document tracks completed work, pending tasks, and future development plans.

---

## 📊 Current Status: Pre-Alpha

HoloTrade is an experimental project for basic trading operations with face tracking and gesture controls. Core features are functional but under active development. Core features work reliably, but optimization and enhancements are ongoing.

---

## ✅ Completed Features (Verified in Code)

### Core Infrastructure
- [x] **SvelteKit 5 + TypeScript** - Modern reactive framework
- [x] **Three.js 3D rendering** - Candlestick chart visualization
- [x] **MediaPipe integration** - Face Mesh + Hands tracking
- [x] **TailwindCSS styling** - Glassmorphism UI
- [x] **FastAPI backend** - Python REST API
- [x] **Zerodha KiteConnect** - Full broker integration

### Animation & Performance
- [x] **Physics-based AnimationController** (195 lines)
  - Damped Harmonic Oscillator (Hooke's Law)
  - 16-33ms response time (down from 200-500ms)
  - Organic velocity carry, zero frame stepping
  
- [x] **Event Bus (gestureBus)** (146 lines)
  - Sub-millisecond event propagation
  - Bypasses Svelte store lag for time-critical updates
  
- [x] **Centralized configuration** (`config/` directory)
  - `gestures.ts`, `timing.ts`, `api.ts`, `etfs.ts`
  - Single source of truth for all constants

### Gesture System
- [x] **Gesture Engine with Priority Locking** (242 lines)
  - ZOOMING (3) > CONFIRMING (2) > TRADING (1) > IDLE (0)
  - Context conflicts resolved automatically
  - 300ms cooldown prevents false triggers
  
- [x] **Triple-Lock Pinch Stability**
  - Tighter threshold (PINCH_ENTER=0.035)
  - Velocity check (VELOCITY_STABLE=0.3)
  - Longer hold time (LOCK_DELAY_MS=450ms)
  
- [x] **Two-Hand Zoom Gesture**
  - Can interrupt any other gesture
  - Amplified sensitivity (power=1.5)
  - Smooth zoom range (0.3x to 3.0x)

### UI Components (14 Total)
- [x] **FaceTracker** (561 lines) - Main gesture processor
- [x] **CandlestickChart** - 3D OHLC visualization
- [x] **PriceTargetOverlay** - Gesture-based price selector
- [x] **DynamicIsland** - macOS-style notifications
- [x] **DynamicConfirmZone** - 3-second hold confirmation
- [x] **ControlCenter** - Settings panel
- [x] **ETFSelector** - Instrument switcher
- [x] **ZoomIndicator** - Current zoom level display
- [x] **BrandCard** - Kite branding/connection status
- [x] **TradingRoom** - 3D environment
- [x] **Scene3D** - Lighting and camera setup
- [x] **OffAxisCamera** - Perspective-shift camera
- [x] **PriceTargetLine** - Visual price indicator
- [x] **TrackingManager** - Tracking state management

### Backend Features
- [x] **KiteClient Singleton** (195 lines)
  - Instrument token caching (`_token_cache`)
  - OAuth login flow
  - Order placement (limit orders)
  - Position/margin fetching
  
- [x] **API Routes**
  - `/api/kite/login` - OAuth callback
  - `/api/kite/order` - Place orders
  - `/quote/ltp/{symbol}` - Live price
  - `/quote/candles/{symbol}` - Historical data
  - `/config` - Runtime API configuration
  - `/ws` - WebSocket endpoint

### Data Management
- [x] **7 Svelte Stores** for reactive state
  - `tracking.ts` - Face/hand positions
  - `gesture.ts` - Gesture state
  - `trading.ts` - Trading flow state
  - `orders.ts` - Order history
  - `positions.ts` - Open positions
  - `dynamicIsland.ts` - Notification state
  - `selectedETF.ts` - Current instrument

- [x] **9 Service Modules**
  - `kite.ts` - API client
  - `orderService.ts` - Order logic
  - `etfService.ts` - Instrument data
  - `tickerService.ts` - WebSocket streaming
  - `apiClient.ts` - HTTP wrapper
  - `candleBuilder.ts` - OHLC processing
  - `mockData.ts` - Test data
  - `gestureEngine.ts` - Context management
  - `gestureBus.ts` - Event dispatch

---

## 🔧 In Progress / Partially Implemented

### Performance Optimizations
- **Face Tracking Throttling** (PROPOSED, NOT IMPLEMENTED)
  - `frameCount` variable exists in FaceTracker but unused
  - Could reduce CPU by ~40% (60fps → 30fps for face mesh)
  - Status: Code structure in place, not activated

---

## 📋 Pending Tasks (Priority Order)

### High Priority

- [ ] **Implement InstancedMesh Rendering**
  - Replace individual `<Candle>` components with Three.js `InstancedMesh`
  - Reduce 150-300 draw calls → 1 draw call per color
  - File: `CandlestickChart.svelte`
  - Impact: Major FPS improvement on low-end hardware

- [ ] **Extract TradingController**
  - Move state machine logic from `PriceTargetOverlay.svelte` to `controllers/TradingController.ts`
  - Centralize IDLE → TARGETING → LOCKED → CONFIRMING flow
  - Impact: Cleaner code, easier to maintain

- [ ] **Add Automated Tests**
  - Unit tests for gesture detection logic
  - Integration tests for order flow
  - E2E tests for critical paths
  - Impact: Catch regressions early

- [ ] **Verify Backend Async/Sync Handling**
  - Check if routes should be `async def` or `def`
  - Ensure `kite_client` calls don't block event loop
  - File: `backend/app/routes/*.py`
  - Impact: Avoid potential backend bottlenecks

### Medium Priority

- [ ] **Activate Face Tracking Throttling**
  - Use existing `frameCount` variable to skip frames
  - Process face mesh at 30fps instead of 60fps
  - Keep hands at 60fps for responsiveness
  - Impact: 40% CPU reduction

- [ ] **Split FaceTracker Component**
  - Extract gesture logic to `GestureClassifier` utility
  - FaceTracker is currently 561 lines
  - Impact: Better code organization

- [ ] **Add Structured Logging**
  - Replace `console.log` with proper logging service
  - Implement log levels (debug, info, warn, error)
  - Impact: Better debugging and monitoring

- [ ] **Implement Error Service**
  - Centralized error handling
  - Better error messages to user
  - Impact: Improved UX during failures

- [ ] **Enable TypeScript Strict Mode**
  - Currently using partial type safety
  - Add strict null checks and type assertions
  - Impact: Catch more bugs at compile time

### Low Priority

- [ ] **Market Order Support**
  - Currently limit orders only
  - Add market order type option
  - Impact: Faster execution for users

- [ ] **Stop-Loss Orders**
  - Add SL order type
  - Target price + stop-loss in same gesture flow
  - Impact: Risk management feature

- [ ] **Quantity Gesture**
  - Swipe gesture to adjust quantity
  - Currently fixed quantity
  - Impact: More flexible trading

- [ ] **Buy/Sell Differentiation**
  - Different gestures for buy vs sell
  - Currently assumes buy
  - Impact: Full trading functionality

---

## 🚀 Future Roadmap (Post-1.0)

### Zerodha Kite Enhancements
- [ ] **WebSocket Live Ticker**
  - Replace polling with Kite WebSocket API
  - Real-time tick-by-tick updates
  - Currently polls every 5s for LTP
  
- [ ] **Advanced Order Types**
  - Bracket orders (BO)
  - Cover orders (CO)
  - After-market orders (AMO)
  - Good-till-cancelled (GTL)
  
- [ ] **Kite Portfolio Features**
  - Holdings view
  - Fund summary
  - Tax P&L reports
  
- [ ] **Volume Visualization**
  - Volume bars below candlestick chart
  - 3D volume representation
  
- [ ] **Technical Indicators**
  - Moving averages (SMA, EMA)
  - Support/resistance lines
  - Bollinger Bands
  
- [ ] **Portfolio View**
  - Multiple position tracking
  - P&L aggregation
  - Position sizing visualization
  
- [ ] **Multi-Monitor Support**
  - Detachable chart windows
  - Secondary display for positions/orders
  - Picture-in-Picture mode

### Mobile/Companion
- [ ] **React Native App**
  - Position monitoring on the go
  - Push notifications for fills
  - Voice confirmation for orders
  
- [ ] **Tablet Version**
  - Optimized for iPad
  - Touch + face tracking hybrid

### Advanced Visualization
- [ ] **Order Book Depth Chart**
  - Bid/ask visualization
  - Live order flow
  
- [ ] **Multiple Timeframes**
  - Switch between 1m, 5m, 15m, 1h, 1d
  - Currently shows single timeframe
  
- [ ] **Multi-Symbol View**
  - Grid of multiple instruments
  - Gesture to switch between symbols

---

## 🐛 Technical Debt

### Code Quality Issues

| Issue | Location | Impact | Priority |
|-------|----------|--------|----------|
| FaceTracker is 561 lines | `Tracking/FaceTracker.svelte` | Hard to maintain | High |
| PriceTargetOverlay complex reactivity | `UI/PriceTargetOverlay.svelte` | Brittle state management | High |
| No automated tests | Entire codebase | Risk of regressions | High |
| console.log logging | All files | Hard to debug production | Medium |
| Basic error handling | All files | Poor UX on errors | Medium |
| Partial TypeScript strict mode | All `.ts` files | Missed type errors | Medium |
| Some duplicated logic | Stores + Components | Code duplication | Low |

### Architecture Improvements

| Improvement | Rationale | Effort |
|-------------|-----------|--------|
| Extract GestureClassifier | FaceTracker too large | Medium |
| Create TradingController | Centralize state machine | Medium |
| Add error boundary service | Better error UX | Small |
| Implement logging service | Structured logs | Small |
| Add unit test framework | Catch bugs early | Large |

---

## 📈 Version History

| Version | Status | Highlights |
|---------|--------|------------|
| 0.1.0 | ✅ | Initial prototype with mock data |
| 0.2.0 | ✅ | Kite API integration |
| 0.3.0 | ✅ | Gesture trading complete |
| 0.4.0 | ✅ | Dynamic Island notifications |
| 0.5.0 | ✅ | AnimationController, gestureEngine, gestureBus |
| 0.6.0 | ✅ | Code cleanup, centralized config |
| **1.0.0** | 🚧 | **Target: Stable beta with tests** |

---

## 🎯 Milestones to 1.0

- [ ] Implement InstancedMesh rendering
- [ ] Extract TradingController
- [ ] Add automated tests (basic coverage)
- [ ] Enable TypeScript strict mode
- [ ] Add structured logging
- [ ] Implement error service
- [ ] Documentation complete ✅
- [ ] Performance profiling complete
- [ ] Security audit complete

**Estimated Timeline:** 2-3 months

---

## 📝 Notes

### Design Decisions

**Why Physics-Based Animation?**
- Svelte springs caused 200-500ms lag due to double reactivity
- RAF loop with Hooke's Law physics gives 16-33ms response
- Feels organic with velocity carry

**Why Priority-Based Gestures?**
- Users frequently triggered price picker while zooming
- Context locking ensures only one feature active at a time
- Cooldowns prevent false triggers after gesture ends

**Why Centralized Config?**
- Magic numbers scattered across

 files made tuning hard
- Single source of truth for all thresholds
- Type-safe constants with `as const`

**Why Individual Meshes Instead of Instancing?**
- Current rendering is acceptable for 50-100 candles
- Instancing adds complexity for color/height variation
- Works fine on modern hardware (60fps+)
- Can optimize later if needed

---

**End of Roadmap**

For user-facing overview, see [README.md](README.md)  
For technical details, see [TECHNICAL.md](TECHNICAL.md)
