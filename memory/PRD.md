# BricsCoin - Product Requirements Document

## Original Problem Statement
Create a Bitcoin-like cryptocurrency called "BricsCoin" with a fully operational blockchain, mining capabilities, wallet system, and a decentralized network architecture. The project has evolved to include Post-Quantum Cryptography for future-proofing against quantum computing threats.

## Core Architecture
- **Frontend**: React (CRA) with Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: MongoDB
- **Blockchain**: SHA256 Proof-of-Work with ASIC mining support (Stratum protocol)

## What's Been Implemented

### Core Blockchain (DONE)
- Genesis block creation, block mining & validation
- SHA256 PoW with dynamic difficulty adjustment
- Transaction system with ECDSA signatures (client-side signing)
- Wallet creation (seed phrase, private key import)
- Balance calculation, mempool, block rewards, halving schedule

### Network & P2P (DONE)
- Peer registration persisted in MongoDB
- P2P blockchain sync, peer discovery
- Node setup script (`setup-node.sh`) for one-command deployment
- Backup distribution via `/api/node/backup`
- Daily backup cron job

### Mining (DONE)
- Stratum protocol server for ASIC miners
- Mining pools support, active miner tracking

### Pages & Features (DONE)
- Dashboard, Explorer, Block Detail, Transaction Detail
- Wallet (ECDSA), Network, Mining, Pools
- Rich List, Downloads, Run Node (cloud deployment guide), About

### Post-Quantum Cryptography - PQC (DONE - Feb 2026)
- **Backend**: `pqc_crypto.py` using ML-DSA-65 (NIST FIPS 204)
- **Frontend**: `@noble/post-quantum` for client-side ML-DSA-65 signing
- **Hybrid scheme**: ECDSA (secp256k1) + ML-DSA-65
- **Client-side signing**: Private keys NEVER leave the browser
- **ECDSA format**: SHA-256 hash + raw r||s (128 hex chars) for cross-platform compatibility
- **ML-DSA-65 sizes**: PK=1952 bytes, SK=4032 bytes, SIG=3309 bytes
- **Address format**: `BRICSPQ...` (45 chars) for PQC wallets
- **Pages**: PQC Wallet (`/pqc-wallet`) + Migration Wizard (`/migrate`)

### Client-Side ML-DSA-65 WASM Signing (DONE - Feb 2026)
- Installed `@noble/post-quantum` v0.5.4 for browser ML-DSA-65
- Cross-platform compatibility verified: JS signatures validated by Python backend
- `preparePQCTransaction()` signs locally with ECDSA + ML-DSA-65
- Backend `hybrid_verify()` uses `verify_digest()` with SHA-256 for ECDSA

## Key API Endpoints
- `/api/pqc/wallet/create` - Create PQC hybrid wallet (ML-DSA-65)
- `/api/pqc/wallet/import` - Import with 3 keys (ECDSA sk + ML-DSA sk + ML-DSA pk)
- `/api/pqc/wallet/{address}` - PQC wallet info and balance
- `/api/pqc/stats` - PQC network statistics
- `/api/pqc/verify` - Verify hybrid signature
- `/api/pqc/transaction/secure` - PQC signed transaction
- `/api/pqc/wallets/list` - List registered PQC wallets

## DB Schema
- **blocks**: index, hash, previous_hash, transactions, proof, nonce, difficulty, timestamp, miner
- **transactions**: tx_id, sender, recipient, amount, timestamp, signature, confirmed, signature_scheme
- **peers**: node_id, url, version, last_seen
- **pqc_wallets**: address, wallet_type, ecdsa_public_key, dilithium_public_key, created_at

## Prioritized Backlog

### P0 (Critical)
- ~~PQC Wallet Backend + Frontend~~ DONE
- ~~Client-side ML-DSA-65 signing~~ DONE
- PQC Block Signing: Sign blocks with hybrid signatures
- PQC Automated Test Suite (comprehensive)

### P1 (High)
- Automated Disk Cleanup cron job (server crashed 2x from full disk)
- Deploy PQC to production server (5.161.254.163)

### P2 (Medium)
- Incorrect Hashrate Display fix
- Block Count Mismatch on Frontend Explorer
- Active Miner Count accuracy

### P3 (Low)
- TypeError in stratum_server.py logs

### Future
- PQC block signing integration
- Mobile wallet application
- Stratum v2 / P2Pool investigation
