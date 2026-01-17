/**
 * Orders store - tracks pending/open orders from Kite API
 * Polls for order status updates to detect when orders are executed or rejected
 */
import { writable, derived } from 'svelte/store';
import { kite } from '../services/kite';
import type { KiteOrder } from '../types/trading';

export interface OrdersState {
    orders: KiteOrder[];
    pendingOrders: KiteOrder[];
    isLoading: boolean;
    lastUpdated: Date | null;
    error: string | null;
}

const initialState: OrdersState = {
    orders: [],
    pendingOrders: [],
    isLoading: false,
    lastUpdated: null,
    error: null
};

function createOrdersStore() {
    const { subscribe, set, update } = writable<OrdersState>(initialState);

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    return {
        subscribe,

        /**
         * Fetch all orders from Kite API
         */
        async fetch() {
            update(state => ({ ...state, isLoading: true, error: null }));

            try {
                const rawOrders = await kite.getOrders();

                const orders: KiteOrder[] = rawOrders.map((o: any) => ({
                    orderId: o.order_id,
                    symbol: o.tradingsymbol,
                    transactionType: o.transaction_type,
                    quantity: o.quantity,
                    price: o.price || o.average_price,
                    status: o.status,
                    statusMessage: o.status_message || '',
                    orderTimestamp: o.order_timestamp
                }));

                // Filter pending orders (OPEN or PENDING status)
                const pendingOrders = orders.filter(o =>
                    o.status === 'OPEN' || o.status === 'PENDING'
                );

                set({
                    orders,
                    pendingOrders,
                    isLoading: false,
                    lastUpdated: new Date(),
                    error: null
                });

                console.log(`[OrdersStore] Fetched ${orders.length} orders, ${pendingOrders.length} pending`);

                return { orders, pendingOrders };

            } catch (error: any) {
                console.error('[OrdersStore] Failed to fetch:', error);
                update(state => ({
                    ...state,
                    isLoading: false,
                    error: error?.message || 'Failed to fetch orders'
                }));
                return { orders: [], pendingOrders: [] };
            }
        },

        /**
         * Start polling orders every N seconds
         */
        startPolling(intervalMs: number = 3000) {
            this.stopPolling();

            // Fetch immediately
            this.fetch();

            // Then poll
            pollInterval = setInterval(() => {
                this.fetch();
            }, intervalMs);

            console.log(`[OrdersStore] Started polling every ${intervalMs}ms`);
        },

        /**
         * Stop polling
         */
        stopPolling() {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
                console.log('[OrdersStore] Stopped polling');
            }
        },

        /**
         * Get pending orders for a specific symbol
         */
        getPendingForSymbol(symbol: string): KiteOrder[] {
            let result: KiteOrder[] = [];
            subscribe(state => {
                result = state.pendingOrders.filter(o => o.symbol === symbol);
            })();
            return result;
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

export const ordersStore = createOrdersStore();

// Derived store for checking if we have any pending orders
export const hasPendingOrders = derived(
    ordersStore,
    $store => $store.pendingOrders.length > 0
);

// Derived store for pending order count
export const pendingOrderCount = derived(
    ordersStore,
    $store => $store.pendingOrders.length
);
