# Contributing to HoloTrade

Thank you for your interest in contributing to HoloTrade! This document provides guidelines and instructions for contributing.

---

## Ways to Contribute

### 1. Report Bugs
- Open an issue with the "bug" label
- Include: OS, browser, steps to reproduce, expected vs actual behavior
- Screenshots/videos are very helpful for gesture-related bugs

### 2. Suggest Features
- Open an issue with the "enhancement" label
- Explain the use case and why it would be valuable

### 3. Submit Code
- Bug fixes
- New features
- Performance improvements
- Documentation updates

---

## Development Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Git
- Webcam (for testing gesture features)

### Local Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/holotrade.git
cd holotrade

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Running Locally

```bash
# Terminal 1 - Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## Code Guidelines

### TypeScript/Svelte (Frontend)

```typescript
// Use TypeScript types
function calculatePrice(value: number): number {
  return value * 1.1;
}

// Use descriptive variable names
const isPinching = pinchDistance < PINCH_THRESHOLD;

// Add comments for complex logic
// Hysteresis: different thresholds for enter vs exit
const newState = currentlyPinching
  ? pinchDistance < EXIT_THRESHOLD
  : pinchDistance < ENTER_THRESHOLD;
```

### Python (Backend)

```python
# Use type hints
def place_order(symbol: str, quantity: int, price: float) -> dict:
    """Place a limit order.
    
    Args:
        symbol: Trading symbol (e.g., "RELIANCE")
        quantity: Number of shares
        price: Limit price
        
    Returns:
        Dict with order_id and status
    """
    pass

# Use logging instead of print
import logging
logger = logging.getLogger(__name__)
logger.info("Order placed successfully")
```

### Commit Messages

Follow conventional commits:

```
feat: add two-hand zoom gesture
fix: prevent false pinch detection in dark lighting
docs: update gesture detection algorithm docs
refactor: extract EMA utility function
style: fix linting errors in FaceTracker
```

---

## Pull Request Process

1. **Create a branch**
   ```bash
   git checkout -b feat/my-new-feature
   ```

2. **Make your changes**
   - Follow code guidelines
   - Add comments for complex logic
   - Update documentation if needed

3. **Test your changes**
   - Test with webcam for gesture features
   - Check for TypeScript errors: `npm run check`
   - Test different lighting conditions

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add my new feature"
   git push origin feat/my-new-feature
   ```

5. **Open a Pull Request**
   - Describe what your PR does
   - Link related issues
   - Include screenshots/videos for UI changes

---

## Project Structure

Understanding where code lives:

```
frontend/src/lib/
├── components/     # Svelte components
│   ├── Chart3D/    # 3D chart components
│   ├── Scene3D/    # 3D scene setup
│   ├── Tracking/   # MediaPipe integration
│   └── UI/         # User interface components
├── stores/         # Svelte stores (state)
├── services/       # API and business logic
└── utils/          # Helper functions

backend/app/
├── main.py         # FastAPI entry point
├── kite_client.py  # Zerodha API wrapper
├── ticker_service.py # WebSocket streaming
└── routes/         # API endpoints
```

---

## Key Concepts

Before contributing, understand these:

### 1. EMA Smoothing
We use Exponential Moving Average to smooth noisy sensor data. See `utils/ema.ts`.

### 2. State Machine
Order placement follows: IDLE → TARGETING → LOCKED → CONFIRMING → ORDER_PLACED. See `PriceTargetOverlay.svelte`.

### 3. Hysteresis
We use different thresholds for entering vs exiting states to prevent flickering. Common pattern:
```typescript
const ENTER_THRESHOLD = 0.045;
const EXIT_THRESHOLD = 0.070;
```

### 4. Singleton Pattern
`KiteClient` in Python is a singleton to maintain session state across requests.

---

## Testing

Currently, we don't have automated tests. Contributions to add tests are very welcome!

### Manual Testing Checklist

- [ ] Face tracking moves camera perspective
- [ ] One-hand detection shows price overlay
- [ ] Pinch gesture locks price
- [ ] Point-up opens confirmation
- [ ] Thumbs-up places order (use small quantities!)
- [ ] Closed fist cancels at any stage
- [ ] Two-hand zoom works
- [ ] Settings sliders work
- [ ] Dynamic Island shows notifications

---

## Need Help?

- Read [TECHNICAL.md](TECHNICAL.md) for implementation details
- Read [ROADMAP.md](ROADMAP.md) for planned features
- Open an issue with "question" label

---

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes

Thank you for contributing! 🙏
