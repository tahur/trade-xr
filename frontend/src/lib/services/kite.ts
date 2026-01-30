/**
 * Kite API Service - Zerodha trading operations
 * 
 * Provides methods for authentication, order placement, and account data.
 */
import { API_CONFIG } from '$lib/config/api';

const API_URL = `${API_CONFIG.BASE_URL}/api/kite`;

export const kite = {
    async login(requestToken: string) {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ request_token: requestToken }),
        });
        if (!response.ok) throw new Error("Login failed");
        return await response.json();
    },

    async placeOrder(symbol: string, transactionType: "BUY" | "SELL", quantity: number, price: number) {
        const response = await fetch(`${API_URL}/order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                symbol,
                transaction_type: transactionType,
                quantity,
                price
            }),
        });
        if (!response.ok) {
            // Extract the actual error message from the API response
            try {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Order failed");
            } catch (e: any) {
                if (e.message && e.message !== "Order failed") {
                    throw e; // Re-throw if we already have a good message
                }
                throw new Error("Order failed - unknown error");
            }
        }
        return await response.json();
    },

    async getPositions() {
        const response = await fetch(`${API_URL}/positions`);
        if (!response.ok) throw new Error("Failed to fetch positions");
        return await response.json();
    },

    async getMargins() {
        const response = await fetch(`${API_URL}/margins`);
        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to fetch margins");
            } catch {
                throw new Error("Failed to fetch margins");
            }
        }
        return await response.json();
    },

    async getOrderStatus(orderId: string) {
        const response = await fetch(`${API_URL}/order/${orderId}`);
        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to fetch order status");
            } catch {
                throw new Error("Failed to fetch order status");
            }
        }
        return await response.json();
    },

    async getOrders() {
        const response = await fetch(`${API_URL}/orders`);
        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to fetch orders");
            } catch {
                throw new Error("Failed to fetch orders");
            }
        }
        return await response.json();
    }
};
