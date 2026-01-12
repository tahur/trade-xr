<script lang="ts">
    import { spring } from "svelte/motion";
    import { headPosition, isTracking } from "$lib/stores/tracking";

    // Physics State (Same as PriceCard for consistency)
    const tilt = spring({ x: 0, y: 0 }, { stiffness: 0.1, damping: 0.4 });
    const shine = spring({ x: 50, y: 50 }, { stiffness: 0.1, damping: 0.4 });

    $: {
        if ($isTracking) {
            // Subtle tilt for the brand logo
            const targetRotateY = $headPosition.x * 15;
            const targetRotateX = -$headPosition.y * 15;
            tilt.set({ x: targetRotateX, y: targetRotateY });

            const targetShineX = 50 + $headPosition.x * 40;
            const targetShineY = 50 + $headPosition.y * 40;
            shine.set({ x: targetShineX, y: targetShineY });
        } else {
            tilt.set({ x: 0, y: 0 });
            shine.set({ x: 50, y: 50 });
        }
    }

    function handleMouseMove(e: MouseEvent) {
        if ($isTracking) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xPct = x / rect.width;
        const yPct = y / rect.height;
        const rotateY = (xPct - 0.5) * 2 * 10;
        const rotateX = -((yPct - 0.5) * 2) * 10;
        tilt.set({ x: rotateX, y: rotateY });
        shine.set({ x: xPct * 100, y: yPct * 100 });
    }

    function handleMouseLeave() {
        if (!$isTracking) {
            tilt.set({ x: 0, y: 0 });
            shine.set({ x: 50, y: 50 });
        }
    }
</script>

<div
    class="brand-perspective"
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
    role="group"
>
    <div
        class="brand-card glass-panel"
        style="
            transform: perspective(600px) rotateX({$tilt.x}deg) rotateY({$tilt.y}deg);
            --shine-x: {$shine.x}%;
            --shine-y: {$shine.y}%;
        "
    >
        <div class="shine-overlay"></div>

        <!-- Text Logo -->
        <!-- Text Logo -->
        <h1
            class="text-2xl font-bold tracking-wide text-white select-none flex items-center gap-1"
            style="font-family: 'Space Grotesk', sans-serif;"
        >
            Trade
            <span class="text-[#00E5FF] font-bold"> XR </span>
        </h1>
        <p
            class="text-[8px] text-slate-400 font-mono tracking-[0.3em] uppercase opacity-70 absolute bottom-2 right-3"
        >
            v2.0
        </p>
    </div>
</div>

<style>
    .brand-perspective {
        width: 140px;
        height: 60px;
        perspective: 600px;
        position: relative;
    }

    .brand-card {
        width: 100%;
        height: 100%;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transform-style: preserve-3d;
        background: rgba(
            11,
            28,
            45,
            0.7
        ); /* Deep XR Blue #0B1C2D with opacity */
        border: 1px solid rgba(0, 229, 255, 0.2); /* Neon Cyan border hint */
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.8);
    }

    .glass-panel {
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
    }

    .shine-overlay {
        position: absolute;
        inset: 0;
        border-radius: 0.75rem;
        background: radial-gradient(
            circle at var(--shine-x) var(--shine-y),
            rgba(255, 255, 255, 0.15),
            transparent 60%
        );
        pointer-events: none;
        mix-blend-mode: overlay;
        z-index: 1;
    }
</style>
