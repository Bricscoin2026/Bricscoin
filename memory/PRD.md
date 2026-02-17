# BricsCoin - Product Requirements Document

## Original Problem Statement
Create a Bitcoin-like cryptocurrency called "BricsCoin" with a fully operational blockchain, mining, wallet, and decentralized network. Upgraded with Post-Quantum Cryptography (PQC) for quantum resistance.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB
- **Blockchain**: SHA256 PoW + Stratum mining protocol

## What's Been Implemented

### Core Blockchain (DONE)
- Genesis block, mining, validation, SHA256 PoW, dynamic difficulty
- Transaction system with ECDSA signatures, wallet creation, balance, mempool, halving

### Network & P2P (DONE)
- Persistent peers in MongoDB, node setup script, backup distribution, daily backup cron

### Mining (DONE)
- Stratum protocol server, mining pools, active miner tracking

### Pages (DONE)
- Dashboard, Explorer, Block/Tx Detail, Wallet, Network, Mining, Pools
- Rich List, Downloads, Run Node, About, Community

### Post-Quantum Cryptography (DONE - Feb 2026)
- **ML-DSA-65 (FIPS 204)** via `dilithium-py` backend + `@noble/post-quantum` frontend
- **Hybrid scheme**: ECDSA (secp256k1) + ML-DSA-65
- **Client-side signing**: `@noble/post-quantum` v0.5.4 in browser, private keys NEVER leave device
- **ECDSA format**: SHA-256 hash + raw r||s (128 hex chars) cross-platform
- **Address format**: `BRICSPQ...` (45 chars) for PQC wallets
- **Pages**: PQC Wallet (`/pqc-wallet`) + Migration Wizard (`/migrate`)

### PQC Block Signing (DONE - Feb 2026)
- Node generates ML-DSA-65 keypair on startup (stored in MongoDB `node_config`)
- Every mined block signed with hybrid ECDSA + ML-DSA-65
- Both API mining and Stratum mining produce PQC-signed blocks
- Verification endpoint: `/api/pqc/block/{index}/verify`
- Node public keys: `/api/pqc/node/keys`

### "Firmato Localmente" Indicator (DONE - Feb 2026)
- Green Lock badge in PQC Wallet Send dialog
- PQC signature section in BlockDetail for signed blocks
- "Firmato Localmente - Quantum-Safe" badge in TransactionDetail for PQC transactions
- "Blocchi Firmati" stat in PQC stats dashboard

### Bug Fixes (DONE - Feb 2026)
- **Hashrate**: Fixed from 2^48 to 2^32 multiplier (7.16 GH/s vs PH/s inflated)
- **Stratum logger**: Converted to f-strings to prevent TypeError
- **Stratum PQC**: Blocks mined via Stratum now also get PQC signatures

### Disk Cleanup Script (DONE - Feb 2026)
- `/app/backend/disk-cleanup.sh` - docker prune, journal vacuum, log/tmp cleanup
- Ready for cron deployment on production server

## Key API Endpoints
- `/api/pqc/wallet/create|import` - PQC wallet management
- `/api/pqc/wallet/{address}` - PQC wallet info
- `/api/pqc/stats` - PQC stats (wallets, txs, blocks, total)
- `/api/pqc/verify` - Verify hybrid signature
- `/api/pqc/transaction/secure` - PQC transaction
- `/api/pqc/node/keys` - Node PQC public keys
- `/api/pqc/block/{index}/verify` - Block PQC signature verification
- `/api/pqc/wallets/list` - List PQC wallets

## DB Schema
- **blocks**: + pqc_ecdsa_signature, pqc_dilithium_signature, pqc_public_key_*, pqc_scheme
- **pqc_wallets**: address, wallet_type, ecdsa_public_key, dilithium_public_key, created_at
- **node_config**: type="pqc_keys", ecdsa/dilithium key pairs

## Prioritized Backlog

### P0 (Critical) - ALL DONE
- ~~PQC Wallet Backend + Frontend~~ DONE
- ~~Client-side ML-DSA-65 signing~~ DONE
- ~~PQC Block Signing~~ DONE

### P1 (High)
- ~~Disk cleanup script~~ DONE (needs cron on production)
- Deploy PQC to production server (5.161.254.163)
- PQC Automated Test Suite (comprehensive pytest)

### P2 (Medium)
- ~~Hashrate display fix~~ DONE
- Block Count Mismatch (not reproducible in test env)
- Active Miner Count accuracy

### P3 (Low)
- ~~Stratum TypeError fix~~ DONE

### Future
- Mobile wallet app
- Stratum v2 / P2Pool
