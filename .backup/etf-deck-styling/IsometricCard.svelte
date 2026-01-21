<script lang="ts">
    import { spring } from "svelte/motion";
    import type { ETFConfig } from "$lib/config/etfs";

    export let etf: ETFConfig;
    export let isActive: boolean = false; // The currently TRADING etf
    export let isFocused: boolean = false; // The card currently under the "cursor" (center of deck)
    export let index: number;
    export let offset: number; // Displacment from center (0 = center, -1 = left, 1 = right)

    // Spring for smooth 3D transforms
    const transform = spring(
        { rotateY: 0, translateZ: 0, scale: 1, opacity: 0.5 },
        { stiffness: 0.1, damping: 0.8 },
    );

    // Reactive Math based on offset - 3-STATE CAROUSEL (Left, Middle, Right)
    $: {
        const absOffset = Math.abs(offset);

        // VISIBILITY LOGIC:
        // Only show Center (0) and Neighbors (1). Use a small buffer (1.2) for smooth transistions.
        // Everything else is HIDDEN.
        const isVisible = absOffset < 1.2;

        // Scaling: Center is big (1.0), Neighbors shrink slightly (0.9)
        const s = absOffset < 0.5 ? 1.0 : 0.9;

        // Opacity:
        // Center = 1.0
        // Neighbors = 0.5 (Distinctly secondary)
        // Others = 0 (Invisible)
        const o = isVisible ? (absOffset < 0.5 ? 1.0 : 0.5) : 0;

        // Horizontal Separation: 320px
        const tX = offset * 320;

        // Z-Depth: Push neighbors back
        const tZ = -absOffset * 100;

        // Rotation: Face inward slightly
        const rY = offset * -15;

        transform.set({
            rotateY: rY,
            translateZ: tZ,
            scale: isActive ? 1.05 : s,
            opacity: o,
        });
    }

    // Symbol Display Mapping
    const displayNames: Record<string, string> = {
        GOLDCASE: "GOLD",
        SILVERCASE: "SILVER",
        NIFTYCASE: "NIFTY",
        TOP100CASE: "TOP100",
        MID150CASE: "MID150",
    };

    $: displayName = displayNames[etf.symbol] || etf.symbol;
</script>

<div
    class="selector-card"
    class:focused={isFocused}
    class:active={isActive}
    style="transform: 
        translateX({offset * 320}px)
        translateZ({$transform.translateZ}px) 
        scale({$transform.scale})
        rotateY({$transform.rotateY}deg);
        opacity: {$transform.opacity};
        z-index: {100 - Math.abs(Math.round(offset))};"
>
    <!-- Card Surface (Dynamic Glass) -->
    <div class="card-surface">
        <!-- Top Label -->
        <div class="header">
            <span class="label">INSTRUMENT</span>
            {#if isActive}
                <div class="active-badge">
                    <span class="dot"></span>
                </div>
            {/if}
        </div>

        <!-- Main Symbol -->
        <div class="symbol-container">
            <span class="symbol-text">{displayName}</span>
            <div class="subtitle">{etf.name}</div>
        </div>

        <!-- Bottom Prompt -->
        <div class="footer">
            {#if isFocused}
                <div class="prompt">
                    <span class="text-white">☝️</span>
                    <span class="text-white/80">Select</span>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .selector-card {
        position: absolute;
        width: 280px; /* Reverted to Lighthouse Size (Portrait) */
        height: 380px;
        left: 50%;
        top: 50%;
        margin-left: -140px;
        margin-top: -190px;

        /* Smooth transitions */
        transition: transform 0.1s;
        will-change: transform, opacity;
        pointer-events: none;

        /* Deep Shadow */
        filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.6));
    }

    .card-surface {
        width: 100%;
        height: 100%;

        /* Dynamic Glass: More opaque to prevent messy overlap */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(255, 255, 255, 0.05) 100%
        );
        backdrop-filter: blur(24px); /* Heavier blur blocks background */
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 32px;

        padding: 32px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;

        position: relative;
        overflow: hidden;
    }

    /* Top Highlight */
    .card-surface::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.5),
            transparent
        );
        pointer-events: none;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .label {
        font-family: "Inter", sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.15em;
        color: rgba(255, 255, 255, 0.5);
    }

    .active-badge {
        display: flex;
        align-items: center;
        background: rgba(16, 185, 129, 0.2);
        border: 1px solid rgba(16, 185, 129, 0.3);
        padding: 4px;
        border-radius: 50%;
    }

    .dot {
        width: 6px;
        height: 6px;
        background: #34d399;
        border-radius: 50%;
        box-shadow: 0 0 8px #34d399;
    }

    .symbol-container {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .symbol-text {
        font-family: "Inter", sans-serif;
        font-size: 48px; /* Larger text */
        font-weight: 800;
        color: #fff;
        letter-spacing: -0.02em;
        text-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    .subtitle {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 500;
        text-align: center;
        max-width: 80%;
        line-height: 1.4;
    }

    .footer {
        height: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .prompt {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.2); /* Darker pill for contrast */
        padding: 8px 20px;
        border-radius: 100px;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(4px);
    }
</style>
