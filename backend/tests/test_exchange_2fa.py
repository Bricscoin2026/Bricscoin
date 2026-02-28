"""
BricsCoin CEX Exchange - 2FA (Two-Factor Authentication) Tests
Tests: 2FA setup, enable, disable, login with 2FA, withdraw with 2FA required
Uses pyotp to generate valid TOTP codes for testing
"""

import pytest
import requests
import os
import uuid
import pyotp

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://maturing-rewards-ui.preview.emergentagent.com').rstrip('/')
ADMIN_KEY = "bricscoin-admin-2026"

# Unique test user for 2FA tests
TEST_USER_2FA = {
    "username": f"sectest_{uuid.uuid4().hex[:8]}",
    "email": f"sectest_{uuid.uuid4().hex[:8]}@test.com",
    "password": "test123456"
}

# Store token and 2FA secret
test_data = {
    "token": None,
    "totp_secret": None,
    "user_id": None
}


class Test01_RegisterAndLogin:
    """Register a new user and test basic login"""
    
    def test_register_user(self):
        """POST /api/exchange/register - Create new test account"""
        response = requests.post(f"{BASE_URL}/api/exchange/register", json=TEST_USER_2FA)
        assert response.status_code == 200, f"Register failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing 'token' in register response"
        assert "user_id" in data, "Missing 'user_id'"
        
        test_data["token"] = data["token"]
        test_data["user_id"] = data["user_id"]
        print(f"[PASS] Registered user: {TEST_USER_2FA['username']}, user_id={data['user_id']}")
    
    def test_login_user(self):
        """POST /api/exchange/login - Login without 2FA (not yet enabled)"""
        response = requests.post(f"{BASE_URL}/api/exchange/login", json={
            "email": TEST_USER_2FA["email"],
            "password": TEST_USER_2FA["password"]
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        # Should NOT have requires_2fa since not enabled
        assert "requires_2fa" not in data or data.get("requires_2fa") == False, "Should not require 2FA yet"
        assert "token" in data, "Missing token in login response"
        
        test_data["token"] = data["token"]
        print(f"[PASS] Login without 2FA succeeded")


class Test02_2FAStatusDisabledByDefault:
    """Check 2FA status is disabled by default"""
    
    def test_2fa_status_disabled(self):
        """GET /api/exchange/2fa/status - Should be disabled by default"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/exchange/2fa/status", headers=headers)
        assert response.status_code == 200, f"2FA status failed: {response.text}"
        
        data = response.json()
        assert "enabled" in data, "Missing 'enabled' in status response"
        assert data["enabled"] == False, f"2FA should be disabled by default, got {data['enabled']}"
        print(f"[PASS] 2FA status is disabled by default")


class Test03_2FASetup:
    """Setup 2FA - get QR code and secret"""
    
    def test_setup_2fa(self):
        """POST /api/exchange/2fa/setup - Get QR code and secret"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.post(f"{BASE_URL}/api/exchange/2fa/setup", headers=headers)
        assert response.status_code == 200, f"2FA setup failed: {response.text}"
        
        data = response.json()
        assert "secret" in data, "Missing 'secret' in setup response"
        assert "qr_code" in data, "Missing 'qr_code' in setup response"
        assert "uri" in data, "Missing 'uri' in setup response"
        
        # Verify secret format (base32)
        secret = data["secret"]
        assert len(secret) > 10, f"Secret too short: {secret}"
        
        # Verify QR code is a data URL
        assert data["qr_code"].startswith("data:image/png;base64,"), "QR code should be base64 PNG"
        
        # Verify URI format
        assert "otpauth://totp/" in data["uri"], "URI should be otpauth format"
        assert "BricsCoin%20Exchange" in data["uri"] or "BricsCoin Exchange" in data["uri"], "URI should contain issuer"
        
        test_data["totp_secret"] = secret
        print(f"[PASS] 2FA setup successful, secret length={len(secret)}")


class Test04_Enable2FA:
    """Enable 2FA with valid TOTP code"""
    
    def test_enable_2fa_invalid_code(self):
        """POST /api/exchange/2fa/enable - Invalid code should fail"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.post(f"{BASE_URL}/api/exchange/2fa/enable", headers=headers, json={
            "totp_code": "000000"  # Wrong code
        })
        assert response.status_code == 400, f"Invalid code should fail with 400, got {response.status_code}"
        print(f"[PASS] Invalid TOTP code correctly rejected")
    
    def test_enable_2fa_valid_code(self):
        """POST /api/exchange/2fa/enable - Enable with valid TOTP code"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        
        # Generate valid TOTP code using pyotp
        totp = pyotp.TOTP(test_data["totp_secret"])
        valid_code = totp.now()
        
        response = requests.post(f"{BASE_URL}/api/exchange/2fa/enable", headers=headers, json={
            "totp_code": valid_code
        })
        assert response.status_code == 200, f"Enable 2FA failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing 'message' in response"
        assert "enabled" in data["message"].lower() or "success" in data["message"].lower(), f"Unexpected message: {data['message']}"
        print(f"[PASS] 2FA enabled with code {valid_code}")


class Test05_2FAStatusEnabled:
    """Verify 2FA status is now enabled"""
    
    def test_2fa_status_enabled(self):
        """GET /api/exchange/2fa/status - Should be enabled now"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/exchange/2fa/status", headers=headers)
        assert response.status_code == 200, f"2FA status failed: {response.text}"
        
        data = response.json()
        assert data["enabled"] == True, f"2FA should be enabled now, got {data['enabled']}"
        print(f"[PASS] 2FA status is now enabled")


class Test06_LoginWith2FA:
    """Test login flow with 2FA enabled"""
    
    def test_login_without_totp_requires_2fa(self):
        """POST /api/exchange/login without totp_code - Should return requires_2fa: true"""
        response = requests.post(f"{BASE_URL}/api/exchange/login", json={
            "email": TEST_USER_2FA["email"],
            "password": TEST_USER_2FA["password"]
        })
        assert response.status_code == 200, f"Login response failed: {response.text}"
        
        data = response.json()
        assert "requires_2fa" in data, "Should have 'requires_2fa' field"
        assert data["requires_2fa"] == True, f"requires_2fa should be True, got {data['requires_2fa']}"
        assert "token" not in data, "Should NOT return token without 2FA code"
        print(f"[PASS] Login without TOTP returns requires_2fa: true")
    
    def test_login_with_invalid_totp(self):
        """POST /api/exchange/login with invalid totp_code - Should return 401"""
        response = requests.post(f"{BASE_URL}/api/exchange/login", json={
            "email": TEST_USER_2FA["email"],
            "password": TEST_USER_2FA["password"],
            "totp_code": "000000"  # Wrong code
        })
        assert response.status_code == 401, f"Login with invalid TOTP should return 401, got {response.status_code}"
        print(f"[PASS] Login with invalid TOTP correctly returns 401")
    
    def test_login_with_valid_totp(self):
        """POST /api/exchange/login with valid totp_code - Should return token"""
        totp = pyotp.TOTP(test_data["totp_secret"])
        valid_code = totp.now()
        
        response = requests.post(f"{BASE_URL}/api/exchange/login", json={
            "email": TEST_USER_2FA["email"],
            "password": TEST_USER_2FA["password"],
            "totp_code": valid_code
        })
        assert response.status_code == 200, f"Login with valid TOTP failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Should return token with valid 2FA"
        assert "requires_2fa" not in data or data.get("requires_2fa") == False, "Should not require 2FA anymore"
        
        test_data["token"] = data["token"]
        print(f"[PASS] Login with valid TOTP succeeded, got new token")


class Test07_DepositAddresses:
    """Test per-user deposit addresses (BRICS PQC and USDT Tron)"""
    
    def test_get_brics_deposit_address(self):
        """GET /api/exchange/deposit/brics - Should return PQC address starting with BRICSPQ"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/exchange/deposit/brics", headers=headers)
        assert response.status_code == 200, f"Get BRICS deposit failed: {response.text}"
        
        data = response.json()
        assert "address" in data, "Missing 'address' in response"
        assert "currency" in data, "Missing 'currency'"
        assert data["currency"] == "BRICS", f"Currency should be BRICS, got {data['currency']}"
        
        # Verify PQC address format
        address = data["address"]
        assert address.startswith("BRICSPQ"), f"BRICS address should start with BRICSPQ, got {address[:10]}"
        
        test_data["brics_address"] = address
        print(f"[PASS] BRICS deposit address: {address[:30]}...")
    
    def test_get_brics_deposit_address_same(self):
        """GET /api/exchange/deposit/brics called twice - Should return SAME address"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/exchange/deposit/brics", headers=headers)
        assert response.status_code == 200, f"Get BRICS deposit 2nd call failed: {response.text}"
        
        data = response.json()
        assert data["address"] == test_data["brics_address"], f"BRICS address should be same on repeated calls, got different address"
        print(f"[PASS] BRICS deposit address is consistent (same address on 2nd call)")
    
    def test_get_usdt_deposit_address(self):
        """GET /api/exchange/deposit/usdt - Should return Tron address starting with T"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/exchange/deposit/usdt", headers=headers)
        assert response.status_code == 200, f"Get USDT deposit failed: {response.text}"
        
        data = response.json()
        assert "address" in data, "Missing 'address' in response"
        assert "currency" in data, "Missing 'currency'"
        assert data["currency"] == "USDT", f"Currency should be USDT, got {data['currency']}"
        
        # Verify Tron address format
        address = data["address"]
        assert address.startswith("T"), f"USDT address should start with T (Tron), got {address[:5]}"
        assert len(address) == 34, f"Tron address should be 34 chars, got {len(address)}"
        
        test_data["usdt_address"] = address
        print(f"[PASS] USDT deposit address: {address}")


