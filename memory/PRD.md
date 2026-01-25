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
- [x] BricsCoin Core v1.3 (Full Featured Wallet) - 11.5 KB
- [x] Source Code ZIP - 680 KB

### Decentralization
- [x] "Run a Node" page with complete guide
- [x] docker-compose.node.yml for new nodes
- [x] Automatic P2P sync
- [x] Source code download

### BricsCoin Core Desktop Wallet
- [x] **v1.3 Released (Jan 25, 2026)**
  - Professional Matrix-style animated background
  - BricsCoin logo integration
  - Dark theme with green accent
  - **Wallet management**: Create, Import (seed phrase), Delete
  - **Send**: Select wallet, see balance, send BRICS
  - **Receive**: QR code, copy address, transaction history
  - Mining functionality with Start/Stop buttons
  - Mining particle animation (particles rise when mining)
  - Silent mining (only shows when block found)
  - Network stats display
  - Block explorer

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
- **BricsCoin Core v1.3 Released**
  - Full wallet management: Create, Import (12-word seed), Delete
  - Send tab with balance display
  - Receive tab with QR code and transaction history
  - Professional Matrix-style animated canvas background
  - Mining particle animation
  - Silent mining mode
  - Copy to clipboard functionality
- **Website Mining Page Updated**
  - Detailed Stratum configuration box
  - NerdMiner setup guide
  - Bitaxe setup guide
  - Important notes about IP vs domain
  - Deployed to https://bricscoin26.org/mining

### Jan 24, 2026
- Fixed circulating supply calculation
- Made website English-only
- Fixed broken Mining and RunNode pages
- Added wallet balance to Send dialog
- Created initial BricsCoin Core wallet
