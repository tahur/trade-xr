# Revamped Control Center & Gesture UI Updates

This document summarizes the architectural and functional changes made to the HoloTrade interface, specifically focusing on the new **Control Center**, component layout, and gesture interaction.

---

## 1. Unified Control Center (`ControlCenter.svelte`)

### **Overview**
The `ControlCenter` component consolidates the functionality of the previous `StatusBar`, `SettingsCard`, and `ApiKeyModal` into a single, unified "Dynamic Island" style UI element.

### **Key Features**
*   **Location**: Fixed at the **Bottom-Left** (`bottom-6 left-6`).
*   **Design**: Glassmorphic styling with smooth expansion animations.
*   **States**:
    *   **COMPACT**: Minimal view showing Camera Toggle, API Status, and Settings button.
    *   **SETTINGS**: Expands to show sliders for Parallax Intensity, Gesture Sensitivity, and Hand Preference.
    *   **API_CONFIG**: Expands to allow entry/update of Kite API Key and Secret.
*   **Smart Interaction**:
    *   **Auto-Connect**: Clicking the status indicator when keys are already configured triggers an immediate connection attempt.
    *   **Update Option**: "Update API Keys" button within the Settings view allows users to modify stored credentials.
    *   **Camera Toggle**: Integrated button to enable/disable the webcam and tracking.

---

## 2. Face Tracker & Camera Feed (`FaceTracker.svelte`)

### **Layout**
*   **Position**: Fixed at **Bottom-Right** (`bottom-6 right-6`) to prevent overlap with Control Center.
*   **Debug Overlay**: Shows real-time gesture detection info:
    - Hand detection status & side (Left/Right)
    - Pinch distance & state
    - Number of hands detected
    - **Detected gesture** (Pointing_Up, Thumbs_Up, etc.)

### **Gesture Recognition (STABLE - DO NOT MODIFY)**
The following logic is working correctly and should not be changed:
*   **Finger Extension**: Simple Y-axis check (`tip.y < mcp.y`)
*   **Pointing_Up**: `fingersUp === 1 && idxOpen`
*   **Stability Threshold**: Hand velocity < 0.3

---

## 3. Price Target Overlay (`PriceTargetOverlay.svelte`)

### **State Machine (STABLE)**
| State | Trigger | Action |
|-------|---------|--------|
| IDLE → TARGETING | Hand detected + stable + no pinch | Show targeting line |
| TARGETING → LOCKED | Pinch + stable + hold 350ms | Lock price |
| LOCKED → CONFIRMING | Point Up + hold 400ms | Show confirm zone |
| CONFIRMING → ORDER_PLACED | Thumbs Up + hold 500ms | Place order |

### **Timing Constants (Current)**
```javascript
ENTRY_DELAY_MS = 200;      // Time before targeting activates
LOCK_DELAY_MS = 350;       // Hold pinch to lock
CONFIRM_DELAY_MS = 400;    // Hold point up to confirm
ORDER_DELAY_MS = 500;      // Hold thumbs up to place order
POST_LOCK_COOLDOWN = 400;  // Cooldown after locking
```

---

## 4. Zoom (DO NOT MODIFY)

Two-hand pinch zoom is working correctly via:
- `gestureBus.ts` for O(1) event dispatching
- `AnimationController.ts` for physics-based animation
- `zoomCooldownActive` store for blocking trading during zoom

---

## Summary of Current File Positions
| Component | Position |
|-----------|----------|
| ControlCenter | `bottom-6 left-6` |
| FaceTracker | `bottom-6 right-6` |
| DynamicIsland | Top center |
| PriceTargetOverlay | Full screen overlay |
