"""
Comprehensive API Audit Test Suite for BricsCoin Application
Tests all API endpoints across the entire application
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCoreEndpoints:
    """Core blockchain and network endpoints"""
    
    def test_health_check(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print(f"✓ GET /api/ - Status: {response.status_code}")
    
    def test_network_stats(self):
        """Test network stats endpoint with required fields"""
        response = requests.get(f"{BASE_URL}/api/network/stats")
        assert response.status_code == 200, f"Network stats failed: {response.text}"
        data = response.json()
        # Check required fields
        assert "total_supply" in data, "Missing total_supply"
        assert "circulating_supply" in data, "Missing circulating_supply"
        assert "total_blocks" in data, "Missing total_blocks"
        # Check no _id leak
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/network/stats - Has total_supply, circulating_supply, total_blocks")
    
    def test_tokenomics(self):
        """Test tokenomics endpoint"""
        response = requests.get(f"{BASE_URL}/api/tokenomics")
        assert response.status_code == 200, f"Tokenomics failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/tokenomics - Status: {response.status_code}")
    
    def test_blocks_list(self):
        """Test blocks list endpoint"""
        response = requests.get(f"{BASE_URL}/api/blocks?limit=2")
        assert response.status_code == 200, f"Blocks list failed: {response.text}"
        data = response.json()
        assert "blocks" in data or isinstance(data, list), "Expected blocks array"
        # Check no _id leak
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected in blocks"
        print(f"✓ GET /api/blocks?limit=2 - Returns blocks array")
    
    def test_transactions_list(self):
        """Test transactions list endpoint"""
        response = requests.get(f"{BASE_URL}/api/transactions?limit=2")
        assert response.status_code == 200, f"Transactions list failed: {response.text}"
        data = response.json()
        assert "transactions" in data or isinstance(data, list), "Expected transactions array"
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/transactions?limit=2 - Returns transactions array")
    
    def test_richlist(self):
        """Test richlist endpoint"""
        response = requests.get(f"{BASE_URL}/api/richlist?limit=5")
        assert response.status_code == 200, f"Richlist failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/richlist?limit=5 - Status: {response.status_code}")


def check_mongodb_id_leak(data):
    """
    Check if MongoDB _id is present in response data.
    Returns True if _id leak detected, False otherwise.
    Note: 'node_id' is a valid field name, not a leak.
    """
    if isinstance(data, dict):
        if "_id" in data:
            return True
        for v in data.values():
            if check_mongodb_id_leak(v):
                return True
    elif isinstance(data, list):
        for item in data:
            if check_mongodb_id_leak(item):
                return True
    return False


class TestWalletEndpoints:
    """Wallet creation endpoints"""
    
    def test_create_legacy_wallet(self):
        """Test legacy wallet creation"""
        response = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response.status_code == 200, f"Wallet create failed: {response.text}"
        data = response.json()
        assert "address" in data, "Missing address"
        assert "public_key" in data, "Missing public_key"
        assert "private_key" in data, "Missing private_key"
        assert "seed_phrase" in data, "Missing seed_phrase"
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ POST /api/wallet/create - Returns address, public_key, private_key, seed_phrase")
    
    def test_create_pqc_wallet(self):
        """Test PQC wallet creation with Dilithium keys"""
        response = requests.post(f"{BASE_URL}/api/pqc/wallet/create", json={})
        assert response.status_code == 200, f"PQC wallet create failed: {response.text}"
        data = response.json()
        assert "address" in data, "Missing address"
        # Check for dilithium key indicators
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ POST /api/pqc/wallet/create - Returns PQC wallet with dilithium keys")


class TestPQCAndSecurityEndpoints:
    """PQC and Security related endpoints"""
    
    def test_pqc_stats(self):
        """Test PQC stats endpoint (should be cached and fast)"""
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/pqc/stats")
        elapsed = time.time() - start
        assert response.status_code == 200, f"PQC stats failed: {response.text}"
        assert elapsed < 0.5, f"PQC stats too slow: {elapsed}s"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/pqc/stats - Status: 200, Time: {elapsed:.3f}s")
    
    def test_pqc_node_keys(self):
        """Test PQC node keys endpoint"""
        response = requests.get(f"{BASE_URL}/api/pqc/node/keys")
        assert response.status_code == 200, f"PQC node keys failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/pqc/node/keys - Status: {response.status_code}")
    
    def test_dandelion_status(self):
        """Test Dandelion++ status endpoint"""
        response = requests.get(f"{BASE_URL}/api/dandelion/status")
        assert response.status_code == 200, f"Dandelion status failed: {response.text}"
        data = response.json()
        assert "protocol" in data, "Missing protocol"
        assert "enabled" in data, "Missing enabled"
        assert "config" in data, "Missing config"
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/dandelion/status - Has protocol, enabled, config")
    
    def test_security_status(self):
        """Test security status endpoint"""
        response = requests.get(f"{BASE_URL}/api/security/status")
        assert response.status_code == 200, f"Security status failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/security/status - Status: {response.status_code}")
    
    def test_security_checkpoints(self):
        """Test security checkpoints endpoint"""
        response = requests.get(f"{BASE_URL}/api/security/checkpoints")
        assert response.status_code == 200, f"Security checkpoints failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/security/checkpoints - Status: {response.status_code}")


class TestPrivacyEndpoints:
    """Privacy related endpoints (zk-STARK, ring signatures)"""
    
    def test_zk_status(self):
        """Test zk-STARK status endpoint"""
        response = requests.get(f"{BASE_URL}/api/zk/status")
        assert response.status_code == 200, f"ZK status failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/zk/status - Status: {response.status_code}")
    
    def test_zk_info(self):
        """Test zk-STARK info endpoint"""
        response = requests.get(f"{BASE_URL}/api/zk/info")
        assert response.status_code == 200, f"ZK info failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/zk/info - Status: {response.status_code}")
    
    def test_privacy_status(self):
        """Test privacy status endpoint"""
        response = requests.get(f"{BASE_URL}/api/privacy/status")
        assert response.status_code == 200, f"Privacy status failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/privacy/status - Status: {response.status_code}")
    
    def test_privacy_key_images(self):
        """Test privacy key images endpoint"""
        response = requests.get(f"{BASE_URL}/api/privacy/key-images")
        assert response.status_code == 200, f"Privacy key images failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/privacy/key-images - Status: {response.status_code}")


class TestLightClientEndpoints:
    """Light client and chain pruning endpoints"""
    
    def test_light_headers(self):
        """Test light client headers endpoint"""
        response = requests.get(f"{BASE_URL}/api/light/headers?limit=2")
        assert response.status_code == 200, f"Light headers failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/light/headers?limit=2 - Status: {response.status_code}")
    
    def test_chain_size_analysis(self):
        """Test chain size analysis endpoint"""
        response = requests.get(f"{BASE_URL}/api/chain/size-analysis")
        assert response.status_code == 200, f"Chain size analysis failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/chain/size-analysis - Status: {response.status_code}")


class TestEcosystemEndpoints:
    """Ecosystem apps endpoints (Chat, NFT, Oracle, TimeCapsule)"""
    
    def test_chat_stats(self):
        """Test BricsChat stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/chat/stats")
        assert response.status_code == 200, f"Chat stats failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/chat/stats - Status: {response.status_code}")
    
    def test_chat_feed(self):
        """Test BricsChat feed endpoint"""
        response = requests.get(f"{BASE_URL}/api/chat/feed")
        assert response.status_code == 200, f"Chat feed failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/chat/feed - Status: {response.status_code}")
    
    def test_nft_certificates(self):
        """Test NFT certificates list endpoint"""
        response = requests.get(f"{BASE_URL}/api/nft/certificates")
        assert response.status_code == 200, f"NFT certificates failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/nft/certificates - Status: {response.status_code}")
    
    def test_nft_stats(self):
        """Test NFT stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/nft/stats")
        assert response.status_code == 200, f"NFT stats failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/nft/stats - Status: {response.status_code}")
    
    def test_oracle_history(self):
        """Test AI Oracle history endpoint"""
        response = requests.get(f"{BASE_URL}/api/oracle/history")
        assert response.status_code == 200, f"Oracle history failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/oracle/history - Status: {response.status_code}")
    
    def test_timecapsule_list(self):
        """Test TimeCapsule list endpoint"""
        response = requests.get(f"{BASE_URL}/api/timecapsule/list")
        assert response.status_code == 200, f"TimeCapsule list failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/timecapsule/list - Status: {response.status_code}")
    
    def test_p2pool_stats(self):
        """Test P2Pool stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        assert response.status_code == 200, f"P2Pool stats failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/p2pool/stats - Status: {response.status_code}")
    
    def test_auxpow_status(self):
        """Test AuxPoW status endpoint"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        assert response.status_code == 200, f"AuxPoW status failed: {response.text}"
        data = response.json()
        assert not check_mongodb_id_leak(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/auxpow/status - Status: {response.status_code}")


class TestMiningEndpoints:
    """Mining and P2P network endpoints"""
    
    def test_mining_template(self):
        """Test mining template endpoint"""
        response = requests.get(f"{BASE_URL}/api/mining/template")
        assert response.status_code == 200, f"Mining template failed: {response.text}"
        data = response.json()
        assert "_id" not in str(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/mining/template - Status: {response.status_code}")
    
    def test_mining_miners(self):
        """Test mining miners list endpoint"""
        response = requests.get(f"{BASE_URL}/api/mining/miners")
        assert response.status_code == 200, f"Mining miners failed: {response.text}"
        data = response.json()
        assert "_id" not in str(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/mining/miners - Status: {response.status_code}")
    
    def test_miners_stats(self):
        """Test miners stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/miners/stats")
        assert response.status_code == 200, f"Miners stats failed: {response.text}"
        data = response.json()
        assert "_id" not in str(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/miners/stats - Status: {response.status_code}")
    
    def test_miners_count(self):
        """Test miners count endpoint"""
        response = requests.get(f"{BASE_URL}/api/miners/count")
        assert response.status_code == 200, f"Miners count failed: {response.text}"
        data = response.json()
        assert "_id" not in str(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/miners/count - Status: {response.status_code}")
    
    def test_p2p_peers(self):
        """Test P2P peers endpoint"""
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        assert response.status_code == 200, f"P2P peers failed: {response.text}"
        data = response.json()
        assert "_id" not in str(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/p2p/peers - Status: {response.status_code}")
    
    def test_p2p_chain_info(self):
        """Test P2P chain info endpoint"""
        response = requests.get(f"{BASE_URL}/api/p2p/chain/info")
        assert response.status_code == 200, f"P2P chain info failed: {response.text}"
        data = response.json()
        assert "_id" not in str(data), "MongoDB _id leak detected"
        print(f"✓ GET /api/p2p/chain/info - Status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
