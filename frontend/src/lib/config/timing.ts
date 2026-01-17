/**
 * Timing Configuration - Centralized timing constants
 * All delays, debounces, and intervals should reference these values
 */

export const TIMING = {
    // Gesture interaction timings
    GESTURE: {
        ENTRY_DELAY_MS: 200,      // Delay before entering targeting mode
        LOCK_DELAY_MS: 350,       // Delay before locking price on pinch
        CONFIRM_DELAY_MS: 400,    // Delay before confirming order
        ORDER_DELAY_MS: 500,      // Delay before placing order on thumbs up
        POST_LOCK_COOLDOWN: 400   // Cooldown after price lock
    },

    // Polling intervals for data updates
    POLLING: {
        PRICE_UPDATE_MS: 5000,      // LTP price polling (5 seconds)
        CANDLE_UPDATE_MS: 60000,    // Candle data polling (60 seconds)
        POSITIONS_UPDATE_MS: 5000,  // Positions polling (5 seconds)
        ORDERS_UPDATE_MS: 3000      // Orders polling (3 seconds)
    }
} as const;
