# TradeXR Architecture

> Technical reference for contributors and LLMs working on this codebase.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (localhost:5173)                       │
│                                                                             │
│   ┌──────────┐     ┌──────────────┐     ┌────────────────┐                  │
│   │  Webcam  │────▶│  MediaPipe   │────▶│ Gesture Engine │                  │
│   │  (60fps) │     │ (Hand/Face)  │     │   (Priority)   │                  │
│   └──────────┘     └──────────────┘     └───────┬────────┘                  │
│                                                 │                           │
│                           ┌─────────────────────┼─────────────────────┐     │
│                           │                     │                     │     │
│                           ▼                     ▼                     ▼     │
│                    ┌────────────┐       ┌─────────────┐       ┌──────────┐  │
│                    │ GestureBus │       │ Animation   │       │  Svelte  │  │
│                    │  (Events)  │       │ Controller  │       │  Stores  │  │
│                    └─────┬──────┘       └──────┬──────┘       └────┬─────┘  │
│                          │                     │                   │        │
│                          └─────────────────────┼───────────────────┘        │
│                                                ▼                            │
│                                    ┌───────────────────────┐                │
│                                    │   3D Scene + UI       │                │
│                                    │ (Three.js + Threlte)  │                │
│                                    └───────────┬───────────┘                │
└────────────────────────────────────────────────┼────────────────────────────┘
                                                 │ HTTP/WebSocket
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (localhost:8000)                       │
│                                                                             │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                           FastAPI                                  │    │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  │    │
│   │  │ Orders  │  │ Quotes  │  │ Session │  │  Vault  │  │ Holdings │  │    │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └──────────┘  │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                      │                                      │
│                              ┌───────┴───────┐                              │
│                              │  KiteClient   │                              │
│                              │  (Singleton)  │                              │
│                              └───────┬───────┘                              │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ HTTPS
                                       ▼
                          ┌───────────────────────┐
                          │    ZERODHA KITE API   │
                          └───────────────────────┘
