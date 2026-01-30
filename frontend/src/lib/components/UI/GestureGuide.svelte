<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import { gestureBar } from "$lib/stores/gestureBar";

    $: mode = $gestureBar.mode;
    $: zoomLevel = $gestureBar.zoomLevel;
    $: price = $gestureBar.price;

    // Mode-based styling
    $: barClass = {
        idle: "border-white/8",
        zoom: "border-blue-500/30",
        targeting: "border-violet-500/30",
        locked: "border-cyan-500/30",
        confirming: "border-amber-500/30",
        portfolio: "border-white/8", // Same as idle for continuity
    }[mode];

    $: bgClass = {
        idle: "bg-black/45",
        zoom: "bg-blue-950/60",
        targeting: "bg-violet-950/60",
        locked: "bg-cyan-950/60",
        confirming: "bg-amber-950/60",
        portfolio: "bg-black/45", // Same as idle for continuity
    }[mode];
</script>

<div
    class="gesture-bar {bgClass} {barClass}"
    transition:fade={{ duration: 150 }}
>
    {#key mode}
        <div
            class="content"
            in:scale={{ duration: 150, start: 0.95, easing: cubicOut }}
        >
            {#if mode === "idle"}
                <!-- Default Gesture Hints -->
                <div class="gesture-item">
                    <span class="icon">👐</span>
                    <span class="label">Zoom</span>
                </div>
                <div class="gesture-item">
                    <span class="icon">✌️</span>
                    <span class="label">Portfolio</span>
                </div>
                <div class="gesture-item">
                    <span class="icon">👆</span>
                    <span class="label">Set Price</span>
                </div>
            {:else if mode === "zoom"}
                <!-- Zoom Mode - Show Percentage -->
                <div class="zoom-display">
                    <span class="zoom-icon">🔍</span>
                    <span class="zoom-value">{zoomLevel}%</span>
                </div>
            {:else if mode === "targeting"}
                <!-- Targeting Mode - Pinch to Lock -->
                <div class="gesture-item active">
                    <span class="icon">👌</span>
                    <span class="label text-violet-300">Pinch to Lock</span>
                </div>
                <div class="divider"></div>
                <div class="gesture-item muted">
                    <span class="icon">✊</span>
                    <span class="label">Cancel</span>
                </div>
            {:else if mode === "locked"}
                <!-- Locked Mode - Point Up to Confirm -->
                <div class="gesture-item active">
                    <span class="icon">☝️</span>
                    <span class="label text-cyan-300">Point Up</span>
                </div>
                <div class="price-badge">
                    <span class="price">₹{price?.toFixed(2) ?? "0.00"}</span>
                </div>
                <div class="gesture-item muted">
                    <span class="icon">✊</span>
                    <span class="label">Cancel</span>
                </div>
            {:else if mode === "confirming"}
                <!-- Confirming Mode - Buy/Sell -->
                <div class="gesture-item buy">
                    <span class="icon">👍</span>
                    <span class="label text-emerald-400">Buy</span>
                </div>
                <div class="price-badge confirm">
                    <span class="price">₹{price?.toFixed(2) ?? "0.00"}</span>
                </div>
                <div class="gesture-item sell">
                    <span class="icon">👎</span>
                    <span class="label text-rose-400">Sell</span>
                </div>
            {:else if mode === "portfolio"}
                <!-- Portfolio Mode - Same format as idle for continuity -->
                <div class="gesture-item">
                    <span class="icon">👐</span>
                    <span class="label">Zoom</span>
                </div>
                <div class="gesture-item">
                    <span class="icon">🙂</span>
                    <span class="label">Head Move</span>
                </div>
                <div class="gesture-item">
                    <span class="icon">✊</span>
                    <span class="label">Back</span>
                </div>
            {/if}
        </div>
    {/key}
</div>

<style>
    .gesture-bar {
        position: fixed;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 40;

        padding: 0.5rem 0.75rem;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 100px;
        border: 1px solid;

        transition:
            background 0.2s ease,
            border-color 0.2s ease;
    }

    .content {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .gesture-item {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        border-radius: 100px;
        transition: background 0.15s ease;
    }

    .gesture-item:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .gesture-item.active {
        background: rgba(255, 255, 255, 0.08);
    }

    .gesture-item.muted .label {
        color: rgba(255, 255, 255, 0.4);
    }

    .gesture-item.buy:hover {
        background: rgba(16, 185, 129, 0.15);
    }

    .gesture-item.sell:hover {
        background: rgba(244, 63, 94, 0.15);
    }

    .icon {
        font-size: 1rem;
    }

    .label {
        font-size: 0.6875rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.7);
        letter-spacing: 0.02em;
    }

    .divider {
        width: 1px;
        height: 1rem;
        background: rgba(255, 255, 255, 0.15);
        margin: 0 0.25rem;
    }

    /* Zoom Display */
    .zoom-display {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 1rem;
    }

    .zoom-icon {
        font-size: 1.125rem;
    }

    .zoom-value {
        font-size: 1.25rem;
        font-weight: 700;
        font-family: ui-monospace, monospace;
        color: rgba(96, 165, 250, 1);
        letter-spacing: -0.02em;
    }

    /* Price Badge */
    .price-badge {
        display: flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: 100px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .price-badge.confirm {
        background: rgba(251, 191, 36, 0.15);
        border-color: rgba(251, 191, 36, 0.3);
    }

    .price {
        font-size: 0.875rem;
        font-weight: 600;
        font-family: ui-monospace, monospace;
        color: white;
    }
</style>
