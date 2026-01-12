# HoloTrade Implementation Roadmap 🗺️

> **Goal**: Build a 3D candlestick trading interface with face tracking perspective and gesture-based order placement, powered by Zerodha Kite API.

---

## 📅 Timeline Overview

| Phase | Name | Duration | Status |
|-------|------|----------|--------|
| 0 | Project Setup | 1 day | ⬜ Not Started |
| 1 | 3D Chart with Mock Data | 5 days | ⬜ Not Started |
| 2 | Face Tracking | 4 days | ⬜ Not Started |
| 3 | Gesture Controls | 5 days | ⬜ Not Started |
| 4 | Trading UI (Mock) | 3 days | ✅ Complete |
| 5 | Kite API Integration | 4 days | ⬜ Not Started |
| 6 | Real-time Streaming | 3 days | ⬜ Not Started |
| 7 | Polish & Safety | 3 days | ⬜ Not Started |

**Total Estimated Time**: ~4 weeks

> **Strategy**: Build everything with mock data first → Test all features → Integrate Kite API last

---

## Phase 0: Project Setup (Day 1)

### Objectives
- Initialize SvelteKit project with all dependencies
- Set up development environment
- Create base project structure

### Tasks

- [ ] **0.1** Create SvelteKit project
  ```bash
  npx -y sv create frontend
  ```

- [ ] **0.2** Install core dependencies
  ```bash
  npm install three @threlte/core @threlte/extras
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```

- [ ] **0.3** Install tracking dependencies
  ```bash
  npm install @mediapipe/face_mesh @mediapipe/hands @mediapipe/camera_utils
  ```

- [ ] **0.4** Set up Python backend
  ```bash
  mkdir backend && cd backend
  python -m venv venv
  pip install fastapi uvicorn kiteconnect python-dotenv websockets
  ```

- [ ] **0.5** Create folder structure
  ```
  frontend/src/lib/components/
  frontend/src/lib/stores/
  frontend/src/lib/services/
  backend/app/routes/
  backend/app/services/
  ```

- [ ] **0.6** Configure Tailwind with dark theme defaults

- [ ] **0.7** Create `.env.example` files for both frontend and backend

### Deliverables
✅ Running SvelteKit dev server  
✅ Running FastAPI backend  
✅ Tailwind configured  
✅ Git repository initialized

---

## Phase 1: 3D Chart with Mock Data (Days 2-6)

### Objectives
- Render candlesticks as 3D objects using mock data
- Implement camera controls
- Add time and price axes

### Tasks

#### Mock Data Setup
- [ ] **1.1** Create mock OHLCV data generator
  ```javascript
  // lib/services/mockData.js
  export function generateCandles(count = 100) {
    let price = 1000;
    return Array.from({ length: count }, (_, i) => {
      const open = price;
      const change = (Math.random() - 0.5) * 20;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 10;
      const low = Math.min(open, close) - Math.random() * 10;
      price = close;
      return { open, high, low, close, volume: Math.random() * 1000000 };
    });
  }
  ```

#### 3D Scene Setup
- [ ] **1.2** Create `<Canvas>` with Threlte
  ```svelte
  <Canvas>
    <T.PerspectiveCamera position={[0, 5, 10]} />
    <OrbitControls />
  </Canvas>
  ```

- [ ] **1.3** Create `<Candle>` component
  - Props: `open`, `high`, `low`, `close`, `index`
  - Green box for bullish (close > open)
  - Red box for bearish (close < open)
  - Thin cylinder for wick (high-low)

- [ ] **1.4** Create `<CandlestickChart>` component
  - Accept array of OHLCV data
  - Render multiple `<Candle>` components
  - Position along Z-axis (time)

- [ ] **1.5** Add volume bars (optional)
  - Semi-transparent bars on floor
  - Height = volume

#### Axes & Grid
- [ ] **1.6** Create price axis (Y-axis)
  - Show price labels
  - Horizontal grid lines

- [ ] **1.7** Create time axis (Z-axis)
  - Show time/date labels
  - Vertical grid lines

- [ ] **1.8** Add floor grid
  ```svelte
  <T.GridHelper args={[100, 100]} />
  ```

#### Camera Controls
- [ ] **1.9** Implement OrbitControls
  - Mouse drag to rotate
  - Scroll to zoom
  - Right-click to pan

