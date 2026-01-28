/**
 * Centralized order placement service.
 * Handles Kite API calls, Dynamic Island notifications, and local state updates.
 */

import { kite } from './kite';
import { dynamicIsland } from '../stores/dynamicIsland';
import { tradingStore } from '../stores/trading';
import { requireActiveTab } from '../utils/TabGuard';
import { requireOrderAllowed } from '../utils/RateLimiter';

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
    const orderValue = quantity * price;

    // === SAFETY GUARD: Require active tab ===
    try {
        requireActiveTab('Order placement');
    } catch (error: any) {
        dynamicIsland.show({
            type: 'api',
            message: error.message,
            severity: 'error'
        }, 4000);
        return { success: false, error: error.message };
    }

    // === SAFETY GUARD: Rate limiting ===
    try {
        requireOrderAllowed();
    } catch (error: any) {
        dynamicIsland.show({
            type: 'api',
            message: error.message,
            severity: 'error'
        }, 4000);
        return { success: false, error: error.message };
    }

    console.log(`[OrderService] Placing ${side} order:`, params);

    // === PRE-ORDER MARGIN CHECK ===
    try {
        const margins = await kite.getMargins();
        const availableMargin = margins.available_cash || margins.available_margin || 0;

        console.log(`[OrderService] Available margin: ₹${availableMargin}, Order value: ₹${orderValue}`);

        if (availableMargin < orderValue && side === 'BUY') {
            console.error(`[OrderService] Insufficient margin: ₹${availableMargin} < ₹${orderValue}`);

            // Show error notification
            dynamicIsland.show({
                type: 'api',
                message: `Insufficient margin: ₹${availableMargin.toFixed(0)} available, need ₹${orderValue.toFixed(0)}`,
                severity: 'error'
            }, 5000);

            return {
                success: false,
                error: 'Insufficient margin'
            };
        }
    } catch (marginError) {
        console.warn(`[OrderService] Could not check margin:`, marginError);
        // Continue with order - margin check is optional
    }

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
        const orderId = response?.order_id;

        console.log(`[OrderService] Order placed, ID: ${orderId}, checking status...`);

        // === POLL ORDER STATUS TO GET REAL RESULT ===
        // Wait a moment for exchange to process, then check status
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const status = await kite.getOrderStatus(orderId);
            console.log(`[OrderService] Order status:`, status);

            if (status.status === 'REJECTED') {
                // Order was rejected by exchange - show rejection message from API
                console.error(`[OrderService] Order REJECTED:`, status.status_message);

                dynamicIsland.show({
                    type: 'api',
                    message: status.status_message || 'Order rejected by exchange',
                    severity: 'error'
                }, 5000);

                return {
                    success: false,
                    error: status.status_message || 'Order rejected'
                };
            }
        } catch (statusError) {
            console.warn(`[OrderService] Could not check order status:`, statusError);
            // Continue - assume success if we can't check
        }

        // Show success notification
        dynamicIsland.show({
            type: 'order',
            action: side,
            quantity,
            price,
            status: 'SUCCESS'
        }, 4000);

        // Update local trading store (optimistic)
        tradingStore.addLocalOrder(symbol, side, quantity, price);

        // Fetch real positions from API to get accurate P&L
        setTimeout(() => {
            tradingStore.fetchRealPositions();
        }, 1000); // Small delay to allow order to settle

        return {
            success: true,
            orderId
        };

    } catch (error: any) {
        console.error(`[OrderService] Failed:`, error);
        console.log(`[OrderService] Error message:`, error?.message);

        // Show error notification
        console.log(`[OrderService] Calling dynamicIsland.show with error`);
        dynamicIsland.show({
            type: 'api',
            message: error?.message || 'Order failed',
            severity: 'error'
        }, 5000);
        console.log(`[OrderService] dynamicIsland.show called`);

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
