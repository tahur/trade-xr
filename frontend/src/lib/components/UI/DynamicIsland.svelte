<script lang="ts">
    import { fade, scale, fly } from "svelte/transition";
    import { dynamicIsland } from "$lib/stores/dynamicIsland";
    import { cubicOut } from "svelte/easing";
    import { spring } from "svelte/motion";
    import { headPosition, isTracking } from "$lib/stores/tracking";
    import { kite } from "$lib/services/kite";
    import { onMount, onDestroy } from "svelte";
    import { selectedETFStore } from "$lib/stores/selectedETF";
    import { positionsStore } from "$lib/stores/positions";

    // Available margin state
    let availableMargin: number | null = null;
    let marginInterval: ReturnType<typeof setInterval> | null = null;

    // Fetch margin only (positions come from store)
    async function fetchMargin() {
        try {
            const data = await kite.getMargins();
            availableMargin = data.available_cash || data.available_margin || 0;
        } catch {
            // Silently fail - margin not available if not logged in
            availableMargin = null;
        }
    }

    onMount(() => {
        fetchMargin();
        // Refresh margin every 5s
        marginInterval = setInterval(fetchMargin, 5000);
    });

    onDestroy(() => {
        if (marginInterval) clearInterval(marginInterval);
    });

    // React to positions store changes and update P&L display
    $: {
        const selectedSymbol = $selectedETFStore.symbol;
        const positions = $positionsStore.positions;

        // Find position matching selected ETF
        const matchingPosition = positions.find(
            (p) => p.symbol === selectedSymbol,
        );

        if (matchingPosition && matchingPosition.quantity !== 0) {
            const pnlPercent =
                matchingPosition.averagePrice > 0
                    ? (matchingPosition.pnl /
                          (matchingPosition.averagePrice *
                              Math.abs(matchingPosition.quantity))) *
                      100
                    : 0;

            // Update Dynamic Island with P&L
            dynamicIsland.setLiveActivity({
                symbol: matchingPosition.symbol,
                pnl: matchingPosition.pnl,
                pnlPercent: pnlPercent,
                avgPrice: matchingPosition.averagePrice,
                currentPrice: matchingPosition.lastPrice,
                position: "OPEN",
            });
        }
    }

    // Snappy easing for quick, responsive feel
    const snappyEase = cubicOut;

    $: mode = $dynamicIsland.mode;
    $: content = $dynamicIsland.content;
    $: isVisible = $dynamicIsland.isVisible;

    // Determine width and height based on mode
    $: width =
        mode === "compact" ? "320px" : mode === "live" ? "360px" : "340px";
    $: height =
        mode === "compact" ? "90px" : mode === "live" ? "100px" : "100px";

    // Subtle 3D Tilt - high damping for efficiency
    const tilt = spring({ x: 0, y: 0 }, { stiffness: 0.1, damping: 0.8 });

    $: {
        if ($isTracking) {
            // Increased intensity for more noticeable tilt
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

    // Memoized color helpers (defined once, no recreation per render)
    const COLORS = {
        positive: "text-green-400",
        negative: "text-red-400",
        cyan: "text-cyan-400",
    } as const;

    const STATUS_ICONS = { SUCCESS: "✓", FAILED: "✗", PENDING: "⌛" } as const;

    const getChangeColor = (change: number) =>
        change >= 0 ? COLORS.positive : COLORS.negative;

    const getStatusIcon = (status: string) =>
        STATUS_ICONS[status as keyof typeof STATUS_ICONS] ||
        STATUS_ICONS.PENDING;

    const getSeverityColor = (severity: string) =>
        severity === "success"
            ? COLORS.positive
            : severity === "error"
              ? COLORS.negative
              : COLORS.cyan;
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
            in:fly={{ y: -12, duration: 150, easing: snappyEase }}
            out:fade={{ duration: 100 }}
        >
            {#key mode + content.type}
                <!-- Compact Mode - Ticker -->
                {#if mode === "compact" && content.type === "ticker"}
                    <div
                        class="flex flex-col justify-center px-5 w-full h-full gap-1"
                    >
                        <!-- Top Row: Symbol & Margin -->
                        <div class="flex items-center justify-between w-full">
                            <span
                                class="text-[10px] font-bold text-white/40 uppercase tracking-widest"
                            >
                                {content.symbol}
                            </span>
                            {#if availableMargin !== null}
                                <span
                                    class="text-[10px] font-medium text-white/40"
                                >
                                    ₹{availableMargin.toLocaleString("en-IN", {
                                        maximumFractionDigits: 0,
                                    })}
                                </span>
                            {/if}
                        </div>

                        <!-- Bottom Row: Price & Change -->
                        <div class="flex items-center justify-between w-full">
                            <!-- Price -->
                            <span
                                class="text-2xl font-mono font-black text-white tracking-tight"
                            >
                                ₹{content.price.toFixed(2)}
                            </span>

                            <!-- Change Badge -->
                            <div
                                class="flex items-center gap-1 px-2.5 py-1 rounded-lg {content.change >=
                                0
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'}"
                            >
                                <span class="text-sm font-bold">
                                    {content.change >= 0 ? "▲" : "▼"}
                                    {Math.abs(content.changePercent).toFixed(
                                        2,
                                    )}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Expanded Mode - Order/API -->
                {:else if mode === "expanded"}
                    {#if content.type === "order"}
                        <div
                            class="flex flex-col items-center justify-center px-6 w-full h-full gap-2"
                            in:scale={{
                                start: 0.95,
                                duration: 150,
                                easing: snappyEase,
                            }}
                        >
                            <div class="flex items-center gap-2">
                                <span
                                    class="text-2xl {content.status ===
                                    'SUCCESS'
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
                        >
                            <!-- Status icon (minimalist SVG) -->
                            {#if content.severity === "success"}
                                <!-- Switch/swap icon -->
                                <svg
                                    class="w-5 h-5 text-green-400"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <polyline points="17 1 21 5 17 9"
                                    ></polyline>
                                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                    <polyline points="7 23 3 19 7 15"
                                    ></polyline>
                                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                                </svg>
                            {:else if content.severity === "error"}
                                <svg
                                    class="w-5 h-5 text-red-400"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            {:else}
                                <svg
                                    class="w-5 h-5 text-cyan-400"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"
                                    ></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"
                                    ></line>
                                </svg>
                            {/if}
                            <!-- Message text -->
                            <span
                                class="text-base font-semibold"
                                class:text-green-400={content.severity ===
                                    "success"}
                                class:text-red-400={content.severity ===
                                    "error"}
                                class:text-cyan-400={content.severity ===
                                    "info"}
                            >
                                {content.message}
                            </span>
                        </div>
                    {/if}

                    <!-- Live Activity Mode - P&L (Original Style) -->
                {:else if mode === "live" && content.type === "pnl"}
                    <div
                        class="flex flex-col px-5 py-2 w-full h-full gap-2"
                        in:scale={{
                            start: 0.95,
                            duration: 150,
                            easing: snappyEase,
                        }}
                    >
                        <!-- Top row: Symbol + Position Status -->
                        <div class="flex items-center justify-between w-full">
                            <span
                                class="text-sm font-semibold text-white tracking-wide"
                            >
                                {content.symbol}
                            </span>
                            <div
                                class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30"
                            >
                                <span
                                    class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider"
                                >
                                    ↗ Position Open
                                </span>
                            </div>
                        </div>

                        <!-- Middle row: Prices (Avg → LTP) -->
                        <div
                            class="flex items-center justify-between w-full text-xs"
                        >
                            <div class="flex items-center gap-1">
                                <span class="text-white/40">Avg:</span>
                                <span class="text-white/80 font-mono"
                                    >₹{content.avgPrice.toFixed(2)}</span
                                >
                            </div>
                            <span class="text-white/30">→</span>
                            <div class="flex items-center gap-1">
                                <span class="text-white/40">LTP:</span>
                                <span class="text-white font-mono font-medium"
                                    >₹{content.currentPrice.toFixed(2)}</span
                                >
                            </div>
                        </div>

                        <!-- Bottom row: P&L -->
                        <div
                            class="flex items-center justify-center w-full pt-1 border-t border-white/10"
                        >
                            <span class="text-white/50 text-xs mr-2">P&L</span>
                            <span
                                class="text-lg font-mono font-bold {content.pnl >=
                                0
                                    ? 'text-green-400'
                                    : 'text-red-400'}"
                            >
                                {content.pnl >= 0
                                    ? "+"
                                    : ""}₹{content.pnl.toFixed(2)}
                            </span>
                            <span
                                class="text-sm font-mono ml-2 {content.pnl >= 0
                                    ? 'text-green-400'
                                    : 'text-red-400'}"
                            >
                                ({content.pnl >= 0
                                    ? "+"
                                    : ""}{content.pnlPercent.toFixed(2)}%)
                            </span>
                        </div>
                    </div>

                    <!-- Pending Order Mode -->
                {:else if content.type === "pending"}
                    <div
                        class="flex flex-col px-5 py-2 w-full h-full gap-2"
                        in:scale={{
                            start: 0.95,
                            duration: 150,
                            easing: snappyEase,
                        }}
                    >
                        <!-- Top row: Symbol + Pending Status -->
                        <div class="flex items-center justify-between w-full">
                            <span
                                class="text-sm font-semibold text-white tracking-wide"
                            >
                                {content.symbol}
                            </span>
                            <div
                                class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30"
                            >
                                <svg
                                    class="w-3 h-3 text-amber-400 animate-pulse"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"
                                    ></polyline>
                                </svg>
                                <span
                                    class="text-[10px] font-bold text-amber-400 uppercase tracking-wider"
                                >
                                    Order Pending
                                </span>
                            </div>
                        </div>

                        <!-- Bottom row: Order Details -->
                        <div
                            class="flex items-center justify-center w-full pt-1 border-t border-white/10"
                        >
                            <span
                                class="text-xs font-bold {content.action ===
                                'BUY'
                                    ? 'text-green-400'
                                    : 'text-red-400'}"
                            >
                                {content.action}
                            </span>
                            <span class="text-white/80 text-xs mx-2">
                                {content.quantity}
                            </span>
                            <span class="text-white/40 text-xs">@</span>
                            <span
                                class="text-white font-mono text-sm font-medium ml-1"
                            >
                                ₹{content.price.toFixed(2)}
                            </span>
                            {#if content.pendingCount > 1}
                                <span class="text-amber-400/70 text-xs ml-2">
                                    (+{content.pendingCount - 1} more)
                                </span>
                            {/if}
                        </div>
                    </div>
                {/if}
            {/key}
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
        /* Layout containment for performance isolation */
        contain: layout style;

        /* Lighter glassmorphic effect - less GPU intensive */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(139, 92, 246, 0.04) 100%
        );
        /* Reduced blur for better performance */
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);

        /* Border and shadow */
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);

        /* Rounded corners */
        border-radius: 16px;

        /* Quick, smooth CSS-only transition for size changes */
        transition:
            width 0.15s cubic-bezier(0.2, 0, 0, 1),
            height 0.15s cubic-bezier(0.2, 0, 0, 1);
        will-change: width, height;

        /* Prevent text selection */
        user-select: none;
        position: relative;
    }

    /* Subtle inner glow */
    .dynamic-island::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 16px;
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08) 0%,
            transparent 60%
        );
        pointer-events: none;
    }

    /* Very subtle hover effect */
    .dynamic-island-wrapper:hover .dynamic-island {
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
    }
</style>
