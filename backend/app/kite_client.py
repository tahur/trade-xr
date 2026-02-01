import os
from kiteconnect import KiteConnect
import logging
from dotenv import load_dotenv
from app.security.vault import CredentialVault

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KiteClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(KiteClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.api_key = os.getenv("KITE_API_KEY")
        self.api_secret = os.getenv("KITE_API_SECRET")
        self.access_token = None
        self.kite = None
        self._token_cache = {}  # Cache for instrument tokens

        if not self.api_key or not self.api_secret:
            logger.warning("Kite API credentials not found in environment variables.")
        else:
            try:
                self.kite = KiteConnect(api_key=self.api_key)
                logger.info("KiteConnect initialized.")
                
                # Try to restore session from vault (auto-restore)
                self._try_restore_session()
            except Exception as e:
                logger.error(f"Failed to initialize KiteConnect: {e}")
    
    def _try_restore_session(self):
        """Attempt to restore session from vault on startup."""
        if not self.kite:
            return
        
        try:
            saved_token = CredentialVault.load_session()
            if saved_token:
                self.access_token = saved_token
                self.kite.set_access_token(self.access_token)
                
                # Validate token by making a lightweight API call
                if self._validate_token():
                    logger.info("Session restored and validated from vault.")
                else:
                    logger.warning("Stored session token is expired. Please re-login.")
                    self._clear_invalid_session()
        except Exception as e:
            logger.warning(f"Could not restore session: {e}")
    
    def _validate_token(self) -> bool:
        """Validate the current access token by making a test API call."""
        if not self.kite or not self.access_token:
            return False
        
        try:
            # Use profile() as a lightweight validation call
            self.kite.profile()
            return True
        except Exception as e:
            error_msg = str(e).lower()
            if "token" in error_msg or "access" in error_msg or "invalid" in error_msg:
                return False
            # Other errors (network, etc.) - assume token is okay
            logger.warning(f"Token validation check failed with non-token error: {e}")
            return True
    
    def _clear_invalid_session(self):
        """Clear an invalid/expired session token."""
        self.access_token = None
        try:
            CredentialVault.delete_session()
            logger.info("Cleared expired session from vault.")
        except Exception as e:
            logger.warning(f"Could not clear session file: {e}")

    def configure(self, api_key, api_secret):
        """Re-configures the client with new credentials."""
        self.api_key = api_key
        self.api_secret = api_secret
        self._token_cache = {} # Clear cache on re-config
        self.access_token = None # Clear old session
        logger.info("Re-configuring KiteClient with provided credentials.")
        
        try:
            self.kite = KiteConnect(api_key=self.api_key)
            logger.info("KiteConnect re-initialized.")
            return True
        except Exception as e:
            logger.error(f"Failed to re-initialize KiteConnect: {e}")
            return False

    def login(self, request_token):
        """Exchanges request_token for access_token."""
        if not self.kite:
            raise Exception("Kite client not initialized")
        
        try:
            data = self.kite.generate_session(request_token, api_secret=self.api_secret)
            self.access_token = data["access_token"]
            self.kite.set_access_token(self.access_token)
            
            # Persist session token to vault for auto-restore
            try:
                CredentialVault.save_session(self.access_token)
                logger.info("Session token saved to vault.")
            except Exception as ve:
                logger.warning(f"Could not save session to vault: {ve}")
            
            logger.info("Kite session established successfully.")
            return {"status": "success", "data": data}
        except Exception as e:
            logger.error(f"Error logging in to Kite: {e}")
            raise e
    
    def logout(self):
        """Clears session and removes persisted token."""
        self.access_token = None
        if self.kite:
            try:
                self.kite.invalidate_access_token(self.access_token)
            except:
                pass  # Token might already be invalid
        
        # Clear persisted session
        try:
            CredentialVault.delete_session()
            logger.info("Session cleared from vault.")
        except Exception as e:
            logger.warning(f"Could not clear session from vault: {e}")
        
        return {"status": "logged_out"}
    
    def is_session_active(self):
        """Check if there's an active session."""
        return self.access_token is not None and self.kite is not None
    
    def restore_session_from_vault(self):
        """Manually restore session from vault (for reconfigure scenarios)."""
        if not self.kite:
            return False
        
        try:
            saved_token = CredentialVault.load_session()
            if saved_token:
                self.access_token = saved_token
                self.kite.set_access_token(self.access_token)
                
                # Validate the restored token
                if self._validate_token():
                    logger.info("Session manually restored and validated from vault.")
                    return True
                else:
                    logger.warning("Stored session token is expired during manual restore.")
                    self._clear_invalid_session()
                    return False
        except Exception as e:
            logger.warning(f"Could not restore session: {e}")
        return False

    def get_instrument_token(self, symbol, exchange="NSE"):
        """Fetches and caches instrument token for a symbol."""
        if not self.kite:
            raise Exception("Kite client not initialized")
            
        instrument = f"{exchange}:{symbol}"
        
        # Check cache first
        if instrument in self._token_cache:
            return self._token_cache[instrument]
            
        try:
            # Fetch from LTP API (lightweight)
            ltp_data = self.kite.ltp([instrument])
            
            if instrument in ltp_data:
                token = ltp_data[instrument]["instrument_token"]
                self._token_cache[instrument] = token
                return token
            else:
                raise Exception(f"Symbol {symbol} not found")
                
        except Exception as e:
            logger.error(f"Error fetching token for {symbol}: {e}")
            raise e

    def place_order(self, symbol, quantity, price, transaction_type, exchange="NSE"):
        """Places an order."""
        if not self.kite or not self.access_token:
            raise Exception("Kite session not active. Please login first.")

        try:
            # Determine transaction type
            trans_type = self.kite.TRANSACTION_TYPE_BUY if transaction_type.upper() == "BUY" else self.kite.TRANSACTION_TYPE_SELL
            
            # Round price to tick size (0.01 for most instruments)
            rounded_price = round(price, 2)
            
            # Simple Limit Order Logic for now
            order_id = self.kite.place_order(
                variety=self.kite.VARIETY_REGULAR,
                exchange=exchange,
                tradingsymbol=symbol,
                transaction_type=trans_type,
                quantity=quantity,
                product=self.kite.PRODUCT_CNC,  # CNC for delivery/cash & carry
                order_type=self.kite.ORDER_TYPE_LIMIT,
                price=rounded_price,
                validity=self.kite.VALIDITY_DAY
            )
            
            logger.info(f"Order placed successfully. ID: {order_id}")
            return {"status": "success", "order_id": order_id}

        except Exception as e:
            logger.error(f"Error placing order: {e}")
            raise e

    def get_orders(self):
        """Fetches all orders for the day."""
        if not self.kite or not self.access_token:
            raise Exception("Kite session not active")
        
        try:
            orders = self.kite.orders()
            return orders if orders else []
        except Exception as e:
            logger.error(f"Error fetching orders: {e}")
            raise e

    def get_positions(self):
        """Fetches current positions."""
        if not self.kite or not self.access_token:
             raise Exception("Kite session not active")
        
        try:
            return self.kite.positions()
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            raise e

    def get_holdings(self):
        """Fetches portfolio holdings (long-term investments)."""
        if not self.kite or not self.access_token:
            raise Exception("Kite session not active")
        
        try:
            return self.kite.holdings()
        except Exception as e:
            logger.error(f"Error fetching holdings: {e}")
            raise e

    def get_margins(self):
        """Fetches available margins."""
        if not self.kite or not self.access_token:
            raise Exception("Kite session not active")
        
        try:
            margins = self.kite.margins()
            # Extract equity segment available margin
            equity = margins.get("equity", {})
            available = equity.get("available", {})
            return {
                "available_cash": available.get("cash", 0),
                "available_margin": available.get("live_balance", 0),
                "used_margin": equity.get("utilised", {}).get("debits", 0),
                "total": equity.get("net", 0)
            }
        except Exception as e:
            logger.error(f"Error fetching margins: {e}")
            raise e

    def get_order_status(self, order_id):
        """Fetches order status and history."""
        if not self.kite or not self.access_token:
            raise Exception("Kite session not active")
        
        try:
            # Get order history - returns list of status changes
            history = self.kite.order_history(order_id)
            
            if history and len(history) > 0:
                # Get the latest status (last entry)
                latest = history[-1]
                return {
                    "order_id": order_id,
                    "status": latest.get("status", "UNKNOWN"),
                    "status_message": latest.get("status_message", ""),
                    "filled_quantity": latest.get("filled_quantity", 0),
                    "pending_quantity": latest.get("pending_quantity", 0),
                    "average_price": latest.get("average_price", 0)
                }
            else:
                return {"order_id": order_id, "status": "UNKNOWN", "status_message": "No history found"}
                
        except Exception as e:
            logger.error(f"Error fetching order status: {e}")
            raise e
