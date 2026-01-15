# HoloTrade 🌐

**An immersive 3D trading interface with face tracking and gesture controls for Zerodha Kite**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-beta-orange.svg)

---

## What is HoloTrade?

HoloTrade is an experimental trading interface that transforms how you interact with stock market data. Instead of clicking buttons and typing numbers, you:

- **Move your head** → The 3D chart shifts perspective like looking through a window
- **Pinch your fingers** → Select a price level
- **Point up** → Confirm your selection  
- **Thumbs up** → Place the order

It's like having a holographic trading terminal on your screen.

---

## Quick Demo

```
1. Load the app → 3D candlestick chart appears
2. Move your head → Chart perspective shifts in real-time
3. Show one hand → Price selector follows your hand position
4. Pinch → Lock in a price
5. Point up → Open order confirmation
6. Thumbs up → Hold 3 seconds in the zone to confirm!
7. Closed fist → Cancel anytime
```

---

## Features

### 🎯 Face Tracking Perspective
Your webcam tracks your face position. Move your head left/right/up/down in front of the screen, and the 3D chart adjusts its perspective accordingly—creating a "window into 3D space" effect.

### 🎮 Gesture Engine
Centralized gesture management prevents conflicts:
- **Context locking** - Only one feature uses gestures at a time
- **Priority system** - Zoom gestures always take priority over trading
- **Cooldowns** - Prevents accidental triggers after gestures end

### ✋ Dynamic Zone Confirmation
Order confirmation uses a deliberate 3-second hold:
| Step | Gesture | Action |
|------|---------|--------|
| 1 | Show hand | Show price selector |
| 2 | Pinch | Lock price |
| 3 | Point up | Open confirmation |
| 4 | Thumbs up | Zone appears at your hand |
| 5 | Hold 3s | Progress ring fills → Order placed! |
| Cancel | Closed fist | Cancel anytime |

### ⚡️ High Performance
Optimized for 60fps+ tracking and rendering:
- GPU-accelerated smooth animations (`will-change`, transforms only)
- Optimized glassmorphism effects (12px blur sweet spot)
- Snappy, jitter-free gesture tracking

### 📊 3D Candlestick Chart
OHLC data rendered as 3D boxes with wicks. Green for bullish, red for bearish. Smooth camera controls with zoom support.

### 🔔 Dynamic Island Notifications
macOS-style notification center showing:
- Order status (pending/success/error)
- API connection status
- Live P&L for open positions

### 🔌 Zerodha Kite Integration
Full integration with India's largest discount broker:
- **One-Click Connect**: Branded Kite button with 3-state flow (Setup → Connect → Connected)
- OAuth login flow managed entirely within the app
- Real-time LTP (Last Traded Price)
- Order placement (Limit orders, CNC product type)
- Position and margin tracking

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | SvelteKit 5 |
| 3D Rendering | Three.js via Threlte |
| Face Tracking | MediaPipe Face Mesh |
| Hand Tracking | MediaPipe Hands |
| Styling | TailwindCSS |
| Backend | Python FastAPI |
| Broker API | Zerodha KiteConnect |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Zerodha Kite Connect API credentials ([Get them here](https://kite.trade/))
- Webcam

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/holotrade.git
cd holotrade

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

### Configuration

1. **Backend** - Create `backend/.env`:
```env
KITE_API_KEY=your_api_key
KITE_API_SECRET=your_api_secret
SECRET_KEY=any_random_string
```

2. **Frontend** - Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### Running

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Project Structure

```
holotrade/
├── frontend/                 # SvelteKit application
│   ├── src/
│   │   ├── routes/          # Page components
│   │   ├── lib/
│   │   │   ├── components/  # UI and 3D components
│   │   │   ├── stores/      # Svelte stores (state management)
│   │   │   ├── services/    # API and business logic
│   │   │   └── utils/       # Helper functions
│   │   └── app.html
│   └── package.json
│
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── main.py          # Entry point
│   │   ├── kite_client.py   # Zerodha API wrapper
│   │   ├── ticker_service.py # WebSocket streaming
│   │   └── routes/          # API endpoints
│   └── requirements.txt
│
└── docs/                     # Documentation
```

---

## How It Works (Simplified)

1. **Camera captures your face** → MediaPipe extracts 468 facial landmarks
2. **Nose position mapped to X/Y/Z** → Stored in Svelte reactive store
3. **3D camera position updates** → Chart perspective shifts smoothly
4. **Hand gestures detected** → MediaPipe Hands tracks 21 hand landmarks
5. **Gesture classified** → Pinch distance, finger positions analyzed
6. **Order placed** → FastAPI backend calls Zerodha Kite API

---

## Contributing

We welcome contributions! This is a FOSS project.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [TECHNICAL.md](TECHNICAL.md) for detailed architecture documentation.

---

## Safety Disclaimer

⚠️ **This is experimental software for educational purposes.**

- Always test with paper trading or small quantities first
- Gesture recognition may have false positives
- Network delays can affect order execution
- The developers are not responsible for any trading losses

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Zerodha](https://zerodha.com/) for their excellent KiteConnect API
- [MediaPipe](https://mediapipe.dev/) for the ML models
- [Threlte](https://threlte.xyz/) for the Svelte + Three.js integration
- The open source community 💚
