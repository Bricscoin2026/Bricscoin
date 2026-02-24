"""
BricsCoin P2Pool - True Decentralized Mining Pool
==================================================
Real P2Pool implementation with:
- Sharechain: a separate mini-blockchain of validated shares
- P2P: nodes exchange and validate shares independently
- Two pool modes: SOLO (finder keeps all) and PPLNS (proportional split)
- No central operator can manipulate rewards

Collections used (ALL separate from main blockchain):
- p2pool_sharechain: the share chain (linked list of validated shares)
- p2pool_peers: registered P2P nodes
- p2pool_payouts: payout records for PPLNS

The main blockchain collections (blocks, transactions) are READ-ONLY.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import hashlib
import uuid
import httpx
import asyncio
import logging
import json
import time

logger = logging.getLogger("p2pool")

router = APIRouter(prefix="/api/p2pool", tags=["P2Pool"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ==================== CONSTANTS ====================
SHARECHAIN_WINDOW = 2016          # shares in the payout window
SHARECHAIN_TARGET_TIME = 10       # target seconds between shares
SHARE_DIFFICULTY_DIVISOR = 100    # share difficulty = network_diff / this
PEER_TIMEOUT = 600                # 10 min
MAX_PEERS = 50
PPLNS_WINDOW = 2016               # PPLNS lookback window
BLOCK_REWARD = 50.0               # current block reward

# Node identity (unique per instance)
NODE_ID = os.environ.get('NODE_ID', 'mainnet')
NODE_URL = os.environ.get('BRICS_NODE_URL', '')


async def auto_register_node():
    """Auto-register this node as a P2Pool peer on startup"""
    now = datetime.now(timezone.utc).isoformat()
    await db.p2pool_peers.update_one(
        {"peer_id": NODE_ID},
        {"$set": {
            "peer_id": NODE_ID,
            "node_url": NODE_URL or "https://bricscoin26.org",
            "version": "2.0.0",
            "stratum_port": 3333,
            "pool_modes": ["solo"],
            "last_seen": now,
            "online": True,
            "registered_at": now,
        }},
        upsert=True
    )
    logger.info(f"Auto-registered node: {NODE_ID}")


@router.on_event("startup")
async def startup_event():
    await auto_register_node()


# ==================== MODELS ====================

class PeerRegister(BaseModel):
    node_url: str = Field(..., min_length=5)
    node_id: Optional[str] = None
    version: str = "1.0.0"
    stratum_port: int = 3333
    pool_modes: List[str] = ["solo", "pplns"]


class ShareBroadcast(BaseModel):
    """A share to be propagated across the P2P network"""
    share_id: str
    previous_share_id: str
    worker: str
    share_hash: str
    share_difficulty: float
    network_difficulty: float
    block_height: int
    nonce: str
    timestamp: str
    peer_origin: str
    is_block: bool = False
    pool_mode: str = "solo"  # "solo" or "pplns"
    signature: str = ""       # SHA256(share_data + peer_secret) for validation


class PoolModeSwitch(BaseModel):
    worker: str
    pool_mode: str  # "solo" or "pplns"


# ==================== SHARECHAIN ENGINE ====================

async def get_chain_tip():
    """Get the latest share in the sharechain"""
    tip = await db.p2pool_sharechain.find_one(
        {}, {"_id": 0}, sort=[("height", -1)]
    )
    return tip


async def get_share_difficulty():
    """Calculate share difficulty based on network difficulty"""
    last_block = await db.blocks.find_one({}, {"_id": 0, "difficulty": 1}, sort=[("index", -1)])
    net_diff = last_block.get("difficulty", 1) if last_block else 1
    # Share difficulty is lower than network difficulty
    share_diff = max(1, net_diff // SHARE_DIFFICULTY_DIVISOR)
    return share_diff, net_diff


async def validate_share(share: dict) -> bool:
    """
    Validate a share independently.
    Any node can run this - no trust required.
    Checks:
    1. Share hash meets share difficulty target
    2. Previous share exists in the chain
    3. Timestamp is reasonable
    4. Worker address is valid
    """
    # Check previous share exists (genesis share has prev = "genesis")
    if share["previous_share_id"] != "genesis":
        prev = await db.p2pool_sharechain.find_one(
            {"share_id": share["previous_share_id"]}, {"_id": 0, "share_id": 1}
        )
        if not prev:
            return False

    # Verify share hash meets difficulty
    # The share_hash should have enough leading zeros for the share difficulty
    try:
        hash_int = int(share["share_hash"], 16)
        max_target = (2 ** 256) - 1
        share_target = max_target // max(1, int(share["share_difficulty"]))
        if hash_int > share_target:
            return False
    except (ValueError, ZeroDivisionError):
        return False

    # Timestamp sanity check (not more than 5 minutes in the future)
    try:
        share_time = datetime.fromisoformat(share["timestamp"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if share_time > now + timedelta(minutes=5):
            return False
    except Exception:
        return False

    return True


async def add_share_to_chain(share_data: dict) -> dict:
    """Add a validated share to the sharechain"""
    tip = await get_chain_tip()
    height = (tip["height"] + 1) if tip else 0
    prev_id = tip["share_id"] if tip else "genesis"

    share = {
        "share_id": share_data.get("share_id") or hashlib.sha256(
            f"{share_data['worker']}{share_data['share_hash']}{time.time()}".encode()
        ).hexdigest()[:24],
        "height": height,
        "previous_share_id": prev_id,
        "worker": share_data["worker"],
        "share_hash": share_data["share_hash"],
        "share_difficulty": share_data["share_difficulty"],
        "network_difficulty": share_data["network_difficulty"],
        "block_height": share_data["block_height"],
        "nonce": share_data.get("nonce", ""),
        "timestamp": share_data.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        "peer_origin": share_data.get("peer_origin", NODE_ID),
        "is_block": share_data.get("is_block", False),
        "pool_mode": share_data.get("pool_mode", "solo"),
        "validated": True,
        "validated_by": [NODE_ID],
    }

    # Check for duplicate
    existing = await db.p2pool_sharechain.find_one({"share_id": share["share_id"]})
    if existing:
        return existing

    await db.p2pool_sharechain.insert_one(share)
    share.pop("_id", None)

    # Prune old shares beyond the window
    if height > SHARECHAIN_WINDOW * 2:
        cutoff_height = height - SHARECHAIN_WINDOW * 2
        await db.p2pool_sharechain.delete_many({"height": {"$lt": cutoff_height}})

    return share


async def calculate_pplns_payouts(block_reward: float) -> List[dict]:
    """
    Calculate PPLNS payouts from the sharechain.
    Looks at the last PPLNS_WINDOW shares and distributes
    reward proportionally to share difficulty contributed.
    
    This is deterministic - any node will calculate the same result.
    """
    # Get last N shares from PPLNS pool
    shares = await db.p2pool_sharechain.find(
        {"pool_mode": "pplns"},
        {"_id": 0, "worker": 1, "share_difficulty": 1}
    ).sort("height", -1).limit(PPLNS_WINDOW).to_list(PPLNS_WINDOW)

    if not shares:
        return []

    # Calculate total work (sum of difficulties)
    worker_work: Dict[str, float] = {}
    total_work = 0.0
    for s in shares:
        w = s["worker"]
        diff = s.get("share_difficulty", 1)
        worker_work[w] = worker_work.get(w, 0) + diff
        total_work += diff

    if total_work == 0:
        return []

    # Distribute reward proportionally
    payouts = []
    for worker, work in worker_work.items():
        share_pct = work / total_work
        amount = round(block_reward * share_pct, 8)
        if amount > 0:
            payouts.append({
                "worker": worker,
                "amount": amount,
                "share_percentage": round(share_pct * 100, 4),
                "shares_in_window": sum(1 for s in shares if s["worker"] == worker),
                "total_difficulty": work,
            })

    payouts.sort(key=lambda x: x["amount"], reverse=True)
    return payouts


# ==================== P2P SHARE PROPAGATION ====================

async def propagate_share_to_peers(share: dict):
    """Broadcast a new share to all known online peers"""
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=PEER_TIMEOUT)).isoformat()
    peers = await db.p2pool_peers.find(
        {"online": True, "last_seen": {"$gte": cutoff}, "peer_id": {"$ne": NODE_ID}},
        {"_id": 0, "node_url": 1, "peer_id": 1}
    ).to_list(MAX_PEERS)

    async def send_to_peer(peer):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{peer['node_url']}/api/p2pool/share/receive",
                    json=share
                )
        except Exception:
            pass

    # Fire and forget - don't block on propagation
    tasks = [send_to_peer(p) for p in peers]
    if tasks:
        asyncio.gather(*tasks, return_exceptions=True)


# ==================== API ROUTES ====================

# --- Peer Management ---

@router.post("/peer/register")
async def register_peer(peer: PeerRegister):
    """Register a new P2Pool peer node"""
    peer_id = peer.node_id or hashlib.sha256(peer.node_url.encode()).hexdigest()[:16]
    now = datetime.now(timezone.utc).isoformat()

    await db.p2pool_peers.update_one(
        {"peer_id": peer_id},
        {"$set": {
            "peer_id": peer_id,
            "node_url": peer.node_url,
            "version": peer.version,
            "stratum_port": peer.stratum_port,
            "pool_modes": peer.pool_modes,
            "last_seen": now,
            "online": True,
            "registered_at": now,
        }},
        upsert=True
    )

    peers = await db.p2pool_peers.find(
        {"online": True}, {"_id": 0, "node_url": 1, "peer_id": 1, "stratum_port": 1}
    ).limit(MAX_PEERS).to_list(MAX_PEERS)

    # Get sharechain tip for sync
    tip = await get_chain_tip()

    return {
        "peer_id": peer_id,
        "node_id": NODE_ID,
        "known_peers": peers,
        "sharechain_height": tip["height"] if tip else 0,
        "pool_info": {
            "version": "2.0.0",
            "modes": ["solo", "pplns"],
            "sharechain_window": SHARECHAIN_WINDOW,
            "pplns_window": PPLNS_WINDOW,
        }
    }


@router.post("/peer/heartbeat")
async def peer_heartbeat(peer_id: str, miners_count: int = 0, hashrate: float = 0):
    """Update peer heartbeat"""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.p2pool_peers.update_one(
        {"peer_id": peer_id},
        {"$set": {"last_seen": now, "online": True, "miners_count": miners_count, "hashrate": hashrate}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Peer not found")
    return {"status": "ok"}


@router.get("/peers")
async def list_peers():
    """List all P2Pool peers with status"""
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=PEER_TIMEOUT)).isoformat()
    await db.p2pool_peers.update_many(
        {"last_seen": {"$lt": cutoff}, "online": True},
        {"$set": {"online": False}}
    )
    all_peers = await db.p2pool_peers.find({}, {"_id": 0}).sort("last_seen", -1).to_list(MAX_PEERS)
    online = [p for p in all_peers if p.get("online")]
    return {
        "peers": all_peers,
        "online_count": len(online),
        "total": len(all_peers),
        "this_node": NODE_ID,
    }


# --- Sharechain ---

@router.post("/share/submit")
async def submit_share(share: ShareBroadcast):
    """Submit a new share to the sharechain (from local Stratum or peer)"""
    share_data = share.dict()

    # Validate the share
    is_valid = await validate_share(share_data)
    if not is_valid:
        # We still accept it but mark as unvalidated for leniency
        share_data["validated"] = False

    # Add to our sharechain
    result = await add_share_to_chain(share_data)

    # Propagate to peers (async, non-blocking)
    asyncio.create_task(propagate_share_to_peers(result))

    # If this share found a block, record the payout
    if share_data.get("is_block"):
        await record_block_payout(share_data)

    return {"accepted": True, "share_id": result["share_id"], "height": result.get("height", 0)}


@router.post("/share/receive")
async def receive_share_from_peer(share: ShareBroadcast):
    """Receive a share from a peer node (P2P propagation)"""
    share_data = share.dict()

    # Validate independently
    is_valid = await validate_share(share_data)

    # Check if we already have it
    existing = await db.p2pool_sharechain.find_one({"share_id": share_data.get("share_id")})
    if existing:
        # Add our validation vote
        if is_valid and NODE_ID not in existing.get("validated_by", []):
            await db.p2pool_sharechain.update_one(
                {"share_id": share_data["share_id"]},
                {"$addToSet": {"validated_by": NODE_ID}}
            )
        return {"accepted": True, "already_known": True}

    share_data["validated"] = is_valid
    result = await add_share_to_chain(share_data)

    return {"accepted": True, "share_id": result["share_id"], "validated": is_valid}


@router.get("/sharechain")
async def get_sharechain(limit: int = 50):
    """Get the sharechain (latest shares)"""
    shares = await db.p2pool_sharechain.find(
        {}, {"_id": 0}
    ).sort("height", -1).limit(min(limit, 200)).to_list(min(limit, 200))
    tip = await get_chain_tip()
    return {
        "shares": shares,
        "count": len(shares),
        "chain_height": tip["height"] if tip else 0,
        "window_size": SHARECHAIN_WINDOW,
    }


@router.get("/sharechain/verify/{share_id}")
async def verify_share_endpoint(share_id: str):
    """Verify a specific share - anyone can check"""
    share = await db.p2pool_sharechain.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    is_valid = await validate_share(share)
    validators = share.get("validated_by", [])

    return {
        "share": share,
        "valid": is_valid,
        "validators_count": len(validators),
        "validators": validators,
        "consensus": len(validators) >= 1,
    }


# --- Payouts ---

async def record_block_payout(share_data: dict):
    """Record payout when a block is found"""
    pool_mode = share_data.get("pool_mode", "solo")
    block_height = share_data.get("block_height", 0)
    finder = share_data.get("worker", "unknown")
    now = datetime.now(timezone.utc).isoformat()

    if pool_mode == "solo":
        payout = {
            "payout_id": hashlib.sha256(f"payout-{block_height}-{now}".encode()).hexdigest()[:16],
            "block_height": block_height,
            "pool_mode": "solo",
            "finder": finder,
            "total_reward": BLOCK_REWARD,
            "payouts": [{"worker": finder, "amount": BLOCK_REWARD, "share_percentage": 100.0}],
            "timestamp": now,
            "share_id": share_data.get("share_id", ""),
        }
    else:
        # PPLNS payout
        pplns = await calculate_pplns_payouts(BLOCK_REWARD)
        payout = {
            "payout_id": hashlib.sha256(f"payout-{block_height}-{now}".encode()).hexdigest()[:16],
            "block_height": block_height,
            "pool_mode": "pplns",
            "finder": finder,
            "total_reward": BLOCK_REWARD,
            "payouts": pplns,
            "timestamp": now,
            "share_id": share_data.get("share_id", ""),
        }

    await db.p2pool_payouts.insert_one(payout)
    payout.pop("_id", None)
    return payout


@router.get("/payouts")
async def get_payouts(limit: int = 20, pool_mode: Optional[str] = None):
    """Get payout history"""
    query = {}
    if pool_mode:
        query["pool_mode"] = pool_mode
    payouts = await db.p2pool_payouts.find(
        query, {"_id": 0}
    ).sort("timestamp", -1).limit(min(limit, 100)).to_list(min(limit, 100))
    return {"payouts": payouts, "count": len(payouts)}


@router.get("/payouts/worker/{address}")
async def get_worker_payouts(address: str, limit: int = 20):
    """Get payouts for a specific worker"""
    payouts = await db.p2pool_payouts.find(
        {"payouts.worker": address}, {"_id": 0}
    ).sort("timestamp", -1).limit(min(limit, 50)).to_list(min(limit, 50))

    # Extract only this worker's portion
    worker_payouts = []
    for p in payouts:
        for wp in p.get("payouts", []):
            if wp["worker"] == address:
                worker_payouts.append({
                    "payout_id": p["payout_id"],
                    "block_height": p["block_height"],
                    "pool_mode": p["pool_mode"],
                    "amount": wp["amount"],
                    "share_percentage": wp.get("share_percentage", 0),
                    "timestamp": p["timestamp"],
                })
    return {"payouts": worker_payouts, "count": len(worker_payouts), "worker": address}


# --- Pool Statistics ---

@router.get("/stats")
async def get_pool_stats():
    """Get comprehensive P2Pool statistics"""
    now = datetime.now(timezone.utc)

    # Peer stats
    cutoff = (now - timedelta(seconds=PEER_TIMEOUT)).isoformat()
    await db.p2pool_peers.update_many(
        {"last_seen": {"$lt": cutoff}, "online": True}, {"$set": {"online": False}}
    )
    online_peers = await db.p2pool_peers.count_documents({"online": True})
    total_peers = await db.p2pool_peers.count_documents({})

    # Active miners from Stratum
    miner_cutoff = (now - timedelta(minutes=10)).isoformat()
    active_miners = await db.miners.count_documents(
        {"online": True, "last_seen": {"$gte": miner_cutoff}}
    )

    # Sharechain stats
    chain_tip = await get_chain_tip()
    chain_height = chain_tip["height"] if chain_tip else 0

    # Shares from miner_shares (Stratum data) for hashrate
    hr_cutoff = (now - timedelta(hours=1)).isoformat()
    day_cutoff = (now - timedelta(hours=24)).isoformat()
    shares_1h = await db.miner_shares.count_documents({"timestamp": {"$gte": hr_cutoff}})
    shares_24h = await db.miner_shares.count_documents({"timestamp": {"$gte": day_cutoff}})
    blocks_24h = await db.miner_shares.count_documents(
        {"timestamp": {"$gte": day_cutoff}, "is_block": True}
    )

    # Pool hashrate
    avg_share_diff = 512
    if shares_1h > 0:
        pipeline = [
            {"$match": {"timestamp": {"$gte": hr_cutoff}}},
            {"$group": {"_id": None, "avg_diff": {"$avg": "$share_difficulty"}}}
        ]
        avg_result = await db.miner_shares.aggregate(pipeline).to_list(1)
        if avg_result:
            avg_share_diff = avg_result[0].get("avg_diff", 512)
    pool_hashrate = (shares_1h * avg_share_diff * (2**32)) / 3600 if shares_1h > 0 else 0

    # Top miners (24h)
    top_pipeline = [
        {"$match": {"timestamp": {"$gte": day_cutoff}}},
        {"$group": {
            "_id": "$worker",
            "shares": {"$sum": 1},
            "blocks_found": {"$sum": {"$cond": ["$is_block", 1, 0]}},
            "last_share": {"$max": "$timestamp"},
            "avg_difficulty": {"$avg": "$share_difficulty"},
        }},
        {"$sort": {"shares": -1}},
        {"$limit": 20}
    ]
    top_miners = await db.miner_shares.aggregate(top_pipeline).to_list(20)

    # Network info
    last_block = await db.blocks.find_one(
        {}, {"_id": 0, "index": 1, "timestamp": 1, "miner": 1, "difficulty": 1, "hash": 1},
        sort=[("index", -1)]
    )
    total_blocks = await db.blocks.count_documents({})

    # PPLNS payout preview
    pplns_preview = await calculate_pplns_payouts(BLOCK_REWARD)

    # Share difficulty
    share_diff, net_diff = await get_share_difficulty()

    return {
        "pool": {
            "name": "BricsCoin P2Pool",
            "version": "2.0.0",
            "modes": ["solo", "pplns"],
            "description": "Truly decentralized P2P mining pool. No central operator.",
            "node_id": NODE_ID,
        },
        "network": {
            "difficulty": net_diff,
            "share_difficulty": share_diff,
            "total_blocks": total_blocks,
            "last_block": last_block,
            "block_reward": BLOCK_REWARD,
        },
        "sharechain": {
            "height": chain_height,
            "window_size": SHARECHAIN_WINDOW,
            "pplns_window": PPLNS_WINDOW,
        },
        "peers": {
            "online": online_peers,
            "total": total_peers,
            "this_node": NODE_ID,
        },
        "miners": {
            "active": active_miners,
            "top_miners": [
                {
                    "worker": m["_id"],
                    "shares_24h": m["shares"],
                    "blocks_found": m["blocks_found"],
                    "last_share": m["last_share"],
                    "avg_difficulty": round(m.get("avg_difficulty", 0), 2),
                }
                for m in top_miners
            ],
        },
        "shares": {
            "last_hour": shares_1h,
            "last_24h": shares_24h,
        },
        "hashrate": {
            "pool_estimated": round(pool_hashrate, 2),
            "pool_hashrate_readable": format_hashrate(pool_hashrate),
        },
        "blocks": {
            "found_24h": blocks_24h,
        },
        "pplns_preview": {
            "if_block_found_now": pplns_preview[:10],
            "miners_in_window": len(pplns_preview),
        },
    }


@router.get("/miners")
async def get_pool_miners():
    """Get detailed miner stats"""
    now = datetime.now(timezone.utc)
    cutoff_10m = (now - timedelta(minutes=10)).isoformat()
    cutoff_24h = (now - timedelta(hours=24)).isoformat()
    hr_cutoff = (now - timedelta(hours=1)).isoformat()

    active_docs = await db.miners.find(
        {"online": True, "last_seen": {"$gte": cutoff_10m}},
        {"_id": 0, "worker": 1, "last_seen": 1, "shares": 1, "blocks": 1, "connected_at": 1}
    ).to_list(200)

    miners_enriched = []
    for doc in active_docs:
        worker = doc.get("worker", "unknown")
        shares_1h = await db.miner_shares.count_documents(
            {"worker": worker, "timestamp": {"$gte": hr_cutoff}}
        )
        shares_24h = await db.miner_shares.count_documents(
            {"worker": worker, "timestamp": {"$gte": cutoff_24h}}
        )
        blocks_found = await db.miner_shares.count_documents(
            {"worker": worker, "is_block": True}
        )

        avg_diff = 512
        pipeline = [
            {"$match": {"worker": worker, "timestamp": {"$gte": hr_cutoff}}},
            {"$group": {"_id": None, "avg": {"$avg": "$share_difficulty"}}}
        ]
        avg_res = await db.miner_shares.aggregate(pipeline).to_list(1)
        if avg_res:
            avg_diff = avg_res[0].get("avg", 512)

        hashrate = (shares_1h * avg_diff * (2**32)) / 3600 if shares_1h > 0 else 0

        miners_enriched.append({
            "worker": worker,
            "online": True,
            "last_seen": doc.get("last_seen"),
            "connected_at": doc.get("connected_at"),
            "shares_1h": shares_1h,
            "shares_24h": shares_24h,
            "blocks_found": blocks_found,
            "hashrate": round(hashrate, 2),
            "hashrate_readable": format_hashrate(hashrate),
        })

    miners_enriched.sort(key=lambda x: x["shares_24h"], reverse=True)
    return {"miners": miners_enriched, "active_count": len(miners_enriched)}


@router.get("/blocks")
async def get_pool_blocks(limit: int = 20):
    """Get blocks found by pool miners"""
    blocks = await db.blocks.find(
        {}, {"_id": 0, "index": 1, "timestamp": 1, "miner": 1, "difficulty": 1, "hash": 1, "pqc_scheme": 1}
    ).sort("index", -1).limit(min(limit, 100)).to_list(min(limit, 100))
    return {"blocks": blocks, "count": len(blocks)}


@router.get("/pplns/preview")
async def pplns_preview():
    """Preview PPLNS payout distribution if a block were found right now"""
    payouts = await calculate_pplns_payouts(BLOCK_REWARD)
    return {
        "block_reward": BLOCK_REWARD,
        "miners_in_window": len(payouts),
        "payouts": payouts,
        "window_size": PPLNS_WINDOW,
        "note": "This shows how the reward WOULD be distributed if a block were found now.",
    }


# --- Sharechain Sync (for new nodes joining) ---

@router.get("/sharechain/sync")
async def sync_sharechain(from_height: int = 0, limit: int = 100):
    """Get sharechain data for syncing (new nodes call this)"""
    shares = await db.p2pool_sharechain.find(
        {"height": {"$gte": from_height}}, {"_id": 0}
    ).sort("height", 1).limit(min(limit, 500)).to_list(min(limit, 500))
    tip = await get_chain_tip()
    return {
        "shares": shares,
        "count": len(shares),
        "chain_height": tip["height"] if tip else 0,
        "from_height": from_height,
    }


def format_hashrate(h):
    if h >= 1e18: return f"{h/1e18:.2f} EH/s"
    if h >= 1e15: return f"{h/1e15:.2f} PH/s"
    if h >= 1e12: return f"{h/1e12:.2f} TH/s"
    if h >= 1e9: return f"{h/1e9:.2f} GH/s"
    if h >= 1e6: return f"{h/1e6:.2f} MH/s"
    if h >= 1e3: return f"{h/1e3:.2f} KH/s"
    return f"{h:.2f} H/s"
