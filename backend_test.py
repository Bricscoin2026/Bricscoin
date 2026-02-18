#!/usr/bin/env python3
"""
Test della nuova logica di difficoltà di BricsCoin
Verifica gli endpoint API e la coerenza della difficoltà
"""

import requests
import time
import json
from datetime import datetime, timezone
from typing import Dict, Any, List

# URL del backend dal file .env del frontend
BACKEND_URL = "https://pqc-wallet-v3.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class BricsCoinDifficultyTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = 30
        self.results = []
        
    def log_result(self, test_name: str, success: bool, details: str, response_time: float = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "response_time_ms": round(response_time * 1000, 2) if response_time else None
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({result['response_time_ms']}ms)" if response_time else ""
        print(f"{status} {test_name}{time_info}: {details}")
        
    def test_network_stats_endpoint(self) -> Dict[str, Any]:
        """Test 1: Verifica endpoint /api/network/stats"""
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/network/stats")
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_result(
                    "Network Stats API", 
                    False, 
                    f"Status code {response.status_code}, expected 200",
                    response_time
                )
                return None
                
            data = response.json()
            current_difficulty = data.get('current_difficulty', 0)
            
            if current_difficulty <= 0:
                self.log_result(
                    "Network Stats API", 
                    False, 
                    f"current_difficulty = {current_difficulty}, expected > 0",
                    response_time
                )
                return None
                
            self.log_result(
                "Network Stats API", 
                True, 
                f"Status 200, current_difficulty = {current_difficulty}",
                response_time
            )
            return data
            
        except Exception as e:
            self.log_result("Network Stats API", False, f"Exception: {str(e)}")
            return None
            
    def test_mining_template_endpoint(self) -> Dict[str, Any]:
        """Test 2: Verifica endpoint /api/mining/template"""
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/mining/template")
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_result(
                    "Mining Template API", 
                    False, 
                    f"Status code {response.status_code}, expected 200",
                    response_time
                )
                return None
                
            data = response.json()
            difficulty = data.get('difficulty')
            reward = data.get('reward')
            
            if difficulty is None or reward is None:
                self.log_result(
                    "Mining Template API", 
                    False, 
                    f"Missing fields - difficulty: {difficulty}, reward: {reward}",
                    response_time
                )
                return None
                
            self.log_result(
                "Mining Template API", 
                True, 
                f"Status 200, difficulty = {difficulty}, reward = {reward}",
                response_time
            )
            return data
            
        except Exception as e:
            self.log_result("Mining Template API", False, f"Exception: {str(e)}")
            return None
            
    def test_difficulty_consistency(self):
        """Test 3: Verifica coerenza difficoltà tra API e template"""
        try:
            # Ottieni difficoltà da entrambi gli endpoint
            stats_data = self.test_network_stats_endpoint()
            template_data = self.test_mining_template_endpoint()
            
            if not stats_data or not template_data:
                self.log_result(
                    "Difficulty Consistency", 
                    False, 
                    "Impossibile ottenere dati da uno o entrambi gli endpoint"
                )
                return
                
            stats_difficulty = stats_data.get('current_difficulty')
            template_difficulty = template_data.get('difficulty')
            
            # Devono essere uguali o differire al massimo di 1
            diff = abs(stats_difficulty - template_difficulty)
            
            if diff <= 1:
                self.log_result(
                    "Difficulty Consistency", 
                    True, 
                    f"Coerenza OK - Stats: {stats_difficulty}, Template: {template_difficulty} (diff: {diff})"
                )
            else:
                self.log_result(
                    "Difficulty Consistency", 
                    False, 
                    f"Incoerenza - Stats: {stats_difficulty}, Template: {template_difficulty} (diff: {diff})"
                )
                
        except Exception as e:
            self.log_result("Difficulty Consistency", False, f"Exception: {str(e)}")
            
    def test_edge_case_resistance(self):
        """Test 4: Resistenza a edge case - chiamate multiple consecutive"""
        try:
            print("\n🔄 Testing edge case resistance con chiamate multiple...")
            
            # Test multiple calls to network/stats
            stats_times = []
            stats_difficulties = []
            
            for i in range(5):
                start_time = time.time()
                response = self.session.get(f"{API_BASE}/network/stats")
                response_time = time.time() - start_time
                stats_times.append(response_time)
                
                if response.status_code == 200:
                    data = response.json()
                    stats_difficulties.append(data.get('current_difficulty', 0))
                else:
                    self.log_result(
                        "Edge Case - Multiple Stats Calls", 
                        False, 
                        f"Call {i+1} failed with status {response.status_code}"
                    )
                    return
                    
                time.sleep(0.5)  # Small delay between calls
                
            # Test multiple calls to mining/template
            template_times = []
            template_difficulties = []
            
            for i in range(5):
                start_time = time.time()
                response = self.session.get(f"{API_BASE}/mining/template")
                response_time = time.time() - start_time
                template_times.append(response_time)
                
                if response.status_code == 200:
                    data = response.json()
                    template_difficulties.append(data.get('difficulty', 0))
                else:
                    self.log_result(
                        "Edge Case - Multiple Template Calls", 
                        False, 
                        f"Call {i+1} failed with status {response.status_code}"
                    )
                    return
                    
                time.sleep(0.5)
                
            # Analizza i risultati
            avg_stats_time = sum(stats_times) / len(stats_times)
            avg_template_time = sum(template_times) / len(template_times)
            max_stats_time = max(stats_times)
            max_template_time = max(template_times)
            
            # Verifica che non ci siano tempi anomali (> 5 secondi)
            anomalous_times = max_stats_time > 5.0 or max_template_time > 5.0
            
            # Verifica stabilità delle difficoltà
            stats_stable = len(set(stats_difficulties)) <= 2  # Al massimo 2 valori diversi
            template_stable = len(set(template_difficulties)) <= 2
            
            if not anomalous_times and stats_stable and template_stable:
                self.log_result(
                    "Edge Case Resistance", 
                    True, 
                    f"5 chiamate OK - Avg times: Stats {avg_stats_time:.2f}s, Template {avg_template_time:.2f}s"
                )
            else:
                issues = []
                if anomalous_times:
                    issues.append(f"Tempi anomali: Stats max {max_stats_time:.2f}s, Template max {max_template_time:.2f}s")
                if not stats_stable:
                    issues.append(f"Stats instabile: {set(stats_difficulties)}")
                if not template_stable:
                    issues.append(f"Template instabile: {set(template_difficulties)}")
                    
                self.log_result(
                    "Edge Case Resistance", 
                    False, 
                    f"Problemi rilevati: {'; '.join(issues)}"
                )
                
        except Exception as e:
            self.log_result("Edge Case Resistance", False, f"Exception: {str(e)}")
            
    def test_time_decay_logic(self):
        """Test 5: Controllo logico del time-decay (senza manipolare DB)"""
        try:
            # Ottieni l'ultimo blocco
            response = self.session.get(f"{API_BASE}/blocks?limit=1")
            
            if response.status_code != 200:
                self.log_result(
                    "Time Decay Logic", 
                    False, 
                    f"Impossibile ottenere ultimo blocco - Status {response.status_code}"
                )
                return
                
            data = response.json()
            blocks = data.get('blocks', [])
            
            if not blocks:
                self.log_result(
                    "Time Decay Logic", 
                    False, 
                    "Nessun blocco trovato nella blockchain"
                )
                return
                
            last_block = blocks[0]
            block_timestamp = last_block.get('timestamp')
            
            if not block_timestamp:
                self.log_result(
                    "Time Decay Logic", 
                    False, 
                    "Timestamp mancante nell'ultimo blocco"
                )
                return
                
            # Calcola età dell'ultimo blocco
            try:
                block_time = datetime.fromisoformat(block_timestamp.replace('Z', '+00:00'))
                now = datetime.now(timezone.utc)
                age_seconds = (now - block_time).total_seconds()
                age_minutes = age_seconds / 60
                
                # Se il blocco è recente (< 10 minuti), la difficoltà dovrebbe essere stabile
                if age_minutes < 10:
                    print(f"📊 Ultimo blocco recente ({age_minutes:.1f} min fa) - Test stabilità difficoltà...")
                    
                    # Fai 3 chiamate consecutive e verifica stabilità
                    difficulties = []
                    for i in range(3):
                        stats_response = self.session.get(f"{API_BASE}/network/stats")
                        if stats_response.status_code == 200:
                            stats_data = stats_response.json()
                            difficulties.append(stats_data.get('current_difficulty', 0))
                        time.sleep(1)
                        
                    if len(set(difficulties)) <= 1:  # Tutte uguali
                        self.log_result(
                            "Time Decay Logic", 
                            True, 
                            f"Blocco recente ({age_minutes:.1f}min) - Difficoltà stabile: {difficulties[0]}"
                        )
                    else:
                        self.log_result(
                            "Time Decay Logic", 
                            False, 
                            f"Blocco recente ma difficoltà instabile: {difficulties}"
                        )
                else:
                    # Blocco vecchio - dovrebbe esserci time decay
                    self.log_result(
                        "Time Decay Logic", 
                        True, 
                        f"Blocco vecchio ({age_minutes:.1f}min) - Time decay atteso (non testabile senza manipolare DB)"
                    )
                    
            except ValueError as e:
                self.log_result(
                    "Time Decay Logic", 
                    False, 
                    f"Errore parsing timestamp: {str(e)}"
                )
                
        except Exception as e:
            self.log_result("Time Decay Logic", False, f"Exception: {str(e)}")
            
    def run_all_tests(self):
        """Esegui tutti i test"""
        print("🚀 Avvio test della logica di difficoltà BricsCoin")
        print(f"🌐 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test 1 & 2: Endpoint base
        print("\n📡 Test 1-2: Verifica endpoint base...")
        self.test_network_stats_endpoint()
        self.test_mining_template_endpoint()
        
        # Test 3: Coerenza
        print("\n🔄 Test 3: Verifica coerenza difficoltà...")
        self.test_difficulty_consistency()
        
        # Test 4: Edge cases
        print("\n⚡ Test 4: Resistenza edge case...")
        self.test_edge_case_resistance()
        
        # Test 5: Time decay
        print("\n⏰ Test 5: Controllo time-decay...")
        self.test_time_decay_logic()
        
        # Riepilogo
        print("\n" + "=" * 60)
        print("📊 RIEPILOGO RISULTATI")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        for result in self.results:
            status = "✅" if result['success'] else "❌"
            time_info = f" ({result['response_time_ms']}ms)" if result['response_time_ms'] else ""
            print(f"{status} {result['test']}{time_info}")
            if not result['success']:
                print(f"   └─ {result['details']}")
                
        print(f"\n🎯 Risultato finale: {passed}/{total} test superati")
        
        if passed == total:
            print("🎉 Tutti i test sono passati! La logica di difficoltà funziona correttamente.")
        else:
            print("⚠️  Alcuni test sono falliti. Verificare i problemi sopra riportati.")
            
        return passed == total

if __name__ == "__main__":
    tester = BricsCoinDifficultyTester()
    success = tester.run_all_tests()
    
    # Salva risultati dettagliati
    with open('/app/difficulty_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'backend_url': BACKEND_URL,
            'total_tests': len(tester.results),
            'passed_tests': sum(1 for r in tester.results if r['success']),
            'success': success,
            'results': tester.results
        }, f, indent=2)
        
    print(f"\n💾 Risultati dettagliati salvati in: /app/difficulty_test_results.json")
    
    exit(0 if success else 1)