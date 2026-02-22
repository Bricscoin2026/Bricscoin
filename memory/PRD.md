# BricsCoin - Product Requirements Document

## Original Problem Statement
Create a Bitcoin-like cryptocurrency called "BricsCoin" with Post-Quantum Cryptography (PQC) security features. The project runs on a live production server at bricscoin26.org.

## Architecture
- **Backend**: FastAPI (Python) running in Docker
- **Frontend**: React running in Docker
- **Database**: MongoDB running in Docker
- **Stratum Server**: Custom Python Stratum for ASIC mining (Bitaxe)
- **Production**: Docker Compose on Hetzner server (5.161.254.163)
- **Repository**: https://codeberg.org/Bricscoin_26/Bricscoin

## What's Been Implemented

### Core Blockchain
- Full blockchain with SHA-256 PoW mining
- Bitcoin-style difficulty adjustment
- Halving every 210,000 blocks, initial reward 50 BRICS
- Transaction fee: 0.000005 BRICS

### Post-Quantum Cryptography (PQC)
- Hybrid ECDSA + ML-DSA-65 signature scheme
- Client-side signing in browser
- PQC wallet creation, management, and fee-less migration
- Quantum Security Status widget + Security Audit page

### Mining (Stratum Server)
- Custom Stratum v1 server on port 3333
- BIP320 version rolling support for ASIC miners (Bitaxe)
- Share-based hashrate calculation (progressive windows)
- Active miner tracking via MongoDB (unique workers)

### Frontend Pages
- Dashboard, Explorer, Mining, Network, Wallet, PQC Wallet
- Rich List, Wallet Migration, About (Security Audit)
- Downloads page linking to Codeberg release folder

### Desktop Wallet - BricsCoin Wallet v1.0.0
- Electron desktop wallet with full PQC integration
- Hybrid ECDSA + ML-DSA-65 signing (keys never leave device)
- Deterministic ML-DSA-65 keygen from seed phrase
- Cross-platform: Windows, macOS, Linux builds on Codeberg

## Completed Work - Session Feb 22, 2026 (Fork 4 - Current)

### CEX Cleanup (DONE)
- Removed Exchange route from App.js and Layout.jsx navigation
- Removed exchange router from server.py
- Exchange files (exchange.py, Exchange.jsx, exchange-api.js) still exist but are not imported/used

### 17. BricsChat - Quantum-Proof On-Chain Messaging (DONE)
- World's first PQC-encrypted blockchain messaging
- Messages signed with hybrid ECDSA + ML-DSA-65 before on-chain storage
- Backend: /api/chat/send, /api/chat/messages/{address}, /api/chat/conversation/{a}/{b}, /api/chat/contacts/{address}, /api/chat/stats
- Frontend: /chat page with contacts list, message thread, real-time send
- Requires PQC wallet (stored in localStorage)
- All tests passed (100% backend + frontend)

### 18. Decentralized Time Capsule (DONE)
- Store encrypted data on-chain, unlockable only at a future block height
- PQC-signed capsule creation with content hash integrity verification
- Backend: /api/timecapsule/create, /api/timecapsule/get/{id}, /api/timecapsule/list, /api/timecapsule/address/{address}, /api/timecapsule/stats
- Frontend: /timecapsule page with stats dashboard, create dialog, progress bars, lock/unlock visualization
- All tests passed (100% backend + frontend)

### 19. AI Blockchain Oracle - GPT-5.2 (DONE)
- GPT-5.2 powered network health analysis and predictions via Emergent LLM Key
- 3 tabs: Analysis (health score, network metrics, AI insights), Predictions (difficulty trend, outlook), Ask Oracle (interactive chat)
- Backend: /api/oracle/analysis (cached 5min), /api/oracle/predict (cached 15min), /api/oracle/ask, /api/oracle/history
- Frontend: /oracle page with health gauge, metric cards, recommendations, chat interface
- All tests passed (100% backend + frontend)

## Production Deploy Notes
- **NEVER replace entire server.py** — Use `sed` for targeted fixes
- Latest backup: `/root/bricscoin-backup-20260219_071116/`
- Frontend deploy: `docker cp` tar.gz + `tar -xzf` + `nginx -s reload`
- Backend patch: `docker exec sed -i` + `docker restart bricscoin-api`

## Remaining Backlog

### P1
- Configure miner block rewards to PQC address for network-wide PQC adoption
- Deploy 3 new features to production server (bricscoin26.org)

### P2
- Clean up Codeberg downloads folder (remove old builds)
- Delete unused CEX files from codebase (exchange.py, tron_integration.py, Exchange.jsx, exchange-api.js)

### P3
- Mining pool optimizations (Stratum v2 / P2Pool)

### Future
- Mobile wallet app
- Hashrate history graph on Mining page
