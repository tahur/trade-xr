/**
 * Orders store - tracks pending/open orders from Kite API
 * Polls for order status updates to detect when orders are executed or rejected
 */
import { writable, derived } from 'svelte/store';
import { kite } from '../services/kite';
import type { KiteOrder } from '../types/trading';
import { TIMING } from '../config/timing';
import { createPoller } from '../utils/polling';

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

    /**
     * Fetch all orders from Kite API
     */
    async function fetchOrders() {
        update(state => ({ ...state, isLoading: true, error: null }));

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
    }

    // Create polling controller
    const poller = createPoller({
        fetchFn: fetchOrders,
        onUpdate: () => { }, // State already updated in fetchOrders
        onError: (error) => {
            console.error('[OrdersStore] Failed to fetch:', error);
            update(state => ({
                ...state,
                isLoading: false,
                error: error?.message || 'Failed to fetch orders'
            }));
        },
        intervalMs: TIMING.POLLING.ORDERS_UPDATE_MS
    });

    return {
        subscribe,

        /**
         * Fetch all orders from Kite API
         */
        async fetch() {
            try {
                return await fetchOrders();
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
        startPolling(intervalMs: number = TIMING.POLLING.ORDERS_UPDATE_MS) {
            poller.stop();

            // Update interval if different from default
            if (intervalMs !== TIMING.POLLING.ORDERS_UPDATE_MS) {
                // Recreate poller with new interval
                const newPoller = createPoller({
                    fetchFn: fetchOrders,
                    onUpdate: () => { },
                    onError: (error) => {
                        update(state => ({
                            ...state,
                            isLoading: false,
                            error: error?.message || 'Failed to fetch orders'
                        }));
                    },
                    intervalMs
                });
                newPoller.start();
            } else {
                poller.start();
            }

            console.log(`[OrdersStore] Started polling every ${intervalMs}ms`);
        },

        /**
         * Stop polling
         */
        stopPolling() {
            poller.stop();
            console.log('[OrdersStore] Stopped polling');
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
            poller.stop();
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