```

---

## Complete Project Structure

```
tradexr/
├── backend/                          # Python FastAPI server
│   ├── app/
│   │   ├── main.py                   # Entry point: CORS config, mounts all routers
│   │   ├── kite_client.py            # Singleton wrapper for Zerodha SDK (345 lines)
│   │   │                             #   Auto-restores session on startup via vault
│   │   │                             #   Validates tokens, caches instrument tokens
│   │   ├── ticker_service.py         # WebSocket service for real-time price streaming
│   │   ├── routes/
│   │   │   ├── orders.py             # POST /api/kite/order → place_order()
│   │   │   ├── quote.py              # GET /quote/* → LTP, quotes, candles
│   │   │   ├── config.py             # POST /config → runtime API credential update
│   │   │   ├── vault.py              # GET/POST/DELETE /api/vault/* → encrypted credentials
│   │   │   ├── session.py            # GET/POST/DELETE /api/session/* → auth flow
│   │   │   └── websocket.py          # WebSocket endpoint for frontend tick streaming
│   │   └── security/
│   │       └── vault.py              # CredentialVault: Fernet encryption (AES-128-CBC)
│   │                                 #   .vault file → encrypted API keys
│   │                                 #   .session file → encrypted access token
│   ├── requirements.txt
│   └── .vault / .session             # Encrypted credential files (gitignored)
│
├── frontend/                          # SvelteKit + Threlte (Three.js)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +page.svelte          # Main trading view, mounts Scene3D + all UI
│   │   │   └── portfolio/
│   │   │       └── +page.svelte      # Portfolio solar system, uses holdings store
│   │   └── lib/
│   │       │
│   │       ├── controllers/
│   │       │   └── AnimationController.ts
│   │       │       # Physics-based camera using damped harmonic oscillator
│   │       │       # Called by: FaceTracker (setZoom, setParallax)
│   │       │       # Updates: Three.js camera position via RAF loop
│   │       │
│   │       ├── services/
│   │       │   ├── gestureEngine.ts
│   │       │   │   # Priority-based context locking (IDLE < TRADING < CONFIRMING < ZOOMING)
│   │       │   │   # Called by: FaceTracker, PriceTargetOverlay
│   │       │   │   # Prevents gesture conflicts with cooldowns
│   │       │   │
│   │       │   ├── gestureBus.ts
│   │       │   │   # Event bus for sub-millisecond gesture propagation
│   │       │   │   # Emits: ZOOM_UPDATE, PINCH_HOLD, THUMBS_UP_DETECTED, etc.
│   │       │   │   # Listeners: AnimationController, +page.svelte
│   │       │   │
│   │       │   ├── kite.ts
│   │       │   │   # Kite API client wrapper for frontend
│   │       │   │   # Called by: orderService, etfService
│   │       │   │
│   │       │   ├── orderService.ts
│   │       │   │   # Order placement logic with rate limiting
│   │       │   │   # Calls: apiClient → backend /api/kite/order
│   │       │   │   # Updates: dynamicIsland store on success/failure
│   │       │   │
│   │       │   ├── etfService.ts
│   │       │   │   # Fetches ETF data, candles, LTP
│   │       │   │   # Calls: apiClient → backend /quote/* endpoints
│   │       │   │
│   │       │   ├── tickerService.ts
│   │       │   │   # WebSocket connection for real-time prices
│   │       │   │   # Connects to: backend /ws
│   │       │   │   # Updates: trading store with live prices
│   │       │   │
│   │       │   ├── apiClient.ts
│   │       │   │   # HTTP fetch wrapper with error handling
│   │       │   │   # Used by: all other services
│   │       │   │
│   │       │   ├── candleBuilder.ts
│   │       │   │   # Transforms API candle data → Three.js mesh format
│   │       │   │   # Used by: CandlestickChart component
│   │       │   │
│   │       │   └── mockData.ts
│   │       │       # Fake data for development/testing
│   │       │
│   │       ├── stores/
│   │       │   ├── tracking.ts
│   │       │   │   # Head position (x, y) from face tracking
│   │       │   │   # Written by: FaceTracker
│   │       │   │   # Read by: DynamicIsland (3D tilt), Scene3D (parallax)
│   │       │   │
│   │       │   ├── gesture.ts
│   │       │   │   # Current gesture state (pinching, pointing, etc.)
│   │       │   │   # Written by: FaceTracker
│   │       │   │   # Read by: GestureGuide, PriceTargetOverlay
│   │       │   │
│   │       │   ├── trading.ts
│   │       │   │   # Trading mode, selected symbol, current price
│   │       │   │   # Written by: ETFSelector, tickerService
│   │       │   │   # Read by: DynamicIsland, PriceTargetOverlay
│   │       │   │
│   │       │   ├── orders.ts
│   │       │   │   # Pending/completed orders with polling
│   │       │   │   # Written by: orderService
│   │       │   │   # Read by: DynamicIsland (order status)
│   │       │   │
│   │       │   ├── positions.ts
│   │       │   │   # Open positions with P&L tracking
│   │       │   │   # Written by: polling from backend
│   │       │   │   # Read by: DynamicIsland (live P&L mode)
│   │       │   │
│   │       │   ├── holdings.ts
│   │       │   │   # Portfolio holdings for solar system view
│   │       │   │   # Written by: API call on portfolio page load
│   │       │   │   # Read by: PortfolioSolarSystem component
│   │       │   │
│   │       │   ├── dynamicIsland.ts
│   │       │   │   # Island mode (compact/expanded/live/pending)
│   │       │   │   # Written by: orderService, positions store
│   │       │   │   # Read by: DynamicIsland component
│   │       │   │
│   │       │   ├── gestureBar.ts
│   │       │   │   # Bottom bar mode (idle/zoom/targeting/locked)
│   │       │   │   # Written by: FaceTracker, gestureEngine
│   │       │   │   # Read by: GestureGuide component
│   │       │   │
│   │       │   └── selectedETF.ts
│   │       │       # Currently selected ETF symbol
│   │       │       # Written by: ETFSelector
│   │       │       # Read by: etfService, trading store
│   │       │
│   │       ├── config/
│   │       │   ├── gestures.ts       # Thresholds: PINCH_ENTER, VELOCITY_STABLE, EMA presets
│   │       │   ├── timing.ts         # Delays: LOCK_DELAY_MS, COOLDOWN_MS, polling intervals
│   │       │   ├── api.ts            # API_BASE, WS_URL from environment
│   │       │   └── etfs.ts           # Supported ETF list with symbols and exchanges
│   │       │
│   │       ├── utils/
│   │       │   ├── GestureClassifier.ts  # Pure functions: isThumbsUp(), isPinching(), etc.
│   │       │   ├── TabGuard.ts           # Blocks trading when tab is inactive
│   │       │   ├── DeviceGuard.ts        # Rejects mobile/tablet, enforces desktop
│   │       │   ├── RateLimiter.ts        # Token bucket algorithm for order rate limiting
│   │       │   ├── ema.ts                # Exponential moving average smoothing
│   │       │   ├── logger.ts             # Environment-aware console logging
│   │       │   └── polling.ts            # Reusable interval-based data fetching
│   │       │
│   │       ├── types/
│   │       │   └── trading.ts        # TypeScript interfaces: Position, Order, CandleData
│   │       │
│   │       └── components/
│   │           ├── Camera/
│   │           │   └── OffAxisCamera.svelte    # Perspective camera with parallax support
│   │           │
│   │           ├── Chart3D/
│   │           │   ├── CandlestickChart.svelte # Renders candles using candleBuilder data
│   │           │   └── PriceTargetLine.svelte  # Horizontal line at locked price
│   │           │
│   │           ├── Environment/
│   │           │   └── TradingRoom.svelte      # 3D room geometry (floor, walls, grids)
│   │           │
│   │           ├── Scene3D/
│   │           │   └── Scene3D.svelte          # Main Three.js scene, lighting, camera setup
│   │           │
│   │           ├── Tracking/
│   │           │   ├── FaceTracker.svelte      # MediaPipe setup, gesture detection, emits events
│   │           │   └── TrackingManager.svelte  # Manages tracking lifecycle
│   │           │
│   │           └── UI/
│   │               ├── BrandCard.svelte            # Logo/branding display
│   │               ├── ControlCenter.svelte        # Settings panel, Kite login
│   │               ├── DynamicConfirmZone.svelte   # Thumbs up/down confirmation area
│   │               ├── DynamicIsland.svelte        # iOS-style floating status card
│   │               ├── ETFSelector.svelte          # Symbol picker carousel
│   │               ├── GestureGuide.svelte         # Bottom bar showing gesture hints
│   │               ├── PriceTargetOverlay.svelte   # Price picker with pinch-to-lock
│   │               └── ZoomIndicator.svelte        # Shows zoom percentage during pinch
│   │
│   ├── package.json
│   └── .env
│
├── ARCHITECTURE.md                   # This file
├── TECHNICAL.md                      # Deep dive: CSS values, lighting, all config
├── README.md                         # User-facing overview
├── CONTRIBUTING.md
├── ROADMAP.md
└── LICENSE                           # MIT
```

---

## Data Fetching Strategy

| Data | Method | Interval | Service |
|------|--------|----------|---------|
| **Margins** | REST API polling | 5 seconds | `kite.getMargins()` → `/margins` |
| **Positions** | REST API polling | 5 seconds | `positions.ts` → `/api/kite/positions` |
| **Orders** | REST API polling | 3 seconds | `orders.ts` → `/api/kite/orders` |
| **Holdings** | REST API (on load) | once | `holdings.ts` → `/api/holdings` |
| **LTP (price)** | REST API polling | 5 seconds | `etfService.ts` → `/quote/ltp/{symbol}` |
| **Historical candles** | REST API | on load + 60s | `etfService.ts` → `/quote/candles/{symbol}` |
| **Live candle** | WebSocket ticks | real-time | `candleBuilder.ts` aggregates ticks into OHLC |

### Why Polling Instead of WebSocket for Everything?

- Zerodha's WebSocket only streams tick data (LTP), not positions/orders/margins
- Polling intervals tuned to balance freshness vs API rate limits
- `candleBuilder.ts` converts WebSocket ticks → real-time OHLC bars

---

## Data Flow

### Gesture → Action

```
Webcam Frame
    │
    ▼
