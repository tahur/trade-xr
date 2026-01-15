from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.kite_client import KiteClient

router = APIRouter(prefix="/api/kite", tags=["kite"])
kite_client = KiteClient()

class LoginRequest(BaseModel):
    request_token: str

class OrderRequest(BaseModel):
    symbol: str
    quantity: int
    price: float
    transaction_type: str # BUY or SELL

@router.post("/login")
async def login(data: LoginRequest):
    try:
        response = kite_client.login(data.request_token)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/order")
async def place_order(order: OrderRequest):
    try:
        response = kite_client.place_order(
            symbol=order.symbol,
            quantity=order.quantity,
            price=order.price,
            transaction_type=order.transaction_type
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/positions")
async def get_positions():
    try:
        return kite_client.get_positions()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/margins")
async def get_margins():
    try:
        return kite_client.get_margins()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
