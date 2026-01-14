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
        top: 11rem;
        left: 1.5rem;
        z-index: 90;
    }

    .etf-tab {
        /* Glassmorphic background */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08) 0%,
            rgba(255, 255, 255, 0.05) 100%
        );
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);

        /* Border and shadow */
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

        /* Layout */
        padding: 0.5rem 0.875rem;
        border-radius: 12px;

        /* Transitions */
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        /* Reset button styles */
        cursor: pointer;
        outline: none;
    }

    .etf-tab:hover {
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(255, 255, 255, 0.08) 100%
        );
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(139, 92, 246, 0.15);
    }

    .etf-tab.active {
        background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.3) 0%,
            rgba(99, 102, 241, 0.2) 100%
        );
        border-color: rgba(139, 92, 246, 0.4);
        box-shadow:
            0 0 0 2px rgba(139, 92, 246, 0.2),
            0 8px 24px rgba(139, 92, 246, 0.3);
    }

    .etf-tab.active:hover {
        transform: translateY(0);
    }

    .etf-symbol {
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.9);
    }

    .etf-tab.active .etf-symbol {
        color: rgba(255, 255, 255, 1);
    }
</style>
