"""
BricsCoin PQC Comprehensive Test Suite
Tests all Post-Quantum Cryptography features:
- Wallet generation (ML-DSA-65)
- Hybrid signing (ECDSA + ML-DSA-65)
- Cross-platform verification
- Wallet import/recovery
- Block signing
- API endpoints
"""

import pytest
import hashlib
import sys
import os
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pqc_crypto import (
    generate_pqc_wallet,
    recover_pqc_wallet,
    hybrid_sign,
    hybrid_verify,
    create_migration_transaction,
)

API_URL = os.environ.get(
    "TEST_API_URL",
    open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].strip(),
)


# ==================== UNIT TESTS: pqc_crypto ====================


class TestPQCWalletGeneration:
    def test_generate_wallet_returns_all_fields(self):
        w = generate_pqc_wallet()
        for field in [
            "address",
            "seed_phrase",
            "wallet_type",
            "ecdsa_private_key",
            "ecdsa_public_key",
            "dilithium_public_key",
            "dilithium_secret_key",
        ]:
            assert field in w, f"Missing field: {field}"

    def test_address_starts_with_bricspq(self):
        w = generate_pqc_wallet()
        assert w["address"].startswith("BRICSPQ")

    def test_address_length_is_45(self):
        w = generate_pqc_wallet()
        assert len(w["address"]) == 45

    def test_wallet_type_is_pqc_hybrid(self):
        w = generate_pqc_wallet()
        assert w["wallet_type"] == "pqc_hybrid"

    def test_seed_phrase_is_12_words(self):
        w = generate_pqc_wallet()
        assert len(w["seed_phrase"].split()) == 12

    def test_ecdsa_key_sizes(self):
        w = generate_pqc_wallet()
        assert len(w["ecdsa_private_key"]) == 64  # 32 bytes hex
        assert len(w["ecdsa_public_key"]) == 128  # 64 bytes hex

    def test_mldsa65_key_sizes(self):
        w = generate_pqc_wallet()
        # ML-DSA-65: PK=1952 bytes, SK=4032 bytes
        assert len(bytes.fromhex(w["dilithium_public_key"])) == 1952
        assert len(bytes.fromhex(w["dilithium_secret_key"])) == 4032

    def test_two_wallets_have_different_addresses(self):
        w1 = generate_pqc_wallet()
        w2 = generate_pqc_wallet()
        assert w1["address"] != w2["address"]

    def test_address_derived_from_both_pubkeys(self):
        w = generate_pqc_wallet()
        combined = hashlib.sha256(
            (w["ecdsa_public_key"] + w["dilithium_public_key"]).encode()
        ).hexdigest()
        expected = "BRICSPQ" + combined[:38]
        assert w["address"] == expected


class TestPQCWalletImport:
    def test_import_produces_same_address(self):
        w = generate_pqc_wallet()
        recovered = recover_pqc_wallet(
            w["ecdsa_private_key"],
            w["dilithium_secret_key"],
            w["dilithium_public_key"],
        )
        assert recovered["address"] == w["address"]

    def test_import_preserves_public_keys(self):
        w = generate_pqc_wallet()
        recovered = recover_pqc_wallet(
            w["ecdsa_private_key"],
            w["dilithium_secret_key"],
            w["dilithium_public_key"],
        )
        assert recovered["ecdsa_public_key"] == w["ecdsa_public_key"]
        assert recovered["dilithium_public_key"] == w["dilithium_public_key"]

    def test_import_with_invalid_ecdsa_key_raises(self):
        w = generate_pqc_wallet()
        with pytest.raises(ValueError):
            recover_pqc_wallet("invalid", w["dilithium_secret_key"], w["dilithium_public_key"])

    def test_import_wallet_type(self):
        w = generate_pqc_wallet()
        recovered = recover_pqc_wallet(
            w["ecdsa_private_key"],
            w["dilithium_secret_key"],
            w["dilithium_public_key"],
        )
        assert recovered["wallet_type"] == "pqc_hybrid"


