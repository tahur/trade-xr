<script lang="ts">
    import { fade, scale, fly } from "svelte/transition";
    import { dynamicIsland } from "$lib/stores/dynamicIsland";
    import { quintOut } from "svelte/easing";
    import { spring } from "svelte/motion";
    import { headPosition, isTracking } from "$lib/stores/tracking";

    $: mode = $dynamicIsland.mode;
    $: content = $dynamicIsland.content;
    $: isVisible = $dynamicIsland.isVisible;

    // Determine width and height based on mode
    $: width =
        mode === "compact" ? "260px" : mode === "live" ? "360px" : "340px";
    $: height =
        mode === "compact" ? "80px" : mode === "live" ? "100px" : "100px";

    // 3D Tilt for face tracking (like PriceCard)
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

    // Color helpers
    function getChangeColor(change: number) {
        return change >= 0 ? "text-green-400" : "text-red-400";
    }

    function getStatusIcon(status: string) {
        if (status === "SUCCESS") return "✓";
        if (status === "FAILED") return "✗";
        return "⌛";
    }

    function getSeverityColor(severity: string) {
        if (severity === "success") return "text-green-400";
        if (severity === "error") return "text-red-400";
        return "text-cyan-400";
    }
</script>

{#if isVisible}
    <div
        class="dynamic-island-wrapper"
        on:mousemove={handleMouseMove}
        on:mouseleave={handleMouseLeave}
        role="group"
    >
        <div
            class="dynamic-island"
            style="width: {width}; height: {height}; transform: rotateX({$tilt.x}deg) rotateY({$tilt.y}deg);"
            in:fly={{ y: -20, duration: 400, easing: quintOut }}
            out:fade={{ duration: 200 }}
        >
            <!-- Compact Mode - Ticker -->
            {#if mode === "compact" && content.type === "ticker"}
                <div
                    class="flex flex-col items-center justify-center px-4 w-full h-full gap-2"
                >
                    <!-- Symbol Name -->
                    <span
                        class="text-[10px] font-bold text-white/40 uppercase tracking-widest"
                    >
                        {content.symbol}
                    </span>

                    <div class="flex items-center gap-3">
                        <!-- Price -->
                        <span
                            class="text-2xl font-mono font-black text-white tracking-tight"
                        >
                            ₹{content.price.toFixed(2)}
                        </span>

                        <!-- Divider -->
                        <div class="h-6 w-px bg-white/10"></div>

                        <!-- Change Badge -->
                        <div
                            class="flex items-center gap-1 px-2 py-1 rounded-lg {content.change >=
                            0
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'}"
                        >
                            <span class="text-xs font-bold">
                                {content.change >= 0 ? "▲" : "▼"}
                                {Math.abs(content.changePercent).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Expanded Mode - Order/API -->
            {:else if mode === "expanded"}
                {#if content.type === "order"}
                    <div
                        class="flex flex-col items-center justify-center px-6 w-full h-full gap-2"
                        in:scale={{ duration: 300, easing: quintOut }}
                    >
                        <div class="flex items-center gap-2">
                            <span
                                class="text-2xl {content.status === 'SUCCESS'
                                    ? 'text-green-400'
                                    : content.status === 'FAILED'
                                      ? 'text-red-400'
                                      : 'text-yellow-400'}"
                            >
                                {getStatusIcon(content.status)}
                            </span>
                            <span
                                class="text-sm font-semibold text-white uppercase tracking-wide"
                            >
                                Order {content.status === "SUCCESS"
                                    ? "Placed"
                                    : content.status === "FAILED"
                                      ? "Failed"
                                      : "Pending"}
                            </span>
                        </div>
                        <div class="text-center">
                            <span
                                class="text-lg font-bold {content.action ===
                                'BUY'
                                    ? 'text-green-400'
                                    : 'text-red-400'}"
                            >
                                {content.action}
                            </span>
                            <span class="text-white/80 mx-2"
                                >{content.quantity}</span
                            >
                            <span class="text-white/60">@</span>
                            <span class="text-white font-mono ml-2"
                                >₹{content.price.toFixed(2)}</span
                            >
                        </div>
                    </div>
                {:else if content.type === "api"}
                    <div
                        class="flex items-center justify-center px-6 w-full h-full gap-3"
                        in:scale={{ duration: 300, easing: quintOut }}
                    >
                        <div
                            class="w-2 h-2 rounded-full {getSeverityColor(
                                content.severity,
                            )}"
                        />
                        <span
                            class="text-sm font-medium {getSeverityColor(
                                content.severity,
                            )}"
                        >
                            {content.message}
                        </span>
                    </div>
                {/if}

                <!-- Live Activity Mode - P&L -->
            {:else if mode === "live" && content.type === "pnl"}
                <div
                    class="flex flex-col items-center justify-center px-5 w-full h-full gap-1"
                    in:scale={{ duration: 300, easing: quintOut }}
                >
                    <!-- Top row: Symbol and indicator -->
                    <div class="flex items-center justify-between w-full">
                        <div class="flex items-center gap-2">
                            <div
                                class="w-1.5 h-1.5 rounded-full {content.position ===
                                'OPEN'
                                    ? 'bg-yellow-400 animate-pulse'
                                    : 'bg-gray-400'}"
                            />
                            <span
                                class="text-xs font-medium text-white/90 uppercase"
                                >{content.symbol}</span
                            >
                        </div>
                        <span class="text-xs text-white/60">
                            {content.position}
                        </span>
                    </div>

                    <!-- Bottom row: P&L -->
                    <div class="flex items-center justify-center w-full">
                        <span class="text-white/70 text-xs mr-2">P&L:</span>
                        <span
                            class="text-lg font-mono font-bold {getChangeColor(
                                content.pnl,
                            )}"
                        >
                            {content.pnl >= 0 ? "+" : ""}₹{content.pnl.toFixed(
                                2,
                            )}
                        </span>
                        <span
                            class="text-sm font-mono ml-2 {getChangeColor(
                                content.pnl,
                            )}"
                        >
                            ({content.pnl >= 0
                                ? "+"
                                : ""}{content.pnlPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .dynamic-island-wrapper {
        position: fixed;
        top: 1.5rem;
        right: 1.5rem;
        z-index: 100;
        perspective: 1000px;
    }

    .dynamic-island {
        /* Premium glassmorphic effect (same as PriceCard) */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(139, 92, 246, 0.05) 100%
        );
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);

        /* Border and shadow (same as PriceCard) */
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15);

        /* Square with subtle rounded corners */
        border-radius: 16px;

        /* 3D transform */
        transform-style: preserve-3d;
        transition:
            width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.3s ease;
        transition-property: width, height, box-shadow;

        /* Prevent text selection */
        user-select: none;

        /* Position relative for inner glow */
        position: relative;
    }

    /* Inner glow overlay */
    .dynamic-island::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 16px;
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 100%
        );
        pointer-events: none;
    }

    .dynamic-island-wrapper:hover .dynamic-island {
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.25);
        border-color: rgba(255, 255, 255, 0.3);
    }
</style>
