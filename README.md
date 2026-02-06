**Note**: This is a mirror of the main repository at https://codeberg.org/Bricscoin_26/Bricscoin.  
Primary development, issues, and pull requests happen on Codeberg.  
Thank you for your support!

# BricsCoin

A decentralized cryptocurrency powered by **SHA256 Proof-of-Work**.

🛡️ **Security Audit Status**  
✅ **SECURITY AUDIT PASSED** – February 2026  

... (rest of your README continues here)
# BricsCoin

A decentralized cryptocurrency powered by **SHA256 Proof-of-Work**.

🛡️ **Security Audit Status**  
✅ **SECURITY AUDIT PASSED** – February 2026  

| Category                  | Status     | Tests    |
|---------------------------|------------|----------|
| Input Validation          | ✅ PASSED  | 8/8     |
| Signature Verification    | ✅ PASSED  | 2/2     |
| Replay Attack Prevention  | ✅ PASSED  | 2/2     |
| Rate Limiting             | ✅ CONFIGURED | -     |
| **TOTAL**                 | **✅ PASSED** | **27/27** |

### Security Features
- ✅ Client-side transaction signing – Private keys never leave your device
- ✅ ECDSA secp256k1 – Same cryptography as Bitcoin
- ✅ Input validation – All inputs validated with Pydantic
- ✅ Rate limiting – Protection against spam and DDoS (5 req/min wallet, 10 req/min transactions)
- ✅ CORS protection – Restricted to allowed origins
- ✅ Security headers – XSS, clickjacking protection (X-Content-Type-Options, X-Frame-Options, HSTS, CSP)
- ✅ Replay attack prevention – Timestamp and signature validation
- ✅ IP blacklisting – Automatic blocking after 10 failed attempts

### Features
- **Proof of Work**: SHA256 mining algorithm (fully Bitcoin-compatible)
- **Hardware Mining**: Compatible with Bitaxe, NerdMiner, S9/S19/S21, M50 etc. via Stratum protocol
- **Web Wallet**: Create, import, manage wallets directly in browser (PWA support)
- **Desktop Wallet**: BricsCoin Core – Electron-based full node wallet (Windows/macOS/Linux)
- **Block Explorer**: View blocks, transactions, network statistics
- **API**: Full endpoints for stats, balances, transaction creation

### Technical Specifications

| Parameter          | Value                          |
|--------------------|--------------------------------|
| Algorithm          | SHA256                         |
| Max Supply         | 21,000,000 BRICS               |
| Initial Block Reward | 50 BRICS                     |
| Halving            | Every 210,000 blocks           |
| Block Time         | ~10 minutes                    |
| Premine            | 1,000,000 BRICS (transparent, for dev/marketing) |
| Transaction Fees   | 0.000005 BRICS (burned – deflationary) |

### Project Structure

bricscoin/
├── backend/           # FastAPI backend server
│   ├── server.py      # Main API server
│   └── stratum_server.py  # Mining pool server
├── frontend/          # React web application (PWA)
├── bricscoin-core/    # Electron desktop wallet
└── docker-compose.yml # Docker deployment

### Quick Start

#### Prerequisites
- Docker and Docker Compose (recommended)
- Node.js 18+ (frontend/dev)
- Python 3.11+ (backend)
- MongoDB

#### Using Docker (Recommended)
```bash
git clone https://codeberg.org/Bricscoin_26/Bricscoin.git
cd Bricscoin
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files as needed (e.g., backend URL, MongoDB URI)
docker-compose up -d

Manual SetupBackend  bash

cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env
uvicorn server:app --host 0.0.0.0 --port 8001

Frontend  bash

cd frontend
yarn install
cp .env.example .env
# Edit .env (REACT_APP_BACKEND_URL)
yarn start

Stratum Server (Mining Pool)  bash

cd backend
python stratum_server.py

MiningConnect your ASIC miner (Bitaxe, NerdMiner, etc.):Pool URL: stratum+tcp://bricscoin26.org:3333  
Username: Your BRICS wallet address  
Password: x (or any value)

Example Bitaxe Config:Stratum URL: bricscoin26.org  
Port: 3333  
Username: BRICSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  
Password: x

API Endpoints (examples)Endpoint
Method
Description
/api/network/stats
GET
Network statistics
/api/blocks
GET
List blocks
/api/transactions
GET
List transactions
/api/transactions/secure
POST
Create secure transaction
/api/wallet/create
POST
Create new wallet
/api/wallet/{address}/balance
GET
Get wallet balance
/api/address/{address}
GET
Get address info

Running Security Testsbash

cd backend
pip install pytest ecdsa
REACT_APP_BACKEND_URL=https://bricscoin26.org pytest tests/test_security_audit.py -v

BricsCoin Core (Desktop Wallet)Download pre-built binaries from https://bricscoin26.org/downloads or build from source:bash

cd bricscoin-core
yarn install
yarn start       # Development mode
yarn build       # Build for production

ContributingContributions are welcome! Feel free to submit Pull Requests on Codeberg.LicenseThis project is open source under the MIT License.

MIT License

Copyright © 2026 Jabo86

Permission is hereby granted, free of charge, to any person obtaining a copy...
(see full LICENSE file for complete text)

LinksWebsite: https://bricscoin26.org  
Codeberg Repository: https://codeberg.org/Bricscoin_26/Bricscoin  
Explorer: https://bricscoin26.org/explorer  
Telegram: https://t.me/Brics_Coin26

DisclaimerThis is an experimental cryptocurrency project for educational and technical purposes only.  No pre-sale, ICO, or promises of value.  
Issued solely through mining (fair launch with transparent premine).  
No central entity, no affiliation with any organization/state/BRICS.  
The code is the sole authority. Use at your own risk. No warranties, no support.
Mining/trading involves risks – proceed voluntarily.

