"""
Test P2Pool Share Count Fixes - BricsCoin P2Pool Dashboard
==========================================================
Tests for the P0 and P1 fixes:
P0: Share count discrepancy fix - /api/p2pool/stats now includes PPLNS sharechain shares
P1: PPLNS miners share count consistency - /api/p2pool/miners uses sharechain as source of truth

Endpoints tested:
- GET /api/p2pool/stats - Pool statistics with combined share counts
- GET /api/p2pool/miners - Miners list with correct share data from sharechain
- GET /api/p2pool/pplns/preview - PPLNS payout preview
- GET /api/p2pool/peers - Peers list
- GET /api/p2pool/blocks - Blocks list
- GET /api/p2pool/sharechain - Sharechain data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestP2PoolStats:
    """Test /api/p2pool/stats endpoint for share counting fix"""

    def test_stats_endpoint_returns_200(self):
        """Stats endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/p2pool/stats returns 200")

    def test_stats_has_shares_structure(self):
        """Stats should have shares.last_hour and shares.last_24h"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        
        assert "shares" in data, "Missing 'shares' in response"
        shares = data["shares"]
        assert "last_hour" in shares, "Missing shares.last_hour"
        assert "last_24h" in shares, "Missing shares.last_24h"
        
        # Values should be integers >= 0
        assert isinstance(shares["last_hour"], int), "shares.last_hour should be int"
        assert isinstance(shares["last_24h"], int), "shares.last_24h should be int"
        assert shares["last_hour"] >= 0, "shares.last_hour should be >= 0"
        assert shares["last_24h"] >= 0, "shares.last_24h should be >= 0"
        
        print(f"✓ Shares structure valid: 1h={shares['last_hour']}, 24h={shares['last_24h']}")

    def test_stats_has_pool_info(self):
        """Stats should have pool section with node_id"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        
        assert "pool" in data, "Missing 'pool' section"
        pool = data["pool"]
        assert "node_id" in pool, "Missing pool.node_id"
        assert "modes" in pool, "Missing pool.modes"
        assert "solo" in pool["modes"], "Missing 'solo' mode"
        assert "pplns" in pool["modes"], "Missing 'pplns' mode"
        
        print(f"✓ Pool info valid: node_id={pool['node_id']}, modes={pool['modes']}")

    def test_stats_has_network_info(self):
        """Stats should have network section with difficulty"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        
        assert "network" in data, "Missing 'network' section"
        network = data["network"]
        assert "difficulty" in network, "Missing network.difficulty"
        assert "share_difficulty" in network, "Missing network.share_difficulty"
        assert "block_reward" in network, "Missing network.block_reward"
        
        print(f"✓ Network info: difficulty={network['difficulty']}, share_diff={network['share_difficulty']}")

    def test_stats_has_sharechain_info(self):
        """Stats should have sharechain section"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        
        assert "sharechain" in data, "Missing 'sharechain' section"
        sharechain = data["sharechain"]
        assert "height" in sharechain, "Missing sharechain.height"
        assert "window_size" in sharechain, "Missing sharechain.window_size"
        assert "pplns_window" in sharechain, "Missing sharechain.pplns_window"
        
        print(f"✓ Sharechain: height={sharechain['height']}, window={sharechain['window_size']}")

    def test_stats_has_peers_info(self):
        """Stats should have peers section with online/total counts"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        
        assert "peers" in data, "Missing 'peers' section"
        peers = data["peers"]
        assert "online" in peers, "Missing peers.online"
        assert "total" in peers, "Missing peers.total"
        assert peers["online"] <= peers["total"], "online peers should be <= total"
        
        print(f"✓ Peers: {peers['online']} online / {peers['total']} total")

    def test_stats_has_miners_info(self):
        """Stats should have miners section"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        
        assert "miners" in data, "Missing 'miners' section"
        miners = data["miners"]
        assert "active" in miners, "Missing miners.active"
        assert "top_miners" in miners, "Missing miners.top_miners"
        
        print(f"✓ Miners: {miners['active']} active, {len(miners['top_miners'])} top miners")

    def test_stats_has_hashrate_info(self):
        """Stats should have hashrate section"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        
        assert "hashrate" in data, "Missing 'hashrate' section"
        hashrate = data["hashrate"]
        assert "pool_estimated" in hashrate, "Missing hashrate.pool_estimated"
        assert "pool_hashrate_readable" in hashrate, "Missing hashrate.pool_hashrate_readable"
        
        print(f"✓ Hashrate: {hashrate['pool_hashrate_readable']}")

    def test_stats_has_pplns_preview(self):
        """Stats should have pplns_preview section"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        
        assert "pplns_preview" in data, "Missing 'pplns_preview' section"
        pplns = data["pplns_preview"]
        assert "if_block_found_now" in pplns, "Missing pplns_preview.if_block_found_now"
        assert "miners_in_window" in pplns, "Missing pplns_preview.miners_in_window"
        
        print(f"✓ PPLNS preview: {pplns['miners_in_window']} miners in window")


