[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Codeberg Repository](https://img.shields.io/badge/Codeberg-Bricscoin_26-blue?logo=codeberg)](https://codeberg.org/Bricscoin_26/Bricscoin)
[![Website](https://img.shields.io/badge/Website-bricscoin26.org-green)](https://bricscoin26.org)

# BricsCoin

**BricsCoin** is a decentralized cryptocurrency powered by **SHA-256 Proof-of-Work**.

It features an **independent blockchain implementation** — not a fork of Bitcoin or any other chain.

The project is fully **open-source**, experimental, and designed strictly for **educational and technical purposes**.

---

## 🛡️ Security Audit Status
**PASSED** – February 2026

| Category                  | Status         | Tests   |
|---------------------------|----------------|---------|
| Input Validation          | ✅ PASSED      | 8/8     |
| Signature Verification    | ✅ PASSED      | 2/2     |
| Replay Attack Prevention  | ✅ PASSED      | 2/2     |
| Rate Limiting             | ✅ CONFIGURED  | —       |
| **TOTAL**                 | **✅ PASSED**  | **27/27** |

---

## Security Features

- Client-side transaction signing – Private keys **never** leave your device
- ECDSA secp256k1 cryptography (same curve as Bitcoin)
- Strict input validation with Pydantic
- Rate limiting: 5 requests/min per wallet, 10 requests/min for transactions (anti-spam/DDoS)
- CORS restricted to allowed origins
- Security headers: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Content-Security-Policy
- Replay attack protection via timestamp and signature validation
- Automatic IP blacklisting after 10 failed attempts

---

## Features

- **Proof-of-Work**: SHA-256 (100% compatible with Bitcoin mining ecosystem)
- **Hardware Mining**: Bitaxe, NerdMiner, Antminer S9/S19/S21, Whatsminer M50/M60 etc. via Stratum protocol
- **Web Wallet**: Browser-based (Progressive Web App compatible) – create, import, manage wallets
- **Desktop Wallet**: BricsCoin Core – Electron-based full-node wallet (Windows, macOS, Linux)
- **Block Explorer**: Real-time blocks, transactions, network statistics
- **REST API**: Endpoints for stats, balances, transaction creation & broadcasting

---

## Technical Specifications

| Parameter              | Value                                          |
|------------------------|------------------------------------------------|
| Algorithm              | SHA-256                                        |
| Maximum Supply         | 21,000,000 BRICS                               |
| Initial Block Reward   | 50 BRICS                                       |
| Halving Interval       | Every 210,000 blocks                           |
| Target Block Time      | ~10 minutes                                    |
| Premine                | 1,000,000 BRICS (~4.76%, transparent for development & marketing) |
| Genesis / Premine Address | `BRICS5e1523fdc7608d6a0ecb82b789358fb06e0b0f97` (coinbase reward + premine allocation) |
| Transaction Fee        | 0.000005 BRICS (burned – deflationary mechanism) |

---

## Network Status

The BricsCoin network is **very early-stage** (~700 blocks as of February 2026), with approximately 10–15 active full nodes and limited hashrate.

> ⚠️ **Important notice**:  
> Decentralization is **still in progress**.  
> Mining power and nodes are currently concentrated among early contributors.  
> The blockchain is fully operational and continuously producing blocks, but remains vulnerable to reorganization at this size.  
> Organic growth through independent miners and node operators is essential.  
>  
> Premine / Genesis wallet: `BRICS5e1523fdc7608d6a0ecb82b789358fb06e0b0f97` — fully transparent allocation.

Live statistics: [https://bricscoin26.org/explorer](https://bricscoin26.org/explorer)

## Project Structure

| Directory / File              | Description                                      |
|-------------------------------|--------------------------------------------------|
| `bricscoin/`                  | Root del progetto                                |
| `backend/`                    | FastAPI backend + API server                     |
| `backend/server.py`           | Main API server                                  |
| `backend/stratum_server.py`   | Stratum mining pool server                       |
| `frontend/`                   | React web wallet (PWA)                           |
| `bricscoin-core/`             | Electron desktop wallet                          |
| `tests/`                      | Security & integration tests                     |
| `docker-compose.yml`          | Docker deployment configuration                  |


## Quick Start
Prerequisites

- Docker and Docker Compose (recommended)
- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend)
- MongoDB

---

## Using Docker (Recommended)

- git clone https://codeberg.org/Bricscoin_26/Bricscoin.git
cd Bricscoin

Copy and edit environment files

cp backend/.env.example backend/.env

cp frontend/.env.example frontend/.env

# Edit .env files as needed (e.g., backend URL, MongoDB URI)

docker compose up -d

Note: Use docker compose (with space) on modern Docker versions.

---

## Manual Setup 

- Backend

cd backend
pip install -r requirements.txt
cp .env.example .env
- Edit .env as needed
uvicorn server:app --host 0.0.0.0 --port 8001

- Frontend

cd frontend
yarn install
cp .env.example .env
Edit .env (set REACT_APP_BACKEND_URL)
yarn start

## Stratum Server (Mining Pool)

cd backend
python stratum_server.py

## Mining Setup 
 Connect your hardware to the public pool:
- Stratum URL: stratum+tcp://bricscoin26.org:3333
- Username: YOUR_BRICS_WALLET_ADDRESS
- Password: x (or any value)

## Example Bitaxe / NerdMiner configuration:
- Stratum URL: bricscoin26.org
- Port: 3333
- Username: BRICSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- Password: x

Running your own full node + local Stratum pool is strongly encouraged for better decentralization.

## API Endpoints (Examples)

| Endpoint                              | Method | Description                          |
|---------------------------------------|--------|--------------------------------------|
| `/api/network/stats`                  | GET    | Network hashrate, difficulty, nodes… |
| `/api/blocks`                         | GET    | List recent blocks                   |
| `/api/transactions`                   | GET    | Recent transactions                  |
| `/api/transactions/secure`            | POST   | Broadcast signed transaction         |
| `/api/wallet/create`                  | POST   | Create new wallet                    |
| `/api/wallet/{address}/balance`       | GET    | Get wallet balance                   |
| `/api/address/{address}`              | GET    | Address info (balance + tx history)  |

## Running Security Tests

cd backend
pip install pytest ecdsa
REACT_APP_BACKEND_URL=https://bricscoin26.org pytest tests/test_security_audit.py -v

## BricsCoin Core (Desktop Wallet)

- Download pre-built binaries: https://bricscoin26.org/downloads
- Build from source:

cd bricscoin-core
yarn install
yarn start       # Development mode
yarn build       # Production build

## Contributing

Contributions are very welcome!

- Bug fixes, node improvements, security enhancements, UI/UX, tests, documentation
- Submit issues and pull requests on Codeberg
- Join the discussion: Telegram

## License
MIT License
© 2026 Jabo86
See the LICENSE file for full details.

## Links 
 - Website & Explorer: https://bricscoin26.org
 - Block Explorer: https://bricscoin26.org/explorer
 - Source Code: https://codeberg.org/Bricscoin_26/Bricscoin
 - Telegram Community: https://t.me/Brics_Coin26
 - Desktop Wallet Downloads: https://bricscoin26.org/downloads

## Disclaimer
This is an experimental cryptocurrency project intended for educational and technical exploration only.

- No ICO, no pre-sale, no promises of financial value or returns
- All coins are issued exclusively through mining (fair launch with transparent premine)
- No affiliation of any kind with BRICS nations, governments, organizations or entities
- No central authority — the code is the sole source of truth
- Use at your own risk. Running nodes, mining and transacting carry technical, security and financial risks.
- No warranties expressed or implied. No official support provided.
