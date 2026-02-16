<script lang="ts">
    import type { ETFConfig } from "$lib/config/etfs";
    import { etfPricesStore, type ETFPriceData } from "$lib/stores/etfPrices";
    import { positionsStore } from "$lib/stores/positions";
    import { fade, fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";

    export let etfs: ETFConfig[];
    export let selectedETF: ETFConfig;
    export let onSelect: (etf: ETFConfig) => void;

    // Subscribe to prices and positions
    $: prices = $etfPricesStore;
    $: positions = $positionsStore.positions;

    // Helper: check if user has position in this ETF
    function hasPosition(symbol: string): boolean {
        return positions.some((p) => p.symbol === symbol && p.quantity !== 0);
    }

    // Helper: format price
    function formatPrice(price: number): string {
        if (price === 0) return "—";
        if (price >= 1000)
            return `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
        return `₹${price.toFixed(2)}`;
    }

    // Helper: format change
    function formatChange(pct: number): string {
        const sign = pct >= 0 ? "+" : "";
        return `${sign}${pct.toFixed(1)}%`;
    }
</script>

<div class="etf-selector" transition:fade={{ duration: 300 }}>
    <div class="etf-track">
        {#each etfs as etf, i}
            {@const priceData = prices[etf.symbol]}
            {@const isActive = selectedETF.symbol === etf.symbol}
            {@const hasPos = hasPosition(etf.symbol)}
            <button
                class="etf-card"
                class:active={isActive}
                on:click={() => onSelect(etf)}
                in:fly={{
                    y: -20,
                    delay: i * 60,
                    duration: 400,
                    easing: cubicOut,
                }}
                style="--accent: {etf.accentColor}"
            >
                <!-- Position indicator dot -->
                {#if hasPos}
                    <span class="pos-dot" transition:fade={{ duration: 200 }}
                    ></span>
                {/if}

                <!-- Top row: Icon + Symbol -->
                <div class="card-header">
                    <span class="card-icon">{etf.icon}</span>
                    <span class="card-symbol">{etf.shortName}</span>
                </div>

                <!-- Price -->
                <div class="card-price">
                    {#if priceData}
                        {formatPrice(priceData.ltp)}
                    {:else}
                        <span class="skeleton"></span>
                    {/if}
                </div>

                <!-- Change badge -->
                <div class="card-change">
                    {#if priceData}
                        <span
                            class="change-badge"
                            class:positive={priceData.changePercent >= 0}
                            class:negative={priceData.changePercent < 0}
                        >
                            {formatChange(priceData.changePercent)}
                        </span>
                    {:else}
                        <span class="change-badge loading">—</span>
                    {/if}
                </div>
            </button>
        {/each}
    </div>
</div>

<style>
    .etf-selector {
        position: fixed;
        top: 1.25rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 90;
    }

    .etf-track {
        display: flex;
        align-items: stretch;
        gap: 0.5rem;
    }

    /* === ETF Card === */
    .etf-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        min-width: 5.5rem;
        padding: 0.5rem 0.75rem;
        border-radius: 12px;
        cursor: pointer;
        outline: none;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

        /* Glassmorphism */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.04) 0%,
            rgba(255, 255, 255, 0.02) 100%
        );
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .etf-card:hover {
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08) 0%,
            rgba(255, 255, 255, 0.04) 100%
        );
        border-color: rgba(255, 255, 255, 0.12);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    }

    .etf-card.active {
        background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--accent) 15%, transparent) 0%,
            color-mix(in srgb, var(--accent) 8%, transparent) 100%
        );
        border-color: color-mix(in srgb, var(--accent) 40%, transparent);
        box-shadow:
            0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent),
            0 4px 16px color-mix(in srgb, var(--accent) 25%, transparent),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        transform: translateY(-1px) scale(1.03);
    }

    .etf-card.active:hover {
        transform: translateY(-1px) scale(1.03);
    }

    /* === Position Dot === */
    .pos-dot {
        position: absolute;
        top: 0.35rem;
        right: 0.35rem;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }

    /* === Card Header === */
    .card-header {
        display: flex;
        align-items: center;
        gap: 0.3rem;
    }

    .card-icon {
        font-size: 0.6rem;
        color: var(--accent);
        opacity: 0.8;
    }

    .card-symbol {
        font-family: "Space Grotesk", sans-serif;
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(255, 255, 255, 0.5);
        transition: color 0.2s;
    }

    .etf-card.active .card-symbol {
        color: rgba(255, 255, 255, 0.95);
    }

    .etf-card:hover .card-symbol {
        color: rgba(255, 255, 255, 0.75);
    }

    /* === Price === */
    .card-price {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.8rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.85);
        letter-spacing: -0.02em;
        line-height: 1;
    }

    .etf-card.active .card-price {
        color: #fff;
        font-weight: 600;
    }

    /* === Change Badge === */
    .change-badge {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.55rem;
        font-weight: 500;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        line-height: 1.2;
    }

    .change-badge.positive {
        color: #34d399;
        background: rgba(16, 185, 129, 0.12);
    }

    .change-badge.negative {
        color: #fb7185;
        background: rgba(244, 63, 94, 0.12);
    }

    .change-badge.loading {
        color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.04);
    }

    /* === Skeleton Loader === */
    .skeleton {
        display: inline-block;
        width: 2.8rem;
        height: 0.8rem;
        border-radius: 4px;
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04) 25%,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(255, 255, 255, 0.04) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s ease-in-out infinite;
    }

    @keyframes shimmer {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }
</style>
