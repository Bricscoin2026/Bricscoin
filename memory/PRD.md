# BricsCoin - Product Requirements Document

## Original Problem Statement
Create a Bitcoin-like cryptocurrency named "BricsCoin" with:
- Proof of Work (PoW) consensus
- SHA256 hashing algorithm  
- 21,000,000 total supply
- Dynamic difficulty adjustment
- Block reward halving mechanism
- Hardware mining support (ASIC miners: Bitaxe, NerdMiner)
- Desktop wallet (BricsCoin Core)
- Web wallet
- Domain: bricscoin26.org

## User's Preferred Language
Italian

## Current Architecture

### Stack
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React + TailwindCSS + shadcn/ui
- **Stratum Server**: Python async server (Bitcoin-compatible)
- **Desktop Wallet**: Electron (BricsCoin Core)
- **Deployment**: Docker on Hetzner server (5.161.254.163)
- **Domain**: https://bricscoin26.org

### Key Files
- `/app/backend/server.py` - Main API
- `/app/backend/stratum_server.py` - Stratum mining server (v5.0)
- `/app/frontend/src/` - React frontend
- `/app/bricscoin-core/` - Desktop wallet source

## What's Been Implemented

### ✅ Completed (January 25, 2026)

#### P0: Hardware Mining - FIXED! 🎉
- **Stratum Server v5.0**: Complete rewrite with 100% Bitcoin-compatible protocol
- Features:
  - Correct 80-byte block header construction
  - Double-SHA256 hashing (Bitcoin standard)
  - Proper word-swapping for prevhash (Stratum format)
  - Job caching to prevent "Job not found" errors
  - Coinbase transaction construction (BIP34 height encoding)
  - Share validation with leading zero counting
- **Result**: Bitaxe successfully finding blocks! 20+ blocks mined in testing.

#### P1: BricsCoin Core v2.0 (Without Mining)
- Removed mining functionality per user request
- Clean desktop wallet with:
  - Wallet creation/import/delete
  - Send/receive BRICS
  - View blocks and transactions
  - Matrix-style UI theme
- Archive deployed: `BricsCoin-Core-v2.0.tar.gz`

#### Previous Features
- Web wallet functionality
- Block explorer
- Network statistics dashboard
- Mining instructions page (for hardware miners)
- Source code download
- P2P network foundation

## Current Network Status (Live)
- **Total Blocks**: 20+
- **Circulating Supply**: ~1,001,000 BRICS (1M premine + mining rewards)
- **Difficulty**: 4 (4 leading hex zeros)
- **Block Reward**: 50 BRICS

## Pending Issues

### P1: Hetzner Server Stability
- 2GB RAM server occasionally struggles under load
- Recommendation: Sequential deployments, memory monitoring

### P1: GitHub Account Suspended
- User's GitHub account is suspended
- Blocks automated builds and version control

### P2: Configure Stratum Subdomain
- Need to set up `stratum.bricscoin26.org` pointing to server
- Cloudflare DNS only (no proxy) for TCP traffic

### P2: Native Mac/Windows Installers
- Blocked by GitHub issue
- Requires GitHub Actions for automated builds

## Future Roadmap

### P1: True P2P Sync in BricsCoin Core
- Allow Core wallets to sync with each other
- Full decentralization of the network

### P2: Landing Page
- Dedicated marketing/promotion page

### P3: Mobile Wallet
- Native iOS/Android apps

## Technical Notes

### Stratum Protocol (Bitcoin-Compatible)
```
Port: 3333
Address: stratum+tcp://5.161.254.163:3333
Pool username: Any BRICS address
Password: x
```

### Block Header Structure (80 bytes)
1. Version (4 bytes, LE)
2. Previous hash (32 bytes)
3. Merkle root (32 bytes)
4. Timestamp (4 bytes, LE)
5. nBits (4 bytes, LE)
6. Nonce (4 bytes, LE)

### Credentials
- **Hetzner SSH**: root@5.161.254.163 / Fabio@katia2021

## Changelog

### 2026-01-25
- **FIXED**: Hardware mining (Stratum server v5.0)
- **DEPLOYED**: BricsCoin Core v2.0 (without mining)
- **VERIFIED**: 20+ blocks mined successfully with Bitaxe

### Previous Sessions
- Initial blockchain implementation
- Web wallet and explorer
- Desktop wallet development (v1.0 - v1.3)
- Multiple Stratum server iterations (v1-v4, all failed)
