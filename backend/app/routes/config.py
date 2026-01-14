from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.kite_client import KiteClient

router = APIRouter()
kite_client = KiteClient()

class ConfigRequest(BaseModel):
    api_key: str
    api_secret: str

@router.post("/config")
async def configure_kite(config: ConfigRequest):
    """
    Configures the Kite client with provided API credentials.
    """
    if not config.api_key or not config.api_secret:
        raise HTTPException(status_code=400, detail="API Key and Secret are required")
    
    success = kite_client.configure(config.api_key, config.api_secret)
    
    if success:
        return {"status": "success", "message": "Kite client configured successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to configure Kite client")
