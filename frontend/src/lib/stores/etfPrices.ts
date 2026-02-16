/**
 * Multi-ETF Price Store
 * Fetches LTP + change% for ALL supported ETFs on a slow interval,
 * so the ETF selector can show prices for non-selected ETFs.
 */
import { writable, derived } from 'svelte/store';
import { SUPPORTED_ETFS, type ETFConfig } from '$lib/config/etfs';
import { API_CONFIG } from '$lib/config/api';

export interface ETFPriceData {
    ltp: number;
    change: number;
    changePercent: number;
    lastUpdate: number;
}

export type ETFPriceMap = Record<string, ETFPriceData>;

const POLL_INTERVAL = 15_000; // 15 seconds — background data, not critical

function createETFPricesStore() {
    const { subscribe, set, update } = writable<ETFPriceMap>({});

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isActive = false;

    async function fetchSingleETF(etf: ETFConfig): Promise<[string, ETFPriceData] | null> {
        try {
            const res = await fetch(
                `${API_CONFIG.BASE_URL}/quote/${etf.symbol}?exchange=${etf.exchange}`
            );
            if (res.ok) {
                const data = await res.json();
                return [etf.symbol, {
                    ltp: data.ltp ?? 0,
                    change: data.change ?? 0,
                    changePercent: data.change_percent ?? 0,
                    lastUpdate: Date.now()
                }];
            }
        } catch {
            // Silently fail — this is background data
        }
        return null;
    }

    async function fetchAll() {
        const results = await Promise.allSettled(
            SUPPORTED_ETFS.map(etf => fetchSingleETF(etf))
        );

        const newPrices: ETFPriceMap = {};
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                const [symbol, data] = result.value;
                newPrices[symbol] = data;
            }
        }

        if (Object.keys(newPrices).length > 0) {
            update(current => ({ ...current, ...newPrices }));
        }
    }

    return {
        subscribe,

        /** Start polling all ETF prices */
        start() {
            if (isActive) return;
            isActive = true;
            fetchAll(); // immediate first fetch
            intervalId = setInterval(fetchAll, POLL_INTERVAL);
        },

        /** Stop polling */
        stop() {
            isActive = false;
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        },

        /** Force refresh now */
        refresh: fetchAll,

        /** Get price for a specific symbol */
        getPrice: derived({ subscribe }, ($prices: ETFPriceMap) => {
            return (symbol: string): ETFPriceData | null => $prices[symbol] ?? null;
        })
    };
}

export const etfPricesStore = createETFPricesStore();
