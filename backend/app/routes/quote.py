from fastapi import APIRouter, HTTPException
from app.kite_client import KiteClient

router = APIRouter()

@router.get("/ltp/{symbol}")
async def get_ltp(symbol: str, exchange: str = "MCX"):
    """Fetches Last Traded Price for a symbol."""
    kite = KiteClient()
    
    if not kite.kite or not kite.access_token:
        raise HTTPException(status_code=401, detail="Kite session not active. Please login first.")
    
    try:
        instrument = f"{exchange}:{symbol}"
        data = kite.kite.ltp([instrument])
        
        if instrument in data:
            return {
                "symbol": symbol,
                "exchange": exchange,
                "ltp": data[instrument]["last_price"]
            }
        else:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quote/{symbol}")
async def get_quote(symbol: str, exchange: str = "MCX"):
    """Fetches full quote for a symbol including OHLC, volume etc."""
    kite = KiteClient()
    
    if not kite.kite or not kite.access_token:
        raise HTTPException(status_code=401, detail="Kite session not active. Please login first.")
    
    try:
        instrument = f"{exchange}:{symbol}"
        data = kite.kite.quote([instrument])
        
        if instrument in data:
            quote = data[instrument]
            return {
                "symbol": symbol,
                "exchange": exchange,
                "ltp": quote.get("last_price", 0),
                "open": quote.get("ohlc", {}).get("open", 0),
                "high": quote.get("ohlc", {}).get("high", 0),
                "low": quote.get("ohlc", {}).get("low", 0),
                "close": quote.get("ohlc", {}).get("close", 0),
                "change": quote.get("net_change", 0),
                "change_percent": quote.get("net_change", 0) / quote.get("ohlc", {}).get("close", 1) * 100 if quote.get("ohlc", {}).get("close") else 0,
                "volume": quote.get("volume", 0)
            }
        else:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/candles/{symbol}")
async def get_candles(symbol: str, exchange: str = "NSE", interval: str = "5minute", days: int = 1):
    """Fetches historical OHLC candle data for a symbol."""
    from datetime import datetime, timedelta
    
    kite = KiteClient()
    
    if not kite.kite or not kite.access_token:
        raise HTTPException(status_code=401, detail="Kite session not active. Please login first.")
    
    try:
        # Get instrument token
        instrument = f"{exchange}:{symbol}"
        ltp_data = kite.kite.ltp([instrument])
        
        if instrument not in ltp_data:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        
        instrument_token = ltp_data[instrument]["instrument_token"]
        
        # Calculate date range
        to_date = datetime.now()
        from_date = to_date - timedelta(days=days)
        
        # Fetch historical data
        data = kite.kite.historical_data(
            instrument_token=instrument_token,
            from_date=from_date,
            to_date=to_date,
            interval=interval
        )
        
        # Format candles
        candles = []
        for i, candle in enumerate(data):
            candles.append({
                "index": i,
                "date": candle["date"].isoformat() if hasattr(candle["date"], 'isoformat') else str(candle["date"]),
                "open": candle["open"],
                "high": candle["high"],
                "low": candle["low"],
                "close": candle["close"],
                "volume": candle["volume"]
            })
        
        return {
            "symbol": symbol,
            "exchange": exchange,
            "interval": interval,
            "candles": candles
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
