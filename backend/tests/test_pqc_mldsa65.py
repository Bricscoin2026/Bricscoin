"""
BricsCoin Post-Quantum Cryptography (PQC) API Tests
Tests for hybrid ECDSA + ML-DSA-65 (FIPS 204) wallet system

Key Changes since iteration_3:
- Backend switched from Dilithium2 to ML-DSA-65 (FIPS 204)
- Wallet import now requires 3 keys: ecdsa_private_key, dilithium_secret_key, dilithium_public_key
- ECDSA uses SHA-256 hashing with raw r||s format (128 hex chars)
- ML-DSA-65 key sizes: PK=1952 bytes (3904 hex), SK=4032 bytes (8064 hex), SIG=3309 bytes (6618 hex)
"""
import pytest
import requests
import os
import hashlib
from datetime import datetime, timezone
from ecdsa import SigningKey, SECP256k1

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ML-DSA-65 (FIPS 204) expected key sizes in hex chars
ML_DSA_65_PK_HEX_LEN = 3904   # 1952 bytes * 2
ML_DSA_65_SK_HEX_LEN = 8064   # 4032 bytes * 2
ML_DSA_65_SIG_HEX_LEN = 6618  # 3309 bytes * 2


class TestPQCWalletCreation:
    """Test POST /api/pqc/wallet/create - PQC wallet creation with ML-DSA-65 keys"""
    
    def test_pqc_wallet_create_success(self):
        """Create a hybrid PQC wallet with ML-DSA-65 keys"""
        response = requests.post(
            f"{BASE_URL}/api/pqc/wallet/create",
            json={"name": "TEST_PQC_MLDSA65_Wallet"}
        )
        
        # Handle rate limiting
        if response.status_code == 429:
            pytest.skip("Rate limited (5/min) - skipping test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify PQC address format: BRICSPQ + 38 hex chars = 45 total
        assert "address" in data
        assert data["address"].startswith("BRICSPQ"), f"Address should start with BRICSPQ"
        assert len(data["address"]) == 45, f"PQC address should be 45 chars, got {len(data['address'])}"
        
        # Verify ECDSA keys
        assert len(data["ecdsa_private_key"]) == 64, "ECDSA private key should be 64 hex chars"
        assert len(data["ecdsa_public_key"]) == 128, "ECDSA public key should be 128 hex chars"
        
        # Verify ML-DSA-65 keys (FIPS 204 sizes)
        dil_pk_len = len(data["dilithium_public_key"])
        dil_sk_len = len(data["dilithium_secret_key"])
        assert dil_pk_len == ML_DSA_65_PK_HEX_LEN, f"ML-DSA-65 public key should be {ML_DSA_65_PK_HEX_LEN} hex chars, got {dil_pk_len}"
        assert dil_sk_len == ML_DSA_65_SK_HEX_LEN, f"ML-DSA-65 secret key should be {ML_DSA_65_SK_HEX_LEN} hex chars, got {dil_sk_len}"
        
        # Verify seed phrase (12 words)
        assert "seed_phrase" in data
        words = data["seed_phrase"].split()
        assert len(words) == 12, f"Seed phrase should have 12 words, got {len(words)}"
        
        # Verify wallet type
        assert data.get("wallet_type") == "pqc_hybrid"
        
        print(f"✓ PQC wallet created with ML-DSA-65: {data['address'][:20]}...")
        print(f"  - ML-DSA-65 PK size: {dil_pk_len} hex chars")
        print(f"  - ML-DSA-65 SK size: {dil_sk_len} hex chars")
        
        return data


class TestPQCWalletImport:
    """Test POST /api/pqc/wallet/import - Import with all 3 keys required (fixed from iteration_3)"""
    
    def test_pqc_wallet_import_with_all_three_keys(self):
        """Import PQC wallet with ECDSA private key, Dilithium secret key, AND Dilithium public key"""
        # First create a wallet to get valid keys
        create_response = requests.post(
            f"{BASE_URL}/api/pqc/wallet/create",
            json={"name": "TEST_PQC_Import_Source"}
        )
        if create_response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert create_response.status_code == 200
        original_wallet = create_response.json()
        
        # Import using ALL 3 keys (FIXED from iteration_3)
        response = requests.post(
            f"{BASE_URL}/api/pqc/wallet/import",
            json={
                "ecdsa_private_key": original_wallet["ecdsa_private_key"],
                "dilithium_secret_key": original_wallet["dilithium_secret_key"],
                "dilithium_public_key": original_wallet["dilithium_public_key"],  # NEW requirement
                "name": "TEST_PQC_Imported_Wallet"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        imported_wallet = response.json()
        
        # Verify address format
        assert imported_wallet["address"].startswith("BRICSPQ")
        assert imported_wallet["wallet_type"] == "pqc_hybrid"
        
        # IMPORTANT: With the fix, addresses should now match!
        assert imported_wallet["address"] == original_wallet["address"], \
            f"Imported address {imported_wallet['address']} should match original {original_wallet['address']}"
        
        print(f"✓ PQC wallet import with 3 keys - address matches: {imported_wallet['address'][:20]}...")
    
    def test_pqc_wallet_import_missing_dilithium_pk_fails(self):
        """Import without dilithium_public_key should fail (validation requirement)"""
        # First create a wallet to get valid keys
        create_response = requests.post(
            f"{BASE_URL}/api/pqc/wallet/create",
            json={"name": "TEST_PQC_Import_Missing"}
        )
        if create_response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert create_response.status_code == 200
        wallet = create_response.json()
        
        # Try import WITHOUT dilithium_public_key
        response = requests.post(
            f"{BASE_URL}/api/pqc/wallet/import",
            json={
                "ecdsa_private_key": wallet["ecdsa_private_key"],
                "dilithium_secret_key": wallet["dilithium_secret_key"],
                # Missing dilithium_public_key
                "name": "TEST_Missing_Key"
            }
        )
        
        # Should fail with 422 (validation error) or 400
        assert response.status_code in [400, 422], \
            f"Expected 400/422 for missing dilithium_public_key, got {response.status_code}"
        
        print("✓ Import correctly requires dilithium_public_key")


class TestPQCStats:
    """Test GET /api/pqc/stats - Should show ML-DSA-65 scheme"""
    
    def test_pqc_stats_shows_mldsa65(self):
        """PQC stats should indicate ML-DSA-65 signature scheme"""
        response = requests.get(f"{BASE_URL}/api/pqc/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Required fields
        assert "total_pqc_wallets" in data
        assert "total_pqc_transactions" in data
        assert "quantum_resistant" in data
        assert "status" in data
        
        # Check signature scheme mentions ML-DSA-65
        sig_scheme = data.get("signature_scheme", "")
        assert "ML-DSA-65" in sig_scheme or "ml-dsa-65" in sig_scheme.lower(), \
            f"Signature scheme should mention ML-DSA-65, got: {sig_scheme}"
        
        # Verify values
        assert data["quantum_resistant"] == True
        assert data["status"] == "active"
        
        print(f"✓ PQC stats: {data['total_pqc_wallets']} wallets, scheme={sig_scheme}")


class TestCrossPlatformSignatureVerification:
    """
    Test cross-platform signature verification:
    1. Create wallet on backend (get keys)
    2. Sign message using ECDSA (SHA-256 + raw r||s) and simulate ML-DSA-65
    3. Verify on backend via POST /api/pqc/verify
    """
    
    def test_ecdsa_cross_platform_signature(self):
        """Test ECDSA signature with SHA-256 hash and raw r||s format"""
        # First create a PQC wallet to get keys
        create_response = requests.post(
            f"{BASE_URL}/api/pqc/wallet/create",
            json={"name": "TEST_CrossPlatform_ECDSA"}
        )
        if create_response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert create_response.status_code == 200
        wallet = create_response.json()
        
        # Sign a message using Python's ecdsa library with SHA-256
        message = "Test transaction data for cross-platform verification"
        
        # Create ECDSA signature with SHA-256 (matching backend pqc_crypto.py)
        ecdsa_sk = SigningKey.from_string(
            bytes.fromhex(wallet["ecdsa_private_key"]),
            curve=SECP256k1
        )
        ecdsa_sig = ecdsa_sk.sign(message.encode(), hashfunc=hashlib.sha256)
        ecdsa_sig_hex = ecdsa_sig.hex()
        
        # Verify signature length is 128 hex chars (64 bytes = raw r||s)
        assert len(ecdsa_sig_hex) == 128, f"ECDSA sig should be 128 hex chars, got {len(ecdsa_sig_hex)}"
        
        print(f"✓ ECDSA signature created: {ecdsa_sig_hex[:32]}...")
        
        # Now test verification endpoint (ECDSA only - ML-DSA-65 needs the actual library)
        # Note: This will show ecdsa_valid=True, dilithium_valid=False since we don't have ML-DSA-65 sig
        verify_response = requests.post(
            f"{BASE_URL}/api/pqc/verify",
            json={
                "message": message,
                "ecdsa_public_key": wallet["ecdsa_public_key"],
                "dilithium_public_key": wallet["dilithium_public_key"],
                "ecdsa_signature": ecdsa_sig_hex,
                "dilithium_signature": "00" * 3309  # Dummy ML-DSA-65 signature (wrong but right size)
            }
        )
        
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        # ECDSA should verify correctly
        assert verify_data["ecdsa_valid"] == True, \
            f"ECDSA signature should be valid, got: {verify_data}"
        
        # ML-DSA will be invalid since we used dummy sig
        assert verify_data["dilithium_valid"] == False
        assert verify_data["hybrid_valid"] == False  # Both need to be valid
        
        print(f"✓ Cross-platform ECDSA verification passed!")
        print(f"  ecdsa_valid={verify_data['ecdsa_valid']}, dilithium_valid={verify_data['dilithium_valid']}")


class TestPQCVerifyEndpoint:
    """Test POST /api/pqc/verify - Hybrid signature verification"""
    
    def test_verify_returns_correct_structure(self):
        """Verify endpoint returns ecdsa_valid, dilithium_valid, hybrid_valid"""
        response = requests.post(
            f"{BASE_URL}/api/pqc/verify",
            json={
                "message": "test",
                "ecdsa_public_key": "a" * 128,
                "dilithium_public_key": "b" * ML_DSA_65_PK_HEX_LEN,
                "ecdsa_signature": "c" * 128,
                "dilithium_signature": "d" * ML_DSA_65_SIG_HEX_LEN
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "ecdsa_valid" in data
        assert "dilithium_valid" in data
        assert "hybrid_valid" in data
        
        # With random data, all should be invalid
        assert data["ecdsa_valid"] == False
        assert data["dilithium_valid"] == False
        assert data["hybrid_valid"] == False
        
        print("✓ Verify endpoint returns correct structure")


class TestPQCWalletInfo:
    """Test GET /api/pqc/wallet/{address}"""
    
    def test_pqc_wallet_info_success(self):
        """Get info for a PQC wallet"""
        # Create wallet first
        create_response = requests.post(
            f"{BASE_URL}/api/pqc/wallet/create",
            json={"name": "TEST_PQC_Info"}
        )
        if create_response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert create_response.status_code == 200
        wallet = create_response.json()
        
        # Get info
        response = requests.get(f"{BASE_URL}/api/pqc/wallet/{wallet['address']}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["address"] == wallet["address"]
        assert "balance" in data
        assert data["wallet_type"] == "pqc_hybrid"
        assert "ecdsa_public_key" in data
        assert "dilithium_public_key" in data
        
        print(f"✓ PQC wallet info retrieved: balance={data['balance']}")
    
    def test_pqc_wallet_info_rejects_legacy_address(self):
        """Non-PQC address should be rejected"""
        response = requests.get(f"{BASE_URL}/api/pqc/wallet/BRICS1234567890abcdef1234567890abcdef1234")
        
        assert response.status_code == 400
        assert "BRICSPQ" in response.json().get("detail", "")
        
        print("✓ Legacy BRICS address correctly rejected")


class TestPQCTransactionSecure:
    """Test POST /api/pqc/transaction/secure"""
    
    def test_requires_pqc_sender(self):
        """Transaction must have BRICSPQ sender address"""
        response = requests.post(
            f"{BASE_URL}/api/pqc/transaction/secure",
            json={
                "sender_address": "BRICS1234567890abcdef1234567890abcdef1234",  # Legacy
                "recipient_address": "BRICSPQ" + "0" * 38,
                "amount": 1.0,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "ecdsa_signature": "a" * 128,
                "dilithium_signature": "b" * ML_DSA_65_SIG_HEX_LEN,
                "ecdsa_public_key": "c" * 128,
                "dilithium_public_key": "d" * ML_DSA_65_PK_HEX_LEN
            }
        )
        
        assert response.status_code == 400
        assert "PQC" in response.json().get("detail", "")
        
        print("✓ Transaction correctly requires PQC sender")
    
    def test_validates_hybrid_signatures(self):
        """Transaction should validate both ECDSA and ML-DSA-65 signatures"""
        # Create a PQC wallet
        create_response = requests.post(
            f"{BASE_URL}/api/pqc/wallet/create",
            json={"name": "TEST_PQC_TX_Sender"}
        )
        if create_response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert create_response.status_code == 200
        wallet = create_response.json()
        
        # Try with invalid signatures
        response = requests.post(
            f"{BASE_URL}/api/pqc/transaction/secure",
            json={
                "sender_address": wallet["address"],
                "recipient_address": "BRICSPQ" + "1" * 38,
                "amount": 0.1,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "ecdsa_signature": "a" * 128,
                "dilithium_signature": "b" * ML_DSA_65_SIG_HEX_LEN,
                "ecdsa_public_key": wallet["ecdsa_public_key"],
                "dilithium_public_key": wallet["dilithium_public_key"]
            }
        )
        
        # Should fail signature verification
        assert response.status_code == 400
        detail = response.json().get("detail", "").lower()
        assert "signature" in detail or "invalid" in detail
        
        print("✓ Transaction validates hybrid signatures")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
