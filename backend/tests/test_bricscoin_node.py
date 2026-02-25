"""
BRICScoin Standalone Node API Tests
Tests for the decentralized full node that syncs from the main server

Modules tested:
- Node info and status endpoints
- Block retrieval and validation
- P2P chain protocol endpoints
- Balance queries
- Chain validation
"""

import pytest
import requests
import os

# Standalone node runs on port 9333
NODE_BASE_URL = "http://localhost:9333"

# Expected minimum chain height (node syncs ~2567+ blocks from main server)
MIN_EXPECTED_HEIGHT = 2500

# Mining address from main server (for balance testing)
MINING_ADDRESS = "BRICS8ff4E8ded426bEbfB7EB1a7E25D13E5fc4d8b1"


class TestNodeInfo:
    """Node status and info endpoint tests"""

    def test_node_info_returns_status(self):
        """GET /api/node/info returns node status"""
        response = requests.get(f"{NODE_BASE_URL}/api/node/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "node_id" in data
        assert "version" in data
        assert "chain_height" in data
        assert "syncing" in data
        assert "latest_block_hash" in data
        
        # Node should have synced significant blockchain
        assert data["chain_height"] >= MIN_EXPECTED_HEIGHT, f"Expected >= {MIN_EXPECTED_HEIGHT} blocks, got {data['chain_height']}"
        assert data["version"] == "1.0.0"
        assert isinstance(data["syncing"], bool)
        print(f"Node ID: {data['node_id']}, Height: {data['chain_height']}, Syncing: {data['syncing']}")

    def test_node_info_has_hash(self):
        """GET /api/node/info includes latest block hash"""
        response = requests.get(f"{NODE_BASE_URL}/api/node/info")
        assert response.status_code == 200
        data = response.json()
        
        latest_hash = data.get("latest_block_hash")
        assert latest_hash is not None
        assert len(latest_hash) == 64  # SHA-256 hex
        assert latest_hash.startswith("000000")  # PoW hash should have leading zeros
        print(f"Latest block hash: {latest_hash}")


class TestNetworkStats:
    """Network statistics endpoint tests"""

    def test_network_stats(self):
        """GET /api/network/stats returns blockchain stats"""
        response = requests.get(f"{NODE_BASE_URL}/api/network/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "block_height" in data
        assert "current_difficulty" in data
        assert "peers" in data
        assert "syncing" in data
        
        assert data["block_height"] >= MIN_EXPECTED_HEIGHT
        assert data["current_difficulty"] > 0
        assert isinstance(data["peers"], int)
        print(f"Network stats - Height: {data['block_height']}, Difficulty: {data['current_difficulty']}, Peers: {data['peers']}")


class TestBlockRetrieval:
    """Block retrieval endpoint tests"""

    def test_get_blocks_paginated(self):
        """GET /api/blocks returns paginated blocks"""
        response = requests.get(f"{NODE_BASE_URL}/api/blocks", params={"page": 1, "per_page": 20})
        assert response.status_code == 200
        
        data = response.json()
        assert "blocks" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data
        
        blocks = data["blocks"]
        assert len(blocks) <= 20
        assert data["total"] >= MIN_EXPECTED_HEIGHT
        assert data["page"] == 1
        assert data["per_page"] == 20
        
        # Verify block structure
        if blocks:
            block = blocks[0]
            assert "index" in block
            assert "hash" in block
            assert "previous_hash" in block
            assert "timestamp" in block
            print(f"Paginated blocks - Total: {data['total']}, First block index: {block['index']}")

    def test_get_genesis_block(self):
        """GET /api/blocks/0 returns genesis block"""
        response = requests.get(f"{NODE_BASE_URL}/api/blocks/0")
        assert response.status_code == 200
        
        block = response.json()
        assert block["index"] == 0
        assert "hash" in block
        assert "timestamp" in block
        assert "transactions" in block
        
        # Genesis block has special previous_hash
        assert block["previous_hash"] == "0" * 64 or block["previous_hash"] == "0"
        print(f"Genesis block hash: {block['hash']}")

    def test_get_specific_block(self):
        """GET /api/blocks/{index} returns specific block"""
        response = requests.get(f"{NODE_BASE_URL}/api/blocks/100")
        assert response.status_code == 200
        
        block = response.json()
        assert block["index"] == 100
        assert "hash" in block
        assert "difficulty" in block
        print(f"Block 100 hash: {block['hash']}")

    def test_get_block_not_found(self):
        """GET /api/blocks/{index} returns 404 for invalid index"""
        response = requests.get(f"{NODE_BASE_URL}/api/blocks/999999999")
        assert response.status_code == 404


class TestP2PChainProtocol:
    """P2P chain protocol endpoint tests for inter-node communication"""

    def test_p2p_chain_info(self):
        """GET /api/p2p/chain/info returns chain height for P2P sync"""
        response = requests.get(f"{NODE_BASE_URL}/api/p2p/chain/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "height" in data
        assert "latest_hash" in data
        assert "node_id" in data
        
        assert data["height"] >= MIN_EXPECTED_HEIGHT
        assert len(data["latest_hash"]) == 64
        print(f"P2P chain info - Height: {data['height']}, Latest hash: {data['latest_hash'][:16]}...")

    def test_p2p_get_blocks(self):
        """GET /api/p2p/chain/blocks returns blocks for P2P sync"""
        response = requests.get(f"{NODE_BASE_URL}/api/p2p/chain/blocks", 
                               params={"from_height": 0, "limit": 5})
        assert response.status_code == 200
        
        data = response.json()
        assert "blocks" in data
        assert "from_height" in data
        assert "count" in data
        
        blocks = data["blocks"]
        assert len(blocks) == 5
        assert data["from_height"] == 0
        assert data["count"] == 5
        
        # Verify sequential indices
        for i, block in enumerate(blocks):
            assert block["index"] == i, f"Block at position {i} should have index {i}"
        print(f"P2P blocks retrieved - Count: {len(blocks)}, First: {blocks[0]['index']}, Last: {blocks[-1]['index']}")

    def test_p2p_get_blocks_with_offset(self):
        """GET /api/p2p/chain/blocks with from_height offset"""
        response = requests.get(f"{NODE_BASE_URL}/api/p2p/chain/blocks",
                               params={"from_height": 100, "limit": 10})
        assert response.status_code == 200
        
        data = response.json()
        blocks = data["blocks"]
        
        # First block should be at index 100
        assert blocks[0]["index"] == 100
        assert len(blocks) == 10
        print(f"P2P blocks from height 100 - Count: {len(blocks)}")

    def test_p2p_get_peers(self):
        """GET /api/p2p/peers returns peer list"""
        response = requests.get(f"{NODE_BASE_URL}/api/p2p/peers")
        assert response.status_code == 200
        
        data = response.json()
        assert "peers" in data
        assert "count" in data
        assert isinstance(data["peers"], list)
        print(f"P2P peers count: {data['count']}")


class TestBalanceQuery:
    """Balance query endpoint tests"""

    def test_get_balance_mining_address(self):
        """GET /api/balance/{address} returns balance for mining address"""
        response = requests.get(f"{NODE_BASE_URL}/api/balance/{MINING_ADDRESS}")
        assert response.status_code == 200
        
        data = response.json()
        assert "address" in data
        assert "balance" in data
        
        assert data["address"] == MINING_ADDRESS
        # Mining address should have accumulated rewards
        assert data["balance"] >= 0
        print(f"Mining address balance: {data['balance']} BRICS")

    def test_get_balance_unknown_address(self):
        """GET /api/balance/{address} returns 0 for unknown address"""
        unknown_address = "BRICSunknown0000000000000000000000000"
        response = requests.get(f"{NODE_BASE_URL}/api/balance/{unknown_address}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["balance"] == 0
        print(f"Unknown address balance: {data['balance']}")


class TestChainValidation:
    """Chain validation endpoint tests"""

    def test_validate_chain(self):
        """POST /api/node/validate validates entire local chain"""
        response = requests.post(f"{NODE_BASE_URL}/api/node/validate")
        assert response.status_code == 200
        
        data = response.json()
        assert "chain_height" in data
        assert "valid" in data
        assert "errors" in data
        assert "total_errors" in data
        
        assert data["chain_height"] >= MIN_EXPECTED_HEIGHT
        assert data["valid"] == True, f"Chain validation failed with errors: {data['errors']}"
        assert data["total_errors"] == 0
        print(f"Chain validation - Height: {data['chain_height']}, Valid: {data['valid']}, Errors: {data['total_errors']}")


class TestSyncControl:
    """Sync control endpoint tests"""

    def test_trigger_sync(self):
        """POST /api/node/sync triggers sync with seed node"""
        response = requests.post(f"{NODE_BASE_URL}/api/node/sync")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        # Either already syncing or sync started
        assert data["status"] in ["sync_started", "already_syncing"]
        print(f"Sync trigger result: {data['status']}")


class TestBlockBroadcast:
    """Block broadcast endpoint tests"""

    def test_broadcast_block_self(self):
        """POST /api/p2p/broadcast/block rejects self-broadcast"""
        # Get current node ID
        info_resp = requests.get(f"{NODE_BASE_URL}/api/node/info")
        node_id = info_resp.json()["node_id"]
        
        # Try to broadcast with same node_id (should be rejected as self)
        response = requests.post(f"{NODE_BASE_URL}/api/p2p/broadcast/block",
                                json={"block": {"index": 999999}, "sender_id": node_id})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "self"
        print(f"Self-broadcast correctly rejected")

    def test_broadcast_block_existing(self):
        """POST /api/p2p/broadcast/block rejects existing block"""
        # Get genesis block
        block_resp = requests.get(f"{NODE_BASE_URL}/api/blocks/0")
        genesis = block_resp.json()
        
        # Try to broadcast existing block
        response = requests.post(f"{NODE_BASE_URL}/api/p2p/broadcast/block",
                                json={"block": genesis, "sender_id": "other_node"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "already_exists"
        print(f"Existing block broadcast correctly rejected")


class TestBlockValidation:
    """Block validation logic tests"""

    def test_block_chain_links(self):
        """Verify chain links are valid (previous_hash matches prior block hash)"""
        # Get blocks 0-5
        response = requests.get(f"{NODE_BASE_URL}/api/p2p/chain/blocks",
                               params={"from_height": 0, "limit": 6})
        blocks = response.json()["blocks"]
        
        for i in range(1, len(blocks)):
            prev_block = blocks[i-1]
            curr_block = blocks[i]
            assert curr_block["previous_hash"] == prev_block["hash"], \
                f"Block {curr_block['index']} previous_hash doesn't match block {prev_block['index']} hash"
        
        print(f"Chain links verified for blocks 0-5")

    def test_block_pow_hashes(self):
        """Verify blocks with high difficulty have PoW-valid hashes (leading zeros)"""
        # Test recent blocks which have high difficulty (>1)
        response = requests.get(f"{NODE_BASE_URL}/api/p2p/chain/blocks",
                               params={"from_height": 2000, "limit": 10})
        blocks = response.json()["blocks"]
        
        for block in blocks:
            # Blocks with difficulty > 1 should have leading zeros
            hash_val = block["hash"]
            diff = block.get("difficulty", 1)
            if diff > 1:
                assert hash_val.startswith("000000"), \
                    f"Block {block['index']} (diff={diff}) hash doesn't have PoW zeros: {hash_val[:16]}..."
        
        print(f"PoW hashes verified for blocks with high difficulty")


class TestSyncFromMainServer:
    """Tests to verify sync with main server (https://bricscoin26.org)"""

    def test_chain_height_matches_main_server(self):
        """Node chain height should be close to main server"""
        # Get local height
        local_resp = requests.get(f"{NODE_BASE_URL}/api/p2p/chain/info")
        local_height = local_resp.json()["height"]
        
        # Get main server height
        try:
            main_resp = requests.get("https://bricscoin26.org/api/p2p/chain/info", timeout=10)
            main_height = main_resp.json()["height"]
            
            # Should be within a few blocks (allow for sync delay)
            diff = abs(main_height - local_height)
            assert diff <= 5, f"Local height {local_height} differs from main server {main_height} by {diff} blocks"
            print(f"Local height: {local_height}, Main server: {main_height}, Diff: {diff}")
        except requests.RequestException as e:
            pytest.skip(f"Could not reach main server: {e}")

    def test_genesis_block_matches_main_server(self):
        """Genesis block should match main server exactly"""
        # Get local genesis
        local_resp = requests.get(f"{NODE_BASE_URL}/api/blocks/0")
        local_genesis = local_resp.json()
        
        # Get main server genesis
        try:
            main_resp = requests.get("https://bricscoin26.org/api/blockchain/blocks/0", timeout=10)
            main_genesis = main_resp.json()
            
            assert local_genesis["hash"] == main_genesis["hash"], \
                f"Genesis hash mismatch: local={local_genesis['hash'][:16]}... vs main={main_genesis['hash'][:16]}..."
            print(f"Genesis block verified: {local_genesis['hash'][:32]}...")
        except requests.RequestException as e:
            pytest.skip(f"Could not reach main server: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
