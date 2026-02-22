# BricsCoin - Product Requirements Document

## Original Problem Statement
Build "BricsCoin," a cryptocurrency with Post-Quantum Cryptography (PQC). The project includes a full blockchain with SHA-256 PoW, PQC wallets (ECDSA + ML-DSA-65), and unique features:
- **BricsChat**: On-chain PQC-encrypted messaging
- **Decentralized Time Capsule**: Encrypted data unlockable at future block heights
- **AI Blockchain Oracle**: GPT-5.2 network health analyzer
- **Fee-burning mechanism**: BricsChat and Time Capsule fees burned for deflation

## User Personas
- Crypto enthusiasts wanting to mine/trade BRICS
- Node operators supporting decentralization
- Developers building on the platform

## Core Requirements
1. SHA-256 Proof of Work blockchain
2. PQC hybrid signatures (ECDSA + ML-DSA-65)
3. Stratum mining pool support
4. Professional tabbed UI (Blockchain, Wallet, Chat, TimeCapsule, Oracle)
5. Italian language support for node instructions

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Production**: Docker on bricscoin26.org (5.161.254.163)

## What's Been Implemented
- Full blockchain with 2,152+ blocks
- Legacy + PQC wallet system
- BricsChat with public feed (visible to all visitors)
- Time Capsule with public listing
- AI Oracle with GPT-5.2
- Fee-burning mechanism (0.000005 BRICS per message/capsule)
- Consolidated Blockchain page (Overview, Explorer, Mining, Rich List, Run a Node)
- Consolidated Wallet Hub (Legacy, PQC, Migration)
- Dashboard with live BricsChat feed
- Run a Node guide (Italian) in Blockchain tab

## Recent Changes (Feb 2026)
- **Fixed BricsChat visibility bug**: Global Feed now visible to all visitors without wallet
- **Added "Run a Node" tab**: Full Italian step-by-step guide in Blockchain page

## Backlog
- P1: Configure miner block rewards to PQC address
- P2: Clean up downloads folder on Codeberg
- P3: Mining pool optimizations (Stratum v2 / P2Pool)
- P4: Mobile wallet application
- Refactor: Move logic from deprecated pages (Wallet.jsx, Explorer.jsx) into hub components
