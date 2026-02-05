# BricsCoin Node

Run your own BricsCoin node and help decentralize the network!

## Quick Start (Docker)

```bash
# Clone the repository
git clone https://codeberg.org/Bricscoin_26/Bricscoin.git
cd Bricscoin/bricscoin-node

# Start your node
docker compose up -d

# Check logs
docker compose logs -f
```

## Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 core | 2 cores |
| RAM | 1 GB | 2 GB |
| Storage | 10 GB | 20 GB |
| Bandwidth | 100 Mbps | 1 Gbps |
| OS | Linux (Ubuntu 22.04+) | Linux |

**Estimated Cost**: €4-10/month on Hetzner, DigitalOcean, Vultr, etc.

## Configuration

Edit `.env` file before starting:

```env
# Your node's unique ID (auto-generated if empty)
NODE_ID=

# Your node's public URL (required for other nodes to connect)
NODE_URL=https://your-domain.com

# Seed nodes to connect to (comma-separated)
SEED_NODES=https://bricscoin26.org

# MongoDB connection (local by default)
MONGO_URL=mongodb://bricscoin-db:27017
DB_NAME=bricscoin
```

## Installation Options

### Option 1: Docker (Recommended)

```bash
docker compose up -d
```

### Option 2: Manual Installation

```bash
# Install dependencies
apt update && apt install -y python3 python3-pip mongodb

# Install Python packages
pip3 install -r requirements.txt

# Start MongoDB
systemctl start mongodb

# Start the node
python3 server.py
```

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 8001 | HTTP API | REST API for blockchain |
| 3333 | Stratum | Mining pool (optional) |

## API Endpoints

Once running, your node exposes:

- `GET /api/network/stats` - Network statistics
- `GET /api/blocks` - List blocks
- `GET /api/blocks/{index}` - Get specific block
- `GET /api/transactions` - List transactions
- `POST /api/p2p/register` - Register with network
- `GET /api/p2p/peers` - List connected peers

## Sync Status

Check if your node is synced:

```bash
curl http://localhost:8001/api/network/stats
```

Compare `total_blocks` with the main network at https://bricscoin26.org/api/network/stats

## Firewall Configuration

```bash
# Allow API port
ufw allow 8001/tcp

# Allow Stratum (if running mining pool)
ufw allow 3333/tcp
```

## Running as a Mining Pool

To also run a Stratum mining server:

```bash
docker compose --profile with-stratum up -d
```

Miners can connect to: `stratum+tcp://your-domain.com:3333`

## Monitoring

View logs:
```bash
docker compose logs -f bricscoin-node
```

Check node status:
```bash
curl http://localhost:8001/api/p2p/peers
```

## Troubleshooting

### Node not syncing
```bash
# Restart with fresh sync
docker compose down
docker volume rm bricscoin-node_bricscoin-data
docker compose up -d
```

### Port already in use
```bash
# Check what's using the port
lsof -i :8001
```

### MongoDB connection failed
```bash
# Check MongoDB status
docker compose logs bricscoin-db
```

## Contributing

Help improve BricsCoin:
- Report bugs on [Codeberg](https://codeberg.org/Bricscoin_26/Bricscoin/issues)
- Submit pull requests
- Run a node!

## Links

- **Main Website**: https://bricscoin26.org
- **Codeberg**: https://codeberg.org/Bricscoin_26/Bricscoin
- **Twitter**: https://x.com/Bricscoin26

## License

MIT License - See [LICENSE](../LICENSE)
