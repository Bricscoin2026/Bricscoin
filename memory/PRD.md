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
- Bitcoin-style difficulty adjustment (every 10 blocks, then 2016)
- Halving every 210,000 blocks, initial reward 50 BRICS
- Transaction fee: 0.000005 BRICS
- Genesis wallet with 1M BRICS premine

### Post-Quantum Cryptography (PQC)
- Hybrid ECDSA + ML-DSA-65 signature scheme
- Client-side signing in browser (@noble/post-quantum)
- PQC wallet creation and management
- Fee-less wallet migration from legacy to PQC
- Quantum Security Status widget on Dashboard
- Live Security Audit page (/about) with 27 tests

### Mining (Stratum Server)
- Custom Stratum v1 server on port 3333
- Support for ASIC miners (Bitaxe BM1366/BM1397)
- Version rolling (BIP320) support
- Share-based hashrate calculation
- Active miner tracking via MongoDB

### Frontend Pages
- Dashboard, Explorer, Mining, Network, Wallet, PQC Wallet
- Rich List, Wallet Migration, About (Security Audit)

### Documentation
- README.md, WHITEPAPER.md, SECURITY_AUDIT.md updated with PQC info

## Session Changes (Feb 18, 2026)

### Bugs Fixed
1. **PQC transactions stuck in "Pending"** (P0): Set confirmed=True in /api/pqc/transaction/secure
2. **Mining broken - share submission error** (P0): Bitaxe sends 6 params (version_bits), was expecting 5. Fixed with params[:5] + version_bits handling
3. **Mining broken - version rolling** (P0): verify_share now applies BIP320 version mask for ASIC miners
4. **Hashrate inaccurate**: Now calculated from real share data with progressive time windows (5m/1h/24h)
5. **Active miners not showing**: Reads from MongoDB 'miners' collection (online: true, last_seen recent)
6. **Transaction ID regex**: Now accepts both UUID (36 chars) and SHA-256 hash (64 chars) for PQC transactions
7. **Silent error handling in stratum**: Added proper error logging (was bare except: pass)

### Features Added
- Active Miners card on Mining page
- Better error logging in Stratum server

### Codeberg Updated
- 2 commits pushed with all fixes

## Remaining Backlog

### P2
- Active miner count accuracy (investigated, uses 2 collections)
- Disclaimer on Dashboard (user mentioned, needs clarification)

### Future
- Mobile wallet app
- Stratum v2 / P2Pool optimization
- Increase stratum share_difficulty for more accurate hashrate measurement
