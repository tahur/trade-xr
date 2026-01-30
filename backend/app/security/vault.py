"""
TradeXR Credential Vault - Encrypted Storage for API Keys

This module provides secure, password-protected storage for Zerodha Kite API 
credentials using the BYOK (Bring Your Own Key) model:

- Uses PBKDF2 key derivation (100,000 iterations) from user password
- Encrypts credentials with Fernet (AES-128-CBC + HMAC)
- Stores encrypted data in .vault file with restricted permissions (0600)

Security Notes:
- Salt is application-specific to prevent rainbow table attacks
- User password never stored - only derived key used for encryption
- Vault file should be added to .gitignore
"""
from cryptography.fernet import Fernet
import base64
import hashlib
import json
from pathlib import Path
from typing import Optional, Dict


class CredentialVault:
    """Encrypt and decrypt API credentials with user password."""
    
    VAULT_FILE = ".vault"
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
