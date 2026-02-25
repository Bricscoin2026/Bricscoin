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

from wallet import (
    generate_wallet, recover_from_private_key, load_wallet_from_file,
    save_wallet_to_file, create_transaction, address_from_pubkey,
    verify_signature, build_tx_data, TRANSACTION_FEE
)

# ==================== CONFIGURATION ====================
NODE_VERSION = "2.0.0"
CENTRAL_NODE = os.environ.get("SEED_NODE", "https://bricscoin26.org")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/")
DB_NAME = os.environ.get("DB_NAME", "bricscoin_node")
NODE_PORT = int(os.environ.get("NODE_PORT", "8333"))
NODE_HOST = os.environ.get("NODE_HOST", "0.0.0.0")
NODE_URL = os.environ.get("NODE_URL", "")  # Public URL for P2P (e.g. https://my-node.example.com)
NODE_ID = os.environ.get("NODE_ID", "")
PEER_MAX_AGE = 600  # Seconds before a peer is considered stale
PEER_HEARTBEAT_INTERVAL = 60  # Seconds between heartbeat checks

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

# Generate stable NODE_ID from DB_NAME if not set (persists across restarts)
if not NODE_ID:
    NODE_ID = hashlib.sha256(f"{DB_NAME}-{MONGO_URL}".encode()).hexdigest()[:16]

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
        if idx > 0:
            if prev_block is None:
                return False, f"Block {idx}: orphan block — parent block not found"
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

                    # Deduplicate: keep last occurrence per index (canonical chain)
                    seen = {}
                    for block in blocks:
                        seen[block["index"]] = block
                    unique_blocks = [seen[i] for i in sorted(seen.keys())]

                    for block in unique_blocks:
                        # Skip if already stored — use stored version as prev
                        existing = await db.blocks.find_one({"index": block["index"]}, {"_id": 0})
                        if existing:
                            prev_block = existing
                            continue

                        # Validate independently
                        valid, err = validate_block_standalone(block, prev_block)
                        if valid:
                            block.pop("_id", None)
                            await db.blocks.insert_one(block)
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

                    current = unique_blocks[-1]["index"] + 1 if unique_blocks else current + batch_size

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
                # Deduplicate: keep last occurrence per index
                seen = {}
                for block in blocks:
                    seen[block["index"]] = block
                unique_blocks = [seen[i] for i in sorted(seen.keys())]

                prev_block = await self.get_local_tip()
                added = 0

                for block in unique_blocks:
                    existing = await db.blocks.find_one({"index": block["index"]}, {"_id": 0})
                    if existing:
                        prev_block = existing
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
    """Manages peer connections, discovery, health and propagation."""

    def __init__(self):
        self.peers: dict[str, dict] = {}  # node_id -> {url, height, last_seen, version}
        self.seed_nodes = [CENTRAL_NODE]
        extra = os.environ.get("SEED_NODES", "")
        if extra:
            self.seed_nodes += [s.strip() for s in extra.split(",") if s.strip()]

    # ---------- persistence ----------
    async def load_peers_from_db(self):
        """Load previously known peers from MongoDB."""
        docs = await db.peers.find({}, {"_id": 0}).to_list(200)
        for doc in docs:
            nid = doc.get("node_id", "")
            if nid and nid != NODE_ID:
                self.peers[nid] = doc
        if self.peers:
            log.info(f"Loaded {len(self.peers)} peers from database")

    async def save_peer(self, node_id: str, info: dict):
        """Persist a single peer to MongoDB."""
        info_copy = {**info, "node_id": node_id}
        await db.peers.update_one(
            {"node_id": node_id}, {"$set": info_copy}, upsert=True
        )

    async def remove_peer_from_db(self, node_id: str):
        await db.peers.delete_one({"node_id": node_id})

    # ---------- registration ----------
    async def register_with_node(self, target_url: str) -> bool:
        """Register ourselves with a remote node and learn about it."""
        if not NODE_URL:
            return False
        try:
            height = await sync_engine.get_local_height()
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{target_url}/api/p2p/register",
                    json={
                        "node_id": NODE_ID,
                        "url": NODE_URL,
                        "version": NODE_VERSION,
                        "chain_height": height,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    remote_id = data.get("node_id", "")
                    if remote_id and remote_id != NODE_ID:
                        peer_info = {
                            "url": target_url,
                            "version": data.get("version", "?"),
                            "height": data.get("chain_height", 0),
                            "last_seen": datetime.now(timezone.utc).isoformat(),
                        }
                        self.peers[remote_id] = peer_info
                        await self.save_peer(remote_id, peer_info)
                        log.info(f"Registered with {target_url} (id={remote_id[:8]})")
                    return True
        except Exception as e:
            log.debug(f"Failed to register with {target_url}: {e}")
        return False

    async def register_peer_locally(self, node_id: str, url: str, version: str, height: int):
        """Record a peer that registered with us."""
        if node_id == NODE_ID:
            return
        peer_info = {
            "url": url,
            "version": version,
            "height": height,
            "last_seen": datetime.now(timezone.utc).isoformat(),
        }
        self.peers[node_id] = peer_info
        await self.save_peer(node_id, peer_info)

    # ---------- discovery ----------
    async def discover_peers(self):
        """Ask seed nodes and known peers for their peer lists, then register with new ones."""
        sources = list(self.seed_nodes) + [p["url"] for p in self.peers.values()]
        new_urls: list[str] = []

        for source_url in sources:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(f"{source_url}/api/p2p/peers")
                    if resp.status_code == 200:
                        for p in resp.json().get("peers", []):
                            url = p.get("url", "")
                            nid = p.get("node_id", "")
                            if url and nid != NODE_ID and nid not in self.peers:
                                new_urls.append(url)
            except Exception:
                pass

        # Register with newly discovered peers
        registered = 0
        for url in set(new_urls):
            if await self.register_with_node(url):
                registered += 1
        if registered:
            log.info(f"Discovered and registered with {registered} new peers (total: {len(self.peers)})")

        # Also re-register with seeds to keep ourselves visible
        for seed in self.seed_nodes:
            await self.register_with_node(seed)

    # ---------- heartbeat ----------
    async def heartbeat(self):
        """Ping all peers; remove unresponsive ones."""
        dead = []
        for nid, info in list(self.peers.items()):
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(f"{info['url']}/api/p2p/chain/info")
                    if resp.status_code == 200:
                        data = resp.json()
                        info["height"] = data.get("height", 0)
                        info["last_seen"] = datetime.now(timezone.utc).isoformat()
                        await self.save_peer(nid, info)
                    else:
                        dead.append(nid)
            except Exception:
                # Check if peer has been unreachable for too long
                try:
                    last = datetime.fromisoformat(info.get("last_seen", "2000-01-01").replace("Z", "+00:00"))
                    if (datetime.now(timezone.utc) - last).total_seconds() > PEER_MAX_AGE:
                        dead.append(nid)
                except Exception:
                    dead.append(nid)

        for nid in dead:
            url = self.peers.pop(nid, {}).get("url", "?")
            await self.remove_peer_from_db(nid)
            log.info(f"Removed stale peer {nid[:8]} ({url})")

    # ---------- broadcast ----------
    async def broadcast_block(self, block: dict, exclude_id: str = ""):
        """Broadcast a block to all peers except the sender."""
        tasks = []
        for nid, info in list(self.peers.items()):
            if nid == exclude_id:
                continue
            tasks.append(self._send_block(info["url"], block))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _send_block(self, url: str, block: dict):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    f"{url}/api/p2p/broadcast/block",
                    json={"block": block, "sender_id": NODE_ID},
                )
        except Exception:
            pass

    async def broadcast_transaction(self, tx: dict, exclude_id: str = ""):
        """Broadcast a transaction to all peers."""
        tasks = []
        for nid, info in list(self.peers.items()):
            if nid == exclude_id:
                continue
            tasks.append(self._send_tx(info["url"], tx))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _send_tx(self, url: str, tx: dict):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{url}/api/p2p/broadcast/tx",
                    json={"transaction": tx, "sender_id": NODE_ID},
                )
        except Exception:
            pass

    # ---------- best peer ----------
    def get_best_peer_url(self) -> Optional[str]:
        """Return URL of the peer with the highest chain."""
        if not self.peers:
            return None
        best = max(self.peers.values(), key=lambda p: p.get("height", 0))
        return best["url"] if best.get("height", 0) > 0 else None


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