MediaPipe (21 hand points, 468 face points)
    │
    ├──▶ EMA Smoothing (α=0.7)
    │
    ▼
Gesture Classifier
    │
    ├──▶ Hysteresis (3-frame confirmation)
    │
    ▼
Gesture Engine (Priority Locking)
    │
    ├──▶ Priority 3: Zooming    (highest)
    ├──▶ Priority 2: Confirming
    ├──▶ Priority 1: Trading
    └──▶ Priority 0: Idle       (lowest)
    │
    ▼
GestureBus (instant event dispatch)
    │
    ▼
AnimationController (physics-based camera)
    │
    ▼
Three.js Scene Update
```

### Order Placement Flow

```
1. User shows hand       → IDLE → TRADING context acquired
2. User pinches          → Price locked (after 450ms stable pinch)
3. User points up        → TRADING → CONFIRMING context upgrade
4. User thumbs up        → DynamicConfirmZone spawns
5. Hold thumbs up 3s     → Order placed via orderService
6. orderService          → Backend /api/kite/order
7. Backend               → Zerodha KiteConnect API
8. Response              → dynamicIsland notification
```

---

## Core Components

### 1. AnimationController (Physics Camera)

Custom physics engine using damped harmonic oscillators:

```
Physics: F = -stiffness × displacement - damping × velocity
```

**Configuration:**
```typescript
stiffness: 220    // Higher = faster return to target
damping: 20       // Higher = less oscillation  
mass: 1.2         // Higher = more "weight" feel
precision: 0.001  // Velocity threshold to stop simulation
```

**Methods:**
- `setZoom(multiplier)` - Set camera Z position
- `setParallax(x, y)` - Set camera X/Y offsets
- `jumpTo(state)` - Instant position change (no animation)
- `reset()` - Return to base position

**Why:** Svelte springs caused 200-500ms lag. This achieves 16ms response time.

Location: `frontend/src/lib/controllers/AnimationController.ts`

---

### 2. Gesture Engine (Priority Locking)

**Priority System:**
```
ZOOMING (Priority 3)     ← Highest, always wins
    ↓
