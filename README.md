# TradeXR

> **Gesture-controlled 3D trading interface for Zerodha Kite**

![Status](https://img.shields.io/badge/pre--alpha-7c3aed?style=flat-square)
![License](https://img.shields.io/badge/MIT-22c55e?style=flat-square)
![SvelteKit](https://img.shields.io/badge/SvelteKit-ff3e00?style=flat-square&logo=svelte&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000?style=flat-square&logo=threedotjs&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-4285F4?style=flat-square&logo=google&logoColor=white)

---

## The Story

TradeXR was born out of **boredom and curiosity** — a weekend experiment to explore gesture-based interaction. The idea was simple: *What if you could trade with your hands instead of clicks?*

This is not a full trading terminal. It focuses on two core experiences:

1. **Visualization** — A 3D candlestick chart you navigate with head movement and hand gestures.
2. **Order Placement** — Lock onto a price with a pinch, confirm with a thumbs up or down.

Built on top of the [Zerodha Kite API](https://kite.trade). Open-sourced for transparency and learning.


> **How this was really built:** This project grew through a lot of experimenting—trying things, breaking them, fixing them, and starting over more times than I can count. AI helped along the way, but every choice, every tweak, and every “this doesn’t feel right” moment came from human judgment. The code carries all those small mistakes, lessons, and iterations. It’s not perfect—and that’s exactly what makes it real.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR BROWSER                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Webcam    │───▶│  MediaPipe  │───▶│   Gesture Engine    │  │
│  │   (60fps)   │    │  (Tracking) │    │  (Filter + Detect)  │  │
│  └─────────────┘    └─────────────┘    └──────────┬──────────┘  │
│                                                   │              │
│                                                   ▼              │
│                                        ┌─────────────────────┐  │
│                                        │      3D Scene       │  │
│                                        │  (Three.js + UI)    │  │
│                                        └──────────┬──────────┘  │
└───────────────────────────────────────────────────┼─────────────┘
                                                    │ HTTP
                                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (localhost:8000)                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      FastAPI                             │   │
│  │  • Orders  • Quotes  • Session  • Credentials (Vault)    │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┬─────────────┘
                                                    │ HTTPS
                                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ZERODHA KITE API                         │
└─────────────────────────────────────────────────────────────────┘
```

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

### Dynamic Island (Context-Aware Status Card)

Inspired by Apple's Dynamic Island, this floating card **adapts to your trading context**:

| State | What It Shows |
|-------|---------------|
| Idle | Live ticker — Symbol + Price + Change% |
| Order Placed | Confirmation with order details |
| Position Open | Real-time P&L tracking |
| Order Pending | Pulsing amber indicator |

The card **expands**, **morphs**, and **animates** based on what's happening.

**Head Tracking**: Move your head and the card tilts in 3D space, following your gaze with smooth spring physics.

---

### Portfolio Solar System

Navigate to `/portfolio` with a ✌️ Victory gesture to see your holdings as **orbiting planets**:

- **Planet Size** — Proportional to holding value
- **Orbit Radius** — Based on number of holdings  
- **Colors** — Green gradient (profit) / Red gradient (loss)
- **Center Sun** — Total portfolio value + Day's P&L

Move your head to **explore with parallax**. Make a ✊ Fist to return to trading.

---

### Gesture Confirmation

To prevent accidental trades, all critical gestures require **hold time and cooldowns**:

| Gesture | Confirmation Required |
|---------|----------------------|
| 👍 Thumbs Up / 👎 Thumbs Down | Hold for ~1 second before order triggers |
| ☝️ Price Lock (Pinch) | Hold still for 450ms to lock price |
| ✌️ Victory / ✊ Fist | Hold for 300ms to change view |

This reduces false positives from accidental or momentary gestures.

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

## Under the Hood

### The Lag Problem

Svelte's reactive system adds 16-32ms delay per update. At 60fps, that's noticeable lag when moving a camera with your hands.

**Fix:** A custom physics engine using damped harmonic oscillators. It runs in `requestAnimationFrame`, outside Svelte entirely. Response time: 16ms (down from 200-500ms).

### The Noise Problem

MediaPipe hand tracking is noisy. A slight tremor looks like a gesture change.

**Fix:** Three layers of filtering:
- **Smoothing:** Each position blends with the previous one (EMA α=0.7)
- **Hysteresis:** Gestures must hold for 3 frames before triggering
- **Triple Lock:** Price selection requires tight pinch + still hand + 450ms hold

### The Conflict Problem

What if you're zooming and your hand drifts into the price picker zone?

**Fix:** Priority-based gesture locking. Zoom (priority 3) beats trading (priority 1). Higher priority locks out lower ones.

### The Speed Problem

Svelte store subscriptions are too slow for 60fps gesture updates.

**Fix:** Custom event bus (`GestureBus`) that fires callbacks directly. Sub-millisecond propagation.

### Other Optimizations

| Change | Result |
|--------|--------|
| Shadow maps 2048→512px | 75% VRAM savings |
| Instrument token caching | Faster API calls |
| Config in one place | Easy threshold tuning |

All thresholds live in `frontend/src/lib/config/`.

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

### 2. Clone & Install

```bash
git clone https://github.com/tahur/tradexr.git
cd tradexr

# One-time setup (installs all dependencies)
./setup.sh
```

### 3. Start the App

```bash
./start.sh
```

Open **http://localhost:5173** in Chrome.

### 4. Configure API Credentials (In-App)

1. Click the **⚙️ Settings** icon to open Control Center
2. Enter your **API Key** and **API Secret**
3. Click **Save & Connect** → redirects to Zerodha login
4. After login, your session token is saved automatically

> **Session Handling:** Zerodha tokens expire daily. The app automatically validates tokens on startup—if expired, it clears the stale session and prompts for re-login. No manual intervention needed.

### Script Commands

| Command | Description |
|---------|-------------|
| `./setup.sh` | One-time setup (installs dependencies) |
| `./start.sh` | Start both servers |
| `./start.sh restart` | Restart both servers |
| `./start.sh stop` | Stop all servers |
| `./start.sh status` | Check server status |
| `./start.sh logs` | View server logs |

<details>
<summary><b>Manual Setup (Alternative)</b></summary>

If you prefer manual setup:

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

</details>

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
| `GET` | `/api/session/status` | Check session status |
| `DELETE` | `/api/session/logout` | Clear session |

---

## Safety Features

| Feature | Purpose |
|---------|---------|
| Rate Limiter | Prevents rapid-fire orders |
| Tab Guard | Disables trading when tab inactive |
| Device Guard | Desktop-only enforcement |
| Encrypted Vault | Fernet encryption for API credentials |
| Session Persistence | Auto-restores session on refresh |
| Gesture Cooldowns | Prevents accidental repeats |

### Security Model

1. **Encrypted Storage** — API keys stored in `.env` (local only), session tokens encrypted with machine-derived keys
2. **Session Tokens** — Access tokens encrypted with machine-derived key for auto-restore
3. **Local Only** — All data stored locally on your machine, never transmitted
4. **No .env Required** — Credentials entered via Control Center UI, not config files

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



## Disclaimer

This is an **experimental toy project**. It will have bugs. It is not intended for serious trading.

If you choose to connect it to a real brokerage account, you do so entirely at your own risk. Understand what the code does before you run it. Test with small amounts. I am not responsible for any financial losses.

---

## License

MIT License 

---


