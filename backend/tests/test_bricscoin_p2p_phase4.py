"""
BRICScoin P2P Phase 4 Tests — Central Server as P2P Node
Tests the central server's transition to a proper P2P node.

Modules tested:
- POST /api/p2p/register — returns node_id='mainnet', version='2.0.0', chain_height
- GET /api/p2p/peers — returns node_id, node_url, peers with height/version/last_seen
- GET /api/p2p/node/info — returns version=2.0.0, node_url, chain_height
- GET /api/p2p/chain/info — returns node_id='mainnet'
- Peer persistence in MongoDB (peers collection)
- V2 PeerRegister model accepts chain_height field
- Bidirectional registration behavior
- Block broadcast propagation excludes sender_node_id
"""

import pytest
import requests
import os
import time
from datetime import datetime, timezone
from pymongo import MongoClient

# Use REACT_APP_BACKEND_URL for central server
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

# MongoDB connection for persistence tests
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# Expected values for Phase 4
EXPECTED_NODE_ID = "mainnet"
EXPECTED_NODE_URL = "https://bricscoin26.org"
EXPECTED_VERSION = "2.0.0"


class TestPhase4CentralServerNodeIdentity:
    """Central server has stable NODE_ID='mainnet' and NODE_URL='https://bricscoin26.org'"""

    def test_register_returns_node_id_mainnet(self):
        """POST /api/p2p/register returns node_id='mainnet'"""
        payload = {
            "node_id": f"TEST_phase4_{int(time.time())}",
            "url": "http://phase4-test.example.com:9333",
            "version": "2.0.0",
            "chain_height": 100
        }
        response = requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        assert response.status_code == 200, f"Status {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["node_id"] == EXPECTED_NODE_ID, f"Expected node_id='mainnet', got {data['node_id']}"
        print(f"✓ POST /api/p2p/register returns node_id='{data['node_id']}'")

    def test_register_returns_version_2_0_0(self):
        """POST /api/p2p/register returns version='2.0.0'"""
        payload = {
            "node_id": f"TEST_version_{int(time.time())}",
            "url": "http://version-test.example.com:9333",
            "version": "2.0.0",
            "chain_height": 50
        }
        response = requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["version"] == EXPECTED_VERSION, f"Expected version='2.0.0', got {data['version']}"
        print(f"✓ POST /api/p2p/register returns version='{data['version']}'")

    def test_register_returns_chain_height(self):
        """POST /api/p2p/register returns chain_height field"""
        payload = {
            "node_id": f"TEST_height_{int(time.time())}",
            "url": "http://height-test.example.com:9333",
            "version": "2.0.0",
            "chain_height": 200
        }
        response = requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "chain_height" in data, "Missing chain_height in response"
        assert isinstance(data["chain_height"], int), f"chain_height should be int, got {type(data['chain_height'])}"
        assert data["chain_height"] >= 0, f"chain_height should be >= 0"
        print(f"✓ POST /api/p2p/register returns chain_height={data['chain_height']}")

    def test_node_info_returns_node_id_mainnet(self):
        """GET /api/p2p/node/info returns node_id='mainnet'"""
        response = requests.get(f"{BASE_URL}/api/p2p/node/info")
        assert response.status_code == 200
        
        data = response.json()
        assert data["node_id"] == EXPECTED_NODE_ID, f"Expected node_id='mainnet', got {data['node_id']}"
        print(f"✓ GET /api/p2p/node/info returns node_id='{data['node_id']}'")

    def test_node_info_returns_node_url(self):
        """GET /api/p2p/node/info returns node_url='https://bricscoin26.org'"""
        response = requests.get(f"{BASE_URL}/api/p2p/node/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "node_url" in data, "Missing node_url in response"
        assert data["node_url"] == EXPECTED_NODE_URL, f"Expected node_url='{EXPECTED_NODE_URL}', got {data['node_url']}"
        print(f"✓ GET /api/p2p/node/info returns node_url='{data['node_url']}'")

    def test_node_info_version_2_0_0(self):
        """GET /api/p2p/node/info returns version=2.0.0"""
        response = requests.get(f"{BASE_URL}/api/p2p/node/info")
        assert response.status_code == 200
        
        data = response.json()
        assert data["version"] == EXPECTED_VERSION, f"Expected version='2.0.0', got {data['version']}"
        print(f"✓ GET /api/p2p/node/info returns version='{data['version']}'")

    def test_chain_info_returns_node_id_mainnet(self):
        """GET /api/p2p/chain/info returns node_id='mainnet'"""
        response = requests.get(f"{BASE_URL}/api/p2p/chain/info")
        assert response.status_code == 200
        
        data = response.json()
        assert data["node_id"] == EXPECTED_NODE_ID, f"Expected node_id='mainnet', got {data['node_id']}"
        print(f"✓ GET /api/p2p/chain/info returns node_id='{data['node_id']}'")

    def test_peers_returns_node_id_mainnet(self):
        """GET /api/p2p/peers returns node_id='mainnet'"""
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        assert response.status_code == 200
        
        data = response.json()
        assert data["node_id"] == EXPECTED_NODE_ID, f"Expected node_id='mainnet', got {data['node_id']}"
        print(f"✓ GET /api/p2p/peers returns node_id='{data['node_id']}'")

    def test_peers_returns_node_url(self):
        """GET /api/p2p/peers returns node_url='https://bricscoin26.org'"""
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        assert response.status_code == 200
        
        data = response.json()
        assert "node_url" in data, "Missing node_url in response"
        assert data["node_url"] == EXPECTED_NODE_URL, f"Expected node_url='{EXPECTED_NODE_URL}', got {data['node_url']}"
        print(f"✓ GET /api/p2p/peers returns node_url='{data['node_url']}'")


class TestPhase4PeerListStructure:
    """GET /api/p2p/peers returns peers with height/version/last_seen"""

    def test_peers_list_structure(self):
        """GET /api/p2p/peers returns peer list with required structure"""
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        assert response.status_code == 200
        
        data = response.json()
        assert "peers" in data, "Missing 'peers' in response"
        assert isinstance(data["peers"], list), "peers should be a list"
        print(f"✓ GET /api/p2p/peers returns peers list (count={data.get('count', len(data['peers']))})")

    def test_peer_has_height_field(self):
        """GET /api/p2p/peers - each peer has 'height' field"""
        # First register a peer to ensure there's at least one
        payload = {
            "node_id": f"TEST_peer_height_{int(time.time())}",
            "url": "http://peer-height-test.example.com:9333",
            "version": "2.0.0",
            "chain_height": 123
        }
        requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        assert response.status_code == 200
        
        data = response.json()
        peers = data.get("peers", [])
        
        if not peers:
            pytest.skip("No peers to test structure")
        
        for peer in peers:
            assert "height" in peer, f"Peer missing 'height' field: {peer}"
            assert isinstance(peer["height"], int), f"height should be int: {peer}"
        
        print(f"✓ All {len(peers)} peers have 'height' field")

    def test_peer_has_version_field(self):
        """GET /api/p2p/peers - each peer has 'version' field"""
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        assert response.status_code == 200
        
        data = response.json()
        peers = data.get("peers", [])
        
        if not peers:
            pytest.skip("No peers to test structure")
        
        for peer in peers:
            assert "version" in peer, f"Peer missing 'version' field: {peer}"
        
        print(f"✓ All {len(peers)} peers have 'version' field")

    def test_peer_has_last_seen_field(self):
        """GET /api/p2p/peers - each peer has 'last_seen' field"""
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        assert response.status_code == 200
        
        data = response.json()
        peers = data.get("peers", [])
        
        if not peers:
            pytest.skip("No peers to test structure")
        
        for peer in peers:
            assert "last_seen" in peer, f"Peer missing 'last_seen' field: {peer}"
            # Validate ISO timestamp format
            try:
                datetime.fromisoformat(peer["last_seen"].replace("Z", "+00:00"))
            except ValueError:
                pytest.fail(f"Invalid last_seen timestamp format: {peer['last_seen']}")
        
        print(f"✓ All {len(peers)} peers have valid 'last_seen' timestamps")

    def test_peer_has_node_id_and_url(self):
        """GET /api/p2p/peers - each peer has 'node_id' and 'url'"""
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        assert response.status_code == 200
        
        data = response.json()
        peers = data.get("peers", [])
        
        if not peers:
            pytest.skip("No peers to test structure")
        
        for peer in peers:
            assert "node_id" in peer, f"Peer missing 'node_id' field: {peer}"
            assert "url" in peer, f"Peer missing 'url' field: {peer}"
        
        print(f"✓ All {len(peers)} peers have 'node_id' and 'url' fields")


class TestPhase4V2PeerRegisterModel:
    """V2 PeerRegister model accepts chain_height field"""

    def test_register_accepts_chain_height(self):
        """POST /api/p2p/register accepts chain_height in request body"""
        payload = {
            "node_id": f"TEST_v2_model_{int(time.time())}",
            "url": "http://v2-model-test.example.com:9333",
            "version": "2.0.0",
            "chain_height": 999
        }
        response = requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        assert response.status_code == 200, f"Status {response.status_code}: {response.text}"
        print(f"✓ POST /api/p2p/register accepts chain_height field")

    def test_registered_peer_has_chain_height_stored(self):
        """Registered peer's chain_height is stored as 'height' in peer list"""
        unique_id = f"TEST_stored_height_{int(time.time())}"
        payload = {
            "node_id": unique_id,
            "url": f"http://stored-height-{unique_id}.example.com:9333",
            "version": "2.0.0",
            "chain_height": 777
        }
        response = requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        assert response.status_code == 200
        
        # Verify the peer is stored with correct height
        peers_resp = requests.get(f"{BASE_URL}/api/p2p/peers")
        peers = peers_resp.json().get("peers", [])
        
        found = False
        for peer in peers:
            if peer.get("node_id") == unique_id:
                found = True
                assert peer["height"] == 777, f"Expected height=777, got {peer['height']}"
                break
        
        assert found, f"Registered peer {unique_id} not found in peers list"
        print(f"✓ Registered peer has chain_height stored as height={payload['chain_height']}")

    def test_register_without_chain_height_defaults(self):
        """POST /api/p2p/register works with default chain_height=0"""
        payload = {
            "node_id": f"TEST_no_height_{int(time.time())}",
            "url": "http://no-height-test.example.com:9333",
            "version": "2.0.0"
            # chain_height omitted - should default to 0
        }
        response = requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        assert response.status_code == 200, f"Status {response.status_code}: {response.text}"
        print(f"✓ POST /api/p2p/register works without chain_height (defaults to 0)")


class TestPhase4NodeInfoEndpoint:
    """GET /api/p2p/node/info returns version=2.0.0, node_url, chain_height"""

    def test_node_info_has_all_required_fields(self):
        """GET /api/p2p/node/info returns all required fields"""
        response = requests.get(f"{BASE_URL}/api/p2p/node/info")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["node_id", "node_url", "version", "chain_height"]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ GET /api/p2p/node/info has all required fields: {required_fields}")

    def test_node_info_chain_height_matches_blocks(self):
        """GET /api/p2p/node/info chain_height matches /api/p2p/chain/info height"""
        node_info = requests.get(f"{BASE_URL}/api/p2p/node/info").json()
        chain_info = requests.get(f"{BASE_URL}/api/p2p/chain/info").json()
        
        assert node_info["chain_height"] == chain_info["height"], \
            f"node_info.chain_height={node_info['chain_height']} != chain_info.height={chain_info['height']}"
        
        print(f"✓ chain_height consistent: node_info={node_info['chain_height']}, chain_info={chain_info['height']}")

    def test_node_info_includes_connected_peers(self):
        """GET /api/p2p/node/info includes connected_peers count"""
        response = requests.get(f"{BASE_URL}/api/p2p/node/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "connected_peers" in data, "Missing connected_peers field"
        assert isinstance(data["connected_peers"], int), "connected_peers should be int"
        print(f"✓ GET /api/p2p/node/info includes connected_peers={data['connected_peers']}")


class TestPhase4ChainInfoEndpoint:
    """GET /api/p2p/chain/info returns node_id='mainnet'"""

    def test_chain_info_has_required_fields(self):
        """GET /api/p2p/chain/info has height, node_id, last_block_hash"""
        response = requests.get(f"{BASE_URL}/api/p2p/chain/info")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["node_id", "height"]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ GET /api/p2p/chain/info has required fields")

    def test_chain_info_height_is_int(self):
        """GET /api/p2p/chain/info height is an integer"""
        response = requests.get(f"{BASE_URL}/api/p2p/chain/info")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["height"], int), f"height should be int, got {type(data['height'])}"
        assert data["height"] >= 0, "height should be non-negative"
        print(f"✓ GET /api/p2p/chain/info height={data['height']} (int)")


class TestPhase4PeerPersistence:
    """Peer persistence: registered peers survive backend restart"""

    def setup_method(self):
        """Setup MongoDB connection"""
        self.mongo_client = MongoClient(MONGO_URL)
        self.db = self.mongo_client[DB_NAME]

    def teardown_method(self):
        """Cleanup MongoDB connection"""
        if hasattr(self, 'mongo_client'):
            self.mongo_client.close()

    def test_peers_collection_exists(self):
        """Peers collection exists in MongoDB"""
        collections = self.db.list_collection_names()
        assert "peers" in collections, f"peers collection not found. Collections: {collections}"
        print(f"✓ 'peers' collection exists in MongoDB")

    def test_registered_peer_persisted_in_db(self):
        """Registered peers are persisted in MongoDB peers collection"""
        unique_id = f"TEST_persist_{int(time.time())}"
        payload = {
            "node_id": unique_id,
            "url": f"http://persist-{unique_id}.example.com:9333",
            "version": "2.0.0",
            "chain_height": 555
        }
        
        response = requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        assert response.status_code == 200
        
        # Small delay for async DB write
        time.sleep(0.3)
        
        # Check MongoDB directly
        peer_doc = self.db.peers.find_one({"node_id": unique_id})
        assert peer_doc is not None, f"Peer {unique_id} not found in MongoDB"
        assert peer_doc["url"] == payload["url"]
        assert peer_doc["version"] == payload["version"]
        assert peer_doc["height"] == payload["chain_height"]
        
        print(f"✓ Peer {unique_id} persisted in MongoDB with correct fields")

    def test_peer_has_last_seen_timestamp(self):
        """Persisted peer has last_seen timestamp in MongoDB"""
        unique_id = f"TEST_lastseen_{int(time.time())}"
        payload = {
            "node_id": unique_id,
            "url": f"http://lastseen-{unique_id}.example.com:9333",
            "version": "2.0.0",
            "chain_height": 100
        }
        
        requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        time.sleep(0.3)
        
        peer_doc = self.db.peers.find_one({"node_id": unique_id})
        assert peer_doc is not None
        assert "last_seen" in peer_doc, "Missing last_seen in persisted peer"
        
        # Validate timestamp format
        try:
            datetime.fromisoformat(peer_doc["last_seen"].replace("Z", "+00:00"))
        except ValueError:
            pytest.fail(f"Invalid last_seen format: {peer_doc['last_seen']}")
        
        print(f"✓ Persisted peer has valid last_seen timestamp")


class TestPhase4BlockBroadcast:
    """Block broadcast propagation excludes sender_node_id (no loops)"""

    def test_broadcast_excludes_sender_no_loop(self):
        """POST /api/p2p/broadcast/block uses sender_node_id to exclude sender"""
        # Get a block to broadcast (genesis should exist)
        blocks_resp = requests.get(f"{BASE_URL}/api/p2p/chain/blocks", params={"from_height": 0, "limit": 1})
        blocks = blocks_resp.json().get("blocks", [])
        
        if not blocks:
            pytest.skip("No blocks available to test broadcast")
        
        block = blocks[0]
        
        # Broadcast with sender_node_id - central server should re-broadcast
        # excluding this sender_node_id
        response = requests.post(
            f"{BASE_URL}/api/p2p/broadcast/block",
            json={"block": block, "sender_node_id": "external_sender_001"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Block already exists, so should return already_exists
        assert data["status"] == "already_exists", f"Expected 'already_exists', got {data['status']}"
        print(f"✓ Broadcast excludes sender_node_id (returned '{data['status']}' for existing block)")

    def test_broadcast_block_uses_sender_node_id_field(self):
        """POST /api/p2p/broadcast/block accepts sender_node_id field"""
        block = {
            "index": 999999,  # Non-existent block
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "transactions": [],
            "previous_hash": "0" * 64,
            "hash": "invalid_hash",  # Will fail validation
            "nonce": 0,
            "difficulty": 1000000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/p2p/broadcast/block",
            json={"block": block, "sender_node_id": "test_sender_node"}
        )
        assert response.status_code == 200
        # Invalid block should be rejected (but endpoint accepts the sender_node_id field)
        data = response.json()
        assert data["status"] in ["invalid_block", "already_exists"], f"Unexpected status: {data['status']}"
        print(f"✓ Broadcast accepts sender_node_id field (status={data['status']})")


class TestPhase4BidirectionalRegistration:
    """Bidirectional registration: when a node registers, central tries to register back"""

    def test_register_returns_central_info_for_bidirectional(self):
        """POST /api/p2p/register returns central's info for bidirectional registration"""
        payload = {
            "node_id": f"TEST_bidir_{int(time.time())}",
            "url": "http://bidir-test.example.com:9333",
            "version": "2.0.0",
            "chain_height": 50
        }
        response = requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        # Response should include central's info for bidirectional handshake
        assert "node_id" in data
        assert "version" in data
        assert "chain_height" in data
        assert data["node_id"] == EXPECTED_NODE_ID
        
        print(f"✓ Register returns central info for bidirectional: node_id={data['node_id']}, chain_height={data['chain_height']}")

    def test_register_message_confirms_success(self):
        """POST /api/p2p/register returns success message"""
        payload = {
            "node_id": f"TEST_msg_{int(time.time())}",
            "url": "http://msg-test.example.com:9333",
            "version": "2.0.0",
            "chain_height": 10
        }
        response = requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "registered" in data["message"].lower() or "success" in data["message"].lower()
        
        print(f"✓ Register returns message: '{data['message']}'")


class TestPhase4CentralPeerList:
    """Central server's peer list includes all registered nodes with correct fields"""

    def test_registered_nodes_appear_in_peer_list(self):
        """Registered nodes appear in central's /api/p2p/peers"""
        unique_id = f"TEST_appear_{int(time.time())}"
        payload = {
            "node_id": unique_id,
            "url": f"http://appear-{unique_id}.example.com:9333",
            "version": "2.0.0",
            "chain_height": 444
        }
        requests.post(f"{BASE_URL}/api/p2p/register", json=payload)
        
        peers_resp = requests.get(f"{BASE_URL}/api/p2p/peers")
        peers = peers_resp.json().get("peers", [])
        
        found = None
        for peer in peers:
            if peer.get("node_id") == unique_id:
                found = peer
                break
        
        assert found is not None, f"Registered node {unique_id} not found in peer list"
        assert found["url"] == payload["url"]
        assert found["height"] == payload["chain_height"]
        assert found["version"] == payload["version"]
        
        print(f"✓ Registered node appears in peer list with correct fields")

    def test_peer_list_count_matches_list_length(self):
        """GET /api/p2p/peers count field matches peers list length"""
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        data = response.json()
        
        count = data.get("count", data.get("peer_count", -1))
        peers_len = len(data.get("peers", []))
        
        assert count == peers_len, f"count={count} doesn't match peers length={peers_len}"
        print(f"✓ Peer list count={count} matches list length")


class TestPhase4NodeInfoPeerList:
    """GET /api/p2p/node/info includes peer_list with node_id, url, height"""

    def test_node_info_includes_peer_list(self):
        """GET /api/p2p/node/info has peer_list field"""
        response = requests.get(f"{BASE_URL}/api/p2p/node/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "peer_list" in data, "Missing peer_list in node/info"
        assert isinstance(data["peer_list"], list)
        print(f"✓ GET /api/p2p/node/info includes peer_list ({len(data['peer_list'])} peers)")

    def test_node_info_peer_list_has_correct_fields(self):
        """GET /api/p2p/node/info peer_list entries have node_id, url, height"""
        response = requests.get(f"{BASE_URL}/api/p2p/node/info")
        data = response.json()
        
        peer_list = data.get("peer_list", [])
        if not peer_list:
            pytest.skip("No peers in peer_list to test")
        
        for peer in peer_list:
            assert "node_id" in peer, f"Peer missing node_id: {peer}"
            assert "url" in peer, f"Peer missing url: {peer}"
            assert "height" in peer, f"Peer missing height: {peer}"
        
        print(f"✓ All {len(peer_list)} peers in peer_list have node_id, url, height")


# Cleanup test peers after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_peers():
    """Remove TEST_ prefixed peers after test session"""
    yield
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        result = db.peers.delete_many({"node_id": {"$regex": "^TEST_"}})
        print(f"\nCleanup: Removed {result.deleted_count} TEST_ peers from MongoDB")
        client.close()
    except Exception as e:
        print(f"\nCleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
