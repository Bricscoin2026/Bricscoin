# BricsCoin - Product Requirements Document

## 🌐 Live Site
| Service | URL |
|----------|-----|
| **Website** | https://bricscoin26.org |
| **Run a Node** | https://bricscoin26.org/node |
| **Downloads** | https://bricscoin26.org/downloads |
| **Mining** | https://bricscoin26.org/mining |
| **API** | https://bricscoin26.org/api |
| **NerdMiner/Stratum** | 5.161.254.163:3333 (use IP!) |

## ✅ Completed Features

### Blockchain (Bitcoin-like)
- [x] Proof of Work SHA256
- [x] Max supply: 21,000,000 BRICS
- [x] **Premine: 1,000,000 BRICS** (included in supply calculation)
- [x] Halving every 210,000 blocks (~4 years)
- [x] Difficulty: 4 (adjustment every 2016 blocks)
- [x] Target: 10 min/block

### Dashboard
- [x] Shows circulating BRICS (premine + mined)
- [x] Shows remaining BRICS to mine
- [x] Auto-update every 10 seconds

### Wallet
- [x] 12-word seed phrase (BIP39)
- [x] Import from seed/private key
- [x] Send/Receive BRICS
- [x] QR code

### Mining
- [x] Browser mining ~27 KH/s
- [x] Web Worker (background)
- [x] Stratum server port 3333

### Downloads
- [x] BricsCoin Core v1.1 (Matrix UI) - 8.4 KB
- [x] Source Code ZIP - 680 KB

### Decentralization
- [x] "Run a Node" page with complete guide
- [x] docker-compose.node.yml for new nodes
- [x] Automatic P2P sync
- [x] Source code download

### BricsCoin Core Desktop Wallet
- [x] **v1.1 Released (Jan 25, 2026)**
  - Professional Matrix-style animated background
  - BricsCoin logo integration
  - Dark theme with green accent
  - Wallet creation/management
  - Mining functionality with Start/Stop buttons
  - Network stats display
  - Block explorer
  - Transaction sending

## 🔄 In Progress / Known Issues

### P1 - Medium Priority
- [ ] NerdMiner mining shows hashrate 0 (needs investigation)
- [ ] GitHub account suspended (blocks automated builds)
- [ ] Web miner block submission may fail (400 error)

### P2 - Lower Priority
- [ ] Configure stratum subdomain (stratum.bricscoin26.org)
- [ ] Native Mac/Windows installers (.dmg, .exe) - blocked by GitHub

## 📋 Future Tasks

### P1
- [ ] True P2P sync between Core wallets
- [ ] GitHub Actions for automated builds (when account restored)

### P2
- [ ] Landing page design
- [ ] Mobile app (PWA improvements)

## 🏗️ Architecture

```
/app/
├── backend/
│   ├── server.py             # Main FastAPI app
│   └── stratum_server.py     # Stratum for ASIC mining
├── frontend/
│   ├── public/
│   │   └── miningWorker.js   # Web worker for browser mining
│   └── src/
│       ├── App.js            # Main router
│       ├── pages/            # React pages (English-only)
│       └── components/
├── bricscoin-core/           # Desktop wallet (Electron)
│   ├── main.js               # Electron main process
│   ├── preload.js            # IPC bridge
│   ├── index.html            # UI with Matrix background
│   └── package.json          # electron, electron-store
```

## 🔐 Server Credentials
- **Hetzner Server IP:** 5.161.254.163
- **SSH User:** root
- **SSH Password:** Fabio@katia2021
- **Note:** Server has limited RAM (2GB), careful with Docker builds

## 📝 Changelog

### Jan 25, 2026
- **BricsCoin Core v1.1 Released**
  - Added professional Matrix-style animated canvas background
  - Integrated BricsCoin logo from main site
  - Improved dark theme with green accents
  - Added Stop Mining button functionality
  - Enhanced card styling and hover effects
  - Updated Downloads page to English
  - Deployed to https://bricscoin26.org/downloads

### Jan 24, 2026
- Fixed circulating supply calculation
- Made website English-only
- Fixed broken Mining and RunNode pages
- Added wallet balance to Send dialog
- Created initial BricsCoin Core wallet
