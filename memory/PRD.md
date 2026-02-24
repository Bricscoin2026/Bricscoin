# BricsCoin - Product Requirements Document

## Original Problem Statement
Build "BricsCoin," a cryptocurrency with Post-Quantum Cryptography (PQC).

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS  
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Mining**: SHA-256 PoW with Stratum v1 protocol
- **Two-Server Setup**:
  - Main (bricscoin26.org / 5.161.254.163): Frontend, Backend, SOLO pool (3333)
  - PPLNS (157.180.123.105): PPLNS pool (3334) + HTTP API (8080)

## All Fixes Deployed (Feb 24, 2026)

### Blockchain Page
1. Transactions navigation: Fixed setSearchParams to preserve tab=explorer
2. Mining tab removed, dead code cleaned

### P2Pool - Miner Aggregation
3. Backend fetches remote PPLNS miners via HTTP API on port 8080
4. Pool Hashrate now includes SOLO + PPLNS hashrates combined (~15-18 TH/s)
5. Active Miners counts local + remote (3 SOLO + 2 PPLNS = 5 total)
6. P2P Nodes: Active ping keeps both nodes showing 2/2 online

### Stratum Server Fixes
7. Miner tracking by miner_id (ip:port) - correctly handles multiple physical miners behind same NAT with same wallet address
8. Disconnect handler properly marks miners offline
9. Template generation handles both `id` and `tx_id` transaction fields (fixed pending TX bug)

### PPLNS Node
10. Integrated aiohttp HTTP API directly into stratum process (port 8080)
11. Real hashrate calculation: shares * difficulty * 2^32 / seconds_connected
12. Firewall port 8080 opened

## Prioritized Backlog
### P1 - Miner Reward to PQC Address
### P2 - BricsID / BricsVault, Repository Cleanup
### P3 - Mobile Wallet
