<script lang="ts">
    import { onMount } from "svelte";
    import { gestureState } from "$lib/stores/gesture";
    import { uiState } from "$lib/stores/uiState";
    import { SUPPORTED_ETFS, type ETFConfig } from "$lib/config/etfs";
    import IsometricCard from "./IsometricCard.svelte";
    import { spring } from "svelte/motion";
    import { fade } from "svelte/transition";

    export let selectedETF: ETFConfig;
    export let onSelect: (etf: ETFConfig) => void;

    // === DECK STATE ===
    // Is the deck "Unlocked" and interactive?
    let isDeckActive = false;

    // Sync with global store for other components
    $: uiState.update((s) => ({ ...s, isDeckOpen: isDeckActive }));

    // === GESTURE TOGGLE LOGIC ===
    let victoryDebounce: NodeJS.Timeout | null = null;

    $: gesture = $gestureState.detectedGesture;

    $: {
        // TOGGLE ON: Victory Gesture
        if (gesture === "Victory" && !isDeckActive && !victoryDebounce) {
            victoryDebounce = setTimeout(() => {
                if ($gestureState.detectedGesture === "Victory") {
                    isDeckActive = true;
                    // Haptic feedback
                    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                }
                victoryDebounce = null;
            }, 500); // Hold for 0.5s to unlock
        }

        // TOGGLE OFF (CANCEL): Closed Fist
        if (gesture === "Closed_Fist" && isDeckActive) {
            isDeckActive = false;
        }
    }

    // === CAROUSEL SCROLL LOGIC ===
    // Tuned for stability (Anti-Jitter)
    // Lower stiffness = Smoother filtering of hand shake
    // High Damping = No "fluidic" wobble/overshoot
    const scrollSpring = spring(0, {
        stiffness: 0.08,
        damping: 0.9,
        precision: 0.05,
    });

    // Focused index (integer)
    let focusedIndex = 0;

    $: {
        if (isDeckActive && $gestureState.isHandDetected) {
            const hand = $gestureState.handPosition;

            // Map Hand X (0.1 - 0.9) to Scroll Index Range
            // Left side = Index 0, Right side = Last Index
            const scrollRange = SUPPORTED_ETFS.length - 1;

            // Map 0.1-0.9 to 0-1 for comfort margins
            const normalizedX = Math.max(0, Math.min(1, (hand.x - 0.1) / 0.8));

            // Snap to nearest integer (Card) to prevent "in-between" floating
            const targetScroll = Math.round(normalizedX * scrollRange);
            scrollSpring.set(targetScroll);
        } else if (!isDeckActive) {
            // When inactive, snap to the CURRENTLY SELECTED ETF
            const selectedIndex = SUPPORTED_ETFS.findIndex(
                (e) => e.symbol === selectedETF.symbol,
            );
            if (selectedIndex >= 0) {
                scrollSpring.set(selectedIndex);
            }
        }
    }

    $: focusedIndex = Math.round($scrollSpring);

    // === SELECTION LOGIC (POINT TO CONFIRM) ===
    let pointDebounce: NodeJS.Timeout | null = null;
    const POINT_CONFIRM_DELAY = 600; // Hold point for 0.6s to confirm

    $: {
        // Point Up to Select focused card
        if (isDeckActive && $gestureState.detectedGesture === "Pointing_Up") {
            if (!pointDebounce) {
                pointDebounce = setTimeout(() => {
                    // Double check if still pointing
                    if ($gestureState.detectedGesture === "Pointing_Up") {
                        const targetETF = SUPPORTED_ETFS[focusedIndex];
                        if (targetETF) {
                            onSelect(targetETF);
                            // Close deck on selection
                            isDeckActive = false;

                            // Success Haptic
                            if (navigator.vibrate)
                                navigator.vibrate([50, 50, 100]);
                        }
                    }
                    pointDebounce = null;
                }, POINT_CONFIRM_DELAY);
            }
        } else {
            // Cancel debounce if gesture changes
            if (pointDebounce) {
                clearTimeout(pointDebounce);
                pointDebounce = null;
            }
        }
    }
</script>

