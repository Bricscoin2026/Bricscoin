# ============================================================
# BRICScoin Full Node — Decentralized P2P Node
# ============================================================
# Blockchain Resilient Infrastructure for Cryptographic Security
# Certified Open Innovation Network
# ============================================================

import os
import json
import hashlib
import asyncio
import logging
import time
import random
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ==================== CONFIGURATION ====================
NODE_VERSION = "1.0.0"
CENTRAL_NODE = os.environ.get("SEED_NODE", "https://bricscoin26.org")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/")
DB_NAME = os.environ.get("DB_NAME", "bricscoin_node")
NODE_PORT = int(os.environ.get("NODE_PORT", "8333"))
NODE_HOST = os.environ.get("NODE_HOST", "0.0.0.0")
P2P_PORT = int(os.environ.get("P2P_PORT", "8334"))
NODE_ID = os.environ.get("NODE_ID", hashlib.sha256(str(time.time()).encode()).hexdigest()[:16])

# ==================== CONSENSUS CONSTANTS ====================
MAX_SUPPLY = 21_000_000
INITIAL_REWARD = 50
HALVING_INTERVAL = 210_000
TARGET_BLOCK_TIME = 600
INITIAL_DIFFICULTY = 1_000_000
TRANSACTION_FEE = 0.000005
MAX_TARGET = (2 ** 256) - 1  # Must match stratum's verify_share target

# ==================== LOGGING ====================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
log = logging.getLogger("bricscoin-node")

# ==================== DATABASE ====================
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# ==================== PEER MANAGEMENT ====================
peers: dict[str, dict] = {}  # url -> {last_seen, height, node_id}
sync_lock = asyncio.Lock()

# ==================== CONSENSUS FUNCTIONS ====================
def sha256_hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()

def calculate_block_hash(index, timestamp, transactions, proof, previous_hash, nonce):
    block_string = f"{index}{timestamp}{json.dumps(transactions, sort_keys=True)}{proof}{previous_hash}{nonce}"
    return sha256_hash(block_string)

def get_mining_reward(block_height: int) -> float:
    halvings = block_height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return INITIAL_REWARD / (2 ** halvings)

def check_difficulty(hash_value: str, difficulty: int) -> bool:
    target = MAX_TARGET // max(1, difficulty)
    hash_int = int(hash_value, 16)
    return hash_int <= target

def validate_block_standalone(block: dict, prev_block: Optional[dict] = None) -> tuple[bool, str]:
    """
    Validate a block independently.
    - Chain link: previous_hash matches prior block's hash
    - PoW: hash meets difficulty target
    - Timestamp: not too far in the future
    Returns (is_valid, error_message).
    """
    try:
        idx = block.get("index", -1)

        # 1. Verify hash meets difficulty (Proof-of-Work)
        diff = block.get("difficulty", INITIAL_DIFFICULTY)
        if idx > 0 and not check_difficulty(block["hash"], diff):
            return False, f"Block {idx}: hash does not meet difficulty {diff}"

        # 2. Verify chain link (except genesis)
        if idx > 0 and prev_block:
            if prev_block["hash"] != block["previous_hash"]:
                return False, f"Block {idx}: previous_hash mismatch"

        # 3. Verify sequential index
        if prev_block and block["index"] != prev_block["index"] + 1:
            return False, f"Block {idx}: non-sequential index (expected {prev_block['index'] + 1})"

        # 4. Verify timestamp is reasonable
        try:
            ts = datetime.fromisoformat(block["timestamp"].replace("Z", "+00:00"))
            if ts > datetime.now(timezone.utc) + timedelta(hours=2):
                return False, f"Block {idx}: timestamp too far in the future"
        except (ValueError, KeyError):
            pass

        return True, ""
    except Exception as e:
        return False, f"Block {block.get('index', '?')}: validation error: {e}"


