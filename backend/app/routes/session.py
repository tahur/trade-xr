"""API endpoints for session management"""
from fastapi import APIRouter, HTTPException
from app.kite_client import KiteClient
from app.security.vault import CredentialVault

router = APIRouter(prefix="/api/session", tags=["session"])

kite_client = KiteClient()


@router.get("/status")
async def session_status():
    """Check if there's an active trading session."""
    return {
        "active": kite_client.is_session_active(),
        "has_saved_session": CredentialVault.session_exists(),
        "has_credentials": CredentialVault.exists()
    }


@router.post("/restore")
async def restore_session():
    """Attempt to restore session from vault."""
    if kite_client.is_session_active():
        return {"status": "already_active", "message": "Session is already active"}
    
    success = kite_client.restore_session_from_vault()
    if success:
        return {"status": "restored", "message": "Session restored from vault"}
    else:
        return {"status": "failed", "message": "No valid session to restore. Please login again."}


@router.delete("/logout")
async def logout():
    """Clear current session and remove persisted token."""
    result = kite_client.logout()
    return result
