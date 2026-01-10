import { writable } from 'svelte/store';

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
    const { subscribe, update } = writable<TradingState>(initialState);

    return {
        subscribe,
        placeOrder: (side: 'BUY' | 'SELL', quantity: number, price: number) => {
            update(state => {
                const id = Math.random().toString(36).substr(2, 9);
                const newOrder: Order = {
                    id,
                    symbol: 'NIFTY 50', // Hardcoded for single chart demo
                    side,
                    quantity,
                    price,
                    status: 'OPEN',
                    timestamp: new Date()
                };

                // Mock Instant Fill for demo
                const filledOrder = { ...newOrder, status: 'FILLED' as const };

                // Update Position
                const existingPosIndex = state.positions.findIndex(p => p.symbol === 'NIFTY 50');
                let newPositions = [...state.positions];

                if (existingPosIndex > -1) {
                    const pos = newPositions[existingPosIndex];
                    // Simple averaging logic
                    const totalVal = (pos.quantity * pos.avgPrice) + (quantity * price);
                    const totalQty = pos.quantity + quantity; // Assuming BUY for now

                    if (side === 'BUY') {
                        newPositions[existingPosIndex] = {
                            ...pos,
                            quantity: totalQty,
                            avgPrice: totalVal / totalQty
                        };
                    } else {
                        // Sell logic simplifed: reduce qty
                        newPositions[existingPosIndex].quantity -= quantity;
                        if (newPositions[existingPosIndex].quantity <= 0) {
                            newPositions = newPositions.filter(p => p.symbol !== 'NIFTY 50');
                        }
                    }

                } else if (side === 'BUY') {
                    newPositions.push({
                        symbol: 'NIFTY 50',
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
