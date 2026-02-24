"""
BricsCoin CEX Exchange API Tests
Tests: Register, Login, Wallet, Ticker, Orderbook, Trades, Candles, Admin Credit, Orders, Matching Engine
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stratum-stabilizer.preview.emergentagent.com').rstrip('/')
ADMIN_KEY = "bricscoin-admin-2026"

# Test users
TRADER1 = {"username": f"trader1_{uuid.uuid4().hex[:8]}", "email": f"trader1_{uuid.uuid4().hex[:8]}@test.com", "password": "test123456"}
TRADER2 = {"username": f"trader2_{uuid.uuid4().hex[:8]}", "email": f"trader2_{uuid.uuid4().hex[:8]}@test.com", "password": "test123456"}

# Store tokens for reuse
tokens = {}


class TestExchangePublicEndpoints:
    """Test public endpoints (no auth required)"""
    
    def test_ticker(self):
        """GET /api/exchange/ticker - Get price ticker"""
        response = requests.get(f"{BASE_URL}/api/exchange/ticker")
        assert response.status_code == 200, f"Ticker failed: {response.text}"
        
        data = response.json()
        assert "pair" in data, "Missing 'pair' in ticker"
        assert data["pair"] == "BRICS/USDT", f"Wrong pair: {data['pair']}"
        assert "last_price" in data, "Missing 'last_price'"
        assert "high_24h" in data, "Missing 'high_24h'"
        assert "low_24h" in data, "Missing 'low_24h'"
        assert "volume_24h" in data, "Missing 'volume_24h'"
        assert "change_24h" in data, "Missing 'change_24h'"
        assert data["last_price"] >= 0, "last_price must be >= 0"
        print(f"Ticker: last_price={data['last_price']}, volume_24h={data['volume_24h']}")
    
    def test_orderbook(self):
        """GET /api/exchange/orderbook - Get order book"""
        response = requests.get(f"{BASE_URL}/api/exchange/orderbook")
        assert response.status_code == 200, f"Orderbook failed: {response.text}"
        
        data = response.json()
        assert "bids" in data, "Missing 'bids' in orderbook"
        assert "asks" in data, "Missing 'asks' in orderbook"
        assert isinstance(data["bids"], list), "bids must be a list"
        assert isinstance(data["asks"], list), "asks must be a list"
        print(f"Orderbook: {len(data['bids'])} bids, {len(data['asks'])} asks")
    
    def test_trades(self):
        """GET /api/exchange/trades - Get recent trades"""
        response = requests.get(f"{BASE_URL}/api/exchange/trades")
        assert response.status_code == 200, f"Trades failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Trades must be a list"
        print(f"Recent trades: {len(data)} trades")
    
    def test_candles(self):
        """GET /api/exchange/candles - Get candlestick data"""
        response = requests.get(f"{BASE_URL}/api/exchange/candles?interval=1h&limit=50")
        assert response.status_code == 200, f"Candles failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Candles must be a list"
        assert len(data) > 0, "Should return at least one candle"
        
        # Verify candle structure
        candle = data[0]
        assert "time" in candle, "Candle missing 'time'"
        assert "open" in candle, "Candle missing 'open'"
        assert "high" in candle, "Candle missing 'high'"
        assert "low" in candle, "Candle missing 'low'"
        assert "close" in candle, "Candle missing 'close'"
        print(f"Candles: {len(data)} candles, first={candle}")


class TestExchangeAuth:
    """Test authentication endpoints"""
    
    def test_register_trader1(self):
        """POST /api/exchange/register - Register trader1"""
        response = requests.post(f"{BASE_URL}/api/exchange/register", json=TRADER1)
        assert response.status_code == 200, f"Register trader1 failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing 'token' in register response"
        assert "user_id" in data, "Missing 'user_id'"
        assert "username" in data, "Missing 'username'"
        assert data["username"] == TRADER1["username"].lower(), f"Wrong username: {data['username']}"
        
        tokens["trader1"] = data["token"]
        tokens["trader1_id"] = data["user_id"]
        print(f"Registered trader1: {data['username']}, user_id={data['user_id']}")
    
    def test_register_trader2(self):
        """POST /api/exchange/register - Register trader2"""
        response = requests.post(f"{BASE_URL}/api/exchange/register", json=TRADER2)
        assert response.status_code == 200, f"Register trader2 failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing 'token' in register response"
        tokens["trader2"] = data["token"]
        tokens["trader2_id"] = data["user_id"]
        print(f"Registered trader2: {data['username']}")
    
    def test_register_duplicate_fails(self):
        """POST /api/exchange/register - Duplicate registration should fail"""
        response = requests.post(f"{BASE_URL}/api/exchange/register", json=TRADER1)
        assert response.status_code == 400, "Duplicate registration should fail with 400"
        print("Duplicate registration correctly rejected")
    
    def test_login_trader1(self):
        """POST /api/exchange/login - Login trader1"""
        response = requests.post(f"{BASE_URL}/api/exchange/login", json={
            "email": TRADER1["email"],
            "password": TRADER1["password"]
        })
        assert response.status_code == 200, f"Login trader1 failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing 'token' in login response"
        tokens["trader1"] = data["token"]  # Update token
        print(f"Logged in trader1, got new token")
    
    def test_login_invalid_credentials(self):
        """POST /api/exchange/login - Invalid login should fail"""
        response = requests.post(f"{BASE_URL}/api/exchange/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, "Invalid login should return 401"
        print("Invalid login correctly rejected")


class TestExchangeWallet:
    """Test wallet endpoints (requires auth)"""
    
    def test_get_wallet_trader1(self):
        """GET /api/exchange/wallet - Get wallet for trader1"""
        headers = {"Authorization": f"Bearer {tokens.get('trader1', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers)
        assert response.status_code == 200, f"Get wallet failed: {response.text}"
        
        data = response.json()
        assert "brics_available" in data, "Missing 'brics_available'"
        assert "brics_locked" in data, "Missing 'brics_locked'"
        assert "usdt_available" in data, "Missing 'usdt_available'"
        assert "usdt_locked" in data, "Missing 'usdt_locked'"
        print(f"Trader1 wallet: BRICS={data['brics_available']}, USDT={data['usdt_available']}")
    
    def test_get_wallet_unauthorized(self):
        """GET /api/exchange/wallet - Without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/exchange/wallet")
        assert response.status_code == 401, "Unauthorized wallet access should return 401"
        print("Unauthorized wallet access correctly rejected")


