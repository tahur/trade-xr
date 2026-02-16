"""API endpoints for encrypted credential vault"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.security.vault import CredentialVault
from app.kite_client import KiteClient

router = APIRouter(prefix="/api/vault", tags=["vault"])

kite_client = KiteClient()


class SaveRequest(BaseModel):
    api_key: str
    api_secret: str


@router.get("/status")
async def vault_status():
    """Check vault status and return preview info for UI display."""
    exists = CredentialVault.exists()
    api_key_preview = ""

    if exists:
        try:
            creds = CredentialVault.load()
            api_key_preview = creds["api_key"][-4:]
        except Exception:
            pass

    return {"exists": exists, "api_key_preview": api_key_preview}


@router.post("/save")
async def save_credentials(req: SaveRequest):
    """Save encrypted credentials to vault and configure backend."""

    # Validate API key format
    if not req.api_key.isalnum() or len(req.api_key) < 6 or len(req.api_key) > 64:
        raise HTTPException(400, "Invalid API key format (must be 6-64 alphanumeric characters)")

    # Validate API secret not empty
    if not req.api_secret or len(req.api_secret) < 10:
        raise HTTPException(400, "Invalid API secret")

    try:
        CredentialVault.save(req.api_key, req.api_secret)

        # Auto-configure the backend so it's immediately ready
        kite_client.configure(req.api_key, req.api_secret)

        return {"status": "saved", "message": "Credentials encrypted and saved securely"}
    except Exception as e:
        raise HTTPException(500, f"Failed to save credentials: {str(e)}")


@router.delete("/reset")
async def reset_vault():
    """Delete vault file (no password verification needed)."""
    if not CredentialVault.exists():
        raise HTTPException(404, "No vault found")

    CredentialVault.delete()
    return {"status": "deleted", "message": "Vault reset successfully"}
