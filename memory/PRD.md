# BricsCoin - Product Requirements Document

## Original Problem Statement
Build "BricsCoin," a cryptocurrency with Post-Quantum Cryptography (PQC). The project includes core blockchain features, mining infrastructure, and a web-based UI for managing wallets, transactions, and mining operations.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Mining**: SHA-256 PoW with Stratum v1 protocol
- **Signatures**: ECDSA + ML-DSA-65 (PQC, FIPS 204)
- **Two-Server Setup**:
  - Main server (bricscoin26.org): React frontend, FastAPI backend, SOLO mining pool (port 3333)
  - PPLNS server (157.180.123.105): Dedicated PPLNS mining pool (port 3334)

## Core Features Implemented
- Blockchain explorer with blocks, transactions, rich list
- PQC wallet (BRICSPQ addresses) with browser-side signing
- BricsChat, Time Capsule, AI Oracle (GPT-5.2 via Emergent LLM Key)
- BricsNFT (on-chain certificates)
- True P2Pool decentralized mining (SOLO + PPLNS)
- Stratum v1 mining protocol
- P2P node discovery and share propagation
- Whitepaper PDF generation

## What's Been Implemented (Latest - Feb 24, 2026)
### P0 Bug Fixes (4 issues from user message #381)
1. **Blockchain Transactions**: ExplorerSection loads tx count on mount via `loadCounts()` - shows "Transactions (9)" without clicking
2. **Mining Tab Removed**: Dead `MiningSection` component removed from Blockchain.jsx, unused imports cleaned up
3. **P2Pool Miner Aggregation**: `/api/p2pool/miners` now fetches remote miners from peer nodes using `api_port` field; added Pool column with SOLO/PPLNS badges to miners table
4. **P2P Node Counter Fixed**: `/api/p2pool/stats` actively pings peers to check liveness; stale duplicate peers cleaned up; `/peers` endpoint auto-deletes 7-day-old peers
5. **New**: Added `/api/p2pool/status` health check endpoint for peer-to-peer liveness checks
6. **New**: Created `pplns-node-api/pplns_http_api.py` - HTTP API to deploy on the PPLNS server for miner data exposure

## Key Files
- `backend/p2pool_routes.py` - P2Pool API routes (stats, miners, peers, sharechain)
- `frontend/src/pages/P2Pool.jsx` - P2Pool UI
- `frontend/src/pages/Blockchain.jsx` - Blockchain explorer
- `pplns-node-api/pplns_http_api.py` - PPLNS node HTTP API (to deploy on 157.180.123.105)
- `backend/server.py` - Main FastAPI server

## Prioritized Backlog
### P1
- Miner Reward to PQC Address: Configure protocol to send block rewards to PQC address
- Deploy `pplns_http_api.py` to PPLNS server (157.180.123.105) for full miner aggregation

### P2
- BricsID / BricsVault (decentralized identity / dead man's switch)
- Repository Cleanup (downloads folder on Codeberg)

### P3
- Mobile Wallet development

## 3rd Party Integrations
- OpenAI GPT-5.2 via Emergent LLM Key (AI Oracle)
- Codeberg for Git hosting
