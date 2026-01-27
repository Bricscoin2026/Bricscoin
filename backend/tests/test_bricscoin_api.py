"""
BricsCoin API Tests
Tests for network stats, blocks, transactions, wallet, and tokenomics endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNetworkStats:
    """Network statistics endpoint tests"""
    
    def test_network_stats_returns_200(self):
        """Test /api/network/stats returns 200"""
        response = requests.get(f"{BASE_URL}/api/network/stats")
        assert response.status_code == 200
        print(f"SUCCESS: Network stats returned 200")
    
    def test_network_stats_has_required_fields(self):
        """Test network stats has all required fields"""
        response = requests.get(f"{BASE_URL}/api/network/stats")
        data = response.json()
        
        required_fields = [
            'total_supply', 'circulating_supply', 'remaining_supply',
            'total_blocks', 'current_difficulty', 'hashrate_estimate',
            'pending_transactions', 'last_block_time', 'next_halving_block',
            'current_reward'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"SUCCESS: All required fields present")
    
    def test_network_stats_values(self):
        """Test network stats has correct values"""
        response = requests.get(f"{BASE_URL}/api/network/stats")
        data = response.json()
        
        # Total supply should be 21M
        assert data['total_supply'] == 21000000, f"Expected 21M total supply, got {data['total_supply']}"
        
        # Difficulty should be 1 (initial) - Bitcoin-style difficulty
        assert data['current_difficulty'] == 1, f"Expected difficulty 1, got {data['current_difficulty']}"
        
        # Current reward should be 50 BRICS
        assert data['current_reward'] == 50, f"Expected reward 50, got {data['current_reward']}"
        
        # Circulating supply should be > 0
        assert data['circulating_supply'] > 0, "Circulating supply should be > 0"
        
        print(f"SUCCESS: Network stats values are correct")


class TestTokenomics:
    """Tokenomics endpoint tests"""
    
    def test_tokenomics_returns_200(self):
        """Test /api/tokenomics returns 200"""
        response = requests.get(f"{BASE_URL}/api/tokenomics")
        assert response.status_code == 200
        print(f"SUCCESS: Tokenomics returned 200")
    
    def test_tokenomics_has_transaction_fee(self):
        """Test tokenomics shows 0.05 BRICS transaction fee"""
        response = requests.get(f"{BASE_URL}/api/tokenomics")
        data = response.json()
        
        assert 'fees' in data, "Missing fees section"
        assert 'transaction_fee' in data['fees'], "Missing transaction_fee"
        assert data['fees']['transaction_fee'] == 0.05, f"Expected 0.05 fee, got {data['fees']['transaction_fee']}"
        
        print(f"SUCCESS: Transaction fee is 0.05 BRICS")
    
    def test_tokenomics_premine_info(self):
        """Test tokenomics has premine transparency info"""
        response = requests.get(f"{BASE_URL}/api/tokenomics")
        data = response.json()
        
        assert 'premine' in data, "Missing premine section"
        assert data['premine']['amount'] == 1000000, f"Expected 1M premine, got {data['premine']['amount']}"
        
        print(f"SUCCESS: Premine info is correct")


class TestBlocks:
    """Block endpoints tests"""
    
    def test_get_blocks_returns_200(self):
        """Test /api/blocks returns 200"""
        response = requests.get(f"{BASE_URL}/api/blocks")
        assert response.status_code == 200
        print(f"SUCCESS: Blocks endpoint returned 200")
    
    def test_get_blocks_has_data(self):
        """Test blocks endpoint returns block data"""
        response = requests.get(f"{BASE_URL}/api/blocks")
        data = response.json()
        
        assert 'blocks' in data, "Missing blocks array"
        assert 'total' in data, "Missing total count"
        assert len(data['blocks']) > 0, "No blocks returned"
        
        print(f"SUCCESS: Blocks data returned ({data['total']} total)")
    
    def test_get_block_by_index(self):
        """Test getting specific block by index"""
        response = requests.get(f"{BASE_URL}/api/blocks/0")
        assert response.status_code == 200
        
        data = response.json()
        assert data['index'] == 0, "Block index mismatch"
        assert 'hash' in data, "Missing hash"
        
        print(f"SUCCESS: Genesis block retrieved")
    
    def test_get_nonexistent_block(self):
        """Test getting non-existent block returns 404"""
        response = requests.get(f"{BASE_URL}/api/blocks/999999")
        assert response.status_code == 404
        print(f"SUCCESS: Non-existent block returns 404")


class TestTransactions:
    """Transaction endpoints tests"""
    
    def test_get_transactions_returns_200(self):
        """Test /api/transactions returns 200"""
        response = requests.get(f"{BASE_URL}/api/transactions")
        assert response.status_code == 200
        print(f"SUCCESS: Transactions endpoint returned 200")
    
    def test_get_transactions_structure(self):
        """Test transactions endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/transactions")
        data = response.json()
        
        assert 'transactions' in data, "Missing transactions array"
        assert 'total' in data, "Missing total count"
        
        print(f"SUCCESS: Transactions structure correct ({data['total']} total)")


