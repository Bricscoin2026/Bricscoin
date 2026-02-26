"""
BricsCoin AuxPoW (Merge Mining) API Tests
==========================================
Tests for the merge mining endpoints:
- GET /api/auxpow/status - Returns merge mining status and statistics
- GET /api/auxpow/create-work - Creates work template for merge mining pools
- POST /api/auxpow/submit - Validates and rejects invalid AuxPoW submissions
- GET /api/auxpow/work-history - Returns recent work items
- GET /api/p2p/chain/info - Verifies merge_mining field
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuxPoWStatus:
    """Tests for GET /api/auxpow/status endpoint"""

    def test_status_returns_200(self):
        """Test that status endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        assert response.status_code == 200
        print(f"✓ GET /api/auxpow/status returned 200")

    def test_status_has_merge_mining_enabled(self):
        """Test that merge mining is enabled"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        data = response.json()
        assert data["merge_mining_enabled"] == True
        print(f"✓ merge_mining_enabled = True")

    def test_status_has_chain_id(self):
        """Test that chain_id is present (98 = 0x0062)"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        data = response.json()
        assert "chain_id" in data
        assert data["chain_id"] == 98  # AUXPOW_CHAIN_ID = 0x0062
        print(f"✓ chain_id = {data['chain_id']}")

    def test_status_has_supported_parent_chains(self):
        """Test that bitcoin is a supported parent chain"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        data = response.json()
        assert "supported_parent_chains" in data
        assert "bitcoin" in data["supported_parent_chains"]
        print(f"✓ supported_parent_chains includes 'bitcoin'")

    def test_status_has_statistics(self):
        """Test that statistics block is present with required fields"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        data = response.json()
        
        assert "statistics" in data
        stats = data["statistics"]
        
        # Required statistics fields
        assert "total_blocks" in stats
        assert "auxpow_blocks" in stats
        assert "native_blocks" in stats
        assert "auxpow_percentage" in stats
        assert "pending_work_items" in stats
        
        # Verify native_blocks = total_blocks - auxpow_blocks
        assert stats["native_blocks"] == stats["total_blocks"] - stats["auxpow_blocks"]
        print(f"✓ Statistics: total={stats['total_blocks']}, auxpow={stats['auxpow_blocks']}, native={stats['native_blocks']}")

    def test_status_has_current_difficulty(self):
        """Test that current difficulty is present and positive"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        data = response.json()
        
        assert "current_difficulty" in data
        assert isinstance(data["current_difficulty"], int)
        assert data["current_difficulty"] > 0
        print(f"✓ current_difficulty = {data['current_difficulty']}")

    def test_status_has_how_to_merge_mine_instructions(self):
        """Test that instructions for merge mining are present"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        data = response.json()
        
        assert "how_to_merge_mine" in data
        instructions = data["how_to_merge_mine"]
        assert "step_1" in instructions
        assert "step_2" in instructions
        assert "step_3" in instructions
        assert "step_4" in instructions
        print(f"✓ Merge mining instructions present")


