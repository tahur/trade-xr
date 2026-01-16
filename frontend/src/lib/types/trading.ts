/**
 * Shared trading types - Single source of truth for Position/Order interfaces
 */

export interface Position {
    symbol: string;
    quantity: number;
    averagePrice: number;
    lastPrice: number;
    pnl: number;
    dayChange?: number;
    dayChangePercent?: number;
}

export interface Order {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    status: 'OPEN' | 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
    timestamp: Date;
    orderId?: string;
}

export interface CandleData {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
}

export type TransactionType = 'BUY' | 'SELL';
export type OrderStatus = Order['status'];