# ==================== SYNC ENGINE ====================
class SyncEngine:
    def __init__(self):
        self.syncing = False
        self.sync_progress = 0
        self.sync_total = 0

    async def get_local_height(self) -> int:
        return await db.blocks.count_documents({})

    async def get_local_tip(self) -> Optional[dict]:
        tip = await db.blocks.find_one(sort=[("index", -1)], projection={"_id": 0})
        return tip

    async def bootstrap_from_seed(self, seed_url: str):
        """Download and validate the entire blockchain from a seed node."""
        async with sync_lock:
            if self.syncing:
                log.warning("Sync already in progress, skipping")
                return
            self.syncing = True

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Get peer chain info
                resp = await client.get(f"{seed_url}/api/p2p/chain/info")
                if resp.status_code != 200:
                    log.error(f"Cannot reach seed node {seed_url}: HTTP {resp.status_code}")
                    return
                peer_info = resp.json()
                peer_height = peer_info.get("height", 0)

                local_height = await self.get_local_height()
                if local_height >= peer_height:
                    log.info(f"Already synced (local={local_height}, peer={peer_height})")
                    return

                blocks_needed = peer_height - local_height
                self.sync_total = blocks_needed
                self.sync_progress = 0
                log.info(f"Syncing {blocks_needed} blocks from {seed_url} (local={local_height}, peer={peer_height})")

                batch_size = 500
                current = local_height
                prev_block = await self.get_local_tip()
                validated = 0
                rejected = 0

                while current < peer_height:
                    resp = await client.get(
                        f"{seed_url}/api/p2p/chain/blocks",
                        params={"from_height": current, "limit": batch_size},
                        timeout=120.0
                    )
                    if resp.status_code != 200:
                        log.error(f"Failed to fetch blocks from height {current}")
                        break

                    blocks = resp.json().get("blocks", [])
                    if not blocks:
                        break

                    for block in blocks:
                        # Skip if already have it
                        if await db.blocks.find_one({"index": block["index"]}):
                            prev_block = block
                            continue

                        # Validate independently
                        valid, err = validate_block_standalone(block, prev_block)
                        if valid:
                            block.pop("_id", None)
                            await db.blocks.insert_one(block)
                            # Also store transactions
                            for tx in block.get("transactions", []):
                                tx.pop("_id", None)
                                tx["block_index"] = block["index"]
                                tx["confirmed"] = True
                                await db.transactions.update_one(
                                    {"id": tx.get("id")},
                                    {"$set": tx},
                                    upsert=True
                                )
                            prev_block = block
                            validated += 1
                        else:
                            log.warning(f"REJECTED: {err}")
                            rejected += 1

                        self.sync_progress = validated

                        if validated > 0 and validated % 200 == 0:
                            log.info(f"Sync progress: {validated}/{blocks_needed} blocks validated")

                    current = blocks[-1]["index"] + 1 if blocks else current + batch_size

                log.info(f"Sync complete: {validated} blocks validated, {rejected} rejected. Chain height: {await self.get_local_height()}")
        except Exception as e:
            log.error(f"Sync error: {e}")
        finally:
            self.syncing = False

    async def sync_new_blocks(self, peer_url: str):
        """Periodic sync — only fetch new blocks since last known height."""
        if self.syncing:
            return
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(f"{peer_url}/api/p2p/chain/info")
                if resp.status_code != 200:
                    return
                peer_height = resp.json().get("height", 0)
                local_height = await self.get_local_height()

                if peer_height <= local_height:
                    return

                resp = await client.get(
                    f"{peer_url}/api/p2p/chain/blocks",
                    params={"from_height": local_height, "limit": 100}
                )
                if resp.status_code != 200:
                    return

                blocks = resp.json().get("blocks", [])
                prev_block = await self.get_local_tip()
                added = 0

                for block in blocks:
                    if await db.blocks.find_one({"index": block["index"]}):
                        prev_block = block
                        continue
                    valid, err = validate_block_standalone(block, prev_block)
                    if valid:
                        block.pop("_id", None)
                        await db.blocks.insert_one(block)
                        for tx in block.get("transactions", []):
                            tx.pop("_id", None)
                            tx["block_index"] = block["index"]
                            tx["confirmed"] = True
                            await db.transactions.update_one(
                                {"id": tx.get("id")}, {"$set": tx}, upsert=True
                            )
                        prev_block = block
                        added += 1
                    else:
                        log.warning(f"Rejected block during sync: {err}")

                if added > 0:
                    log.info(f"Synced {added} new blocks from {peer_url}. Height: {await self.get_local_height()}")
        except Exception as e:
            log.debug(f"Sync check error: {e}")


