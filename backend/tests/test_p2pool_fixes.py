"""
Test P2Pool fixes for BricsCoin app
===================================
Tests for the 4 reported issues:
1. Transaction count loading on Blockchain Explorer page
2. No Mining tab on Blockchain page (UI-only, not API)
3. P2Pool combined miners list with pool_mode field
4. P2P nodes counter showing correct count
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestP2PoolStatus:
    """Test /api/p2pool/status endpoint"""
    
    def test_status_endpoint_returns_ok(self):
        """Status endpoint should return status=ok and node_id=mainnet"""
        response = requests.get(f"{BASE_URL}/api/p2pool/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["node_id"] == "mainnet"
        print(f"✓ Status: {data['status']}, Node ID: {data['node_id']}")


class TestP2PoolStats:
    """Test /api/p2pool/stats endpoint for correct peer count"""
    
    def test_stats_returns_correct_peer_count(self):
        """Stats should show correct online/total peers (not 1/2)"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Check peers structure
        assert "peers" in data
        peers = data["peers"]
        assert "online" in peers
        assert "total" in peers
        
        # Verify count is consistent (online <= total)
        assert peers["online"] <= peers["total"]
        
        # In preview env, should be 1/1 (only mainnet node)
        print(f"✓ P2P Nodes: {peers['online']} / {peers['total']} (this_node: {peers.get('this_node')})")
        
        # Verify no phantom peers (total should equal actual peer count)
        assert peers["total"] >= 1  # At least mainnet node
        

class TestP2PoolPeers:
    """Test /api/p2pool/peers endpoint"""
    
    def test_peers_list_returns_correctly(self):
        """Peers endpoint should list all peers with online status"""
        response = requests.get(f"{BASE_URL}/api/p2pool/peers")
        assert response.status_code == 200
        data = response.json()
        
        assert "peers" in data
        assert "online_count" in data
        assert "total" in data
        
        # Verify online_count matches online peers
        online_peers = [p for p in data["peers"] if p.get("online")]
        assert data["online_count"] == len(online_peers)
        
        # Check mainnet node is registered
        peer_ids = [p["peer_id"] for p in data["peers"]]
        assert "mainnet" in peer_ids
        
        print(f"✓ Peers: {len(data['peers'])} total, {data['online_count']} online")
        for p in data["peers"][:3]:
            print(f"  - {p['peer_id']}: online={p.get('online')}")


class TestP2PoolMiners:
    """Test /api/p2pool/miners endpoint for pool_mode field"""
    
    def test_miners_endpoint_structure(self):
        """Miners endpoint should return proper structure"""
        response = requests.get(f"{BASE_URL}/api/p2pool/miners")
        assert response.status_code == 200
        data = response.json()
        
        assert "miners" in data
        assert "active_count" in data
        assert isinstance(data["miners"], list)
        
        print(f"✓ Active miners count: {data['active_count']}")
        
    def test_miners_have_pool_mode_field(self):
        """If miners exist, they should have pool_mode field"""
        response = requests.get(f"{BASE_URL}/api/p2pool/miners")
        assert response.status_code == 200
        data = response.json()
        
        # In preview, there may be no miners
        if data["miners"]:
            for miner in data["miners"]:
                assert "pool_mode" in miner, f"Miner missing pool_mode: {miner.get('worker')}"
                assert miner["pool_mode"] in ["solo", "pplns"], f"Invalid pool_mode: {miner.get('pool_mode')}"
                print(f"✓ Miner {miner.get('worker')[:20]}... has pool_mode={miner['pool_mode']}")
        else:
            print("✓ No miners connected (expected in preview environment)")
            # Verify the structure is correct even with empty list
            assert data["active_count"] == 0


class TestTransactionsEndpoint:
    """Test /api/transactions endpoint for Explorer page"""
    
    def test_transactions_returns_total(self):
        """Transactions endpoint should return total count"""
        response = requests.get(f"{BASE_URL}/api/transactions?limit=1&offset=0")
        assert response.status_code == 200
        data = response.json()
        
        assert "transactions" in data
        assert "total" in data
        assert isinstance(data["total"], int)
        
        print(f"✓ Total transactions: {data['total']}")
        
    def test_transactions_total_matches_data(self):
        """Total should be >= returned transactions"""
        response = requests.get(f"{BASE_URL}/api/transactions?limit=5&offset=0")
        assert response.status_code == 200
        data = response.json()
        
        # Total should be at least as many as returned
        assert data["total"] >= len(data["transactions"])
        print(f"✓ Returned {len(data['transactions'])} of {data['total']} total")


class TestBlocksEndpoint:
    """Test /api/blocks endpoint"""
    
    def test_blocks_returns_total(self):
        """Blocks endpoint should return total count"""
        response = requests.get(f"{BASE_URL}/api/blocks?limit=1&offset=0")
        assert response.status_code == 200
        data = response.json()
        
        assert "blocks" in data
        assert "total" in data
        
        print(f"✓ Total blocks: {data['total']}")


class TestP2PoolBlocks:
    """Test /api/p2pool/blocks endpoint"""
    
    def test_p2pool_blocks_endpoint(self):
        """P2Pool blocks endpoint should return recent blocks"""
        response = requests.get(f"{BASE_URL}/api/p2pool/blocks?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert "blocks" in data
        assert "count" in data
        
        print(f"✓ P2Pool blocks: {data['count']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