- [ ] **1.10** Add camera presets
  - Front view (classic chart view)
  - Side view (depth perspective)
  - Top view (heatmap style)

### Deliverables
✅ 3D candlesticks rendered from mock data  
✅ Interactive camera controls  
✅ Price and time axes visible

### Visual Reference
```
        ▲ Price (Y)
        │
        │    ┌─┐
        │    │ │  ┌─┐
        │  ┌─┤ ├──┤ │
        │  │ │ │  │ │
        │  └─┴─┘  └─┘
        │
        └──────────────► Time (Z)
       /
      ▼ Depth (X)
```

---

## Phase 2: Face Tracking (Days 7-10)

### Objectives
- Track user's head position via webcam
- Shift 3D camera based on head movement
- Create parallax "window" effect

### Tasks

#### MediaPipe Setup
- [ ] **2.1** Create `<FaceTracker>` component
  - Initialize webcam stream
  - Load MediaPipe Face Mesh model

- [ ] **2.2** Extract head position
  ```javascript
  // Get nose landmark as center point
  const nose = results.multiFaceLandmarks[0][1];
  const headX = (nose.x - 0.5) * 2; // -1 to 1
  const headY = (nose.y - 0.5) * 2; // -1 to 1
  ```

- [ ] **2.3** Create tracking store
  ```javascript
  export const headPosition = writable({ x: 0, y: 0, z: 0 });
  ```

#### Camera Integration
- [ ] **2.4** Apply head position to 3D camera
  ```javascript
  camera.position.x = baseX + headX * sensitivity;
  camera.position.y = baseY + headY * sensitivity;
  ```

- [ ] **2.5** Add smoothing/interpolation
  - Lerp between positions
  - Prevent jittery movement

- [ ] **2.6** Add sensitivity controls
  - Slider to adjust responsiveness
  - Toggle to enable/disable

- [ ] **2.7** Optimize performance
  - Run in Web Worker if possible
  - Lower face mesh resolution
  - Throttle to 30fps

### Deliverables
✅ Head movement shifts chart perspective  
✅ Smooth, non-jittery tracking  
✅ Toggle and sensitivity controls

### Sensitivity Settings
| Level | Description | Use Case |
|-------|-------------|----------|
| Low | Subtle movement | Focus on trading |
| Medium | Natural feel | Default |
| High | Dramatic parallax | Demo/presentation |

---

## Phase 3: Gesture Controls (Days 11-15)

### Objectives
- Detect hand gestures via webcam
- Implement pinch-to-select price
- Add gesture-based order placement (mock)

### Tasks

#### MediaPipe Hands Setup
- [ ] **3.1** Create `<GestureController>` component
  - Initialize hand tracking
  - Detect both hands

- [ ] **3.2** Implement pinch detection
  ```javascript
  const thumb = landmarks[4];
  const index = landmarks[8];
  const distance = Math.hypot(thumb.x - index.x, thumb.y - index.y);
  const isPinching = distance < 0.05;
  ```

- [ ] **3.3** Create gesture store
  ```javascript
  export const gesture = writable({
    isPinching: false,
    pinchDistance: 0,
    handPosition: { x: 0, y: 0 }
  });
  ```

#### Price Selection
- [ ] **3.4** Map pinch distance to price
  - Wider spread = higher price
  - Closer pinch = lower price
  - Snap to tick size (₹0.05)

- [ ] **3.5** Visual price indicator
  - Floating price display follows hand
  - Green for buy, red for sell

- [ ] **3.6** Gesture-to-action mapping
  | Gesture | Action |
  |---------|--------|
  | Pinch start | Open order mode |
  | Spread fingers | Increase price |
  | Close fingers | Decrease price |
  | Hold 2 sec | Confirm order |
  | Open palm | Cancel |
  | Swipe left | Sell mode |
  | Swipe right | Buy mode |

#### Safety Features
- [ ] **3.7** Add confirmation delay
  - 2-second hold before execution
  - Visual countdown indicator

- [ ] **3.8** Add cancel gesture
  - Open palm = cancel
  - Shake hand = cancel

- [ ] **3.9** Add cooldown period
  - 3 seconds between orders
  - Prevent accidental double-orders

### Deliverables
✅ Pinch gesture adjusts price  
✅ Visual feedback for gestures  
✅ Confirmation before mock order

