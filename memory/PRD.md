# BricsCoin - Product Requirements Document

## Original Problem Statement
Build "BricsCoin," a cryptocurrency with Post-Quantum Cryptography (PQC). The project includes a full blockchain with SHA-256 PoW, PQC wallets (ECDSA + ML-DSA-65), and unique features:
- **BricsChat**: On-chain PQC-encrypted messaging
- **Decentralized Time Capsule**: Encrypted data unlockable at future block heights
- **AI Blockchain Oracle**: GPT-5.2 network health analyzer
- **Fee-burning mechanism**: BricsChat and Time Capsule fees burned for deflation

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI (craco build)
- **Backend**: FastAPI + MongoDB
- **Production**: Docker on bricscoin26.org (5.161.254.163)

## What's Been Implemented
- Full blockchain with 2,153+ blocks
- Legacy + PQC wallet system
- BricsChat with public Global Feed (visible to all visitors)
- Time Capsule with public listing
- AI Oracle with GPT-5.2
- Fee-burning mechanism (0.000005 BRICS per message/capsule)
- Consolidated Blockchain page (Overview, Explorer, Mining, Rich List, Run a Node)
- Consolidated Wallet Hub (Legacy, PQC, Migration)
- Dashboard with live BricsChat feed
- Run a Node guide (English) in Blockchain tab
- Stratum mining pool support

## Recent Changes (Feb 22, 2026)
- **Fixed BricsChat visibility bug**: Global Feed now visible to all visitors without wallet
- **Added "Run a Node" tab**: Full English step-by-step guide in Blockchain page
- **Translated Run a Node to English**: Consistent with rest of the site
- **Deployed to production**: All changes live on bricscoin26.org

## Production Deployment Notes
- Server: `ssh root@5.161.254.163` (password: Fabio@katia2021)
- Docker compose file: `docker-compose.prod.yml`
- Frontend builds via craco (not react-scripts) due to `@/` path alias
- Backend route files (chat_routes.py, timecapsule_routes.py, oracle_routes.py) are included in server.py via `app.include_router()`
- Frontend container serves pre-built static files via nginx

## Backlog
- P1: Configure miner block rewards to PQC address
- P2: Clean up downloads folder on Codeberg
- P3: Mining pool optimizations (Stratum v2 / P2Pool)
- P4: Mobile wallet application
- Refactor: Move logic from deprecated pages into hub components
