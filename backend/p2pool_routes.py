"""
BricsCoin P2Pool - Decentralized Mining Pool
Peer-to-peer mining coordination without a central pool operator.
Solo payout: whoever finds the block keeps the full reward.

The P2Pool tracks:
- Connected peer nodes
- Sharechain (shares submitted by all miners across peers)
- Pool-wide statistics and hashrate
- Miner performance rankings
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import hashlib
import uuid
import httpx
import asyncio
import logging

logger = logging.getLogger("p2pool")

router = APIRouter(prefix="/api/p2pool", tags=["P2Pool"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

BRICS_NODE_URL = os.environ.get('BRICS_NODE_URL', '')

# P2Pool constants
SHARECHAIN_WINDOW = 2016  # shares to keep in the window
PEER_TIMEOUT = 600  # 10 minutes before peer considered offline
MAX_PEERS = 50


class PeerRegister(BaseModel):
    node_url: str = Field(..., min_length=5)
    node_id: Optional[str] = None
    version: str = "1.0.0"
    stratum_port: int = 3333


class ShareSubmit(BaseModel):
    peer_id: str
    worker: str
    share_hash: str
    share_difficulty: float
    block_height: int
    timestamp: Optional[str] = None


# ==================== PEER MANAGEMENT ====================

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
            "last_seen": now,
            "online": True,
            "registered_at": now,
        }},
        upsert=True
    )

    # Get list of known peers to share
    peers = await db.p2pool_peers.find(
        {"online": True},
        {"_id": 0, "node_url": 1, "peer_id": 1, "stratum_port": 1}
    ).limit(MAX_PEERS).to_list(MAX_PEERS)

    return {
        "peer_id": peer_id,
        "message": "Peer registered successfully",
        "known_peers": peers,
        "pool_info": {
            "version": "1.0.0",
            "payout_scheme": "SOLO",
            "sharechain_window": SHARECHAIN_WINDOW,
        }
    }


@router.post("/peer/heartbeat")
async def peer_heartbeat(peer_id: str, miners_count: int = 0, hashrate: float = 0):
    """Update peer heartbeat"""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.p2pool_peers.update_one(
        {"peer_id": peer_id},
        {"$set": {
            "last_seen": now,
            "online": True,
            "miners_count": miners_count,
            "hashrate": hashrate,
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Peer not found. Register first.")
    return {"status": "ok", "timestamp": now}


@router.get("/peers")
async def list_peers():
    """List all known P2Pool peers"""
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=PEER_TIMEOUT)).isoformat()

    # Mark stale peers offline
    await db.p2pool_peers.update_many(
        {"last_seen": {"$lt": cutoff}, "online": True},
        {"$set": {"online": False}}
    )

    all_peers = await db.p2pool_peers.find({}, {"_id": 0}).sort("last_seen", -1).to_list(MAX_PEERS)
    online = [p for p in all_peers if p.get("online")]
    offline = [p for p in all_peers if not p.get("online")]

    return {
        "peers": all_peers,
        "online_count": len(online),
        "offline_count": len(offline),
        "total": len(all_peers),
    }


# ==================== SHARECHAIN ====================

@router.post("/share/submit")
async def submit_share(share: ShareSubmit):
    """Submit a share to the P2Pool sharechain"""
    now = share.timestamp or datetime.now(timezone.utc).isoformat()
    share_id = hashlib.sha256(f"{share.share_hash}{share.worker}{now}".encode()).hexdigest()[:16]

    await db.p2pool_shares.insert_one({
        "share_id": share_id,
        "peer_id": share.peer_id,
        "worker": share.worker,
        "share_hash": share.share_hash,
        "share_difficulty": share.share_difficulty,
        "block_height": share.block_height,
        "timestamp": now,
    })

    return {"share_id": share_id, "accepted": True}


@router.get("/sharechain")
async def get_sharechain(limit: int = 50):
    """Get recent shares from the sharechain"""
    shares = await db.p2pool_shares.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(min(limit, 200)).to_list(min(limit, 200))
    total = await db.p2pool_shares.count_documents({})
    return {"shares": shares, "count": len(shares), "total": total}


# ==================== POOL STATISTICS ====================

@router.get("/stats")
async def get_pool_stats():
    """Get comprehensive P2Pool statistics"""
    now = datetime.now(timezone.utc)

    # Peer stats
    cutoff = (now - timedelta(seconds=PEER_TIMEOUT)).isoformat()
    await db.p2pool_peers.update_many(
        {"last_seen": {"$lt": cutoff}, "online": True},
        {"$set": {"online": False}}
    )
    online_peers = await db.p2pool_peers.count_documents({"online": True})
    total_peers = await db.p2pool_peers.count_documents({})

    # Miner stats from Stratum (existing collections)
    miner_cutoff = (now - timedelta(minutes=10)).isoformat()
    active_miners_docs = await db.miners.find(
        {"online": True, "last_seen": {"$gte": miner_cutoff}},
        {"_id": 0}
    ).to_list(1000)
    active_miners = len(active_miners_docs)

    # Shares in last 24h
    shares_24h_cutoff = (now - timedelta(hours=24)).isoformat()
    shares_24h = await db.miner_shares.count_documents(
        {"timestamp": {"$gte": shares_24h_cutoff}}
    )

    # Shares in last hour (for hashrate estimation)
    shares_1h_cutoff = (now - timedelta(hours=1)).isoformat()
    shares_1h = await db.miner_shares.count_documents(
        {"timestamp": {"$gte": shares_1h_cutoff}}
    )

    # Blocks found in last 24h
    blocks_24h = await db.miner_shares.count_documents(
        {"timestamp": {"$gte": shares_24h_cutoff}, "is_block": True}
    )

    # Total blocks
    total_blocks = await db.blocks.count_documents({})

    # Last block info
    last_block = await db.blocks.find_one(
        {}, {"_id": 0, "index": 1, "timestamp": 1, "miner": 1, "difficulty": 1, "hash": 1},
        sort=[("index", -1)]
    )

    # Network difficulty
    difficulty = last_block.get("difficulty", 1) if last_block else 1

    # Pool hashrate estimation from shares
    # Hashrate = (shares * share_difficulty * 2^32) / time_seconds
    avg_share_diff = 512  # default share difficulty
    if shares_1h > 0:
        pipeline = [
            {"$match": {"timestamp": {"$gte": shares_1h_cutoff}}},
            {"$group": {"_id": None, "avg_diff": {"$avg": "$share_difficulty"}}}
        ]
        avg_result = await db.miner_shares.aggregate(pipeline).to_list(1)
        if avg_result:
            avg_share_diff = avg_result[0].get("avg_diff", 512)

    pool_hashrate = (shares_1h * avg_share_diff * (2**32)) / 3600 if shares_1h > 0 else 0

    # Top miners (last 24h)
    top_miners_pipeline = [
        {"$match": {"timestamp": {"$gte": shares_24h_cutoff}}},
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
    top_miners = await db.miner_shares.aggregate(top_miners_pipeline).to_list(20)

    return {
        "pool": {
            "name": "BricsCoin P2Pool",
            "version": "1.0.0",
            "payout_scheme": "SOLO",
            "description": "Decentralized peer-to-peer mining pool. Finder keeps the full block reward.",
        },
        "network": {
            "difficulty": difficulty,
            "total_blocks": total_blocks,
            "last_block": last_block,
            "block_reward": 50.0,
        },
        "peers": {
            "online": online_peers,
            "total": total_peers,
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
    }


@router.get("/miners")
async def get_pool_miners():
    """Get detailed miner stats for the pool"""
    now = datetime.now(timezone.utc)
    cutoff_24h = (now - timedelta(hours=24)).isoformat()
    cutoff_10m = (now - timedelta(minutes=10)).isoformat()

    # Active miners from stratum
    active_docs = await db.miners.find(
        {"online": True, "last_seen": {"$gte": cutoff_10m}},
        {"_id": 0, "worker": 1, "last_seen": 1, "shares": 1, "blocks": 1, "connected_at": 1}
    ).to_list(200)

    # Enrich with share stats
    miners_enriched = []
    for doc in active_docs:
        worker = doc.get("worker", "unknown")
        # Count shares last hour for hashrate
        hr_cutoff = (now - timedelta(hours=1)).isoformat()
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

    return {
        "miners": miners_enriched,
        "active_count": len(miners_enriched),
    }


@router.get("/blocks")
async def get_pool_blocks(limit: int = 20):
    """Get blocks found by pool miners"""
    blocks = await db.blocks.find(
        {}, {"_id": 0, "index": 1, "timestamp": 1, "miner": 1, "difficulty": 1, "hash": 1, "pqc_scheme": 1}
    ).sort("index", -1).limit(min(limit, 100)).to_list(min(limit, 100))

    return {"blocks": blocks, "count": len(blocks)}


def format_hashrate(h):
    """Format hashrate in human readable form"""
    if h >= 1e18:
        return f"{h/1e18:.2f} EH/s"
    if h >= 1e15:
        return f"{h/1e15:.2f} PH/s"
    if h >= 1e12:
        return f"{h/1e12:.2f} TH/s"
    if h >= 1e9:
        return f"{h/1e9:.2f} GH/s"
    if h >= 1e6:
        return f"{h/1e6:.2f} MH/s"
    if h >= 1e3:
        return f"{h/1e3:.2f} KH/s"
    return f"{h:.2f} H/s"
