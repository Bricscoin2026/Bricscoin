# BRICScoin Full Node v2.0

**Blockchain Resilient Infrastructure for Cryptographic Security — Certified Open Innovation Network**

Run your own independent BRICScoin node to help decentralize the network.

## What does this node do?

1. **Syncs the blockchain** — downloads and validates every block from the network
2. **P2P networking** — discovers peers, registers with other nodes, propagates blocks/transactions
3. **Validates independently** — verifies PoW, chain links, and block integrity
4. **Serves the blockchain** — provides REST API for wallets and block explorers
5. **Fork resolution** — follows the longest valid chain (Nakamoto consensus)
6. **Auto-healing** — removes stale peers, re-syncs on forks, recovers from downtime

## Quick Start

### With Docker (recommended)

```bash
git clone https://codeberg.org/Bricscoin_26/Bricscoin.git
cd Bricscoin/bricscoin-node
cp .env.example .env
# Edit .env: set NODE_URL to your public URL (e.g. https://my-node.example.com)
docker compose up -d
```

### Without Docker

```bash
pip install -r requirements.txt
export SEED_NODE=https://bricscoin26.org
export MONGO_URL=mongodb://localhost:27017/
export NODE_URL=https://my-node.example.com  # Your public URL
python node.py
```

## How P2P Works

```
                    +-------------------+
                    |  bricscoin26.org  |  <-- Seed Node
                    |   (main server)   |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
        +-----+-----+  +----+------+  +----+------+
        |  Node A   |  |  Node B   |  |  Node C   |
        | (Europe)  |  |  (Asia)   |  | (America) |
        +-----------+  +-----------+  +-----------+
```

1. Your node starts and connects to the **seed node** (bricscoin26.org)
2. It downloads and validates the entire blockchain
3. It **registers** with the seed node (so others can find you)
4. Every 2 minutes, it **discovers** new peers from the network
5. New blocks are **propagated** to all connected peers in real-time
6. If a peer goes offline, it's automatically **removed** after 10 minutes

### NODE_URL (important!)

For your node to participate in P2P, set `NODE_URL` to your public URL:
- This is the URL other nodes will use to reach your API
- Must be accessible from the internet (port 8333 by default)
- Example: `NODE_URL=https://my-node.example.com`
- If not set, the node still syncs but won't be discoverable by others

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_URL` | (empty) | **Your public URL** — required for P2P |
| `SEED_NODE` | `https://bricscoin26.org` | Primary seed node |
| `SEED_NODES` | (empty) | Additional seed nodes (comma-separated) |
| `MONGO_URL` | `mongodb://localhost:27017/` | MongoDB connection |
| `DB_NAME` | `bricscoin_node` | Database name |
| `NODE_PORT` | `8333` | API port |
| `NODE_ID` | (auto-generated) | Unique node identifier |

## API Endpoints

### Node Management
| Endpoint | Description |
|----------|-------------|
| `GET /api/node/info` | Node status, chain height, peers, sync progress |
| `POST /api/node/sync` | Trigger manual blockchain sync |
| `POST /api/node/validate` | Validate entire local chain |

### P2P Network
| Endpoint | Description |
|----------|-------------|
| `POST /api/p2p/register` | Register a peer node |
| `GET /api/p2p/peers` | List all known peers |
| `GET /api/p2p/chain/info` | Chain info for P2P sync |
| `GET /api/p2p/chain/blocks` | Blocks for P2P sync |
| `POST /api/p2p/broadcast/block` | Receive broadcasted block |
| `POST /api/p2p/broadcast/tx` | Receive broadcasted transaction |

### Block Explorer
| Endpoint | Description |
|----------|-------------|
| `GET /api/blocks?page=1` | Browse blocks (paginated) |
| `GET /api/blocks/{index}` | Get specific block |
| `GET /api/balance/{address}` | Check address balance |
| `GET /api/network/stats` | Network statistics |

## Verify Your Node

```bash
# Check node status
curl http://localhost:8333/api/node/info

# Validate the entire chain
curl -X POST http://localhost:8333/api/node/validate

# Check peers
curl http://localhost:8333/api/p2p/peers
```

## Mining

The node includes a Stratum mining server (`stratum_server.py`). To enable mining on your node, run it alongside `node.py`:

```bash
python stratum_server.py &
python node.py
```

## License

MIT
