<script lang="ts">
    /**
     * DynamicConfirmZone - Gesture-based order confirmation
     *
     * The zone spawns at the user's hand position when thumbs up is detected.
     * User must hold thumbs up steady inside the zone for 1.5s to confirm.
     * Moving hand outside zone resets progress.
     */

    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { fade, scale } from "svelte/transition";
    import { spring } from "svelte/motion";
    import { gestureState } from "$lib/stores/gesture";
    import { ENGINE_CONFIG } from "$lib/services/gestureEngine";

    const dispatch = createEventDispatcher<{
        confirm: void;
        cancel: void;
    }>();

    // Props
    export let isActive: boolean = false;
    export let orderDetails: {
        side: "BUY" | "SELL";
        quantity: number;
        price: number;
    } | null = null;

    // Track which gesture triggered the zone (for BUY vs SELL)
    let activeGesture: "Thumbs_Up" | "Thumbs_Down" | null = null;

    // === ZONE STATE ===
    // Use spring for smooth, jitter-free positioning
    const zonePosition = spring(
        { x: 50, y: 50 },
        {
            stiffness: 0.3,
            damping: 0.9,
        },
    );

    let zoneSpawned = false;
    let progress = 0; // 0 to 1
    let holdStartTime: number | null = null;
    let isComplete = false;
    let animationFrame: number | null = null;

    // Store locked center for distance calculations (normalized 0-1)
    let lockedCenter = { x: 0.5, y: 0.5 };

    // === CONSTANTS ===
    const ZONE_RADIUS = ENGINE_CONFIG.CONFIRM_ZONE_RADIUS; // 0.12 = 12% of viewport
    const HOLD_DURATION_MS = ENGINE_CONFIG.CONFIRM_HOLD_MS; // 1500ms
    const CIRCUMFERENCE = 2 * Math.PI * 45; // SVG circle with r=45

    // === HELPERS ===
    function distance(
        a: { x: number; y: number },
        b: { x: number; y: number },
    ): number {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    function resetZone() {
        zoneSpawned = false;
        progress = 0;
        holdStartTime = null;
        isComplete = false;
        activeGesture = null;
    }

    // === MAIN LOGIC ===
    function tick() {
        if (!isActive) {
            resetZone();
            return;
        }

        const currentGesture = $gestureState.detectedGesture;
        const handPos = $gestureState.handPosition;
        const isThumbsUp = currentGesture === "Thumbs_Up";
        const isThumbsDown = currentGesture === "Thumbs_Down";
        const isConfirmGesture = isThumbsUp || isThumbsDown;
        const isClosedFist = currentGesture === "Closed_Fist";

        // Cancel on closed fist
        if (isClosedFist) {
            dispatch("cancel");
            resetZone();
            return;
        }

        // Step 1: Spawn zone at FIXED CENTER when thumbs up/down first detected
        if (isConfirmGesture && !zoneSpawned && $gestureState.isHandDetected) {
            // Fixed center position - not following hand
            lockedCenter = { x: 0.5, y: 0.5 };
            zonePosition.set({ x: 50, y: 50 }, { hard: true });
            zoneSpawned = true;
            holdStartTime = performance.now();
            // Track which gesture started the zone
            activeGesture = isThumbsUp ? "Thumbs_Up" : "Thumbs_Down";
        }

        // Step 2: Track progress while same gesture is held in zone
        const isSameGesture =
            (activeGesture === "Thumbs_Up" && isThumbsUp) ||
            (activeGesture === "Thumbs_Down" && isThumbsDown);

        if (zoneSpawned && isSameGesture && $gestureState.isHandDetected) {
            const dist = distance(handPos, lockedCenter);

            if (dist < ZONE_RADIUS) {
                // Hand is in zone - update progress
                const elapsed =
                    performance.now() - (holdStartTime || performance.now());
                progress = Math.min(1, elapsed / HOLD_DURATION_MS);

                // Check for completion
                if (progress >= 1 && !isComplete) {
                    isComplete = true;
                    // Haptic feedback if available
                    if ("vibrate" in navigator) {
                        navigator.vibrate([50, 30, 50]);
                    }
                    dispatch("confirm");
                }
            } else {
                // Hand moved outside zone - reset progress
                progress = 0;
                holdStartTime = performance.now(); // Restart timer
            }
        }

        // Step 3: Reset if gesture released (neither thumbs up nor down)
        if (!isConfirmGesture && zoneSpawned && !isComplete) {
            resetZone();
        }

        // Continue animation loop
        if (isActive) {
            animationFrame = requestAnimationFrame(tick);
        }
    }

    // Start/stop animation loop based on isActive
    $: if (isActive) {
        if (animationFrame === null) {
            animationFrame = requestAnimationFrame(tick);
        }
    } else {
        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        resetZone();
    }

    onDestroy(() => {
        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
        }
    });

    // Calculate derived values - use spring values for display
    $: strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    $: isHandInZone =
        zoneSpawned &&
        distance($gestureState.handPosition, lockedCenter) < ZONE_RADIUS;
    $: isSellMode = activeGesture === "Thumbs_Down";
    $: currentEmoji = isSellMode ? "👎" : "👍";
</script>

