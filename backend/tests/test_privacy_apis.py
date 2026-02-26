"""
BricsCoin Privacy Suite API Tests
=================================
Tests for Ring Signatures, Stealth Addresses, and privacy features.
"""

import pytest
import requests
import os
from ecdsa import SigningKey, SECP256k1

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestPrivacyStatus:
    """Test /api/privacy/status endpoint"""

    def test_privacy_status_returns_200(self):
        """GET /api/privacy/status - Returns 200"""
        response = requests.get(f"{BASE_URL}/api/privacy/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Privacy status endpoint returns 200")

    def test_privacy_status_has_ring_signatures(self):
        """GET /api/privacy/status - Has ring_signatures feature"""
        response = requests.get(f"{BASE_URL}/api/privacy/status")
        assert response.status_code == 200
        data = response.json()
        assert "features" in data
        assert "ring_signatures" in data["features"]
        ring_sig = data["features"]["ring_signatures"]
        assert ring_sig["protocol"] == "LSAG (Linkable SAG)"
        assert ring_sig["curve"] == "secp256k1"
        assert ring_sig["purpose"] == "Hide sender identity"
        print("PASS: Ring signatures feature present with correct values")

    def test_privacy_status_has_stealth_addresses(self):
        """GET /api/privacy/status - Has stealth_addresses feature"""
        response = requests.get(f"{BASE_URL}/api/privacy/status")
        assert response.status_code == 200
        data = response.json()
        assert "features" in data
        assert "stealth_addresses" in data["features"]
        stealth = data["features"]["stealth_addresses"]
        assert stealth["protocol"] == "DHKE Stealth Address"
        assert stealth["curve"] == "secp256k1"
        assert stealth["purpose"] == "Hide receiver identity"
        assert stealth["address_prefix"] == "BRICSX"
        print("PASS: Stealth addresses feature present with correct values")

    def test_privacy_status_has_shielded_amounts(self):
        """GET /api/privacy/status - Has shielded_amounts feature"""
        response = requests.get(f"{BASE_URL}/api/privacy/status")
        assert response.status_code == 200
        data = response.json()
        assert "features" in data
        assert "shielded_amounts" in data["features"]
        shielded = data["features"]["shielded_amounts"]
        assert shielded["protocol"] == "zk-STARK (FRI)"
        assert shielded["purpose"] == "Hide transaction amount"
        assert shielded["integrated"] == True
        print("PASS: Shielded amounts feature present with correct values")


