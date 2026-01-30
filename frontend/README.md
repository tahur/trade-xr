# TradeXR Frontend

SvelteKit application for the TradeXR trading interface.

## Tech Stack

- **Framework**: SvelteKit 5
- **3D Engine**: Three.js via Threlte
- **Tracking**: MediaPipe Face Mesh & Hands
- **Styling**: TailwindCSS

## Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at http://localhost:5173 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run check` | TypeScript type checking |
| `npm run lint` | Run linter |

## Project Structure

```
src/
├── routes/
│   └── +page.svelte      # Main application page
├── lib/
│   ├── components/
│   │   ├── Chart3D/      # 3D candlestick components
│   │   ├── Scene3D/      # 3D scene with lighting
│   │   ├── Tracking/     # MediaPipe integration
│   │   └── UI/           # User interface components
│   ├── stores/           # Svelte reactive stores
│   ├── services/         # API clients and business logic
│   ├── utils/            # Helper functions (EMA, etc.)
│   └── config/           # App configuration
└── app.html              # HTML template
```

## Key Files

| File | Purpose |
|------|---------|
| `+page.svelte` | Main orchestrator, camera control |
| `FaceTracker.svelte` | MediaPipe face/hand integration |
| `PriceTargetOverlay.svelte` | Gesture trading UI |
| `Scene3D.svelte` | 3D scene with lights and environment |
| `DynamicIsland.svelte` | Notification center |
| `orderService.ts` | Centralized order placement |
| `ema.ts` | Signal smoothing utility |

## Environment Variables

See `.env.example` for required variables.

## Browser Requirements

- Modern browser with WebGL support
- Webcam access permission
- Works best in Chrome/Edge

---

Part of [TradeXR](../README.md) | See [TECHNICAL.md](../TECHNICAL.md) for implementation details