class TestHybridSigning:
    def test_sign_returns_both_signatures(self):
        w = generate_pqc_wallet()
        sig = hybrid_sign(w["ecdsa_private_key"], w["dilithium_secret_key"], "test")
        assert "ecdsa_signature" in sig
        assert "dilithium_signature" in sig
        assert sig["scheme"] == "ecdsa_secp256k1+ml-dsa-65"

    def test_ecdsa_signature_is_128_hex(self):
        w = generate_pqc_wallet()
        sig = hybrid_sign(w["ecdsa_private_key"], w["dilithium_secret_key"], "test")
        assert len(sig["ecdsa_signature"]) == 128

    def test_mldsa_signature_is_6618_hex(self):
        w = generate_pqc_wallet()
        sig = hybrid_sign(w["ecdsa_private_key"], w["dilithium_secret_key"], "test")
        # ML-DSA-65 signature = 3309 bytes = 6618 hex chars
        assert len(sig["dilithium_signature"]) == 6618

    def test_verify_valid_signature(self):
        w = generate_pqc_wallet()
        msg = "transaction data here"
        sig = hybrid_sign(w["ecdsa_private_key"], w["dilithium_secret_key"], msg)
        result = hybrid_verify(
            w["ecdsa_public_key"],
            w["dilithium_public_key"],
            sig["ecdsa_signature"],
            sig["dilithium_signature"],
            msg,
        )
        assert result["ecdsa_valid"] is True
        assert result["dilithium_valid"] is True
        assert result["hybrid_valid"] is True

    def test_verify_wrong_message_fails(self):
        w = generate_pqc_wallet()
        sig = hybrid_sign(w["ecdsa_private_key"], w["dilithium_secret_key"], "original")
        result = hybrid_verify(
            w["ecdsa_public_key"],
            w["dilithium_public_key"],
            sig["ecdsa_signature"],
            sig["dilithium_signature"],
            "tampered",
        )
        assert result["hybrid_valid"] is False

    def test_verify_wrong_ecdsa_key_fails(self):
        w1 = generate_pqc_wallet()
        w2 = generate_pqc_wallet()
        msg = "test"
        sig = hybrid_sign(w1["ecdsa_private_key"], w1["dilithium_secret_key"], msg)
        result = hybrid_verify(
            w2["ecdsa_public_key"],  # wrong key
            w1["dilithium_public_key"],
            sig["ecdsa_signature"],
            sig["dilithium_signature"],
            msg,
        )
        assert result["ecdsa_valid"] is False
        assert result["hybrid_valid"] is False

    def test_verify_wrong_dilithium_key_fails(self):
        w1 = generate_pqc_wallet()
        w2 = generate_pqc_wallet()
        msg = "test"
        sig = hybrid_sign(w1["ecdsa_private_key"], w1["dilithium_secret_key"], msg)
        result = hybrid_verify(
            w1["ecdsa_public_key"],
            w2["dilithium_public_key"],  # wrong key
            sig["ecdsa_signature"],
            sig["dilithium_signature"],
            msg,
        )
        assert result["dilithium_valid"] is False
        assert result["hybrid_valid"] is False

    def test_sign_empty_message(self):
        w = generate_pqc_wallet()
        sig = hybrid_sign(w["ecdsa_private_key"], w["dilithium_secret_key"], "")
        result = hybrid_verify(
            w["ecdsa_public_key"],
            w["dilithium_public_key"],
            sig["ecdsa_signature"],
            sig["dilithium_signature"],
            "",
        )
        assert result["hybrid_valid"] is True

    def test_sign_unicode_message(self):
        w = generate_pqc_wallet()
        msg = "Transazione BricsCoin da 100 BRICS"
        sig = hybrid_sign(w["ecdsa_private_key"], w["dilithium_secret_key"], msg)
        result = hybrid_verify(
            w["ecdsa_public_key"],
            w["dilithium_public_key"],
            sig["ecdsa_signature"],
            sig["dilithium_signature"],
            msg,
        )
        assert result["hybrid_valid"] is True


class TestBlockSigning:
    def test_block_signature_roundtrip(self):
        """Simulate what the server does when signing a block"""
        w = generate_pqc_wallet()  # node keys
        block_data = "1|2026-02-17T20:00:00|abc123hash|BRICS_miner"
        sig = hybrid_sign(w["ecdsa_private_key"], w["dilithium_secret_key"], block_data)
        result = hybrid_verify(
            w["ecdsa_public_key"],
            w["dilithium_public_key"],
            sig["ecdsa_signature"],
            sig["dilithium_signature"],
            block_data,
        )
        assert result["hybrid_valid"] is True

    def test_tampered_block_data_fails(self):
        w = generate_pqc_wallet()
        block_data = "1|2026-02-17T20:00:00|abc123hash|BRICS_miner"
        sig = hybrid_sign(w["ecdsa_private_key"], w["dilithium_secret_key"], block_data)
        # Tamper: change block index
        tampered = "2|2026-02-17T20:00:00|abc123hash|BRICS_miner"
        result = hybrid_verify(
            w["ecdsa_public_key"],
            w["dilithium_public_key"],
            sig["ecdsa_signature"],
            sig["dilithium_signature"],
            tampered,
        )
        assert result["hybrid_valid"] is False