---

## Phase 4: Trading UI with Mock Orders (Days 16-18)

### Objectives
- Create order panel UI
- Implement mock buy/sell flow
- Show mock order status and positions

### Tasks

#### Order Panel
- [x] **4.1** Create `<OrderPanel>` component
  - Show: Symbol, LTP, Quantity, Price
  - Buy/Sell buttons
  - Order type: Market/Limit

- [x] **4.2** Create quantity selector
  - +/- buttons or slider
  - Lot size awareness

- [x] **4.3** Create order preview
  - Estimated total (price × quantity)
  - Margin required (mock)

#### Mock Order Service
- [x] **4.4** Create mock order service
  ```javascript
  // lib/services/mockOrders.js
  export function placeMockOrder(order) {
    return {
      orderId: Date.now(),
      status: 'COMPLETE',
      ...order
    };
  }
  ```

- [x] **4.5** Create positions store
  ```javascript
  export const positions = writable([]);
  export const orders = writable([]);
  ```

#### Frontend Order Flow
- [x] **4.6** Implement order placement
  - Gesture trigger → Open panel
  - Adjust price → Update preview
  - Confirm → Place mock order

- [x] **4.7** Show order confirmation
  - Success/failure toast
  - Order ID display

- [x] **4.8** Create positions panel
  - Current holdings (mock)
  - Unrealized P&L (mock)

### Deliverables
✅ Full trading UI working with mock data  
✅ Gesture-triggered orders (mock)  
✅ Positions panel with fake data

---

## Phase 5: Kite API Integration (Days 19-22)

### Objectives
- Implement Zerodha OAuth login flow
- Fetch real historical candlestick data
- Replace mock orders with real API

### Tasks

#### Backend Setup
- [ ] **5.1** Create FastAPI server
  ```python
  # backend/app/main.py
  from fastapi import FastAPI
  from fastapi.middleware.cors import CORSMiddleware
  app = FastAPI()
  ```

- [ ] **5.2** Create `/auth/login` endpoint
  - Generate Kite login URL with API key
  - Redirect user to Zerodha login page

- [ ] **5.3** Create `/auth/callback` endpoint
  - Receive `request_token` from Zerodha
  - Exchange for `access_token`
  - Store token securely

- [ ] **5.4** Create `/data/historical` endpoint
  - Accept: `symbol`, `interval`, `from_date`, `to_date`
  - Return: OHLCV candlestick data as JSON

- [ ] **5.5** Create `/data/instruments` endpoint
  - Fetch and cache instrument list
  - Enable symbol search

#### Order Endpoints
- [ ] **5.6** Create `/orders/place` endpoint
  ```python
  @app.post("/orders/place")
  def place_order(symbol, quantity, price, order_type, transaction_type):
      kite.place_order(...)
  ```

- [ ] **5.7** Create `/orders/status` endpoint
  - Get order status by order_id

- [ ] **5.8** Create `/positions` endpoint
  - Get current positions
  - Show P&L

#### Frontend Integration
- [ ] **5.9** Create `kiteApi.js` service
  - Methods: `login()`, `getHistorical()`, `placeOrder()`

- [ ] **5.10** Replace mock data with API calls
  - Switch data source based on auth state
  - Fallback to mock if not logged in

- [ ] **5.11** Create login flow UI
  - Login button
  - OAuth callback handling

### Deliverables
✅ User can login via Zerodha  
✅ Real historical data displayed  
✅ Real orders can be placed

