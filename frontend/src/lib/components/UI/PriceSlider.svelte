<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { spring } from "svelte/motion";
    import { fade } from "svelte/transition";
    import {
        gestureState,
        tradingHandPreference,
        zoomCooldownActive,
    } from "$lib/stores/gesture";
    import { tradingStore } from "$lib/stores/trading";
    import { twoHandPinch } from "$lib/stores/tracking";

    export let currentPrice: number = 0;
    export let gestureSensitivity: number = 0.08;

    // Slider State
    let startHandY: number | null = null;
    let startHandX: number | null = null;
    let startPrice: number = 0;

    // Smooth Price Store (Spring Physics) - Snappy response
    const selectedPrice = spring(0, {
        stiffness: 0.4, // Higher stiffness = faster response
        damping: 0.7, // Balanced damping
    });

    // Order Flow State
    let isOrderWindowOpen = false;
    let orderPlaced = false;

    // Quantity State (Scrubbing)
    const selectedQty = spring(1, { stiffness: 0.1, damping: 0.5 });
    let startQty: number = 1;
    let startQtyHandX: number | null = null;

    // Peristent State
    let confirmedPrice: number | null = null;

    let isVisible = false;
    let isLocked = false;

    // Reactivity for Gestures
    $: {
        // 1. OPEN ORDER WINDOW: Point Up when Price Confirmed
        if (confirmedPrice !== null && !isOrderWindowOpen && !orderPlaced) {
            if ($gestureState.detectedGesture === "Pointing_Up") {
                isOrderWindowOpen = true;
                // Initialize Qty
                selectedQty.set(1, { hard: true });
            }
            // CANCEL/RESET: Closed Fist clears confirmed price
            if ($gestureState.detectedGesture === "Closed_Fist") {
                confirmedPrice = null;
                isOrderWindowOpen = false;
                // Reset slider spring?
                selectedPrice.set(currentPrice, { hard: true });
            }
        }

        // 2. INSIDE ORDER WINDOW
        if (isOrderWindowOpen) {
            // A) QUANTITY ADJUSTMENT (Pinch & Drag)
            if ($gestureState.isPinching) {
                if (startQtyHandX === null) {
                    // Start Scrubbing
                    startQtyHandX = $gestureState.handPosition.x;
                    startQty = $selectedQty;
                } else {
                    // Dragging
                    const dx = $gestureState.handPosition.x - startQtyHandX;
                    // Sensitivity: 1.0 movement = +100 units? Adjust as needed
                    // Let's say full screen width (1.0) = 50 units change
                    const change = dx * 100;
                    const target = Math.max(1, Math.round(startQty + change));
                    selectedQty.set(target);
                }
            } else {
                startQtyHandX = null;
            }

            // B) CONFIRM: Thumbs Up
            if ($gestureState.detectedGesture === "Thumbs_Up") {
                console.log(
                    `[ORDER] Placed Limit Order: Price ${confirmedPrice}, Qty ${Math.round($selectedQty)}`,
                );
                orderPlaced = true;
                // Close window after delay?
                setTimeout(() => {
                    isOrderWindowOpen = false;
                    confirmedPrice = null; // Reset flow
                    orderPlaced = false;
                }, 2000);
            }

            // C) CANCEL: Closed Fist
            if ($gestureState.detectedGesture === "Closed_Fist") {
                isOrderWindowOpen = false;
                confirmedPrice = null; // Clear everything
            }
        }
    }

    // State Machine for Stability
    type SliderState = "HIDDEN" | "PRE_ACTIVE" | "ACTIVE" | "LOCKED";
    let currentState: SliderState = "HIDDEN";

    // Constants - Minimal delays for instant response
    const HIDE_DELAY_MS = 50; // Quick hide, minimal flicker prevention
    const HAND_LOSS_GRACE_MS = 100; // Brief grace period

    // Timers
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;

    // Helper to clear timers
    const clearTimers = () => {
        if (hideTimer) clearTimeout(hideTimer);
        if (graceTimer) clearTimeout(graceTimer);
        hideTimer = null;
        graceTimer = null;
    };

    onDestroy(() => clearTimers());

    // Main Logic Loop
    $: {
        // 1. Check conditions
        const isPreferredHand =
            $gestureState.primaryHandSide === $tradingHandPreference;

        const isSingleHand = $gestureState.numHandsDetected === 1;

        // NEW: Trading Zone Check - hand must be in lower portion of screen
        // Prevents triggers when hand is near face (scratching head, etc.)
        // Y < 0.35 means hand is too high (near face area)
        const isInTradingZone = $gestureState.handPosition.y > 0.35;

        // NEW: Stability check - hand must not be moving too fast (TIGHTER)
        const isStableEnough =
            Math.abs($gestureState.handVelocity.x) < 0.8 &&
            Math.abs($gestureState.handVelocity.y) < 0.8;

        // Use the FaceTracker's stable flag for additional confirmation
        const isHandStable = $gestureState.isHandStable;

        // Combined valid hand check - require stability for ENTRY
        const isHandValid =
            isPreferredHand &&
            isSingleHand &&
            isInTradingZone &&
            isStableEnough &&
            isHandStable; // FaceTracker stability check

        const isZooming = $twoHandPinch.isActive || $zoomCooldownActive;

        // Use isPinching directly from FaceTracker (has confirmation timer now)
        // Stricter gesture filtering - only allow pinch when hand is in neutral state
        const allowedGestures = ["None", "Open_Palm"]; // Removed Pointing_Up - too easy to falsely trigger
        const isIntentionalPinch =
            $gestureState.isPinching &&
            allowedGestures.includes($gestureState.detectedGesture);

        // 2. State Transitions
        if (!isOrderWindowOpen && !orderPlaced) {
            // ENTRY: Valid Hand + Intentional Pinch + Not Zooming
            if (isHandValid && isIntentionalPinch && !isZooming) {
                // RECOVERY: If we were in grace period, reset anchors to prevent jump
                if (hideTimer) {
                    startHandY = $gestureState.handPosition.y;
                    startHandX = $gestureState.handPosition.x;
                    startPrice = $selectedPrice; // Resume from current smoothed price
                }

                clearTimers(); // Valid signal, clear any hide timers

                if (
                    currentState === "HIDDEN" ||
                    currentState === "PRE_ACTIVE"
                ) {
                    currentState = "ACTIVE";

                    // Initialize Slider Positions
                    if (startHandY === null) {
                        isVisible = true;
                        isLocked = false;
                        startHandY = $gestureState.handPosition.y;
                        startHandX = $gestureState.handPosition.x;
                        startPrice = confirmedPrice ?? currentPrice;
                        selectedPrice.set(startPrice, { hard: true });
                    }
                }
            }

            // EXIT / GRACE: Signal Lost
            else {
                // If we were active/locked, handle graceful exit
                if (currentState === "ACTIVE" || currentState === "LOCKED") {
                    // If locked, we stay locked until explicit release or cancel
                    if (currentState === "LOCKED") {
                        // Keep visible
                    } else {
                        // Not locked, check why we lost signal
                        if (isZooming) {
                            // Immediate hide on zoom capability
                            currentState = "HIDDEN";
                            isVisible = false;
                            clearTimers();
                            startHandY = null;
                            startHandX = null;
                        } else if (!hideTimer) {
                            // Determine delay: Longer grace for hand loss vs pinch release
                            const delay = !isHandValid
                                ? HAND_LOSS_GRACE_MS
                                : HIDE_DELAY_MS;

                            hideTimer = setTimeout(() => {
                                currentState = "HIDDEN";
                                isVisible = false;
                                startHandY = null;
                                startHandX = null;
                            }, delay);
                        }
                    }
                }
            }

            // 3. Active State Logic (Dragging)
            if (
                (currentState === "ACTIVE" || currentState === "LOCKED") &&
                startHandY !== null &&
                startHandX !== null &&
                // Only update position if hand is valid (freeze during grace period)
                isHandValid
            ) {
                // Dragging Logic
                const dy = startHandY - $gestureState.handPosition.y;
                const dx = $gestureState.handPosition.x - startHandX;

                // === VELOCITY-CONFIRMED SWIPE RIGHT TO LOCK ===
                if (currentState !== "LOCKED") {
                    // Require CLEAR intentional swipe: more displacement AND more velocity
                    const isSwipingRight =
                        dx > 0.18 && $gestureState.handVelocity.x > 0.6;

                    if (isSwipingRight) {
                        currentState = "LOCKED";
                        isLocked = true;
                        confirmedPrice = $selectedPrice;
                    }
                } else {
                    // Unlock check - swipe back left to unlock
                    const isSwipingLeft =
                        dx < 0.05 && $gestureState.handVelocity.x < -0.2;
                    if (isSwipingLeft) {
                        currentState = "ACTIVE";
                        isLocked = false;
                        // Reset anchor to current position for smooth continuation
                        startHandX = $gestureState.handPosition.x;
                    }
                }

                // === DEAD ZONE FOR PRICE UPDATES ===
                if (currentState !== "LOCKED") {
                    const DEAD_ZONE = 0.015; // Ignore tiny movements

                    if (Math.abs(dy) > DEAD_ZONE) {
                        // Apply dead zone offset for smooth entry
                        const adjustedDy = dy - Math.sign(dy) * DEAD_ZONE;
                        const sign = Math.sign(adjustedDy);
                        const mag = Math.abs(adjustedDy);
                        const nonLinearDy = sign * Math.pow(mag, 1.5);
                        const percentChange =
                            nonLinearDy * (gestureSensitivity * 5);
                        const target = startPrice * (1 + percentChange);
                        selectedPrice.set(target);
                    }
                    // If within dead zone, price stays stable (no update needed)
                }
            }
        }
    }

    // Visual Helpers
    $: priceDiff = $selectedPrice - startPrice;
    $: percentDiff = ((priceDiff / startPrice) * 100).toFixed(2);
    $: isPositive = priceDiff >= 0;
