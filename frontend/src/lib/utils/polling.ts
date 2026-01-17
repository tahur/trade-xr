/**
 * Reusable polling utility for data updates
 * Eliminates duplicate polling logic across stores
 */

export interface PollingOptions<T> {
    fetchFn: () => Promise<T>;
    onUpdate: (data: T) => void;
    onError?: (error: Error) => void;
    intervalMs?: number;
    immediate?: boolean;
}

export interface PollingController {
    start(): void;
    stop(): void;
    isActive(): boolean;
}

/**
 * Creates a polling controller that repeatedly calls a fetch function
 * and invokes a callback with the results.
 * 
 * @example
 * ```typescript
 * const poller = createPoller({
 *   fetchFn: () => kite.getPositions(),
 *   onUpdate: (positions) => console.log('Got positions:', positions),
 *   intervalMs: 5000
 * });
 * 
 * poller.start();  // Starts polling
 * poller.stop();   // Stops polling
 * ```
 */
export function createPoller<T>(options: PollingOptions<T>): PollingController {
    const {
        fetchFn,
        onUpdate,
        onError,
        intervalMs = 5000,
        immediate = true
    } = options;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    async function poll() {
        try {
            const data = await fetchFn();
            onUpdate(data);
        } catch (error) {
            if (onError) {
                onError(error as Error);
            } else {
                console.error('[Poller] Error during poll:', error);
            }
        }
    }

    function start() {
        // Stop any existing interval
        stop();

        // Fetch immediately if configured
        if (immediate) {
            poll();
        }

        // Start polling interval
        pollInterval = setInterval(poll, intervalMs);
    }

    function stop() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    function isActive(): boolean {
        return pollInterval !== null;
    }

    return {
        start,
        stop,
        isActive
    };
}
