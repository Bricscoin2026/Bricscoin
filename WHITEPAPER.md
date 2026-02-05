# BricsCoin Whitepaper

**A Decentralized SHA-256 Proof-of-Work Cryptocurrency**  
**Version 1.2 – February 2026**  
**Author: Jabo86 (Founder & Lead Developer)**

## Abstract
BricsCoin (ticker: BRICS) is a decentralized, open-source cryptocurrency implementing the SHA-256 Proof-of-Work consensus mechanism. It is designed for compatibility with existing ASIC mining hardware, enabling broad participation in network security and reward distribution. With a capped supply of 21,000,000 coins, a fixed transaction fee of 0.05 BRICS (permanently burned), and a transparent premine allocation, BricsCoin prioritizes fairness, verifiability, and long-term sustainability as a community-driven digital asset.

## 1. Introduction

### 1.1 Background
Proof-of-Work, as pioneered by Bitcoin in 2009, remains the most battle-tested mechanism for achieving decentralized consensus in permissionless networks. BricsCoin adopts this model without modification to the core consensus rules, using SHA-256 hashing to ensure cryptographic security and hardware compatibility.

### 1.2 Objectives
BricsCoin seeks to deliver:
- Accessible mining for SHA-256 ASIC owners worldwide
- Predictable, low transaction costs via burned fees
- Full transparency through open-source code and verifiable parameters
- No central authority, no ICO, no pre-sale – pure code-driven issuance

## 2. Technical Specifications

|
 Parameter              
|
 Value                              
|
|
------------------------
|
------------------------------------
|
|
 Consensus Algorithm    
|
 SHA-256 Proof-of-Work (double hash)
|
|
 Maximum Supply         
|
 21,000,000 BRICS                   
|
|
 Initial Block Reward   
|
 50 BRICS                           
|
|
 Halving Interval       
|
 Every 210,000 blocks               
|
|
 Target Block Time      
|
 10 minutes                         
|
|
 Difficulty Adjustment  
|
 Dynamic (Bitcoin-style retargeting)
|
|
 Initial Difficulty     
|
 1                                  
|
|
 Transaction Fee        
|
 0.05 BRICS (burned)                
|
|
 Premine                
|
 1,000,000 BRICS (≈4.76%)           
|
|
 Address Format         
|
 Starts with "BRICS"                
|
|
 Cryptography           
|
 ECDSA secp256k1 (signatures)       
|

### 2.1 Block Structure
Blocks follow Bitcoin-compatible format:
- Version
- Previous block hash
- Merkle root
- Timestamp (Unix)
- Difficulty bits
- Nonce
- List of transactions
- Coinbase transaction (reward to miner address)

### 2.2 Difficulty Retargeting
Difficulty adjusts every 2016 blocks (≈2 weeks at target) to maintain ~10-minute intervals, based on actual time taken for the previous period.

## 3. Tokenomics

### 3.1 Supply Distribution
- **Total Supply**: 21,000,000 BRICS
- **Premine**: 1,000,000 BRICS (allocated transparently for development, marketing, and initial liquidity; held in public addresses)
- **Mined Supply**: 20,000,000 BRICS (distributed exclusively via block rewards to miners)

### 3.2 Emission Schedule
Halving occurs every 210,000 blocks (~4 years at target pace):

|
 Phase 
|
 Blocks              
|
 Reward per Block 
|
 Cumulative Mined 
|
|
-------
|
---------------------
|
------------------
|
------------------
|
|
 1     
|
 0 – 210,000         
|
 50 BRICS         
|
 10,500,000       
|
|
 2     
|
 210,001 – 420,000   
|
 25 BRICS         
|
 15,750,000       
|
|
 3     
|
 420,001 – 630,000   
|
 12.5 BRICS       
|
 18,375,000       
|
|
 4     
|
 630,001 – 840,000   
|
 6.25 BRICS       
|
 19,687,500       
|
|
 ...   
|
 ...                 
|
 Halving continues