### API Endpoints Summary
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/auth/login` | Redirect to Kite login |
| GET | `/auth/callback` | Handle OAuth callback |
| GET | `/data/historical` | Fetch OHLCV data |
| GET | `/data/instruments` | Search symbols |
| POST | `/orders/place` | Place order |
| GET | `/positions` | Get positions |

---

## Phase 6: Real-time Streaming (Days 23-25)

### Objectives
- Connect to Kite WebSocket for live ticks
- Update 3D chart in real-time
- Handle connection drops gracefully

### Tasks

#### Backend WebSocket Relay
- [ ] **6.1** Create WebSocket endpoint `/ws`
  - Accept client connections
  - Subscribe to Kite Ticker for requested symbols

- [ ] **6.2** Implement Kite Ticker integration
  ```python
  from kiteconnect import KiteTicker
  kws = KiteTicker(api_key, access_token)
  kws.on_ticks = on_ticks
  ```

- [ ] **6.3** Relay ticks to frontend
  - Format: `{ symbol, ltp, volume, timestamp }`

- [ ] **6.4** Handle reconnection logic
  - Auto-reconnect on disconnect
  - Exponential backoff

#### Frontend WebSocket
- [ ] **6.5** Create `websocket.js` service
  ```javascript
  const ws = new WebSocket('ws://localhost:8000/ws');
  ws.onmessage = (event) => { ... };
  ```

- [ ] **6.6** Create Svelte store for live data
  ```javascript
  export const liveTick = writable({ ltp: 0, volume: 0 });
  ```

- [ ] **6.7** Update latest candle in real-time
  - Modify last candle's close price
  - Animate color change (green/red pulse)

- [ ] **6.8** Add new candle when interval completes
  - Push new candle to chart
  - Shift view to show latest

### Deliverables
✅ Live price updates in 3D  
✅ Smooth candle animations  
✅ Auto-reconnect on network issues

---

## Phase 7: Polish & Safety (Days 26-28)

### Objectives
- Add comprehensive error handling
- Implement safety guardrails
- Optimize performance

### Tasks

#### Error Handling
- [ ] **7.1** API error handling
  - Network failures
  - Rate limit errors
  - Invalid token errors

- [ ] **7.2** Tracking error handling
  - Camera permission denied
  - Face/hand not detected
  - Poor lighting warning

- [ ] **7.3** User-friendly error messages
  - Toast notifications
  - Retry options

#### Safety Features
- [ ] **7.4** Daily loss limit
  - Configurable max loss
  - Block orders when limit reached

- [ ] **7.5** Order size limits
  - Max quantity per order
  - Max orders per minute

- [ ] **7.6** Session security
  - Auto-logout after 15min idle
  - Require re-authentication for large orders

- [ ] **7.7** Audio feedback
  - Order placed sound
  - Error sound
  - Confirmation beep

#### Performance
- [ ] **7.8** Optimize 3D rendering
  - Geometry instancing
  - Level of Detail (LOD)
  - Frustum culling

- [ ] **7.9** Optimize tracking
  - Lower resolution for tracking
  - Web Worker for MediaPipe

- [ ] **7.10** Bundle optimization
  - Code splitting
  - Lazy load tracking modules

#### Documentation
- [ ] **7.11** Create user guide
  - Gesture reference
  - Keyboard shortcuts

- [ ] **7.12** Create API documentation
  - Endpoint reference
  - Error codes

### Deliverables
✅ Robust error handling  
✅ Safety limits in place  
✅ Smooth 60fps performance  
✅ User documentation

---

## 🎯 Milestones Summary

| Milestone | Criteria | Target Date |
|-----------|----------|-------------|
| **M1: First Candle** | 3D candle renders with mock data | Day 3 |
| **M2: Chart Complete** | Full 3D chart with camera controls | Day 6 |
| **M3: Face Works** | Head tracking shifts perspective | Day 10 |
| **M4: Gesture Works** | Pinch detected and mapped | Day 15 |
| **M5: Mock Trading** | Full trading UI with mock orders | Day 18 |
| **M6: Kite Connected** | Real data + orders via Zerodha | Day 22 |
| **M7: Live Streaming** | Real-time WebSocket updates | Day 25 |
| **M8: Production Ready** | All safety features complete | Day 28 |

---

## 🔧 Development Commands

```bash
# Start frontend
cd frontend && npm run dev

# Start backend
cd backend && uvicorn app.main:app --reload

# Run both (with tmux)
tmux new-session -d -s dev 'cd frontend && npm run dev'
tmux split-window -h 'cd backend && uvicorn app.main:app --reload'
tmux attach -t dev
```

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Frame rate | 60 fps stable |
| Face tracking latency | < 50ms |
| Gesture recognition accuracy | > 95% |
| Order placement latency | < 500ms |
| False positive gestures | < 1% |

---

## 🚨 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Kite API changes | Abstract API layer, easy to swap |
| Browser compatibility | Test on Chrome, Firefox, Safari |
| Gesture misfires | 2-sec confirmation, cooldown |
| Performance issues | Progressive enhancement, fallbacks |

---

*Last Updated: January 2026*
