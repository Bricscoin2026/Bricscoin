"""
Test PQC Block Signing Features - BricsCoin v2.0
Tests the new PQC block signing endpoints and stats:
- GET /api/pqc/node/keys - Node PQC public keys
- GET /api/pqc/stats - Now includes total_pqc_blocks and total_blocks
- GET /api/pqc/block/{index}/verify - Block PQC signature verification
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://crypto-privacy-3.preview.emergentagent.com"


class TestPQCNodeKeys:
    """Test GET /api/pqc/node/keys endpoint"""
    
    def test_node_keys_endpoint_returns_200(self):
        """Node keys endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/pqc/node/keys")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Node keys endpoint returns 200")
    
    def test_node_keys_has_required_fields(self):
        """Node keys should include ecdsa_public_key, dilithium_public_key, scheme"""
        response = requests.get(f"{BASE_URL}/api/pqc/node/keys")
        data = response.json()
        
        assert "node_id" in data, "Missing node_id field"
        assert "ecdsa_public_key" in data, "Missing ecdsa_public_key field"
        assert "dilithium_public_key" in data, "Missing dilithium_public_key field"
        assert "scheme" in data, "Missing scheme field"
        print("PASS: Node keys has all required fields")
    
    def test_node_keys_ecdsa_format(self):
        """ECDSA public key should be 128 hex characters"""
        response = requests.get(f"{BASE_URL}/api/pqc/node/keys")
        data = response.json()
        
        ecdsa_pk = data.get("ecdsa_public_key", "")
        assert len(ecdsa_pk) == 128, f"ECDSA public key should be 128 chars, got {len(ecdsa_pk)}"
        assert all(c in '0123456789abcdef' for c in ecdsa_pk.lower()), "ECDSA public key should be hex"
        print(f"PASS: ECDSA public key is valid (128 hex chars)")
    
    def test_node_keys_dilithium_format(self):
        """Dilithium public key should be 3904 hex characters (ML-DSA-65)"""
        response = requests.get(f"{BASE_URL}/api/pqc/node/keys")
        data = response.json()
        
        dil_pk = data.get("dilithium_public_key", "")
        assert len(dil_pk) == 3904, f"Dilithium public key should be 3904 chars, got {len(dil_pk)}"
        assert all(c in '0123456789abcdef' for c in dil_pk.lower()), "Dilithium public key should be hex"
        print(f"PASS: Dilithium public key is valid (3904 hex chars)")
    
    def test_node_keys_scheme(self):
        """Scheme should be ecdsa_secp256k1+ml-dsa-65"""
        response = requests.get(f"{BASE_URL}/api/pqc/node/keys")
        data = response.json()
        
        scheme = data.get("scheme")
        assert scheme == "ecdsa_secp256k1+ml-dsa-65", f"Expected scheme 'ecdsa_secp256k1+ml-dsa-65', got '{scheme}'"
        print("PASS: Scheme is correct (ecdsa_secp256k1+ml-dsa-65)")


