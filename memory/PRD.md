# BricsCoin - Product Requirements Document

## Original Problem Statement
Creare una criptovaluta Bitcoin-like chiamata "BricsCoin" con:
- Blockchain Proof of Work con SHA256
- Difficulty adjustment dinamico (~10 min target)
- Supporto ASIC miners via Stratum protocol
- Web wallet e desktop wallet
- Explorer e dashboard

## User Persona
- Crypto enthusiast con hardware mining (Bitaxe, NerdMiner, NerdQaxe)
- Vuole una coin privata per esperimenti/community

## Current Architecture
```
/root/Bricscoin/
├── backend/
│   ├── server.py          # FastAPI API + blockchain logic
│   ├── stratum_server.py  # Stratum v1 per ASIC miners
│   └── .env
├── frontend/
│   └── src/pages/
│       ├── Mining.jsx     # Stats mining con hashrate reale
│       ├── Wallet.jsx     # Web wallet
│       └── ...
└── docker-compose.yml
```

## What's Been Implemented

### 2026-01-31
- ✅ **Real Hashrate Tracking**: Hashrate calcolato dalle shares invece che dai tempi blocco
  - Nuova collezione MongoDB `miner_shares`
  - Campo API `hashrate_from_shares` in `/api/network/stats`
  - UI mostra hashrate reale (~8-12 TH/s vs vecchio 151 MH/s)
- ✅ **Difficulty Clamping**: Ogni intervallo blocco limitato a max 10 min nel calcolo adjustment
- ✅ **HTTPS**: Abilitato su bricscoin26.org via Nginx + Certbot
- ✅ **Share Difficulty**: Default 512, accetta suggerimenti miner

### Previous
- ✅ Stratum server v5.2 Bitcoin-compatible
- ✅ Personalized jobs per miner (reward address corretto)
- ✅ Web wallet con generazione seed phrase
- ✅ Block explorer
- ✅ Desktop wallet downloads

## Prioritized Backlog

### P0 - Critical
- (none currently)

### P1 - High Priority  
- [ ] Server-side wallet backup (encrypted in DB)
- [ ] Warning "SAVE SEED PHRASE" on wallet creation
- [ ] Monitor difficulty adjustment at block 300

### P2 - Medium Priority
- [ ] Active miners display improvements
- [ ] Explorer block count consistency

### P3 - Future
- [ ] Mobile wallet iOS/Android
- [ ] Exchange listings
- [ ] Community mining pools page

## Technical Notes

### Hashrate Calculation Formula
```python
# Real hashrate from shares (last 5 minutes)
hashrate = (total_shares * avg_share_difficulty * 2^32) / time_window_seconds
```

### Difficulty Adjustment with Clamping
```python
# Each block interval clamped to max TARGET_BLOCK_TIME (600s)
actual_time = sum(min(block_time, 600) for each interval)
ratio = expected_time / actual_time
new_difficulty = current_difficulty * ratio  # capped at 0.25x to 4x
```

### Key Endpoints
- `GET /api/network/stats` - Network stats with `hashrate_from_shares`
- `GET /api/blocks` - Block list
- `POST /api/transactions/send` - Send signed transaction
- Stratum: `stratum+tcp://stratum.bricscoin26.org:3333`

### Database Collections
- `blocks` - Blockchain blocks
- `transactions` - All transactions
- `miner_shares` - Share submissions (cleaned hourly)
- `miners` - Connected miners info

## Server Info
- Hetzner VPS: 5.161.254.163
- Domain: bricscoin26.org
- Git: https://codeberg.org/Bricscoin_26/Bricscoin
