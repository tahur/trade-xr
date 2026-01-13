const API_URL = "http://localhost:8000/api/kite";

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
        if (!response.ok) throw new Error("Order failed");
        return await response.json();
    },

    async getPositions() {
        const response = await fetch(`${API_URL}/positions`);
        if (!response.ok) throw new Error("Failed to fetch positions");
        return await response.json();
    }
};