class PeerRegisterRequest(BaseModel):
    node_id: str
    url: str
    version: str = "1.0.0"
    chain_height: int = 0

# --- Node Info ---
@app.get("/api/node/info")
async def node_info():
    height = await sync_engine.get_local_height()
    tip = await sync_engine.get_local_tip()
    return {
        "node_id": NODE_ID,
        "node_url": NODE_URL or None,
        "version": NODE_VERSION,
        "chain_height": height,
        "latest_block_hash": tip["hash"] if tip else None,
        "peers_count": len(p2p_node.peers),
        "peers": [
            {"node_id": nid, "url": info["url"], "height": info.get("height", 0)}
            for nid, info in p2p_node.peers.items()
        ],
        "syncing": sync_engine.syncing,
        "sync_progress": sync_engine.sync_progress,
        "sync_total": sync_engine.sync_total,
    }

# --- P2P Registration ---
@app.post("/api/p2p/register")
async def register_peer(req: PeerRegisterRequest):
    """A remote node registers with us. We record it and return our info."""
    await p2p_node.register_peer_locally(req.node_id, req.url, req.version, req.chain_height)
    height = await sync_engine.get_local_height()
    log.info(f"Peer registered: {req.node_id[:8]} at {req.url} (height={req.chain_height})")
    return {
        "node_id": NODE_ID,
        "version": NODE_VERSION,
        "chain_height": height,
        "message": "Peer registered successfully",
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
        "node_id": NODE_ID,
        "node_url": NODE_URL or None,
        "peers": [
            {"node_id": nid, "url": info["url"], "height": info.get("height", 0),
             "version": info.get("version", "?"), "last_seen": info.get("last_seen", "")}
            for nid, info in p2p_node.peers.items()
        ],
        "count": len(p2p_node.peers),
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

    # Re-broadcast to other peers (exclude sender to avoid loops)
    asyncio.create_task(p2p_node.broadcast_block(block, exclude_id=data.sender_id))
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
    # Re-broadcast to other peers
    asyncio.create_task(p2p_node.broadcast_transaction(tx, exclude_id=data.sender_id))
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
        "node_url": NODE_URL or None,
        "peers": len(p2p_node.peers),
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
    # Sync from seed + best peer
    async def do_sync():
        await sync_engine.bootstrap_from_seed(CENTRAL_NODE)
        best = p2p_node.get_best_peer_url()
        if best and best != CENTRAL_NODE:
            await sync_engine.sync_new_blocks(best)
    asyncio.create_task(do_sync())
    return {"status": "sync_started", "seed": CENTRAL_NODE, "peers": len(p2p_node.peers)}

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
    """Sync with the best available peer every 30 seconds."""
    await asyncio.sleep(10)
    while True:
        try:
            # Always sync from seed
            await sync_engine.sync_new_blocks(CENTRAL_NODE)
            # Also sync from known peers (prefer highest chain)
            best_url = p2p_node.get_best_peer_url()
            if best_url and best_url != CENTRAL_NODE:
                await sync_engine.sync_new_blocks(best_url)
        except Exception as e:
            log.debug(f"Periodic sync error: {e}")
        await asyncio.sleep(30)

async def periodic_peer_discovery():
    """Discover new peers every 2 minutes."""
    await asyncio.sleep(15)
    while True:
        try:
            await p2p_node.discover_peers()
        except Exception:
            pass
        await asyncio.sleep(120)

async def periodic_heartbeat():
    """Health-check peers every 60 seconds."""
    await asyncio.sleep(30)
    while True:
        try:
            await p2p_node.heartbeat()
        except Exception:
            pass
        await asyncio.sleep(PEER_HEARTBEAT_INTERVAL)

async def fork_check_task():
    """Check for forks every 2 minutes."""
    await asyncio.sleep(60)
    while True:
        try:
            # Check seed node
            await resolve_fork(CENTRAL_NODE)
            # Check peers
            for nid, info in list(p2p_node.peers.items()):
                await resolve_fork(info["url"])
        except Exception:
            pass
        await asyncio.sleep(120)

@app.on_event("startup")
async def startup():
    log.info(f"BRICScoin Node {NODE_VERSION} starting...")
    log.info(f"Node ID:   {NODE_ID}")
    log.info(f"Node URL:  {NODE_URL or '(not set — P2P registration disabled)'}")
    log.info(f"Seed node: {CENTRAL_NODE}")
    log.info(f"Database:  {DB_NAME}")

    # Create indexes
    await db.blocks.create_index("index", unique=True)
    await db.blocks.create_index("hash")
    await db.transactions.create_index("id")
    await db.transactions.create_index("sender")
    await db.transactions.create_index("recipient")
    await db.peers.create_index("node_id", unique=True)

    # Load peers from previous session
    await p2p_node.load_peers_from_db()

    # Bootstrap blockchain from seed
    local_height = await sync_engine.get_local_height()
    if local_height == 0:
        log.info("Empty chain — starting full bootstrap from seed node...")
        await sync_engine.bootstrap_from_seed(CENTRAL_NODE)
    else:
        log.info(f"Existing chain with {local_height} blocks. Syncing new blocks...")
        await sync_engine.sync_new_blocks(CENTRAL_NODE)

    # Register with seed nodes (announce ourselves to the network)
    if NODE_URL:
        for seed in p2p_node.seed_nodes:
            await p2p_node.register_with_node(seed)
        log.info(f"Announced to {len(p2p_node.seed_nodes)} seed node(s)")
    else:
        log.warning("NODE_URL not set — this node can sync but won't be discoverable by others")

    # Start background tasks
    asyncio.create_task(periodic_sync_task())
    asyncio.create_task(periodic_peer_discovery())
    asyncio.create_task(periodic_heartbeat())
    asyncio.create_task(fork_check_task())

    height = await sync_engine.get_local_height()
    log.info(f"Node ready. Chain height: {height}. Peers: {len(p2p_node.peers)}. API on port {NODE_PORT}")

# ==================== ENTRYPOINT ====================
if __name__ == "__main__":
    uvicorn.run("node:app", host=NODE_HOST, port=NODE_PORT, reload=False, log_level="info")
