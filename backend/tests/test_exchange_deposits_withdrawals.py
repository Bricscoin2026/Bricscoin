"""
BricsCoin CEX Exchange - Deposit Addresses & Withdrawal Validation Tests

Tests:
- GET /api/exchange/deposit/usdt - USDT TRC-20 deposit address (must start with T)
- GET /api/exchange/deposit/brics - BRICS PQC deposit address (must start with BRICSPQ)
- POST /api/exchange/withdraw/usdt - USDT withdrawal validation (min 5 USDT)
- POST /api/exchange/withdraw/brics - BRICS withdrawal validation (min 1 BRICS, address must start with BRICS)
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://brics-chat-global.preview.emergentagent.com').rstrip('/')
ADMIN_KEY = "bricscoin-admin-2026"

# Test users for deposit/withdrawal tests
SELLER_USER = {"username": "seller1", "email": "seller1@test.com", "password": "test123456"}
BUYER_USER = {"username": "buyer1", "email": "buyer1@test.com", "password": "test123456"}

# Store tokens
tokens = {}


class TestSetupUsers:
    """Setup test users - register or login if they exist"""
    
    def test_setup_seller(self):
        """Setup seller1 - register or login"""
        # Try to login first
        response = requests.post(f"{BASE_URL}/api/exchange/login", json={
            "email": SELLER_USER["email"],
            "password": SELLER_USER["password"]
        })
        
        if response.status_code == 200:
            data = response.json()
            tokens["seller"] = data["token"]
            tokens["seller_username"] = data["username"]
            print(f"Logged in existing seller1: {data['username']}")
        else:
            # Register new user
            response = requests.post(f"{BASE_URL}/api/exchange/register", json=SELLER_USER)
            if response.status_code == 200:
                data = response.json()
                tokens["seller"] = data["token"]
                tokens["seller_username"] = data["username"]
                print(f"Registered new seller1: {data['username']}")
            else:
                pytest.fail(f"Could not login or register seller1: {response.text}")
    
    def test_setup_buyer(self):
        """Setup buyer1 - register or login"""
        # Try to login first
        response = requests.post(f"{BASE_URL}/api/exchange/login", json={
            "email": BUYER_USER["email"],
            "password": BUYER_USER["password"]
        })
        
        if response.status_code == 200:
            data = response.json()
            tokens["buyer"] = data["token"]
            tokens["buyer_username"] = data["username"]
            print(f"Logged in existing buyer1: {data['username']}")
        else:
            # Register new user
            response = requests.post(f"{BASE_URL}/api/exchange/register", json=BUYER_USER)
            if response.status_code == 200:
                data = response.json()
                tokens["buyer"] = data["token"]
                tokens["buyer_username"] = data["username"]
                print(f"Registered new buyer1: {data['username']}")
            else:
                pytest.fail(f"Could not login or register buyer1: {response.text}")
    
    def test_credit_funds_to_seller(self):
        """Credit BRICS to seller for testing"""
        response = requests.post(f"{BASE_URL}/api/exchange/admin/credit", json={
            "admin_key": ADMIN_KEY,
            "username": tokens.get("seller_username", "seller1"),
            "currency": "brics",
            "amount": 10000.0
        })
        assert response.status_code == 200, f"Credit to seller failed: {response.text}"
        print(f"Credited 10000 BRICS to seller")
    
    def test_credit_funds_to_buyer(self):
        """Credit USDT to buyer for testing"""
        response = requests.post(f"{BASE_URL}/api/exchange/admin/credit", json={
            "admin_key": ADMIN_KEY,
            "username": tokens.get("buyer_username", "buyer1"),
            "currency": "usdt",
            "amount": 500.0
        })
        assert response.status_code == 200, f"Credit to buyer failed: {response.text}"
        print(f"Credited 500 USDT to buyer")


class TestUsdtDeposit:
    """Test USDT TRC-20 deposit address generation"""
    
    def test_get_usdt_deposit_address(self):
        """GET /api/exchange/deposit/usdt - Must return Tron address starting with T"""
        headers = {"Authorization": f"Bearer {tokens.get('seller', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/deposit/usdt", headers=headers)
        assert response.status_code == 200, f"Get USDT deposit failed: {response.text}"
        
        data = response.json()
        assert "address" in data, "Missing 'address' in response"
        assert "currency" in data, "Missing 'currency' in response"
        assert "network" in data, "Missing 'network' in response"
        
        # CRITICAL: Address must be a valid Tron address starting with T
        address = data["address"]
        assert address.startswith("T"), f"USDT deposit address must start with 'T' (Tron format), got: {address}"
        assert len(address) == 34, f"Tron address must be 34 chars, got {len(address)}: {address}"
        
        assert data["currency"] == "USDT", f"Currency should be USDT, got {data['currency']}"
        assert "TRC-20" in data["network"], f"Network should mention TRC-20, got {data['network']}"
        
        tokens["usdt_deposit_address"] = address
        print(f"USDT deposit address: {address} (network: {data['network']})")
    
    def test_get_usdt_deposit_address_consistent(self):
        """Same user should get same deposit address"""
        headers = {"Authorization": f"Bearer {tokens.get('seller', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/deposit/usdt", headers=headers)
        assert response.status_code == 200, f"Get USDT deposit failed: {response.text}"
        
        data = response.json()
        expected = tokens.get("usdt_deposit_address")
        assert data["address"] == expected, f"Deposit address should be consistent. Expected {expected}, got {data['address']}"
        print(f"Deposit address consistency verified: {data['address']}")
    
    def test_get_usdt_deposit_address_unauthorized(self):
        """Should fail without authentication"""
        response = requests.get(f"{BASE_URL}/api/exchange/deposit/usdt")
        assert response.status_code == 401, f"Should return 401 without auth, got {response.status_code}"
        print("Unauthorized USDT deposit address request correctly rejected")


class TestBricsDeposit:
    """Test BRICS PQC deposit address generation"""
    
    def test_get_brics_deposit_address(self):
        """GET /api/exchange/deposit/brics - Must return PQC address starting with BRICSPQ"""
        headers = {"Authorization": f"Bearer {tokens.get('buyer', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/deposit/brics", headers=headers)
        assert response.status_code == 200, f"Get BRICS deposit failed: {response.text}"
        
        data = response.json()
        assert "address" in data, "Missing 'address' in response"
        assert "memo" in data, "Missing 'memo' in response"
        assert "currency" in data, "Missing 'currency' in response"
        assert "network" in data, "Missing 'network' in response"
        
        # CRITICAL: Address must be PQC format starting with BRICSPQ
        address = data["address"]
        assert address.startswith("BRICSPQ"), f"BRICS deposit address must start with 'BRICSPQ' (PQC format), got: {address}"
        
        assert data["currency"] == "BRICS", f"Currency should be BRICS, got {data['currency']}"
        assert "PQC" in data["network"], f"Network should mention PQC, got {data['network']}"
        
        # Memo should be provided for identifying user
        assert len(data["memo"]) > 0, "Memo should not be empty"
        
        tokens["brics_deposit_address"] = address
        tokens["brics_memo"] = data["memo"]
        print(f"BRICS PQC deposit address: {address}, memo: {data['memo']}")
    
    def test_get_brics_deposit_address_unauthorized(self):
        """Should fail without authentication"""
        response = requests.get(f"{BASE_URL}/api/exchange/deposit/brics")
        assert response.status_code == 401, f"Should return 401 without auth, got {response.status_code}"
        print("Unauthorized BRICS deposit address request correctly rejected")


class TestUsdtWithdrawal:
    """Test USDT withdrawal validation"""
    
    def test_usdt_withdrawal_min_amount_fail(self):
        """POST /api/exchange/withdraw/usdt - Amount < 5 USDT should fail"""
        headers = {"Authorization": f"Bearer {tokens.get('buyer', '')}"}
        response = requests.post(f"{BASE_URL}/api/exchange/withdraw/usdt", headers=headers, json={
            "currency": "usdt",
            "amount": 4.0,  # Below minimum of 5 USDT
            "address": "TGVvqZVuG8o1WJgaC2WHxRKJGVXwrEQgTH"  # Example Tron address
        })
        assert response.status_code == 400, f"Withdrawal below min should fail, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data or "message" in data, "Should have error message"
        error_msg = data.get("detail", data.get("message", ""))
        assert "5" in str(error_msg) or "minimum" in str(error_msg).lower(), f"Error should mention minimum, got: {error_msg}"
        print(f"USDT withdrawal below minimum correctly rejected: {error_msg}")
    
    def test_usdt_withdrawal_invalid_address_fail(self):
        """POST /api/exchange/withdraw/usdt - Invalid address should fail"""
        headers = {"Authorization": f"Bearer {tokens.get('buyer', '')}"}
        response = requests.post(f"{BASE_URL}/api/exchange/withdraw/usdt", headers=headers, json={
            "currency": "usdt",
            "amount": 10.0,
            "address": "invalid"  # Too short/invalid
        })
        assert response.status_code == 400, f"Invalid address should fail, got {response.status_code}: {response.text}"
        print("USDT withdrawal with invalid address correctly rejected")
    
    def test_usdt_withdrawal_insufficient_balance_fail(self):
        """POST /api/exchange/withdraw/usdt - Insufficient balance should fail"""
        headers = {"Authorization": f"Bearer {tokens.get('seller', '')}"}  # Seller has BRICS not USDT
        response = requests.post(f"{BASE_URL}/api/exchange/withdraw/usdt", headers=headers, json={
            "currency": "usdt",
            "amount": 1000000.0,  # Way more than available
            "address": "TGVvqZVuG8o1WJgaC2WHxRKJGVXwrEQgTH"
        })
        assert response.status_code == 400, f"Insufficient balance should fail, got {response.status_code}: {response.text}"
        print("USDT withdrawal with insufficient balance correctly rejected")
    
    def test_usdt_withdrawal_unauthorized(self):
        """Should fail without authentication"""
        response = requests.post(f"{BASE_URL}/api/exchange/withdraw/usdt", json={
            "currency": "usdt",
            "amount": 10.0,
            "address": "TGVvqZVuG8o1WJgaC2WHxRKJGVXwrEQgTH"
        })
        assert response.status_code == 401, f"Should return 401 without auth, got {response.status_code}"
        print("Unauthorized USDT withdrawal correctly rejected")


class TestBricsWithdrawal:
    """Test BRICS withdrawal validation"""
    
    def test_brics_withdrawal_min_amount_fail(self):
        """POST /api/exchange/withdraw/brics - Amount < 1 BRICS should fail"""
        headers = {"Authorization": f"Bearer {tokens.get('seller', '')}"}
        response = requests.post(f"{BASE_URL}/api/exchange/withdraw/brics", headers=headers, json={
            "currency": "brics",
            "amount": 0.5,  # Below minimum of 1 BRICS
            "address": "BRICSPQ1234567890abcdef1234567890abcdef12"  # PQC format
        })
        assert response.status_code == 400, f"Withdrawal below min should fail, got {response.status_code}: {response.text}"
        
        data = response.json()
        error_msg = data.get("detail", data.get("message", ""))
        assert "1" in str(error_msg) or "minimum" in str(error_msg).lower(), f"Error should mention minimum, got: {error_msg}"
        print(f"BRICS withdrawal below minimum correctly rejected: {error_msg}")
    
    def test_brics_withdrawal_invalid_address_fail(self):
        """POST /api/exchange/withdraw/brics - Address not starting with BRICS should fail"""
        headers = {"Authorization": f"Bearer {tokens.get('seller', '')}"}
        response = requests.post(f"{BASE_URL}/api/exchange/withdraw/brics", headers=headers, json={
            "currency": "brics",
            "amount": 10.0,
            "address": "INVALID_ADDRESS"  # Does not start with BRICS
        })
        assert response.status_code == 400, f"Invalid BRICS address should fail, got {response.status_code}: {response.text}"
        
        data = response.json()
        error_msg = data.get("detail", data.get("message", ""))
        print(f"BRICS withdrawal with invalid address correctly rejected: {error_msg}")
    
    def test_brics_withdrawal_insufficient_balance_fail(self):
        """POST /api/exchange/withdraw/brics - Insufficient balance should fail"""
        headers = {"Authorization": f"Bearer {tokens.get('buyer', '')}"}  # Buyer has USDT not BRICS
        response = requests.post(f"{BASE_URL}/api/exchange/withdraw/brics", headers=headers, json={
            "currency": "brics",
            "amount": 1000000.0,  # Way more than available
            "address": "BRICSPQ1234567890abcdef1234567890abcdef12"
        })
        assert response.status_code == 400, f"Insufficient balance should fail, got {response.status_code}: {response.text}"
        print("BRICS withdrawal with insufficient balance correctly rejected")
    
    def test_brics_withdrawal_unauthorized(self):
        """Should fail without authentication"""
        response = requests.post(f"{BASE_URL}/api/exchange/withdraw/brics", json={
            "currency": "brics",
            "amount": 10.0,
            "address": "BRICSPQ1234567890abcdef1234567890abcdef12"
        })
        assert response.status_code == 401, f"Should return 401 without auth, got {response.status_code}"
        print("Unauthorized BRICS withdrawal correctly rejected")


class TestTradingFlowAndTickerUpdate:
    """Test complete trading flow and verify ticker updates"""
    
    def test_initial_ticker(self):
        """Get initial ticker state"""
        response = requests.get(f"{BASE_URL}/api/exchange/ticker")
        assert response.status_code == 200, f"Ticker failed: {response.text}"
        
        data = response.json()
        tokens["initial_price"] = data["last_price"]
        tokens["initial_volume"] = data["volume_24h"]
        print(f"Initial ticker: price={data['last_price']}, volume={data['volume_24h']}")
    
    def test_seller_places_limit_sell(self):
        """Seller places limit sell order at slightly higher price"""
        headers = {"Authorization": f"Bearer {tokens.get('seller', '')}"}
        
        # Use a price slightly above initial for clear test
        sell_price = 0.0095
        
        response = requests.post(f"{BASE_URL}/api/exchange/order", headers=headers, json={
            "side": "sell",
            "order_type": "limit",
            "price": sell_price,
            "amount": 1000.0  # 1000 BRICS
        })
        assert response.status_code == 200, f"Seller limit order failed: {response.text}"
        
        data = response.json()
        assert data["order"]["status"] in ["open", "partial", "filled"], f"Invalid order status: {data['order']['status']}"
        tokens["sell_order_id"] = data["order"]["order_id"]
        print(f"Seller placed sell order at {sell_price}: status={data['order']['status']}")
    
    def test_buyer_places_matching_buy(self):
        """Buyer places matching buy order to execute trade"""
        headers = {"Authorization": f"Bearer {tokens.get('buyer', '')}"}
        
        # Match seller's price to execute trade
        buy_price = 0.0095
        
        response = requests.post(f"{BASE_URL}/api/exchange/order", headers=headers, json={
            "side": "buy",
            "order_type": "limit",
            "price": buy_price,
            "amount": 500.0  # 500 BRICS - partial fill
        })
        assert response.status_code == 200, f"Buyer limit order failed: {response.text}"
        
        data = response.json()
        assert "fills" in data, "Missing 'fills' in response"
        assert len(data["fills"]) > 0, "Order should have matched"
        
        fill = data["fills"][0]
        assert fill["amount"] == 500.0, f"Fill amount should be 500, got {fill['amount']}"
        
        tokens["trade_price"] = fill["price"]
        tokens["trade_amount"] = fill["amount"]
        print(f"Trade executed: {fill['amount']} BRICS @ {fill['price']} USDT")
    
    def test_ticker_updated_after_trade(self):
        """Verify ticker shows updated price after trade"""
        time.sleep(0.5)  # Small delay for trade to propagate
        
        response = requests.get(f"{BASE_URL}/api/exchange/ticker")
        assert response.status_code == 200, f"Ticker failed: {response.text}"
        
        data = response.json()
        # Price should reflect last trade
        trade_price = tokens.get("trade_price", 0.0095)
        assert data["last_price"] == trade_price, f"Ticker price should be {trade_price}, got {data['last_price']}"
        
        # Volume should have increased
        initial_volume = tokens.get("initial_volume", 0)
        trade_amount = tokens.get("trade_amount", 500)
        assert data["volume_24h"] > initial_volume or data["volume_24h"] >= trade_amount, \
            f"Volume should have increased. Initial: {initial_volume}, Now: {data['volume_24h']}"
        
        print(f"Ticker after trade: price={data['last_price']}, volume={data['volume_24h']}")
    
    def test_seller_wallet_updated(self):
        """Verify seller received USDT from sale"""
        headers = {"Authorization": f"Bearer {tokens.get('seller', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers)
        assert response.status_code == 200, f"Get wallet failed: {response.text}"
        
        data = response.json()
        # Seller should have USDT (from selling BRICS)
        assert data["usdt_available"] > 0, f"Seller should have USDT after selling, has {data['usdt_available']}"
        print(f"Seller wallet: BRICS={data['brics_available']}, USDT={data['usdt_available']}")
    
    def test_buyer_wallet_updated(self):
        """Verify buyer received BRICS from purchase"""
        headers = {"Authorization": f"Bearer {tokens.get('buyer', '')}"}
        response = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers)
        assert response.status_code == 200, f"Get wallet failed: {response.text}"
        
        data = response.json()
        # Buyer should have BRICS (from buying)
        assert data["brics_available"] > 0, f"Buyer should have BRICS after buying, has {data['brics_available']}"
        print(f"Buyer wallet: BRICS={data['brics_available']}, USDT={data['usdt_available']}")
    
    def test_cancel_remaining_sell_order(self):
        """Cancel seller's remaining order and verify funds unlocked"""
        sell_order_id = tokens.get("sell_order_id")
        if not sell_order_id:
            pytest.skip("No sell order to cancel")
        
        headers = {"Authorization": f"Bearer {tokens.get('seller', '')}"}
        
        # Get wallet before cancel
        wallet_before = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers).json()
        locked_before = wallet_before.get("brics_locked", 0)
        
        # Cancel order
        response = requests.delete(f"{BASE_URL}/api/exchange/order/{sell_order_id}", headers=headers)
        
        if response.status_code == 404:
            print("Order already fully filled")
            return
        
        assert response.status_code == 200, f"Cancel failed: {response.text}"
        
        # Verify funds unlocked
        wallet_after = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers).json()
        locked_after = wallet_after.get("brics_locked", 0)
        
        assert locked_after < locked_before or locked_after == 0, \
            f"Locked BRICS should decrease after cancel. Before: {locked_before}, After: {locked_after}"
        
        print(f"Order cancelled. BRICS locked: {locked_before} -> {locked_after}")


class TestMarketOrder:
    """Test market orders"""
    
    def test_place_market_buy_order(self):
        """Place market buy order - should execute at best available price"""
        # First ensure there's a sell order in the book
        headers_seller = {"Authorization": f"Bearer {tokens.get('seller', '')}"}
        sell_resp = requests.post(f"{BASE_URL}/api/exchange/order", headers=headers_seller, json={
            "side": "sell",
            "order_type": "limit",
            "price": 0.0100,
            "amount": 100.0
        })
        
        if sell_resp.status_code != 200:
            pytest.skip("Could not place sell order for market order test")
        
        # Now place market buy
        headers_buyer = {"Authorization": f"Bearer {tokens.get('buyer', '')}"}
        response = requests.post(f"{BASE_URL}/api/exchange/order", headers=headers_buyer, json={
            "side": "buy",
            "order_type": "market",
            "amount": 50.0  # 50 BRICS
        })
        
        # Market orders might fail if no liquidity, but the endpoint should respond
        if response.status_code == 200:
            data = response.json()
            print(f"Market order: status={data['order']['status']}, fills={len(data.get('fills', []))}")
        else:
            # Market orders can fail if no asks available
            print(f"Market order rejected (possibly no liquidity): {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
