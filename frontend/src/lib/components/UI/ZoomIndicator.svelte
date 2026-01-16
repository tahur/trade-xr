<script lang="ts">
    export let zoomLevel: number = 100;
    export let isPinching: boolean = false;

    // Only show when actively pinching or zoom is different from 100%
    $: showIndicator = isPinching || Math.abs(zoomLevel - 100) > 1;
</script>

{#if showIndicator}
    <!-- Zoom percentage - bottom center, subtle -->
    <div class="zoom-indicator" class:pinching={isPinching}>
        <span class="zoom-value">{Math.round(zoomLevel)}%</span>
    </div>

    <!-- Pinch corner indicators - only while actively pinching -->
    {#if isPinching}
        <div class="pinch-dot top-left"></div>
        <div class="pinch-dot top-right"></div>
        <div class="pinch-dot bottom-left"></div>
        <div class="pinch-dot bottom-right"></div>
    {/if}
{/if}

<style>
    .zoom-indicator {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        padding: 0.35rem 0.75rem;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        z-index: 50;
        transition: all 0.2s ease;
        opacity: 0.6;
    }

    .zoom-indicator.pinching {
        opacity: 1;
        background: rgba(139, 92, 246, 0.15);
        border-color: rgba(139, 92, 246, 0.3);
    }

    .zoom-value {
        font-size: 0.75rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.02em;
    }

    .pinching .zoom-value {
        color: rgba(255, 255, 255, 0.9);
    }

    /* Corner pinch indicators */
    .pinch-dot {
        position: fixed;
        width: 8px;
        height: 8px;
        background: rgba(139, 92, 246, 0.6);
        border-radius: 50%;
        z-index: 50;
        animation: pulse 1s ease-in-out infinite;
    }

    .pinch-dot.top-left {
        top: 3rem;
        left: 3rem;
    }

    .pinch-dot.top-right {
        top: 3rem;
        right: 3rem;
    }

    .pinch-dot.bottom-left {
        bottom: 3rem;
        left: 3rem;
    }

    .pinch-dot.bottom-right {
        bottom: 3rem;
        right: 3rem;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 0.6;
            transform: scale(1);
        }
        50% {
            opacity: 1;
            transform: scale(1.3);
        }
    }
</style>
