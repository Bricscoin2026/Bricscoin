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
  - PPLNS Mining Pool (port 3334) - systemd: p2pool-stratum.service
  - HTTP API (port 8080) for miner stats
  - Fetches block templates from main node via API
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
- Share propagation between nodes via HTTP API
- PPLNS payout calculation
- SOLO and PPLNS pool modes
- Block submission endpoint with hash validation

### Frontend
- Dashboard, Blockchain Explorer, Wallet, P2Pool pages
- BricsChat, TimeCapsule, AI Oracle, BricsNFT
- Downloads page for mining software

## Completed Fixes (Feb 24, 2026)

### P0: Hashrate + Share Count Consistency - DEPLOYED TO PRODUCTION
- `/api/network/stats`: Includes PPLNS hashrate from `p2pool_sharechain`
- `/api/p2pool/stats`: Uses progressive window hashrate calculation (matching Blockchain page)
- `/api/p2pool/miners`: Uses `p2pool_sharechain` as source of truth for PPLNS miners
- Result: Blockchain 15.92 TH/s vs P2Pool 15.97 TH/s (0.3% variance)

### P1: PPLNS Block Submission - DEPLOYED TO PRODUCTION
- PPLNS stratum uses `double_sha256` (was single SHA-256)
- `get_network_difficulty()` caches last known difficulty (safe default 10000, never 1)
- PPLNS stratum fetches block templates via HTTP API from main node (was querying empty local DB)
- Added `POST /api/p2pool/submit-block` with hash validation against difficulty target
- Sharechain endpoint validates `is_block` flags against actual blockchain
- Cleaned up 2 invalid blocks (2190, 2191) that entered blockchain during transition
- PPLNS Block #2189 confirmed as VALID (first real PPLNS block!)

## Prioritized Backlog

### P1: Miner Reward to PQC Address
### P2: BricsID / BricsVault
### P3: Repository Cleanup (Codeberg)
### P4: Mobile Wallet
