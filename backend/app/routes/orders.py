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
def login(data: LoginRequest):
    try:
        response = kite_client.login(data.request_token)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/order")
def place_order(order: OrderRequest):
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
def get_positions():
    try:
        return kite_client.get_positions()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/margins")
def get_margins():
    try:
        return kite_client.get_margins()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/order/{order_id}")
def get_order_status(order_id: str):
    """Get order status by order_id"""
    try:
        return kite_client.get_order_status(order_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/orders")
def get_orders():
    """Get all orders for the day"""
    try:
        return kite_client.get_orders()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

