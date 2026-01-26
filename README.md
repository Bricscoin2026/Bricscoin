# BricsCoin

A decentralized cryptocurrency powered by SHA256 Proof-of-Work.

## Features

- **Proof of Work**: SHA256 mining algorithm (Bitcoin-compatible)
- **Hardware Mining**: Compatible with Bitaxe, NerdMiner and other ASIC miners via Stratum protocol
- **Web Wallet**: Create, import, and manage wallets from your browser
- **Desktop Wallet**: BricsCoin Core - Electron-based wallet application
- **Block Explorer**: View blocks, transactions, and network statistics
- **Security**: Client-side transaction signing, rate limiting, CORS protection

## Technical Specifications

| Parameter | Value |
|-----------|-------|
| Algorithm | SHA256 |
| Max Supply | 21,000,000 BRICS |
| Block Reward | 50 BRICS (halving every 210,000 blocks) |
| Block Time | ~10 minutes |
| Premine | 1,000,000 BRICS |
| Transaction Fees | Free |

## Project Structure

```
bricscoin/
├── backend/           # FastAPI backend server
│   ├── server.py      # Main API server
│   └── stratum_server.py  # Mining pool server
├── frontend/          # React web application
├── bricscoin-core/    # Electron desktop wallet
└── docker-compose.yml # Docker deployment
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- Python 3.11+ (for development)
- MongoDB

### Using Docker

```bash
# Clone the repository
git clone https://github.com/bricscoin26/Bricscoin26.git
cd Bricscoin26

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all services
docker-compose up -d
```

### Manual Setup

#### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
uvicorn server:app --host 0.0.0.0 --port 8001
```

#### Frontend
```bash
cd frontend
yarn install
cp .env.example .env
# Edit .env with your backend URL
yarn start
```

#### Stratum Server (Mining)
```bash
cd backend
python stratum_server.py
```

## Mining

Connect your ASIC miner (Bitaxe, NerdMiner, etc.) to the Stratum server:

- **Pool URL**: `stratum+tcp://bricscoin26.org:3333`
- **Username**: Your BRICS wallet address
- **Password**: `x` (or any value)

### Example Configuration (Bitaxe)

```
Stratum URL: bricscoin26.org
Port: 3333
Username: BRICSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Password: x
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/network/stats` | GET | Network statistics |
| `/api/blocks` | GET | List blocks |
| `/api/transactions` | GET | List transactions |
| `/api/transactions/secure` | POST | Create secure transaction |
| `/api/wallet/create` | POST | Create new wallet |
| `/api/wallet/{address}/balance` | GET | Get wallet balance |
| `/api/address/{address}` | GET | Get address info |

## Security

- **Client-side signing**: Private keys never leave your device
- **Rate limiting**: Protection against spam and DDoS
- **Input validation**: All inputs are validated server-side
- **CORS protection**: Restricted to allowed origins

## BricsCoin Core (Desktop Wallet)

Download the desktop wallet from the [Downloads](https://bricscoin26.org/downloads) page or build from source:

```bash
cd bricscoin-core
yarn install
yarn start       # Development
yarn build       # Build for production
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Links

- **Website**: [bricscoin26.org](https://bricscoin26.org)
- **GitHub**: [github.com/bricscoin26/Bricscoin26](https://github.com/bricscoin26/Bricscoin26)

## Disclaimer

This is an experimental cryptocurrency project for educational purposes. Use at your own risk.
