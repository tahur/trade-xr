"""
WebSocket routes for real-time streaming to frontend clients.
"""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from app.ticker_service import ticker_service
from app.kite_client import KiteClient

router = APIRouter()

# Store active WebSocket connections
active_connections: List[WebSocket] = []


async def broadcast_ticks(ticks):
    """Broadcast tick data to all connected WebSocket clients."""
    if not active_connections:
        return
    
    # Format ticks for frontend
    formatted_ticks = []
    for tick in ticks:
        formatted_ticks.append({
            "instrument_token": tick.get("instrument_token"),
            "symbol": tick.get("tradingsymbol", ""),
            "last_price": tick.get("last_price"),
            "change": tick.get("change", 0),
            "volume": tick.get("volume", 0),
            "ohlc": tick.get("ohlc", {}),
            "timestamp": str(tick.get("timestamp", ""))
        })
    
    message = json.dumps({"type": "ticks", "data": formatted_ticks})
    
    # Send to all connected clients
    for connection in active_connections.copy():
        try:
            await connection.send_text(message)
        except Exception:
            active_connections.remove(connection)


@router.websocket("/ws/ticks")
async def websocket_ticks(websocket: WebSocket):
    """WebSocket endpoint for real-time tick data."""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Start ticker if not already running
        if not ticker_service.is_connected:
            ticker_service.start()
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connected"
        })
        
        # Keep connection alive and handle client messages
        while True:
            try:
                # Wait for messages from client
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0  # Ping every 30 seconds
                )
                
                message = json.loads(data)
                
                if message.get("action") == "subscribe":
                    tokens = message.get("tokens", [])
                    ticker_service.subscribe(tokens)
                    await websocket.send_json({
                        "type": "subscribed",
                        "tokens": tokens
                    })
                    
                elif message.get("action") == "unsubscribe":
                    tokens = message.get("tokens", [])
                    ticker_service.unsubscribe(tokens)
                    await websocket.send_json({
                        "type": "unsubscribed",
                        "tokens": tokens
                    })
                    
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_json({"type": "ping"})
                
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        if websocket in active_connections:
            active_connections.remove(websocket)


@router.get("/ticker/status")
async def ticker_status():
    """Get ticker connection status."""
    return {
        "connected": ticker_service.is_connected,
        "subscribed_tokens": list(ticker_service.subscribed_tokens),
        "active_websockets": len(active_connections)
    }


@router.post("/ticker/start")
async def start_ticker():
    """Start the ticker service."""
    success = ticker_service.start()
    return {"success": success, "connected": ticker_service.is_connected}


@router.post("/ticker/stop")
async def stop_ticker():
    """Stop the ticker service."""
    ticker_service.stop()
    return {"success": True, "connected": False}


@router.post("/ticker/subscribe")
async def subscribe_tokens(tokens: List[int]):
    """Subscribe to instrument tokens."""
    ticker_service.subscribe(tokens)
    return {
        "success": True,
        "subscribed": list(ticker_service.subscribed_tokens)
    }
