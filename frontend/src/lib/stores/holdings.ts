/**
 * Holdings Store - Portfolio holdings from Kite API
 */
import { writable, derived } from 'svelte/store';
import { API_CONFIG } from '$lib/config/api';

export interface Holding {
    tradingsymbol: string;
    exchange: string;
    instrument_token: number;
    isin: string;
    quantity: number;
    average_price: number;
    last_price: number;
    close_price: number;
    pnl: number;
    day_change: number;
    day_change_percentage: number;
    // Computed values for visualization
    value?: number;      // quantity * last_price
    investedValue?: number; // quantity * average_price
}

interface HoldingsState {
    holdings: Holding[];
    isLoading: boolean;
    error: string | null;
    lastFetched: number | null;
}

function createHoldingsStore() {
    const { subscribe, set, update } = writable<HoldingsState>({
        holdings: [],
        isLoading: false,
        error: null,
        lastFetched: null
    });

    return {
        subscribe,

        async fetch(): Promise<Holding[]> {
            update(s => ({ ...s, isLoading: true, error: null }));

            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/portfolio/holdings`);

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('API not connected. Please login to Kite first.');
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.status !== 'success') {
                    throw new Error(data.detail || 'Failed to fetch holdings');
                }

                // Enrich holdings with computed values
                const holdings: Holding[] = data.holdings.map((h: any) => ({
                    ...h,
                    value: h.quantity * h.last_price,
                    investedValue: h.quantity * h.average_price
                }));

                update(s => ({
                    ...s,
                    holdings,
                    isLoading: false,
                    lastFetched: Date.now()
                }));

                return holdings;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                update(s => ({ ...s, isLoading: false, error: message }));
                console.error('[HoldingsStore] Fetch error:', message);
                return [];
            }
        },

        clear() {
            set({
                holdings: [],
                isLoading: false,
                error: null,
                lastFetched: null
            });
        }
    };
}

export const holdingsStore = createHoldingsStore();

// Derived store for total portfolio value
export const totalPortfolioValue = derived(holdingsStore, $store =>
    $store.holdings.reduce((sum, h) => sum + (h.value || 0), 0)
);

// Derived store for total P&L
export const totalPnL = derived(holdingsStore, $store =>
    $store.holdings.reduce((sum, h) => sum + h.pnl, 0)
);

// Derived store for total invested value
export const totalInvestedValue = derived(holdingsStore, $store =>
    $store.holdings.reduce((sum, h) => sum + (h.investedValue || h.quantity * h.average_price), 0)
);
