# Technical Specifications

This document provides detailed technical information about HoloTrade's implementation. It covers every micro-setting, algorithm, and configuration that makes the system work.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Technical Details](#frontend-technical-details)
3. [Face Tracking System](#face-tracking-system)
4. [Hand Gesture System](#hand-gesture-system)
5. [Gesture Engine](#gesture-engine)
6. [Dynamic Zone Confirmation](#dynamic-zone-confirmation)
7. [3D Rendering Pipeline](#3d-rendering-pipeline)
8. [Signal Smoothing (EMA)](#signal-smoothing-ema)
9. [Glassmorphism Styling](#glassmorphism-styling)
10. [Floating Notification Center](#floating-notification-center)
11. [State Management](#state-management)
12. [Order Placement Flow](#order-placement-flow)
13. [API Integration](#api-integration)
14. [Data Storage](#data-storage)
15. [Configuration Files](#configuration-files)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (SvelteKit)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  MediaPipe   │  │   Threlte    │  │    Svelte Stores     │   │
│  │  Face + Hands│  │  (Three.js)  │  │  (Reactive State)    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │               │
│         ▼                 ▼                      ▼               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              +page.svelte (Main Orchestrator)            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP / WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ KiteClient   │  │ TickerService│  │    API Routes        │   │
│  │ (Singleton)  │  │ (WebSocket)  │  │  /quote, /order, etc │   │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘   │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Zerodha Kite API   │
│  (External Service) │
└─────────────────────┘
```

---

## Frontend Technical Details

### Framework: SvelteKit 5

- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS with custom CSS for glassmorphism

### Key Dependencies

```json
{
  "@threlte/core": "^7.x",      // Three.js wrapper for Svelte
  "@threlte/extras": "^8.x",    // Additional 3D utilities
  "@mediapipe/face_mesh": "^0.4.x",  // Face tracking ML model
  "@mediapipe/hands": "^0.4.x",      // Hand tracking ML model
  "@mediapipe/camera_utils": "^0.3.x", // Webcam abstraction
  "three": "^0.160.x"           // 3D rendering engine
}
```

### File Structure

```
frontend/src/lib/
├── components/
│   ├── Chart3D/
│   │   ├── CandlestickChart.svelte  # Main chart component
│   │   └── Candle.svelte            # Individual candle mesh
│   ├── Scene3D/
│   │   └── Scene3D.svelte           # 3D scene with lighting
│   ├── Tracking/
│   │   └── FaceTracker.svelte       # MediaPipe integration
│       ├── DynamicIsland.svelte     # Notification center
│       ├── DynamicConfirmZone.svelte # Gesture confirmation zone
│       ├── KiteButton.svelte        # API connection button
│       ├── PriceTargetOverlay.svelte # Gesture trading UI
│       ├── SettingsCard.svelte      # Settings panel
│       └── ...
├── stores/
│   ├── tracking.ts      # Face/hand position stores
│   ├── gesture.ts       # Gesture state store
│   ├── trading.ts       # Orders and positions
│   └── dynamicIsland.ts # Notification state
├── services/
│   ├── gestureEngine.ts # Centralized gesture context management
│   ├── kite.ts          # Kite API client
│   ├── orderService.ts  # Order placement logic
│   └── etfService.ts    # ETF data fetching
└── utils/
    └── ema.ts           # Smoothing functions
```

---

## Face Tracking System

### MediaPipe Face Mesh Configuration

```typescript
// Location: FaceTracker.svelte

faceMesh.setOptions({
  maxNumFaces: 1,              // Track only one face
  refineLandmarks: true,       // Higher accuracy for iris
  minDetectionConfidence: 0.5, // Minimum confidence to detect
  minTrackingConfidence: 0.5   // Minimum confidence to track
});
```

### Head Position Calculation

```typescript
// We use 3 key landmarks:
// - Landmark 1: Nose tip (center of face)
// - Landmark 234: Left cheek
// - Landmark 454: Right cheek

const nose = landmarks[1];
const leftCheek = landmarks[234];
const rightCheek = landmarks[454];

// X/Y position: Nose tip, centered around 0.5
headPosition.set({
  x: (nose.x - 0.5) * -1,  // Invert X for natural mapping
  y: (nose.y - 0.5) * -1,  // Invert Y for natural mapping
  z: cheekDistance          // Depth estimate from cheek distance
});
```

### Depth Estimation

The distance between left and right cheeks provides a rough estimate of how far the user is from the camera:

```typescript
const cheekDistance = Math.sqrt(
  Math.pow(leftCheek.x - rightCheek.x, 2) +
  Math.pow(leftCheek.y - rightCheek.y, 2)
);
// Larger distance = closer to camera
```

---

## Hand Gesture System

### MediaPipe Hands Configuration

```typescript
hands.setOptions({
  maxNumHands: 2,              // Track up to 2 hands (for zoom)
  modelComplexity: 1,          // 0=Lite, 1=Full
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
```

### Gesture Detection Algorithm

#### 1. Pinch Detection (Thumb + Index)

```typescript
// Calculate distance between thumb tip (4) and index tip (8)
const pinchDistance = Math.sqrt(
  Math.pow(thumbTip.x - indexTip.x, 2) +
  Math.pow(thumbTip.y - indexTip.y, 2)
);

// Hysteresis thresholds to prevent flickering
const PINCH_ENTER_THRESHOLD = 0.045;  // Start pinching
const PINCH_EXIT_THRESHOLD = 0.07;    // Stop pinching

// State machine with hysteresis
isPinching = pinchDistance < (isPinching ? PINCH_EXIT_THRESHOLD : PINCH_ENTER_THRESHOLD);
```

#### 2. Pinch Confirmation (Debounce)

```typescript
const PINCH_CONFIRM_MS = 80;  // Must hold for 80ms

if (rawPinching && !isPinchingState) {
  if (pinchStartTime === null) {
    pinchStartTime = performance.now();
  }
  if (performance.now() - pinchStartTime >= PINCH_CONFIRM_MS) {
    isPinchingState = true;  // Confirmed pinch
  }
}
```

#### 3. Finger Extension Detection

```typescript
// Check if finger is extended by comparing tip vs PIP joint Y position
function isFingerExtended(landmarks, tipIdx, pipIdx) {
  return landmarks[tipIdx].y < landmarks[pipIdx].y;
}

// Finger landmark indices:
// Index:  tip=8,  pip=5
// Middle: tip=12, pip=9
// Ring:   tip=16, pip=13
// Pinky:  tip=20, pip=17
```

#### 4. Thumbs Up Detection (Scoring System)

```typescript
// Multiple conditions scored and summed:
const thumbsUpScore =
  (thumbPointingUp ? 1 : 0) +      // Thumb tip above IP joint
  (thumbAboveWrist ? 1 : 0) +      // Thumb higher than wrist
  (thumbExtended ? 1 : 0) +        // Thumb away from palm
  (otherFingersClosed ? 1 : 0) +   // Other 4 fingers curled
  (thumbOnSide ? 0.5 : 0);         // Thumb on correct side

const isThumbsUp = thumbsUpScore >= 2.5;
```

### Two-Hand Zoom

```typescript
// When 2 hands detected, calculate distance between hand centers
const handDist = Math.sqrt(
  Math.pow(hand1Center.x - hand2Center.x, 2) +
  Math.pow(hand1Center.y - hand2Center.y, 2)
);

// Zoom factor with amplification
const distanceRatio = zoomStartDistance / handDist;
const amplifiedRatio = Math.pow(distanceRatio, 1.5);  // Power for sensitivity
const newZoom = Math.max(0.3, Math.min(3.0, baseZoom * amplifiedRatio));
```

---

## Signal Smoothing (EMA)

We use Exponential Moving Average to smooth noisy sensor data from the webcam.

### EMA Formula

```typescript
// Location: utils/ema.ts

function ema(current: number, previous: number, alpha: number = 0.7): number {
  return alpha * current + (1 - alpha) * previous;
}
```

**Parameters:**
- `alpha = 0.7` → Snappy response (less smoothing)
- `alpha = 0.5` → Balanced
- `alpha = 0.3` → Smooth (more lag)
- `alpha = 0.15` → Ultra smooth (noticeable lag)

### Where EMA is Applied

| Signal | Alpha Value | Purpose |
|--------|-------------|---------|
| Pinch distance | 0.7 | Reduce jitter in finger detection |
| Hand X position | 0.7 | Smooth hand movement |
| Hand Y position | 0.7 | Smooth hand movement |
| Price overlay hand Y | 0.7 | Snappy response for price selection |

### Code Example

```typescript
// PriceTargetOverlay.svelte
import { ema, EMA_PRESETS } from "$lib/utils/ema";

const EMA_ALPHA = EMA_PRESETS.SNAPPY; // 0.7 for fast response

$: {
  const rawY = $gestureState.handPosition.y;
  smoothedHandY = ema(rawY, smoothedHandY, EMA_ALPHA);
}
```

---

## Gesture Engine

The Gesture Engine (`gestureEngine.ts`) provides centralized gesture context management to prevent conflicts between different features.

### Context States

```
IDLE → TRADING → CONFIRMING
         ↓
      ZOOMING (highest priority)
```

| Context | Description | Priority |
|---------|-------------|----------|
| `IDLE` | No gesture active | 0 |
| `TRADING` | Price selection active | 1 |
| `CONFIRMING` | Order confirmation in progress | 2 |
| `ZOOMING` | Two-hand zoom active | 3 (highest) |

### Configuration

```typescript
export const ENGINE_CONFIG = {
    ZOOM_COOLDOWN_MS: 300,      // Cooldown after zoom ends
    TRADING_COOLDOWN_MS: 200,   // Cooldown after trading state change
    MIN_LOCK_DURATION_MS: 100,  // Minimum time to hold a lock
    CONFIRM_HOLD_MS: 3000,      // 3 seconds to confirm order
    CONFIRM_ZONE_RADIUS: 0.12,  // 12% of viewport for confirm zone
};
```

### API

```typescript
// Acquire a context lock
gestureEngine.acquire(owner: string, ctx: GestureContext): boolean

// Release a context lock with optional cooldown
gestureEngine.release(owner: string, cooldownMs?: number): void

// Check if context can be acquired
gestureEngine.canAcquire(ctx: GestureContext): boolean

// Convenience helpers
acquireZoom()      // Acquire ZOOMING context
releaseZoom()      // Release with cooldown
acquireTrading()   // Acquire TRADING context
acquireConfirming() // Upgrade to CONFIRMING
releaseTrading()   // Release trading context
```

### Priority Rules

1. **Zoom always wins** - Two-hand zoom can interrupt any other gesture
2. **Cooldowns prevent conflicts** - 300ms cooldown after zoom prevents accidental triggers
3. **Single owner** - Only one feature can hold a context at a time

---

## Dynamic Zone Confirmation

The Dynamic Zone (`DynamicConfirmZone.svelte`) provides a deliberate, two-stage order confirmation.

### How It Works

```
1. User shows thumbs up → Zone spawns at hand position
2. Progress ring starts filling (3 seconds)
3. If hand moves outside zone → Progress resets
4. If hand stays 3s → Order confirmed with haptic feedback
5. Closed fist → Cancels at any time
```

### Visual Design

- **Glassmorphic ring** with subtle glow
- **Progress ring** (SVG) fills clockwise
- **Thumbs up emoji** center, changes to checkmark on complete
- **Order details** shown below zone
- **Status text** indicates current state

### Position Locking

The zone uses Svelte `spring` for smooth appearance, but position is **locked** on spawn:

```typescript
// Lock position instantly when zone spawns
lockedCenter = { x: handPos.x, y: handPos.y };
zonePosition.set({ x: handPos.x * 100, y: handPos.y * 100 }, { hard: true });
```

This prevents jitter - once the zone appears, it stays perfectly still.

### Zone Radius

```typescript
CONFIRM_ZONE_RADIUS: 0.12  // 12% of viewport
```

User must keep their hand within 12% of the spawn position to continue progress.

---

## 3D Rendering Pipeline

### Scene Setup

```typescript
// Scene3D.svelte

// Camera
<T.PerspectiveCamera
  position={[cameraPosition.x, cameraPosition.y, cameraPosition.z]}
  fov={55}
/>

// Lighting (8 lights for professional terminal look)
<T.AmbientLight intensity={0.65} color="#e8ddff" />
<T.PointLight position={[25, 10, -25]} intensity={1.5} color="#9d8aff" />
<T.DirectionalLight position={[40, 80, 60]} intensity={1.2} castShadow />
// ... more lights
```

### Camera Position Calculation

```typescript
// +page.svelte

// Base positions at different zoom levels
const MIN_CAM_Z = 25;   // Closest zoom
const MAX_CAM_Z = 65;   // Furthest zoom
const BASE_CAM_Y = 10;  // Height

// Svelte spring for smooth transitions
const camPos = spring({ x: 25, y: BASE_CAM_Y, z: 45 }, {
  stiffness: 0.08,
  damping: 0.5
});

// Update based on head position and zoom
$: {
  const zoomFactor = $smoothZoom;
  const newZ = MIN_CAM_Z + (MAX_CAM_Z - MIN_CAM_Z) * (1 - zoomFactor);
  
  camPos.set({
    x: baseCamX + $headPosition.x * $sensitivity,
    y: baseCamY + $headPosition.y * ($sensitivity * 0.5),
    z: newZ
  });
}
```

### Candlestick Rendering

```typescript
// Candle.svelte

// Body dimensions
const bodyHeight = Math.abs(close - open) * scaleFactor;
const bodyY = ((open + close) / 2 - centerPrice) * scaleFactor;

// Wick dimensions
const wickHeight = (high - low) * scaleFactor;
const wickY = ((high + low) / 2 - centerPrice) * scaleFactor;

// Colors
const isBullish = close >= open;
const bodyColor = isBullish ? "#10b981" : "#ef4444";  // Green / Red
```

---

## Glassmorphism Styling

HoloTrade uses glassmorphism (frosted glass effect) for its UI components. This creates a premium, modern aesthetic that complements the 3D trading environment.

### Core CSS Properties

```css
/* Base glass effect used across all cards */
.glass-panel {
  /* Semi-transparent background */
  background: rgba(20, 25, 40, 0.6);
  
  /* Frosted glass blur effect */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  /* Subtle light border for depth */
  border: 1px solid rgba(255, 255, 255, 0.15);
  
  /* Soft shadow for elevation */
  box-shadow: 
    0 20px 40px -10px rgba(0, 0, 0, 0.5),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  
  /* Rounded corners */
  border-radius: 16px;
}
```

### Blur Intensity Levels

| Component | Blur Amount | Background Opacity |
|-----------|-------------|-------------------|
| Settings Card | 24px | 0.85 |
| Notification Center | 16px | 0.90 |
| Price Overlay | 12px | 0.75 |
| Status Bar | 16px | 0.08 gradient |

### Gradient Backgrounds

```css
/* Multi-stop gradient for premium feel */
.premium-glass {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(139, 92, 246, 0.05) 100%  /* Subtle violet tint */
  );
}

/* Status bar gradient */
.status-glass {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
}
```

### Dynamic Light Shift

Cards respond to head tracking to create a 3D holographic effect:

```typescript
// Shine overlay follows head position
const shine = spring({ x: 50, y: 50 }, { stiffness: 0.15, damping: 0.4 });

$: if ($isTracking) {
  // Map head position to shine coordinates
  const shineX = 50 + $headPosition.x * 60;
  const shineY = 50 + $headPosition.y * 60;
  shine.set({ x: shineX, y: shineY });
}
```

```css
/* Dynamic shine overlay */
.card-shine-overlay {
  background: radial-gradient(
    circle at var(--shine-x) var(--shine-y),
    rgba(255, 255, 255, 0.8),
    transparent 50%
  );
  mix-blend-mode: soft-light;
  opacity: 0.6;
}
```

### Tailwind CSS Classes

Common utility patterns:

```html
<!-- Glass card -->
<div class="backdrop-blur-xl bg-white/10 border border-white/15 rounded-2xl">

<!-- Elevated glass -->
<div class="backdrop-blur-2xl bg-slate-900/95 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]">

<!-- Subtle glow border -->
<div class="border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
```

---

## Floating Notification Center

The notification center (inspired by modern mobile UI) handles order status, API messages, and live P&L display. It adapts its size and content based on the notification type.

### Modes

| Mode | Size | Use Case |
|------|------|----------|
| **Compact** | Pill-shaped | Brief status indicators |
| **Expanded** | Wider pill | Order confirmations, messages |
| **Live** | Tall card | Real-time P&L tracking |

### State Store

```typescript
// stores/dynamicIsland.ts

interface IslandContent {
  type: 'ticker' | 'order' | 'api' | 'pnl';
  
  // For ticker type
  symbol?: string;
  price?: number;
  change?: number;
  
  // For order type
  action?: 'BUY' | 'SELL';
  quantity?: number;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  
  // For API type
  message?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  
  // For P&L type
  pnl?: number;
  pnlPercent?: number;
  position?: 'OPEN' | 'CLOSED';
}

interface IslandState {
  isVisible: boolean;
  content: IslandContent | null;
  mode: 'compact' | 'expanded' | 'live';
}
```

### Show/Hide Logic

```typescript
// Show a notification with auto-dismiss
dynamicIsland.show(content: IslandContent, durationMs: number);

// Set live activity (persists until cleared)
dynamicIsland.setLiveActivity(content: IslandContent);

// Clear the notification
dynamicIsland.clear();
```

### Notification Lifecycle

```typescript
// Order placement example:

// 1. Show pending (while waiting for API)
dynamicIsland.show({
  type: 'order',
  action: 'BUY',
  quantity: 10,
  price: 27.50,
  status: 'PENDING'
}, 5000);

// 2. Update to success (after API responds)
dynamicIsland.show({
  type: 'order',
  action: 'BUY', 
  quantity: 10,
  price: 27.50,
  status: 'SUCCESS'
}, 4000);

// 3. Set live P&L tracking (persists)
dynamicIsland.setLiveActivity({
  type: 'pnl',
  symbol: 'SILVERCASE',
  pnl: 125.50,
  pnlPercent: 2.3,
  position: 'OPEN'
});
```

### Responsive Sizing

```typescript
// DynamicIsland.svelte

$: islandWidth = 
  mode === 'compact' ? '140px' :
  mode === 'expanded' ? '320px' :
  '280px';  // live mode

$: islandHeight =
  mode === 'compact' ? '36px' :
  mode === 'expanded' ? '56px' :
  '120px';  // live mode
```

### CSS Transitions

```css
.notification-island {
  /* Size animations */
  transition: 
    width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-radius 0.3s ease;
  
  /* Glassmorphism */
  background: rgba(0, 0, 0, 0.90);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  /* Subtle glow for visibility */
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}
```

### 3D Tilt Effect

The notification center tilts subtly based on head position:

```typescript
// Tilt spring for smooth movement
const tilt = spring({ x: 0, y: 0 }, { stiffness: 0.1, damping: 0.6 });

$: if ($isTracking) {
  tilt.set({
    x: $headPosition.y * 8,   // Head up/down → tilt X
    y: -$headPosition.x * 8   // Head left/right → tilt Y
  });
}
```

```svelte
<div style="transform: perspective(600px) rotateX({$tilt.x}deg) rotateY({$tilt.y}deg)">
  <!-- Island content -->
</div>
```

### Color Coding

| Status | Color | Example |
|--------|-------|---------|
| Success | Green (#10b981) | Order filled |
| Pending | Yellow/amber | Waiting for API |
| Error | Red (#ef4444) | Order failed |
| Info | Blue/cyan | API connected |
| Profit | Green | P&L positive |
| Loss | Red | P&L negative |

---

## State Management

### Svelte Stores

All application state is managed through Svelte writable stores.

#### Tracking Store (`stores/tracking.ts`)

```typescript
export const headPosition = writable({ x: 0, y: 0, z: 0.3 });
export const isTracking = writable(false);
export const sensitivity = writable(10);
export const zoomLevel = writable(1.0);
export const smoothZoom = writable(1.0);
export const twoHandPinch = writable({
  isActive: false,
  handDistance: 0,
  initialDistance: 0,
  velocity: 0
});
```

#### Gesture Store (`stores/gesture.ts`)

```typescript
export const gestureState = writable<GestureState>({
  isHandDetected: false,
  handPosition: { x: 0.5, y: 0.5 },
  isPinching: false,
  pinchDistance: 0.2,
  mode: 'IDLE',
  targetPrice: null,
  detectedGesture: 'None',
  fingerCount: 0,
  primaryHandSide: 'Unknown',
  numHandsDetected: 0,
  handVelocity: { x: 0, y: 0 },
  isHandStable: false
});
```

#### Trading Store (`stores/trading.ts`)

```typescript
interface TradingState {
  balance: number;           // Available balance
  positions: Position[];     // Open positions
  orders: Order[];           // Order history
}

// Methods:
// tradingStore.placeOrder(symbol, side, quantity, price)
// tradingStore.updatePrice(currentPrice)
```

---

## Order Placement Flow

### Price Selection State Machine

```
┌───────┐  hand detected  ┌───────────┐  pinch   ┌────────┐
│ IDLE  │ ───────────────▶│ TARGETING │ ───────▶ │ LOCKED │
└───────┘                  └───────────┘          └────────┘
    ▲                           │                     │
    │                           │ hand lost           │ point up
    │                           ▼                     ▼
    │                       ┌───────┐            ┌────────────┐
    └─────── closed fist ───│ IDLE  │◀── fist ──│ CONFIRMING │
                            └───────┘            └────────────┘
                                                      │
                                                      │ thumbs up
                                                      ▼
                                                ┌──────────────┐
                                                │ ORDER_PLACED │
                                                └──────────────┘
```

### Timing Constants

```typescript
// PriceTargetOverlay.svelte

const ENTRY_DELAY_MS = 200;      // Wait before showing overlay
const LOCK_DELAY_MS = 350;       // Hold pinch to lock price
const CONFIRM_DELAY_MS = 400;    // Hold point-up to confirm
const ORDER_DELAY_MS = 500;      // Hold thumbs-up to place order
const POST_LOCK_COOLDOWN = 400;  // Prevent accidental re-trigger
```

### Order Service

```typescript
// services/orderService.ts

export async function placeOrder(params: OrderParams): Promise<OrderResult> {
  const { symbol, side, quantity, price } = params;
  
  // 1. Show pending notification
  dynamicIsland.show({ type: 'order', status: 'PENDING', ...params }, 5000);
  
  try {
    // 2. Call Kite API via backend
    const response = await kite.placeOrder(symbol, side, quantity, price);
    
    // 3. Show success notification
    dynamicIsland.show({ type: 'order', status: 'SUCCESS', ...params }, 4000);
    
    // 4. Update local state
    await tradingStore.placeOrder(symbol, side, quantity, price);
    
    return { success: true, orderId: response?.order_id };
  } catch (error) {
    // 5. Show error notification
    dynamicIsland.show({ type: 'api', message: error.message, severity: 'error' }, 5000);
    return { success: false, error: error.message };
  }
}
```

---

## API Integration

### Connection UX Flow

The application uses a 3-state connection button (`KiteButton.svelte`) in the status bar:

1.  **Setup (Orange)**: No keys found in `localStorage`. Opens settings modal.
2.  **Connect (Blue)**: Keys found. Click initiates OAuth redirect to Zerodha.
3.  **Connected (Green)**: OAuth successful. Shows branded Kite logo.

### Frontend Kite Service (`services/kite.ts`)

```typescript
const API_BASE = "http://127.0.0.1:8000";

export const kite = {
  async login(requestToken: string) {
    const response = await fetch(`${API_BASE}/api/kite/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_token: requestToken })
    });
    return response.json();
  },
  
  async placeOrder(symbol, side, quantity, price) {
    const response = await fetch(`${API_BASE}/api/kite/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, transaction_type: side, quantity, price })
    });
    return response.json();
  },
  
  async getMargins() { /* ... */ },
  async getPositions() { /* ... */ }
};
```

### Backend Kite Client (`kite_client.py`)

```python
class KiteClient:
    _instance = None  # Singleton pattern
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def place_order(self, symbol, quantity, price, transaction_type, exchange="NSE"):
        # Round price to tick size
        rounded_price = round(price, 2)
        
        order_id = self.kite.place_order(
            variety=self.kite.VARIETY_REGULAR,
            exchange=exchange,
            tradingsymbol=symbol,
            transaction_type=trans_type,
            quantity=quantity,
            product=self.kite.PRODUCT_CNC,      # Delivery
            order_type=self.kite.ORDER_TYPE_LIMIT,
            price=rounded_price,
            validity=self.kite.VALIDITY_DAY
        )
        return {"status": "success", "order_id": order_id}
```

### Quote Fetching (`routes/quote.py`)

```python
@router.get("/candles/{symbol}")
async def get_candles(symbol: str, exchange: str = "NSE", interval: str = "5minute", days: int = 1):
    # Get instrument token from LTP call
    instrument = f"{exchange}:{symbol}"
    ltp_data = kite.kite.ltp([instrument])
    instrument_token = ltp_data[instrument]["instrument_token"]
    
    # Calculate date range
    to_date = datetime.now()
    from_date = to_date - timedelta(days=days)
    
    # Fetch historical data
    data = kite.kite.historical_data(
        instrument_token=instrument_token,
        from_date=from_date,
        to_date=to_date,
        interval=interval  # "minute", "5minute", "15minute", "day", etc.
    )
    
    return {"symbol": symbol, "candles": data}
```

---

## Data Storage

### Local Storage (Browser)

The frontend uses browser localStorage to persist user settings:

```typescript
// API Credentials (configured via Settings modal)
localStorage.setItem("kite_api_key", apiKey);
localStorage.setItem("kite_api_secret", apiSecret);

// On page load, auto-configure backend
const storedKey = localStorage.getItem("kite_api_key");
const storedSecret = localStorage.getItem("kite_api_secret");

if (storedKey && storedSecret) {
  await fetch("http://127.0.0.1:8000/config", {
    method: "POST",
    body: JSON.stringify({ api_key: storedKey, api_secret: storedSecret })
  });
}
```

### What Gets Stored Where

| Data | Storage | Persistence |
|------|---------|-------------|
| API Key | localStorage | Until cleared |
| API Secret | localStorage | Until cleared |
| Access Token | Backend memory | Until server restart |
| Positions | Backend + Store | Fetched on demand |
| Candles | Svelte store | Session only |
| Settings (sensitivity) | Svelte store | Session only |

---

## Performance Tips

### Reducing UI Lag

The most expensive CSS effects are `backdrop-filter: blur()` and complex gradients. Here are the optimizations applied:

| Optimization | Before | After |
|--------------|--------|-------|
| Price card blur | `backdrop-blur-2xl` (24px) | `backdrop-blur-md` (12px) |
| EMA smoothing | `ULTRA_SMOOTH` (0.15) | `SNAPPY` (0.7) |
| Position updates | `top: X%` | `transform: translateY()` |
| GPU hints | None | `will-change: transform` |

### GPU-Accelerated Properties

Use these for smooth animations:
```css
/* Good - GPU accelerated */
transform: translateX/Y/Z()
opacity

/* Avoid - triggers layout/paint */
top, left, right, bottom
width, height
```

### Blur Guidelines

| Blur Radius | Performance | Use Case |
|-------------|-------------|----------|
| 4-8px | Excellent | Order info badges |
| 12-16px | Good | Main UI cards |
| 24px+ | Poor | Avoid in animated elements |

---

## Configuration Files

### Frontend: `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true
      },
      '/ws': {
        target: process.env.VITE_WS_URL || 'ws://localhost:8000',
        ws: true
      }
    }
  }
});
```

### Frontend: `svelte.config.js`

```javascript
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};
```

### Backend: `requirements.txt`

```
fastapi>=0.100.0
uvicorn>=0.20.0
kiteconnect>=4.0.0
python-dotenv>=1.0.0
pydantic>=2.0.0
websockets>=10.0
```

### Backend: `.env`

```env
KITE_API_KEY=your_32_char_api_key
KITE_API_SECRET=your_api_secret
KITE_REDIRECT_URL=http://localhost:5173
SECRET_KEY=random_string_for_session_signing
```

---

## Performance Considerations

### Frame Rate Targets

| Component | Target FPS | Actual |
|-----------|------------|--------|
| MediaPipe Face | 30 | ~25-30 |
| MediaPipe Hands | 30 | ~20-25 |
| Three.js Render | 60 | ~60 |

### Optimization Techniques

1. **EMA Smoothing** - Reduces jitter without extra computation
2. **Debouncing** - Prevents rapid state changes
3. **Hysteresis** - Prevents flickering at threshold boundaries
4. **Singleton Services** - Single instance of Kite client
5. **CSS Transitions** - GPU-accelerated animations for UI

---

## Debugging Tips

### Enable Debug Overlay

The FaceTracker component shows debug information:
- Hand detection status
- Pinch distance value
- Number of hands detected

### Console Logging

Key events are logged with prefixes:
- `[BYOK]` - Bring Your Own Key configuration
- `[OrderService]` - Order placement
- `[ETF]` - Symbol data fetching
- `[Ticker]` - WebSocket streaming

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Hand not detected | Lighting | Improve room lighting |
| False pinch triggers | Loose fist | Close fist more tightly |
| Order fails | Session expired | Re-login to Kite |
| Chart not loading | Backend down | Check uvicorn is running |