CONFIRMING (Priority 2)  ← Can interrupt TRADING
    ↓
TRADING (Priority 1)     ← Can interrupt IDLE
    ↓
IDLE (Priority 0)        ← Lowest
```

**Engine Config:**
```typescript
ZOOM_COOLDOWN_MS: 300       // After zoom ends
TRADING_COOLDOWN_MS: 200    // After trading state change
MIN_LOCK_DURATION_MS: 100
CONFIRM_HOLD_MS: 3000
CONFIRM_ZONE_RADIUS: 0.12
```

**API:**
- `acquire(owner, context, force)` - Request context lock
- `release(owner, cooldownMs)` - Release lock with optional cooldown
- `canAcquire(context)` - Check if acquirable
- `hasLock(owner)` - Check if owner has lock

Location: `frontend/src/lib/services/gestureEngine.ts`

---

### 3. GestureBus (Event System)

Svelte stores add 16-32ms delay per subscription. GestureBus provides sub-millisecond event propagation.

**Events:**
- `ZOOM_START`, `ZOOM_UPDATE`, `ZOOM_END`
- `PINCH_START`, `PINCH_HOLD`, `PINCH_END`
- `HAND_DETECTED`, `HAND_LOST`
- `FIST_DETECTED`, `POINT_UP_DETECTED`, `THUMBS_UP_DETECTED`
- `GESTURE_CHANGED`

**API:**
- `on(type, handler)` - Subscribe to event
- `onAll(handler)` - Subscribe to all events
- `onMany(types, handler)` - Subscribe to multiple events
- `emit(type, payload)` - Publish event
- `getLastEvent()` - Get most recent event
- `wasRecentlyEmitted(type, ms)` - Check recent emission

Location: `frontend/src/lib/services/gestureBus.ts`

---

### 4. Triple Lock (Price Selection)

Three-layer validation to prevent false triggers:

```
┌─────────────────────────────────────────────┐
│              TRIPLE LOCK                    │
├─────────────────────────────────────────────┤
│  Lock 1  │ Threshold │ Pinch < 0.035        │
│  Lock 2  │ Velocity  │ Hand moving < 0.3    │
│  Lock 3  │ Hold Time │ 350ms continuous     │
├─────────────────────────────────────────────┤
│  All three must be TRUE to lock price       │
└─────────────────────────────────────────────┘
```

---

### 5. Dynamic Island (Status Card)

Adapts to trading context:

```
┌─────────────────────────────────────────────────────┐
│                  DYNAMIC ISLAND                     │
├───────────┬───────────┬─────────────────────────────┤
│  Mode     │ Size      │ Content                     │
├───────────┼───────────┼─────────────────────────────┤
│  Compact  │ 320×90px  │ Ticker (Symbol + Price)     │
│  Expanded │ 340×100px │ Order confirmation (3s)     │
│  Live     │ 360×134px │ P&L tracking                │
│  Pending  │ 340×100px │ Amber pulse indicator       │
└───────────┴───────────┴─────────────────────────────┘
```

**Spring Configuration (Apple-like feel):**
```typescript
// Size spring
{ stiffness: 0.35, damping: 0.82 }

