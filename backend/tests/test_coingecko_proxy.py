"""
Test BricsCoin CoinGecko Proxy Endpoint
Tests for the /api/prices/crypto endpoint that proxies CoinGecko price data
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCoinGeckoPriceProxy:
    """Tests for the /api/prices/crypto endpoint"""
    
    def test_prices_crypto_returns_200(self):
        """GET /api/prices/crypto should return 200"""
        response = requests.get(f"{BASE_URL}/api/prices/crypto", timeout=15)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/prices/crypto returns 200")
    
    def test_prices_crypto_returns_json(self):
        """GET /api/prices/crypto should return valid JSON"""
        response = requests.get(f"{BASE_URL}/api/prices/crypto", timeout=15)
        data = response.json()
        assert isinstance(data, dict), "Response should be a dict"
        print(f"✓ Response is valid JSON dict with {len(data)} keys")
    
    def test_prices_crypto_has_bitcoin(self):
        """Response should contain bitcoin price data"""
        response = requests.get(f"{BASE_URL}/api/prices/crypto", timeout=15)
        data = response.json()
        assert "bitcoin" in data, "Response should contain 'bitcoin'"
        assert "usd" in data["bitcoin"], "Bitcoin should have 'usd' price"
        print(f"✓ Bitcoin price: ${data['bitcoin']['usd']}")
    
    def test_prices_crypto_has_ethereum(self):
        """Response should contain ethereum price data"""
        response = requests.get(f"{BASE_URL}/api/prices/crypto", timeout=15)
        data = response.json()
        assert "ethereum" in data, "Response should contain 'ethereum'"
        assert "usd" in data["ethereum"], "Ethereum should have 'usd' price"
        print(f"✓ Ethereum price: ${data['ethereum']['usd']}")
    
    def test_prices_crypto_has_tether(self):
        """Response should contain tether (USDT) price data"""
        response = requests.get(f"{BASE_URL}/api/prices/crypto", timeout=15)
        data = response.json()
        assert "tether" in data, "Response should contain 'tether'"
        assert "usd" in data["tether"], "Tether should have 'usd' price"
        print(f"✓ Tether price: ${data['tether']['usd']}")
    
    def test_prices_crypto_has_expected_coins(self):
        """Response should contain all expected cryptocurrency data"""
        response = requests.get(f"{BASE_URL}/api/prices/crypto", timeout=15)
        data = response.json()
        expected_coins = ["bitcoin", "ethereum", "tether"]
        for coin in expected_coins:
            assert coin in data, f"Response should contain '{coin}'"
            assert "usd" in data.get(coin, {}), f"'{coin}' should have 'usd' price"
        print(f"✓ All expected coins present: {expected_coins}")
    
    def test_prices_crypto_cache_performance(self):
        """Second call should be fast (cached) - under 500ms"""
        # First call to ensure data is cached
        requests.get(f"{BASE_URL}/api/prices/crypto", timeout=15)
        
        # Second call should be cached
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/prices/crypto", timeout=5)
        elapsed_ms = (time.time() - start) * 1000
        
        assert response.status_code == 200
        print(f"✓ Cached response time: {elapsed_ms:.0f}ms")
        # Cached response should be fast, but we allow some margin
        assert elapsed_ms < 500, f"Cached response should be <500ms, got {elapsed_ms:.0f}ms"


@pytest.fixture(scope="module")
def api_session():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