sync_engine = SyncEngine()

# ==================== P2P PROTOCOL ====================
class P2PNode:
    """Manages peer connections and block/transaction propagation."""

    def __init__(self):
        self.known_peers: dict[str, dict] = {}  # url -> info
        self.seed_nodes = [CENTRAL_NODE]
        # Add extra seeds from env
        extra = os.environ.get("SEED_NODES", "")
        if extra:
            self.seed_nodes += [s.strip() for s in extra.split(",") if s.strip()]

    async def discover_peers(self):
        """Ask seed nodes for their peer list."""
        for seed in self.seed_nodes:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(f"{seed}/api/p2p/peers")
                    if resp.status_code == 200:
                        data = resp.json()
                        for p in data.get("peers", []):
                            url = p.get("url", "")
                            if url and url not in self.known_peers:
                                self.known_peers[url] = {
                                    "last_seen": datetime.now(timezone.utc).isoformat(),
                                    "height": p.get("height", 0)
                                }
                        log.info(f"Discovered {len(self.known_peers)} peers from {seed}")
            except Exception:
                pass

    async def broadcast_block(self, block: dict):
        """Broadcast a new block to all known peers."""
        for peer_url in list(self.known_peers.keys()):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        f"{peer_url}/api/p2p/broadcast/block",
                        json={"block": block, "sender_id": NODE_ID}
                    )
            except Exception:
                pass

    async def broadcast_transaction(self, tx: dict):
        """Broadcast a new transaction to all known peers."""
        for peer_url in list(self.known_peers.keys()):
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(
                        f"{peer_url}/api/p2p/broadcast/tx",
                        json={"transaction": tx, "sender_id": NODE_ID}
                    )
            except Exception:
                pass


p2p_node = P2PNode()

