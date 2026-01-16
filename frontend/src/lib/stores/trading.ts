import { writable } from 'svelte/store';
import { kite } from "../services/kite";

export interface Position {
    symbol: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    pnl: number;
}

export interface Order {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    status: 'OPEN' | 'FILLED' | 'CANCELLED';
    timestamp: Date;
}

export interface TradingState {
    balance: number;
    positions: Position[];
    orders: Order[];
}

const initialState: TradingState = {
    balance: 100000, // ₹1,00,000 Mock Balance
    positions: [],
    orders: []
};

function createTradingStore() {
    const { subscribe, update, set } = writable<TradingState>(initialState);

    return {
        subscribe,

        /**
         * Fetch real positions from Kite API and update store
         */
        fetchRealPositions: async () => {
            try {
                const data = await kite.getPositions();
                const positions: Position[] = (data.net || []).map((p: any) => ({
                    symbol: p.tradingsymbol,
                    quantity: p.quantity,
                    avgPrice: p.average_price,
                    currentPrice: p.last_price,
                    pnl: p.pnl || (p.last_price - p.average_price) * p.quantity
                }));

                update(state => ({
                    ...state,
                    positions
                }));

                return positions;
            } catch (e) {
                console.error("[TradingStore] Failed to fetch positions:", e);
                return [];
            }
        },

        /**
         * Update local state after a successful order (called by orderService)
         * Only updates optimistic UI - real data comes from fetchRealPositions
         */
        addLocalOrder: (symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number) => {
            update(state => {
                const id = Math.random().toString(36).substr(2, 9);
                const filledOrder: Order = {
                    id,
                    symbol,
                    side,
                    quantity,
                    price,
                    status: 'FILLED',
                    timestamp: new Date()
                };

                // Update Position optimistically
                const existingPosIndex = state.positions.findIndex(p => p.symbol === symbol);
                let newPositions = [...state.positions];

                if (existingPosIndex > -1) {
                    const pos = newPositions[existingPosIndex];
                    if (side === 'BUY') {
                        const totalVal = (pos.quantity * pos.avgPrice) + (quantity * price);
                        const totalQty = pos.quantity + quantity;
                        newPositions[existingPosIndex] = {
                            ...pos,
                            quantity: totalQty,
                            avgPrice: totalVal / totalQty
                        };
                    } else {
                        newPositions[existingPosIndex].quantity -= quantity;
                        if (newPositions[existingPosIndex].quantity <= 0) {
                            newPositions = newPositions.filter(p => p.symbol !== symbol);
                        }
                    }
                } else if (side === 'BUY') {
                    newPositions.push({
                        symbol,
                        quantity,
                        avgPrice: price,
                        currentPrice: price,
                        pnl: 0
                    });
                }

                return {
                    ...state,
                    orders: [filledOrder, ...state.orders],
                    positions: newPositions,
                    balance: side === 'BUY' ? state.balance - (quantity * price) : state.balance + (quantity * price)
                };
            });
        },

        /**
         * @deprecated Use addLocalOrder instead - this method has confusing behavior
         */
        placeOrder: async (symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number) => {
            // Just call addLocalOrder for backward compatibility
            // The actual API call is handled by orderService
            console.warn("[TradingStore] placeOrder is deprecated, use addLocalOrder instead");
        },

        updatePrice: (currentPrice: number) => {
            update(state => {
                const newPositions = state.positions.map(p => ({
                    ...p,
                    currentPrice,
                    pnl: (currentPrice - p.avgPrice) * p.quantity
                }));
                return { ...state, positions: newPositions };
            });
        }
    };
}

export const tradingStore = createTradingStore();