class TestStealthMetaAddress:
    """Test /api/privacy/stealth/generate-meta endpoint"""

    def test_generate_stealth_meta_returns_200(self):
        """POST /api/privacy/stealth/generate-meta - Returns 200"""
        response = requests.post(f"{BASE_URL}/api/privacy/stealth/generate-meta", json={})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Generate stealth meta-address returns 200")

    def test_generate_stealth_meta_returns_keypairs(self):
        """POST /api/privacy/stealth/generate-meta - Returns scan and spend keypairs"""
        response = requests.post(f"{BASE_URL}/api/privacy/stealth/generate-meta", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "meta_address" in data
        meta = data["meta_address"]
        
        # Check all required keys
        assert "scan_private_key" in meta
        assert "scan_public_key" in meta
        assert "spend_private_key" in meta
        assert "spend_public_key" in meta
        assert "stealth_meta_address" in meta
        
        # Check key lengths (128 hex chars = 64 bytes for secp256k1 public keys)
        assert len(meta["scan_public_key"]) == 128, f"scan_public_key should be 128 hex chars, got {len(meta['scan_public_key'])}"
        assert len(meta["spend_public_key"]) == 128, f"spend_public_key should be 128 hex chars, got {len(meta['spend_public_key'])}"
        assert len(meta["scan_private_key"]) == 64, f"scan_private_key should be 64 hex chars, got {len(meta['scan_private_key'])}"
        assert len(meta["spend_private_key"]) == 64, f"spend_private_key should be 64 hex chars, got {len(meta['spend_private_key'])}"
        
        # Check stealth meta-address starts with BRICSTEALTH
        assert meta["stealth_meta_address"].startswith("BRICSTEALTH")
        print("PASS: Generate stealth meta-address returns valid keypairs")


class TestRingSignature:
    """Test /api/privacy/ring/sign endpoint"""

    @pytest.fixture
    def generate_keypairs(self):
        """Generate ECDSA keypairs for ring signature testing"""
        keypairs = []
        for _ in range(3):
            sk = SigningKey.generate(curve=SECP256k1)
            pk = sk.get_verifying_key().to_string().hex()
            keypairs.append({
                "private_key": sk.to_string().hex(),
                "public_key": pk
            })
        return keypairs

    def test_ring_sign_returns_200(self, generate_keypairs):
        """POST /api/privacy/ring/sign - Returns 200 with valid ring signature"""
        keypairs = generate_keypairs
        public_keys = [kp["public_key"] for kp in keypairs]
        
        payload = {
            "message": "Test ring signature message",
            "private_key": keypairs[0]["private_key"],
            "public_keys": public_keys,
            "real_index": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/privacy/ring/sign", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Ring sign returns 200")

    def test_ring_sign_returns_signature_structure(self, generate_keypairs):
        """POST /api/privacy/ring/sign - Returns proper signature structure"""
        keypairs = generate_keypairs
        public_keys = [kp["public_key"] for kp in keypairs]
        
        payload = {
            "message": "Test ring signature message",
            "private_key": keypairs[0]["private_key"],
            "public_keys": public_keys,
            "real_index": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/privacy/ring/sign", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "signature" in data
        sig = data["signature"]
        
        # Check signature structure
        assert "c0" in sig
        assert "s" in sig
        assert "key_image" in sig
        assert "ring_size" in sig
        assert "public_keys" in sig
        assert "message_hash" in sig
        
        assert sig["ring_size"] == 3
        assert len(sig["s"]) == 3
        assert len(sig["public_keys"]) == 3
        
        # Check metadata
        assert "metadata" in data
        assert data["metadata"]["sender_hidden"] == True
        assert data["metadata"]["protocol"] == "LSAG"
        print("PASS: Ring sign returns proper signature structure with sender_hidden=True")

    def test_ring_sign_requires_minimum_ring_size(self):
        """POST /api/privacy/ring/sign - Requires at least 2 members in ring"""
        sk = SigningKey.generate(curve=SECP256k1)
        pk = sk.get_verifying_key().to_string().hex()
        
        payload = {
            "message": "Test message",
            "private_key": sk.to_string().hex(),
            "public_keys": [pk],  # Only 1 member
            "real_index": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/privacy/ring/sign", json=payload)
        assert response.status_code == 400, f"Expected 400 for single member ring, got {response.status_code}"
        print("PASS: Ring sign rejects single member ring")


class TestRingVerify:
    """Test /api/privacy/ring/verify endpoint"""

    @pytest.fixture
    def create_ring_signature(self):
        """Create a valid ring signature for verification testing"""
        keypairs = []
        for _ in range(3):
            sk = SigningKey.generate(curve=SECP256k1)
            pk = sk.get_verifying_key().to_string().hex()
            keypairs.append({
                "private_key": sk.to_string().hex(),
                "public_key": pk
            })
        
        public_keys = [kp["public_key"] for kp in keypairs]
        message = "Test message for verification"
        
        payload = {
            "message": message,
            "private_key": keypairs[0]["private_key"],
            "public_keys": public_keys,
            "real_index": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/privacy/ring/sign", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        return {
            "signature": data["signature"],
            "message": message
        }

    def test_ring_verify_returns_valid_true(self, create_ring_signature):
        """POST /api/privacy/ring/verify - Returns valid=true for valid signature"""
        sig_data = create_ring_signature
        
        payload = {
            "signature": sig_data["signature"],
            "message": sig_data["message"]
        }
        
        response = requests.post(f"{BASE_URL}/api/privacy/ring/verify", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["valid"] == True, f"Expected valid=True, got {data}"
        assert data["sender_hidden"] == True, f"Expected sender_hidden=True, got {data}"
        assert data["protocol"] == "LSAG (Linkable SAG)"
        assert data["curve"] == "secp256k1"
        print("PASS: Ring verify returns valid=true and sender_hidden=true for valid signature")

    def test_ring_verify_returns_invalid_for_wrong_message(self, create_ring_signature):
        """POST /api/privacy/ring/verify - Returns valid=false for wrong message"""
        sig_data = create_ring_signature
        
        payload = {
            "signature": sig_data["signature"],
            "message": "Wrong message"  # Different from original
        }
        
        response = requests.post(f"{BASE_URL}/api/privacy/ring/verify", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["valid"] == False, f"Expected valid=False for wrong message, got {data}"
        print("PASS: Ring verify returns valid=false for wrong message")


class TestStealthAddress:
    """Test /api/privacy/stealth/generate-address endpoint"""

    def test_generate_stealth_address_returns_200(self):
        """POST /api/privacy/stealth/generate-address - Returns 200"""
        # First generate a meta-address to get scan and spend public keys
        meta_response = requests.post(f"{BASE_URL}/api/privacy/stealth/generate-meta", json={})
        assert meta_response.status_code == 200
        meta = meta_response.json()["meta_address"]
        
        payload = {
            "scan_pubkey": meta["scan_public_key"],
            "spend_pubkey": meta["spend_public_key"]
        }
        
        response = requests.post(f"{BASE_URL}/api/privacy/stealth/generate-address", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Generate stealth address returns 200")

    def test_generate_stealth_address_returns_one_time_address(self):
        """POST /api/privacy/stealth/generate-address - Returns one-time stealth address"""
        # First generate a meta-address
        meta_response = requests.post(f"{BASE_URL}/api/privacy/stealth/generate-meta", json={})
        assert meta_response.status_code == 200
        meta = meta_response.json()["meta_address"]
        
        payload = {
            "scan_pubkey": meta["scan_public_key"],
            "spend_pubkey": meta["spend_public_key"]
        }
        
        response = requests.post(f"{BASE_URL}/api/privacy/stealth/generate-address", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "stealth_address" in data
        assert "stealth_pubkey" in data
        assert "ephemeral_pubkey" in data
        
        # Stealth address should start with BRICSX
        assert data["stealth_address"].startswith("BRICSX"), f"Stealth address should start with BRICSX, got {data['stealth_address']}"
        
        # Ephemeral pubkey should be 128 hex chars
        assert len(data["ephemeral_pubkey"]) == 128, f"ephemeral_pubkey should be 128 hex chars, got {len(data['ephemeral_pubkey'])}"
        print("PASS: Generate stealth address returns valid one-time address starting with BRICSX")


class TestStealthScan:
    """Test /api/privacy/stealth/scan endpoint"""

    def test_stealth_scan_returns_200(self):
        """POST /api/privacy/stealth/scan - Returns 200"""
        # First generate a meta-address
        meta_response = requests.post(f"{BASE_URL}/api/privacy/stealth/generate-meta", json={})
        assert meta_response.status_code == 200
        meta = meta_response.json()["meta_address"]
        
        payload = {
            "scan_private_key": meta["scan_private_key"],
            "spend_pubkey": meta["spend_public_key"]
        }
        
        response = requests.post(f"{BASE_URL}/api/privacy/stealth/scan", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Stealth scan returns 200")

    def test_stealth_scan_returns_scan_results(self):
        """POST /api/privacy/stealth/scan - Returns scan results structure"""
        # First generate a meta-address
        meta_response = requests.post(f"{BASE_URL}/api/privacy/stealth/generate-meta", json={})
        assert meta_response.status_code == 200
        meta = meta_response.json()["meta_address"]
        
        payload = {
            "scan_private_key": meta["scan_private_key"],
            "spend_pubkey": meta["spend_public_key"]
        }
        
        response = requests.post(f"{BASE_URL}/api/privacy/stealth/scan", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "payments_found" in data
        assert "matches" in data
        assert "transactions_scanned" in data
        assert "scan_time_ms" in data
        
        # payments_found should be a number
        assert isinstance(data["payments_found"], int)
        # matches should be a list
        assert isinstance(data["matches"], list)
        print("PASS: Stealth scan returns proper results structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