// Tilt spring (3D effect)
{ stiffness: 0.35, damping: 0.75 }
```

**3D Tilt Multipliers:**
- Horizontal: 25° max rotation
- Vertical: 20° max rotation

Location: `frontend/src/lib/components/UI/DynamicIsland.svelte`

---

## Configuration Reference

All thresholds in one place: `frontend/src/lib/config/`

### Gesture Thresholds (config/gestures.ts)

```typescript
PINCH_ENTER: 0.035        // Start pinching (tight)
PINCH_EXIT: 0.07          // Stop pinching (lenient)
PINCH_CONFIRM_MS: 80      // Hold time to confirm pinch
VELOCITY_STABLE: 0.3      // Max hand velocity for stable detection
THUMBS_UP_SCORE: 2.5      // Minimum score for thumbs up gesture

// Trading Timing
ENTRY_DELAY_MS: 200       // Before entering targeting mode
LOCK_DELAY_MS: 350        // Before locking price on pinch
CONFIRM_DELAY_MS: 400     // Before opening confirmation
ORDER_DELAY_MS: 500       // Before placing order
POST_LOCK_COOLDOWN: 400   // Cooldown after price lock

// Zoom
ZOOM_COOLDOWN_MS: 300     // Cooldown after zoom ends
ZOOM_MIN: 0.3             // Minimum zoom level
ZOOM_MAX: 3.0             // Maximum zoom level
ZOOM_AMPLIFY_POWER: 1.5   // Power factor for sensitivity
```

### EMA Smoothing Presets

```typescript
ULTRA_SMOOTH: 0.15   // Heavy smoothing, noticeable lag
SMOOTH: 0.3          // Balanced smoothing
BALANCED: 0.5        // Medium responsiveness
SNAPPY: 0.7          // Fast response (used for hands)
INSTANT: 0.9         // Minimal smoothing
```

### Trading Timing (config/timing.ts)

```typescript
ENTRY_DELAY_MS: 200       // Before entering targeting mode
LOCK_DELAY_MS: 350        // Before locking price on pinch
CONFIRM_DELAY_MS: 400     // Before opening confirmation
ORDER_DELAY_MS: 500       // Before placing order
POST_LOCK_COOLDOWN: 400   // Cooldown after price lock
```

### Polling Intervals

```typescript
PRICE_UPDATE_MS: 5000     // LTP updates every 5s
CANDLE_UPDATE_MS: 60000   // Candle data every 60s
POSITIONS_UPDATE_MS: 5000 // Positions every 5s
ORDERS_UPDATE_MS: 3000    // Orders every 3s
```

### MediaPipe Config

```typescript
// Hands
{
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
}

// Face Mesh
{
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
}
```

---

## Backend

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/config` | POST | Configure API credentials |
| `/api/kite/login` | POST | OAuth token exchange |
| `/api/kite/order` | POST | Place limit order |
| `/api/kite/positions` | GET | Current positions |
| `/api/kite/margins` | GET | Available margins |
| `/api/holdings` | GET | Portfolio holdings |
| `/quote/ltp/{symbol}` | GET | Last traded price |
| `/quote/quote/{symbol}` | GET | Full quote with OHLC |
| `/quote/candles/{symbol}` | GET | Historical candlesticks |
| `/ws` | WebSocket | Real-time price streaming |
| `/api/vault/status` | GET | Check if credentials exist + preview |
| `/api/vault/save` | POST | Encrypt and store credentials |
| `/api/vault/reset` | DELETE | Delete vault file |
| `/api/session/status` | GET | Full session state for frontend UI |
| `/api/session/login-url` | GET | Get Zerodha OAuth login URL |
| `/api/session/restore` | POST | Restore session from vault |
| `/api/session/logout` | DELETE | Clear session and token |

### KiteClient Singleton

