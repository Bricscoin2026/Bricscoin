# BricsCoin Whitepaper
## A Decentralized SHA-256 Proof-of-Work Cryptocurrency with Post-Quantum Security

**Version 3.1 - February 2026**
**Author: Jabo86**

---

## Abstract

BricsCoin (BRICS) is a decentralized cryptocurrency built on the proven SHA-256 Proof-of-Work consensus mechanism, enhanced with post-quantum cryptographic security. Designed for hardware mining compatibility, BricsCoin enables anyone with ASIC mining equipment to participate in securing the network and earning rewards. With a fixed supply of 21 million coins, ultra-low transaction fees of 0.000005 BRICS (burned), and a hybrid ECDSA + ML-DSA-65 signature scheme providing quantum resistance, BricsCoin aims to be a fair, transparent, secure, and future-proof digital currency.

BricsCoin goes beyond a simple payment network by offering a suite of on-chain applications: **BricsChat** (quantum-proof encrypted messaging), **Time Capsule** (time-locked on-chain data), **BricsNFT** (PQC-signed certificates), and an **AI Oracle** (GPT-5.2 powered network intelligence).

---

## 1. Introduction

### 1.1 Background

Since Bitcoin's inception in 2009, Proof-of-Work has proven to be the most secure and decentralized consensus mechanism for digital currencies. BricsCoin builds upon this foundation, implementing a clean SHA-256-based blockchain optimized for modern ASIC mining hardware.

### 1.2 The Quantum Threat

The development of large-scale quantum computers poses a significant threat to current cryptographic systems. Shor's algorithm can break ECDSA and RSA, the foundations of most blockchain security. BricsCoin proactively addresses this threat by implementing a hybrid post-quantum cryptographic scheme based on NIST FIPS 204 (ML-DSA-65), formerly known as CRYSTALS-Dilithium.

### 1.3 Vision

BricsCoin's mission is to create a truly decentralized currency that:
- Remains accessible to hardware miners worldwide via SHA-256 PoW
- Maintains ultra-low, deflationary transaction fees (0.000005 BRICS, burned)
- Provides transparent, publicly verifiable transactions
- Offers quantum-resistant security through ML-DSA-65 hybrid signatures
- Hosts on-chain applications: Chat, Certificates, Time Capsules, AI Oracle
- Operates as a fully open-source project under MIT license

---

## 2. Technical Specifications

| Parameter | Value |
|-----------|-------|
| **Algorithm** | SHA-256 Proof-of-Work |
| **Consensus** | Proof-of-Work (Nakamoto Consensus) |
| **Max Supply** | 21,000,000 BRICS |
| **Block Reward** | 50 BRICS (initial) |
| **Halving Interval** | Every 210,000 blocks |
| **Target Block Time** | ~600 seconds (10 minutes) |
| **Difficulty Adjustment** | Per-block sliding window (5 blocks) |
| **Transaction Fee** | 0.000005 BRICS (burned) |
| **Fee Model** | Deflationary (all fees permanently destroyed) |
| **Signature Algorithm** | ECDSA secp256k1 + ML-DSA-65 (hybrid) |
| **Address Format (Legacy)** | `BRICS` + 40 hex chars (45 total) |
| **Address Format (PQC)** | `BRICSPQ` + 38 hex chars (45 total) |
| **Mining Protocol** | Stratum v1 (port 3333) |
| **Mining Pools** | SOLO + PPLNS (dual-server architecture) |
| **License** | MIT |

---

## 3. Blockchain Architecture

### 3.1 Block Structure

Each block contains:
- **Index**: Sequential block number starting from genesis (0)
- **Timestamp**: UTC block creation time (ISO 8601)
- **Transactions**: Ordered list of validated transactions
- **Previous Hash**: SHA-256 hash of the preceding block
- **Nonce**: Proof-of-Work solution value
- **Difficulty**: Mining difficulty target at time of creation
- **Miner Address**: BRICS/BRICSPQ address receiving block reward
- **PQC Signature**: Hybrid ECDSA + ML-DSA-65 block signature
- **Hash**: SHA-256 hash of the complete block header

### 3.2 Transaction Structure

Each transaction includes:
- **Sender/Recipient**: BRICS or BRICSPQ addresses
- **Amount**: Transfer amount (max 8 decimal places)
- **Timestamp**: Transaction creation time
- **Signature**: ECDSA digital signature (signed client-side, never server-side)
- **Public Key**: Sender's ECDSA public key for verification
- **Type**: transfer, mining_reward, burn, chat, nft, timecapsule

### 3.3 Network Architecture

BricsCoin operates on a dual-server architecture for maximum reliability:
- **Main Server**: FastAPI backend (Python), React frontend, SOLO stratum, MongoDB database
- **PPLNS Server**: Dedicated Stratum server for the PPLNS mining pool with independent share tracking

Communication between servers uses authenticated HTTP API calls for block propagation, share submission, and network synchronization.

---

## 4. Post-Quantum Cryptography

### 4.1 The Hybrid Approach

