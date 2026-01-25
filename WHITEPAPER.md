# BricsCoin Whitepaper
## A Decentralized SHA256 Proof-of-Work Cryptocurrency

**Version 1.0 - January 2026**  
**Author: Jabo86**

---

## Abstract

BricsCoin (BRICS) is a decentralized cryptocurrency built on the proven SHA256 Proof-of-Work consensus mechanism. Designed for hardware mining compatibility, BricsCoin enables anyone with ASIC mining equipment to participate in securing the network and earning rewards. With a fixed supply of 21 million coins and zero transaction fees, BricsCoin aims to be a fair, transparent, and community-driven digital currency.

---

## 1. Introduction

### 1.1 Background

Since Bitcoin's inception in 2009, Proof-of-Work has proven to be the most secure and decentralized consensus mechanism for digital currencies. BricsCoin builds upon this foundation, implementing a clean SHA256-based blockchain optimized for modern ASIC mining hardware.

### 1.2 Vision

BricsCoin's mission is to create a truly decentralized currency that:
- Remains accessible to hardware miners worldwide
- Maintains zero transaction fees for all users
- Provides transparent, verifiable transactions
- Operates as a fully open-source project

---

## 2. Technical Specifications

| Parameter | Value |
|-----------|-------|
| **Algorithm** | SHA256 (Double SHA256) |
| **Consensus** | Proof-of-Work |
| **Max Supply** | 21,000,000 BRICS |
| **Block Reward** | 50 BRICS |
| **Halving Interval** | Every 210,000 blocks |
| **Target Block Time** | ~10 minutes |
| **Difficulty Adjustment** | Dynamic |
| **Initial Difficulty** | 10,000 |
| **Transaction Fees** | 0.05 BRICS |
| **Premine** | 1,000,000 BRICS (4.76%) |
| **Address Prefix** | BRICS |

### 2.1 SHA256 Algorithm

BricsCoin uses the same SHA256 hashing algorithm as Bitcoin, ensuring:
- Proven security with over 15 years of real-world testing
- Compatibility with existing ASIC mining hardware (Bitaxe, Antminer, etc.)
- Well-understood cryptographic properties

### 2.2 Block Structure

Each block contains:
- Block index (height)
- Timestamp (Unix epoch)
- List of transactions
- Proof (nonce)
- Previous block hash
- Merkle root of transactions
- Miner address
- Difficulty target

### 2.3 Difficulty Adjustment

The network automatically adjusts mining difficulty to maintain consistent block times:
- Target: 1 block per ~10 minutes
- Adjustment: Based on recent block times
- This ensures stable block production regardless of total network hashrate

---

## 3. Tokenomics

### 3.1 Supply Distribution

```
Total Supply: 21,000,000 BRICS
├── Premine: 1,000,000 BRICS (4.76%)
│   └── Development, marketing, liquidity
└── Mining Rewards: 20,000,000 BRICS (95.24%)
    └── Distributed to miners over time
```

### 3.2 Emission Schedule

| Phase | Blocks | Reward | Total Mined |
|-------|--------|--------|-------------|
| 1 | 0 - 210,000 | 50 BRICS | 10,500,000 |
| 2 | 210,001 - 420,000 | 25 BRICS | 5,250,000 |
| 3 | 420,001 - 630,000 | 12.5 BRICS | 2,625,000 |
| 4 | 630,001 - 840,000 | 6.25 BRICS | 1,312,500 |
| ... | ... | Halving continues | ... |

### 3.3 Premine Justification

The 4.76% premine is allocated for:
- **Development** (40%): Ongoing protocol improvements
- **Marketing** (30%): Community growth and adoption
- **Liquidity** (20%): Exchange listings and market making
- **Team** (10%): Core contributor compensation

---

## 4. Mining

### 4.1 Hardware Requirements

BricsCoin is optimized for SHA256 ASIC miners:
- **Recommended**: Bitaxe, Antminer S19/S21, Whatsminer M50/M60
- **Minimum**: Any SHA256-capable ASIC
- **Not Recommended**: CPU/GPU mining (inefficient)

