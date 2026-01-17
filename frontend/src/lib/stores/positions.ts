/**
 * Real-time positions store - fetches actual positions from Kite API
 * Independent of local trading store calculations
 */
import { writable, derived } from 'svelte/store';
import { kite } from '../services/kite';
import type { Position } from '../types/trading';

// Using Position from central types (RealPosition is an alias)
export type RealPosition = Position;

export interface PositionsState {
    positions: RealPosition[];
    totalPnl: number;
    totalPnlPercent: number;
    isLoading: boolean;
    lastUpdated: Date | null;
    error: string | null;
}

const initialState: PositionsState = {
    positions: [],
    totalPnl: 0,
    totalPnlPercent: 0,
    isLoading: false,
    lastUpdated: null,
    error: null
};

function createPositionsStore() {
    const { subscribe, set, update } = writable<PositionsState>(initialState);

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    return {
        subscribe,

        /**
         * Fetch positions from Kite API
         */
        async fetch() {
            update(state => ({ ...state, isLoading: true, error: null }));

            try {
                const data = await kite.getPositions();

                // Parse net positions (day + overnight combined)
                const netPositions = data.net || [];

                const positions: RealPosition[] = netPositions
                    .filter((p: any) => p.quantity !== 0) // Only positions with quantity
                    .map((p: any) => ({
                        symbol: p.tradingsymbol,
                        quantity: p.quantity,
                        averagePrice: p.average_price,
                        lastPrice: p.last_price,
                        pnl: p.pnl || ((p.last_price - p.average_price) * p.quantity),
                        dayChange: p.day_change || 0,
                        dayChangePercent: p.day_change_percentage || 0
                    }));

                // Calculate totals
                const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
                const totalValue = positions.reduce((sum, p) => sum + (p.averagePrice * Math.abs(p.quantity)), 0);
                const totalPnlPercent = totalValue > 0 ? (totalPnl / totalValue) * 100 : 0;

                set({
                    positions,
                    totalPnl,
                    totalPnlPercent,
                    isLoading: false,
                    lastUpdated: new Date(),
                    error: null
                });

                console.log(`[PositionsStore] Fetched ${positions.length} positions, P&L: ₹${totalPnl.toFixed(2)}`);

                return positions;

            } catch (error: any) {
                console.error('[PositionsStore] Failed to fetch:', error);
                update(state => ({
                    ...state,
                    isLoading: false,
                    error: error?.message || 'Failed to fetch positions'
                }));
                return [];
            }
        },

        /**
         * Start polling positions every N seconds
         */
        startPolling(intervalMs: number = 5000) {
            this.stopPolling();

            // Fetch immediately
            this.fetch();

            // Then poll
            pollInterval = setInterval(() => {
                this.fetch();
            }, intervalMs);

            console.log(`[PositionsStore] Started polling every ${intervalMs}ms`);
        },

        /**
         * Stop polling
         */
        stopPolling() {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
                console.log('[PositionsStore] Stopped polling');
            }
        },

        /**
         * Reset store
         */
        reset() {
            this.stopPolling();
            set(initialState);
        }
    };
}

export const positionsStore = createPositionsStore();

// Derived store for checking if we have any open positions
export const hasOpenPositions = derived(
    positionsStore,
    $store => $store.positions.length > 0
);