```python
class KiteClient:
    _instance = None
    _token_cache = {}  # Instrument token cache

    def get_instrument_token(self, symbol, exchange="NSE"):
        key = f"{exchange}:{symbol}"
        if key in self._token_cache:
            return self._token_cache[key]  # Cache hit
        # Fetch and cache...
```

**Methods:**
- `configure(api_key, api_secret)` - Runtime re-configuration
- `login(request_token)` - OAuth token exchange
- `get_instrument_token(symbol, exchange)` - Cached token lookup
- `place_order(symbol, qty, price, type)` - Order placement
- `get_orders()` - Fetch day's orders
- `get_positions()` - Fetch current positions
- `get_margins()` - Fetch available margins

Location: `backend/app/kite_client.py`

---

## Security

### BYOK Credential Vault

API keys are stored encrypted in `.vault` file (not `.env`). Users enter credentials via the Control Center UI.

```
User enters API Key + Secret in Control Center
          │
          ▼
POST /api/vault/save
          │
          ├── Validate key format (6-64 alphanumeric)
          ├── Encrypt with Fernet (AES-128-CBC + HMAC)
          ├── Save to .vault file (chmod 0600)
          └── Auto-configure KiteClient backend
```

### Session Token Handling

```
Zerodha OAuth returns access_token
          │
          ▼
Encrypt with machine-derived key
(no password needed)
          │
          ▼
Save to .session file (chmod 0600)
          │
          ▼
On startup → KiteClient._try_restore_session()
          │
          ├── Load credentials from .vault
          ├── Load access_token from .session
          ├── Validate via kite.profile() API
          │
     ┌────┴────┐
     ▼         ▼
  Valid     Expired
     │         │
     ▼         ▼
 Continue   Clear .session
            Prompt re-login
```

### Session Status API

`GET /api/session/status` returns full state for frontend UI:
```json
{
    "active": true,
    "has_saved_session": true,
    "has_credentials": true,
    "configured": true,
    "api_key_preview": "x1y2"
}
```

**Machine-Derived Key:**
```python
machine_id = f"{platform.node()}:{platform.system()}:{uuid.getnode()}"
key = hashlib.pbkdf2_hmac('sha256', machine_id.encode(), SALT, 50000)
```

> **Zerodha tokens expire daily.** The app auto-validates on startup and clears stale tokens.

Location: `backend/app/security/vault.py`, `backend/app/kite_client.py`

---

## Safety Guards

| Guard | Purpose | Location |
|-------|---------|----------|
| **Rate Limiter** | Max 5 orders burst, 0.5/sec refill | `utils/RateLimiter.ts` |
| **Tab Guard** | Disable trading when tab inactive | `utils/TabGuard.ts` |
| **Device Guard** | Desktop-only, reject mobile | `utils/DeviceGuard.ts` |
| **Gesture Cooldowns** | Prevent rapid repeat triggers | `services/gestureEngine.ts` |

---

## Visual Styling

### Glassmorphism CSS

```css
.glass-component {
    background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0.05) 100%
    );
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border-radius: 16px;
    will-change: width, height, transform;
    contain: layout style;
}
```

### Blur by Component

| Component | Blur |
|-----------|------|
| DynamicIsland | 16px |
| DynamicConfirmZone | 12px |
| ETFSelector | 12px |
| ZoomIndicator | 8px |

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Violet | `#9d8aff` | Rim light, accents |
| Cyan | `#6ee7f9` | Fill light, highlights |
| Lavender | `#e8ddff` | Ambient light |
| Dark Purple-Gray | `#1a1625` | Floor material |
| Green-400 | `#4ade80` | Profit, bullish |
| Red-400 | `#f87171` | Loss, bearish |
| Cyan-400 | `#22d3ee` | Info, neutral |
| Amber-400 | `#fbbf24` | Pending, warning |

---

## 3D Lighting Setup

**Four-Point Lighting System:**

```typescript
// 1. Ambient Light - Base illumination
<T.AmbientLight intensity={0.8} color="#e8ddff" />

// 2. Key Light - Main directional
<T.DirectionalLight
    position={[40, 80, 60]}
    intensity={1.5}
    castShadow
    shadow.mapSize={[512, 512]}  // Optimized from 2048
/>

// 3. Rim Light - Purple accent
<T.PointLight
    position={[25, 10, -30]}
    intensity={2.0}
    color="#9d8aff"
    distance={150}
/>

// 4. Fill Light - Cyan accent
<T.PointLight
    position={[-20, 20, 40]}
    intensity={0.6}
    color="#6ee7f9"
    distance={100}
/>
```

