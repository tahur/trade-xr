export interface CandleData {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
}

export function generateCandles(count: number = 100): CandleData[] {
    let price = 1000;
    let time = Date.now() - count * 60 * 1000; // Start 'count' minutes ago

    return Array.from({ length: count }, (_, i) => {
        const open = price;
        const change = (Math.random() - 0.5) * 20; // Random change between -10 and +10
        const close = open + change;

        // High must be >= open and close
        const high = Math.max(open, close) + Math.abs(Math.random() * 5);

        // Low must be <= open and close
        const low = Math.min(open, close) - Math.abs(Math.random() * 5);

        // Update price for next candle
        price = close;
        time += 60 * 1000; // Add 1 minute

        return {
            open,
            high,
            low,
            close,
            volume: Math.floor(Math.random() * 100000),
            timestamp: time
        };
    });
}