<!-- BACKDROP (Selector Mode) -->
{#if isDeckActive}
    <div
        class="fixed inset-0 bg-black/60 backdrop-blur-xl z-80 transition-opacity duration-300"
        transition:fade={{ duration: 300 }}
    ></div>
{/if}

<!-- Container is always present but only visible/interactive when Active -->
<div class="deck-container" class:active={isDeckActive}>
    <!-- Floating Header -->
    <div class="deck-header" class:visible={isDeckActive}>
        <div class="title">SELECT INSTRUMENT</div>
        {#if !isDeckActive}
            <div class="hint">✌️ VICTORY TO OPEN</div>
        {/if}
    </div>

    <!-- 3D Scene -->
    <div class="scene" class:faded={!isDeckActive}>
        <div class="deck">
            {#each SUPPORTED_ETFS as etf, i}
                <IsometricCard
                    {etf}
                    index={i}
                    offset={i - $scrollSpring}
                    isActive={selectedETF.symbol === etf.symbol}
                    isFocused={i === focusedIndex}
                />
            {/each}
        </div>
    </div>

    <!-- SCRUBBER DIAL (Bottom) -->
    {#if isDeckActive}
        <div class="scrubber-container" transition:fade>
            <div class="scrubber-track"></div>
            <!-- Thumb -->
            <div
                class="scrubber-thumb"
                style="left: {($scrollSpring / (SUPPORTED_ETFS.length - 1)) *
                    100}%"
            ></div>

            <div class="instruction">PINCH TO SELECT • FIST TO EXIT</div>
        </div>
    {/if}
</div>

<style>
    /* === STYLES === */
    .deck-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 100vh;
        pointer-events: none;
        z-index: 90;

        display: flex;
        justify-content: center;
        align-items: center;
        background: radial-gradient(
            circle at center,
            rgba(0, 0, 0, 0.4) 0%,
            rgba(0, 0, 0, 0.8) 100%
        );
    }

    .deck-header {
        position: absolute;
        top: 12%;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);

        display: flex; /* Centered Pill */
        align-items: center;
        justify-content: center;

        opacity: 0;
        transition:
            opacity 0.3s,
            transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* Springy pop */
    }

    .deck-header.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }

    .title {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 8px 20px;
        border-radius: 100px;

        font-family: "Inter", sans-serif;
        font-weight: 600;
        font-size: 13px;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.9);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .hint {
        position: absolute;
        top: 130%;
        width: 100%;
        text-align: center;
        font-size: 10px;
        opacity: 0.5;
        letter-spacing: 0.1em;
        color: rgba(255, 255, 255, 0.6);
    }

    .scene {
        position: relative;
        width: 100%;
        height: 100%;
        opacity: 1;
        transition: opacity 0.4s ease;
    }

    .scene.faded {
        opacity: 0;
        pointer-events: none;
    }

    .deck {
        position: absolute;
        width: 100%;
        height: 100%;
    }

    /* Scrubber Styles - iOS Home Indicator Style */
    .scrubber-container {
        position: absolute;
        bottom: 15%;
        left: 50%;
        transform: translateX(-50%);
        width: 200px; /* Helper width */
        height: 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    .scrubber-track {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 44px; /* Touch target size */
        background: rgba(255, 255, 255, 0.05);
        border-radius: 22px;
        transform: translateY(-50%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
    }

    /* Progress fill - Subtle hint */
    .scrubber-track::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        width: var(--progress, 0%);
        background: rgba(255, 255, 255, 0.05);
        border-radius: 22px;
    }

    .scrubber-thumb {
        position: absolute;
        top: 50%;
        width: 44px; /* Pill Thumb */
        height: 6px;
        background: #fff;
        border-radius: 10px;
        transform: translate(-50%, -50%);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        transition: left 0.1s linear;
        z-index: 10;

        /* Make it look like home indicator */
    }

    .instruction {
        position: absolute;
        bottom: -24px;
        font-family: "Inter", sans-serif;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.4);
        letter-spacing: 0.1em;
        text-align: center;
        white-space: nowrap;
        font-weight: 500;
    }
</style>