### Camera Configuration

```typescript
<T.PerspectiveCamera
    makeDefault
    position={[x + parallaxX, y + parallaxY, z]}
    fov={55}
>
    <OrbitControls
        target={[25, 0, 0]}
        enableDamping
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
    />
</T.PerspectiveCamera>
```

**Parallax Multipliers:**
```typescript
parallaxX = cameraRotation.y * 15   // Horizontal
parallaxY = -cameraRotation.x * 10  // Vertical (inverted)
```

---

## What Worked

| Problem | Solution | Result |
|---------|----------|--------|
| Svelte springs laggy | Custom physics controller | 16ms response |
| Store subscriptions slow | Custom event bus | Sub-ms propagation |
| Gesture conflicts | Priority-based locking | No interference |
| MediaPipe jitter | EMA + 3-frame hysteresis | Stable detection |
| False price locks | Triple Lock validation | Rare false positives |
| Magic numbers everywhere | Centralized config | Single source of truth |
| Backend token latency | In-memory caching | Faster API calls |

---

## What Failed

| Attempt | Why It Failed | Alternative |
|---------|---------------|-------------|
| Svelte springs for camera | 200-500ms lag, frame stepping | AnimationController |
| Stores for 60fps updates | 16-32ms per subscription | GestureBus |
| Single pinch threshold | Too many false triggers | Triple Lock |
| Raw MediaPipe output | Constant flickering | EMA smoothing |
| CSS animations for 3D | No physics feel | Damped harmonic oscillator |

---

## Not Implemented (By Choice)

| Feature | Reason |
|---------|--------|
| InstancedMesh for candles | 50-100 candles work fine without it |
| Face tracking throttle (30fps) | 60fps gives smoother parallax |
| TradingController extraction | Reactive approach works, major refactor not needed |
| Market orders | Safety — limit orders only |
| Mobile support | Requires webcam + good lighting |

---

## Performance Optimizations

**✅ Implemented:**
- Shadow maps 2048→512px (75% VRAM savings)
- Event bus for gesture propagation
- RAF physics loop (bypasses Svelte)
- Instrument token caching
- CSS containment (`contain: layout style`)
- Will-change hints for animations

**⏳ Pending:**
- Face tracking throttle (60→30fps)
- InstancedMesh for candles
- Backend `@lru_cache`
- TypeScript strict mode

---

## Technical Debt

**Priority 1:**
- FaceTracker.svelte is 561 lines (should split to GestureClassifier)
- PriceTargetOverlay has complex reactive logic
- No automated tests

**Priority 2:**
- Type safety is partial (not strict mode)
- Logging is console.log (need structured logging)
- Error handling is basic try/catch

---

## Known Limitations

| Limitation | Impact |
|------------|--------|
| Single face only | Multi-user not supported |
| Requires good lighting | Hand detection fails in dark |
| Webcam required | Desktop only |
| Zerodha Kite API only | India-specific |
| Limit orders only | No market orders |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | SvelteKit 5.45.6, TypeScript 5.9.3 |
| Build | Vite 7.2.6 |
| 3D | Three.js 0.182.0, Threlte 8.3.1 |
| Tracking | MediaPipe Face/Hands 0.4.x |
| Styling | TailwindCSS 3.4.17 |
| Backend | FastAPI 0.109.0, Uvicorn 0.27.0 |
| Broker | Zerodha KiteConnect 5.0.1 |
| Encryption | Fernet (cryptography 44.x) |

---

## Quick Start (Dev)

```bash
# Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
```

---

## Key Files

| File | What It Does |
|------|--------------|
| `FaceTracker.svelte` | MediaPipe + gesture detection (561 lines) |
| `gestureEngine.ts` | Priority-based locking (242 lines) |
| `gestureBus.ts` | Instant event dispatch (146 lines) |
| `AnimationController.ts` | Physics-based camera (195 lines) |
| `DynamicIsland.svelte` | Context-aware status card |
| `config/gestures.ts` | All gesture thresholds |
| `config/timing.ts` | All timing constants |
| `kite_client.py` | Zerodha API wrapper with caching |
