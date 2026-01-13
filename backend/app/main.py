from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.routes import orders

load_dotenv()

app = FastAPI(title="HoloTrade API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"], # Added typical svelte ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "HoloTrade Backend Running"}
