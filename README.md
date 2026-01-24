# 🪙 BricsCoin - Decentralized SHA256 Blockchain

A Bitcoin-like cryptocurrency with SHA256 Proof-of-Work consensus. Anyone in the world can run a node and mine BRICS coins!

## 🌟 Features

- **SHA256 Proof-of-Work** - Same algorithm as Bitcoin
- **21 Million Max Supply** - Deflationary by design
- **Halving Every 210,000 Blocks** - Decreasing rewards like Bitcoin
- **Dynamic Difficulty** - Adjusts every 2,016 blocks
- **P2P Network** - Decentralized node synchronization
- **Browser Mining** - Mine directly from the web interface
- **ECDSA Signatures** - Secure transactions with secp256k1

## 🚀 Quick Start

### Option 1: Run Your Own Node (Recommended)

```bash
# Clone or download the project
git clone <your-repo-url>
cd bricscoin

# Start your node
docker-compose up -d

# Your node is now running at http://localhost:8001
```

### Option 2: Run with Full Frontend

```bash
# Start node + web interface
docker-compose --profile with-frontend up -d

# Web UI: http://localhost:3000
# API: http://localhost:8001
```

## 🌐 Join the Network

To participate in the BricsCoin network, configure your node to connect to seed nodes:

```bash
# Set environment variables before starting
export NODE_URL=http://your-public-ip:8001
export SEED_NODES=https://bricscoin-sha256.preview.emergentagent.com

docker-compose up -d
```

## ⛏️ Mining

### Browser Mining
1. Open the web interface
2. Go to "Mining" page
3. Enter your wallet address
4. Click "Start Mining"

### API Mining (More Efficient)
```bash
# Get mining template
curl http://localhost:8001/api/mining/template

# Submit mined block
curl -X POST http://localhost:8001/api/mining/submit \
  -H "Content-Type: application/json" \
  -d '{
    "block_data": "<block_data_from_template>",
    "nonce": 12345,
    "hash": "<your_computed_hash>",
    "miner_address": "BRICSyouraddress..."
  }'
```

### Custom Miner Script (Python Example)
```python
import hashlib
import requests

API_URL = "http://localhost:8001/api"
MINER_ADDRESS = "BRICSyouraddress..."

def sha256(data):
    return hashlib.sha256(data.encode()).hexdigest()

def mine():
    # Get template
    template = requests.get(f"{API_URL}/mining/template").json()
    block_data = template['block_data']
    difficulty = template['difficulty']
    target = '0' * difficulty
    
    nonce = 0
    while True:
        test_hash = sha256(block_data + str(nonce))
        if test_hash.startswith(target):
            print(f"Found! Nonce: {nonce}, Hash: {test_hash}")
            
            # Submit block
            result = requests.post(f"{API_URL}/mining/submit", json={
                "block_data": block_data,
                "nonce": nonce,
                "hash": test_hash,
                "miner_address": MINER_ADDRESS
            })
            print(result.json())
            break
        nonce += 1
        if nonce % 100000 == 0:
            print(f"Tried {nonce} hashes...")

if __name__ == "__main__":
    mine()
```

## 📡 P2P Network API

### Register Your Node
```bash
curl -X POST http://seed-node:8001/api/p2p/register \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "mynode123",
    "url": "http://my-public-ip:8001",
    "version": "1.0.0"
  }'
```

### Get Connected Peers
```bash
curl http://localhost:8001/api/p2p/peers
```

### Get Node Info
```bash
curl http://localhost:8001/api/p2p/node/info
```

### Sync Blockchain
```bash
curl -X POST http://localhost:8001/api/p2p/sync
```

## 💼 Wallet Operations

### Create Wallet
```bash
curl -X POST http://localhost:8001/api/wallet/create \
  -H "Content-Type: application/json" \
  -d '{"name": "My Wallet"}'
```

### Check Balance
```bash
curl http://localhost:8001/api/wallet/BRICSyouraddress.../balance
```

### Send Transaction
```bash
curl -X POST http://localhost:8001/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "sender_private_key": "your_private_key_hex",
    "sender_address": "BRICSsenderaddress...",
    "recipient_address": "BRICSrecipientaddress...",
    "amount": 10.0
  }'
```

## 📊 Technical Specifications

| Parameter | Value |
|-----------|-------|
| Algorithm | SHA256 |
| Max Supply | 21,000,000 BRICS |
| Block Time Target | 10 minutes |
| Initial Reward | 50 BRICS |
| Halving Interval | 210,000 blocks |
| Difficulty Adjustment | Every 2,016 blocks |
| Signature | ECDSA (secp256k1) |

## 🛠️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb://mongo:27017` |
| `DB_NAME` | Database name | `bricscoin` |
| `NODE_ID` | Unique node identifier | Auto-generated |
| `NODE_URL` | Public URL of your node | Empty |
| `SEED_NODES` | Comma-separated seed node URLs | Main network |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |

## 🔗 API Endpoints

### Network
- `GET /api/network/stats` - Network statistics

### Blocks
- `GET /api/blocks` - List blocks
- `GET /api/blocks/{index}` - Get block by height
- `GET /api/blocks/hash/{hash}` - Get block by hash

### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/{id}` - Get transaction

### Mining
- `GET /api/mining/template` - Get mining template
- `POST /api/mining/submit` - Submit mined block

### Wallet
- `POST /api/wallet/create` - Create wallet
- `GET /api/wallet/{address}/balance` - Get balance
- `GET /api/wallet/{address}/qr` - Get QR code

### P2P
- `POST /api/p2p/register` - Register peer
- `GET /api/p2p/peers` - List peers
- `GET /api/p2p/node/info` - Node info
- `POST /api/p2p/sync` - Trigger sync

## 📜 License

MIT License - Feel free to use, modify, and distribute!

---

**Happy Mining! ⛏️🪙**
