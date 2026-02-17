# BricsCoin - Product Requirements Document

## Original Problem Statement
Create a Bitcoin-like cryptocurrency called "BricsCoin" with blockchain, mining, wallet, and decentralized network. Upgraded with Post-Quantum Cryptography (ML-DSA-65).

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB
- **Blockchain**: SHA256 PoW + Stratum mining + PQC block signing
- **Production**: Docker Compose on Hetzner (5.161.254.163)

## Completed Features

### Core Blockchain
- Genesis, mining, validation, SHA256 PoW, dynamic difficulty, halving
- ECDSA transactions, wallets, balance, mempool

### Network & P2P
- Persistent peers (MongoDB), node setup script, backup distribution, daily cron

### Mining
- Stratum protocol, pools, miner tracking, PQC-signed blocks

### Post-Quantum Cryptography (Feb 2026)
- **ML-DSA-65** (FIPS 204) + ECDSA hybrid signatures
- Client-side signing via `@noble/post-quantum` (keys never leave browser)
- PQC Block Signing (node keypair, auto-sign on mine)
- "Firmato Localmente" badge (Lock icon in TX detail, send dialog, block detail)
- Pages: `/pqc-wallet`, `/migrate`
- 35/35 pytest tests passing

### Production Deployment (Feb 17, 2026)
- **PQC deployed to production server** (5.161.254.163)
- All PQC endpoints verified live: wallet create, stats, node keys, verify
- Blockchain intact: 1885 blocks, difficulty 5787
- Fixed INITIAL_DIFFICULTY for production (1000000 vs 1 in preview)
- Added backward-compatible /miners/count endpoint
- Clean requirements.txt without preview-only packages (emergentintegrations)
- Updated Dockerfile and Dockerfile.frontend for PQC dependencies
- Disk cleanup cron job installed (weekly, Sunday 3AM)

### Wallet Migration Fix (Feb 17, 2026)
- **Address validator**: Updated regex to accept both `BRICS[hex]{40}` and `BRICSPQ[hex]{38}`
- **No fee migration**: Created `/api/pqc/migrate` endpoint - zero fee for legacy→PQC migration
- **Amount precision**: Round to 8 decimal places before sending (Bitcoin precision)
- **Signature compatibility (CRITICAL FIX)**:
  - Fixed SHA-1→SHA-256 hash mismatch between JS frontend and Python backend
  - Added DER signature format detection (JS uses DER ~144 hex, Python raw 128 hex)
  - `verify_signature()` now handles both DER and raw formats with SHA-256
  - `sign_transaction()` updated to use SHA-256 for consistency
  - `build_tx_data()` helper to format numbers like JavaScript (no trailing .0)
  - Fixed `isValidAddress()` in frontend to accept PQC addresses

### Quantum Security Dashboard Widget (Feb 17, 2026)
- Widget "Quantum Security" on main Dashboard showing:
  - ML-DSA-65 Active status (animated pulse)
  - PQC Block Coverage percentage with progress bar
  - PQC Wallets count, PQC Transactions count, Signature scheme
  - Node ID, link to Quantum-Safe Wallet page
- "Quantum-Safe" badge added next to "Security Audit Passed" in hero section

### Bug Fixes (Feb 2026)
- Hashrate: 2^48 → 2^32 (realistic values)
- Stratum logger: f-strings, PQC block signing added
- Disk cleanup: script + cron installed on production
- Error handling: Pydantic validation errors properly serialized in frontend

## Key API Endpoints
- `/api/pqc/wallet/create` - Create PQC wallet
- `/api/pqc/wallet/import` - Import PQC wallet
- `/api/pqc/stats` - PQC stats (wallets, txs, blocks)
- `/api/pqc/node/keys` - Node PQC public keys
- `/api/pqc/block/{index}/verify` - Block signature verification
- `/api/pqc/verify` - Hybrid signature verification
- `/api/pqc/transaction/secure` - PQC transaction
- `/api/pqc/migrate` - Legacy→PQC migration (NO FEE)

## Remaining Backlog

### P2 (Investigated, not reproducible in test env)
- Active miner count: uses 2 collections with different time windows
- Block count: code correct, confusion between height vs count

### Future
- Mobile wallet app
- Stratum v2 / P2Pool
