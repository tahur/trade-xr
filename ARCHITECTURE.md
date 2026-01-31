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

## Data Flow

### Gesture → Action

```
Webcam Frame
    │
    ▼
MediaPipe (21 hand points, 468 face points)
    │
    ├──▶ EMA Smoothing (remove jitter)
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

### Order → Zerodha

```
User confirms with 👍/👎
    │
    ▼
OrderService (frontend)
    │
    ├──▶ Rate Limiter check
    ├──▶ Tab Guard check
    │
    ▼
POST /api/kite/order
    │
    ▼
KiteClient.place_order()
    │
    ▼
Zerodha API
```

---

## Core Components

### 1. Gesture Engine (Priority Locking)

Prevents gesture conflicts. Higher priority always wins.

```
┌─────────────────────────────────────────────┐
│              GESTURE CONTEXTS               │
├─────────────────────────────────────────────┤
│  ZOOMING     │ Priority 3 │ Two-hand pinch  │
│  CONFIRMING  │ Priority 2 │ Buy/Sell active │
│  TRADING     │ Priority 1 │ Price selection │
│  IDLE        │ Priority 0 │ Default state   │
└─────────────────────────────────────────────┘

Rules:
• Higher priority interrupts lower
• 300ms cooldown after zoom ends
• Single owner per context
```

Location: `frontend/src/lib/services/gestureEngine.ts`

---

### 2. GestureBus (Event System)

Svelte stores add 16-32ms delay per subscription. For 60fps updates, that's too slow.

GestureBus provides sub-millisecond event propagation:

```typescript
gestureBus.emit('ZOOM_UPDATE', { zoomFactor: 1.5 });
gestureBus.on('ZOOM_UPDATE', (event) => { /* instant */ });
```

Events: `ZOOM_START`, `ZOOM_UPDATE`, `ZOOM_END`, `PINCH_HOLD`, `VICTORY_DETECTED`, etc.

Location: `frontend/src/lib/services/gestureBus.ts`

---

### 3. AnimationController (Physics Camera)

Custom physics engine using damped harmonic oscillators:

```
F = -stiffness × displacement - damping × velocity
```

Config:
```
stiffness: 220  (snappy response)
damping:    20  (no overshoot)
mass:      1.2  (slight momentum)
```

Why: Svelte springs caused 200-500ms lag. This achieves 16ms response time.

Location: `frontend/src/lib/controllers/AnimationController.ts`

---

### 4. Dynamic Island (Status Card)

Adapts to trading context:

```
┌─────────────────────────────────────────────────────┐
│                  DYNAMIC ISLAND                     │
├─────────────────────────────────────────────────────┤
│  Mode     │ Size      │ Content                     │
├───────────┼───────────┼─────────────────────────────┤
│  Compact  │ 320×90px  │ Ticker (Symbol + Price)     │
│  Expanded │ 340×100px │ Order confirmation          │
│  Live     │ 360×134px │ P&L tracking                │
│  Pending  │ 340×100px │ Amber pulse indicator       │
└─────────────────────────────────────────────────────┘

State transitions:
• Compact → Expanded (order placed, 3s timeout)
• Compact → Live (position opened)
• Compact → Pending (order pending)
```

Location: `frontend/src/lib/components/UI/DynamicIsland.svelte`

---

### 5. Triple Lock (Price Selection)

Three-layer validation to prevent false triggers:

```
┌─────────────────────────────────────────────┐
│              TRIPLE LOCK                    │
├─────────────────────────────────────────────┤
│  Lock 1  │ Threshold │ Pinch < 0.035        │
│  Lock 2  │ Velocity  │ Hand nearly still    │
│  Lock 3  │ Hold Time │ 450ms continuous     │
├─────────────────────────────────────────────┤
│  All three must be TRUE to lock price       │
└─────────────────────────────────────────────┘
```

---

## Backend

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/config` | POST | Save API credentials |
| `/api/kite/order` | POST | Place limit order |
| `/api/kite/positions` | GET | Current positions |
| `/api/holdings` | GET | Portfolio holdings |
| `/quote/ltp/{symbol}` | GET | Last traded price |
| `/quote/candles/{symbol}` | GET | Historical candles |
| `/api/vault/save` | POST | Encrypt and store credentials |
| `/api/vault/load` | POST | Decrypt credentials |
| `/api/session/status` | GET | Check session status |
| `/api/session/restore` | POST | Restore from vault |

### KiteClient Singleton

Wraps Zerodha SDK with instrument token caching:

```python
class KiteClient:
    _instance = None
    _token_cache = {}

    def get_instrument_token(self, symbol):
        if symbol in self._token_cache:
            return self._token_cache[symbol]  # cache hit
        # fetch and cache...
```

Location: `backend/app/kite_client.py`

---

## Security

### Credential Storage (Vault)

```
┌─────────────────────────────────────────────────────┐
│                 CREDENTIAL FLOW                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  User enters API Key + Secret + Master Password    │
│                         │                           │
│                         ▼                           │
│              Fernet Encrypt (AES-128)               │
│                         │                           │
│                         ▼                           │
│              Save to .vault file                    │
│                                                     │
│  Master password is NEVER stored                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Session Persistence

```
┌─────────────────────────────────────────────────────┐
│                SESSION TOKEN FLOW                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Zerodha returns access_token                       │
│                         │                           │
│                         ▼                           │
│  Encrypt with machine-derived key                   │
│  (platform + MAC address, no password needed)       │
│                         │                           │
│                         ▼                           │
│  Save to .session file                              │
│                                                     │
│  On page refresh → auto-restore (same machine only) │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Location: `backend/app/security/vault.py`

