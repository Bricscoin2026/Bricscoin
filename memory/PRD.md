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
- Downloads page with direct file download links per platform

### Desktop Wallet - BricsCoin Core v3.0.0
- Electron desktop wallet with full PQC integration
- Hybrid ECDSA + ML-DSA-65 signing (keys never leave device)
- Deterministic ML-DSA-65 keygen from seed phrase
- Cross-platform: Windows, macOS, Linux builds on Codeberg
- crypto.getRandomValues polyfill for Node.js/Electron compatibility

## Completed Work

### Session Feb 18, 2026 - Fork 1
- PQC transactions fix, Mining/Stratum fixes, Hashrate calculation fix
- BricsCoin Core Desktop Wallet v3.0.0 with PQC integration
- Web wallet backup download fix
- Deterministic PQC key generation from seed phrase
- New API endpoint: POST /api/pqc/wallet/recover

### Session Feb 18, 2026 - Fork 2
- **FIXED**: Download page links — each platform button now links directly to the specific file on Codeberg via raw URL
- **FIXED**: Git commit author — rewrote all 456 commits from "Fabio Astorino" to "Bricscoin_26" using git filter-branch
- **FIXED**: macOS Gatekeeper block — provided xattr -cr command to remove quarantine attribute
- **FIXED**: PQC transaction bug in desktop wallet — `crypto.getRandomValues must be defined` error. Added `globalThis.crypto = crypto.webcrypto` polyfill in main.js
- Rebuilt and redeployed all 3 platform builds (Windows, macOS, Linux) with the crypto fix to Codeberg
- Updated Downloads.jsx with correct file names matching actual builds: `BricsCoin Wallet 1.0.0.exe`, `BricsCoin Wallet-1.0.0-arm64-mac.zip`, `BricsCoin Wallet-1.0.0-arm64.AppImage`
- Deployed frontend 3 times to production with incremental fixes

## Remaining Backlog

### P1
- Burn 1M premine from Genesis wallet

### P2
- Fix verify_share header endianness to properly validate ASIC hashes (currently bypassed)

### Future
- Mobile wallet app
- Stratum v2 / P2Pool
- Hashrate history graph on Mining page
