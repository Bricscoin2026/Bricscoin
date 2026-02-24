# BricsCoin - Product Requirements Document

## Original Problem Statement
Build "BricsCoin," a cryptocurrency with Post-Quantum Cryptography (PQC). The project includes core blockchain features, mining infrastructure, and a web-based UI for managing wallets, transactions, and mining operations.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Mining**: SHA-256 PoW with Stratum v1 protocol
- **Signatures**: ECDSA + ML-DSA-65 (PQC, FIPS 204)
- **Two-Server Setup**:
  - Main server (bricscoin26.org / 5.161.254.163): React frontend, FastAPI backend, SOLO pool (port 3333)
  - PPLNS server (157.180.123.105): PPLNS pool (port 3334) + HTTP API (port 8080)

## What's Been Implemented

### Phase 1-3: Core Features (completed earlier)
- Blockchain explorer, PQC wallet, BricsChat, Time Capsule, AI Oracle
- BricsNFT (on-chain certificates)
- Stratum v1 mining protocol
- Two-server P2Pool (SOLO + PPLNS)

### Feb 24, 2026 - Bug Fixes Deployed to Production
1. **Transactions Navigation Fix**: setSearchParams now preserves tab=explorer parameter
2. **Mining Tab Removed**: Dead MiningSection component cleaned from Blockchain.jsx
3. **Active Miners Aggregation**: /stats endpoint now queries remote PPLNS node and shows total count (5 = 3 SOLO + 2 PPLNS)
4. **Block Count Fixed**: Using db.blocks.count_documents({}) for accurate count (2188)
5. **PPLNS Hashrate Display**: HTTP API on PPLNS node now calculates real hashrate per miner (shares * difficulty * 2^32 / time)
6. **P2P Node Counter**: Active ping mechanism keeps both nodes showing 2/2 online
7. **Infrastructure**: Added emergentintegrations to Dockerfile, deployed HTTP API on PPLNS server

## Key Files
- `backend/p2pool_routes.py` - P2Pool API (stats, miners, peers, status)
- `frontend/src/pages/P2Pool.jsx` - P2Pool UI with Pool column
- `frontend/src/pages/Blockchain.jsx` - Explorer with fixed navigation
- PPLNS server: `/opt/p2pool/p2pool_stratum.py` (with integrated HTTP API)

## Prioritized Backlog
### P1
- Miner Reward to PQC Address

### P2
- BricsID / BricsVault
- Repository Cleanup (Codeberg)

### P3
- Mobile Wallet