### 4.2 Stratum Protocol

Miners connect via the standard Stratum protocol:
```
Pool: stratum+tcp://bricscoin26.org:3333
Username: <your_BRICS_address>
Password: x
```

### 4.3 Solo vs Pool Mining

Currently, BricsCoin operates with a central mining pool. Future developments include:
- Decentralized pool protocols
- P2Pool support
- Solo mining node software

---

## 5. Wallet

### 5.1 Web Wallet

Available at https://bricscoin26.org/wallet
- Create new wallets
- Import existing wallets via seed phrase
- Send and receive BRICS
- View transaction history

### 5.2 Desktop Wallet (BricsCoin Core)

Full-featured desktop application:
- Available for Linux, Windows, macOS
- P2P network synchronization
- Secure client-side transaction signing
- Private keys never leave your device

### 5.3 Security Model

All wallets use:
- **ECDSA (secp256k1)**: Same elliptic curve as Bitcoin
- **Client-side signing**: Private keys never transmitted
- **12-word seed phrases**: BIP39-compatible recovery

---

## 6. Network Architecture

### 6.1 Current Architecture

```
[Miners] <--Stratum--> [Pool Server] <--API--> [Blockchain Node]
                                                      |
[Web Wallet] <----------- HTTPS -------------------->[API]
[Desktop Wallet] <----------------------------------->[API]
```

### 6.2 Future Decentralization Roadmap

1. **Phase 1** (Current): Centralized node + pool
2. **Phase 2**: Multiple independent nodes
3. **Phase 3**: P2P node discovery
4. **Phase 4**: Full decentralization

---

## 7. Security

### 7.1 Implemented Measures

- **CORS Protection**: API restricted to authorized origins
- **Rate Limiting**: Protection against DDoS attacks
- **Input Validation**: All inputs sanitized server-side
- **Replay Attack Prevention**: Timestamped, signed transactions
- **Client-Side Signing**: Private keys never exposed

### 7.2 Cryptographic Standards

- SHA256 for block hashing
- ECDSA (secp256k1) for transaction signatures
- Merkle trees for transaction verification

---

## 8. Roadmap

### Q1 2026 ✅
- [x] Mainnet launch
- [x] Web wallet
- [x] Block explorer
- [x] Hardware mining support (Stratum)
- [x] Desktop wallet (BricsCoin Core)

### Q2 2026
- [ ] Exchange listings
- [ ] Mobile wallet (iOS/Android)
- [ ] Additional mining pools
- [ ] Community governance

### Q3 2026
- [ ] P2P node network
- [ ] Smart contract exploration
- [ ] Cross-chain bridges

### Q4 2026
- [ ] Full decentralization
- [ ] Lightning Network compatibility
- [ ] Enterprise partnerships

---

## 9. Team

### Jabo86 - Founder & Lead Developer

Anonymous developer passionate about decentralization and cryptocurrency. Building BricsCoin as a community-driven, open-source project.

**Contact**: GitHub [@bricscoin26](https://github.com/bricscoin26)

---

## 10. Open Source

BricsCoin is fully open source under the MIT License.

**Repository**: https://github.com/bricscoin26/Bricscoin26

Anyone can:
- Review the code
- Submit improvements
- Fork the project
- Run their own node

---

## 11. Conclusion

BricsCoin represents a return to the fundamental principles of cryptocurrency: decentralization, transparency, and community ownership. By leveraging proven SHA256 technology and maintaining an open-source approach, we aim to build a sustainable digital currency for the future.

---

## 12. Disclaimer

This whitepaper is for informational purposes only. Cryptocurrency investments carry significant risk. BricsCoin makes no guarantees regarding future value or returns. Always do your own research before participating in any cryptocurrency project.

---

**Website**: https://bricscoin26.org  
**GitHub**: https://github.com/bricscoin26/Bricscoin26  
**License**: MIT

*© 2026 BricsCoin Project. All rights reserved.*
