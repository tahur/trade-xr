<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import { gestureBar } from "$lib/stores/gestureBar";

    $: mode = $gestureBar.mode;
    $: zoomLevel = $gestureBar.zoomLevel;
    $: price = $gestureBar.price;

    // Gesture items configuration for each mode
    const GESTURES = {
        idle: [
            { icon: "👐", label: "Zoom", key: "zoom" },
            { icon: "✌️", label: "Portfolio", key: "portfolio" },
            { icon: "☝️", label: "Set Price", key: "price" },
        ],
        portfolio: [
            { icon: "👐", label: "Zoom", key: "zoom" },
            { icon: "✊", label: "Back", key: "back" },
        ],
        targeting: [
            { icon: "🤌", label: "Pinch Lock", key: "lock", active: true },
            { icon: "✊", label: "Cancel", key: "cancel", muted: true },
        ],
        locked: [
            { icon: "☝️", label: "Confirm", key: "confirm", active: true },
            { icon: "✊", label: "Cancel", key: "cancel", muted: true },
        ],
        confirming: [
            { icon: "👍", label: "Buy", key: "buy", variant: "buy" },
            { icon: "👎", label: "Sell", key: "sell", variant: "sell" },
        ],
    };

    $: currentGestures = GESTURES[mode] || GESTURES.idle;

    // Mode accent colors
    $: accentColor = {
        idle: "rgba(255,255,255,0.1)",
        zoom: "rgba(96,165,250,0.2)",
        targeting: "rgba(139,92,246,0.2)",
        locked: "rgba(34,211,238,0.2)",
        confirming: "rgba(251,191,36,0.2)",
        portfolio: "rgba(255,255,255,0.1)",
    }[mode];
</script>

<div
    class="gesture-bar"
    style="--accent: {accentColor}"
    transition:fade={{ duration: 150 }}
>
    {#key mode}
        <div
            class="content"
            in:scale={{ duration: 150, start: 0.95, easing: cubicOut }}
        >
            {#if mode === "zoom"}
                <!-- Zoom Mode - Prominent Display -->
                <div class="zoom-pill">
                    <span class="zoom-icon">🔍</span>
                    <span class="zoom-value">{zoomLevel}%</span>
                </div>
            {:else if mode === "locked" || mode === "confirming"}
                <!-- Show Price Badge in center -->
                {#each currentGestures as gesture, i}
                    {#if gesture.key === "confirm" || gesture.key === "buy"}
                        <div
                            class="gesture-chip"
                            class:active={gesture.active}
                            class:buy={gesture.variant === "buy"}
                        >
                            <span class="chip-icon">{gesture.icon}</span>
                            <span class="chip-label">{gesture.label}</span>
                        </div>
                    {/if}
                {/each}

                <div
                    class="price-pill"
                    class:confirming={mode === "confirming"}
                >
                    <span class="currency">₹</span>
                    <span class="price-value"
                        >{price?.toFixed(2) ?? "0.00"}</span
                    >
                </div>

                {#each currentGestures as gesture}
                    {#if gesture.key === "cancel" || gesture.key === "sell"}
                        <div
                            class="gesture-chip"
                            class:muted={gesture.muted}
                            class:sell={gesture.variant === "sell"}
                        >
                            <span class="chip-icon">{gesture.icon}</span>
                            <span class="chip-label">{gesture.label}</span>
                        </div>
                    {/if}
                {/each}
            {:else}
                <!-- Standard Mode - Gesture Hints -->
                {#each currentGestures as gesture, i}
                    <div
                        class="gesture-chip"
                        class:active={gesture.active}
                        class:muted={gesture.muted}
                    >
                        <span class="chip-icon">{gesture.icon}</span>
                        <span class="chip-label">{gesture.label}</span>
                    </div>
                    {#if i < currentGestures.length - 1}
                        <div class="dot-separator"></div>
                    {/if}
                {/each}
            {/if}
        </div>
    {/key}
</div>

<style>
    .gesture-bar {
        position: fixed;
        bottom: 1.25rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 40;

        /* Glassmorphism */
        background: linear-gradient(
            135deg,
            rgba(20, 20, 25, 0.85) 0%,
            rgba(30, 30, 40, 0.8) 100%
        );
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);

        /* Border with accent glow */
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 40px;
        box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);

        padding: 0.5rem 0.875rem;
    }

    .content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    /* Gesture Chip - Compact pill design */
    .gesture-chip {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.625rem;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.04);
        transition: all 0.15s ease;
    }

    .gesture-chip:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-1px);
    }

    .gesture-chip.active {
        background: var(--accent, rgba(255, 255, 255, 0.1));
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .gesture-chip.muted {
        opacity: 0.5;
    }

    .gesture-chip.buy:hover {
        background: rgba(16, 185, 129, 0.2);
    }

    .gesture-chip.sell:hover {
        background: rgba(244, 63, 94, 0.2);
    }

    .chip-icon {
        font-size: 0.875rem;
        line-height: 1;
    }

    .chip-label {
        font-size: 0.6875rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.75);
        letter-spacing: 0.015em;
        white-space: nowrap;
    }

    .gesture-chip.buy .chip-label {
        color: rgb(52, 211, 153);
    }

    .gesture-chip.sell .chip-label {
        color: rgb(251, 113, 133);
    }

    /* Dot Separator */
    .dot-separator {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
    }

    /* Zoom Pill */
    .zoom-pill {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 1rem;
    }

    .zoom-icon {
        font-size: 1rem;
    }

    .zoom-value {
        font-size: 1.125rem;
        font-weight: 700;
        font-family: ui-monospace, SFMono-Regular, monospace;
        color: rgb(96, 165, 250);
        letter-spacing: -0.02em;
    }

    /* Price Pill */
    .price-pill {
        display: flex;
        align-items: baseline;
        gap: 0.125rem;
        padding: 0.375rem 0.75rem;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .price-pill.confirming {
        background: rgba(251, 191, 36, 0.12);
        border-color: rgba(251, 191, 36, 0.25);
    }

    .currency {
        font-size: 0.75rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.5);
    }

    .price-value {
        font-size: 0.9375rem;
        font-weight: 600;
        font-family: ui-monospace, SFMono-Regular, monospace;
        color: white;
        letter-spacing: -0.01em;
    }

    .price-pill.confirming .price-value {
        color: rgb(251, 191, 36);
    }
</style>
