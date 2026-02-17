# BricsCoin Whitepaper
## A Decentralized SHA256 Proof-of-Work Cryptocurrency with Post-Quantum Security

**Version 2.0 - February 2026**  
**Author: Jabo86**

---

## Abstract

BricsCoin (BRICS) is a decentralized cryptocurrency built on the proven SHA256 Proof-of-Work consensus mechanism, enhanced with post-quantum cryptographic security. Designed for hardware mining compatibility, BricsCoin enables anyone with ASIC mining equipment to participate in securing the network and earning rewards. With a fixed supply of 21 million coins, ultra-low transaction fees of 0.000005 BRICS (burned), and a hybrid ECDSA + ML-DSA-65 signature scheme providing quantum resistance, BricsCoin aims to be a fair, transparent, secure, and future-proof digital currency.

---

## 1. Introduction

### 1.1 Background

Since Bitcoin's inception in 2009, Proof-of-Work has proven to be the most secure and decentralized consensus mechanism for digital currencies. BricsCoin builds upon this foundation, implementing a clean SHA256-based blockchain optimized for modern ASIC mining hardware.

### 1.2 The Quantum Threat

The development of large-scale quantum computers poses a significant threat to current cryptographic systems. Shor's algorithm can break ECDSA and RSA, the foundations of most blockchain security. BricsCoin proactively addresses this threat by implementing a hybrid post-quantum cryptographic scheme.

### 1.3 Vision

BricsCoin's mission is to create a truly decentralized currency that:
- Remains accessible to hardware miners worldwide
- Maintains ultra-low transaction fees for all users (0.000005 BRICS, burned)
- Provides transparent, verifiable transactions
- Offers quantum-resistant security through ML-DSA-65
- Operates as a fully open-source project

---

## 2. Technical Specifications

| Parameter | Value |
|-----------|-------|
| **Algorithm** | SHA256 Proof-of-Work |
| **Consensus** | Proof-of-Work |
| **Max Supply** | 21,000,000 BRICS |
| **Block Reward** | 50 BRICS (initial) |
| **Halving Interval** | Every 210,000 blocks |
| **Target Block Time** | ~10 minutes |
| **Difficulty Adjustment** | Every 2016 blocks |
| **Transaction Fee** | 0.000005 BRICS (burned) |
| **Fee Model** | Deflationary (all fees destroyed) |
| **Signature Algorithm** | ECDSA secp256k1 + ML-DSA-65 (hybrid) |
| **Address Format** | Legacy: `BRICS` + 40 hex / PQC: `BRICSPQ` + 38 hex |
| **Mining Protocol** | Stratum v1 |
| **License** | MIT |

---

## 3. Blockchain Architecture

### 3.1 Block Structure

Each block contains:
- **Index**: Sequential block number
- **Timestamp**: UTC block creation time
- **Transactions**: List of validated transactions
- **Previous Hash**: SHA256 hash of the previous block
- **Nonce**: Proof-of-Work solution
- **Difficulty**: Current mining difficulty target
- **Miner Address**: Address that receives the block reward
- **PQC Signature**: Hybrid ECDSA + ML-DSA-65 block signature (v2.0+)

### 3.2 Transaction Structure

Each transaction includes:
- **Sender/Recipient**: BRICS or BRICSPQ addresses
- **Amount**: Transfer amount (max 8 decimal places)
- **Timestamp**: Transaction creation time
- **Signature**: ECDSA digital signature (signed client-side)
- **Public Key**: Sender's ECDSA public key for verification

### 3.3 Mining

BricsCoin uses the same SHA256 algorithm as Bitcoin, ensuring compatibility with existing ASIC mining hardware. Miners connect via the Stratum protocol on port 3333.

**Difficulty adjustment** occurs every 2016 blocks, targeting a 10-minute block time. The algorithm increases difficulty when blocks are mined too quickly and decreases it when blocks are too slow.

---

## 4. Post-Quantum Cryptography

### 4.1 The Hybrid Approach

BricsCoin implements a **hybrid signature scheme** combining:
- **ECDSA (secp256k1)**: The classical algorithm used by Bitcoin
- **ML-DSA-65 (FIPS 204)**: The NIST-standardized post-quantum signature algorithm (formerly known as Dilithium)

This dual approach ensures:
- **Backward compatibility**: Legacy wallets continue to function
- **Quantum resistance**: ML-DSA-65 remains secure against quantum attacks
- **Defense in depth**: Even if one algorithm is compromised, the other provides security

### 4.2 Client-Side Signing

A key architectural decision in BricsCoin is that **all cryptographic signing occurs in the user's browser**:

1. Private keys are generated locally using `@noble/post-quantum`
2. Transactions are signed client-side before being submitted to the network
3. Private keys are **never** transmitted to any server
4. The server only verifies pre-signed transactions

