# HoloTrade 🎯

**Immersive 3D Trading Experience with Face Tracking & Gesture Controls**

A next-generation trading interface that renders candlestick charts in 3D, tracks your face to shift perspective dynamically, and lets you execute trades using hand gestures — all powered by Zerodha Kite API.

![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![Platform](https://img.shields.io/badge/Platform-Web-blue)
![Broker](https://img.shields.io/badge/Broker-Zerodha%20Kite-orange)

---

## ✨ Features

- **3D Candlestick Charts** — Visualize OHLC data as immersive 3D objects
- **Face Tracking Perspective** — Move your head to look around the chart naturally
- **Gesture Trading** — Pinch to adjust price, release to place orders
- **Real-time Streaming** — Live price updates via Kite WebSocket
- **Multi-timeframe Support** — Switch between 1m, 5m, 15m, 1h, 1D candles

---

## 🛠️ Technical Stack

### Frontend — 3D Visualization

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | SvelteKit | Simple, fast, reactive framework |
| **3D Engine** | Threlte (Three.js for Svelte) | Declarative 3D candlestick charts |
| **Gesture Library** | MediaPipe Hands | Hand gesture detection (pinch) |
| **Face Tracking** | MediaPipe Face Mesh | Head position for perspective shift |
| **State Management** | Svelte Stores | Built-in reactive state |
| **Styling** | Tailwind CSS | Utility-first, rapid UI development |

### Backend

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Layer** | Python FastAPI | Zerodha API proxy & WebSocket relay |
| **WebSocket** | Socket.io / FastAPI WebSockets | Real-time price streaming |
| **Zerodha SDK** | KiteConnect Python | Order placement, historical data |
| **Session Store** | Redis (optional) | Token caching |

### Dev Tools

| Tool | Purpose |
|------|---------|
| Vite | Fast frontend bundling |
| ESLint + Prettier | Code quality |
| pytest | Backend testing |

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICE                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Camera     │  │  MediaPipe   │  │   React + Three.js   │   │
│  │   Feed       │──│  Processing  │──│   3D Candlestick     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Gesture & Face Tracking Engine              │   │
│  │  • Face position → Camera offset                         │   │
│  │  • Pinch gesture → Order placement                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND SERVER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   FastAPI    │  │  Kite SDK    │  │   WebSocket Relay    │   │
│  │   Routes     │──│  Integration │──│   (Tick Streaming)   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                     ZERODHA KITE API                             │
│  • Authentication (OAuth)                                        │
│  • Historical Data                                               │
│  • Order Placement                                               │
│  • Live Tick Streaming                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Components

### 1. 3D Candlestick Rendering

```
┌─────────────────────────────────────┐
│  3D Scene                           │
│  ┌─────────────────────────────────┐│
│  │ Candlesticks as 3D boxes        ││
│  │ • Green = Bullish (price up)    ││
│  │ • Red = Bearish (price down)    ││
│  │ • Wick = Thin cylinder          ││
│  │ • Volume = Floor bars (depth)   ││
│  └─────────────────────────────────┘│
│  Camera follows face position       │
└─────────────────────────────────────┘
```

**Candle Structure:**
- **Body** — 3D box representing Open-Close range
- **Wick** — Thin cylinder for High-Low range
- **Volume** — Semi-transparent bars on the floor plane
- **Time Axis** — Z-depth representing time progression

### 2. Face Tracking Perspective

- Tracks head position (X, Y, Z) using front camera
- Maps movement to 3D camera offset
- Creates parallax "window into another world" effect
- Smoothing algorithm to prevent jitter

### 3. Pinch Gesture Trading

| Gesture | Action |
|---------|--------|
| Pinch start | Open order modal at current price |
| Spread fingers | Increase price (for limit orders) |
| Pinch closer | Decrease price |
| Hold 2 seconds | Confirm order placement |
| Open palm | Cancel order |

---

## ⚠️ Challenges & Solutions

### 1. Zerodha API Limitations

| Challenge | Impact | Solution |
|-----------|--------|----------|
| Rate limits (3 req/sec) | Cannot fetch real-time for many stocks | Use Kite Ticker WebSocket for streaming |
| Session expiry (1 day) | Breaks live trading | Auto-refresh access token |
| API access cost (₹2000/month) | Barrier to entry | Required investment for live trading |
| No sandbox environment | Can't test without real orders | Build mock server for development |

### 2. 3D Performance

| Challenge | Impact | Solution |
|-----------|--------|----------|
| Rendering 500+ candles | Frame drops, GPU strain | Level-of-Detail (LOD), geometry instancing |
| Real-time updates | Constant re-renders | Batch updates, throttle to 60fps |
| Mobile devices | Limited GPU power | Reduce candle count, simpler shaders |
| Memory leaks | Browser crashes | Proper Three.js disposal |

### 3. Face Tracking Accuracy

| Challenge | Impact | Solution |
|-----------|--------|----------|
| Poor lighting | Lost tracking | Add tolerance thresholds, interpolation |
| Glasses/masks | Detection failures | MediaPipe's robust model handles most cases |
| Processing latency (30-60ms) | Laggy perspective | Predictive smoothing, Web Workers |
| CPU competition | Slows 3D rendering | Run MediaPipe in separate worker thread |

### 4. Gesture Recognition

| Challenge | Impact | Solution |
|-----------|--------|----------|
| Accidental triggers | Unintended orders | Require 2-sec hold before execution |
| Pinch precision | Hard to set exact price | Snap to tick size (₹0.05 increments) |
| Hand occlusion | Fingers blocking camera | Multi-landmark validation |
| Fatigue | Arm gets tired | Support keyboard shortcuts as fallback |

### 5. Trading Safety

| Challenge | Impact | Solution |
|-----------|--------|----------|
| Gesture misfire | Financial loss | Visual+audio confirmation before order |
| Network latency | Order at wrong price | Show live price preview, use limit orders |
| Session hijacking | Unauthorized trades | Encrypted tokens, auto-logout on idle |

---

## 📦 Project Structure

```
holotrade/
├── frontend/
│   ├── static/
│   │   └── models/            # 3D assets (if any)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── Chart3D/
│   │   │   │   │   ├── CandlestickChart.svelte
│   │   │   │   │   ├── Candle.svelte
│   │   │   │   │   └── VolumeBar.svelte
│   │   │   │   ├── Tracking/
│   │   │   │   │   ├── FaceTracker.svelte
│   │   │   │   │   └── GestureController.svelte
│   │   │   │   ├── Trading/
│   │   │   │   │   ├── OrderPanel.svelte
│   │   │   │   │   └── PriceSlider.svelte
│   │   │   │   └── UI/
│   │   │   │       ├── Header.svelte
│   │   │   │       └── Watchlist.svelte
│   │   │   ├── stores/
│   │   │   │   ├── trading.js
│   │   │   │   └── tracking.js
│   │   │   └── services/
│   │   │       ├── kiteApi.js
│   │   │       └── websocket.js
│   │   ├── routes/
│   │   │   ├── +page.svelte       # Main trading view
│   │   │   ├── +layout.svelte
│   │   │   └── callback/
│   │   │       └── +page.svelte   # Kite OAuth callback
│   │   └── app.html
│   ├── package.json
│   ├── svelte.config.js
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app
│   │   ├── routes/
│   │   │   ├── auth.py         # Kite OAuth flow
│   │   │   ├── data.py         # Historical data
│   │   │   └── orders.py       # Order placement
│   │   ├── services/
│   │   │   ├── kite_service.py
│   │   │   └── websocket_relay.py
│   │   └── config.py
│   ├── requirements.txt
│   └── .env.example
│
├── docs/
│   ├── SETUP.md
│   ├── API.md
│   └── GESTURES.md
│
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## 🚀 Development Phases

| Phase | Duration | Deliverables | Status |
|-------|----------|--------------|--------|
| **Phase 1: Foundation** | 1 week | Kite API integration, auth flow, data fetch | ⬜ |
| **Phase 2: 3D Chart** | 2 weeks | Static 3D candlestick rendering with controls | ⬜ |
| **Phase 3: Live Data** | 1 week | Real-time WebSocket streaming in 3D | ⬜ |
| **Phase 4: Face Tracking** | 1 week | Perspective shift based on head position | ⬜ |
| **Phase 5: Gestures** | 2 weeks | Pinch-to-trade with confirmation flow | ⬜ |
| **Phase 6: Polish** | 1 week | Error handling, rate limiting, safety checks | ⬜ |

---

## 🔧 Setup Instructions

### Prerequisites

- Node.js 18+
- Python 3.10+
- Zerodha Kite Connect API subscription
- Webcam (for face/gesture tracking)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Add your Kite API credentials to .env

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

> **Note**: If starting fresh, create with:
> ```bash
> npx -y sv create frontend
> cd frontend
> npm install three @threlte/core @threlte/extras
> npx -y @tailwindcss/cli init
> ```

### Kite API Credentials

1. Log in to [Kite Connect Developer Console](https://developers.kite.trade/)
2. Create a new app
3. Note your `API Key` and `API Secret`
4. Set redirect URL to `http://localhost:5173/callback`
5. Add credentials to `backend/.env`

---

## 🎮 Controls

| Input | Action |
|-------|--------|
| **Mouse Drag** | Rotate chart view |
| **Scroll** | Zoom in/out |
| **Head Movement** | Perspective shift (when enabled) |
| **Pinch Gesture** | Open order at current price |
| **Spread/Close Fingers** | Adjust limit price |
| **Hold 2 sec** | Confirm order |
| **Open Palm** | Cancel order |
| **Keyboard B** | Quick Buy at market |
| **Keyboard S** | Quick Sell at market |
| **Keyboard Esc** | Cancel current action |

---

## 📋 Environment Variables

```env
# Backend (.env)
KITE_API_KEY=your_api_key
KITE_API_SECRET=your_api_secret
KITE_REDIRECT_URL=http://localhost:5173/callback
SECRET_KEY=your_jwt_secret

# Frontend (.env)
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

---

## 🔒 Safety Features

- **Order Confirmation**: 2-second hold required before execution
- **Price Preview**: Shows estimated fill price before confirming
- **Daily Loss Limit**: Configurable max loss per day
- **Gesture Cooldown**: 3-second delay between orders
- **Audio Alerts**: Sound feedback for order placement
- **Session Timeout**: Auto-logout after 15 minutes idle

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

## ⚠️ Disclaimer

This software is for educational purposes. Trading involves substantial risk of loss. The developers are not responsible for any financial losses incurred through the use of this software. Always test with paper trading before using real funds.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/holotrade/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/holotrade/discussions)

---

*Built with ❤️ for the future of trading interfaces*
