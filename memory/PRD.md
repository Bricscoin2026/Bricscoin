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

## Session Changes (Feb 18, 2026)

### Bugs Fixed
1. PQC transactions stuck "Pending" → confirmed=True
2. Mining broken: Bitaxe sends 6 params (version_bits), was expecting 5
3. Mining broken: verify_share didn't apply BIP320 version mask
4. Hashrate inaccurate: now from real share data, progressive windows
5. Active miners inflated: counts unique workers (distinct) not TCP connections
6. Transaction ID regex: accepts UUID + SHA-256 hash
7. Silent errors in stratum: added proper logging

### 3 Codeberg Commits Pushed
- PQC hotfix + docs
- Mining + hashrate + active miners fix
- Distinct worker count fix

## Session Changes (Feb 18, 2026 - Hotfix #2)

### Bugs Fixed
8. Network Hashrate drastically wrong: `share_difficulty` was 1, changed to 512 to match ASIC capabilities
   - Also fixed `self.difficulty` initial value from 1 to 512 so miners receive correct difficulty AND shares are stored with correct difficulty in DB

## Remaining Backlog

### P1
- Burn 1M premine from Genesis wallet

### P2
- Disclaimer on Dashboard (user mentioned, needs clarification)
- Clean up stale `online: true` miners in DB

### Future
- Mobile wallet app
- Stratum v2 / P2Pool
- Hashrate history graph on Mining page