class TestWallet:
    """Wallet endpoints tests"""
    
    def test_create_wallet_returns_200(self):
        """Test wallet creation returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/create",
            json={"name": "TEST_Wallet"}
        )
        assert response.status_code == 200
        print(f"SUCCESS: Wallet creation returned 200")
    
    def test_create_wallet_has_required_fields(self):
        """Test created wallet has all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/create",
            json={"name": "TEST_Wallet_Fields"}
        )
        data = response.json()
        
        required_fields = ['address', 'public_key', 'private_key', 'seed_phrase', 'name', 'created_at']
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Address should start with BRICS
        assert data['address'].startswith('BRICS'), f"Address should start with BRICS, got {data['address'][:10]}"
        
        # Seed phrase should have 12 words
        words = data['seed_phrase'].split()
        assert len(words) == 12, f"Expected 12 word seed phrase, got {len(words)}"
        
        print(f"SUCCESS: Wallet has all required fields")
    
    def test_get_wallet_balance(self):
        """Test getting wallet balance"""
        # First create a wallet
        create_response = requests.post(
            f"{BASE_URL}/api/wallet/create",
            json={"name": "TEST_Balance_Wallet"}
        )
        wallet = create_response.json()
        
        # Get balance
        response = requests.get(f"{BASE_URL}/api/wallet/{wallet['address']}/balance")
        assert response.status_code == 200
        
        data = response.json()
        assert 'balance' in data, "Missing balance"
        assert data['balance'] == 0, f"New wallet should have 0 balance, got {data['balance']}"
        
        print(f"SUCCESS: Wallet balance retrieved")


class TestMining:
    """Mining endpoints tests"""
    
    def test_get_mining_template(self):
        """Test getting mining template"""
        response = requests.get(f"{BASE_URL}/api/mining/template")
        assert response.status_code == 200
        
        data = response.json()
        assert 'template' in data, "Missing template"
        assert 'difficulty' in data, "Missing difficulty"
        assert 'reward' in data, "Missing reward"
        
        # Difficulty should be 1 (initial Bitcoin-style difficulty)
        assert data['difficulty'] == 1, f"Expected difficulty 1, got {data['difficulty']}"
        
        # Reward should be 50
        assert data['reward'] == 50, f"Expected reward 50, got {data['reward']}"
        
        print(f"SUCCESS: Mining template retrieved")


class TestP2P:
    """P2P network endpoints tests"""
    
    def test_get_peers(self):
        """Test getting peer list"""
        response = requests.get(f"{BASE_URL}/api/p2p/peers")
        assert response.status_code == 200
        
        data = response.json()
        assert 'node_id' in data, "Missing node_id"
        assert 'peers' in data, "Missing peers list"
        
        print(f"SUCCESS: Peers list retrieved")
    
    def test_get_chain_info(self):
        """Test getting chain info"""
        response = requests.get(f"{BASE_URL}/api/p2p/chain/info")
        assert response.status_code == 200
        
        data = response.json()
        assert 'height' in data, "Missing height"
        assert 'difficulty' in data, "Missing difficulty"
        
        print(f"SUCCESS: Chain info retrieved")
    
    def test_get_node_info(self):
        """Test getting node info"""
        response = requests.get(f"{BASE_URL}/api/p2p/node/info")
        assert response.status_code == 200
        
        data = response.json()
        assert 'node_id' in data, "Missing node_id"
        assert 'blocks_height' in data, "Missing blocks_height"
        
        print(f"SUCCESS: Node info retrieved")


class TestAddressInfo:
    """Address info endpoint tests"""
    
    def test_get_address_info(self):
        """Test getting address info"""
        # First create a wallet
        create_response = requests.post(
            f"{BASE_URL}/api/wallet/create",
            json={"name": "TEST_Address_Info"}
        )
        wallet = create_response.json()
        
        # Get address info
        response = requests.get(f"{BASE_URL}/api/address/{wallet['address']}")
        assert response.status_code == 200
        
        data = response.json()
        assert 'address' in data, "Missing address"
        assert 'balance' in data, "Missing balance"
        assert 'transaction_count' in data, "Missing transaction_count"
        
        print(f"SUCCESS: Address info retrieved")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