class TestAuxPoWCreateWork:
    """Tests for GET /api/auxpow/create-work endpoint"""

    def test_create_work_returns_200(self):
        """Test that create-work endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest123")
        assert response.status_code == 200
        print(f"✓ GET /api/auxpow/create-work returned 200")

    def test_create_work_has_work_id(self):
        """Test that work_id is generated"""
        response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest456")
        data = response.json()
        
        assert "work_id" in data
        assert len(data["work_id"]) == 8  # 8-char UUID prefix
        print(f"✓ work_id = {data['work_id']}")

    def test_create_work_has_block_hash(self):
        """Test that block_hash is a 64-char hex string"""
        response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest789")
        data = response.json()
        
        assert "block_hash" in data
        assert len(data["block_hash"]) == 64
        assert all(c in "0123456789abcdef" for c in data["block_hash"])
        print(f"✓ block_hash = {data['block_hash'][:16]}...")

    def test_create_work_has_coinbase_commitment(self):
        """Test that coinbase commitment is BRIC + block_hash"""
        response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest_cb")
        data = response.json()
        
        assert "coinbase_commitment" in data
        assert "coinbase_commitment_ascii" in data
        
        # Commitment starts with 'BRIC' magic (42524943 hex)
        assert data["coinbase_commitment"].startswith("42524943")
        assert data["coinbase_commitment_ascii"].startswith("BRIC")
        print(f"✓ coinbase_commitment starts with BRIC magic")

    def test_create_work_has_difficulty_and_target(self):
        """Test that difficulty and target are present"""
        response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest_diff")
        data = response.json()
        
        assert "difficulty" in data
        assert "target" in data
        assert isinstance(data["difficulty"], int)
        assert len(data["target"]) == 64  # 256-bit target
        print(f"✓ difficulty = {data['difficulty']}, target = {data['target'][:16]}...")

    def test_create_work_has_reward(self):
        """Test that mining reward is present"""
        response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest_reward")
        data = response.json()
        
        assert "reward" in data
        assert data["reward"] == 50  # Initial reward before any halving
        print(f"✓ reward = {data['reward']} BRICS")

    def test_create_work_has_chain_id(self):
        """Test that chain_id is included"""
        response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest_chain")
        data = response.json()
        
        assert "chain_id" in data
        assert data["chain_id"] == 98
        print(f"✓ chain_id = {data['chain_id']}")

    def test_create_work_has_instructions(self):
        """Test that instructions are included"""
        response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest_inst")
        data = response.json()
        
        assert "instructions" in data
        inst = data["instructions"]
        assert "step_1" in inst
        assert "step_2" in inst
        assert "step_3" in inst
        assert "step_4" in inst
        print(f"✓ Instructions present with 4 steps")


class TestAuxPoWSubmit:
    """Tests for POST /api/auxpow/submit endpoint - validation tests"""

    def test_submit_rejects_invalid_header_length(self):
        """Test that invalid parent_header length is rejected"""
        response = requests.post(f"{BASE_URL}/api/auxpow/submit", json={
            "parent_header": "invalid_header",
            "coinbase_tx": "test",
            "coinbase_branch": [],
            "coinbase_index": 0,
            "blockchain_branch": [],
            "blockchain_index": 0,
            "parent_chain": "bitcoin",
            "miner_address": "BRICStest_invalid1",
            "block_hash": "0000000000000000000000000000000000000000000000000000000000000000"
        })
        
        assert response.status_code == 400
        assert "Invalid parent block header" in response.json()["detail"]
        print(f"✓ Rejected invalid header length with 400")

    def test_submit_rejects_difficulty_not_met(self):
        """Test that PoW not meeting difficulty is rejected"""
        # Valid 160 hex char header (80 bytes) but won't meet difficulty
        valid_length_header = "01000000" + "00" * 32 + "00" * 32 + "00000000" + "ffff001d" + "1dac2b7c"
        
        # First get valid work
        work_response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest_diff_fail")
        work = work_response.json()
        
        response = requests.post(f"{BASE_URL}/api/auxpow/submit", json={
            "parent_header": valid_length_header,
            "coinbase_tx": "test",
            "coinbase_branch": [],
            "coinbase_index": 0,
            "blockchain_branch": [],
            "blockchain_index": 0,
            "parent_chain": "bitcoin",
            "miner_address": "BRICStest_diff_fail",
            "block_hash": work["block_hash"]
        })
        
        assert response.status_code == 400
        assert "does not meet BricsCoin difficulty" in response.json()["detail"]
        print(f"✓ Rejected PoW not meeting difficulty with 400")

    def test_submit_rejects_nonexistent_work(self):
        """Test that non-existent work hash is rejected"""
        valid_length_header = "01000000" + "00" * 32 + "00" * 32 + "00000000" + "ffff001d" + "1dac2b7c"
        
        response = requests.post(f"{BASE_URL}/api/auxpow/submit", json={
            "parent_header": valid_length_header,
            "coinbase_tx": "test",
            "coinbase_branch": [],
            "coinbase_index": 0,
            "blockchain_branch": [],
            "blockchain_index": 0,
            "parent_chain": "bitcoin",
            "miner_address": "BRICStest_nowork",
            "block_hash": "1111111111111111111111111111111111111111111111111111111111111111"
        })
        
        assert response.status_code == 404
        assert "Work template not found" in response.json()["detail"]
        print(f"✓ Rejected non-existent work with 404")


class TestAuxPoWWorkHistory:
    """Tests for GET /api/auxpow/work-history endpoint"""

    def test_work_history_returns_200(self):
        """Test that work-history endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/auxpow/work-history")
        assert response.status_code == 200
        print(f"✓ GET /api/auxpow/work-history returned 200")

    def test_work_history_has_work_items(self):
        """Test that work_items array is present"""
        response = requests.get(f"{BASE_URL}/api/auxpow/work-history")
        data = response.json()
        
        assert "work_items" in data
        assert isinstance(data["work_items"], list)
        print(f"✓ work_items is a list with {len(data['work_items'])} items")

    def test_work_history_has_count(self):
        """Test that count field matches array length"""
        response = requests.get(f"{BASE_URL}/api/auxpow/work-history")
        data = response.json()
        
        assert "count" in data
        assert data["count"] == len(data["work_items"])
        print(f"✓ count = {data['count']}")

    def test_work_history_respects_limit(self):
        """Test that limit parameter works"""
        response = requests.get(f"{BASE_URL}/api/auxpow/work-history?limit=5")
        data = response.json()
        
        assert len(data["work_items"]) <= 5
        print(f"✓ Limit respected: {len(data['work_items'])} <= 5")

    def test_work_history_item_has_required_fields(self):
        """Test that work items have required fields"""
        # First create some work
        requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest_history")
        
        response = requests.get(f"{BASE_URL}/api/auxpow/work-history")
        data = response.json()
        
        if data["work_items"]:
            item = data["work_items"][0]
            assert "work_id" in item
            assert "block_index" in item
            assert "difficulty" in item
            assert "miner_address" in item
            assert "created_at" in item
            assert "used" in item
            print(f"✓ Work item has all required fields")
        else:
            print(f"⚠ No work items to verify fields")


