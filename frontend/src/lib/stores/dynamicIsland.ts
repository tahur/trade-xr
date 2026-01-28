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
    avgPrice: number;      // Buy average price
    currentPrice: number;  // Current LTP
    position: 'OPEN' | 'CLOSED';
}

export interface PendingOrderContent {
    type: 'pending';
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    pendingCount: number;  // Total pending orders
}

export interface PortfolioContent {
    type: 'portfolio';
    totalValue: number;
    totalPnL: number;
    holdingsCount: number;
}

export type IslandContent = TickerContent | OrderContent | ApiContent | PnLContent | PendingOrderContent | PortfolioContent;

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
    let notificationActive = false; // Prevent P&L from overriding error/order notifications
    let portfolioModeActive = false; // Prevent ticker/P&L from overriding portfolio mode

    // Store the last ticker content so we can restore it after notifications
    let lastTickerContent: TickerContent = defaultTickerContent;

    // Queue P&L content when notification is active, so it can be shown after
    let queuedPnL: PnLContent | null = null;

    return {
        subscribe,

        // Update ticker (compact mode)
        updateTicker: (ticker: Omit<TickerContent, 'type'>) => {
            // Don't update ticker when portfolio mode is active
            if (portfolioModeActive) return;

            // Always save the latest ticker data
            lastTickerContent = { type: 'ticker', ...ticker };

            update(state => {
                // Only update display if we're in compact mode
                if (state.mode === 'compact') {
                    return {
                        ...state,
                        mode: 'compact',
                        content: lastTickerContent
                    };
                }
                // If not in compact mode, just save it for later (already done above)
                return state;
            });
        },

        // Show notification (auto-collapse) - takes priority over live activities
        show: (content: OrderContent | ApiContent, duration = 3000) => {
            if (collapseTimer) clearTimeout(collapseTimer);
            notificationActive = true; // Prevent P&L from overriding
            queuedPnL = null; // Clear any queued P&L when new notification starts

            set({
                mode: 'expanded',
                content,
                isVisible: true
            });

            // Auto-collapse - check for queued P&L first, otherwise restore ticker
            collapseTimer = setTimeout(() => {
                notificationActive = false; // Allow P&L updates again

                // If P&L was queued during notification, show it now
                if (queuedPnL) {
                    set({
                        mode: 'live',
                        content: queuedPnL,
                        isVisible: true
                    });
                    queuedPnL = null;
                } else {
                    set({
                        mode: 'compact',
                        content: lastTickerContent,
                        isVisible: true
                    });
                }
            }, duration);
        },

        // Set live activity (persistent P&L) - queues if notification is active
        setLiveActivity: (pnl: Omit<PnLContent, 'type'>) => {
            // Don't update P&L when portfolio mode is active
            if (portfolioModeActive) return;

            const pnlContent: PnLContent = { type: 'pnl', ...pnl };

            // Check if content matches current state to prevent flickering
            let currentState: DynamicIslandState = initialState;
            subscribe(s => currentState = s)();

            // Deep equality check for P&L content
            const isContentEqual = (a: IslandContent, b: IslandContent): boolean => {
                if (a.type !== 'pnl' || b.type !== 'pnl') return false;

                // Check all relevant fields for change
                return (
                    a.symbol === b.symbol &&
                    Math.abs(a.pnl - b.pnl) < 0.01 &&
                    Math.abs(a.pnlPercent - b.pnlPercent) < 0.01 &&
                    Math.abs(a.avgPrice - b.avgPrice) < 0.01 &&
                    Math.abs(a.currentPrice - b.currentPrice) < 0.01 &&
                    a.position === b.position
                );
            };

            // If mode is 'live' and content is effectively the same, ignore update
            if (currentState.mode === 'live' && isContentEqual(currentState.content, pnlContent)) {
                return;
            }

            // If notification is active, queue P&L to show after it expires
            if (notificationActive) {
                queuedPnL = pnlContent;
                return;
            }

            if (collapseTimer) clearTimeout(collapseTimer);
            if (liveActivityTimeout) clearTimeout(liveActivityTimeout);

            set({
                mode: 'live',
                content: pnlContent,
                isVisible: true
            });

            // Auto-hide if position is closed - restore ticker
            if (pnl.position === 'CLOSED') {
                liveActivityTimeout = setTimeout(() => {
                    set({
                        mode: 'compact',
                        content: lastTickerContent,
                        isVisible: true
                    });
                }, 5000);
            }
        },

        // Set pending order activity (shows pending orders)
        setPendingOrder: (pending: Omit<PendingOrderContent, 'type'>) => {
            // Don't override active notifications
            if (notificationActive) {
                return;
            }

            if (collapseTimer) clearTimeout(collapseTimer);

            set({
                mode: 'expanded',
                content: { type: 'pending', ...pending },
                isVisible: true
            });
        },

        // Set portfolio mode (shows total value and P&L)
        setPortfolio: (portfolio: Omit<PortfolioContent, 'type'>) => {
            if (collapseTimer) clearTimeout(collapseTimer);
            portfolioModeActive = true; // Block ticker/P&L updates

            set({
                mode: 'expanded',
                content: { type: 'portfolio', ...portfolio },
                isVisible: true
            });
        },

        // Manually collapse to compact - restore ticker
        collapse: () => {
            // Don't override active notifications (e.g., ETF switch, order confirmations)
            if (notificationActive) {
                return;
            }
            portfolioModeActive = false; // Re-enable ticker/P&L updates
            if (collapseTimer) clearTimeout(collapseTimer);
            set({
                mode: 'compact',
                content: lastTickerContent,
                isVisible: true
            });
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
        },

        // Check if portfolio mode is active (blocks other updates)
        isPortfolioMode: () => portfolioModeActive
    };
}

export const dynamicIsland = createDynamicIslandStore();
