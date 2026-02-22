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

## Site Structure (8 pages, consolidated)
| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Home page with stats, quick links |
| `/blockchain` | Blockchain | 4 tabs: Overview, Explorer, Mining, Rich List |
| `/wallet` | Wallet Hub | 3 tabs: Legacy Wallet, PQC Wallet, Migration |
| `/chat` | BricsChat | PQC messaging with inline wallet creation |
| `/timecapsule` | Time Capsule | Time-locked on-chain storage |
| `/oracle` | AI Oracle | GPT-5.2 analysis with 3 tabs |
| `/downloads` | Downloads | Desktop wallet builds |
| `/about` | About | Security audit, project info |

## What's Been Implemented

### Core Blockchain
- Full blockchain with SHA-256 PoW mining
- Bitcoin-style difficulty adjustment, halving every 210,000 blocks
- Transaction fee: 0.000005 BRICS, Max supply: 21M

### Post-Quantum Cryptography (PQC)
- Hybrid ECDSA + ML-DSA-65 signature scheme
- Client-side signing, PQC wallets, quantum-safe migration

### Mining (Stratum Server)
- Custom Stratum v1 on port 3333, BIP320 version rolling for Bitaxe
- Share-based hashrate, active miner tracking

### Desktop Wallet v1.0.0
- Electron with PQC integration, cross-platform

## Completed Work - Session Feb 22, 2026

### Fork 4: 3 New Features + Site Restructure

**New Features (DONE - 100% tests passed):**
1. **BricsChat** — PQC-encrypted on-chain messaging, inline wallet creation
2. **Time Capsule** — Decentralized time-locked storage on-chain
3. **AI Oracle (GPT-5.2)** — Network analysis, predictions, interactive Q&A

**Site Restructure (DONE - 100% tests passed):**
- Consolidated 13 pages → 8 navigation items
- Blockchain page: merged Explorer + Network + Mining + Rich List into 4 tabs
- Wallet Hub: merged Legacy Wallet + PQC Wallet + Migration into 3 tabs
- Fixed BricsChat: inline PQC wallet creation (no redirect)
- Updated all internal links to new routes
- Removed old routes: /explorer, /mining, /network, /pqc-wallet, /migrate, /richlist, /node

**CEX Cleanup (DONE):**
- Removed exchange router and navigation links

## Production Deploy Notes
- Frontend deploy: `docker cp` tar.gz + `tar -xzf` + `nginx -s reload`
- Backend patch: `docker exec sed -i` + `docker restart bricscoin-api`
- **NEVER replace entire server.py** — Use `sed` for targeted fixes

## Remaining Backlog

### P1
- Deploy new features + site restructure to production (bricscoin26.org)
- Configure miner block rewards to PQC address

### P2
- Delete unused CEX files (exchange.py, tron_integration.py, Exchange.jsx, exchange-api.js)
- Clean up Codeberg downloads folder

### P3
- Mining pool optimizations (Stratum v2 / P2Pool)

### Future
- Mobile wallet app
- Hashrate history graph in Blockchain Mining tab