|
 → 21,000,000     
|

### 3.3 Fee Burning Mechanism
Every transaction incurs a fixed 0.05 BRICS fee, which is permanently removed from circulation (sent to a provably unspendable address), creating deflationary pressure over time.

## 4. Mining

### 4.1 Hardware Compatibility
Optimized for SHA-256 ASICs:
- Recommended: Bitaxe, Antminer S-series, Whatsminer M-series
- Inefficient: CPU/GPU mining (not viable)

### 4.2 Stratum Protocol
Miners connect via standard Stratum:
- Pool: `stratum+tcp://bricscoin26.org:3333`
- Username: Your BRICS wallet address
- Password: `x` (arbitrary)

Solo mining and future decentralized pools (e.g., P2Pool) are planned.

## 5. Wallets

### 5.1 Web Wallet
- Hosted at https://bricscoin26.org/wallet
- Progressive Web App (PWA) support
- Client-side key generation and signing (private keys never leave device)

### 5.2 Desktop Wallet (BricsCoin Core)
- Electron-based full node
- Platforms: Windows, macOS, Linux
- P2P synchronization, block validation, secure signing

### 5.3 Key Security Features
- ECDSA secp256k1 signatures
- BIP-39 12-word mnemonics
- Client-side transaction construction and signing

## 6. Network Architecture
Current: Centralized bootstrap node + Stratum pool + API layer  
Future Roadmap:
- Multiple independent full nodes
- P2P node discovery and gossip
- Decentralized mining pools
- Enhanced resilience against central points

## 7. Security Overview
- Client-side signing
- Server-side input validation (Pydantic)
- Rate limiting & IP blacklisting
- CORS restrictions
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Replay protection via timestamps
- Comprehensive audit passed (27/27 tests, February 2026) – see SECURITY_AUDIT.md

## 8. Genesis Block & Launch Details
- **Mainnet Launch**: February 2026
- **Genesis Block (Height #0)**:

  | Field              | Value                                      |
  |--------------------|--------------------------------------------|
  | Block Height       | 0                                          |
  | Block Hash         | bc49816bc68faa70357d753091fc917bd1c121aa4c86d660bf25a3f0679d3e4c |
  | Previous Hash      | 0000000000000000000000000000000000000000000000000000000000000000 |
  | Timestamp          | 02/02/2026, 01:24:10 (UTC)                 |
  | Miner              | genesis                                    |
  | Nonce              | 0                                          |
  | Difficulty         | 1                                          |
  | Mining Reward      | 50 BRICS                                   |
  | Transactions       | 1 (coinbase transaction)                   |

These details are hardcoded in the genesis block and verifiable on the blockchain via the explorer at https://bricscoin26.org/explorer.

## 9. Team & Governance
- **Founder & Lead Developer**: Jabo86 – Independent developer focused on decentralization and open-source PoW systems.
- Governance: Code-driven; no central team or foundation. Community contributions via pull requests.

## 10. Open Source
Licensed under the **MIT License**.  
Repository: https://codeberg.org/Bricscoin_26/Bricscoin  
Anyone may review, fork, modify, or run nodes.

## 11. Conclusion
BricsCoin revives the core cypherpunk principles of cryptocurrency: sound money through Proof-of-Work, fixed supply, and absolute decentralization. By building directly on proven SHA-256 technology while adding modern tooling (web/desktop wallets, audited security), it offers a transparent platform for experimentation and value transfer.

## 12. Disclaimer
BricsCoin is an experimental, open-source protocol for educational and technical purposes. It carries no promises of value, adoption, or returns. There is no central entity, no ICO, and no affiliation with any organization, state, or geopolitical group. Participation (mining, holding, transacting) is voluntary and at your own risk. The code is the sole authority—always verify independently. No warranties are provided.

**Website**: https://bricscoin26.org  
**Repository**: https://codeberg.org/Bricscoin_26/Bricscoin  
**License**: MIT  
**© 2026 Jabo86 / BricsCoin Project**