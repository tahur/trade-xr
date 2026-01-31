<script lang="ts">
    import { spring } from "svelte/motion";
    import { headPosition, isTracking } from "$lib/stores/tracking";

    const tilt = spring({ x: 0, y: 0 }, { stiffness: 0.12, damping: 0.35 });

    $: {
        if ($isTracking) {
            const targetRotateY = $headPosition.x * 15;
            const targetRotateX = -$headPosition.y * 12;
            tilt.set({ x: targetRotateX, y: targetRotateY });
        } else {
            tilt.set({ x: 0, y: 0 });
        }
    }

    function handleMouseMove(e: MouseEvent) {
        if ($isTracking) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const xPct = (e.clientX - rect.left) / rect.width;
        const yPct = (e.clientY - rect.top) / rect.height;
        const rotateY = (xPct - 0.5) * 2 * 10;
        const rotateX = -((yPct - 0.5) * 2) * 10;
        tilt.set({ x: rotateX, y: rotateY });
    }

    function handleMouseLeave() {
        if (!$isTracking) {
            tilt.set({ x: 0, y: 0 });
        }
    }
</script>

<div
    class="brand-wrapper"
    style="perspective: 800px;"
    role="group"
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
>
    <div
        class="brand-card"
        style="transform: rotateX({$tilt.x}deg) rotateY({$tilt.y}deg);"
    >
        <span class="brand-trade">trade</span>
        <span class="brand-xr">XR</span>
    </div>
</div>

<style>
    .brand-wrapper {
        user-select: none;
    }

    .brand-card {
        display: flex;
        align-items: baseline;
        gap: 0.125rem;
        padding: 0.5rem 0.875rem;

        /* Glassmorphism background */
        background: linear-gradient(
            135deg,
            rgba(20, 20, 28, 0.75) 0%,
            rgba(30, 30, 42, 0.65) 100%
        );
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);

        /* Border and glow */
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);

        transform-style: preserve-3d;
        transition: transform 0.075s ease-out;
    }

    .brand-trade {
        font-family:
            "Manrope",
            -apple-system,
            BlinkMacSystemFont,
            sans-serif;
        font-size: 1.125rem;
        font-weight: 300;
        letter-spacing: -0.02em;
        color: rgba(255, 255, 255, 0.85);
    }

    .brand-xr {
        font-family:
            "Manrope",
            -apple-system,
            BlinkMacSystemFont,
            sans-serif;
        font-size: 1.125rem;
        font-weight: 800;
        letter-spacing: -0.03em;

        /* Orange gradient text */
        background: linear-gradient(
            135deg,
            #f97316 0%,
            #fb923c 50%,
            #fbbf24 100%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;

        /* Subtle glow */
        filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.4));
    }

    .brand-card:hover .brand-xr {
        filter: drop-shadow(0 0 12px rgba(249, 115, 22, 0.6));
    }
</style>
