<script lang="ts">
    import { spring } from "svelte/motion";
    import { headPosition, isTracking } from "$lib/stores/tracking";

    export let price: number = 0;
    export let symbol: string = "SILVERCASE";
    export let trend: "up" | "down" = "up";
    export let changePercent: number = 0;

    // Physics State - Smooth 3D tilt
    const tilt = spring({ x: 0, y: 0 }, { stiffness: 0.12, damping: 0.35 });

    $: {
        if ($isTracking) {
            const targetRotateY = $headPosition.x * 25;
            const targetRotateX = -$headPosition.y * 20;
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
        const rotateY = (xPct - 0.5) * 2 * 15;
        const rotateX = -((yPct - 0.5) * 2) * 15;
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
    style="perspective: 1000px;"
    role="group"
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
>
    <div
        class="relative px-5 py-4 rounded-2xl backdrop-blur-2xl transition-transform duration-75
            bg-gradient-to-br from-white/15 via-white/10 to-violet-500/5
            border border-white/20 shadow-[0_8px_32px_rgba(139,92,246,0.15)]"
        style="transform: rotateX({$tilt.x}deg) rotateY({$tilt.y}deg); transform-style: preserve-3d;"
    >
        <!-- Inner glow -->
        <div
            class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none"
        ></div>

        <!-- Content -->
        <div class="relative flex items-center justify-between gap-4">
            <!-- Left: Symbol & Price -->
            <div>
                <span
                    class="text-[10px] font-bold text-white/40 uppercase tracking-widest"
                >
                    {symbol}
                </span>
                <div
                    class="text-2xl font-mono font-black text-white tracking-tight mt-0.5"
                >
                    ₹{price.toFixed(2)}
                </div>
            </div>

            <!-- Right: Trend Indicator -->
            <div class="flex flex-col items-end gap-1">
                <div
                    class="flex items-center gap-1 px-2 py-1 rounded-lg
                        {trend === 'up'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'}"
                >
                    {#if trend === "up"}
                        <svg
                            class="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="3"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
                            />
                        </svg>
                    {:else}
                        <svg
                            class="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="3"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
                            />
                        </svg>
                    {/if}
                    <span class="text-xs font-bold">
                        {trend === "up" ? "+" : ""}{changePercent.toFixed(2)}%
                    </span>
                </div>
                <span class="text-[9px] text-white/40 font-medium">LTP</span>
            </div>
        </div>
    </div>
</div>
