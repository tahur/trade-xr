import os
from kiteconnect import KiteConnect
import logging
from dotenv import load_dotenv

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

        if not self.api_key or not self.api_secret:
            logger.warning("Kite API credentials not found in environment variables.")
        else:
            try:
                self.kite = KiteConnect(api_key=self.api_key)
                logger.info("KiteConnect initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize KiteConnect: {e}")

    def configure(self, api_key, api_secret):
        """Re-configures the client with new credentials."""
        self.api_key = api_key
        self.api_secret = api_secret
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
            logger.info("Kite session established successfully.")
            return {"status": "success", "data": data}
        except Exception as e:
            logger.error(f"Error logging in to Kite: {e}")
            raise e

    def place_order(self, symbol, quantity, price, transaction_type, exchange="NSE"):
        """Places an order."""
        if not self.kite or not self.access_token:
            raise Exception("Kite session not active. Please login first.")

        try:
            # Determine transaction type
            trans_type = self.kite.TRANSACTION_TYPE_BUY if transaction_type.upper() == "BUY" else self.kite.TRANSACTION_TYPE_SELL
            
            # Simple Limit Order Logic for now
            order_id = self.kite.place_order(
                variety=self.kite.VARIETY_REGULAR,
                exchange=exchange,
                tradingsymbol=symbol,
                transaction_type=trans_type,
                quantity=quantity,
                product=self.kite.PRODUCT_MIS,
                order_type=self.kite.ORDER_TYPE_LIMIT,
                price=price,
                validity=self.kite.VALIDITY_DAY
            )
            
            logger.info(f"Order placed successfully. ID: {order_id}")
            return {"status": "success", "order_id": order_id}

        except Exception as e:
            logger.error(f"Error placing order: {e}")
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
