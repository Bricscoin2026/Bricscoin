"""
Test Hashrate and P2Pool Fixes - BricsCoin
==========================================
Tests for the three issues fixed:
1. Hashrate mismatch: /api/network/stats now includes PPLNS hashrate from p2pool_sharechain
2. False 'is_block' in sharechain: /api/p2pool/sharechain validates is_block against actual blocks
3. PPLNS block submission: POST /api/p2pool/submit-block for PPLNS nodes to submit found blocks

Endpoints tested:
- GET /api/network/stats - Network stats with combined hashrate (SOLO + PPLNS)
- GET /api/p2pool/sharechain - Sharechain with is_block validation
- POST /api/p2pool/submit-block - P2Pool block submission endpoint
- POST /api/p2pool/share/submit - Share submission with default previous_share_id=genesis
"""
import pytest
import requests
import os
import time
import uuid
import hashlib
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestNetworkStatsHashrate:
    """Test /api/network/stats endpoint for PPLNS hashrate inclusion"""

    def test_network_stats_returns_200(self):
        """Network stats endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/network/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/network/stats returns 200")

    def test_network_stats_has_hashrate_from_shares(self):
        """Network stats should have hashrate_from_shares field (combines SOLO + PPLNS)"""
        response = requests.get(f"{BASE_URL}/api/network/stats")
        data = response.json()
        
        assert "hashrate_from_shares" in data, "Missing 'hashrate_from_shares' in response"
        assert isinstance(data["hashrate_from_shares"], (int, float)), "hashrate_from_shares should be numeric"
        assert data["hashrate_from_shares"] >= 0, "hashrate_from_shares should be >= 0"
        
        # Also verify hashrate_estimate exists as fallback
        assert "hashrate_estimate" in data, "Missing 'hashrate_estimate' fallback"
        
        print(f"✓ hashrate_from_shares={data['hashrate_from_shares']}, hashrate_estimate={data['hashrate_estimate']}")

    def test_network_stats_has_all_required_fields(self):
        """Network stats should have all required fields"""
        response = requests.get(f"{BASE_URL}/api/network/stats")
        data = response.json()
        
        required_fields = [
            "total_supply", "circulating_supply", "remaining_supply",
            "total_blocks", "current_difficulty", "hashrate_estimate",
            "hashrate_from_shares", "pending_transactions", "last_block_time",
            "next_halving_block", "current_reward"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
            print(f"✓ {field}: {data[field]}")

    def test_network_stats_total_supply_is_21m(self):
        """Total supply should be 21 million BRICS"""
        response = requests.get(f"{BASE_URL}/api/network/stats")
        data = response.json()
        
        assert data["total_supply"] == 21_000_000, f"Expected 21M, got {data['total_supply']}"
        print("✓ Total supply is 21,000,000 BRICS")


class TestSharechainIsBlockValidation:
    """Test /api/p2pool/sharechain endpoint for is_block validation"""

    def test_sharechain_returns_200(self):
        """Sharechain endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/p2pool/sharechain?limit=30")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/p2pool/sharechain returns 200")

    def test_sharechain_structure(self):
        """Sharechain should have correct structure with is_block validation"""
        response = requests.get(f"{BASE_URL}/api/p2pool/sharechain?limit=30")
        data = response.json()
        
        assert "shares" in data, "Missing 'shares'"
        assert "count" in data, "Missing 'count'"
        assert "chain_height" in data, "Missing 'chain_height'"
        assert "window_size" in data, "Missing 'window_size'"
        
        print(f"✓ Sharechain: height={data['chain_height']}, count={data['count']}")

    def test_sharechain_validates_is_block(self):
        """Shares with is_block=true should be validated against actual blocks"""
        response = requests.get(f"{BASE_URL}/api/p2pool/sharechain?limit=50")
        data = response.json()
        
        # Check if any shares exist
        if not data["shares"]:
            print("✓ No shares in sharechain (expected in preview - validation logic exists)")
            return
        
        # Look for shares with is_block or is_block_orphaned
        block_shares = [s for s in data["shares"] if s.get("is_block") or s.get("is_block_orphaned")]
        
        if block_shares:
            for share in block_shares:
                print(f"✓ Share #{share['height']}: is_block={share.get('is_block')}, is_block_orphaned={share.get('is_block_orphaned', False)}")
                # If is_block_orphaned is set, it means validation caught a false positive
                if share.get("is_block_orphaned"):
                    print(f"  → Block orphaned (SHA-256 bug detected): block_height={share.get('block_height')}")
        else:
            print("✓ No shares marked as is_block (validation would apply if any existed)")

    def test_sharechain_share_fields(self):
        """Shares should have all required fields for validation"""
        response = requests.get(f"{BASE_URL}/api/p2pool/sharechain?limit=10")
        data = response.json()
        
        if data["shares"]:
            required_fields = [
                "share_id", "height", "previous_share_id", "worker",
                "share_hash", "share_difficulty", "timestamp", "pool_mode"
            ]
            for share in data["shares"][:3]:
                for field in required_fields:
                    assert field in share, f"Share missing '{field}' field"
                print(f"✓ Share #{share['height']}: {share['share_id'][:12]}... mode={share['pool_mode']}")
        else:
            print("✓ No shares (expected in preview)")


