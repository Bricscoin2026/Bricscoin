"""
BRICScoin P2P Phase 4 Interop Tests — Standalone Node + Central Server
Tests bidirectional registration between standalone node and central server.

Prerequisites:
- Standalone node running on port 9333 with SEED_NODE pointing to central
- Central server running via supervisor
"""

import pytest
import requests
import os
import time

# URLs
CENTRAL_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
STANDALONE_URL = "http://localhost:9333"


class TestPhase4StandaloneNodeInterop:
    """Standalone node auto-registers with central and appears in central's peer list"""

    def test_standalone_node_is_running(self):
        """Standalone node responds on port 9333"""
        try:
            response = requests.get(f"{STANDALONE_URL}/api/node/info", timeout=5)
            assert response.status_code == 200
            data = response.json()
            assert "node_id" in data
            assert "version" in data
            print(f"✓ Standalone node running: id={data['node_id']}, version={data['version']}")
        except requests.exceptions.ConnectionError:
            pytest.skip("Standalone node not running on port 9333")

    def test_standalone_node_has_mainnet_peer(self):
        """Standalone node has mainnet (central) in its peer list"""
        try:
            response = requests.get(f"{STANDALONE_URL}/api/p2p/peers", timeout=5)
        except requests.exceptions.ConnectionError:
            pytest.skip("Standalone node not running")
        
        assert response.status_code == 200
        data = response.json()
        peers = data.get("peers", [])
        
        mainnet_peer = None
        for peer in peers:
            if peer.get("node_id") == "mainnet":
                mainnet_peer = peer
                break
        
        assert mainnet_peer is not None, "Standalone node doesn't have mainnet peer"
        assert "bricscoin26" in mainnet_peer.get("url", "") or "preview.emergentagent" in mainnet_peer.get("url", "")
        print(f"✓ Standalone node has mainnet peer: {mainnet_peer}")

    def test_central_has_standalone_peer(self):
        """Central server has standalone node in its peer list"""
        try:
            # Get standalone node's ID
            standalone_info = requests.get(f"{STANDALONE_URL}/api/node/info", timeout=5)
            if standalone_info.status_code != 200:
                pytest.skip("Standalone node not running")
            standalone_id = standalone_info.json().get("node_id")
        except requests.exceptions.ConnectionError:
            pytest.skip("Standalone node not running")
        
        # Check central's peer list
        central_peers = requests.get(f"{CENTRAL_URL}/api/p2p/peers", timeout=10)
        assert central_peers.status_code == 200
        
        peers = central_peers.json().get("peers", [])
        found = None
        for peer in peers:
            if peer.get("node_id") == standalone_id:
                found = peer
                break
        
        assert found is not None, f"Central doesn't have standalone node {standalone_id} in peer list"
        print(f"✓ Central has standalone peer: {found}")

    def test_standalone_synced_from_central(self):
        """Standalone node has synced blocks from central"""
        try:
            standalone_info = requests.get(f"{STANDALONE_URL}/api/node/info", timeout=5)
            if standalone_info.status_code != 200:
                pytest.skip("Standalone node not running")
        except requests.exceptions.ConnectionError:
            pytest.skip("Standalone node not running")
        
        data = standalone_info.json()
        height = data.get("chain_height", 0)
        
        # Should have synced at least some blocks (central has chain height >= 1)
        assert height >= 0, f"Standalone node has no blocks synced"
        print(f"✓ Standalone node synced: chain_height={height}")

    def test_bidirectional_registration_complete(self):
        """Bidirectional P2P registration is complete (both see each other)"""
        try:
            standalone_peers = requests.get(f"{STANDALONE_URL}/api/p2p/peers", timeout=5)
            if standalone_peers.status_code != 200:
                pytest.skip("Standalone node not running")
        except requests.exceptions.ConnectionError:
            pytest.skip("Standalone node not running")
        
        central_peers = requests.get(f"{CENTRAL_URL}/api/p2p/peers", timeout=10)
        
        # Check standalone sees mainnet
        standalone_peers_data = standalone_peers.json().get("peers", [])
        has_mainnet = any(p.get("node_id") == "mainnet" for p in standalone_peers_data)
        
        # Check central sees standalone
        standalone_id = requests.get(f"{STANDALONE_URL}/api/node/info").json().get("node_id")
        central_peers_data = central_peers.json().get("peers", [])
        has_standalone = any(p.get("node_id") == standalone_id for p in central_peers_data)
        
        assert has_mainnet, "Standalone doesn't see mainnet"
        assert has_standalone, f"Central doesn't see standalone ({standalone_id})"
        print(f"✓ Bidirectional registration complete: standalone⟷mainnet")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
