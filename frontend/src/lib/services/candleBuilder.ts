/**
 * Service to build real-time candles from tick data.
 * Aggregates ticks into minute-based OHLC candles.
 */
import { writable, derived, get } from 'svelte/store';
import type { Tick } from './tickerService';

export interface LiveCandle {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
    isComplete: boolean;
}

interface CandleBuilderState {
    candles: LiveCandle[];
    currentCandle: LiveCandle | null;
    intervalMs: number;
}

function createCandleBuilder(intervalMinutes: number = 1) {
    const intervalMs = intervalMinutes * 60 * 1000;

    const { subscribe, set, update } = writable<CandleBuilderState>({
        candles: [],
        currentCandle: null,
        intervalMs
    });

    // Get the start of the current candle period
    function getCandleStart(timestamp: number): number {
        return Math.floor(timestamp / intervalMs) * intervalMs;
    }

    function processTick(tick: Tick) {
        const now = Date.now();
        const candleStart = getCandleStart(now);

        update(state => {
            const { candles, currentCandle } = state;

            // Check if we need to start a new candle
            if (!currentCandle || currentCandle.timestamp !== candleStart) {
                // Complete the previous candle
                const newCandles = currentCandle
                    ? [...candles.slice(-49), { ...currentCandle, isComplete: true }]
                    : candles;

                // Start new candle
                return {
                    ...state,
                    candles: newCandles,
                    currentCandle: {
                        open: tick.last_price,
                        high: tick.last_price,
                        low: tick.last_price,
                        close: tick.last_price,
                        volume: tick.volume,
                        timestamp: candleStart,
                        isComplete: false
                    }
                };
            }

            // Update current candle
            return {
                ...state,
                currentCandle: {
                    ...currentCandle,
                    high: Math.max(currentCandle.high, tick.last_price),
                    low: Math.min(currentCandle.low, tick.last_price),
                    close: tick.last_price,
                    volume: tick.volume
                }
            };
        });
    }

    function setHistoricalCandles(historicalCandles: LiveCandle[]) {
        update(state => ({
            ...state,
            candles: historicalCandles.map(c => ({ ...c, isComplete: true })),
            currentCandle: null
        }));
    }

    function reset() {
        set({
            candles: [],
            currentCandle: null,
            intervalMs
        });
    }

    // Derived store for all candles including current
    const allCandles = derived({ subscribe }, $state => {
        if ($state.currentCandle) {
            return [...$state.candles, $state.currentCandle];
        }
        return $state.candles;
    });

    return {
        subscribe,
        processTick,
        setHistoricalCandles,
        reset,
        allCandles
    };
}

export const candleBuilder = createCandleBuilder(1); // 1-minute candles