class Test08_WithdrawalWith2FA:
    """Test withdrawals require 2FA when enabled"""
    
    def test_credit_funds_for_withdrawal_test(self):
        """Credit funds to test withdrawal"""
        response = requests.post(f"{BASE_URL}/api/exchange/admin/credit", json={
            "admin_key": ADMIN_KEY,
            "username": TEST_USER_2FA["username"],
            "currency": "usdt",
            "amount": 100.0
        })
        assert response.status_code == 200, f"Credit USDT failed: {response.text}"
        
        response = requests.post(f"{BASE_URL}/api/exchange/admin/credit", json={
            "admin_key": ADMIN_KEY,
            "username": TEST_USER_2FA["username"],
            "currency": "brics",
            "amount": 100.0
        })
        assert response.status_code == 200, f"Credit BRICS failed: {response.text}"
        print(f"[PASS] Credited 100 USDT and 100 BRICS for withdrawal tests")
    
    def test_withdraw_usdt_without_totp_fails(self):
        """POST /api/exchange/withdraw/usdt without totp when 2FA enabled - Should fail"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.post(f"{BASE_URL}/api/exchange/withdraw/usdt", headers=headers, json={
            "currency": "usdt",
            "amount": 10.0,
            "address": "TXYZaBcDeFgHiJkLmNoPqRsTuVwXyZ123"  # Valid format Tron address
        })
        assert response.status_code == 400, f"Withdraw without TOTP should fail with 400, got {response.status_code}"
        
        data = response.json()
        assert "2fa" in data.get("detail", "").lower() or "2fa" in str(data).lower(), f"Should mention 2FA required: {data}"
        print(f"[PASS] USDT withdrawal without TOTP correctly fails with 2FA required")
    
    def test_withdraw_brics_without_totp_fails(self):
        """POST /api/exchange/withdraw/brics without totp when 2FA enabled - Should fail"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.post(f"{BASE_URL}/api/exchange/withdraw/brics", headers=headers, json={
            "currency": "brics",
            "amount": 5.0,
            "address": "BRICSPQ1234567890abcdef"  # Valid format BRICS address
        })
        assert response.status_code == 400, f"Withdraw without TOTP should fail with 400, got {response.status_code}"
        
        data = response.json()
        assert "2fa" in data.get("detail", "").lower() or "2fa" in str(data).lower(), f"Should mention 2FA required: {data}"
        print(f"[PASS] BRICS withdrawal without TOTP correctly fails with 2FA required")


