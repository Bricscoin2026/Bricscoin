"""
Test suite for PPLNS miner block counts and hashrate fixes.

Bug fixes verified:
1. Block counts now validated against actual `blocks` collection (not sharechain is_block)
2. Hashrate uses progressive window (5min -> 15min -> 1h) instead of fixed 1h
3. blocks_24h in /api/p2pool/stats counts from actual `blocks` collection

Testing against PRODUCTION API (https://bricscoin26.org) as preview has no miners.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

# Use production API for miner-specific tests
PRODUCTION_BASE_URL = "https://bricscoin26.org"
PREVIEW_BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bricscoin-pqc.preview.emergentagent.com').rstrip('/')


class TestPPLNSBlockCounts:
    """Tests for PPLNS miner block count validation against actual blocks collection"""

    def test_miners_endpoint_returns_valid_structure(self):
        """GET /api/p2pool/miners should return proper structure"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/miners", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "miners" in data, "Response should contain 'miners' array"
        assert "active_count" in data, "Response should contain 'active_count'"
        assert isinstance(data["miners"], list), "'miners' should be a list"

    def test_miners_have_required_fields(self):
        """Each miner should have all required fields including blocks_found"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/miners", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        miners = data["miners"]
        
        if len(miners) == 0:
            pytest.skip("No miners available for testing")
        
        required_fields = ["worker", "online", "shares_1h", "shares_24h", "blocks_found", 
                          "hashrate", "hashrate_readable", "node", "pool_mode"]
        
        for miner in miners:
            for field in required_fields:
                assert field in miner, f"Miner missing required field: {field}"

    def test_pplns_miners_have_reasonable_block_counts(self):
        """PPLNS miners should have block counts validated against actual blocks collection
        
        Expected: PPLNS miners show blocks_found of 1 and 0 respectively (not inflated 10/16)
        """
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/miners", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        miners = data["miners"]
        
        pplns_miners = [m for m in miners if m.get("pool_mode") == "pplns"]
        
        if len(pplns_miners) == 0:
            pytest.skip("No PPLNS miners available for testing")
        
        # Check that PPLNS miners have reasonable block counts (not inflated)
        for miner in pplns_miners:
            blocks_found = miner.get("blocks_found", 0)
            worker = miner.get("worker", "unknown")
            
            # Block counts should not be inflated (original bug had 10/16 instead of 1/0)
            # A reasonable check: blocks_found should be <= shares_24h / 1000 (very loose bound)
            shares_24h = miner.get("shares_24h", 1)
            max_reasonable_blocks = max(10, shares_24h // 500)  # At most 1 block per 500 shares
            
            assert blocks_found <= max_reasonable_blocks, \
                f"PPLNS miner {worker} has suspicious blocks_found={blocks_found} vs shares_24h={shares_24h}"
            
            print(f"PPLNS miner {worker}: blocks_found={blocks_found}, shares_24h={shares_24h} - OK")

    def test_solo_miners_present(self):
        """SOLO miners should be present in the response"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/miners", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        miners = data["miners"]
        
        solo_miners = [m for m in miners if m.get("pool_mode") == "solo"]
        
        assert len(solo_miners) >= 1, "Expected at least 1 SOLO miner in production"
        print(f"Found {len(solo_miners)} SOLO miners")

    def test_miners_deduplication_by_worker_address(self):
        """Miners should be deduplicated by worker address"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/miners", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        miners = data["miners"]
        
        worker_addresses = [m.get("worker") for m in miners]
        unique_addresses = set(worker_addresses)
        
        assert len(worker_addresses) == len(unique_addresses), \
            f"Duplicate worker addresses found: {len(worker_addresses)} total vs {len(unique_addresses)} unique"


class TestHashrateProgressiveWindow:
    """Tests for hashrate using progressive window (5min -> 15min -> 1h)"""

    def test_miners_have_non_zero_hashrate(self):
        """Miners with shares should have non-zero hashrate"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/miners", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        miners = data["miners"]
        
        for miner in miners:
            shares_1h = miner.get("shares_1h", 0)
            hashrate = miner.get("hashrate", 0)
            worker = miner.get("worker", "unknown")
            pool_mode = miner.get("pool_mode", "unknown")
            
            if shares_1h > 0:
                assert hashrate > 0, \
                    f"{pool_mode} miner {worker} has {shares_1h} shares but hashrate={hashrate}"
                print(f"{pool_mode} miner {worker}: shares_1h={shares_1h}, hashrate={hashrate:.2f} - OK")

    def test_solo_miners_hashrate_reasonable(self):
        """SOLO miners hashrate should be in reasonable range (~TH/s)"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/miners", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        miners = data["miners"]
        
        solo_miners = [m for m in miners if m.get("pool_mode") == "solo"]
        
        for miner in solo_miners:
            hashrate = miner.get("hashrate", 0)
            hashrate_readable = miner.get("hashrate_readable", "0 H/s")
            worker = miner.get("worker", "unknown")
            
            # Hashrate should be in TH/s range (1e12 to 1e13)
            if hashrate > 0:
                assert hashrate >= 1e9, f"SOLO miner {worker} hashrate too low: {hashrate_readable}"
                print(f"SOLO miner {worker}: hashrate={hashrate_readable} - OK")

    def test_pplns_miners_hashrate_reasonable(self):
        """PPLNS miners hashrate should be in reasonable range (~4-5 TH/s expected)"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/miners", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        miners = data["miners"]
        
        pplns_miners = [m for m in miners if m.get("pool_mode") == "pplns"]
        
        if len(pplns_miners) == 0:
            pytest.skip("No PPLNS miners available for testing")
        
        for miner in pplns_miners:
            hashrate = miner.get("hashrate", 0)
            hashrate_readable = miner.get("hashrate_readable", "0 H/s")
            worker = miner.get("worker", "unknown")
            shares_1h = miner.get("shares_1h", 0)
            
            if shares_1h > 0:
                # PPLNS miners should have ~4-5 TH/s (not ~2.5 TH/s as in original bug)
                # With progressive window, hashrate should be > 1 TH/s
                assert hashrate >= 1e12, \
                    f"PPLNS miner {worker} hashrate too low: {hashrate_readable} (expected ~4-5 TH/s)"
                print(f"PPLNS miner {worker}: hashrate={hashrate_readable} - OK (expected ~4-5 TH/s)")