# ==================== FORK RESOLUTION ====================
async def resolve_fork(peer_url: str):
    """
    Longest chain wins. If a peer has a longer valid chain,
    replace our chain from the fork point.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{peer_url}/api/p2p/chain/info")
            if resp.status_code != 200:
                return
            peer_info = resp.json()
            peer_height = peer_info.get("height", 0)
            local_height = await sync_engine.get_local_height()

            if peer_height <= local_height:
                return  # Our chain is longer or equal

            # Find fork point: walk back from our tip until hashes match
            log.info(f"Potential fork detected. Local={local_height}, Peer={peer_height}. Finding fork point...")
            fork_point = 0
            check_height = local_height - 1

            while check_height >= 0:
                local_block = await db.blocks.find_one({"index": check_height}, {"_id": 0, "hash": 1})
                resp = await client.get(
                    f"{peer_url}/api/p2p/chain/blocks",
                    params={"from_height": check_height, "limit": 1}
                )
                if resp.status_code == 200:
                    peer_blocks = resp.json().get("blocks", [])
                    if peer_blocks and local_block:
                        if peer_blocks[0]["hash"] == local_block["hash"]:
                            fork_point = check_height
                            break
                check_height -= 1

            log.info(f"Fork point found at block {fork_point}. Replacing {local_height - fork_point} blocks.")

            # Remove our blocks after fork point
            await db.blocks.delete_many({"index": {"$gt": fork_point}})

            # Re-sync from fork point
            await sync_engine.sync_new_blocks(peer_url)
            new_height = await sync_engine.get_local_height()
            log.info(f"Fork resolved. New height: {new_height}")

    except Exception as e:
        log.error(f"Fork resolution error: {e}")


# ==================== FASTAPI APPLICATION ====================
app = FastAPI(title="BRICScoin Node", version=NODE_VERSION)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class BroadcastBlockRequest(BaseModel):
    block: dict
    sender_id: str = ""

class BroadcastTxRequest(BaseModel):
    transaction: dict
    sender_id: str = ""

# --- Node Info ---
@app.get("/api/node/info")
async def node_info():
    height = await sync_engine.get_local_height()
    tip = await sync_engine.get_local_tip()
    return {
        "node_id": NODE_ID,
        "version": NODE_VERSION,
        "chain_height": height,
        "latest_block_hash": tip["hash"] if tip else None,
        "peers_count": len(p2p_node.known_peers),
        "syncing": sync_engine.syncing,
        "sync_progress": sync_engine.sync_progress,
        "sync_total": sync_engine.sync_total,
    }

# --- P2P Chain Info (compatible with central node) ---
@app.get("/api/p2p/chain/info")
async def chain_info():
    height = await sync_engine.get_local_height()
    tip = await sync_engine.get_local_tip()
    return {
        "height": height,
        "latest_hash": tip["hash"] if tip else "0" * 64,
        "node_id": NODE_ID
    }

@app.get("/api/p2p/chain/blocks")
async def get_chain_blocks(from_height: int = 0, limit: int = 500):
    actual_limit = min(limit, 1000)
    blocks = await db.blocks.find(
        {"index": {"$gte": from_height}}, {"_id": 0}
    ).sort("index", 1).limit(actual_limit).to_list(actual_limit)
    return {"blocks": blocks, "from_height": from_height, "count": len(blocks)}

@app.get("/api/p2p/peers")
async def get_peers():
    return {
        "peers": [{"url": url, **info} for url, info in p2p_node.known_peers.items()],
        "count": len(p2p_node.known_peers)
    }

# --- Receive Broadcast ---
@app.post("/api/p2p/broadcast/block")
async def receive_block(data: BroadcastBlockRequest):
    block = data.block
    if data.sender_id == NODE_ID:
        return {"status": "self"}

    existing = await db.blocks.find_one({"index": block.get("index")})
    if existing:
        return {"status": "already_exists"}

    # Validate
    prev = await db.blocks.find_one({"index": block["index"] - 1}, {"_id": 0}) if block["index"] > 0 else None
    valid, err = validate_block_standalone(block, prev)
    if not valid:
        log.warning(f"Rejected broadcast block: {err}")
        return {"status": "invalid", "error": err}

    block.pop("_id", None)
    await db.blocks.insert_one(block)
    for tx in block.get("transactions", []):
        tx.pop("_id", None)
        tx["block_index"] = block["index"]
        tx["confirmed"] = True
        await db.transactions.update_one({"id": tx.get("id")}, {"$set": tx}, upsert=True)

    log.info(f"Accepted broadcast block #{block['index']} from {data.sender_id[:8]}")

    # Re-broadcast to other peers
    await p2p_node.broadcast_block(block)
    return {"status": "accepted"}

@app.post("/api/p2p/broadcast/tx")
async def receive_tx(data: BroadcastTxRequest):
    tx = data.transaction
    if data.sender_id == NODE_ID:
        return {"status": "self"}
    existing = await db.transactions.find_one({"id": tx.get("id")})
    if existing:
        return {"status": "already_exists"}
    tx.pop("_id", None)
    await db.transactions.insert_one(tx)
    log.info(f"Received tx {tx.get('id', '?')[:16]}...")
    return {"status": "accepted"}

# --- Block Explorer APIs ---
@app.get("/api/blocks")
async def get_blocks(page: int = 1, per_page: int = 20):
    skip = (page - 1) * per_page
    total = await db.blocks.count_documents({})
    blocks = await db.blocks.find({}, {"_id": 0}).sort("index", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"blocks": blocks, "total": total, "page": page, "per_page": per_page}

@app.get("/api/blocks/{index}")
async def get_block(index: int):
    block = await db.blocks.find_one({"index": index}, {"_id": 0})
    if not block:
        raise HTTPException(404, "Block not found")
    return block

@app.get("/api/network/stats")
async def network_stats():
    height = await sync_engine.get_local_height()
    tip = await sync_engine.get_local_tip()
    return {
        "block_height": height,
        "latest_hash": tip["hash"] if tip else None,
        "current_difficulty": tip.get("difficulty", INITIAL_DIFFICULTY) if tip else INITIAL_DIFFICULTY,
        "node_id": NODE_ID,
        "peers": len(p2p_node.known_peers),
        "syncing": sync_engine.syncing,
    }

@app.get("/api/balance/{address}")
async def get_balance(address: str):
    received_pipeline = [
        {"$match": {"recipient": address, "confirmed": True}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    sent_pipeline = [
        {"$match": {"sender": address, "confirmed": True}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    recv = await db.transactions.aggregate(received_pipeline).to_list(1)
    sent = await db.transactions.aggregate(sent_pipeline).to_list(1)
    total_recv = recv[0]["total"] if recv else 0
    total_sent = sent[0]["total"] if sent else 0
    return {"address": address, "balance": total_recv - total_sent}

# --- Sync Controls ---
@app.post("/api/node/sync")
async def trigger_sync():
    if sync_engine.syncing:
        return {"status": "already_syncing", "progress": sync_engine.sync_progress}
    asyncio.create_task(sync_engine.bootstrap_from_seed(CENTRAL_NODE))
    return {"status": "sync_started"}

@app.post("/api/node/validate")
async def validate_chain():
    """Validate the entire local chain from genesis."""
    height = await sync_engine.get_local_height()
    prev = None
    errors = []
    for i in range(height):
        block = await db.blocks.find_one({"index": i}, {"_id": 0})
        if not block:
            errors.append(f"Missing block {i}")
            break
        valid, err = validate_block_standalone(block, prev)
        if not valid:
            errors.append(err)
        prev = block
    return {
        "chain_height": height,
        "valid": len(errors) == 0,
        "errors": errors[:20],
        "total_errors": len(errors)
    }

# ==================== BACKGROUND TASKS ====================
async def periodic_sync_task():
    """Sync with peers every 30 seconds."""
    await asyncio.sleep(10)  # Wait for startup
    while True:
        try:
            # Sync from seed node
            await sync_engine.sync_new_blocks(CENTRAL_NODE)
            # Sync from known peers
            for peer_url in list(p2p_node.known_peers.keys()):
                await sync_engine.sync_new_blocks(peer_url)
        except Exception as e:
            log.debug(f"Periodic sync error: {e}")
        await asyncio.sleep(30)

async def periodic_peer_discovery():
    """Discover new peers every 5 minutes."""
    await asyncio.sleep(5)
    while True:
        await p2p_node.discover_peers()
        await asyncio.sleep(300)

async def fork_check_task():
    """Check for forks every 2 minutes."""
    await asyncio.sleep(60)
    while True:
        try:
            for peer_url in [CENTRAL_NODE] + list(p2p_node.known_peers.keys()):
                await resolve_fork(peer_url)
        except Exception:
            pass
        await asyncio.sleep(120)

@app.on_event("startup")
async def startup():
    log.info(f"BRICScoin Node {NODE_VERSION} starting...")
    log.info(f"Node ID: {NODE_ID}")
    log.info(f"Seed node: {CENTRAL_NODE}")
    log.info(f"Database: {DB_NAME}")

    # Create indexes
    await db.blocks.create_index("index", unique=True)
    await db.blocks.create_index("hash")
    await db.transactions.create_index("id")
    await db.transactions.create_index("sender")
    await db.transactions.create_index("recipient")

    # Bootstrap from seed
    local_height = await sync_engine.get_local_height()
    if local_height == 0:
        log.info("Empty chain — starting full bootstrap from seed node...")
        await sync_engine.bootstrap_from_seed(CENTRAL_NODE)
    else:
        log.info(f"Existing chain with {local_height} blocks. Syncing new blocks...")
        await sync_engine.sync_new_blocks(CENTRAL_NODE)

    # Start background tasks
    asyncio.create_task(periodic_sync_task())
    asyncio.create_task(periodic_peer_discovery())
    asyncio.create_task(fork_check_task())

    height = await sync_engine.get_local_height()
    log.info(f"Node ready. Chain height: {height}. API on port {NODE_PORT}")

# ==================== ENTRYPOINT ====================
if __name__ == "__main__":
    uvicorn.run("node:app", host=NODE_HOST, port=NODE_PORT, reload=False, log_level="info")