{#if isActive && zoneSpawned}
    <div
        class="confirm-zone"
        style="left: {$zonePosition.x}%; top: {$zonePosition.y}%"
        transition:scale={{ duration: 200, start: 0.8 }}
    >
        <!-- Outer glow ring -->
        <div
            class="zone-ring"
            class:hand-inside={isHandInZone}
            class:complete={isComplete}
            class:sell-mode={isSellMode}
        >
            <!-- Background Circle -->
            <svg viewBox="0 0 100 100" class="progress-svg">
                <!-- Track -->
                <circle cx="50" cy="50" r="45" class="track-ring" />
                <!-- Progress -->
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    class="progress-ring"
                    stroke-dasharray={CIRCUMFERENCE}
                    stroke-dashoffset={strokeDashoffset}
                    class:filling={progress > 0}
                />
            </svg>

            <!-- Center Content -->
            <div class="center-content">
                {#if isComplete}
                    <span
                        class="checkmark"
                        class:sell={isSellMode}
                        transition:scale={{ duration: 200 }}>✓</span
                    >
                {:else}
                    <span class="emoji">{currentEmoji}</span>
                {/if}
            </div>
        </div>

        <!-- Order Details -->
        {#if orderDetails && !isComplete}
            <div class="order-info" transition:fade={{ duration: 150 }}>
                <span
                    class="side"
                    class:buy={orderDetails.side === "BUY"}
                    class:sell={orderDetails.side === "SELL"}
                >
                    {orderDetails.side}
                </span>
                <span class="details">
                    {orderDetails.quantity} @ ₹{orderDetails.price.toFixed(2)}
                </span>
            </div>
        {/if}

        <!-- Status Text -->
        <p class="status-text">
            {#if isComplete}
                Order Confirmed!
            {:else if isHandInZone}
                Hold steady... {Math.round(progress * 100)}%
            {:else}
                Move thumb into zone
            {/if}
        </p>
    </div>
{/if}

<style>
    .confirm-zone {
        position: fixed;
        transform: translate(-50%, -50%);
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        pointer-events: none;
    }

    .zone-ring {
        width: 160px;
        height: 160px;
        border-radius: 50%;
        position: relative;

        /* Holographic base (BUY - Emerald) */
        background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.15) 0%,
            rgba(16, 185, 129, 0.05) 60%,
            transparent 80%
        );
        border: 2px solid rgba(16, 185, 129, 0.4);
        box-shadow:
            0 0 50px rgba(16, 185, 129, 0.2),
            inset 0 0 30px rgba(16, 185, 129, 0.1);

        transition: all 0.3s ease;
    }

    .zone-ring.hand-inside {
        border-color: rgba(52, 211, 153, 0.8);
        box-shadow:
            0 0 70px rgba(52, 211, 153, 0.4),
            inset 0 0 40px rgba(52, 211, 153, 0.2);
    }

    .zone-ring.complete {
        border-color: rgba(52, 211, 153, 1);
        box-shadow:
            0 0 100px rgba(52, 211, 153, 0.6),
            inset 0 0 60px rgba(52, 211, 153, 0.4);
        animation: pulse 0.5s ease;
    }

    /* SELL mode - rose/red colors */
    .zone-ring.sell-mode {
        background: radial-gradient(
            circle,
            rgba(244, 63, 94, 0.15) 0%,
            rgba(244, 63, 94, 0.05) 60%,
            transparent 80%
        );
        border: 2px solid rgba(244, 63, 94, 0.4);
        box-shadow:
            0 0 50px rgba(244, 63, 94, 0.2),
            inset 0 0 30px rgba(244, 63, 94, 0.1);
    }

    .zone-ring.sell-mode.hand-inside {
        border-color: rgba(251, 113, 133, 0.8);
        box-shadow:
            0 0 70px rgba(251, 113, 133, 0.4),
            inset 0 0 40px rgba(251, 113, 133, 0.2);
    }

    .zone-ring.sell-mode.complete {
        border-color: rgba(251, 113, 133, 1);
        box-shadow:
            0 0 100px rgba(251, 113, 133, 0.6),
            inset 0 0 60px rgba(251, 113, 133, 0.4);
    }

    @keyframes pulse {
        0%,
        100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
    }

    .progress-svg {
        position: absolute;
        inset: 0;
        transform: rotate(-90deg);
    }

    .track-ring {
        fill: none;
        stroke: rgba(16, 185, 129, 0.1);
        stroke-width: 3;
    }

    .progress-ring {
        fill: none;
        stroke: #10b981;
        stroke-width: 4;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.1s linear;
    }

    .progress-ring.filling {
        filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.8));
    }

    .center-content {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .emoji {
        font-size: 48px;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
    }

    .checkmark {
        font-size: 56px;
        color: #10b981;
        font-weight: bold;
        filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.5));
        animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .checkmark.sell {
        color: #f43f5e;
        filter: drop-shadow(0 0 10px rgba(244, 63, 94, 0.5));
    }

    @keyframes pop {
        0% {
            transform: scale(0);
            opacity: 0;
        }
        70% {
            transform: scale(1.2);
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }

    .order-info {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        background: rgba(2, 6, 23, 0.85);
        backdrop-filter: blur(12px);
        border-radius: 12px;
        border: 1px solid rgba(16, 185, 129, 0.3);
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
    }

    .side {
        font-size: 11px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .side.buy {
        background: rgba(52, 211, 153, 0.1);
        color: #34d399;
        border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .side.sell {
        background: rgba(244, 63, 94, 0.1);
        color: #f43f5e;
        border: 1px solid rgba(244, 63, 94, 0.3);
    }

    .details {
        font-size: 14px;
        color: #ffffff;
        font-family: monospace;
        font-weight: 700;
        letter-spacing: -0.02em;
    }

    .status-text {
        color: rgba(52, 211, 153, 0.8);
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
    }
</style>
