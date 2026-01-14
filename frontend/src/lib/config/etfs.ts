/**
 * ETF Configuration - Fixed list of supported trading scripts.
 */
export interface ETFConfig {
    symbol: string;
    name: string;
    exchange: string;
}

export const SUPPORTED_ETFS: ETFConfig[] = [
    { symbol: "SILVERCASE", name: "Silver ETF", exchange: "NSE" },
    { symbol: "GOLDCASE", name: "Gold ETF", exchange: "NSE" },
    { symbol: "NIFTYCASE", name: "Nifty 50 ETF", exchange: "NSE" },
    { symbol: "TOP100CASE", name: "Top 100 ETF", exchange: "NSE" },
    { symbol: "MID150CASE", name: "Midcap 150 ETF", exchange: "NSE" }
];

// Default ETF to show on load
export const DEFAULT_ETF = SUPPORTED_ETFS[0];

// Get ETF by symbol
export function getETFBySymbol(symbol: string): ETFConfig | undefined {
    return SUPPORTED_ETFS.find(etf => etf.symbol === symbol);
}
