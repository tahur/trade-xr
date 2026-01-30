"""
TradeXR Backend - FastAPI Application Entry Point

This module initializes the FastAPI application with:
- CORS middleware for frontend communication
- API routers for different feature domains (orders, quotes, config, etc.)
- Environment variable configuration via python-dotenv

The backend serves as a bridge between the TradeXR frontend and the 
Zerodha Kite Connect API, handling authentication, order placement,
and real-time market data streaming.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.routes import orders, config, quote, websocket, vault

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI application
app = FastAPI(
    title="TradeXR API",
    description="Gesture-controlled trading interface for Zerodha Kite",
    version="0.1.0"
)

# Configure CORS to allow frontend origins
# In production, replace with specific allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(orders.router)   # Kite order management
app.include_router(config.router)   # API configuration
app.include_router(quote.router)    # Market data quotes
app.include_router(websocket.router) # Real-time tick streaming
app.include_router(vault.router)    # Encrypted credential storage


@app.get("/")
def read_root():
    """Health check endpoint - returns server status."""
    return {"status": "ok", "message": "TradeXR Backend Running"}