</script>

{#if isVisible || confirmedPrice !== null}
    <!-- Container -->
    <div class="fixed inset-0 pointer-events-none z-50">
        <!-- 1. ADJUST MODE: Side Slider -->
        <!-- Visible when adjusting and NOT locked yet -->
        <div
            class={`absolute top-0 right-32 bottom-0 w-32 flex items-center transition-all duration-300 ${isVisible && !isLocked && !isOrderWindowOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`}
        >
            <!-- Track -->
            <div
                class="relative h-2/3 w-1.5 bg-white/20 backdrop-blur-md rounded-full mx-auto overflow-hidden border border-white/30 shadow-lg"
            >
                <div
                    class="absolute top-1/2 left-0 right-0 h-0.5 bg-white/60 shadow-[0_0_5px_white]"
                ></div>
                <!-- Use $selectedPrice for reactive reads -->
                <div
                    class={`absolute w-full left-0 right-0 transition-all duration-75 ${isPositive ? "bottom-1/2 bg-emerald-400" : "top-1/2 bg-rose-400"}`}
                    style={`height: ${Math.min(Math.abs((($selectedPrice - startPrice) / (startPrice * 0.1)) * 50), 50)}%`}
                ></div>
            </div>

            <!-- Rectangular High-Contrast Card -->
            <div
                class="absolute right-8 p-3 bg-[#E8E8E8] border border-white shadow-xl text-right min-w-[140px] transition-all duration-100 ease-out rounded-sm"
                style={`top: ${50 - (($selectedPrice - startPrice) / (startPrice * 0.1)) * 40}%; transform: translateY(-50%)`}
            >
                <div
                    class="text-[9px] uppercase text-zinc-500 font-bold tracking-widest mb-0.5 flex justify-between"
                >
                    <span>SET PRICE</span>
                    <span class="text-emerald-500">⚡️ DYNAMIC</span>
                </div>
                <!-- Use $selectedPrice -->
                <div
                    class="text-2xl font-mono text-zinc-900 font-bold tracking-tight"
                >
                    {$selectedPrice.toFixed(2)}
                </div>
                <div
                    class={`text-xs font-bold mt-0.5 flex justify-end items-center gap-1 ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
                >
                    <span>{isPositive ? "▲" : "▼"}</span>
                    <span>{percentDiff}%</span>
                </div>
                <!-- Instruction Hint -->
                <div
                    class="mt-2 text-[9px] uppercase font-bold text-zinc-400 flex items-center justify-end gap-1"
                >
                    <span>SWIPE RIGHT TO LOCK →</span>
                </div>
            </div>
        </div>

        <!-- 2. LOCKED MODE: Sticky Top Tile -->
        <!-- Always visible if confirmedPrice exists -->
        <div
            class={`absolute top-16 left-1/2 -translate-x-1/2 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) transform ${confirmedPrice !== null && !isOrderWindowOpen && !orderPlaced ? "translate-y-0 opacity-100 scale-100" : "-translate-y-20 opacity-0 scale-90"}`}
        >
            <div
                class={`px-6 py-3 rounded-sm bg-[#F0F0F0] border-2 border-white/80 shadow-2xl text-center min-w-[180px] transition-opacity duration-300 ${isVisible && !isLocked ? "opacity-50" : "opacity-100"}`}
            >
                <div
                    class="text-[10px] uppercase text-zinc-500 font-bold tracking-[0.2em] mb-1"
                >
                    CONFIRMED
                </div>
                <div
                    class="text-3xl font-mono text-zinc-900 font-extrabold tracking-tighter"
                >
                    {(confirmedPrice ?? 0).toFixed(2)}
                </div>
                <!-- Prompt for Next Step -->
                <div
                    class="mt-2 text-[10px] uppercase font-bold text-emerald-600 flex items-center justify-center gap-1 animate-pulse"
                >
                    <span>👆 POINT UP TO TRADE</span>
                    <span class="text-zinc-400 mx-1">|</span>
                    <span class="text-rose-500">✊ FIST TO CLEAR</span>
                </div>
            </div>
        </div>

        <!-- 3. ORDER QUANTITY WINDOW (New) -->
        {#if isOrderWindowOpen}
            <div
                class="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
                transition:fade
            >
                <div
                    class="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-emerald-500/30"
                >
                    <h2
                        class="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4"
                    >
                        Place Limit Order
                    </h2>

                    <div class="mb-6">
                        <div class="text-xs text-zinc-400 mb-1">PRICE</div>
                        <div class="text-4xl font-mono font-bold text-zinc-800">
                            {(confirmedPrice ?? 0).toFixed(2)}
                        </div>
                    </div>

                    <div
                        class="mb-8 p-6 bg-emerald-50 rounded-lg border border-emerald-100"
                    >
                        <div
                            class="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2"
                        >
                            QUANTITY
                        </div>
                        <div
                            class="text-5xl font-mono font-bold text-emerald-600 mb-2"
                        >
                            {Math.round($selectedQty)}
                        </div>

                        <!-- Visual Scrubber Track -->
                        <div
                            class="h-1.5 w-full bg-emerald-200 rounded-full overflow-hidden relative mt-4"
                        >
                            <!-- Indication of "infinite" roll? Or just a center pip? -->
                            <div
                                class="absolute top-0 bottom-0 bg-emerald-500 w-1/3 left-1/2 -translate-x-1/2 transition-transform duration-75"
                                style={`transform: translateX(${startQtyHandX && $gestureState.handPosition.x ? ($gestureState.handPosition.x - startQtyHandX) * 200 : 0}px) translateX(-50%)`}
                            ></div>
                        </div>
                        <div
                            class="text-[10px] text-emerald-400 mt-2 font-bold uppercase flex items-center justify-center gap-2"
                        >
                            <span>← PINCH & DRAG →</span>
                        </div>
                    </div>

                    <div
                        class="flex justify-between items-center text-[10px] font-bold uppercase text-zinc-400 tracking-wide border-t pt-4 border-zinc-100"
                    >
                        <div class="flex items-center gap-1">
                            <span class="text-xl">✊</span> CANCEL
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-xl">👍</span> CONFIRM
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <!-- 4. VICTORY SUCCESS MESSAGE -->
        {#if orderPlaced}
            <div
                class="absolute inset-0 flex items-center justify-center z-[70]"
            >
                <div
                    class="bg-emerald-500 text-white px-8 py-6 rounded-2xl shadow-[0_20px_60px_rgba(16,185,129,0.4)] text-center transform scale-125"
                >
                    <div class="text-6xl mb-2">🚀</div>
                    <div class="text-2xl font-bold tracking-tight">
                        ORDER PLACED!
                    </div>
                    <div class="text-emerald-100 font-mono mt-1">
                        {(confirmedPrice ?? 0).toFixed(2)} x {Math.round(
                            $selectedQty,
                        )}
                    </div>
                </div>
            </div>
        {/if}
    </div>
{/if}