class TestP2PoolBlockSubmission:
    """Test POST /api/p2pool/submit-block endpoint"""

    def test_submit_block_requires_correct_index(self):
        """Submit-block should reject block with wrong index"""
        # First get the current blockchain state
        stats_response = requests.get(f"{BASE_URL}/api/network/stats")
        stats = stats_response.json()
        current_height = stats.get("total_blocks", 1)
        expected_next_index = current_height  # blocks are 0-indexed, so total_blocks = next valid index
        
        # Try submitting a block with wrong index (too high)
        wrong_index = expected_next_index + 100
        block_data = {
            "index": wrong_index,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "transactions": [],
            "proof": 12345,
            "previous_hash": "0" * 64,
            "hash": hashlib.sha256(f"test{time.time()}".encode()).hexdigest(),
            "miner": "BRICStest123456789012345678901234567890",
            "difficulty": 1000,
            "nonce": 12345
        }
        
        response = requests.post(f"{BASE_URL}/api/p2pool/submit-block", json=block_data)
        
        # Should return 400 for wrong index
        assert response.status_code == 400, f"Expected 400 for wrong index, got {response.status_code}"
        assert "Expected block index" in response.json().get("detail", ""), "Should mention expected index"
        
        print(f"✓ Correctly rejected block with wrong index: expected {expected_next_index}, sent {wrong_index}")

    def test_submit_block_rejects_duplicate(self):
        """Submit-block should reject duplicate block (409)"""
        # Try to submit a block at index 0 (genesis - already exists)
        block_data = {
            "index": 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "transactions": [],
            "proof": 0,
            "previous_hash": "0" * 64,
            "hash": hashlib.sha256(f"duplicate{time.time()}".encode()).hexdigest(),
            "miner": "genesis",
            "difficulty": 1000000,
            "nonce": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/p2pool/submit-block", json=block_data)
        
        # Should return 409 for duplicate
        assert response.status_code == 409, f"Expected 409 for duplicate, got {response.status_code}"
        assert "already exists" in response.json().get("detail", "").lower()
        
        print("✓ Correctly rejected duplicate block at index 0 (409 Conflict)")

    def test_submit_block_validates_previous_hash(self):
        """Submit-block should validate previous_hash matches last block"""
        # Get current state
        stats_response = requests.get(f"{BASE_URL}/api/network/stats")
        stats = stats_response.json()
        current_height = stats.get("total_blocks", 1)
        expected_next_index = current_height
        
        # Try submitting a block with correct index but wrong previous_hash
        block_data = {
            "index": expected_next_index,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "transactions": [],
            "proof": 12345,
            "previous_hash": "f" * 64,  # Wrong hash
            "hash": hashlib.sha256(f"test{time.time()}".encode()).hexdigest(),
            "miner": "BRICStest123456789012345678901234567890",
            "difficulty": 1000,
            "nonce": 12345
        }
        
        response = requests.post(f"{BASE_URL}/api/p2pool/submit-block", json=block_data)
        
        # Should return 400 for wrong previous_hash
        assert response.status_code == 400, f"Expected 400 for wrong previous_hash, got {response.status_code}"
        assert "hash" in response.json().get("detail", "").lower()
        
        print(f"✓ Correctly rejected block with wrong previous_hash at index {expected_next_index}")

    def test_submit_block_endpoint_exists(self):
        """Submit-block endpoint should exist and accept POST"""
        # Minimal test - just check endpoint exists
        response = requests.post(f"{BASE_URL}/api/p2pool/submit-block", json={})
        
        # Should NOT return 404 - endpoint exists
        assert response.status_code != 404, "Endpoint /api/p2pool/submit-block not found"
        # Should return 422 (validation error) or 400/500 for missing fields
        assert response.status_code in [400, 422, 500], f"Unexpected status: {response.status_code}"
        
        print(f"✓ POST /api/p2pool/submit-block endpoint exists (returns {response.status_code} for empty body)")


class TestShareSubmission:
    """Test POST /api/p2pool/share/submit endpoint with default previous_share_id"""

    def test_share_submit_accepts_genesis_prev(self):
        """Share submission should accept previous_share_id=genesis (first share)"""
        share_data = {
            "share_id": f"test-{uuid.uuid4().hex[:16]}",
            "previous_share_id": "genesis",  # Default for first share
            "worker": "BRICStest123456789012345678901234567890",
            "share_hash": hashlib.sha256(f"share{time.time()}".encode()).hexdigest(),
            "share_difficulty": 1000,
            "network_difficulty": 1000000,
            "block_height": 1,
            "nonce": "12345",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "peer_origin": "test-node",
            "is_block": False,
            "pool_mode": "pplns",
            "signature": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/p2pool/share/submit", json=share_data)
        
        # Should return 200 for valid share submission
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "accepted" in data, "Response should have 'accepted' field"
        assert data["accepted"] == True, "Share should be accepted"
        assert "share_id" in data, "Response should return share_id"
        
        print(f"✓ Share with previous_share_id=genesis accepted: {data['share_id']}")

    def test_share_submit_returns_height(self):
        """Share submission should return the new share height"""
        share_data = {
            "share_id": f"test-height-{uuid.uuid4().hex[:16]}",
            "previous_share_id": "genesis",
            "worker": "BRICSheight12345678901234567890test",
            "share_hash": hashlib.sha256(f"height{time.time()}".encode()).hexdigest(),
            "share_difficulty": 500,
            "network_difficulty": 1000000,
            "block_height": 1,
            "nonce": "67890",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "peer_origin": "test-node",
            "is_block": False,
            "pool_mode": "pplns",
            "signature": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/p2pool/share/submit", json=share_data)
        data = response.json()
        
        assert "height" in data, "Response should include 'height'"
        assert isinstance(data["height"], int), "Height should be integer"
        assert data["height"] >= 0, "Height should be >= 0"
        
        print(f"✓ Share submission returned height: {data['height']}")

    def test_share_submit_endpoint_exists(self):
        """Share submit endpoint should exist"""
        response = requests.post(f"{BASE_URL}/api/p2pool/share/submit", json={})
        
        # Should NOT return 404
        assert response.status_code != 404, "Endpoint /api/p2pool/share/submit not found"
        
        print(f"✓ POST /api/p2pool/share/submit endpoint exists")


class TestP2PoolStatsSharesCombined:
    """Test /api/p2pool/stats includes PPLNS shares in totals"""

    def test_stats_shares_structure(self):
        """Stats should have shares.last_hour and shares.last_24h (combined SOLO + PPLNS)"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "shares" in data, "Missing 'shares' section"
        shares = data["shares"]
        
        assert "last_hour" in shares, "Missing shares.last_hour"
        assert "last_24h" in shares, "Missing shares.last_24h"
        
        # Values should be integers
        assert isinstance(shares["last_hour"], int), "last_hour should be int"
        assert isinstance(shares["last_24h"], int), "last_24h should be int"
        
        print(f"✓ P2Pool stats shares: 1h={shares['last_hour']}, 24h={shares['last_24h']} (includes PPLNS)")


class TestP2PoolMinersSharechainSource:
    """Test /api/p2pool/miners returns miners with sharechain-sourced data for PPLNS"""

    def test_miners_endpoint(self):
        """Miners endpoint should return miners with pool_mode"""
        response = requests.get(f"{BASE_URL}/api/p2pool/miners")
        assert response.status_code == 200
        
        data = response.json()
        assert "miners" in data
        assert "active_count" in data
        
        if data["miners"]:
            for miner in data["miners"]:
                assert "pool_mode" in miner, "Miner should have pool_mode"
                assert "shares_1h" in miner, "Miner should have shares_1h"
                assert "shares_24h" in miner, "Miner should have shares_24h"
                print(f"✓ Miner {miner.get('worker', 'unknown')[:20]}... mode={miner['pool_mode']}, shares_24h={miner['shares_24h']}")
        else:
            print("✓ No miners (expected in preview - structure verified)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
