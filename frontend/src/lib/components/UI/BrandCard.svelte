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
        class="relative px-5 py-2.5 rounded-xl backdrop-blur-xl transition-transform duration-75
            bg-white/5 border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
        style="transform: rotateX({$tilt.x}deg) rotateY({$tilt.y}deg); transform-style: preserve-3d;"
    >
        <!-- Glass Tint/Sheen -->
        <div
            class="absolute inset-0 rounded-xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none"
        ></div>

        <!-- TradeXR Logo with Orange Ribbon -->
        <div class="relative flex items-center gap-0">
            <span class="text-xl font-bold text-white/90 tracking-tight mr-1.5">
                Trade
            </span>
            <!-- Orange Ribbon Badge -->
            <div class="relative group">
                <div
                    class="absolute inset-0 bg-orange-500 blur-sm opacity-40 group-hover:opacity-60 transition-opacity rounded-sm"
                ></div>
                <div
                    class="relative px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-sm shadow-lg transform -skew-x-12"
                >
                    <span
                        class="block text-sm font-black text-white transform skew-x-12 tracking-wide"
                    >
                        XR
                    </span>
                </div>
            </div>
        </div>
    </div>
</div>
