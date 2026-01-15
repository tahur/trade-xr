# Roadmap & Current Status

This document tracks what has been built and what's planned for future development.

---

## Current Status: Beta

HoloTrade is functional for basic trading operations with face tracking and gesture controls.

---

## ✅ What's Been Built

### Phase 1: Foundation (Completed)

#### 3D Rendering Engine
- [x] SvelteKit project setup with TypeScript
- [x] Three.js integration via Threlte
- [x] 3D candlestick chart rendering
- [x] Camera controls with perspective shift
- [x] Professional lighting (8-light setup)
- [x] Trading terminal environment (floor, walls, grid)

#### Face Tracking System
- [x] MediaPipe Face Mesh integration
- [x] Real-time head position tracking (X, Y, Z)
- [x] Nose and cheek landmark extraction
- [x] Depth estimation from cheek distance
- [x] EMA smoothing for stable tracking

#### Hand Tracking System
- [x] MediaPipe Hands integration
- [x] Single-hand and two-hand detection
- [x] 21-landmark hand tracking
- [x] Finger extension detection
- [x] Hand position mapping to screen coordinates

---

### Phase 2: Gesture Controls (Completed)

#### Gesture Recognition
- [x] Pinch detection (thumb + index)
- [x] Pinch hysteresis to prevent flickering
- [x] Point-up gesture detection
- [x] Thumbs-up detection with scoring system
- [x] Closed fist detection
- [x] Two-hand zoom gesture

#### Trading State Machine
- [x] IDLE → TARGETING → LOCKED → CONFIRMING → ORDER_PLACED flow
- [x] Timing thresholds for each state transition
- [x] Cancel via closed fist from any state
- [x] Cooldown periods to prevent accidental triggers

#### Price Selection UI
- [x] Gesture-driven price overlay
- [x] Visual feedback for each gesture state
- [x] Price lock confirmation animation
- [x] Quantity display

---

### Phase 3: Kite Integration (Completed)

#### Backend API
- [x] FastAPI server setup
- [x] KiteConnect client wrapper (singleton)
- [x] OAuth login flow handling
- [x] Session management
- [x] CORS configuration for frontend

#### API Endpoints
- [x] `POST /api/kite/login` - Exchange request token
- [x] `POST /api/kite/order` - Place orders
- [x] `GET /api/kite/positions` - Fetch positions
- [x] `GET /api/kite/margins` - Fetch available margins
- [x] `GET /quote/ltp/{symbol}` - Last traded price
- [x] `GET /quote/quote/{symbol}` - Full quote with OHLC
- [x] `GET /quote/candles/{symbol}` - Historical data
- [x] `POST /config` - Configure API credentials

#### Frontend Kite Service
- [x] API client for backend communication
- [x] Order placement with notification lifecycle
- [x] Position fetching
- [x] Margin display

---

### Phase 4: User Interface (Completed)

#### Dynamic Island Notifications
- [x] macOS-style notification center
- [x] Multiple notification types (order, API, P&L)
- [x] Compact, expanded, and live modes
- [x] Auto-dismiss with configurable duration
- [x] 3D tilt effect based on head position

#### Settings Panel
- [x] Glassmorphic settings card
- [x] Parallax sensitivity slider
- [x] Gesture sensitivity slider
- [x] Preferred hand selection (Left/Right)
- [x] API configuration modal

#### ETF Selector
- [x] Dropdown for supported ETFs
- [x] Dynamic candle loading per symbol
- [x] Live price updates

#### Status Bar
- [x] Camera status (LIVE / OFF)
- [x] API connection status
- [x] Fixed position bottom-left

---

### Phase 5: Code Quality (Completed)

#### Refactoring
- [x] Extracted EMA utilities (`utils/ema.ts`)
- [x] Centralized order service (`services/orderService.ts`)
- [x] Extracted 3D scene component (`Scene3D.svelte`)
- [x] Removed unused components and imports
- [x] Fixed accessibility warnings

#### Documentation
- [x] README.md - Project overview
- [x] TECHNICAL.md - Implementation details
- [x] ROADMAP.md - This document

---

## 📋 What's Planned

### Phase 6: Advanced Trading (Planned)

- [ ] Stop-loss order support
- [ ] Market order type
- [ ] Quantity gestures (swipe for qty adjustment)
- [ ] Buy/Sell gesture differentiation
- [ ] Multiple position tracking
- [ ] Portfolio view

### Phase 7: Real-Time Streaming (Planned)

- [ ] WebSocket ticker connection
- [ ] Live candle updates
- [ ] Real-time price animation
- [ ] Volume visualization
- [ ] Tick-by-tick streaming

### Phase 8: Enhanced Visualization (Planned)

- [ ] Moving averages overlay
- [ ] Volume bars below chart
- [ ] Support/resistance lines
- [ ] Price alerts with visual indicators
- [ ] Depth chart (bid/ask)

### Phase 9: Multi-Monitor Support (Planned)

- [ ] Detachable chart windows
- [ ] Secondary display for positions
- [ ] PiP (Picture-in-Picture) mode

### Phase 10: Mobile Companion (Planned)

- [ ] React Native app for alerts
- [ ] Voice confirmation for orders
- [ ] Position monitoring on the go

---

## Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Single face only | Multi-user not supported | Use single camera per session |
| Requires good lighting | Hand detection fails in dark | Improve room lighting |
| Webcam required | Desktop only | No mobile support planned initially |
| Zerodha only | India-specific | Abstract broker interface for future |
| MCX/NSE/NFO only | Limited exchanges | Add more exchanges later |
| Limit orders only | No market orders | Add order type selection |

---

## Technical Debt

Items that work but need improvement:

| Item | Current State | Desired State |
|------|---------------|---------------|
| FaceTracker | 523-line monolith | Split into services |
| PriceTargetOverlay | 530 lines | Extract gesture logic |
| Error handling | Basic try/catch | Centralized error service |
| Type safety | Partial TypeScript | Full strict mode |
| Testing | None | Unit + E2E tests |
| Logging | console.log | Structured logging service |

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 0.1.0 | - | Initial prototype with mock data |
| 0.2.0 | - | Kite API integration |
| 0.3.0 | - | Gesture trading complete |
| 0.4.0 | - | Dynamic Island notifications |
| 0.5.0 | - | Code cleanup and documentation |

---

## Contributing

We welcome contributions in these areas:

1. **Bug fixes** - Especially gesture detection edge cases
2. **Performance** - FPS improvements for lower-end hardware
3. **Accessibility** - Keyboard alternatives for gestures
4. **Documentation** - More examples and tutorials
5. **Testing** - Unit tests, integration tests
6. **New brokers** - Abstract interface for other APIs

See [TECHNICAL.md](TECHNICAL.md) for implementation details before contributing.

---

## Contact

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **License**: MIT
