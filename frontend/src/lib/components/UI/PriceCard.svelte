<script lang="ts">
    import { spring } from "svelte/motion";
    import { fade, slide } from "svelte/transition";
    import {
        headPosition,
        isTracking,
        sensitivity,
        zoomLevel,
        twoHandPinch,
    } from "$lib/stores/tracking";
    import {
        gestureSensitivity,
        tradingHandPreference,
        gestureState,
    } from "$lib/stores/gesture";

    export let price: number = 0;
    export let symbol: string = "SILVERCASE";
    export let trend: "up" | "down" = "up";

    let showSettings = false;

    // Reactive trend check
    $: isPositive = trend === "up";
    // Mock change percent for display
    $: changePercent = isPositive ? 1.25 : -0.85;

    // Physics State
    const tilt = spring({ x: 0, y: 0 }, { stiffness: 0.15, damping: 0.4 });
    const shine = spring({ x: 50, y: 50 }, { stiffness: 0.15, damping: 0.4 });

    $: {
        if ($isTracking) {
            const targetRotateY = $headPosition.x * 25;
            const targetRotateX = -$headPosition.y * 25;
            tilt.set({ x: targetRotateX, y: targetRotateY });

            const targetShineX = 50 + $headPosition.x * 60;
            const targetShineY = 50 + $headPosition.y * 60;
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
        const rotateY = (xPct - 0.5) * 2 * 20;
        const rotateX = -((yPct - 0.5) * 2) * 20;
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

<!-- Outer Container -->
<div
    class="card-perspective"
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
    role="group"
>
    <!-- Main Card -->
    <div
        class="glass-panel active-card"
        style="
            transform: perspective(1000px) rotateX({$tilt.x}deg) rotateY({$tilt.y}deg);
            --shine-x: {$shine.x}%;
            --shine-y: {$shine.y}%;
            --shine-opacity: {$isTracking ? 0.9 : 0.6};
            z-index: {showSettings ? 50 : 1};
        "
    >
        <div class="gradient-border"></div>
        <div class="card-shine-overlay"></div>

        <!-- Content -->
        <div class="relative z-10 flex flex-col gap-2 h-full justify-center">
            <!-- Header Row -->
            <div class="w-full flex justify-end items-start mb-1">
                <h3
                    class="text-sm font-bold text-slate-500 tracking-wider lowercase drop-shadow-sm text-right"
                >
                    {symbol}
                </h3>
            </div>

            <!-- Price & Trend -->
            <div class="flex items-center gap-2">
                <p
                    class="text-2xl font-mono font-black text-slate-800 tracking-tight leading-none"
                >
                    ₹{price.toFixed(2)}
                </p>
                <div
                    class={`flex items-center ${isPositive ? "text-emerald-500" : "text-orange-500"}`}
                >
                    {#if isPositive}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            class="w-5 h-5"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    {:else}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            class="w-5 h-5"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    {/if}
                    <span class="text-sm font-bold font-mono tracking-wide">
                        {Math.abs(changePercent).toFixed(2)}%
                    </span>
                </div>
            </div>

            <!-- Mini Chart Placeholder -->
            <div
                class="h-8 w-full flex items-end justify-between gap-1 mt-1 opacity-50"
            >
                {#each Array(12) as _, i}
                    <div
                        class={`w-1 rounded-full ${isPositive ? "bg-emerald-400" : "bg-orange-400"}`}
                        style="height: {20 + Math.random() * 60}%"
                    ></div>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    .card-perspective {
        width: 250px;
        height: 140px;
        perspective: 1000px;
        position: relative;
    }

    .active-card {
        width: 100%;
        height: 100%;
        border-radius: 1rem;
        padding: 1.25rem;
        transform-style: preserve-3d;
        position: relative;
    }

    /* Light Glass Body */
    .glass-panel {
        background: rgba(255, 255, 255, 0.65); /* Light Glass */
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.6);
        box-shadow:
            0 20px 40px -10px rgba(0, 0, 0, 0.1),
            inset 0 0 0 1px rgba(255, 255, 255, 0.4);
        transition: transform 0.1s;
    }

    /* Dynamic Rim Light Border - Cyan */
    .gradient-border {
        position: absolute;
        inset: -1px;
        border-radius: 1rem;
        padding: 1px;
        -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
        mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        background: radial-gradient(
            circle 100px at var(--shine-x) var(--shine-y),
            rgba(0, 229, 255, 0.8) 0%,
            rgba(0, 229, 255, 0.1) 50%,
            transparent 80%
        );
        z-index: 10;
        pointer-events: none;
        opacity: 0.6;
    }

    /* Surface Shine */
    .card-shine-overlay {
        position: absolute;
        inset: 0;
        border-radius: 1rem;
        background: radial-gradient(
            circle at var(--shine-x) var(--shine-y),
            rgba(255, 255, 255, 0.8),
            transparent 60%
        );
        opacity: var(--shine-opacity, 0.5);
        pointer-events: none;
        mix-blend-mode: overlay;
        z-index: 20;
    }
</style>
