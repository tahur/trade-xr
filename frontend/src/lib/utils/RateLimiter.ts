/**
 * RateLimiter - Token Bucket Rate Limiting
 * 
 * Prevents rapid-fire orders from gesture spam or accidental triggers.
 * Uses token bucket algorithm for smooth rate limiting.
 */

export interface RateLimiterConfig {
    maxTokens: number;       // Maximum tokens in bucket
    refillRate: number;      // Tokens added per second
    refillInterval: number;  // How often to add tokens (ms)
}

const DEFAULT_CONFIG: RateLimiterConfig = {
    maxTokens: 3,            // Allow 3 rapid actions
    refillRate: 1,           // Add 1 token per refill
    refillInterval: 5000     // Refill every 5 seconds
};

class RateLimiter {
    private tokens: number;
    private maxTokens: number;
    private refillRate: number;
    private lastRefill: number;
    private refillInterval: number;

    constructor(config: Partial<RateLimiterConfig> = {}) {
        const cfg = { ...DEFAULT_CONFIG, ...config };
        this.tokens = cfg.maxTokens;
        this.maxTokens = cfg.maxTokens;
        this.refillRate = cfg.refillRate;
        this.refillInterval = cfg.refillInterval;
        this.lastRefill = Date.now();
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refill(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const refills = Math.floor(elapsed / this.refillInterval);

        if (refills > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + refills * this.refillRate);
            this.lastRefill = now;
        }
    }

    /**
     * Try to consume a token
     * @returns true if action allowed, false if rate limited
     */
    tryConsume(): boolean {
        this.refill();

        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }

        return false;
    }

    /**
     * Check if action would be allowed (without consuming)
     */
    canConsume(): boolean {
        this.refill();
        return this.tokens > 0;
    }

    /**
     * Get remaining tokens
     */
    getTokens(): number {
        this.refill();
        return this.tokens;
    }

    /**
     * Get time until next token (ms)
     */
    getWaitTime(): number {
        if (this.tokens > 0) return 0;
        const elapsed = Date.now() - this.lastRefill;
        return Math.max(0, this.refillInterval - elapsed);
    }

    /**
     * Reset limiter (e.g., after successful login)
     */
    reset(): void {
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
    }
}

// Singleton for order rate limiting (3 orders per 5 seconds)
export const orderRateLimiter = new RateLimiter({
    maxTokens: 3,
    refillRate: 1,
    refillInterval: 5000
});

/**
 * Check if order can be placed, throws if rate limited
 */
export function requireOrderAllowed(): void {
    if (!orderRateLimiter.tryConsume()) {
        const waitTime = Math.ceil(orderRateLimiter.getWaitTime() / 1000);
        throw new Error(`Rate limited: Please wait ${waitTime}s before placing another order`);
    }
}

export { RateLimiter };
