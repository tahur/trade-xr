/**
 * Centralized order placement service.
 * Handles Kite API calls, Dynamic Island notifications, and local state updates.
 */

import { kite } from './kite';
import { dynamicIsland } from '../stores/dynamicIsland';
import { tradingStore } from '../stores/trading';

export interface OrderParams {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
}

export interface OrderResult {
    success: boolean;
    orderId?: string;
    error?: string;
}

/**
 * Place an order with full notification lifecycle.
 * Shows pending → success/error in Dynamic Island.
 * Updates local trading store on success.
 */
export async function placeOrder(params: OrderParams): Promise<OrderResult> {
    const { symbol, side, quantity, price } = params;

    console.log(`[OrderService] Placing ${side} order:`, params);

    // Show pending notification
    dynamicIsland.show({
        type: 'order',
        action: side,
        quantity,
        price,
        status: 'PENDING'
    }, 5000);

    try {
        const response = await kite.placeOrder(symbol, side, quantity, price);

        console.log(`[OrderService] Success:`, response);

        // Show success notification
        dynamicIsland.show({
            type: 'order',
            action: side,
            quantity,
            price,
            status: 'SUCCESS'
        }, 4000);

        // Update local trading store
        await tradingStore.placeOrder(symbol, side, quantity, price);

        return {
            success: true,
            orderId: response?.order_id
        };

    } catch (error: any) {
        console.error(`[OrderService] Failed:`, error);

        // Show error notification
        dynamicIsland.show({
            type: 'api',
            message: error?.message || 'Order failed',
            severity: 'error'
        }, 5000);

        return {
            success: false,
            error: error?.message || 'Unknown error'
        };
    }
}

/**
 * Place a quick buy order (convenience wrapper)
 */
export async function quickBuy(symbol: string, price: number, quantity: number = 1): Promise<OrderResult> {
    return placeOrder({ symbol, side: 'BUY', quantity, price });
}

/**
 * Place a quick sell order (convenience wrapper)
 */
export async function quickSell(symbol: string, price: number, quantity: number = 1): Promise<OrderResult> {
    return placeOrder({ symbol, side: 'SELL', quantity, price });
}
