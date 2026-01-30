/**
 * TabGuard - Tab Visibility Safety Guardrail
 * 
 * Prevents trading operations when browser tab is not active.
 * Critical for preventing accidental trades from background gesture detection.
 */
import { writable, derived, get } from 'svelte/store';

// Store for tab visibility state
const _tabVisible = writable(true);

// Derived readable store
export const tabVisible = { subscribe: _tabVisible.subscribe };

// Helper function for imperative checks
export function isTabActive(): boolean {
    return get(_tabVisible);
}

// Initialize on browser
if (typeof document !== 'undefined') {
    // Set initial state
    _tabVisible.set(document.visibilityState === 'visible');

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
        const visible = document.visibilityState === 'visible';
        _tabVisible.set(visible);

        if (!visible) {
            console.warn('[TabGuard] Tab hidden - trading operations paused');
        }
    });
}

/**
 * Guard function for trading operations
 * @throws Error if tab is not active
 */
export function requireActiveTab(operation: string = 'Trading operation'): void {
    if (!isTabActive()) {
        throw new Error(`${operation} blocked: Browser tab is not active. Please return to the TradeXR tab.`);
    }
}