class TestMigration:
    def test_migration_transaction_structure(self):
        pqc_wallet = generate_pqc_wallet()
        # Create a fake legacy private key (32 bytes)
        from ecdsa import SigningKey, SECP256k1

        legacy_sk = SigningKey.generate(curve=SECP256k1)
        tx = create_migration_transaction(
            legacy_sk.to_string().hex(), pqc_wallet, 100.0
        )
        assert tx["sender_address"].startswith("BRICS")
        assert tx["recipient_address"].startswith("BRICSPQ")
        assert tx["amount"] == 100.0
        assert tx["migration"] is True
        assert tx["migration_type"] == "legacy_to_pqc"
        assert "signature" in tx
        assert "public_key" in tx


# ==================== API INTEGRATION TESTS ====================


class TestPQCAPIEndpoints:
    def test_create_wallet_api(self):
        r = requests.post(
            f"{API_URL}/api/pqc/wallet/create",
            json={"name": "Test Wallet"},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["address"].startswith("BRICSPQ")
        assert d["wallet_type"] == "pqc_hybrid"
        assert len(d["seed_phrase"].split()) == 12

    def test_import_wallet_api(self):
        # Create first
        r1 = requests.post(
            f"{API_URL}/api/pqc/wallet/create", json={"name": "Import Test"}
        )
        w = r1.json()
        # Import
        r2 = requests.post(
            f"{API_URL}/api/pqc/wallet/import",
            json={
                "ecdsa_private_key": w["ecdsa_private_key"],
                "dilithium_secret_key": w["dilithium_secret_key"],
                "dilithium_public_key": w["dilithium_public_key"],
                "name": "Imported",
            },
        )
        assert r2.status_code == 200
        assert r2.json()["address"] == w["address"]

    def test_wallet_info_api(self):
        r1 = requests.post(
            f"{API_URL}/api/pqc/wallet/create", json={"name": "Info Test"}
        )
        addr = r1.json()["address"]
        r2 = requests.get(f"{API_URL}/api/pqc/wallet/{addr}")
        assert r2.status_code == 200
        d = r2.json()
        assert d["address"] == addr
        assert d["wallet_type"] == "pqc_hybrid"
        assert d["balance"] == 0

    def test_pqc_stats_api(self):
        r = requests.get(f"{API_URL}/api/pqc/stats")
        assert r.status_code == 200
        d = r.json()
        assert d["quantum_resistant"] is True
        assert "total_pqc_wallets" in d
        assert "total_pqc_blocks" in d
        assert "total_blocks" in d

    def test_node_keys_api(self):
        r = requests.get(f"{API_URL}/api/pqc/node/keys")
        assert r.status_code == 200
        d = r.json()
        assert "ecdsa_public_key" in d
        assert "dilithium_public_key" in d
        assert d["scheme"] == "ecdsa_secp256k1+ml-dsa-65"

    def test_block_verify_genesis(self):
        r = requests.get(f"{API_URL}/api/pqc/block/0/verify")
        assert r.status_code == 200
        d = r.json()
        assert d["block_index"] == 0
        assert d["has_pqc_signature"] is False  # genesis pre-PQC

    def test_verify_signature_api(self):
        w = generate_pqc_wallet()
        msg = "api verify test"
        sig = hybrid_sign(w["ecdsa_private_key"], w["dilithium_secret_key"], msg)
        r = requests.post(
            f"{API_URL}/api/pqc/verify",
            json={
                "message": msg,
                "ecdsa_public_key": w["ecdsa_public_key"],
                "dilithium_public_key": w["dilithium_public_key"],
                "ecdsa_signature": sig["ecdsa_signature"],
                "dilithium_signature": sig["dilithium_signature"],
            },
        )
        assert r.status_code == 200
        d = r.json()
        assert d["hybrid_valid"] is True

    def test_wallets_list_api(self):
        r = requests.get(f"{API_URL}/api/pqc/wallets/list")
        assert r.status_code == 200
        d = r.json()
        assert "wallets" in d
        assert "total" in d

    def test_invalid_address_returns_400(self):
        r = requests.get(f"{API_URL}/api/pqc/wallet/INVALID_ADDRESS")
        assert r.status_code == 400

    def test_block_not_found_returns_404(self):
        r = requests.get(f"{API_URL}/api/pqc/block/999999/verify")
        assert r.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
