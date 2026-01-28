/**
 * Logger - Environment-Aware Logging Utility
 * 
 * Replaces console.log with structured, environment-aware logging.
 * In production, debug logs are suppressed.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    level: LogLevel;
    prefix: string;
    enableInProduction: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

// Determine if we're in production
const isProduction = typeof import.meta !== 'undefined'
    ? import.meta.env?.PROD ?? false
    : false;

const DEFAULT_CONFIG: LoggerConfig = {
    level: isProduction ? 'warn' : 'debug',
    prefix: '',
    enableInProduction: false
};

class Logger {
    private config: LoggerConfig;
    private minLevel: number;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.minLevel = LOG_LEVELS[this.config.level];
    }

    private shouldLog(level: LogLevel): boolean {
        if (isProduction && !this.config.enableInProduction) {
            // In production, only log warnings and errors
            return LOG_LEVELS[level] >= LOG_LEVELS.warn;
        }
        return LOG_LEVELS[level] >= this.minLevel;
    }

    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
        const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
        return `${timestamp} ${prefix}[${level.toUpperCase()}] ${message}`;
    }

    debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message), ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message), ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message), ...args);
        }
    }

    error(message: string, ...args: any[]): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message), ...args);
        }
    }

    /**
     * Create a child logger with a prefix
     */
    child(prefix: string): Logger {
        const childPrefix = this.config.prefix
            ? `${this.config.prefix}:${prefix}`
            : prefix;
        return new Logger({ ...this.config, prefix: childPrefix });
    }
}

// Export singleton instance
export const logger = new Logger();

// Export factory for module-specific loggers
export function createLogger(prefix: string): Logger {
    return logger.child(prefix);
}

// Pre-configured loggers for common modules
export const orderLogger = createLogger('Order');
export const tickerLogger = createLogger('Ticker');
export const gestureLogger = createLogger('Gesture');
export const etfLogger = createLogger('ETF');
export const positionsLogger = createLogger('Positions');
