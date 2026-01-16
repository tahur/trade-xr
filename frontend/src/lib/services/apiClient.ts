/**
 * Unified API Client - Single source of truth for all HTTP requests
 * Centralizes error handling, logging, and configuration
 */

const API_BASE = 'http://127.0.0.1:8000';

interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    status: number;
}

/**
 * Unified API client with consistent error handling
 */
export const api = {
    /**
     * GET request
     */
    async get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
        try {
            const url = new URL(`${API_BASE}${path}`);
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    url.searchParams.append(key, value);
                });
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    data: null,
                    error: errorData.detail || `HTTP ${response.status}`,
                    status: response.status
                };
            }

            const data = await response.json();
            return { data, error: null, status: response.status };

        } catch (e) {
            console.error(`[API] GET ${path} failed:`, e);
            return {
                data: null,
                error: e instanceof Error ? e.message : 'Network error',
                status: 0
            };
        }
    },

    /**
     * POST request
     */
    async post<T>(path: string, body: any): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${API_BASE}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    data: null,
                    error: errorData.detail || `HTTP ${response.status}`,
                    status: response.status
                };
            }

            const data = await response.json();
            return { data, error: null, status: response.status };

        } catch (e) {
            console.error(`[API] POST ${path} failed:`, e);
            return {
                data: null,
                error: e instanceof Error ? e.message : 'Network error',
                status: 0
            };
        }
    },

    /**
     * Raw GET for backward compatibility
     */
    async rawGet<T>(path: string): Promise<T> {
        const { data, error } = await this.get<T>(path);
        if (error) throw new Error(error);
        return data as T;
    },

    /**
     * Raw POST for backward compatibility
     */
    async rawPost<T>(path: string, body: any): Promise<T> {
        const { data, error } = await this.post<T>(path, body);
        if (error) throw new Error(error);
        return data as T;
    }
};

// Export base URL for reference
export { API_BASE };
