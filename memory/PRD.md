# BricsCoin - Product Requirements Document

## Original Problem Statement
Build "BricsCoin," a cryptocurrency with Post-Quantum Cryptography (PQC). The project includes core blockchain features, mining infrastructure, and a web-based UI.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Mining**: SHA-256 PoW with Stratum v1 protocol
- **Two-Server Setup**:
  - Main (bricscoin26.org / 5.161.254.163): Frontend, Backend, SOLO pool (3333)
  - PPLNS (157.180.123.105): PPLNS pool (3334) + HTTP API (8080)

## Deployed Fixes (Feb 24, 2026)

### Round 1 - P0 Fixes
1. Transactions Navigation: Fixed setSearchParams preserving tab=explorer
2. Mining Tab: Removed from Blockchain page
3. P2Pool Miner Aggregation: Backend fetches remote miners via HTTP API
4. P2P Node Counter: Active ping mechanism, stale peer cleanup

### Round 2 - Additional Fixes
5. Pool Hashrate: Now sums local + remote (PPLNS) hashrates (~14+ TH/s vs old 7.4 TH/s)
6. Active Miners Count: Stats aggregates local + remote miners (8 total vs old 3)
7. PPLNS Hashrate Display: Calculates real hashrate from shares/time (was "diff 1000")
8. Pending TX Fix: stratum_server.py and server.py now handle both `id` and `tx_id` fields
9. emergentintegrations added to Docker build

## Prioritized Backlog
### P1
- Miner Reward to PQC Address

### P2
- BricsID / BricsVault
- Repository Cleanup

### P3
- Mobile Wallet
