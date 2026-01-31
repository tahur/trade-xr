"""
TradeXR Credential Vault - Encrypted Storage for API Keys

This module provides secure, password-protected storage for Zerodha Kite API 
credentials using the BYOK (Bring Your Own Key) model:

- Uses PBKDF2 key derivation (100,000 iterations) from user password
- Encrypts credentials with Fernet (AES-128-CBC + HMAC)
- Stores encrypted data in .vault file with restricted permissions (0600)

Session Token Storage:
- Access tokens are encrypted with a machine-derived key (no password needed)
- Allows auto-restore of session on app restart
- Token file stored separately from credentials (.session file)

Security Notes:
- Salt is application-specific to prevent rainbow table attacks
- User password never stored - only derived key used for encryption
- Vault file should be added to .gitignore
"""
from cryptography.fernet import Fernet
import base64
import hashlib
import json
import uuid
import platform
from pathlib import Path
from typing import Optional, Dict


class CredentialVault:
    """Encrypt and decrypt API credentials with user password."""
    
    VAULT_FILE = ".vault"
    SESSION_FILE = ".session"
    # Application-specific salt for key derivation
    # Note: Changing this will invalidate existing vault files
    SALT = b'tradexr_v1_salt_2026'
    
    @staticmethod
    def _derive_key(password: str) -> bytes:
        """Derive encryption key from password using PBKDF2"""
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode(),
            CredentialVault.SALT,
            100000  # iterations
        )
        return base64.urlsafe_b64encode(key)
    
    @staticmethod
    def _get_machine_key() -> bytes:
        """Derive encryption key from machine-specific identifiers.
        
        Uses a combination of:
        - Platform info (OS, machine type)
        - Node/MAC address (uuid.getnode())
        
        This provides "good enough" security for local-only use:
        - Token is encrypted at rest
        - Can only be decrypted on the same machine
        - No password required for convenience
        """
        machine_id = f"{platform.node()}:{platform.system()}:{uuid.getnode()}"
        key = hashlib.pbkdf2_hmac(
            'sha256',
            machine_id.encode(),
            CredentialVault.SALT,
            50000  # Fewer iterations since this runs on every startup
        )
        return base64.urlsafe_b64encode(key)
    
    @staticmethod
    def save(api_key: str, api_secret: str, password: str) -> None:
        """Encrypt and save credentials to vault file"""
        key = CredentialVault._derive_key(password)
        cipher = Fernet(key)
        
        data = json.dumps({
            "api_key": api_key,
            "api_secret": api_secret
        })
        
        encrypted = cipher.encrypt(data.encode())
        
        vault_path = Path(__file__).parent.parent.parent / CredentialVault.VAULT_FILE
        vault_path.write_bytes(encrypted)
        
        # Set restrictive permissions (owner read-write only)
        vault_path.chmod(0o600)
    
    @staticmethod
    def load(password: str) -> Dict[str, str]:
        """Decrypt and load credentials from vault file"""
        vault_path = Path(__file__).parent.parent.parent / CredentialVault.VAULT_FILE
        
        if not vault_path.exists():
            raise FileNotFoundError("Vault file not found. Please set up credentials first.")
        
        key = CredentialVault._derive_key(password)
        cipher = Fernet(key)
        
        encrypted = vault_path.read_bytes()
        decrypted = cipher.decrypt(encrypted)
        
        return json.loads(decrypted)
    
    @staticmethod
    def exists() -> bool:
        """Check if vault file exists"""
        vault_path = Path(__file__).parent.parent.parent / CredentialVault.VAULT_FILE
        return vault_path.exists()
    
    @staticmethod
    def delete() -> None:
        """Delete vault file (for reset)"""
        vault_path = Path(__file__).parent.parent.parent / CredentialVault.VAULT_FILE
        if vault_path.exists():
            vault_path.unlink()
    
    # ========== SESSION TOKEN STORAGE (Auto-restore) ==========
    
    @staticmethod
    def save_session(access_token: str) -> None:
        """Save access token encrypted with machine-derived key.
        
        This allows auto-restore on app restart without password prompt.
        The token is encrypted with a key derived from machine identifiers.
        """
        key = CredentialVault._get_machine_key()
        cipher = Fernet(key)
        
        data = json.dumps({
            "access_token": access_token
        })
        
        encrypted = cipher.encrypt(data.encode())
        
        session_path = Path(__file__).parent.parent.parent / CredentialVault.SESSION_FILE
        session_path.write_bytes(encrypted)
        session_path.chmod(0o600)
    
    @staticmethod
    def load_session() -> Optional[str]:
        """Load and decrypt access token from session file.
        
        Returns None if no session file exists or decryption fails.
        """
        session_path = Path(__file__).parent.parent.parent / CredentialVault.SESSION_FILE
        
        if not session_path.exists():
            return None
        
        try:
            key = CredentialVault._get_machine_key()
            cipher = Fernet(key)
            
            encrypted = session_path.read_bytes()
            decrypted = cipher.decrypt(encrypted)
            data = json.loads(decrypted)
            
            return data.get("access_token")
        except Exception:
            # Decryption failed (wrong machine, corrupted file, etc.)
            return None
    
    @staticmethod
    def session_exists() -> bool:
        """Check if session file exists"""
        session_path = Path(__file__).parent.parent.parent / CredentialVault.SESSION_FILE
        return session_path.exists()
    
    @staticmethod
    def delete_session() -> None:
        """Delete session file (for logout)"""
        session_path = Path(__file__).parent.parent.parent / CredentialVault.SESSION_FILE
        if session_path.exists():
            session_path.unlink()


# Convenience functions
def save_credentials(api_key: str, api_secret: str, password: str) -> None:
    """Save encrypted credentials"""
    CredentialVault.save(api_key, api_secret, password)


def load_credentials(password: str) -> Dict[str, str]:
    """Load decrypted credentials"""
    return CredentialVault.load(password)


def vault_exists() -> bool:
    """Check if credentials are stored"""
    return CredentialVault.exists()