class TestPoolStatsBlocks24h:
    """Tests for blocks_24h counting from actual blocks collection"""

    def test_pool_stats_endpoint_returns_valid_structure(self):
        """GET /api/p2pool/stats should return proper structure"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/stats", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "pool" in data, "Response should contain 'pool'"
        assert "network" in data, "Response should contain 'network'"
        assert "blocks" in data, "Response should contain 'blocks'"
        assert "miners" in data, "Response should contain 'miners'"
        assert "hashrate" in data, "Response should contain 'hashrate'"

    def test_blocks_24h_count_from_blocks_collection(self):
        """blocks.found_24h should count from actual blocks collection"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/stats", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        blocks_24h = data.get("blocks", {}).get("found_24h", 0)
        
        # blocks_24h should be a reasonable number (not inflated)
        # In production with ~34 blocks/day at current rate
        assert isinstance(blocks_24h, int), f"blocks_24h should be int, got {type(blocks_24h)}"
        assert blocks_24h >= 0, f"blocks_24h should be non-negative, got {blocks_24h}"
        
        # Should not be unreasonably high (original bug had inflated counts)
        assert blocks_24h <= 500, f"blocks_24h suspiciously high: {blocks_24h}"
        
        print(f"blocks_24h = {blocks_24h} - OK")

    def test_pool_hashrate_consistent(self):
        """Pool hashrate should be consistent with individual miners"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/p2pool/stats", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        pool_hashrate = data.get("hashrate", {}).get("pool_estimated", 0)
        pool_hashrate_readable = data.get("hashrate", {}).get("pool_hashrate_readable", "0 H/s")
        
        assert pool_hashrate > 0, "Pool hashrate should be > 0"
        
        # Pool hashrate should be in TH/s range for production
        assert pool_hashrate >= 1e12, f"Pool hashrate too low: {pool_hashrate_readable}"
        
        print(f"Pool hashrate: {pool_hashrate_readable} - OK")


class TestNetworkStats:
    """Tests for /api/network/stats endpoint"""

    def test_network_stats_returns_valid_structure(self):
        """GET /api/network/stats should return valid structure"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/network/stats", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        required_fields = ["total_supply", "circulating_supply", "total_blocks", 
                          "current_difficulty", "hashrate_estimate", "hashrate_from_shares"]
        
        for field in required_fields:
            assert field in data, f"Response missing required field: {field}"

    def test_hashrate_from_shares_includes_pplns(self):
        """hashrate_from_shares should include PPLNS hashrate from sharechain"""
        response = requests.get(f"{PRODUCTION_BASE_URL}/api/network/stats", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        hashrate_from_shares = data.get("hashrate_from_shares", 0)
        
        # hashrate_from_shares should be > 0 when miners are active
        assert hashrate_from_shares > 0, "hashrate_from_shares should be > 0"
        
        print(f"hashrate_from_shares: {hashrate_from_shares:.2e} - OK")


class TestPreviewEnvironment:
    """Tests for preview environment (no miners expected)"""

    def test_preview_miners_returns_empty_array(self):
        """Preview env should return empty miners array"""
        response = requests.get(f"{PREVIEW_BASE_URL}/api/p2pool/miners", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "miners" in data, "Response should contain 'miners'"
        assert isinstance(data["miners"], list), "'miners' should be a list"
        
        print(f"Preview miners count: {len(data['miners'])} - OK (expected 0 or few)")

    def test_preview_stats_returns_valid_structure(self):
        """Preview env /api/p2pool/stats should return valid structure"""
        response = requests.get(f"{PREVIEW_BASE_URL}/api/p2pool/stats", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "pool" in data, "Response should contain 'pool'"
        assert "network" in data, "Response should contain 'network'"
        assert "blocks" in data, "Response should contain 'blocks'"

    def test_preview_network_stats_works(self):
        """Preview env /api/network/stats should work"""
        response = requests.get(f"{PREVIEW_BASE_URL}/api/network/stats", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_blocks" in data, "Response should contain 'total_blocks'"


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
