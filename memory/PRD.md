# BricsCoin - PRD & Status

## Problem Statement
Build "BricsCoin," a cryptocurrency with Post-Quantum Cryptography (PQC) featuring a dual-server decentralized mining pool (P2Pool) with SOLO and PPLNS reward systems.

## Architecture
```
Main Server (5.161.254.163):
  - React Frontend + FastAPI Backend + MongoDB
  - SOLO Mining Pool (port 3333)
  - P2Pool Sharechain + Stats Aggregation

PPLNS Server (157.180.123.105):
  - PPLNS Mining Pool (port 3334)
  - HTTP API (port 8080) for miner stats
  - Connects to main server's MongoDB
```

## What's Been Implemented

### Core Blockchain
- Genesis block + block creation with double SHA-256
- PQC-signed blocks (ECDSA + Dilithium hybrid)
- Transaction system with mempool
- Difficulty adjustment algorithm
- Mining rewards with halving schedule

### P2Pool System
- Sharechain (mini-blockchain of validated shares)
- P2P node registration and heartbeat
- Share propagation between nodes
- PPLNS payout calculation
- SOLO and PPLNS pool modes

### Frontend
- Dashboard, Blockchain Explorer, Wallet, P2Pool pages
- BricsChat, TimeCapsule, AI Oracle, BricsNFT
- Downloads page for mining software

### Integrations
- OpenAI GPT-5.2 via Emergent LLM Key (AI Oracle)
- Codeberg for Git hosting

## Completed Fixes (Feb 24, 2026)

### P0: Share Count Discrepancy - FIXED
- `/api/p2pool/stats`: Now includes PPLNS shares from `p2pool_sharechain` in total share counts
- `/api/p2pool/miners`: Uses `p2pool_sharechain` as source of truth for PPLNS miners' share counts
- `/api/network/stats`: Now includes PPLNS hashrate from `p2pool_sharechain` (was only counting SOLO miners)

### P1: PPLNS Block Submission - FIXED (needs deployment)
- Created corrected `p2pool-pplns-node/p2pool_stratum.py` with `double_sha256` (was using single SHA-256)
- Added `POST /api/p2pool/submit-block` endpoint for P2Pool nodes to submit found blocks
- PPLNS stratum now submits shares via HTTP API to main node (`/api/p2pool/share/submit`)
- PPLNS stratum submits found blocks via HTTP API (`/api/p2pool/submit-block`)
- Sharechain endpoint validates `is_block` flags against actual blockchain, marks false positives as `is_block_orphaned`

### Earlier Fixes (Previous Sessions)
- Miner deduplication (ip:port as unique ID)
- Hashrate aggregation (SOLO + PPLNS)
- Pending transaction fix (tx_id vs id KeyError)
- UI bug fixes (miner counts, block counts, navigation)

## Deployment Required
The PPLNS stratum fix needs to be deployed to the PPLNS server:
```bash
cd /app && bash deploy-pplns-fix.sh
```
Or manually:
1. Copy `p2pool-pplns-node/p2pool_stratum.py` to PPLNS server
2. Install deps: `pip3 install httpx motor pymongo python-dotenv`
3. Restart the PPLNS stratum service

## Prioritized Backlog

### P1: Miner Reward to PQC Address
Configure the core protocol so miner block rewards are sent to a PQC address.

### P2: BricsID / BricsVault
Decentralized identity or "dead man's switch" feature.

### P3: Repository Cleanup
Clean up the `downloads` folder on Codeberg.

### P4: Mobile Wallet
Develop a mobile wallet application.

## Key API Endpoints
- `GET /api/network/stats` - Network stats with combined hashrate
- `GET /api/p2pool/stats` - P2Pool stats with aggregated shares
- `GET /api/p2pool/miners` - All miners (SOLO + PPLNS)
- `GET /api/p2pool/sharechain` - Sharechain with validated is_block flags
- `POST /api/p2pool/submit-block` - Block submission from P2Pool nodes
- `POST /api/p2pool/share/submit` - Share submission to sharechain

## Key DB Collections
- `blocks` - Main blockchain
- `transactions` - All transactions
- `miners` - SOLO pool miners (miner_id = ip:port)
- `miner_shares` - SOLO pool shares
- `p2pool_sharechain` - P2Pool sharechain (all pool modes)
- `p2pool_peers` - Registered P2P nodes
- `pplns_miners` - PPLNS pool miners
- `pplns_shares` - PPLNS pool shares
