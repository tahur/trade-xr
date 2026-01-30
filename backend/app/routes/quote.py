from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.kite_client import KiteClient

router = APIRouter()

# Cache headers for short-lived market data (1 second cache)
CACHE_HEADERS = {"Cache-Control": "private, max-age=1"}

@router.get("/ltp/{symbol}")
def get_ltp(symbol: str, exchange: str = "MCX"):
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
def get_quote(symbol: str, exchange: str = "MCX"):
    """Fetches full quote for a symbol including OHLC, volume etc."""
    kite = KiteClient()
    
    if not kite.kite or not kite.access_token:
        raise HTTPException(status_code=401, detail="Kite session not active. Please login first.")
    
    try:
        instrument = f"{exchange}:{symbol}"
        data = kite.kite.quote([instrument])
        
        if instrument in data:
            quote = data[instrument]
            
            # Get OHLC data
            ohlc = quote.get("ohlc", {})
            previous_close = ohlc.get("close", 0)
            last_price = quote.get("last_price", 0)
            
            # Calculate change - prefer net_change from Kite, else calculate from LTP and previous close
            net_change = quote.get("net_change", 0)
            if net_change == 0 and previous_close > 0 and last_price > 0:
                # Calculate change from last price and previous close
                net_change = last_price - previous_close
            
            # Calculate change percent
            if previous_close > 0:
                change_percent = (net_change / previous_close) * 100
            else:
                change_percent = 0
            
            return {
                "symbol": symbol,
                "exchange": exchange,
                "ltp": last_price,
                "open": ohlc.get("open", 0),
                "high": ohlc.get("high", 0),
                "low": ohlc.get("low", 0),
                "close": previous_close,
                "change": net_change,
                "change_percent": change_percent,
                "volume": quote.get("volume", 0),
                "upper_circuit": quote.get("upper_circuit_limit", 0),
                "lower_circuit": quote.get("lower_circuit_limit", 0)
            }
        else:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/candles/{symbol}")
def get_candles(symbol: str, exchange: str = "NSE", interval: str = "5minute", days: int = 1):
    """Fetches historical OHLC candle data for a symbol."""
    from datetime import datetime, timedelta
    
    kite = KiteClient()
    
    if not kite.kite or not kite.access_token:
        raise HTTPException(status_code=401, detail="Kite session not active. Please login first.")
    
    try:
        # Get instrument token (cached)
        instrument_token = kite.get_instrument_token(symbol, exchange)
        
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

@router.get("/portfolio/holdings")
def get_holdings():
    """Fetches portfolio holdings (long-term investments)."""
    kite = KiteClient()
    
    if not kite.kite or not kite.access_token:
        raise HTTPException(status_code=401, detail="Kite session not active. Please login first.")
    
    try:
        holdings = kite.get_holdings()
        return {"status": "success", "count": len(holdings), "holdings": holdings}
    except Exception as e:
        print(f"DEBUG: get_holdings error: {e}") 
        error_msg = str(e).lower()
        if "token" in error_msg or "session" in error_msg or "auth" in error_msg or "login" in error_msg:
             raise HTTPException(status_code=401, detail="Session expired. Please login again.")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/portfolio/positions")
def get_positions():
    """Fetches current day positions."""
    kite = KiteClient()
    
    if not kite.kite or not kite.access_token:
        raise HTTPException(status_code=401, detail="Kite session not active. Please login first.")
    
    try:
        positions = kite.get_positions()
        return {"status": "success", "positions": positions}
    except Exception as e:
        error_msg = str(e).lower()
        if "token" in error_msg or "session" in error_msg or "auth" in error_msg or "login" in error_msg:
             raise HTTPException(status_code=401, detail="Session expired. Please login again.")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/portfolio/margins")
def get_margins():
    """Fetches account margins."""
    kite = KiteClient()
    
    if not kite.kite or not kite.access_token:
        raise HTTPException(status_code=401, detail="Kite session not active. Please login first.")
    
    try:
        margins = kite.get_margins()
        return {"status": "success", "margins": margins}
    except Exception as e:
        error_msg = str(e).lower()
        if "token" in error_msg or "session" in error_msg or "auth" in error_msg or "login" in error_msg:
             raise HTTPException(status_code=401, detail="Session expired. Please login again.")
        raise HTTPException(status_code=500, detail=str(e))
