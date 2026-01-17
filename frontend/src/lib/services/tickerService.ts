/**
 * WebSocket service for real-time tick data from Kite.
 */
import { writable, derived, type Readable } from 'svelte/store';
import { API_CONFIG } from '$lib/config/api';

export interface Tick {
    instrument_token: number;
    symbol: string;
    last_price: number;
    change: number;
    volume: number;
    ohlc: {
        open: number;
        high: number;
        low: number;
        close: number;
    };
    timestamp: string;
}

export interface TickerState {
    connected: boolean;
    ticks: Map<number, Tick>;
    lastUpdate: number;
}

// Store for ticker state
const initialState: TickerState = {
    connected: false,
    ticks: new Map(),
    lastUpdate: 0
};

function createTickerStore() {
    const { subscribe, set, update } = writable<TickerState>(initialState);

    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 2000;

    function connect() {
        if (ws?.readyState === WebSocket.OPEN) {
            console.log('[Ticker] Already connected');
            return;
        }

        try {
            ws = new WebSocket(`${API_CONFIG.WS_URL}/ws/ticks`);

            ws.onopen = () => {
                console.log('[Ticker] WebSocket connected');
                reconnectAttempts = 0;
                update(state => ({ ...state, connected: true }));
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'ticks') {
                        update(state => {
                            const newTicks = new Map(state.ticks);
                            for (const tick of message.data) {
                                newTicks.set(tick.instrument_token, tick);
                            }
                            return {
                                ...state,
                                ticks: newTicks,
                                lastUpdate: Date.now()
                            };
                        });
                    } else if (message.type === 'ping') {
                        // Respond to keep-alive
                        ws?.send(JSON.stringify({ action: 'pong' }));
                    }
                } catch (e) {
                    console.error('[Ticker] Error parsing message:', e);
                }
            };

            ws.onclose = (event) => {
                console.log('[Ticker] WebSocket closed:', event.code, event.reason);
                update(state => ({ ...state, connected: false }));

                // Attempt reconnection
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    console.log(`[Ticker] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts})`);
                    setTimeout(connect, RECONNECT_DELAY);
                }
            };

            ws.onerror = (error) => {
                console.error('[Ticker] WebSocket error:', error);
            };

        } catch (e) {
            console.error('[Ticker] Failed to connect:', e);
        }
    }

    function disconnect() {
        if (ws) {
            ws.close();
            ws = null;
        }
        set(initialState);
    }

    function subscribeToTokens(tokens: number[]) {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: 'subscribe',
                tokens: tokens
            }));
            console.log('[Ticker] Subscribed to:', tokens);
        }
    }

    function unsubscribeFromTokens(tokens: number[]) {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: 'unsubscribe',
                tokens: tokens
            }));
        }
    }

    return {
        subscribe,
        connect,
        disconnect,
        subscribeToTokens,
        unsubscribeFromTokens,

        // Get tick for specific token
        getTick: (token: number): Readable<Tick | undefined> => {
            return derived({ subscribe }, $state => $state.ticks.get(token));
        }
    };
}

export const tickerStore = createTickerStore();

// Convenience store for last price of current symbol
export const lastPrice = derived(tickerStore, $ticker => {
    // Return the first tick's last price (for single instrument mode)
    const ticks = Array.from($ticker.ticks.values());
    return ticks.length > 0 ? ticks[0].last_price : null;
});
