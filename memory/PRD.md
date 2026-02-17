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
- Mining pools support
- Active miner tracking

### Pages & Features (DONE)
- Dashboard, Explorer, Block Detail, Transaction Detail
- Wallet (ECDSA), Network, Mining, Pools
- Rich List, Downloads, Run Node (cloud deployment guide), About

### Post-Quantum Cryptography - PQC (DONE - Feb 2026)
- **Backend module**: `/app/backend/pqc_crypto.py` - Hybrid ECDSA + ML-DSA (Dilithium2)
- **PQC API endpoints**: wallet create/import/info, signature verify, transaction, stats
- **Frontend**: PQC Wallet page (`/pqc-wallet`) and Migration page (`/migrate`)
- **Address format**: `BRICSPQ...` (45 chars) for PQC wallets vs `BRICS...` for legacy
- **Wallet import**: Requires ECDSA private key + Dilithium secret key + Dilithium public key

## Key API Endpoints
- `/api/network/stats` - Network statistics
- `/api/blocks`, `/api/transactions` - Blockchain data
- `/api/wallet/create`, `/api/wallet/import/*` - Legacy wallet
- `/api/pqc/wallet/create` - Create PQC hybrid wallet
- `/api/pqc/wallet/import` - Import PQC wallet (requires 3 keys)
- `/api/pqc/wallet/{address}` - PQC wallet info
- `/api/pqc/stats` - PQC network stats
- `/api/pqc/verify` - Verify hybrid signature
- `/api/pqc/transaction/secure` - PQC signed transaction
- `/api/richlist` - Top wallet holders
- `/api/p2p/register`, `/api/p2p/peers` - Peer management

## DB Schema
- **blocks**: index, hash, previous_hash, transactions, proof, nonce, difficulty, timestamp, miner
- **transactions**: tx_id, sender, recipient, amount, timestamp, signature, confirmed
- **peers**: node_id, url, version, last_seen
- **pqc_wallets**: address, wallet_type, ecdsa_public_key, dilithium_public_key, created_at

## Prioritized Backlog

### P0 (Critical)
- ~~PQC Wallet Backend + Frontend~~ DONE
- PQC Block Signing: Sign blocks with hybrid signatures
- PQC Automated Test Suite

### P1 (High)
- Automated Disk Cleanup cron job (server has crashed 2x from full disk)
- Deploy PQC to production server (5.161.254.163)

### P2 (Medium)
- Incorrect Hashrate Display fix
- Block Count Mismatch on Frontend Explorer
- Active Miner Count accuracy

### P3 (Low)
- TypeError in stratum_server.py logs
- Stratum v2 / P2Pool investigation

### Future
- Mobile wallet application
- Client-side Dilithium signing (WASM)