class TestPQCStatsWithBlocks:
    """Test GET /api/pqc/stats endpoint with new block fields"""
    
    def test_stats_returns_200(self):
        """Stats endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/pqc/stats")
        assert response.status_code == 200
        print("PASS: PQC stats endpoint returns 200")
    
    def test_stats_has_total_pqc_blocks(self):
        """Stats should include total_pqc_blocks field"""
        response = requests.get(f"{BASE_URL}/api/pqc/stats")
        data = response.json()
        
        assert "total_pqc_blocks" in data, "Missing total_pqc_blocks field"
        assert isinstance(data["total_pqc_blocks"], int), "total_pqc_blocks should be an integer"
        print(f"PASS: total_pqc_blocks field present (value: {data['total_pqc_blocks']})")
    
    def test_stats_has_total_blocks(self):
        """Stats should include total_blocks field"""
        response = requests.get(f"{BASE_URL}/api/pqc/stats")
        data = response.json()
        
        assert "total_blocks" in data, "Missing total_blocks field"
        assert isinstance(data["total_blocks"], int), "total_blocks should be an integer"
        print(f"PASS: total_blocks field present (value: {data['total_blocks']})")
    
    def test_stats_pqc_blocks_leq_total_blocks(self):
        """total_pqc_blocks should be <= total_blocks"""
        response = requests.get(f"{BASE_URL}/api/pqc/stats")
        data = response.json()
        
        pqc_blocks = data.get("total_pqc_blocks", 0)
        total_blocks = data.get("total_blocks", 0)
        assert pqc_blocks <= total_blocks, f"PQC blocks ({pqc_blocks}) > total blocks ({total_blocks})"
        print(f"PASS: total_pqc_blocks ({pqc_blocks}) <= total_blocks ({total_blocks})")
    
    def test_stats_has_all_required_fields(self):
        """Stats should have all expected fields"""
        response = requests.get(f"{BASE_URL}/api/pqc/stats")
        data = response.json()
        
        required_fields = [
            "total_pqc_wallets",
            "total_pqc_transactions",
            "total_pqc_blocks",
            "total_blocks",
            "signature_scheme",
            "quantum_resistant",
            "status"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print("PASS: All required fields present in stats")


class TestPQCBlockVerify:
    """Test GET /api/pqc/block/{index}/verify endpoint"""
    
    def test_genesis_block_verify_returns_200(self):
        """Genesis block verify should return 200"""
        response = requests.get(f"{BASE_URL}/api/pqc/block/0/verify")
        assert response.status_code == 200
        print("PASS: Genesis block verify returns 200")
    
    def test_genesis_block_has_no_pqc_signature(self):
        """Genesis block (index 0) should have has_pqc_signature=false"""
        response = requests.get(f"{BASE_URL}/api/pqc/block/0/verify")
        data = response.json()
        
        assert "has_pqc_signature" in data, "Missing has_pqc_signature field"
        assert data["has_pqc_signature"] == False, "Genesis block should not have PQC signature"
        assert "block_index" in data and data["block_index"] == 0, "Should return block_index 0"
        print("PASS: Genesis block correctly has no PQC signature")
    
    def test_genesis_block_has_message(self):
        """Genesis block verify should include explanation message"""
        response = requests.get(f"{BASE_URL}/api/pqc/block/0/verify")
        data = response.json()
        
        assert "message" in data, "Missing message field for pre-PQC block"
        assert "before PQC" in data["message"].lower() or "pqc" in data["message"].lower(), \
            f"Message should explain pre-PQC status: {data.get('message')}"
        print(f"PASS: Genesis block has explanation message: {data.get('message')}")
    
    def test_nonexistent_block_returns_404(self):
        """Nonexistent block should return 404"""
        response = requests.get(f"{BASE_URL}/api/pqc/block/999999/verify")
        assert response.status_code == 404, f"Expected 404 for nonexistent block, got {response.status_code}"
        print("PASS: Nonexistent block returns 404")


class TestBlockDetailAPI:
    """Test blocks API returns PQC fields when present"""
    
    def test_get_block_0(self):
        """Get genesis block should succeed"""
        response = requests.get(f"{BASE_URL}/api/blocks/0")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("index") == 0, "Block index should be 0"
        assert "hash" in data, "Block should have hash"
        assert "previous_hash" in data, "Block should have previous_hash"
        print("PASS: Get genesis block succeeds")
    
    def test_genesis_block_no_pqc_fields(self):
        """Genesis block should NOT have PQC signature fields"""
        response = requests.get(f"{BASE_URL}/api/blocks/0")
        data = response.json()
        
        pqc_fields = ["pqc_scheme", "pqc_ecdsa_signature", "pqc_dilithium_signature"]
        missing_pqc = all(field not in data for field in pqc_fields)
        
        assert missing_pqc, f"Genesis block should not have PQC fields: {[f for f in pqc_fields if f in data]}"
        print("PASS: Genesis block correctly has no PQC signature fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