BricsCoin implements a **hybrid signature scheme** combining:
- **ECDSA (secp256k1)**: The classical algorithm used by Bitcoin. Provides proven, battle-tested security against classical computers.
- **ML-DSA-65 (FIPS 204)**: The NIST-standardized post-quantum digital signature algorithm (formerly CRYSTALS-Dilithium). Provides security against both classical and quantum computing attacks.

This dual approach ensures:
- **Backward compatibility**: Legacy wallets continue to function
- **Quantum resistance**: ML-DSA-65 remains secure against quantum attacks
- **Defense in depth**: Even if one algorithm is compromised, the other provides security

### 4.2 Client-Side Signing

A critical architectural decision in BricsCoin is that **all cryptographic signing occurs in the user's browser**:

1. Private keys are generated locally using `@noble/post-quantum`
2. Transactions are signed client-side before being submitted to the network
3. Private keys are **never** transmitted to any server
4. The server only verifies pre-signed transactions

This eliminates the most common attack vector in cryptocurrency platforms: server-side key compromise.

### 4.3 PQC Wallet Addresses

| Type | Format | Length |
|------|--------|--------|
| Legacy | `BRICS` + SHA256(public_key)[:40] | 45 characters |
| PQC | `BRICSPQ` + SHA256(public_key)[:38] | 45 characters |
| Migration | Zero-cost transfer from legacy to PQC | Instant |

### 4.4 Block Signing

Starting with v2.0, each node maintains its own PQC key pair. When a node mines a new block, it signs the block header with both its ECDSA and ML-DSA-65 private keys, providing verifiable attribution, integrity, and quantum-resistant authenticity for all blocks on the chain.

---

## 5. Mining & Consensus

### 5.1 SHA-256 Proof-of-Work

BricsCoin uses the same SHA-256 hashing algorithm as Bitcoin, ensuring full compatibility with the massive installed base of ASIC mining hardware. Miners connect via the standard Stratum v1 protocol on port 3333, making it compatible with all major mining software (CGMiner, BFGMiner, NerdMiner, etc.).

### 5.2 Mining Pools

BricsCoin supports two mining pool modes:

**SOLO Pool**: The finder of the block receives the full 50 BRICS reward. Ideal for high-hashrate miners. Integrated directly into the main server's Stratum endpoint.

**PPLNS Pool**: Pay Per Last N Shares — rewards are distributed proportionally among all miners who contributed shares in the window preceding the block. Ideal for smaller miners who want consistent payouts. Runs on a dedicated server.

### 5.3 Automatic Difficulty Adjustment

BricsCoin implements a fully automatic, **per-block difficulty adjustment algorithm** targeting a block time of **600 seconds** (10 minutes). The algorithm:

- Uses a **sliding window of the last 5 blocks** for fast convergence
- Estimates network hashrate from total work done divided by elapsed time
- Calculates new difficulty as: `new_diff = hashrate_estimate * 600`
- Applies a **safety clamp** (max 4x increase or 0.25x decrease) to prevent extreme oscillations
- Recalculates on **every single block** for maximum responsiveness to hashrate changes

This design ensures the chain remains stable and responsive even with significant hashrate fluctuations, automatically lowering difficulty when miners leave and increasing it when new miners join.

---

## 6. Tokenomics

### 6.1 Supply

- **Max Supply**: 21,000,000 BRICS (hard cap)
- **Block Reward**: 50 BRICS (halves every 210,000 blocks)
- **Premine**: None — 100% Fair Launch. All 21,000,000 BRICS are exclusively mineable.

### 6.2 Deflationary Fee Model

Transaction fees of **0.000005 BRICS** are **permanently burned** (destroyed), creating ongoing deflationary pressure on the supply. This mechanism:
- Reduces circulating supply with every transaction
- Provides anti-spam protection
- Aligns incentives for long-term holders

All on-chain features (BricsChat, Time Capsule, BricsNFT) use the same burn fee, contributing to the deflationary model.

### 6.3 Halving Schedule

| Event | Block | Reward |
|-------|-------|--------|
| Genesis | 0 | 50 BRICS |
| 1st Halving | 210,000 | 25 BRICS |
| 2nd Halving | 420,000 | 12.5 BRICS |
| 3rd Halving | 630,000 | 6.25 BRICS |
| 4th Halving | 840,000 | 3.125 BRICS |
| Final Coin | ~Year 2150 | 0 BRICS |

---

## 7. On-Chain Applications

BricsCoin hosts a suite of on-chain applications that leverage PQC signatures and the deflationary burn-fee mechanism.

### 7.1 BricsChat — Quantum-Proof On-Chain Messaging

BricsChat is the **world's first PQC-encrypted on-chain messaging system**. Each message is:
- Signed with the sender's hybrid ECDSA + ML-DSA-65 keys
- Stored immutably on the blockchain
- Publicly visible in the Global Feed
- Accompanied by a **0.000005 BRICS** fee that is burned

