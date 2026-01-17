/**
 * Shared trading types - Single source of truth for Position/Order interfaces
 * All stores should import from here to maintain consistency
 */

// ============================================================================
// POSITION TYPES
// ============================================================================

/**
 * Standard position interface (real positions from Kite API)
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

/**
 * Legacy position interface for local trading store
 * @deprecated Use Position instead
 */
export interface LegacyPosition {
    symbol: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    pnl: number;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

/**
 * Standard order interface
 */
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

/**
 * Kite-specific order interface (from Kite API responses)
 */
export interface KiteOrder {
    orderId: string;
    symbol: string;
    transactionType: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    status: 'OPEN' | 'COMPLETE' | 'CANCELLED' | 'REJECTED' | 'PENDING';
    statusMessage: string;
    orderTimestamp: string;
}

// ============================================================================
// CANDLE DATA
// ============================================================================

export interface CandleData {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
}

// ============================================================================
// TYPE ALIASES & UTILITY TYPES
// ============================================================================

export type TransactionType = 'BUY' | 'SELL';
export type OrderStatus = Order['status'];
export type KiteOrderStatus = KiteOrder['status'];

// Aliases for backward compatibility
export type RealPosition = Position;
