
```svelte
<script lang="ts">
    import { spring } from "svelte/motion";
    import { headPosition, isTracking } from "$lib/stores/tracking";

    export let price: number = 0;
    export let symbol: string = "SILVERCASE";
    export let trend: "up" | "down" = "up";

    // Physics State - INCREASED REACTIVITY (Stiffness 0.05 -> 0.15)
    // We map head position (-1 to 1) to tilt and shine coordinates
    const tilt = spring({ x: 0, y: 0 }, { stiffness: 0.15, damping: 0.4 });
    const shine = spring({ x: 50, y: 50 }, { stiffness: 0.15, damping: 0.4 });

    $: {
        if ($isTracking) {
            // Head moves Right (positive X) -> look from right -> card tilts left (negative Y rot)
            // Head moves Up (positive Y) -> look from top -> card tilts down (positive X rot)

            // Map head X (-1 to 1) to Tilt Y (-15deg to 15deg)
            // Map head Y (-1 to 1) to Tilt X (15deg to -15deg)
            // INCREASED MULTIPLIER (12 -> 25 for dramatic tilt)
            const targetRotateY = $headPosition.x * 25;
            const targetRotateX = -$headPosition.y * 25;

            tilt.set({ x: targetRotateX, y: targetRotateY });

            // Shine follows the "reflection" logic
            // Head Right -> Shine moves Right
            // Head Up -> Shine moves Up
            const targetShineX = 50 + $headPosition.x * 60; // Wider shine range
            const targetShineY = 50 + $headPosition.y * 60;

            shine.set({ x: targetShineX, y: targetShineY });
        } else {
            // Reset to center if not tracking
            tilt.set({ x: 0, y: 0 });
            shine.set({ x: 50, y: 50 });
        }
    }

    // Mouse Interaction ( Fallback / Additive )
    function handleMouseMove(e: MouseEvent) {
        if ($isTracking) return; // Ignore mouse if facial tracking is active

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate percentages
        const xPct = x / rect.width;
        const yPct = y / rect.height; // 0 to 1

        // Tilt logic:
        // Mouse Left -> Tilt Left (neg Y rot) ?? No, usually looks towards mouse
        // Let's copy standard 3D tilt: mouse at top-left -> tilts top-left towards viewer
        // Increased Mouse Sensitivity too
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

<div
    class="card-perspective"
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
    role="group"
>
    <div
        class="active-card glass-panel"
        style="
            transform: perspective(800px) rotateX({$tilt.x}deg) rotateY({$tilt.y}deg);
            --shine-x: {$shine.x}%;
            --shine-y: {$shine.y}%;
            --shine-opacity: {$isTracking ? 0.9 : 0.6};
        "
    >
        <!-- 1. Gradient Border -->
        <div class="gradient-border"></div>

        <!-- 2. Interactive Overlays -->
        <div class="card-shine-overlay"></div>

        <!-- 3. Content -->
        <div
            class="card-content relative z-30 flex flex-col items-end justify-center h-full"
        >
            <h3
                class="text-sm font-black text-slate-700 tracking-wider uppercase mb-1 drop-shadow-sm"
            >
                {symbol}
            </h3>

            <div class="flex items-center gap-2">
                <p
                    class="text-2xl font-mono font-black text-gray-900 tracking-tight leading-none"
                >
                    ₹{price.toFixed(2)}
                </p>

                {#if trend === "up"}
                    <!-- Up Arrow (Green Squircle) -->
                    <div
                        class="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100/80 text-emerald-600 shadow-sm backdrop-blur-sm border border-white/20"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            class="w-3.5 h-3.5"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M11.47 7.72a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 0 1-1.06-1.06l7.5-7.5Z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    </div>
                {:else}
                    <!-- Down Arrow (Red Squircle) -->
                    <div
                        class="flex items-center justify-center w-6 h-6 rounded-lg bg-red-100/80 text-red-600 shadow-sm backdrop-blur-sm border border-white/20"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            class="w-3.5 h-3.5"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .card-perspective {
        width: 200px; /* Slightly wider to fit text */
        height: 90px;
        perspective: 800px; /* Stronger perspective */
        position: relative;
    }

    .active-card {
        width: 100%;
        height: 100%;
        border-radius: 0.5rem; /* subtle 8px corner */
        padding: 1.25rem;
        transform-style: preserve-3d;
        position: relative;
        /* background: rgba(20, 25, 40, 0.4); Base dark tint */
    }

    /* Milky Glass Effect (High Opacity Light) */
    .glass-panel {
        background: rgba(
            230,
            235,
            240,
            0.85
        ); /* Reduced Transparency (High Opacity) */
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.4);
        box-shadow:
            0 20px 40px -10px rgba(0, 0, 0, 0.6),
            /* Deeper shadow for pop */ 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
        transition: transform 0.1s; /* Spring handles smoothness, this is just fail-safe */
    }

    /* Animated Gradient Border - Sharper */
    .gradient-border {
        position: absolute;
        inset: -1px;
        border-radius: 0.55rem; /* Matching outer radius */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(200, 200, 200, 0.4) 50%,
            rgba(255, 255, 255, 0.8) 100%
        );
        z-index: -1;
        opacity: 0.6;
        pointer-events: none;
    }

    /* Dynamic Shine - Brighter */
    .card-shine-overlay {
        position: absolute;
        inset: 0;
        border-radius: 0.5rem;
        background: radial-gradient(
            circle at var(--shine-x) var(--shine-y),
            rgba(255, 255, 255, 0.8),
            transparent 50%
        );
        opacity: var(--shine-opacity, 0.6);
        pointer-events: none;
        mix-blend-mode: soft-light;
        z-index: 20;
    }

    /* Inner Glow for depth */
    .active-card::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 0.5rem;
        box-shadow: inset 0 0 25px rgba(255, 255, 255, 0.5);
        pointer-events: none;
        z-index: 10;
    }
</style>
```