class Test09_Disable2FA:
    """Disable 2FA (requires password + TOTP code)"""
    
    def test_disable_2fa_invalid_password(self):
        """POST /api/exchange/2fa/disable with wrong password - Should fail"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        totp = pyotp.TOTP(test_data["totp_secret"])
        valid_code = totp.now()
        
        response = requests.post(f"{BASE_URL}/api/exchange/2fa/disable", headers=headers, json={
            "totp_code": valid_code,
            "password": "wrongpassword123"
        })
        assert response.status_code == 401, f"Disable with wrong password should fail with 401, got {response.status_code}"
        print(f"[PASS] Disable 2FA with wrong password correctly rejected")
    
    def test_disable_2fa_invalid_totp(self):
        """POST /api/exchange/2fa/disable with wrong TOTP - Should fail"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        
        response = requests.post(f"{BASE_URL}/api/exchange/2fa/disable", headers=headers, json={
            "totp_code": "000000",  # Wrong code
            "password": TEST_USER_2FA["password"]
        })
        assert response.status_code == 400, f"Disable with wrong TOTP should fail with 400, got {response.status_code}"
        print(f"[PASS] Disable 2FA with wrong TOTP correctly rejected")
    
    def test_disable_2fa_success(self):
        """POST /api/exchange/2fa/disable with correct password + TOTP - Should succeed"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        totp = pyotp.TOTP(test_data["totp_secret"])
        valid_code = totp.now()
        
        response = requests.post(f"{BASE_URL}/api/exchange/2fa/disable", headers=headers, json={
            "totp_code": valid_code,
            "password": TEST_USER_2FA["password"]
        })
        assert response.status_code == 200, f"Disable 2FA failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing 'message' in response"
        print(f"[PASS] 2FA disabled successfully: {data['message']}")
    
    def test_2fa_status_disabled_after_disable(self):
        """GET /api/exchange/2fa/status - Should be disabled after disable"""
        headers = {"Authorization": f"Bearer {test_data['token']}"}
        response = requests.get(f"{BASE_URL}/api/exchange/2fa/status", headers=headers)
        assert response.status_code == 200, f"2FA status failed: {response.text}"
        
        data = response.json()
        assert data["enabled"] == False, f"2FA should be disabled after disable, got {data['enabled']}"
        print(f"[PASS] 2FA status is now disabled")


class Test10_LoginAfterDisable2FA:
    """Test login works without 2FA after disable"""
    
    def test_login_without_totp_after_disable(self):
        """POST /api/exchange/login without totp after 2FA disabled - Should return token"""
        response = requests.post(f"{BASE_URL}/api/exchange/login", json={
            "email": TEST_USER_2FA["email"],
            "password": TEST_USER_2FA["password"]
        })
        assert response.status_code == 200, f"Login after 2FA disable failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Should return token after 2FA disabled"
        assert "requires_2fa" not in data or data.get("requires_2fa") == False, "Should not require 2FA"
        print(f"[PASS] Login without TOTP works after 2FA disabled")


class Test11_FullTradingFlowWith2FA:
    """Full trading flow: setup 2FA, credit users, place sell, place buy, verify match"""
    
    def test_full_trading_flow(self):
        """Test complete trading flow"""
        # Create two new traders
        trader1 = {"username": f"t1_{uuid.uuid4().hex[:6]}", "email": f"t1_{uuid.uuid4().hex[:6]}@test.com", "password": "test123456"}
        trader2 = {"username": f"t2_{uuid.uuid4().hex[:6]}", "email": f"t2_{uuid.uuid4().hex[:6]}@test.com", "password": "test123456"}
        
        # Register traders
        r1 = requests.post(f"{BASE_URL}/api/exchange/register", json=trader1)
        assert r1.status_code == 200, f"Register trader1 failed: {r1.text}"
        token1 = r1.json()["token"]
        
        r2 = requests.post(f"{BASE_URL}/api/exchange/register", json=trader2)
        assert r2.status_code == 200, f"Register trader2 failed: {r2.text}"
        token2 = r2.json()["token"]
        
        # Credit trader1 with USDT (buyer)
        requests.post(f"{BASE_URL}/api/exchange/admin/credit", json={
            "admin_key": ADMIN_KEY,
            "username": trader1["username"],
            "currency": "usdt",
            "amount": 500.0
        })
        
        # Credit trader2 with BRICS (seller)
        requests.post(f"{BASE_URL}/api/exchange/admin/credit", json={
            "admin_key": ADMIN_KEY,
            "username": trader2["username"],
            "currency": "brics",
            "amount": 10000.0
        })
        
        # Trader2 places SELL order
        headers2 = {"Authorization": f"Bearer {token2}"}
        r_sell = requests.post(f"{BASE_URL}/api/exchange/order", headers=headers2, json={
            "side": "sell",
            "order_type": "limit",
            "price": 0.0088,
            "amount": 1000.0
        })
        assert r_sell.status_code == 200, f"Sell order failed: {r_sell.text}"
        sell_data = r_sell.json()
        print(f"  Sell order placed: {sell_data['order']['order_id'][:8]}..., status={sell_data['order']['status']}")
        
        # Trader1 places BUY order (should match)
        headers1 = {"Authorization": f"Bearer {token1}"}
        r_buy = requests.post(f"{BASE_URL}/api/exchange/order", headers=headers1, json={
            "side": "buy",
            "order_type": "limit",
            "price": 0.0088,
            "amount": 500.0
        })
        assert r_buy.status_code == 200, f"Buy order failed: {r_buy.text}"
        buy_data = r_buy.json()
        
        # Verify match occurred
        assert len(buy_data["fills"]) > 0, "Buy order should have matched with sell"
        fill = buy_data["fills"][0]
        print(f"  Buy order matched! Trade: {fill['amount']} BRICS @ {fill['price']} USDT")
        
        # Verify trader1 now has BRICS
        wallet1 = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers1).json()
        assert wallet1["brics_available"] > 0, f"Trader1 should have BRICS after buy, got {wallet1['brics_available']}"
        
        # Verify trader2 now has USDT
        wallet2 = requests.get(f"{BASE_URL}/api/exchange/wallet", headers=headers2).json()
        assert wallet2["usdt_available"] > 0, f"Trader2 should have USDT after sell, got {wallet2['usdt_available']}"
        
        print(f"[PASS] Full trading flow: Trader1 has {wallet1['brics_available']:.2f} BRICS, Trader2 has {wallet2['usdt_available']:.2f} USDT")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
