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
    class="relative"
    style="perspective: 800px;"
    role="group"
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
>
    <div
        class="relative px-4 py-2.5 rounded-2xl backdrop-blur-2xl transition-transform duration-75
            bg-gradient-to-br from-white/10 via-violet-500/5 to-cyan-500/5
            border border-white/15 shadow-[0_8px_32px_rgba(139,92,246,0.1)]"
        style="transform: rotateX({$tilt.x}deg) rotateY({$tilt.y}deg); transform-style: preserve-3d;"
    >
        <!-- Inner glow -->
        <div
            class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"
        ></div>

        <!-- Text Logo -->
        <div class="relative flex items-baseline gap-0.5">
            <span class="text-xl font-black text-white tracking-tight">
                Holo
            </span>
            <span
                class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400"
            >
                Trade
            </span>
        </div>
    </div>
</div>