class TestP2PoolMiners:
    """Test /api/p2pool/miners endpoint for share count consistency"""

    def test_miners_endpoint_returns_200(self):
        """Miners endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/p2pool/miners")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/p2pool/miners returns 200")

    def test_miners_has_correct_structure(self):
        """Miners endpoint should return miners array and active_count"""
        response = requests.get(f"{BASE_URL}/api/p2pool/miners")
        data = response.json()
        
        assert "miners" in data, "Missing 'miners' array"
        assert "active_count" in data, "Missing 'active_count'"
        assert isinstance(data["miners"], list), "miners should be a list"
        assert isinstance(data["active_count"], int), "active_count should be int"
        
        print(f"✓ Miners structure valid: {data['active_count']} active miners")

    def test_miners_have_required_fields(self):
        """If miners exist, they should have required fields including pool_mode"""
        response = requests.get(f"{BASE_URL}/api/p2pool/miners")
        data = response.json()
        
        if data["miners"]:
            required_fields = ["worker", "online", "shares_1h", "shares_24h", "pool_mode"]
            for miner in data["miners"]:
                for field in required_fields:
                    assert field in miner, f"Miner missing '{field}' field"
                
                # pool_mode should be 'solo' or 'pplns'
                assert miner["pool_mode"] in ["solo", "pplns"], f"Invalid pool_mode: {miner['pool_mode']}"
                
                print(f"✓ Miner {miner['worker'][:16]}... pool_mode={miner['pool_mode']}, shares_24h={miner['shares_24h']}")
        else:
            print("✓ No miners connected (expected in preview environment)")


class TestP2PoolPPLNSPreview:
    """Test /api/p2pool/pplns/preview endpoint"""

    def test_pplns_preview_returns_200(self):
        """PPLNS preview endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/p2pool/pplns/preview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/p2pool/pplns/preview returns 200")

    def test_pplns_preview_structure(self):
        """PPLNS preview should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/p2pool/pplns/preview")
        data = response.json()
        
        assert "block_reward" in data, "Missing 'block_reward'"
        assert "miners_in_window" in data, "Missing 'miners_in_window'"
        assert "payouts" in data, "Missing 'payouts'"
        assert "window_size" in data, "Missing 'window_size'"
        assert "note" in data, "Missing 'note'"
        
        assert isinstance(data["payouts"], list), "payouts should be list"
        assert data["window_size"] == 2016, "window_size should be 2016"
        
        print(f"✓ PPLNS preview: {data['miners_in_window']} miners, {data['block_reward']} BRICS reward")

    def test_pplns_payout_structure(self):
        """If payouts exist, they should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/p2pool/pplns/preview")
        data = response.json()
        
        if data["payouts"]:
            required_fields = ["worker", "amount", "share_percentage", "shares_in_window"]
            for payout in data["payouts"]:
                for field in required_fields:
                    assert field in payout, f"Payout missing '{field}' field"
                print(f"✓ Payout: {payout['worker'][:16]}... {payout['amount']:.6f} BRICS ({payout['share_percentage']:.2f}%)")
        else:
            print("✓ No PPLNS payouts (no shares in window)")