---

## Safety Guards

| Guard | Purpose | Location |
|-------|---------|----------|
| **Rate Limiter** | Max 5 orders burst, 0.5/sec refill | `utils/RateLimiter.ts` |
| **Tab Guard** | Disable trading when tab inactive | `utils/TabGuard.ts` |
| **Device Guard** | Desktop-only, reject mobile | `utils/DeviceGuard.ts` |
| **Gesture Cooldowns** | Prevent rapid repeat triggers | `services/gestureEngine.ts` |

---

## Gesture Configuration

All thresholds in one place: `frontend/src/lib/config/`

### Gesture Thresholds

```typescript
// gestures.ts
PINCH_ENTER: 0.035          // tight pinch to enter
PINCH_EXIT: 0.07            // hysteresis to exit
VELOCITY_STABLE: 0.3        // hand must be still
LOCK_DELAY_MS: 450          // hold time for price lock
TWO_HAND_ENTER_FRAMES: 3    // frames to confirm zoom
TWO_HAND_EXIT_FRAMES: 2     // frames to exit zoom
```

### EMA Smoothing

```typescript
EMA_ALPHA: 0.7  // higher = snappier, lower = smoother
```

### MediaPipe Config

```typescript
// Hands
{ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5 }

// Face
{ maxNumFaces: 1, refineLandmarks: true, minTrackingConfidence: 0.5 }
```

---

## Project Structure

```
tradexr/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry
│   │   ├── kite_client.py       # Zerodha wrapper (singleton)
│   │   ├── routes/
│   │   │   ├── orders.py        # Order endpoints
│   │   │   ├── quote.py         # Price data
│   │   │   ├── vault.py         # Credential storage
│   │   │   └── session.py       # Session management
│   │   └── security/
│   │       └── vault.py         # Fernet encryption
│   └── requirements.txt
│
├── frontend/
│   └── src/lib/
│       ├── config/              # All thresholds
│       │   ├── gestures.ts
│       │   ├── timing.ts
│       │   └── api.ts
│       ├── controllers/
│       │   └── AnimationController.ts
│       ├── services/
│       │   ├── gestureBus.ts
│       │   ├── gestureEngine.ts
│       │   ├── orderService.ts
│       │   └── kite.ts
│       ├── stores/
│       │   ├── tracking.ts
│       │   ├── gesture.ts
│       │   ├── trading.ts
│       │   ├── holdings.ts
│       │   └── dynamicIsland.ts
│       ├── utils/
│       │   ├── TabGuard.ts
│       │   ├── DeviceGuard.ts
│       │   └── RateLimiter.ts
│       └── components/
│           ├── Tracking/FaceTracker.svelte
│           ├── UI/
│           │   ├── DynamicIsland.svelte
│           │   ├── GestureGuide.svelte
│           │   └── PriceTargetOverlay.svelte
│           └── Scene3D/Scene3D.svelte
```

---

## What Worked

| Problem | Solution | Result |
|---------|----------|--------|
| Svelte springs laggy | Custom physics controller | 16ms response |
| Store subscriptions slow | Custom event bus | Sub-ms propagation |
| Gesture conflicts | Priority-based locking | No more interference |
| MediaPipe jitter | EMA + 3-frame hysteresis | Stable detection |
| False price locks | Triple Lock validation | Rare false positives |

---

## What Failed

| Attempt | Why It Failed | Alternative |
|---------|---------------|-------------|
| Svelte springs for camera | 200-500ms lag, frame stepping | AnimationController |
| Stores for 60fps updates | 16-32ms per subscription | GestureBus |
| Single pinch threshold | Too many false triggers | Triple Lock |
| Raw MediaPipe output | Constant flickering | EMA smoothing |

---

## Not Implemented (By Choice)

| Feature | Reason |
|---------|--------|
| InstancedMesh for candles | 50-100 candles work fine without it |
| Face tracking throttle | 60fps gives smoother parallax |
| Market orders | Safety — limit orders only |
| Mobile support | Requires webcam + good lighting |

---

## Performance Optimizations

✅ Implemented:
- Shadow maps 2048→512px (75% VRAM savings)
- Event bus for gesture propagation
- RAF physics loop (bypasses Svelte)
- Instrument token caching
- CSS containment for isolated repaints

⏳ Pending:
- Face tracking throttle (60→30fps)
- InstancedMesh for candles
- Backend LRU cache

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | SvelteKit 5, TypeScript |
| 3D | Three.js, Threlte |
| Tracking | MediaPipe (Google) |
| Backend | FastAPI, Python |
| Broker | Zerodha KiteConnect |
| Encryption | Fernet (AES-128) |

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
| `FaceTracker.svelte` | MediaPipe + gesture detection |
| `gestureEngine.ts` | Priority-based locking |
| `gestureBus.ts` | Instant event dispatch |
| `AnimationController.ts` | Physics-based camera |
| `config/gestures.ts` | All thresholds |
