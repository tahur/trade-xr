"""API endpoints for encrypted credential vault"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.security.vault import CredentialVault

router = APIRouter(prefix="/api/vault", tags=["vault"])


class SaveRequest(BaseModel):
    api_key: str
    api_secret: str
    password: str


class LoadRequest(BaseModel):
    password: str


@router.get("/exists")
async def vault_exists():
    """Check if vault file exists"""
    return {"exists": CredentialVault.exists()}


@router.post("/save")
async def save_credentials(req: SaveRequest):
    """Save encrypted credentials to vault"""
    
    # Validate API key format
    if len(req.api_key) != 32 or not req.api_key.isalnum():
        raise HTTPException(400, "Invalid API key format (must be 32 alphanumeric characters)")
    
    # Validate password strength
    if len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    
    # Validate API secret not empty
    if not req.api_secret or len(req.api_secret) < 10:
        raise HTTPException(400, "Invalid API secret")
    
    try:
        CredentialVault.save(req.api_key, req.api_secret, req.password)
        return {"status": "saved", "message": "Credentials encrypted and saved securely"}
    except Exception as e:
        raise HTTPException(500, f"Failed to save credentials: {str(e)}")


@router.post("/load")
async def load_credentials(req: LoadRequest):
    """Load and decrypt credentials from vault"""
    
    try:
        creds = CredentialVault.load(req.password)
        return creds
    except FileNotFoundError:
        raise HTTPException(404, "No vault found. Please save credentials first.")
    except Exception as e:
        # Invalid password or corrupted vault
        raise HTTPException(401, "Invalid password or corrupted vault")


@router.delete("/reset")
async def reset_vault(req: LoadRequest):
    """Delete vault file (requires password verification first)"""
    
    try:
        # Verify password before deleting
        CredentialVault.load(req.password)
        CredentialVault.delete()
        return {"status": "deleted", "message": "Vault reset successfully"}
    except FileNotFoundError:
        raise HTTPException(404, "No vault found")
    except Exception:
        raise HTTPException(401, "Invalid password")
