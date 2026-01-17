/**
 * API Configuration - Centralized API endpoints
 * Uses environment variables with fallback defaults
 */

export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
    WS_URL: import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000'
} as const;
