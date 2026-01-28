<script lang="ts">
    import { onMount } from "svelte";
    import { Canvas } from "@threlte/core";
    import { spring } from "svelte/motion";
    import { fade, scale } from "svelte/transition";
    import {
        holdingsStore,
        totalPortfolioValue,
        totalPnL,
        type Holding,
    } from "$lib/stores/holdings";
    import { headPosition, isTracking } from "$lib/stores/tracking";

    // Props
    export let visible = false;

    // Holdings data
    $: holdings = $holdingsStore.holdings;
    $: isLoading = $holdingsStore.isLoading;
    $: totalValue = $totalPortfolioValue;
    $: totalPnLValue = $totalPnL;

    // Fetch holdings when becoming visible
    $: if (visible && holdings.length === 0 && !isLoading) {
        holdingsStore.fetch();
    }

    // Calculate bubble sizes relative to total portfolio
    function getBubbleSize(holding: Holding): number {
        const value = holding.value || holding.quantity * holding.last_price;
        const minSize = 60;
        const maxSize = 180;

        if (totalValue === 0) return minSize;

        const ratio = value / totalValue;
        return Math.max(minSize, Math.min(maxSize, ratio * 800));
    }

    // Get color based on P&L
    function getBubbleColor(holding: Holding): string {
        if (holding.pnl >= 0) {
            return "from-emerald-500/40 to-emerald-600/60";
        }
        return "from-rose-500/40 to-rose-600/60";
    }

    function getBorderColor(holding: Holding): string {
        return holding.pnl >= 0
            ? "border-emerald-500/40"
            : "border-rose-500/40";
    }

    function getGlowColor(holding: Holding): string {
        return holding.pnl >= 0
            ? "shadow-emerald-500/30"
            : "shadow-rose-500/30";
    }

    // Parallax tilt for the whole view
    const tilt = spring({ x: 0, y: 0 }, { stiffness: 0.15, damping: 0.8 });

    $: {
        if ($isTracking) {
            tilt.set({
                x: $headPosition.y * 15, // Subtle tilt
                y: $headPosition.x * 20,
            });
        } else {
            tilt.set({ x: 0, y: 0 });
        }
    }

    // Bubble positions - spread in organic pattern
    function getBubblePosition(
        index: number,
        total: number,
    ): { x: number; y: number } {
        // Golden angle spiral for organic distribution
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const angle = index * goldenAngle;
        const radius = 120 + index * 35;

        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * 0.6, // Flatten vertically
        };
    }

    // Animation offset for floating effect
    let animationFrame: number;
    let floatOffset = 0;

    onMount(() => {
        function animate() {
            floatOffset = Date.now() / 2000;
            animationFrame = requestAnimationFrame(animate);
        }
        animate();
        return () => cancelAnimationFrame(animationFrame);
    });

    function getFloatOffset(index: number): { x: number; y: number } {
        const phase = floatOffset + index * 0.7;
        return {
            x: Math.sin(phase) * 8,
            y: Math.cos(phase * 0.8) * 6,
        };
    }
</script>

{#if visible}
    <div
        class="fixed inset-0 z-40 overflow-hidden"
        style="perspective: 1200px;"
        transition:fade={{ duration: 300 }}
    >
        <!-- Background Gradient Overlay -->
        <div
            class="absolute inset-0 bg-gradient-to-br from-violet-950/90 via-slate-950/95 to-indigo-950/90 backdrop-blur-md"
        ></div>

        <!-- Title Header -->
        <div class="absolute top-8 left-1/2 -translate-x-1/2 z-50">
            <div class="flex flex-col items-center gap-2">
                <h1 class="text-2xl font-bold text-white/90 tracking-wide">
                    Portfolio Holdings
                </h1>
                <div class="flex items-center gap-6 text-sm">
                    <div class="flex items-center gap-2">
                        <span class="text-white/50">Total Value:</span>
                        <span class="text-white font-mono font-bold">
                            ₹{totalValue.toLocaleString("en-IN", {
                                maximumFractionDigits: 0,
                            })}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-white/50">P&L:</span>
                        <span
                            class={`font-mono font-bold ${totalPnLValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                        >
                            {totalPnLValue >= 0
                                ? "+"
                                : ""}₹{totalPnLValue.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bubble Cloud Container -->
        <div
            class="absolute inset-0 flex items-center justify-center"
            style="transform: rotateX({$tilt.x}deg) rotateY({$tilt.y}deg); transform-style: preserve-3d;"
        >
            {#if isLoading}
                <div class="flex flex-col items-center gap-4">
                    <div
                        class="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"
                    ></div>
                    <span class="text-white/60 text-sm"
                        >Loading Portfolio...</span
                    >
                </div>
            {:else if holdings.length === 0}
                <div class="text-white/60 text-lg">No holdings found</div>
            {:else}
                <!-- Bubbles -->
                {#each holdings as holding, i (holding.tradingsymbol)}
                    {@const pos = getBubblePosition(i, holdings.length)}
                    {@const floatPos = getFloatOffset(i)}
                    {@const size = getBubbleSize(holding)}
                    <div
                        class="absolute bubble-item"
                        style="
                            transform: translate({pos.x +
                            floatPos.x}px, {pos.y +
                            floatPos.y}px) translateZ({20 + i * 5}px);
                            width: {size}px;
                            height: {size}px;
                        "
                        transition:scale={{ duration: 400, delay: i * 50 }}
                    >
                        <!-- Bubble -->
                        <div
                            class="w-full h-full rounded-full bg-gradient-to-br {getBubbleColor(
                                holding,
                            )} 
                                   backdrop-blur-xl border {getBorderColor(
                                holding,
                            )}
                                   shadow-xl {getGlowColor(holding)}
                                   flex flex-col items-center justify-center
                                   hover:scale-110 transition-transform duration-300 cursor-pointer"
                            style="box-shadow: 0 0 40px currentColor, inset 0 0 30px rgba(255,255,255,0.1);"
                        >
                            <!-- Symbol -->
                            <span
                                class="text-white font-bold text-xs tracking-wider mb-0.5 drop-shadow-lg"
                            >
                                {holding.tradingsymbol}
                            </span>

                            <!-- Value -->
                            <span class="text-white/90 font-mono text-[10px]">
                                ₹{(holding.value || 0).toLocaleString("en-IN", {
                                    maximumFractionDigits: 0,
                                })}
                            </span>

                            <!-- P&L Percentage -->
                            <span
                                class={`text-[9px] font-bold mt-0.5 ${holding.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                            >
                                {holding.pnl >= 0
                                    ? "+"
                                    : ""}{holding.day_change_percentage.toFixed(
                                    1,
                                )}%
                            </span>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>

        <!-- Hint at bottom -->
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div class="flex items-center gap-2 text-white/40 text-xs">
                <span>✌️</span>
                <span>Victory again or ✊ Fist to close</span>
            </div>
        </div>
    </div>
{/if}

<style>
    .bubble-item {
        position: absolute;
        transform-style: preserve-3d;
        will-change: transform;
    }

    /* Glassmorphism bubble styling */
    .bubble-item > div {
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(255, 255, 255, 0.05) 50%,
            rgba(255, 255, 255, 0.02) 100%
        );
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    }

    /* Subtle inner glow */
    .bubble-item > div::before {
        content: "";
        position: absolute;
        top: 10%;
        left: 15%;
        width: 30%;
        height: 20%;
        background: radial-gradient(
            ellipse,
            rgba(255, 255, 255, 0.4),
            transparent
        );
        border-radius: 50%;
        pointer-events: none;
    }
</style>
