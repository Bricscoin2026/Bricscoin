"""
BRICScoin Wallet Integration Tests
==================================
Tests the integrated wallet features:
- POST /api/wallet/create (new wallet + recovery from seed)
- POST /api/wallet/import (import from private key)
- GET /api/wallet/info (address, balance from local chain)
- POST /api/wallet/send (transaction signing and broadcast)
- GET /api/wallet/transactions (transaction history)
- Wallet persistence (wallet.dat file)
- Balance calculation from local blockchain
"""

import pytest
import requests
import os
import json
import time
from ecdsa import VerifyingKey, SECP256k1
import hashlib

# Use the node URL - standalone node running on port 9333
BASE_URL = "http://localhost:9333"

# Known miner address with balance from mining rewards
KNOWN_MINER_ADDRESS = "BRICSab209c77a3d9e5c107780b40015dea480fc67a6c"

# Wallet file for testing
WALLET_FILE = "/tmp/test_wallet.dat"


class TestWalletWithoutWallet:
    """Test wallet endpoints when no wallet is loaded"""
    
    def test_wallet_info_no_wallet(self):
        """GET /api/wallet/info without wallet should return 400"""
        response = requests.get(f"{BASE_URL}/api/wallet/info")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "No wallet" in data["detail"] or "no wallet" in data["detail"].lower()
        print(f"PASS: No wallet returns 400 - {data['detail']}")
    
    def test_wallet_transactions_no_wallet(self):
        """GET /api/wallet/transactions without wallet should return 400"""
        response = requests.get(f"{BASE_URL}/api/wallet/transactions")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: No wallet transactions returns 400 - {data['detail']}")
    
    def test_wallet_send_no_wallet(self):
        """POST /api/wallet/send without wallet should return 400"""
        response = requests.post(f"{BASE_URL}/api/wallet/send", json={
            "recipient": KNOWN_MINER_ADDRESS,
            "amount": 1.0
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: No wallet send returns 400 - {data['detail']}")


class TestWalletCreate:
    """Test wallet creation and recovery"""
    
    def test_create_new_wallet(self):
        """POST /api/wallet/create creates new wallet with seed phrase"""
        # Clean up any existing wallet
        if os.path.exists(WALLET_FILE):
            os.remove(WALLET_FILE)
        
        response = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "address" in data
        assert "seed_phrase" in data
        assert "message" in data
        
        # Validate address format
        assert data["address"].startswith("BRICS"), f"Address should start with BRICS: {data['address']}"
        assert len(data["address"]) >= 45, f"Address too short: {data['address']}"
        
        # Validate seed phrase (should be 12 words)
        seed_words = data["seed_phrase"].split()
        assert len(seed_words) == 12, f"Expected 12-word seed phrase, got {len(seed_words)}"
        
        print(f"PASS: New wallet created")
        print(f"  Address: {data['address']}")
        print(f"  Seed phrase (12 words): {seed_words[:3]}...")
        
        # Store for recovery test
        pytest.wallet_address = data["address"]
        pytest.wallet_seed = data["seed_phrase"]
        
        return data
    
    def test_wallet_file_created(self):
        """Wallet.dat file should be created after wallet creation"""
        # Create wallet first
        response = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response.status_code == 200
        
        assert os.path.exists(WALLET_FILE), f"Wallet file not found: {WALLET_FILE}"
        
        with open(WALLET_FILE, "r") as f:
            wallet_data = json.load(f)
        
        assert "address" in wallet_data
        assert "public_key" in wallet_data
        assert "private_key" in wallet_data
        assert "created_at" in wallet_data
        
        print(f"PASS: Wallet file created with all required fields")
        print(f"  Address: {wallet_data['address']}")
        print(f"  Has private key: {len(wallet_data['private_key']) > 0}")
    
    def test_recover_wallet_from_seed(self):
        """POST /api/wallet/create with seed_phrase recovers existing wallet"""
        # First create a wallet to get the seed
        response1 = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response1.status_code == 200
        original = response1.json()
        original_address = original["address"]
        seed_phrase = original["seed_phrase"]
        
        print(f"Original wallet: {original_address}")
        print(f"Seed phrase: {seed_phrase[:30]}...")
        
        # Now recover using the seed phrase
        response2 = requests.post(f"{BASE_URL}/api/wallet/create", json={
            "seed_phrase": seed_phrase
        })
        assert response2.status_code == 200, f"Recovery failed: {response2.text}"
        recovered = response2.json()
        
        # Addresses should match
        assert recovered["address"] == original_address, \
            f"Recovered address mismatch: {recovered['address']} != {original_address}"
        
        print(f"PASS: Seed phrase recovery produces same address")
        print(f"  Original:  {original_address}")
        print(f"  Recovered: {recovered['address']}")
    
    def test_invalid_seed_phrase(self):
        """POST /api/wallet/create with invalid seed should return 400"""
        response = requests.post(f"{BASE_URL}/api/wallet/create", json={
            "seed_phrase": "invalid random words that are not valid bip39"
        })
        assert response.status_code == 400, f"Expected 400 for invalid seed, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "Invalid" in data["detail"]
        print(f"PASS: Invalid seed phrase rejected - {data['detail']}")


class TestWalletImport:
    """Test wallet import from private key"""
    
    def test_import_from_private_key(self):
        """POST /api/wallet/import imports wallet from private key"""
        # First create a wallet to get a valid private key
        response1 = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response1.status_code == 200
        original_address = response1.json()["address"]
        
        # Read private key from file
        with open(WALLET_FILE, "r") as f:
            wallet_data = json.load(f)
        private_key = wallet_data["private_key"]
        
        # Now import using just the private key
        response2 = requests.post(f"{BASE_URL}/api/wallet/import", json={
            "private_key": private_key
        })
        assert response2.status_code == 200, f"Import failed: {response2.text}"
        imported = response2.json()
        
        # Addresses should match
        assert imported["address"] == original_address, \
            f"Imported address mismatch: {imported['address']} != {original_address}"
        
        assert "message" in imported
        
        print(f"PASS: Private key import produces same address")
        print(f"  Original:  {original_address}")
        print(f"  Imported:  {imported['address']}")
    
    def test_import_invalid_private_key(self):
        """POST /api/wallet/import with invalid key should return 400"""
        response = requests.post(f"{BASE_URL}/api/wallet/import", json={
            "private_key": "invalid_not_hex_key"
        })
        assert response.status_code == 400, f"Expected 400 for invalid key, got {response.status_code}"
        print(f"PASS: Invalid private key rejected")


class TestWalletInfo:
    """Test wallet info and balance calculation"""
    
    def test_wallet_info_new_wallet(self):
        """GET /api/wallet/info returns address and zero balance for new wallet"""
        # Create a fresh wallet
        response1 = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response1.status_code == 200
        created_address = response1.json()["address"]
        
        # Get wallet info
        response2 = requests.get(f"{BASE_URL}/api/wallet/info")
        assert response2.status_code == 200, f"Expected 200, got {response2.status_code}: {response2.text}"
        
        data = response2.json()
        assert "address" in data
        assert "balance" in data
        assert "received" in data
        assert "spent" in data
        
        # Address should match
        assert data["address"] == created_address
        
        # New wallet should have zero balance
        assert data["balance"] == 0 or data["balance"] == 0.0
        assert data["received"] == 0 or data["received"] == 0.0
        assert data["spent"] == 0 or data["spent"] == 0.0
        
        print(f"PASS: Wallet info for new wallet")
        print(f"  Address: {data['address']}")
        print(f"  Balance: {data['balance']}")
        print(f"  Received: {data['received']}")
        print(f"  Spent: {data['spent']}")


class TestWalletSend:
    """Test transaction sending (should fail with insufficient balance)"""
    
    def test_send_insufficient_balance(self):
        """POST /api/wallet/send fails with insufficient balance"""
        # Create a fresh wallet (zero balance)
        response1 = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response1.status_code == 200
        
        # Try to send (should fail)
        response2 = requests.post(f"{BASE_URL}/api/wallet/send", json={
            "recipient": KNOWN_MINER_ADDRESS,
            "amount": 1.0
        })
        
        assert response2.status_code == 400, f"Expected 400 for insufficient balance, got {response2.status_code}"
        data = response2.json()
        assert "detail" in data
        assert "insufficient" in data["detail"].lower() or "Insufficient" in data["detail"]
        
        print(f"PASS: Send with insufficient balance rejected")
        print(f"  Error: {data['detail']}")
    
    def test_send_invalid_recipient(self):
        """POST /api/wallet/send with invalid recipient should fail"""
        # Create wallet first
        response1 = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response1.status_code == 200
        
        # Try sending to invalid address
        response2 = requests.post(f"{BASE_URL}/api/wallet/send", json={
            "recipient": "invalid_address",
            "amount": 1.0
        })
        
        # Should fail (either 400 for insufficient balance or validation)
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}"
        print(f"PASS: Send to invalid recipient handled")


class TestWalletTransactions:
    """Test transaction history"""
    
    def test_wallet_transactions_new_wallet(self):
        """GET /api/wallet/transactions returns empty list for new wallet"""
        # Create a fresh wallet
        response1 = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response1.status_code == 200
        
        # Get transactions
        response2 = requests.get(f"{BASE_URL}/api/wallet/transactions")
        assert response2.status_code == 200, f"Expected 200, got {response2.status_code}: {response2.text}"
        
        data = response2.json()
        assert "address" in data
        assert "transactions" in data
        assert "count" in data
        
        # New wallet should have no transactions
        assert isinstance(data["transactions"], list)
        assert data["count"] == 0 or len(data["transactions"]) == 0
        
        print(f"PASS: Transaction history for new wallet")
        print(f"  Address: {data['address']}")
        print(f"  Transaction count: {data['count']}")


class TestMinerBalance:
    """Test balance for known miner address"""
    
    def test_miner_address_balance(self):
        """GET /api/balance/{address} returns positive balance for miner"""
        response = requests.get(f"{BASE_URL}/api/balance/{KNOWN_MINER_ADDRESS}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "address" in data
        assert "balance" in data
        assert data["address"] == KNOWN_MINER_ADDRESS
        
        # Miner should have positive balance from mining rewards (~2500 BRICS)
        balance = data["balance"]
        print(f"Miner balance: {balance} BRICS")
        
        # Should have significant balance (at least 100 BRICS from mining)
        assert balance > 100, f"Expected miner to have >100 BRICS, got {balance}"
        
        print(f"PASS: Miner address has balance")
        print(f"  Address: {data['address']}")
        print(f"  Balance: {balance} BRICS")


class TestSignatureVerification:
    """Test ECDSA signature verification"""
    
    def test_signature_is_valid_ecdsa(self):
        """Transaction signatures are valid ECDSA on SECP256k1"""
        from ecdsa import SigningKey, VerifyingKey, SECP256k1
        
        # Create a wallet
        response = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response.status_code == 200
        
        # Read wallet file for keys
        with open(WALLET_FILE, "r") as f:
            wallet_data = json.load(f)
        
        private_key_hex = wallet_data["private_key"]
        public_key_hex = wallet_data["public_key"]
        
        # Verify keys are valid ECDSA SECP256k1
        try:
            private_key = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
            public_key = VerifyingKey.from_string(bytes.fromhex(public_key_hex), curve=SECP256k1)
            
            # Verify the public key matches the private key
            derived_pubkey = private_key.get_verifying_key()
            assert public_key.to_string() == derived_pubkey.to_string()
            
            # Test signing and verification
            test_message = b"test message"
            signature = private_key.sign(test_message)
            assert public_key.verify(signature, test_message)
            
            print(f"PASS: Keys are valid ECDSA SECP256k1")
            print(f"  Private key length: {len(private_key_hex)} hex chars")
            print(f"  Public key length: {len(public_key_hex)} hex chars")
            
        except Exception as e:
            pytest.fail(f"ECDSA key validation failed: {e}")


class TestPreviousP2PFeatures:
    """Verify previous P2P features still work"""
    
    def test_node_info(self):
        """GET /api/node/info still works"""
        response = requests.get(f"{BASE_URL}/api/node/info")
        assert response.status_code == 200
        data = response.json()
        assert "node_id" in data
        assert "version" in data
        assert data["version"] == "2.0.0"
        print(f"PASS: /api/node/info works - version {data['version']}")
    
    def test_p2p_peers(self):
        """GET /api/p2p/peers still works"""
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        assert response.status_code == 200
        data = response.json()
        assert "peers" in data
        assert "node_id" in data
        print(f"PASS: /api/p2p/peers works - {data.get('count', len(data['peers']))} peers")
    
    def test_p2p_register(self):
        """POST /api/p2p/register still works"""
        response = requests.post(f"{BASE_URL}/api/p2p/register", json={
            "node_id": "TEST_wallet_test_node",
            "url": "http://test-wallet.local:8333",
            "version": "2.0.0",
            "chain_height": 100
        })
        assert response.status_code == 200
        data = response.json()
        assert "node_id" in data
        assert "chain_height" in data
        print(f"PASS: /api/p2p/register works")
    
    def test_blocks_endpoint(self):
        """GET /api/blocks still works"""
        response = requests.get(f"{BASE_URL}/api/blocks?page=1&per_page=5")
        assert response.status_code == 200
        data = response.json()
        assert "blocks" in data
        assert "total" in data
        assert len(data["blocks"]) > 0
        print(f"PASS: /api/blocks works - {data['total']} total blocks")
    
    def test_balance_endpoint(self):
        """GET /api/balance/{address} still works"""
        response = requests.get(f"{BASE_URL}/api/balance/{KNOWN_MINER_ADDRESS}")
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        print(f"PASS: /api/balance works - miner has {data['balance']} BRICS")


class TestWalletPersistence:
    """Test wallet file persistence"""
    
    def test_wallet_persistence_after_create(self):
        """Wallet.dat is created and contains all required fields"""
        # Clean up
        if os.path.exists(WALLET_FILE):
            os.remove(WALLET_FILE)
        
        # Create wallet
        response = requests.post(f"{BASE_URL}/api/wallet/create", json={})
        assert response.status_code == 200
        api_address = response.json()["address"]
        
        # Verify file exists
        assert os.path.exists(WALLET_FILE), f"Wallet file not created: {WALLET_FILE}"
        
        # Verify content
        with open(WALLET_FILE, "r") as f:
            wallet_data = json.load(f)
        
        required_fields = ["address", "public_key", "private_key"]
        for field in required_fields:
            assert field in wallet_data, f"Missing field in wallet.dat: {field}"
        
        # Address should match API response
        assert wallet_data["address"] == api_address
        
        print(f"PASS: Wallet persistence verified")
        print(f"  File: {WALLET_FILE}")
        print(f"  Fields: {list(wallet_data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
