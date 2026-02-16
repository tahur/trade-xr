/**
 * ETF Configuration - Fixed list of supported trading scripts.
 */
export interface ETFConfig {
    symbol: string;
    name: string;
    shortName: string;
    exchange: string;
    icon: string;
    accentColor: string;
}

export const SUPPORTED_ETFS: ETFConfig[] = [
    { symbol: "SILVERCASE", name: "Silver ETF", shortName: "SILVER", exchange: "NSE", icon: "◈", accentColor: "#94A3B8" },
    { symbol: "GOLDCASE", name: "Gold ETF", shortName: "GOLD", exchange: "NSE", icon: "◆", accentColor: "#F59E0B" },
    { symbol: "NIFTYCASE", name: "Nifty 50 ETF", shortName: "NIFTY", exchange: "NSE", icon: "▲", accentColor: "#8B5CF6" },
    { symbol: "TOP100CASE", name: "Top 100 ETF", shortName: "TOP100", exchange: "NSE", icon: "●", accentColor: "#06B6D4" },
    { symbol: "MID150CASE", name: "Midcap 150 ETF", shortName: "MID150", exchange: "NSE", icon: "◉", accentColor: "#10B981" }
];

// Default ETF to show on load
export const DEFAULT_ETF = SUPPORTED_ETFS[0];

// Get ETF by symbol
export function getETFBySymbol(symbol: string): ETFConfig | undefined {
    return SUPPORTED_ETFS.find(etf => etf.symbol === symbol);
}
