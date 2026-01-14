from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.routes import orders, config, quote, websocket

load_dotenv()

app = FastAPI(title="HoloTrade API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router)
app.include_router(config.router)
app.include_router(quote.router)
app.include_router(websocket.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "HoloTrade Backend Running"}
