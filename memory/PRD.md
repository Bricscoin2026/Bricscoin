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
- crypto.getRandomValues polyfill for Node.js/Electron compatibility
- Cross-platform: Windows, macOS, Linux builds on Codeberg

## Completed Work - Session Feb 18, 2026 (Fork 2)

1. **Download page links fixed** — All buttons point to Codeberg folder: `src/branch/main/downloads/BricsCoin Core 3.0.0`
2. **Git commit author fixed** — 456 commits rewritten from "Fabio Astorino" to "Bricscoin_26" via git filter-branch
3. **PQC transaction bug fixed** — `crypto.getRandomValues must be defined` error in Electron resolved with `globalThis.crypto = crypto.webcrypto` polyfill
4. **All platform builds rebuilt** — Windows, macOS, Linux recompiled with crypto fix and pushed to Codeberg
5. **Old builds cleaned up** — Removed obsolete "Core 3.0.0" builds, kept "Wallet 1.0.0" with fix
6. **Frontend deployed 4 times** to production with incremental fixes

## Remaining Backlog

### P1
- Burn 1M premine from Genesis wallet

### P2
- Fix verify_share header endianness to properly validate ASIC hashes (currently bypassed)

### Future
- Mobile wallet app
- Stratum v2 / P2Pool
- Hashrate history graph on Mining page
