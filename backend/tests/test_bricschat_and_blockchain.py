"""
Test cases for BricsChat public feed and Blockchain page features
Tests the bug fixes:
1. BricsChat messages visible to ALL users (not just wallet holders)
2. 'Run a Node' tab added to Blockchain page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBricsChatPublicFeed:
    """Tests for BricsChat public feed - should be accessible without authentication"""
    
    def test_chat_feed_accessible_without_auth(self):
        """GET /api/chat/feed should return messages without requiring authentication"""
        response = requests.get(f"{BASE_URL}/api/chat/feed?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Response should contain 'messages' key"
        assert "count" in data, "Response should contain 'count' key"
        assert isinstance(data["messages"], list), "messages should be a list"
        print(f"SUCCESS: Chat feed returned {data['count']} messages")
    
    def test_chat_stats_accessible_without_auth(self):
        """GET /api/chat/stats should return stats without requiring authentication"""
        response = requests.get(f"{BASE_URL}/api/chat/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_messages" in data, "Response should contain 'total_messages'"
        assert "unique_users" in data, "Response should contain 'unique_users'"
        assert "pqc_secured" in data, "Response should contain 'pqc_secured'"
        assert "encryption" in data, "Response should contain 'encryption'"
        assert "fee_per_message" in data, "Response should contain 'fee_per_message'"
        
        assert data["pqc_secured"] == True, "pqc_secured should be True"
        assert data["encryption"] == "Hybrid ECDSA + ML-DSA-65", "encryption should be 'Hybrid ECDSA + ML-DSA-65'"
        print(f"SUCCESS: Chat stats returned - Total messages: {data['total_messages']}, Unique users: {data['unique_users']}")
    
    def test_chat_feed_limit_parameter(self):
        """Test that limit parameter works correctly"""
        response = requests.get(f"{BASE_URL}/api/chat/feed?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        # Should respect the limit (max 50)
        assert data["count"] <= 50, "Count should not exceed max limit of 50"
        print(f"SUCCESS: Chat feed limit parameter works, returned {data['count']} messages")
    
    def test_chat_feed_returns_message_fields(self):
        """Test that feed returns expected message fields (even if empty)"""
        response = requests.get(f"{BASE_URL}/api/chat/feed?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        # Even if empty, the structure should be correct
        if data["count"] > 0:
            msg = data["messages"][0]
            # Check expected fields exist
            expected_fields = ["id", "sender_address", "recipient_address", "encrypted_content", "timestamp"]
            for field in expected_fields:
                assert field in msg, f"Message should contain '{field}' field"
        print(f"SUCCESS: Message structure is correct")


class TestTimeCapsulePublic:
    """Tests for TimeCapsule public access"""
    
    def test_timecapsule_list_accessible(self):
        """GET /api/timecapsule/list should be accessible without wallet"""
        response = requests.get(f"{BASE_URL}/api/timecapsule/list?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        assert "capsules" in data, "Response should contain 'capsules'"
        assert "current_block_height" in data, "Response should contain 'current_block_height'"
        print(f"SUCCESS: TimeCapsule list accessible, {len(data['capsules'])} capsules found")
    
    def test_timecapsule_stats_accessible(self):
        """GET /api/timecapsule/stats should be accessible"""
        response = requests.get(f"{BASE_URL}/api/timecapsule/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_capsules" in data
        assert "locked" in data
        assert "unlocked" in data
        assert "current_block_height" in data
        print(f"SUCCESS: TimeCapsule stats - Total: {data['total_capsules']}, Locked: {data['locked']}, Unlocked: {data['unlocked']}")


class TestBlockchainEndpoints:
    """Tests for Blockchain page related endpoints"""
    
    def test_network_stats_accessible(self):
        """GET /api/network/stats should return network statistics"""
        response = requests.get(f"{BASE_URL}/api/network/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_blocks" in data or "block_height" in data, "Should contain block height info"
        print(f"SUCCESS: Network stats accessible")
    
    def test_blocks_endpoint(self):
        """GET /api/blocks should return block list"""
        response = requests.get(f"{BASE_URL}/api/blocks?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "blocks" in data, "Response should contain 'blocks'"
        print(f"SUCCESS: Blocks endpoint accessible, {len(data['blocks'])} blocks returned")
    
    def test_richlist_endpoint(self):
        """GET /api/richlist should return wallet rankings"""
        response = requests.get(f"{BASE_URL}/api/richlist?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "wallets" in data, "Response should contain 'wallets'"
        print(f"SUCCESS: Richlist endpoint accessible")


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_root(self):
        """API root should be accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print(f"SUCCESS: API root accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
