"""
Test suite for 3 new BricsCoin features:
1. BricsChat - PQC-encrypted on-chain messaging
2. Time Capsule - Decentralized time-locked storage
3. AI Oracle - GPT-5.2 powered blockchain analysis
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable must be set")

# Use 60s timeout for AI Oracle endpoints (GPT-5.2 calls)
AI_TIMEOUT = 60


class TestChatEndpoints:
    """BricsChat API tests"""

    def test_chat_stats(self):
        """GET /api/chat/stats returns statistics"""
        response = requests.get(f"{BASE_URL}/api/chat/stats", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total_messages" in data, "Missing total_messages field"
        assert "unique_users" in data, "Missing unique_users field"
        assert "pqc_secured" in data, "Missing pqc_secured field"
        assert data["pqc_secured"] is True, "pqc_secured should be True"
        assert "encryption" in data, "Missing encryption field"
        print(f"✓ Chat stats: {data['total_messages']} messages, {data['unique_users']} users")

    def test_chat_messages_for_address(self):
        """GET /api/chat/messages/{address} returns messages list"""
        # Use a test PQC address format
        test_address = "BRICSPQabc123def456abc123def456abc123d"
        response = requests.get(f"{BASE_URL}/api/chat/messages/{test_address}", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "messages" in data, "Missing messages field"
        assert "count" in data, "Missing count field"
        assert isinstance(data["messages"], list), "messages should be a list"
        print(f"✓ Chat messages for address: {data['count']} messages")

    def test_chat_contacts_for_address(self):
        """GET /api/chat/contacts/{address} returns contacts list"""
        test_address = "BRICSPQabc123def456abc123def456abc123d"
        response = requests.get(f"{BASE_URL}/api/chat/contacts/{test_address}", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "contacts" in data, "Missing contacts field"
        assert isinstance(data["contacts"], list), "contacts should be a list"
        print(f"✓ Chat contacts: {len(data['contacts'])} contacts")

    def test_chat_conversation_between_addresses(self):
        """GET /api/chat/conversation/{addr1}/{addr2} returns conversation"""
        addr1 = "BRICSPQabc123def456abc123def456abc123d"
        addr2 = "BRICSPQxyz789ghi012xyz789ghi012xyz789g"
        response = requests.get(f"{BASE_URL}/api/chat/conversation/{addr1}/{addr2}", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "messages" in data, "Missing messages field"
        assert "count" in data, "Missing count field"
        print(f"✓ Chat conversation: {data['count']} messages")


class TestTimeCapsuleEndpoints:
    """Time Capsule API tests"""

    def test_timecapsule_stats(self):
        """GET /api/timecapsule/stats returns statistics with current_block_height"""
        response = requests.get(f"{BASE_URL}/api/timecapsule/stats", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total_capsules" in data, "Missing total_capsules field"
        assert "locked" in data, "Missing locked field"
        assert "unlocked" in data, "Missing unlocked field"
        assert "current_block_height" in data, "Missing current_block_height field"
        print(f"✓ Time Capsule stats: {data['total_capsules']} capsules, block height {data['current_block_height']}")

    def test_timecapsule_list(self):
        """GET /api/timecapsule/list returns capsule list"""
        response = requests.get(f"{BASE_URL}/api/timecapsule/list", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "capsules" in data, "Missing capsules field"
        assert "current_block_height" in data, "Missing current_block_height field"
        assert "count" in data, "Missing count field"
        assert isinstance(data["capsules"], list), "capsules should be a list"
        print(f"✓ Time Capsule list: {data['count']} capsules")

    def test_timecapsule_get_nonexistent(self):
        """GET /api/timecapsule/get/{id} returns 404 for nonexistent capsule"""
        response = requests.get(f"{BASE_URL}/api/timecapsule/get/nonexistent-capsule-id", timeout=10)
        assert response.status_code == 404, f"Expected 404 for nonexistent capsule, got {response.status_code}"
        print("✓ Time Capsule get returns 404 for nonexistent ID")

    def test_timecapsule_by_address(self):
        """GET /api/timecapsule/address/{address} returns capsules for address"""
        test_address = "BRICSPQabc123def456abc123def456abc123d"
        response = requests.get(f"{BASE_URL}/api/timecapsule/address/{test_address}", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "capsules" in data, "Missing capsules field"
        assert "count" in data, "Missing count field"
        print(f"✓ Time Capsule by address: {data['count']} capsules")


class TestOracleEndpoints:
    """AI Oracle API tests - GPT-5.2 powered"""

    def test_oracle_analysis(self):
        """GET /api/oracle/analysis returns AI analysis with health_score"""
        print("⏳ Testing Oracle analysis (may take 10-15s for GPT-5.2 call)...")
        response = requests.get(f"{BASE_URL}/api/oracle/analysis", timeout=AI_TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "analysis" in data, "Missing analysis field"
        assert "network_data" in data, "Missing network_data field"
        assert "model" in data, "Missing model field"
        # The analysis should contain health_score
        analysis = data.get("analysis", {})
        if isinstance(analysis, dict):
            assert "health_score" in analysis or "raw_analysis" in analysis, "Missing health_score in analysis"
        print(f"✓ Oracle analysis: Model={data['model']}, health_score={analysis.get('health_score', 'N/A')}")

    def test_oracle_ask(self):
        """POST /api/oracle/ask accepts question and returns AI answer"""
        print("⏳ Testing Oracle ask (may take a few seconds)...")
        question_data = {
            "question": "What is the current block height?",
            "session_id": "test-session-123"
        }
        response = requests.post(f"{BASE_URL}/api/oracle/ask", json=question_data, timeout=AI_TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "question" in data, "Missing question field"
        assert "answer" in data, "Missing answer field"
        assert "session_id" in data, "Missing session_id field"
        assert "model" in data, "Missing model field"
        assert data["question"] == question_data["question"], "Question mismatch"
        assert len(data["answer"]) > 0, "Answer should not be empty"
        print(f"✓ Oracle ask: Question answered, model={data['model']}")

    def test_oracle_history(self):
        """GET /api/oracle/history returns Q&A history"""
        response = requests.get(f"{BASE_URL}/api/oracle/history", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "history" in data, "Missing history field"
        assert "count" in data, "Missing count field"
        assert isinstance(data["history"], list), "history should be a list"
        print(f"✓ Oracle history: {data['count']} Q&A entries")

    def test_oracle_predict(self):
        """GET /api/oracle/predict returns AI predictions"""
        print("⏳ Testing Oracle predictions (may take 10-15s for GPT-5.2 call)...")
        response = requests.get(f"{BASE_URL}/api/oracle/predict", timeout=AI_TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "predictions" in data, "Missing predictions field"
        assert "network_data" in data, "Missing network_data field"
        assert "model" in data, "Missing model field"
        print(f"✓ Oracle predictions: Model={data['model']}")

    def test_oracle_ask_long_question_rejected(self):
        """POST /api/oracle/ask rejects questions > 500 chars"""
        long_question = "x" * 501
        response = requests.post(
            f"{BASE_URL}/api/oracle/ask",
            json={"question": long_question},
            timeout=10
        )
        assert response.status_code == 400, f"Expected 400 for long question, got {response.status_code}"
        print("✓ Oracle ask rejects questions > 500 chars")


class TestNavigationAndRoutes:
    """Test that API endpoints exist and route correctly"""

    def test_root_api(self):
        """GET /api/ returns BricsCoin API info"""
        response = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data, "Missing message field"
        assert "BricsCoin" in data["message"], "Should mention BricsCoin"
        print("✓ API root endpoint working")

    def test_network_stats(self):
        """GET /api/network/stats returns network statistics"""
        response = requests.get(f"{BASE_URL}/api/network/stats", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total_blocks" in data, "Missing total_blocks field"
        print(f"✓ Network stats: {data['total_blocks']} blocks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