class TestExchangeAdminCredit:
    """Test admin credit endpoint"""
    
    def test_credit_usdt_to_trader1(self):
        """POST /api/exchange/admin/credit - Credit USDT to trader1"""
        response = requests.post(f"{BASE_URL}/api/exchange/admin/credit", json={
            "admin_key": ADMIN_KEY,
            "username": TRADER1["username"],
            "currency": "usdt",
            "amount": 1000.0
        })
        assert response.status_code == 200, f"Credit USDT failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing 'message' in credit response"
        assert "1000" in data["message"], f"Credit confirmation wrong: {data['message']}"
        print(f"Credited 1000 USDT to trader1: {data['message']}")
    
    def test_credit_brics_to_trader2(self):
        """POST /api/exchange/admin/credit - Credit BRICS to trader2"""
        response = requests.post(f"{BASE_URL}/api/exchange/admin/credit", json={
            "admin_key": ADMIN_KEY,
            "username": TRADER2["username"],
            "currency": "brics",
            "amount": 50000.0  # 50k BRICS
        })
        assert response.status_code == 200, f"Credit BRICS failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing 'message' in credit response"
        print(f"Credited 50000 BRICS to trader2: {data['message']}")
    
    def test_credit_invalid_admin_key(self):
        """POST /api/exchange/admin/credit - Invalid admin key should fail"""
        response = requests.post(f"{BASE_URL}/api/exchange/admin/credit", json={
            "admin_key": "wrong-key",
            "username": TRADER1["username"],
            "currency": "usdt",
            "amount": 100.0
        })
        assert response.status_code == 403, "Invalid admin key should return 403"
        print("Invalid admin key correctly rejected")
    
    def test_credit_invalid_user(self):
        """POST /api/exchange/admin/credit - Invalid user should fail"""
        response = requests.post(f"{BASE_URL}/api/exchange/admin/credit", json={
            "admin_key": ADMIN_KEY,
            "username": "nonexistent_user",
            "currency": "usdt",
            "amount": 100.0
        })
        assert response.status_code == 404, "Credit to nonexistent user should return 404"
        print("Credit to nonexistent user correctly rejected")
    
    def test_verify_trader1_wallet_after_credit(self):
        """Verify trader1 wallet has credited USDT"""
        headers = {"Authorization": f"Bearer {tokens.get('trader1', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers)
        assert response.status_code == 200, f"Get wallet failed: {response.text}"
        
        data = response.json()
        assert data["usdt_available"] >= 1000.0, f"Trader1 should have >= 1000 USDT, has {data['usdt_available']}"
        print(f"Trader1 wallet verified: USDT={data['usdt_available']}")
    
    def test_verify_trader2_wallet_after_credit(self):
        """Verify trader2 wallet has credited BRICS"""
        headers = {"Authorization": f"Bearer {tokens.get('trader2', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers)
        assert response.status_code == 200, f"Get wallet failed: {response.text}"
        
        data = response.json()
        assert data["brics_available"] >= 50000.0, f"Trader2 should have >= 50000 BRICS, has {data['brics_available']}"
        print(f"Trader2 wallet verified: BRICS={data['brics_available']}")


class TestExchangeOrders:
    """Test order placement and matching"""
    
    def test_place_sell_limit_order_trader2(self):
        """POST /api/exchange/order - Trader2 places sell limit order"""
        headers = {"Authorization": f"Bearer {tokens.get('trader2', '')}"}
        response = requests.post(f"{BASE_URL}/api/exchange/order", headers=headers, json={
            "side": "sell",
            "order_type": "limit",
            "price": 0.0090,  # Sell at 0.0090 USDT
            "amount": 1000.0  # 1000 BRICS
        })
        assert response.status_code == 200, f"Place sell order failed: {response.text}"
        
        data = response.json()
        assert "order" in data, "Missing 'order' in response"
        assert "fills" in data, "Missing 'fills' in response"
        assert data["order"]["side"] == "sell", "Order side should be 'sell'"
        assert data["order"]["status"] in ["open", "partial", "filled"], f"Invalid status: {data['order']['status']}"
        
        tokens["sell_order_id"] = data["order"]["order_id"]
        print(f"Trader2 placed sell order: {data['order']['order_id']}, status={data['order']['status']}")
    
    def test_orderbook_has_sell_order(self):
        """Verify orderbook has the sell order"""
        response = requests.get(f"{BASE_URL}/api/exchange/orderbook")
        assert response.status_code == 200, f"Orderbook failed: {response.text}"
        
        data = response.json()
        assert len(data["asks"]) > 0, "Orderbook should have asks after sell order"
        print(f"Orderbook now has {len(data['asks'])} asks")
    
    def test_place_buy_limit_order_trader1_matching(self):
        """POST /api/exchange/order - Trader1 places matching buy order"""
        headers = {"Authorization": f"Bearer {tokens.get('trader1', '')}"}
        response = requests.post(f"{BASE_URL}/api/exchange/order", headers=headers, json={
            "side": "buy",
            "order_type": "limit",
            "price": 0.0090,  # Buy at same price to match
            "amount": 500.0   # 500 BRICS (partial fill of sell order)
        })
        assert response.status_code == 200, f"Place buy order failed: {response.text}"
        
        data = response.json()
        assert "order" in data, "Missing 'order' in response"
        assert "fills" in data, "Missing 'fills' in response"
        assert len(data["fills"]) > 0, "Order should have matched (fills > 0)"
        
        fill = data["fills"][0]
        assert "price" in fill, "Fill missing 'price'"
        assert "amount" in fill, "Fill missing 'amount'"
        assert fill["price"] == 0.0090, f"Fill price should be 0.0090, got {fill['price']}"
        
        tokens["buy_order_id"] = data["order"]["order_id"]
        print(f"Trader1 buy order matched! Order status={data['order']['status']}, fills={len(data['fills'])}")
    
    def test_trades_after_matching(self):
        """GET /api/exchange/trades - Verify trade appears"""
        time.sleep(0.5)  # Small delay for trade to be recorded
        response = requests.get(f"{BASE_URL}/api/exchange/trades")
        assert response.status_code == 200, f"Trades failed: {response.text}"
        
        data = response.json()
        assert len(data) > 0, "Should have at least one trade after matching"
        
        trade = data[0]
        assert "price" in trade, "Trade missing 'price'"
        assert "amount" in trade, "Trade missing 'amount'"
        assert "timestamp" in trade, "Trade missing 'timestamp'"
        print(f"Trade recorded: price={trade['price']}, amount={trade['amount']}")
    
    def test_get_open_orders_trader2(self):
        """GET /api/exchange/orders/open - Get trader2's open orders"""
        headers = {"Authorization": f"Bearer {tokens.get('trader2', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/orders/open", headers=headers)
        assert response.status_code == 200, f"Get open orders failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Open orders should be a list"
        print(f"Trader2 has {len(data)} open orders")
    
    def test_place_order_insufficient_balance(self):
        """POST /api/exchange/order - Should fail with insufficient balance"""
        headers = {"Authorization": f"Bearer {tokens.get('trader1', '')}"}
        response = requests.post(f"{BASE_URL}/api/exchange/order", headers=headers, json={
            "side": "buy",
            "order_type": "limit",
            "price": 0.01,
            "amount": 10000000.0  # Way more than available
        })
        assert response.status_code == 400, f"Order with insufficient balance should fail, got {response.status_code}"
        print("Insufficient balance order correctly rejected")
    
    def test_place_order_invalid_side(self):
        """POST /api/exchange/order - Invalid side should fail"""
        headers = {"Authorization": f"Bearer {tokens.get('trader1', '')}"}
        response = requests.post(f"{BASE_URL}/api/exchange/order", headers=headers, json={
            "side": "invalid",
            "order_type": "limit",
            "price": 0.01,
            "amount": 10.0
        })
        assert response.status_code == 400, "Invalid side should return 400"
        print("Invalid order side correctly rejected")


class TestExchangeCancelOrder:
    """Test order cancellation"""
    
    def test_cancel_order_trader2(self):
        """DELETE /api/exchange/order/{order_id} - Cancel trader2's remaining sell order"""
        sell_order_id = tokens.get("sell_order_id")
        if not sell_order_id:
            pytest.skip("No sell order ID available")
        
        headers = {"Authorization": f"Bearer {tokens.get('trader2', '')}"}
        response = requests.delete(f"{BASE_URL}/api/exchange/order/{sell_order_id}", headers=headers)
        
        # Order might be filled or cancelled already
        if response.status_code == 404:
            print("Order already filled or cancelled")
            return
        
        assert response.status_code == 200, f"Cancel order failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing 'message' in cancel response"
        print(f"Order cancelled: {data['message']}")
    
    def test_cancel_nonexistent_order(self):
        """DELETE /api/exchange/order/{order_id} - Nonexistent order should fail"""
        headers = {"Authorization": f"Bearer {tokens.get('trader1', '')}"}
        response = requests.delete(f"{BASE_URL}/api/exchange/order/nonexistent-order-id", headers=headers)
        assert response.status_code == 404, "Cancel nonexistent order should return 404"
        print("Cancel nonexistent order correctly rejected")


class TestExchangeWalletAfterTrades:
    """Verify wallet balances after trades"""
    
    def test_trader1_has_brics_after_buy(self):
        """Trader1 should have BRICS after buying"""
        headers = {"Authorization": f"Bearer {tokens.get('trader1', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers)
        assert response.status_code == 200, f"Get wallet failed: {response.text}"
        
        data = response.json()
        assert data["brics_available"] > 0, f"Trader1 should have BRICS after buying, has {data['brics_available']}"
        print(f"Trader1 after trade: BRICS={data['brics_available']}, USDT={data['usdt_available']}")
    
    def test_trader2_has_usdt_after_sell(self):
        """Trader2 should have USDT after selling"""
        headers = {"Authorization": f"Bearer {tokens.get('trader2', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers)
        assert response.status_code == 200, f"Get wallet failed: {response.text}"
        
        data = response.json()
        assert data["usdt_available"] > 0, f"Trader2 should have USDT after selling, has {data['usdt_available']}"
        print(f"Trader2 after trade: BRICS={data['brics_available']}, USDT={data['usdt_available']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
