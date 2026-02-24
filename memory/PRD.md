# BricsCoin - Product Requirements Document

## Original Problem Statement
Build "BricsCoin," a cryptocurrency with Post-Quantum Cryptography (PQC). The project includes core blockchain features, mining infrastructure, and a web-based UI for managing wallets, transactions, and mining operations.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Mining**: SHA-256 PoW with Stratum v1 protocol
- **Signatures**: ECDSA + ML-DSA-65 (PQC, FIPS 204)
- **Two-Server Setup**:
  - Main server (bricscoin26.org / 5.161.254.163): React frontend, FastAPI backend, SOLO mining pool (port 3333)
  - PPLNS server (157.180.123.105): Dedicated PPLNS mining pool (port 3334) + HTTP API (port 8080)

## Core Features Implemented
- Blockchain explorer with blocks, transactions, rich list
- PQC wallet (BRICSPQ addresses) with browser-side signing
- BricsChat, Time Capsule, AI Oracle (GPT-5.2 via Emergent LLM Key)
- BricsNFT (on-chain certificates)
- True P2Pool decentralized mining (SOLO + PPLNS)
- Stratum v1 mining protocol
- P2P node discovery, share propagation, and cross-node miner aggregation
- Whitepaper PDF generation

## Latest Changes (Feb 24, 2026) - DEPLOYED TO PRODUCTION
### P0 Bug Fixes (4 issues from user message #381)
1. **Blockchain Transactions**: ExplorerSection loads tx count on mount - shows "Transactions (N)" immediately
2. **Mining Tab Removed**: Dead MiningSection component + unused imports removed from Blockchain.jsx
3. **P2Pool Miner Aggregation**: Backend `/api/p2pool/miners` now fetches remote miners from peer nodes via HTTP API; frontend shows Pool column (SOLO/PPLNS badges)
4. **P2P Node Counter Fixed**: Stats endpoint actively pings peers; stale peers auto-cleaned; now shows 2/2

### Infrastructure Deployed
- Added `/api/p2pool/status` health-check endpoint for P2P liveness
- Deployed HTTP API (aiohttp) on PPLNS server (port 8080) for miner data exposure
- Opened port 8080 in PPLNS server firewall
- Added `emergentintegrations` to Docker build
- Rebuilt and redeployed both frontend and backend Docker containers

## Key Files
- `backend/p2pool_routes.py` - P2Pool API routes
- `frontend/src/pages/P2Pool.jsx` - P2Pool UI
- `frontend/src/pages/Blockchain.jsx` - Blockchain explorer
- PPLNS server: `/opt/p2pool/p2pool_stratum.py` (with integrated HTTP API)

## Prioritized Backlog
### P1
- Miner Reward to PQC Address: Configure protocol to send block rewards to PQC address

### P2
- BricsID / BricsVault (decentralized identity / dead man's switch)
- Repository Cleanup (downloads folder on Codeberg)

### P3
- Mobile Wallet development
