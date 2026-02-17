# BricsCoin - Product Requirements Document

## Original Problem Statement
Create a Bitcoin-like cryptocurrency called "BricsCoin" with blockchain, mining, wallet, and decentralized network. Upgraded with Post-Quantum Cryptography (ML-DSA-65).

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB
- **Blockchain**: SHA256 PoW + Stratum mining + PQC block signing

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

### Bug Fixes (Feb 2026)
- Hashrate: 2^48 → 2^32 (realistic values)
- Stratum logger: f-strings, PQC block signing added
- Disk cleanup: script ready + cron

### Deploy Script
- `/app/deploy-pqc.sh` — safe production deploy (no blockchain data touched)
- `/app/README-PQC-DEPLOY.md` — detailed deploy instructions

## Key API Endpoints
- `/api/pqc/wallet/create|import` - Wallet management
- `/api/pqc/stats` - Stats (wallets, txs, blocks)
- `/api/pqc/node/keys` - Node PQC public keys
- `/api/pqc/block/{index}/verify` - Block signature verification
- `/api/pqc/verify` - Hybrid signature verification
- `/api/pqc/transaction/secure` - PQC transaction

## DB Schema
- **blocks**: + pqc_ecdsa_signature, pqc_dilithium_signature, pqc_public_key_*, pqc_scheme
- **pqc_wallets**: address, wallet_type, ecdsa_public_key, dilithium_public_key, created_at
- **node_config**: type="pqc_keys", ecdsa/dilithium key pairs

## Remaining Backlog

### P1
- Deploy PQC to production (script ready, user needs to execute)

### P2 (Investigated, not reproducible in test env)
- Block count: code correct, confusion between height vs count
- Active miner count: uses 2 collections with different time windows

### Future
- Mobile wallet app
- Stratum v2 / P2Pool
