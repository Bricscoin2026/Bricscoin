# BRICScoin Full Node

**Blockchain Resilient Infrastructure for Cryptographic Security — Certified Open Innovation Network**

Run your own independent BRICScoin node to help decentralize the network.

## What does this node do?

1. **Downloads the entire blockchain** from a seed node and validates every block independently
2. **Stays in sync** — fetches new blocks every 30 seconds
3. **Validates independently** — verifies hash chains, difficulty, and block integrity
4. **Serves the blockchain** — provides REST API for wallets/explorers
5. **P2P networking** — discovers peers, propagates blocks and transactions
6. **Fork resolution** — follows the longest valid chain (Nakamoto consensus)

## Quick Start

### With Docker (recommended)

```bash
git clone https://codeberg.org/Bricscoin_26/Bricscoin.git
cd Bricscoin/bricscoin-node
docker compose up -d
```

The node will:
- Start MongoDB
- Connect to the seed node (bricscoin26.org)
- Download and validate the entire blockchain
- Start serving the API on port 8333

### Without Docker

```bash
pip install -r requirements.txt
export SEED_NODE=https://bricscoin26.org
export MONGO_URL=mongodb://localhost:27017/
python node.py
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SEED_NODE` | `https://bricscoin26.org` | Primary seed node URL |
| `SEED_NODES` | (empty) | Comma-separated additional seed nodes |
| `MONGO_URL` | `mongodb://localhost:27017/` | MongoDB connection string |
| `DB_NAME` | `bricscoin_node` | Database name |
| `NODE_PORT` | `8333` | API port |
| `NODE_ID` | (auto-generated) | Unique node identifier |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/node/info` | Node status, chain height, sync progress |
| `GET /api/blocks?page=1` | Browse blocks |
| `GET /api/blocks/{index}` | Get specific block |
| `GET /api/balance/{address}` | Check address balance |
| `GET /api/network/stats` | Network statistics |
| `POST /api/node/sync` | Trigger manual sync |
| `POST /api/node/validate` | Validate entire local chain |
| `GET /api/p2p/chain/info` | Chain info for P2P |
| `GET /api/p2p/chain/blocks` | Blocks for P2P sync |
| `GET /api/p2p/peers` | Known peers |

## Verify Your Node

After sync, validate the entire chain:

```bash
curl http://localhost:8333/api/node/validate
```

Expected: `{"chain_height": XXXX, "valid": true, "errors": [], "total_errors": 0}`

## License

MIT
