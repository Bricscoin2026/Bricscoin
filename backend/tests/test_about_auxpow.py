"""
Tests for About page audit and AuxPow API features
===================================================
- Security audit endpoint with 6 categories
- AuxPow merge mining endpoints
- P2Pool stats with merge mining section
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSecurityAudit:
    """Test /api/security/audit endpoint - returns 46/46 tests across 6 categories"""
    
    def test_security_audit_returns_200(self):
        """Security audit endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/security/audit")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/security/audit returns 200")
    
    def test_security_audit_has_six_categories(self):
        """Security audit should have 6 categories"""
        response = requests.get(f"{BASE_URL}/api/security/audit")
        data = response.json()
        categories = data.get('categories', [])
        assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"
        
        # Verify category names
        expected_names = [
            'Input Validation',
            'Classical Cryptography',
            'Post-Quantum Cryptography',
            'Privacy Protocol',
            'Consensus Enforcement',
            'Attack Prevention & Security'
        ]
        actual_names = [cat['name'] for cat in categories]
        for name in expected_names:
            assert name in actual_names, f"Missing category: {name}"
        
        print(f"PASS: Found all 6 categories: {actual_names}")
    
    def test_security_audit_total_tests_is_46(self):
        """Security audit should have 46 total tests"""
        response = requests.get(f"{BASE_URL}/api/security/audit")
        data = response.json()
        total = data.get('total_tests', 0)
        assert total == 46, f"Expected 46 total tests, got {total}"
        print(f"PASS: Total tests = {total}")
    
    def test_security_audit_all_tests_pass(self):
        """All 46 tests should pass"""
        response = requests.get(f"{BASE_URL}/api/security/audit")
        data = response.json()
        passed = data.get('total_passed', 0)
        total = data.get('total_tests', 0)
        assert passed == total, f"Expected {total} passed, got {passed}"
        assert data.get('all_passed') == True
        print(f"PASS: {passed}/{total} tests passed")
    
    def test_security_audit_category_test_counts(self):
        """Verify test counts per category"""
        response = requests.get(f"{BASE_URL}/api/security/audit")
        data = response.json()
        categories = data.get('categories', [])
        
        expected_counts = {
            'Input Validation': 8,
            'Classical Cryptography': 5,
            'Post-Quantum Cryptography': 6,
            'Privacy Protocol': 8,
            'Consensus Enforcement': 11,
            'Attack Prevention & Security': 8,
        }
        
        for cat in categories:
            name = cat['name']
            total = cat['total']
            if name in expected_counts:
                expected = expected_counts[name]
                assert total == expected, f"{name}: expected {expected} tests, got {total}"
                print(f"PASS: {name} has {total} tests (expected {expected})")


class TestAuxPowEndpoints:
    """Test AuxPoW (merge mining) API endpoints"""
    
    def test_auxpow_status_returns_200(self):
        """GET /api/auxpow/status should return 200"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/auxpow/status returns 200")
    
    def test_auxpow_status_merge_mining_enabled(self):
        """AuxPow status should show merge_mining_enabled=true"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        data = response.json()
        assert data.get('merge_mining_enabled') == True, "merge_mining_enabled should be True"
        print(f"PASS: merge_mining_enabled = {data.get('merge_mining_enabled')}")
    
    def test_auxpow_status_bitcoin_parent_chain(self):
        """AuxPow should support bitcoin as parent chain"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        data = response.json()
        parent_chains = data.get('supported_parent_chains', [])
        assert 'bitcoin' in parent_chains, f"'bitcoin' not in supported_parent_chains: {parent_chains}"
        print(f"PASS: Supported parent chains: {parent_chains}")
    
    def test_auxpow_status_has_statistics(self):
        """AuxPow status should have statistics section"""
        response = requests.get(f"{BASE_URL}/api/auxpow/status")
        data = response.json()
        stats = data.get('statistics', {})
        assert 'total_blocks' in stats
        assert 'auxpow_blocks' in stats
        assert 'native_blocks' in stats
        print(f"PASS: AuxPoW statistics: total={stats.get('total_blocks')}, auxpow={stats.get('auxpow_blocks')}")
    
    def test_auxpow_create_work_returns_work(self):
        """GET /api/auxpow/create-work should return work data"""
        response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest12345")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check required fields
        assert 'work_id' in data, "Missing work_id"
        assert 'coinbase_commitment' in data, "Missing coinbase_commitment"
        assert 'block_hash' in data, "Missing block_hash"
        assert 'difficulty' in data, "Missing difficulty"
        print(f"PASS: create-work returned work_id={data.get('work_id')}, block_hash={data.get('block_hash')[:16]}...")
    
    def test_auxpow_work_has_chain_id(self):
        """AuxPoW work should have chain_id"""
        response = requests.get(f"{BASE_URL}/api/auxpow/create-work?miner_address=BRICStest")
        data = response.json()
        assert 'chain_id' in data, "Missing chain_id"
        print(f"PASS: chain_id = {data.get('chain_id')}")
    
    def test_auxpow_work_history(self):
        """GET /api/auxpow/work-history should return work items"""
        response = requests.get(f"{BASE_URL}/api/auxpow/work-history?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert 'work_items' in data
        print(f"PASS: work-history returned {data.get('count', len(data.get('work_items', [])))} items")


class TestP2PoolMergeMining:
    """Test P2Pool stats endpoint with merge_mining section"""
    
    def test_p2pool_stats_returns_200(self):
        """GET /api/p2pool/stats should return 200"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/p2pool/stats returns 200")
    
    def test_p2pool_stats_has_merge_mining_section(self):
        """P2Pool stats should have merge_mining section"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        mm = data.get('merge_mining', {})
        assert mm, "Missing merge_mining section"
        assert mm.get('enabled') == True, "merge_mining.enabled should be True"
        print(f"PASS: merge_mining section present, enabled={mm.get('enabled')}")
    
    def test_p2pool_merge_mining_protocol_is_auxpow(self):
        """P2Pool merge_mining should have protocol=AuxPoW"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        mm = data.get('merge_mining', {})
        assert mm.get('protocol') == 'AuxPoW', f"Expected protocol='AuxPoW', got {mm.get('protocol')}"
        print(f"PASS: merge_mining.protocol = {mm.get('protocol')}")
    
    def test_p2pool_merge_mining_parent_chains(self):
        """P2Pool merge_mining should list bitcoin as parent chain"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        mm = data.get('merge_mining', {})
        parent_chains = mm.get('parent_chains', [])
        assert 'bitcoin' in parent_chains, f"'bitcoin' not in parent_chains: {parent_chains}"
        print(f"PASS: merge_mining.parent_chains = {parent_chains}")
    
    def test_p2pool_merge_mining_has_api_endpoints(self):
        """P2Pool merge_mining should list API endpoints"""
        response = requests.get(f"{BASE_URL}/api/p2pool/stats")
        data = response.json()
        mm = data.get('merge_mining', {})
        endpoints = mm.get('api_endpoints', {})
        assert 'create_work' in endpoints
        assert 'submit' in endpoints
        assert 'status' in endpoints
        print(f"PASS: merge_mining.api_endpoints = {endpoints}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
