# BricsCoin - Product Requirements Document

## Original Problem Statement
Build "BricsCoin," a cryptocurrency with Post-Quantum Cryptography (PQC) featuring SHA256 Proof-of-Work, hybrid ECDSA + ML-DSA-65 signatures, and on-chain applications.

## Architecture
- **Frontend:** React (CRA + CRACO) with Tailwind CSS, Shadcn/UI, Framer Motion
- **Backend:** FastAPI (Python) with Motor (async MongoDB driver)
- **Database:** MongoDB
- **Production:** Docker Compose on Hetzner VPS (5.161.254.163), domain: bricscoin26.org
- **Repository:** https://codeberg.org/Bricscoin_26/Bricscoin

## What's Been Implemented

### Core Blockchain
- SHA256 PoW consensus, 21M max supply, 50 BRICS block reward, halving every 210,000 blocks
- Hybrid ECDSA + ML-DSA-65 PQC signatures
- Stratum mining server (port 3333)
- P2P network, difficulty adjustment

### On-Chain Applications
- **BricsChat:** PQC-encrypted on-chain messaging
- **Time Capsule:** Time-locked on-chain data storage
- **AI Oracle:** GPT-5.2 powered blockchain intelligence (via Emergent LLM Key)
- **BricsNFT:** PQC-signed on-chain certificates (mint, verify, transfer, gallery)

### UI/UX
- Consolidated tabbed interface (Blockchain.jsx, WalletHub.jsx, AIOracle.jsx)
- URL-based tab state persistence (useSearchParams)
- Professional dark theme with gold accents

### Bug Fixes (All Deployed)
- BricsChat visibility for users without PQC wallet
- AI Oracle crash and data accuracy (real-time network data)
- Rich List filtering (>= 1 BRICS)
- Tab state persistence on page refresh

## Completed Tasks (Feb 2026)
- [x] BricsNFT feature development (backend + frontend)
- [x] Deploy BricsNFT to production (bricscoin26.org)
- [x] Update Whitepaper v3.0 (Markdown + PDF with cover image)
- [x] Push all code to Codeberg repository
- [x] Fix frontend build URL (was pointing to preview instead of production)
- [x] Generate whitepaper PDF with professional cover image and deploy to production
- [x] Update Dashboard subtitle: "A Decentralized SHA256 PoW Cryptocurrency with PQ Security" + Author
- [x] P2Pool v2.0: True decentralized mining with sharechain, P2P validation, SOLO + PPLNS modes
- [x] PPLNS Stratum node deployed on 157.180.123.105:3334 (separate server)
- [x] 2 live P2P nodes: mainnet (SOLO) + p2pool-pplns-node1 (PPLNS)
- [x] Auto-registration of nodes at startup

## Prioritized Backlog
- **P1:** Configure miner block rewards to PQC address
- **P2:** BricsID / BricsVault (decentralized identity, dead man's switch)
- **P3:** Cleanup downloads folder on Codeberg
- **P5:** Mobile Wallet

## 3rd Party Integrations
- OpenAI GPT-5.2 via Emergent LLM Key (AI Oracle)
- Codeberg for Git hosting

## Key Credentials
- Production SSH: root@5.161.254.163
- Codeberg: Bricscoin_26
