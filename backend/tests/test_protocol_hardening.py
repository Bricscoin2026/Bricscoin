"""
Test suite for Protocol Hardening features:
1. GET /api/pqc/stats - Optimized PQC statistics endpoint (sub-300ms response)
2. GET /api/network/stats - Network statistics (rate limit exempt)
3. GET /api/dandelion/status - Dandelion++ protocol status
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPQCStats:
    """Test /api/pqc/stats endpoint optimization"""
    
    def test_pqc_stats_returns_200(self):
        """PQC stats endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/pqc/stats", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: /api/pqc/stats returns 200")
    
    def test_pqc_stats_response_fields(self):
        """PQC stats should have all required fields"""
        response = requests.get(f"{BASE_URL}/api/pqc/stats", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "total_pqc_wallets",
            "total_pqc_transactions", 
            "total_pqc_blocks",
            "total_blocks",
            "signature_scheme",
            "quantum_resistant",
            "status"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
            print(f"PASS: Field '{field}' present with value: {data[field]}")
        
        # Validate data types
        assert isinstance(data["total_pqc_wallets"], int)
        assert isinstance(data["total_pqc_transactions"], int)
        assert isinstance(data["total_pqc_blocks"], int)
        assert isinstance(data["total_blocks"], int)
        assert isinstance(data["quantum_resistant"], bool)
        assert data["quantum_resistant"] == True
        assert data["status"] == "active"
        print("PASS: All field types validated")
    
    def test_pqc_stats_response_time(self):
        """PQC stats should respond in under 300ms"""
        # Warm up cache first
        requests.get(f"{BASE_URL}/api/pqc/stats", timeout=10)
        
        # Time 3 requests and take the average
        times = []
        for i in range(3):
            start = time.time()
            response = requests.get(f"{BASE_URL}/api/pqc/stats", timeout=10)
            elapsed = (time.time() - start) * 1000  # Convert to ms
            times.append(elapsed)
            assert response.status_code == 200
        
        avg_time = sum(times) / len(times)
        print(f"Response times: {times}")
        print(f"Average response time: {avg_time:.2f}ms")
        
        # Should be under 300ms (with cache, should be very fast)
        assert avg_time < 300, f"Response too slow: {avg_time:.2f}ms > 300ms"
        print(f"PASS: /api/pqc/stats responds in {avg_time:.2f}ms (< 300ms)")


class TestNetworkStats:
    """Test /api/network/stats endpoint (rate limit exempt)"""
    
    def test_network_stats_returns_200(self):
        """Network stats endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/network/stats", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: /api/network/stats returns 200")
    
    def test_network_stats_response_fields(self):
        """Network stats should have all required fields"""
        response = requests.get(f"{BASE_URL}/api/network/stats", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "total_supply",
            "circulating_supply",
            "total_blocks",
            "current_difficulty"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
            print(f"PASS: Field '{field}' present with value: {data[field]}")
        
        # Validate data types and values
        assert isinstance(data["total_supply"], (int, float))
        assert data["total_supply"] == 21_000_000  # BricsCoin max supply
        assert isinstance(data["circulating_supply"], (int, float))
        assert isinstance(data["total_blocks"], int)
        assert isinstance(data["current_difficulty"], int)
        print("PASS: All field types validated")
    
    def test_network_stats_response_time(self):
        """Network stats should respond in under 300ms"""
        # Warm up cache first
        requests.get(f"{BASE_URL}/api/network/stats", timeout=10)
        
        # Time 3 requests and take the average
        times = []
        for i in range(3):
            start = time.time()
            response = requests.get(f"{BASE_URL}/api/network/stats", timeout=10)
            elapsed = (time.time() - start) * 1000  # Convert to ms
            times.append(elapsed)
            assert response.status_code == 200
        
        avg_time = sum(times) / len(times)
        print(f"Response times: {times}")
        print(f"Average response time: {avg_time:.2f}ms")
        
        # Should be under 300ms
        assert avg_time < 300, f"Response too slow: {avg_time:.2f}ms > 300ms"
        print(f"PASS: /api/network/stats responds in {avg_time:.2f}ms (< 300ms)")
    
    def test_network_stats_not_rate_limited(self):
        """Network stats should not be rate limited (multiple rapid requests)"""
        success_count = 0
        for i in range(10):
            response = requests.get(f"{BASE_URL}/api/network/stats", timeout=10)
            if response.status_code == 200:
                success_count += 1
        
        assert success_count == 10, f"Rate limited! Only {success_count}/10 requests succeeded"
        print(f"PASS: /api/network/stats not rate limited ({success_count}/10 requests succeeded)")


class TestDandelionStatus:
    """Test /api/dandelion/status endpoint"""
    
    def test_dandelion_status_returns_200(self):
        """Dandelion status endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dandelion/status", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: /api/dandelion/status returns 200")
    
    def test_dandelion_status_response_structure(self):
        """Dandelion status should have proper structure"""
        response = requests.get(f"{BASE_URL}/api/dandelion/status", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        # Check required top-level fields
        assert data["protocol"] == "Dandelion++"
        assert data["enabled"] == True
        assert "config" in data
        assert "state" in data
        assert "description" in data
        
        # Check config fields
        config = data["config"]
        assert "epoch_seconds" in config
        assert "stem_probability" in config
        assert "max_stem_hops" in config
        assert "embargo_seconds" in config
        
        # Check state fields
        state = data["state"]
        assert "status" in state
        assert state["status"] in ["active", "ready"]
        
        print(f"PASS: Dandelion++ status response structure valid")
        print(f"  Protocol: {data['protocol']}")
        print(f"  Enabled: {data['enabled']}")
        print(f"  State: {state['status']}")


class TestRateLimitConfiguration:
    """Test that rate limiting is configured correctly"""
    
    def test_read_endpoints_not_rate_limited(self):
        """Read-only endpoints should handle multiple rapid requests"""
        endpoints = [
            "/api/network/stats",
            "/api/pqc/stats",
            "/api/dandelion/status"
        ]
        
        for endpoint in endpoints:
            success_count = 0
            for i in range(5):
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
                if response.status_code == 200:
                    success_count += 1
            
            assert success_count == 5, f"Endpoint {endpoint} rate limited! {success_count}/5 succeeded"
            print(f"PASS: {endpoint} handled 5 rapid requests successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
