/**
 * Selected ETF Store - Tracks which ETF is currently selected
 */
import { writable } from 'svelte/store';
import { DEFAULT_ETF, type ETFConfig } from '../config/etfs';

// Create writable store with default ETF
export const selectedETFStore = writable<ETFConfig>(DEFAULT_ETF);
