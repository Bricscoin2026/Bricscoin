# BricsCoin - Product Requirements Document

## Original Problem Statement
Creare una criptovaluta simile a Bitcoin chiamata "BricsCoin" con:
- Blockchain Proof of Work (PoW) con SHA256
- Supply massima di 21,000,000 monete
- Halving ogni 4 anni (210,000 blocchi)
- Rete decentralizzata P2P
- Supporto mining ASIC (Bitaxe, NerdMiner)
- Wallet multipiattaforma

## Technical Specifications

### Blockchain Parameters (Bitcoin-like)
| Parameter | Value |
|-----------|-------|
| Max Supply | 21,000,000 BRICS |
| Initial Block Reward | 50 BRICS |
| Halving Interval | 210,000 blocks (~4 years) |
| Difficulty Adjustment | Every 2016 blocks |
| Target Block Time | 600 seconds (10 minutes) |
| Hash Algorithm | SHA256 |
| Initial Difficulty | 4 leading zeros |

### Architecture
```
/app/
├── backend/
│   ├── server.py          # FastAPI REST API + P2P
│   └── stratum_server.py  # Stratum mining protocol
├── frontend/              # React web app
├── wallet-app/            # Electron desktop wallet
├── docs/                  # Multilingual documentation
└── docker-compose.prod.yml
```

### Server Endpoints (Hetzner: 5.161.254.163)
- **Frontend**: http://5.161.254.163:3000
- **API**: http://5.161.254.163:8001/api
- **Stratum**: stratum+tcp://5.161.254.163:3333

## Implementation Status

### ✅ Completed
- [x] Core blockchain with PoW SHA256
- [x] FastAPI backend with full REST API
- [x] React frontend with Matrix-style background
- [x] Web wallet (create, send, receive)
- [x] Stratum server for ASIC mining
- [x] P2P network with seed node
- [x] Desktop wallet (Electron)
- [x] Downloads page for wallet binaries
- [x] BricsCoin 2026 logo
- [x] Deployed to Hetzner server

### 🔴 Blocked
- [ ] GitHub repository access (account suspended)
- [ ] Automated wallet builds via GitHub Actions
- [ ] Mac .dmg build (needs macOS runner)
- [ ] Windows .exe installer (needs Windows runner)

### 🟡 In Progress / Pending
- [ ] Full multilingual support
- [ ] Import existing wallet feature
- [ ] Real NerdMiner testing

### 📋 Backlog
- [ ] Landing page
- [ ] Mobile apps (iOS/Android)
- [ ] Block explorer improvements
- [ ] Transaction fees

## Mining Configuration

### For NerdMiner/Bitaxe:
```
Pool: stratum+tcp://5.161.254.163:3333
User: YOUR_BRICS_ADDRESS.worker_name
Pass: x
```

## Changelog
- **2026-01-24**: Matrix background, Downloads page, logo update
- **2026-01-24**: Stratum server deployed
- **2026-01-23**: Initial deployment to Hetzner
- **2026-01-22**: Core blockchain implementation

## Known Issues
1. GitHub account (Bricscoin2026) is suspended
2. Wallet builds are manual workarounds
3. Difficulty 4 may be too high for solo NerdMiner
