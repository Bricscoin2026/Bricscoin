# BricsCoin - Product Requirements Document

## Original Problem Statement
Create a Bitcoin-like cryptocurrency called "BricsCoin" with Post-Quantum Cryptography (PQC) security features. The project runs on a live production server at bricscoin26.org.

## Architecture
- **Backend**: FastAPI (Python) running in Docker
- **Frontend**: React running in Docker
- **Database**: MongoDB running in Docker
- **Stratum Server**: Custom Python Stratum for ASIC mining (Bitaxe)
- **Production**: Docker Compose on Hetzner server (5.161.254.163)
- **Repository**: https://codeberg.org/Bricscoin_26/Bricscoin

## What's Been Implemented

### Core Blockchain
- Full blockchain with SHA-256 PoW mining
- Bitcoin-style difficulty adjustment
- Halving every 210,000 blocks, initial reward 50 BRICS
- Transaction fee: 0.000005 BRICS

### Post-Quantum Cryptography (PQC)
- Hybrid ECDSA + ML-DSA-65 signature scheme
- Client-side signing in browser
- PQC wallet creation, management, and fee-less migration
- Quantum Security Status widget + Security Audit page

### Mining (Stratum Server)
- Custom Stratum v1 server on port 3333
- BIP320 version rolling support for ASIC miners (Bitaxe)
- Share-based hashrate calculation (progressive windows)
- Active miner tracking via MongoDB (unique workers)

### Frontend Pages
- Dashboard, Explorer, Mining, Network, Wallet, PQC Wallet
- Rich List, Wallet Migration, About (Security Audit)
- Downloads page linking to Codeberg release folder

### Desktop Wallet - BricsCoin Wallet v1.0.0
- Electron desktop wallet with full PQC integration
- Hybrid ECDSA + ML-DSA-65 signing (keys never leave device)
- Deterministic ML-DSA-65 keygen from seed phrase
- crypto.getRandomValues polyfill for Node.js/Electron compatibility
- Cross-platform: Windows, macOS, Linux builds on Codeberg

## Completed Work - Session Feb 18-19, 2026 (Fork 2)

1. **Download page links fixed** — All buttons point to Codeberg folder
2. **Git commit author fixed** — 456 commits rewritten to "Bricscoin_26"
3. **PQC transaction bug fixed** — crypto.getRandomValues polyfill in Electron
4. **All platform builds rebuilt** — Win/Mac/Linux with crypto fix on Codeberg
5. **Old builds cleaned up** — Removed obsolete "Core 3.0.0" builds
6. **PQC Wallet & Migration pages translated** — Italian → English
7. **Negative balance bug fixed** — PQC transaction now checks amount + fee
8. **MAX button added** — Send dialog shows available balance and MAX button
9. **Number formatting fixed** — Balances rounded to 8 decimals, no scientific notation
10. **Production backup created** — `/root/bricscoin-backup-20260219_071116/`

## Production Deploy Notes
- **NEVER replace entire server.py** — Use `sed` for targeted fixes
- Latest backup: `/root/bricscoin-backup-20260219_071116/`
- Frontend deploy: `docker cp` tar.gz + `tar -xzf` + `nginx -s reload`
- Backend patch: `docker exec sed -i` + `docker restart bricscoin-api`

## Completed Work - Session Feb 20, 2026 (Fork 3)

11. **Blockspot.io logo on Dashboard** — Added Blockspot.io logo below the Legal Disclaimer, linked to https://blockspot.io/coin/bricscoin/
12. **CoinCarp logo on Dashboard** — Added CoinCarp logo next to Blockspot.io, linked to https://www.coincarp.com/currencies/bricscoin/

## Completed Work - Session Feb 22, 2026 (Fork 3 continued)

13. **CEX Exchange MVP** — Full centralized exchange for BRICS/USDT trading
    - User registration/login with JWT auth
    - Wallet system (BRICS + USDT balances)
    - Order book with limit and market orders
    - Matching engine with maker/taker fees (0.1%/0.2%)
    - Candlestick price chart (TradingView lightweight-charts v5)
    - Recent trades, open orders
    - Admin credit endpoint for funding wallets
    - Initial price: 0.0086 USDT
14. **Deposit/Withdrawal Integration**
    - USDT TRC-20: Unique Tron deposit address per user, auto-monitoring via TronGrid API
    - BRICS: On-chain deposit address with memo, on-chain withdrawal
    - USDT withdrawal via hot wallet
    - Wallet panel in UI with deposit/withdraw tabs
    - Background deposit monitor running every 30s
    - All tests passed (28/28 backend, 100% frontend)

## Remaining Backlog

### P0
- Deploy exchange to production server (bricscoin26.org/exchange)

### P1
- Add exchange link to main Dashboard navigation

### P2
- Add trading volume/price history graphs

### Future
- Mobile wallet app
- Stratum v2 / P2Pool
- Hashrate history graph on Mining page