class TestP2PChainInfoMergeMining:
    """Tests for merge_mining field in GET /api/p2p/chain/info"""

    def test_chain_info_returns_200(self):
        """Test that chain/info endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/p2p/chain/info")
        assert response.status_code == 200
        print(f"✓ GET /api/p2p/chain/info returned 200")

    def test_chain_info_has_merge_mining_true(self):
        """Test that merge_mining field is true"""
        response = requests.get(f"{BASE_URL}/api/p2p/chain/info")
        data = response.json()
        
        assert "merge_mining" in data
        assert data["merge_mining"] == True
        print(f"✓ merge_mining = True")

    def test_chain_info_has_node_id(self):
        """Test that node_id is present"""
        response = requests.get(f"{BASE_URL}/api/p2p/chain/info")
        data = response.json()
        
        assert "node_id" in data
        print(f"✓ node_id = {data['node_id']}")

    def test_chain_info_has_height(self):
        """Test that blockchain height is present"""
        response = requests.get(f"{BASE_URL}/api/p2p/chain/info")
        data = response.json()
        
        assert "height" in data
        assert isinstance(data["height"], int)
        assert data["height"] >= 0
        print(f"✓ height = {data['height']}")

    def test_chain_info_has_difficulty(self):
        """Test that difficulty is present"""
        response = requests.get(f"{BASE_URL}/api/p2p/chain/info")
        data = response.json()
        
        assert "difficulty" in data
        assert isinstance(data["difficulty"], int)
        print(f"✓ difficulty = {data['difficulty']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
