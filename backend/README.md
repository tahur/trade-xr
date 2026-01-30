# TradeXR Backend

FastAPI backend for the TradeXR trading interface.

## Tech Stack

- **Framework**: FastAPI
- **Broker API**: Zerodha KiteConnect
- **WebSocket**: For real-time streaming

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your Kite API credentials

# Start server
uvicorn app.main:app --reload
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/kite/login` | Exchange request token for access token |
| POST | `/config` | Configure API credentials at runtime |

### Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/kite/order` | Place a limit order |
| GET | `/api/kite/positions` | Get open positions |
| GET | `/api/kite/margins` | Get available margins |

### Market Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quote/ltp/{symbol}` | Last traded price |
| GET | `/quote/quote/{symbol}` | Full quote (OHLC, volume) |
| GET | `/quote/candles/{symbol}` | Historical OHLC data |

### WebSocket
| Method | Endpoint | Description |
|--------|----------|-------------|
| WS | `/ws/ticks` | Real-time tick streaming |
| GET | `/ticker/status` | Ticker connection status |
| POST | `/ticker/start` | Start ticker service |
| POST | `/ticker/stop` | Stop ticker service |

## Project Structure

```
app/
├── main.py           # FastAPI entry point, CORS config
├── kite_client.py    # Zerodha API wrapper (singleton)
├── ticker_service.py # WebSocket streaming service
└── routes/
    ├── orders.py     # Order and login endpoints
    ├── config.py     # API configuration endpoint
    ├── quote.py      # Market data endpoints
    └── websocket.py  # WebSocket routes
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `KITE_API_KEY` | Zerodha API key (32 chars) | Yes |
| `KITE_API_SECRET` | Zerodha API secret | Yes |
| `SECRET_KEY` | For session signing | Optional |

## Kite Connect Setup

1. Go to [Kite Connect](https://developers.kite.trade/)
2. Create an app
3. Set Redirect URL to `http://localhost:5173`
4. Copy API Key and Secret to `.env`

## Testing

```bash
# Check if server is running
curl http://localhost:8000/

# Expected response:
# {"status":"ok","message":"TradeXR Backend Running"}
```

---

Part of [TradeXR](../README.md) | See [TECHNICAL.md](../TECHNICAL.md) for implementation details
