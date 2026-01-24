# 🪙 BricsCoin - Decentralized SHA256 Blockchain

[![GitHub](https://img.shields.io/badge/GitHub-Bricscoin2026-blue)](https://github.com/Bricscoin2026/Bricscoin)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A Bitcoin-like cryptocurrency with SHA256 Proof-of-Work. **Mine with ASIC hardware (Bitaxe, NerdMiner, Antminer) or browser!**

## 🌟 Features

- **SHA256 Proof-of-Work** - Compatible with Bitcoin ASIC miners
- **Stratum Protocol** - Works with Bitaxe, NerdMiner, Antminer, etc.
- **21 Million Max Supply** - Deflationary like Bitcoin
- **Halving Every 210,000 Blocks** - Decreasing rewards
- **Browser Mining** - Mine directly from web interface
- **P2P Network** - Decentralized node synchronization

## ⛏️ Mining with ASIC Hardware

### Supported Miners
- ✅ **Bitaxe** (all versions)
- ✅ **NerdMiner**
- ✅ **Antminer** (S9, S19, etc.)
- ✅ **Whatsminer**
- ✅ **Any SHA256 ASIC miner**

### Stratum Connection
```
Pool URL: stratum+tcp://5.161.254.163:3333
Worker: YOUR_BRICS_ADDRESS.worker1
Password: x
```

### Bitaxe Configuration Example
```
Stratum URL: 5.161.254.163
Port: 3333
Username: BRICSa8c685d6331a60690cda1f585f3e459eead81...
Password: x
```

## 🚀 Quick Start (Hetzner/VPS)

### 1. Server Requirements
- Ubuntu 22.04 LTS
- 2+ CPU cores
- 4GB+ RAM
- Docker & Docker Compose

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 3. Clone & Start
```bash
git clone https://github.com/Bricscoin2026/Bricscoin.git
cd Bricscoin

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Verify Services
```bash
# Check all containers are running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. Configure Firewall
```bash
# Open required ports
sudo ufw allow 80/tcp    # Web UI
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3333/tcp  # Stratum mining
sudo ufw allow 8001/tcp  # API
```

## 🌐 Access Points

| Service | Port | URL |
|---------|------|-----|
| Web UI | 3000 | http://YOUR_IP:3000 |
| API | 8001 | http://YOUR_IP:8001/api |
| Stratum | 3333 | stratum+tcp://YOUR_IP:3333 |

## 📊 API Endpoints

### Mining
```bash
# Get mining template (for custom miners)
curl http://YOUR_IP:8001/api/mining/template

# Submit mined block
curl -X POST http://YOUR_IP:8001/api/mining/submit \
  -H "Content-Type: application/json" \
  -d '{"block_data":"...", "nonce":12345, "hash":"0000...", "miner_address":"BRICS..."}'
```

### Wallet
```bash
# Create wallet
curl -X POST http://YOUR_IP:8001/api/wallet/create

# Check balance
curl http://YOUR_IP:8001/api/wallet/BRICS.../balance
```

### Network
```bash
# Network stats
curl http://YOUR_IP:8001/api/network/stats

# Node info
curl http://YOUR_IP:8001/api/p2p/node/info
```

## 🔧 Configuration

### Environment Variables
Create `.env` file in project root:

```env
# Node Configuration
NODE_ID=mainnet-node-1
NODE_URL=http://your-domain.com:8001
SEED_NODES=

# Database
MONGO_URL=mongodb://mongo:27017
DB_NAME=bricscoin

# Stratum
STRATUM_PORT=3333
STRATUM_HOST=0.0.0.0

# Frontend
REACT_APP_BACKEND_URL=http://your-domain.com:8001
```

## 📈 Technical Specifications

| Parameter | Value |
|-----------|-------|
| Algorithm | SHA256 (ASIC compatible) |
| Max Supply | 21,000,000 BRICS |
| Block Time | ~10 minutes |
| Initial Reward | 50 BRICS |
| Halving | Every 210,000 blocks |
| Difficulty Adjustment | Every 2,016 blocks |
| Signature | ECDSA secp256k1 |

## 🛠️ Development

### Local Development
```bash
# Backend
cd backend
pip install -r requirements.txt
python server.py

# Stratum Server
python stratum_server.py

# Frontend
cd frontend
yarn install
yarn start
```

### Run Tests
```bash
# API tests
curl http://localhost:8001/api/network/stats

# Stratum test (using netcat)
echo '{"id":1,"method":"mining.subscribe","params":[]}' | nc localhost 3333
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📜 License

MIT License - See [LICENSE](LICENSE) file

---

## 🙋 Support

- **GitHub Issues**: [Report bugs](https://github.com/Bricscoin2026/Bricscoin/issues)
- **Telegram**: Coming soon
- **Discord**: Coming soon

---

**Made with ❤️ by [Bricscoin2026](https://github.com/Bricscoin2026)**

⛏️ **Happy Mining!** 🪙
