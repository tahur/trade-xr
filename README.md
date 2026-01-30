# TradeXR

> **Gesture-controlled 3D trading interface for Zerodha Kite**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zerodha Kite](https://img.shields.io/badge/Zerodha-Kite%20API-orange)](https://kite.trade)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.x-ff3e00)](https://kit.svelte.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688)](https://fastapi.tiangolo.com)

---

## The Story

TradeXR was born out of **boredom and curiosity** — a weekend experiment that grew into a fully functional trading interface. The idea was simple: *What if you could trade with your hands instead of clicks?*

Built entirely on top of the [Zerodha Kite API](https://kite.trade), this project explores **computer vision**, **3D visualization**, and **real-time trading**. Open-sourced for transparency and learning.

**This is not financial advice. Trade at your own risk.**

---

## The Experience

### Gesture-First Interaction

No mouse. No keyboard. Just your hands.

| Gesture | What It Does |
|---------|--------------|
| 👐 Two-Hand Pinch | Zoom in/out on the 3D candlestick chart |
| ☝️ Point + Pinch | Select and lock a target price |
| 👍 Thumbs Up | Confirm BUY order |
| 👎 Thumbs Down | Confirm SELL order |
| ✌️ Victory | Open portfolio view |
| ✊ Fist | Cancel / Go back |

### Dynamic Island (Context-Aware Notifications)

Inspired by Apple's Dynamic Island, the notification center **adapts to your trading context**:

| State | What It Shows |
|-------|---------------|
| Idle | Live ticker — Symbol + Price + Change% |
| Order Placed | Confirmation with order details |
| Position Open | Real-time P&L tracking |
| Order Pending | Pulsing amber indicator |

The island **expands**, **morphs**, and **animates** based on what's happening — no static banners, just fluid context.

**Head Tracking**: Move your head and the Dynamic Island tilts in 3D space, following your gaze with smooth spring physics.

---

### Portfolio Solar System

Navigate to `/portfolio` with a ✌️ Victory gesture to see your holdings as **orbiting planets**:

- **Planet Size** — Proportional to holding value
- **Orbit Radius** — Based on number of holdings  
- **Colors** — Green gradient (profit) / Red gradient (loss)
- **Center Sun** — Total portfolio value + Day's P&L

Move your head to **explore with parallax**. Make a ✊ Fist to return to trading.

---

### Micro-Interactions

| Interaction | Visual Feedback |
|-------------|-----------------|
| Hand detected | GestureGuide appears at bottom |
| Pinch starts | Price line locks with glow effect |
| Price confirmed | Haptic pulse + color shift |
| Zoom active | Percentage badge in gesture bar |
| Mode changes | Smooth transitions between states |

Every state change has a **purpose** and a **polish**.

---

## Supported ETFs

TradeXR supports **5 low-cost ETFs** priced under ₹50 — perfect for experimenting:

| Symbol | Name | Approx. Price |
|--------|------|---------------|
| SILVERCASE | Silver ETF | ~₹30 |
| GOLDCASE | Gold ETF | ~₹25 |
| NIFTYCASE | Nifty 50 ETF | ~₹28 |
| TOP100CASE | Top 100 ETF | ~₹22 |
| MID150CASE | Midcap 150 ETF | ~₹18 |

> **Default quantity: 1 unit** — Maximum exposure under ₹50 per order.

---

## Engineering

### Physics-Based Animation

We built a custom `AnimationController` using **Damped Harmonic Oscillator** physics (Hooke's Law: `F = -kx - dv`):

- RequestAnimationFrame loop running at 60fps
- Direct Three.js camera control, bypassing Svelte reactivity
- 16ms response time (down from 200ms with double Svelte springs)

```
stiffness: 220  // Snappy response
damping: 20     // No overshoot (critical damping)
mass: 1.2       // Slight momentum feel
```

Svelte's reactive system was adding 16-32ms delay per store subscription. For gesture-driven camera movement, that felt like lag. The physics controller operates outside the reactive chain.

### Noise Control

Gesture detection is inherently noisy. Here's what we did:

| Problem | Solution |
|---------|----------|
| Jittery hand tracking | EMA smoothing (α=0.7) |
| False two-hand detection | 3-frame hysteresis to enter zoom |
| Accidental price locks | Triple Lock: threshold + velocity + 450ms hold |
| Gesture flickering | Frame counters for all gestures |
| Zoom vs trade conflicts | Priority-based context locking |

### Optimizations

| What | Result |
|------|--------|
| Event bus for gestures | Sub-millisecond propagation |
| Shadow map 512px (from 2048px) | 75% VRAM savings |
| Instrument token caching | Reduced API latency |

All thresholds live in `frontend/src/lib/config/` — tune the entire system from one place.

---

## Requirements

> **Paid API Required** — Zerodha Kite data subscription costs ₹500/month

- Desktop with webcam (no mobile)
- [Zerodha Kite Connect](https://kite.trade) developer access
- Node.js 20+ and Python 3.10+
- Good lighting for hand detection

---

## Quick Start

### 1. Get Zerodha API Keys

1. Go to [Kite Connect Developer Console](https://developers.kite.trade)
2. Create a new app
3. Set **Redirect URL** to: `http://localhost:5173`
4. Note your **API Key** and **API Secret**
5. Subscribe to Historical + Live data (₹500/month)

### 2. Clone & Setup

```bash
git clone https://github.com/tahur/tradexr.git
cd tradexr
```

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure credentials
echo "KITE_API_KEY=your_key" > .env
echo "KITE_API_SECRET=your_secret" >> .env

# Start server
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in Chrome.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/config` | Configure API credentials |
| `POST` | `/api/kite/order` | Place limit order |
| `GET` | `/api/kite/positions` | Current positions |
| `GET` | `/api/holdings` | Portfolio holdings |
| `GET` | `/quote/ltp/{symbol}` | Last traded price |
| `GET` | `/quote/candles/{symbol}` | Historical candles |

---

## Safety Features

| Feature | Purpose |
|---------|---------|
| Rate Limiter | Prevents rapid-fire orders |
| Tab Guard | Disables trading when tab inactive |
| Device Guard | Desktop-only enforcement |
| Encrypted Vault | Fernet encryption for credentials |
| Gesture Cooldowns | Prevents accidental repeats |

---

## Project Structure

```
tradexr/
├── backend/           # FastAPI + Zerodha SDK
│   ├── app/
│   │   ├── main.py
│   │   ├── kite_client.py
│   │   └── routes/
│   └── requirements.txt
│
├── frontend/          # SvelteKit + Three.js
│   └── src/lib/
│       ├── config/    # All thresholds
│       ├── services/  # GestureBus, GestureEngine
│       ├── stores/    # Reactive state
│       └── components/
│
├── ARCHITECTURE.md    # Technical deep-dive
└── README.md          # You are here
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | SvelteKit 5 | Compiler-based reactivity |
| 3D Engine | Three.js + Threlte | Mature WebGL, Svelte bindings |
| ML Tracking | MediaPipe | Real-time face/hand (60fps) |
| Backend | FastAPI | Async Python, auto-docs |
| Broker | Zerodha KiteConnect | Official SDK |

---

## Known Limitations

- **Zerodha only** — Built for Kite Connect API
- **India markets** — NSE/BSE symbols
- **Desktop only** — Requires webcam + mouse
- **Limit orders** — No market orders (safety)
- **Good lighting** — Hand detection needs visibility

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License — do whatever you want, just don't blame me if you lose money.

---

<p align="center">
  <i>Built with curiosity. Trade responsibly.</i>
</p>