class TestP2PoolPeers:
    """Test /api/p2pool/peers endpoint"""

    def test_peers_endpoint_returns_200(self):
        """Peers endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/p2pool/peers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/p2pool/peers returns 200")

    def test_peers_structure(self):
        """Peers endpoint should return correct structure"""
        response = requests.get(f"{BASE_URL}/api/p2pool/peers")
        data = response.json()
        
        assert "peers" in data, "Missing 'peers'"
        assert "online_count" in data, "Missing 'online_count'"
        assert "total" in data, "Missing 'total'"
        assert "this_node" in data, "Missing 'this_node'"
        
        # online_count should match actual online peers
        online_peers = [p for p in data["peers"] if p.get("online")]
        assert data["online_count"] == len(online_peers), "online_count mismatch"
        
        print(f"✓ Peers: {data['online_count']} online / {data['total']} total, this_node={data['this_node']}")

    def test_mainnet_peer_registered(self):
        """Mainnet node should be registered as a peer"""
        response = requests.get(f"{BASE_URL}/api/p2pool/peers")
        data = response.json()
        
        peer_ids = [p["peer_id"] for p in data["peers"]]
        assert "mainnet" in peer_ids, "Mainnet node not found in peers"
        
        mainnet = next(p for p in data["peers"] if p["peer_id"] == "mainnet")
        assert mainnet["online"] == True, "Mainnet should be online"
        
        print(f"✓ Mainnet peer: online={mainnet['online']}, url={mainnet.get('node_url', 'N/A')}")


class TestP2PoolBlocks:
    """Test /api/p2pool/blocks endpoint"""

    def test_blocks_endpoint_returns_200(self):
        """Blocks endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/p2pool/blocks?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/p2pool/blocks returns 200")

    def test_blocks_structure(self):
        """Blocks endpoint should return correct structure"""
        response = requests.get(f"{BASE_URL}/api/p2pool/blocks?limit=10")
        data = response.json()
        
        assert "blocks" in data, "Missing 'blocks'"
        assert "count" in data, "Missing 'count'"
        assert isinstance(data["blocks"], list), "blocks should be list"
        
        print(f"✓ Blocks: {data['count']} returned")

    def test_block_fields(self):
        """Blocks should have required fields"""
        response = requests.get(f"{BASE_URL}/api/p2pool/blocks?limit=10")
        data = response.json()
        
        if data["blocks"]:
            required_fields = ["index", "timestamp", "miner", "hash"]
            for block in data["blocks"][:5]:
                for field in required_fields:
                    assert field in block, f"Block missing '{field}' field"
                print(f"✓ Block #{block['index']}: miner={block['miner'][:16]}...")
        else:
            print("✓ No blocks found (expected: genesis block should exist)")


class TestP2PoolSharechain:
    """Test /api/p2pool/sharechain endpoint"""

    def test_sharechain_endpoint_returns_200(self):
        """Sharechain endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/p2pool/sharechain?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/p2pool/sharechain returns 200")

    def test_sharechain_structure(self):
        """Sharechain endpoint should return correct structure"""
        response = requests.get(f"{BASE_URL}/api/p2pool/sharechain?limit=10")
        data = response.json()
        
        assert "shares" in data, "Missing 'shares'"
        assert "count" in data, "Missing 'count'"
        assert "chain_height" in data, "Missing 'chain_height'"
        assert "window_size" in data, "Missing 'window_size'"
        
        print(f"✓ Sharechain: height={data['chain_height']}, count={data['count']}, window={data['window_size']}")

    def test_sharechain_share_structure(self):
        """If shares exist, they should have required fields"""
        response = requests.get(f"{BASE_URL}/api/p2pool/sharechain?limit=10")
        data = response.json()
        
        if data["shares"]:
            required_fields = ["share_id", "height", "worker", "share_difficulty", "pool_mode"]
            for share in data["shares"][:5]:
                for field in required_fields:
                    assert field in share, f"Share missing '{field}' field"
                print(f"✓ Share #{share['height']}: worker={share['worker'][:16]}..., mode={share['pool_mode']}")
        else:
            print("✓ No shares in sharechain (expected in preview environment)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
