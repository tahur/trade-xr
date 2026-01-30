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
        class="relative transition-transform duration-75 select-none"
        style="transform: rotateX({$tilt.x}deg) rotateY({$tilt.y}deg); transform-style: preserve-3d;"
    >
        <div class="relative flex items-center gap-1">
            <span class="text-lg font-bold text-white/80 tracking-tight">
                Trade
            </span>
            <!-- Orange Ribbon Badge -->
            <div class="relative group">
                <div
                    class="absolute inset-0 bg-orange-500 blur-sm opacity-40 group-hover:opacity-60 transition-opacity rounded-sm"
                ></div>
                <div
                    class="relative px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-sm shadow-lg transform -skew-x-12"
                >
                    <span
                        class="block text-xs font-black text-white transform skew-x-12 tracking-wide"
                    >
                        XR
                    </span>
                </div>
            </div>
        </div>
    </div>
</div>