**Use cases:** Immutable declarations, public statements, provable communication timestamps, community governance.

### 7.2 Decentralized Time Capsule

The Time Capsule feature allows users to store encrypted data on-chain that becomes accessible only at a specific future block height.

- Data is locked until the target block is mined
- Each capsule creation burns **0.000005 BRICS**
- Content is immutable once locked

**Use cases:** Timed announcements, future predictions, proof-of-knowledge, community events.

### 7.3 BricsNFT — PQC-Signed On-Chain Certificates

BricsNFT is the **world's first NFT system with post-quantum cryptographic signatures**. It allows minting of immutable certificates signed with ECDSA + ML-DSA-65.

**Certificate Types:** Diploma/Degree, Property Deed, Authenticity Certificate, Professional License, Membership, Award/Achievement, Software License, Custom.

**Features:**
- Public gallery of all minted certificates
- Certificate transfer between PQC addresses
- On-chain verification tool
- Transfer history tracking
- Deflationary burn fee

### 7.4 AI Blockchain Oracle (GPT-5.2)

The AI Oracle is powered by **GPT-5.2** and provides real-time network intelligence:
- Network Analysis: health score, mining analysis, security assessment
- Predictions: difficulty trend, hashrate forecast, halving impact
- Ask Oracle: conversational AI using live network data

---

## 8. Security

### 8.1 Live Security Audit

BricsCoin includes a built-in security audit system that runs **27 real-time tests** covering:
- Input validation (8 tests)
- Classical cryptography (5 tests)
- Post-quantum cryptography (6 tests)
- Attack prevention (8 tests)

### 8.2 Attack Mitigations

| Attack | Mitigation |
|--------|-----------|
| Replay Attack | Signature uniqueness + timestamp validation |
| 51% Attack | SHA-256 PoW (same security model as Bitcoin) |
| Sybil Attack | Proof-of-Work requirement |
| DDoS | Rate limiting (120 req/min) + IP blacklisting |
| Quantum Attack | ML-DSA-65 hybrid signatures (NIST FIPS 204) |
| Key Theft | Client-side signing (keys never leave device) |
| Double Spend | Confirmation depth + balance checks |

### 8.3 Infrastructure Security

- **Cloudflare** reverse proxy with DDoS protection and SSL termination
- **Docker** containerized deployment with isolated services
- **Rate limiting** on all public endpoints (exempt for inter-node communication)
- **CORS** and security headers properly configured
- **MongoDB** with authentication and network isolation

---

## 9. Roadmap

### 9.1 Completed
- SHA-256 PoW blockchain with Stratum v1 mining
- ECDSA wallets, transactions, and client-side signing
- Web interface: Dashboard, Explorer, Wallet, Mining
- Post-Quantum Cryptography (ML-DSA-65) hybrid signatures
- PQC wallets with zero-cost migration
- Live security audit (27/27 tests)
- BricsChat: on-chain PQC-encrypted messaging
- Decentralized Time Capsule
- BricsNFT: PQC-signed on-chain certificates
- AI Oracle powered by GPT-5.2
- Deflationary burn-fee mechanism
- SOLO + PPLNS dual mining pools
- Automatic per-block difficulty adjustment
- Production deployment with Docker and Cloudflare

### 9.2 Future
- Miner reward routing to PQC addresses
- Mobile wallet application
- Stratum v2 protocol
- Variable difficulty for low-power miners
- Lightning-style payment channels
- CI/CD pipeline

---

## 10. Conclusion

BricsCoin combines the proven security of SHA-256 Proof-of-Work with forward-looking post-quantum cryptographic protection. By implementing ML-DSA-65 alongside ECDSA in a hybrid scheme, BricsCoin is positioned to remain secure even as quantum computing technology advances.

Beyond a simple payment network, BricsCoin offers a complete ecosystem of on-chain applications — from quantum-proof messaging to PQC-signed certificates — all contributing to a deflationary token economy through burn fees.

The commitment to client-side signing, open-source development, and community-driven governance ensures that BricsCoin remains transparent, accessible, and trustworthy for the post-quantum era.

---

## References

1. NIST FIPS 204: Module-Lattice-Based Digital Signature Standard (ML-DSA). National Institute of Standards and Technology, 2024.
2. Nakamoto, S. "Bitcoin: A Peer-to-Peer Electronic Cash System." 2008.
3. Ducas, L. et al. "CRYSTALS-Dilithium: A Lattice-Based Digital Signature Scheme." IACR, 2018.
4. SEC 2: Recommended Elliptic Curve Domain Parameters (secp256k1). Certicom Research, 2010.
5. Grover, L. K. "A fast quantum mechanical algorithm for database search." STOC, 1996.
6. Shor, P. W. "Algorithms for quantum computation: discrete logarithms and factoring." FOCS, 1994.

---

**Website**: [bricscoin26.org](https://bricscoin26.org)
**Repository**: [codeberg.org/Bricscoin_26/Bricscoin](https://codeberg.org/Bricscoin_26/Bricscoin)
**License**: MIT
