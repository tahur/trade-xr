"""
WebSocket ticker service for real-time market data streaming.
Uses Kite Connect's KiteTicker for live price updates.
"""
import asyncio
import json
import logging
from typing import Callable, Set
from kiteconnect import KiteTicker
from app.kite_client import KiteClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TickerService:
    """Manages WebSocket connections for real-time tick data."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.kws = None
        self.subscribed_tokens: Set[int] = set()
        self.callbacks: list[Callable] = []
        self.last_ticks: dict = {}
        self.is_connected = False
        self._initialized = True
    
    def initialize(self):
        """Initialize the KiteTicker with current credentials."""
        kite = KiteClient()
        
        if not kite.api_key or not kite.access_token:
            logger.warning("Cannot initialize ticker: No API key or access token")
            return False
        
        try:
            self.kws = KiteTicker(kite.api_key, kite.access_token)
            
            # Assign callbacks
            self.kws.on_ticks = self._on_ticks
            self.kws.on_connect = self._on_connect
            self.kws.on_close = self._on_close
            self.kws.on_error = self._on_error
            self.kws.on_reconnect = self._on_reconnect
            
            logger.info("KiteTicker initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize KiteTicker: {e}")
            return False
    
    def _on_ticks(self, ws, ticks):
        """Callback when ticks are received."""
        for tick in ticks:
            token = tick.get('instrument_token')
            self.last_ticks[token] = tick
            logger.debug(f"Tick: {tick.get('tradingsymbol', token)} = {tick.get('last_price')}")
        
        # Notify all registered callbacks
        for callback in self.callbacks:
            try:
                callback(ticks)
            except Exception as e:
                logger.error(f"Error in tick callback: {e}")
    
    def _on_connect(self, ws, response):
        """Callback on successful connection."""
        logger.info(f"WebSocket connected: {response}")
        self.is_connected = True
        
        # Re-subscribe to previously subscribed tokens
        if self.subscribed_tokens:
            ws.subscribe(list(self.subscribed_tokens))
            ws.set_mode(ws.MODE_FULL, list(self.subscribed_tokens))
    
    def _on_close(self, ws, code, reason):
        """Callback when connection is closed."""
        logger.info(f"WebSocket closed: {code} - {reason}")
        self.is_connected = False
    
    def _on_error(self, ws, code, reason):
        """Callback on connection error."""
        logger.error(f"WebSocket error: {code} - {reason}")
    
    def _on_reconnect(self, ws, attempts_count):
        """Callback on reconnection attempt."""
        logger.info(f"Reconnecting... attempt {attempts_count}")
    
    def subscribe(self, instrument_tokens: list[int]):
        """Subscribe to instrument tokens for tick data."""
        self.subscribed_tokens.update(instrument_tokens)
        
        if self.kws and self.is_connected:
            self.kws.subscribe(instrument_tokens)
            self.kws.set_mode(self.kws.MODE_FULL, instrument_tokens)
            logger.info(f"Subscribed to tokens: {instrument_tokens}")
    
    def unsubscribe(self, instrument_tokens: list[int]):
        """Unsubscribe from instrument tokens."""
        self.subscribed_tokens.difference_update(instrument_tokens)
        
        if self.kws and self.is_connected:
            self.kws.unsubscribe(instrument_tokens)
            logger.info(f"Unsubscribed from tokens: {instrument_tokens}")
    
    def add_callback(self, callback: Callable):
        """Register a callback for tick updates."""
        self.callbacks.append(callback)
    
    def remove_callback(self, callback: Callable):
        """Remove a callback."""
        if callback in self.callbacks:
            self.callbacks.remove(callback)
    
    def get_last_tick(self, instrument_token: int):
        """Get the last received tick for an instrument."""
        return self.last_ticks.get(instrument_token)
    
    def start(self):
        """Start the ticker in a background thread."""
        if not self.kws:
            if not self.initialize():
                return False
        
        try:
            # Run in threaded mode so it doesn't block
            self.kws.connect(threaded=True)
            logger.info("KiteTicker started in threaded mode")
            return True
        except Exception as e:
            logger.error(f"Failed to start ticker: {e}")
            return False
    
    def stop(self):
        """Stop the ticker."""
        if self.kws:
            self.kws.stop()
            self.is_connected = False
            logger.info("KiteTicker stopped")


# Singleton instance
ticker_service = TickerService()