This eliminates the most common attack vector in cryptocurrency platforms: server-side key compromise.

### 4.3 PQC Wallet Addresses

PQC wallets use the `BRICSPQ` prefix to distinguish them from legacy wallets:
- Legacy: `BRICS` + SHA256(public_key)[:40] = 45 characters
- PQC: `BRICSPQ` + SHA256(public_key)[:38] = 45 characters

### 4.4 Block Signing

Starting with v2.0, each node maintains its own PQC key pair. When a node mines a new block, it signs the block with both its ECDSA and ML-DSA-65 private keys. This provides verifiable attribution and integrity for all blocks on the chain.

### 4.5 Migration

Users can migrate from legacy ECDSA wallets to PQC wallets at **zero cost** (no transaction fee). The migration endpoint `/api/pqc/migrate` transfers the full balance from a legacy address to a new PQC address.

---

## 5. Tokenomics

### 5.1 Supply

- **Max Supply**: 21,000,000 BRICS (hard cap)
- **Block Reward**: 50 BRICS (halves every 210,000 blocks)
- **Premine**: Genesis block allocation for development

### 5.2 Fee Model (Deflationary)

Transaction fees of **0.000005 BRICS** are **burned** (permanently destroyed), creating a deflationary pressure on the supply over time. This mechanism:
- Reduces circulating supply with each transaction
- Provides anti-spam protection
- Aligns incentives for long-term holders

### 5.3 Halving Schedule

| Event | Block | Reward |
|-------|-------|--------|
| Genesis | 0 | 50 BRICS |
| 1st Halving | 210,000 | 25 BRICS |
| 2nd Halving | 420,000 | 12.5 BRICS |
| 3rd Halving | 630,000 | 6.25 BRICS |
| ... | ... | ... |

---

## 6. Network Architecture

### 6.1 API Server

The BricsCoin API is built on FastAPI (Python) with:
- Asynchronous MongoDB (Motor) for high-performance database operations
- Rate limiting to prevent abuse
- Security headers and CORS configuration
- RESTful endpoints for all blockchain operations

### 6.2 Mining Server

The Stratum server supports:
- Stratum v1 protocol (port 3333)
- Variable difficulty per worker
- Share validation and hashrate tracking
- PQC block signing on successful mine

### 6.3 Peer-to-Peer Network

Nodes communicate via HTTP API calls for:
- Block propagation
- Transaction broadcasting
- Blockchain synchronization
- Peer discovery

---

## 7. Security

### 7.1 Live Security Audit

BricsCoin includes a built-in security audit system that runs 27 real-time tests covering:
- Input validation (8 tests)
- Classical cryptography (5 tests)
- Post-quantum cryptography (6 tests)
- Attack prevention (8 tests)

The audit can be executed at any time via `GET /api/security/audit`.

### 7.2 Attack Mitigations

| Attack | Mitigation |
|--------|-----------|
| Replay Attack | Signature uniqueness + timestamp validation |
| 51% Attack | SHA256 PoW (same security model as Bitcoin) |
| Sybil Attack | Proof-of-Work requirement |
| DDoS | Rate limiting + IP blacklisting |
| Quantum Attack | ML-DSA-65 hybrid signatures |
| Key Theft | Client-side signing (keys never leave device) |

---

## 8. Roadmap

### Completed
- SHA256 PoW blockchain
- ECDSA wallets and transactions
- Stratum mining protocol
- Web interface (Dashboard, Explorer, Wallet)
- Post-Quantum Cryptography (ML-DSA-65)
- Hybrid ECDSA + PQC signatures
- Client-side browser signing
- Zero-fee wallet migration
- Live security audit (27/27 tests)
- Production deployment

### Future
- Mobile wallet application
- Stratum v2 protocol
- P2Pool decentralized mining
- Lightning-style payment channels

---

## 9. Conclusion

BricsCoin combines the proven security of SHA256 Proof-of-Work with forward-looking post-quantum cryptographic protection. By implementing ML-DSA-65 alongside ECDSA in a hybrid scheme, BricsCoin is positioned to remain secure even as quantum computing technology advances. The commitment to client-side signing, open-source development, and community-driven governance ensures that BricsCoin remains transparent, accessible, and trustworthy.

---

## References

1. NIST FIPS 204: Module-Lattice-Based Digital Signature Standard (ML-DSA)
2. Nakamoto, S. "Bitcoin: A Peer-to-Peer Electronic Cash System" (2008)
3. Bernstein, D.J. et al. "CRYSTALS-Dilithium: A Lattice-Based Digital Signature Scheme"
4. SEC 2: Recommended Elliptic Curve Domain Parameters (secp256k1)

---

**Website**: [bricscoin26.org](https://bricscoin26.org)  
**Repository**: [codeberg.org/Bricscoin_26/Bricscoin](https://codeberg.org/Bricscoin_26/Bricscoin)  
**License**: MIT
