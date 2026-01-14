/**
 * Dynamic Island Store - Manages state for the notification island
 */
import { writable, derived } from 'svelte/store';

export type IslandMode = 'compact' | 'expanded' | 'live';

export type IslandContentType = 'ticker' | 'order' | 'api' | 'pnl';

export interface TickerContent {
    type: 'ticker';
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
}

export interface OrderContent {
    type: 'order';
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
}

export interface ApiContent {
    type: 'api';
    message: string;
    severity: 'success' | 'error' | 'info';
}

export interface PnLContent {
    type: 'pnl';
    symbol: string;
    pnl: number;
    pnlPercent: number;
    position: 'OPEN' | 'CLOSED';
}

export type IslandContent = TickerContent | OrderContent | ApiContent | PnLContent;

interface DynamicIslandState {
    mode: IslandMode;
    content: IslandContent;
    isVisible: boolean;
}

const defaultTickerContent: TickerContent = {
    type: 'ticker',
    symbol: 'SILVERCASE',
    price: 0,
    change: 0,
    changePercent: 0
};

const initialState: DynamicIslandState = {
    mode: 'compact',
    content: defaultTickerContent,
    isVisible: true
};

function createDynamicIslandStore() {
    const { subscribe, set, update } = writable<DynamicIslandState>(initialState);

    let collapseTimer: ReturnType<typeof setTimeout> | null = null;
    let liveActivityTimeout: ReturnType<typeof setTimeout> | null = null;

    return {
        subscribe,

        // Update ticker (compact mode)
        updateTicker: (ticker: Omit<TickerContent, 'type'>) => {
            update(state => {
                // Only update if we're in compact mode or ticker content
                if (state.mode === 'compact' || state.content.type === 'ticker') {
                    return {
                        ...state,
                        mode: 'compact',
                        content: { type: 'ticker', ...ticker }
                    };
                }
                return state;
            });
        },

        // Show notification (auto-collapse)
        show: (content: OrderContent | ApiContent, duration = 3000) => {
            if (collapseTimer) clearTimeout(collapseTimer);

            set({
                mode: 'expanded',
                content,
                isVisible: true
            });

            // Auto-collapse back to ticker
            collapseTimer = setTimeout(() => {
                update(state => ({
                    ...state,
                    mode: 'compact'
                }));
            }, duration);
        },

        // Set live activity (persistent P&L)
        setLiveActivity: (pnl: Omit<PnLContent, 'type'>) => {
            if (collapseTimer) clearTimeout(collapseTimer);
            if (liveActivityTimeout) clearTimeout(liveActivityTimeout);

            set({
                mode: 'live',
                content: { type: 'pnl', ...pnl },
                isVisible: true
            });

            // Auto-hide if position is closed
            if (pnl.position === 'CLOSED') {
                liveActivityTimeout = setTimeout(() => {
                    update(state => ({
                        ...state,
                        mode: 'compact'
                    }));
                }, 5000);
            }
        },

        // Manually collapse to compact
        collapse: () => {
            if (collapseTimer) clearTimeout(collapseTimer);
            update(state => ({
                ...state,
                mode: 'compact'
            }));
        },

        // Hide completely
        hide: () => {
            update(state => ({
                ...state,
                isVisible: false
            }));
        },

        // Show
        reveal: () => {
            update(state => ({
                ...state,
                isVisible: true
            }));
        }
    };
}

export const dynamicIsland = createDynamicIslandStore();
