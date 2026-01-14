<script lang="ts">
    import type { ETFConfig } from "$lib/config/etfs";
    import { fade, scale } from "svelte/transition";

    export let etfs: ETFConfig[];
    export let selectedETF: ETFConfig;
    export let onSelect: (etf: ETFConfig) => void;

    // Short names for display
    const getShortName = (symbol: string) => {
        const names: Record<string, string> = {
            GOLDCASE: "GOLD",
            SILVERCASE: "SILVER",
            NIFTYCASE: "NIFTY",
            TOP100CASE: "TOP100",
            MID150CASE: "MID150",
        };
        return names[symbol] || symbol;
    };
</script>

<div class="etf-selector" transition:fade={{ duration: 200 }}>
    <div class="flex items-center gap-2">
        {#each etfs as etf}
            <button
                class="etf-tab"
                class:active={selectedETF.symbol === etf.symbol}
                on:click={() => onSelect(etf)}
                transition:scale={{ duration: 200 }}
            >
                <span class="etf-symbol">{getShortName(etf.symbol)}</span>
            </button>
        {/each}
    </div>
</div>

<style>
    .etf-selector {
        position: fixed;
        top: 1.5rem;
        left: 16rem; /* Right of BrandCard */
        z-index: 90;
    }

    .etf-tab {
        /* Glassmorphic background - more subtle */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.03) 100%
        );
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);

        /* Border and shadow - subtle */
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

        /* Layout - smaller */
        padding: 0.375rem 0.625rem;
        border-radius: 8px;

        /* Transitions */
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        /* Reset button styles */
        cursor: pointer;
        outline: none;
    }

    .etf-tab:hover {
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.06) 100%
        );
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
    }

    .etf-tab.active {
        background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.2) 0%,
            rgba(99, 102, 241, 0.15) 100%
        );
        border-color: rgba(139, 92, 246, 0.3);
        box-shadow:
            0 0 0 1px rgba(139, 92, 246, 0.15),
            0 4px 12px rgba(139, 92, 246, 0.2);
    }

    .etf-tab.active:hover {
        transform: translateY(0);
    }

    .etf-symbol {
        font-size: 0.625rem; /* Smaller text */
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.7);
    }

    .etf-tab.active .etf-symbol {
        color: rgba(255, 255, 255, 0.95);
    }
</style>
