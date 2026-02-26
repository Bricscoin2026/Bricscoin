"""
BricsCoin Merge Mining (AuxPoW) API Routes
============================================
Provides endpoints for merge-mining pools to:
1. Get work (BricsCoin block hash to embed in parent coinbase)
2. Submit AuxPoW proof (parent block header + coinbase + merkle branch)
3. Query merge mining statistics
"""

import logging
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from auxpow_engine import (
    validate_auxpow, is_auxpow_block, create_auxpow_commitment,
    AUXPOW_CHAIN_ID, single_sha256,
)

logger = logging.getLogger("auxpow_routes")

router = APIRouter(prefix="/api/auxpow", tags=["Merge Mining"])

# Database reference (set from server.py)
_db = None
_get_difficulty = None
_get_mining_reward = None
_auto_checkpoint = None
_broadcast_to_peers = None
_node_id = None
_node_pqc_keys = None


def init_auxpow(db, get_difficulty_fn, get_mining_reward_fn,
                auto_checkpoint_fn, broadcast_fn, node_id, pqc_keys_ref):
    """Initialize module with shared dependencies from server.py"""
    global _db, _get_difficulty, _get_mining_reward
    global _auto_checkpoint, _broadcast_to_peers, _node_id, _node_pqc_keys
    _db = db
    _get_difficulty = get_difficulty_fn
    _get_mining_reward = get_mining_reward_fn
    _auto_checkpoint = auto_checkpoint_fn
    _broadcast_to_peers = broadcast_fn
    _node_id = node_id
    _node_pqc_keys = pqc_keys_ref


# ==================== MODELS ====================

class AuxPowSubmission(BaseModel):
    """Submission from a merge-mining pool."""
    parent_header: str = Field(..., description="Bitcoin block header (160 hex chars)")
    coinbase_tx: str = Field(..., description="Bitcoin coinbase transaction (hex)")
    coinbase_branch: List[str] = Field(default=[], description="Merkle branch of coinbase in parent block")
    coinbase_index: int = Field(default=0, description="Index of coinbase in merkle tree")
    blockchain_branch: List[str] = Field(default=[], description="Merged mining tree branch")
    blockchain_index: int = Field(default=0, description="Index in merged mining tree")
    parent_chain: str = Field(default="bitcoin", description="Parent chain identifier")
    miner_address: str = Field(..., description="BricsCoin address to receive the reward")
    block_hash: str = Field(..., description="The BricsCoin block hash that was committed")


# ==================== ENDPOINTS ====================

@router.get("/create-work")
async def create_auxpow_work(miner_address: str = ""):
    """
    Create merge mining work for a pool.

    Returns:
    - BricsCoin block template hash to embed in parent coinbase
    - The commitment data (hex) to insert in coinbase scriptSig
    - Current difficulty target
    """
    if _db is None:
        raise HTTPException(status_code=500, detail="AuxPoW not initialized")

    last_block = await _db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        raise HTTPException(status_code=500, detail="No genesis block found")

    new_index = last_block["index"] + 1
    difficulty = await _get_difficulty()
    reward = _get_mining_reward(new_index)
    timestamp = datetime.now(timezone.utc).isoformat()

    # Get pending transactions
    pending_txs = await _db.transactions.find(
        {"confirmed": False}, {"_id": 0}
    ).limit(100).to_list(100)

    # Compute BricsCoin block hash (the hash that needs to be committed)
    block_data = f"{new_index}{timestamp}{json.dumps(pending_txs, sort_keys=True)}{last_block['hash']}"
    bricscoin_hash = single_sha256(block_data)

    # Create the commitment for the parent coinbase
    commitment = create_auxpow_commitment(bricscoin_hash)

    # Store the work template for later validation
    work_id = str(uuid.uuid4())[:8]
    await _db.auxpow_work.insert_one({
        "work_id": work_id,
        "block_index": new_index,
        "block_hash": bricscoin_hash,
        "block_data": block_data,
        "previous_hash": last_block["hash"],
        "difficulty": difficulty,
        "reward": reward,
        "timestamp": timestamp,
        "transactions": pending_txs,
        "miner_address": miner_address,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "used": False,
    })

    return {
        "work_id": work_id,
        "block_index": new_index,
        "block_hash": bricscoin_hash,
        "coinbase_commitment": commitment,
        "coinbase_commitment_ascii": f"BRIC{bricscoin_hash}",
        "difficulty": difficulty,
        "target": format(0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF // max(1, difficulty), '064x'),
        "reward": reward,
        "previous_hash": last_block["hash"],
        "chain_id": AUXPOW_CHAIN_ID,
        "instructions": {
            "step_1": "Embed 'coinbase_commitment' bytes in your Bitcoin coinbase scriptSig",
            "step_2": "Mine Bitcoin as normal",
            "step_3": "If Bitcoin block hash meets BricsCoin difficulty target, submit proof to /api/auxpow/submit",
            "step_4": "Include parent_header (80 bytes hex), coinbase_tx, and coinbase merkle branch",
        }
    }


@router.post("/submit")
async def submit_auxpow_block(submission: AuxPowSubmission):
    """
    Submit an AuxPoW proof from a merge-mining pool.

    The pool provides:
    - The parent (Bitcoin) block header proving PoW
    - The coinbase tx containing BricsCoin hash
    - Merkle branches proving the coinbase is in the parent block
    """
    if _db is None:
        raise HTTPException(status_code=500, detail="AuxPoW not initialized")

    # Find the work template for this block hash
    work = await _db.auxpow_work.find_one(
        {"block_hash": submission.block_hash, "used": False},
        {"_id": 0}
    )
    if not work:
        raise HTTPException(
            status_code=404,
            detail="Work template not found or already used. Request new work via /api/auxpow/create-work"
        )

    difficulty = work["difficulty"]

    # Validate the AuxPoW proof
    auxpow_data = {
        "parent_header": submission.parent_header,
        "coinbase_tx": submission.coinbase_tx,
        "coinbase_branch": submission.coinbase_branch,
        "coinbase_index": submission.coinbase_index,
        "blockchain_branch": submission.blockchain_branch,
        "blockchain_index": submission.blockchain_index,
        "parent_chain": submission.parent_chain,
    }

    result = validate_auxpow(auxpow_data, submission.block_hash, difficulty)

    if not result["valid"]:
        logger.warning(f"AuxPoW REJECTED: {result['reason']}")
        raise HTTPException(status_code=400, detail=result["reason"])

    # Check if block already exists
    block_index = work["block_index"]
    existing = await _db.blocks.find_one({"index": block_index})
    if existing:
        # Mark work as used
        await _db.auxpow_work.update_one(
            {"work_id": work["work_id"]}, {"$set": {"used": True}}
        )
        raise HTTPException(status_code=409, detail="Block already mined at this height")

    # Build the BricsCoin block with AuxPoW data
    miner_address = submission.miner_address or work.get("miner_address", "unknown")
    reward = work["reward"]
    timestamp = work["timestamp"]
    pending_txs = work.get("transactions", [])

    # Create reward transaction
    reward_tx = {
        "id": str(uuid.uuid4()),
        "sender": "COINBASE",
        "recipient": miner_address,
        "amount": reward,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "signature": "AUXPOW_MERGE_MINED",
        "type": "mining_reward",
        "confirmed": True,
        "block_index": block_index,
    }

    block_transactions = pending_txs.copy()
    block_transactions.insert(0, {
        "id": reward_tx["id"],
        "sender": "COINBASE",
        "recipient": miner_address,
        "amount": reward,
        "type": "mining_reward",
    })

    # PQC block signing
    pqc_sig = {}
    if _node_pqc_keys:
        try:
            from pqc_crypto import hybrid_sign
            sig_data = f"{block_index}{timestamp}{submission.block_hash}{miner_address}"
            sig = hybrid_sign(
                _node_pqc_keys["ecdsa_private_key"],
                _node_pqc_keys["dilithium_secret_key"],
                sig_data,
            )
            pqc_sig = {
                "pqc_ecdsa_signature": sig["ecdsa_signature"],
                "pqc_dilithium_signature": sig["dilithium_signature"],
                "pqc_public_key_ecdsa": _node_pqc_keys["ecdsa_public_key"],
                "pqc_public_key_dilithium": _node_pqc_keys["dilithium_public_key"],
                "pqc_scheme": "ecdsa_secp256k1+ml-dsa-65",
            }
        except Exception as e:
            logger.error(f"PQC signing failed for AuxPoW block: {e}")

    new_block = {
        "index": block_index,
        "timestamp": timestamp,
        "transactions": block_transactions,
        "proof": 0,
        "previous_hash": work["previous_hash"],
        "nonce": 0,
        "miner": miner_address,
        "difficulty": difficulty,
        "hash": submission.block_hash,
        "block_type": "auxpow",
        "auxpow": {
            "parent_header": submission.parent_header,
            "parent_hash": result["parent_hash"],
            "coinbase_tx": submission.coinbase_tx,
            "coinbase_branch": submission.coinbase_branch,
            "coinbase_index": submission.coinbase_index,
            "blockchain_branch": submission.blockchain_branch,
            "blockchain_index": submission.blockchain_index,
            "parent_chain": submission.parent_chain,
        },
        **pqc_sig,
    }

    # Save block
    await _db.blocks.insert_one(new_block)

    # Save reward transaction
    await _db.transactions.insert_one(reward_tx)

    # Confirm pending transactions
    tx_ids = [tx.get("id", tx.get("tx_id")) for tx in pending_txs if tx.get("id") or tx.get("tx_id")]
    if tx_ids:
        await _db.transactions.update_many(
            {"$or": [{"id": {"$in": tx_ids}}, {"tx_id": {"$in": tx_ids}}]},
            {"$set": {"confirmed": True, "block_index": block_index}},
        )

    # Mark work as used
    await _db.auxpow_work.update_one(
        {"work_id": work["work_id"]}, {"$set": {"used": True}}
    )

    # Auto checkpoint
    if _auto_checkpoint:
        await _auto_checkpoint()

    # Broadcast to peers
    block_to_broadcast = {k: v for k, v in new_block.items() if k != "_id"}
    if _broadcast_to_peers and _node_id:
        import asyncio
        asyncio.create_task(_broadcast_to_peers(
            "broadcast/block",
            {"block": block_to_broadcast, "sender_node_id": _node_id},
        ))

    logger.info(
        f"AuxPoW Block #{block_index} ACCEPTED! "
        f"Miner: {miner_address}, Parent: {result['parent_hash'][:16]}..., "
        f"Reward: {reward} BRICS"
    )

    return {
        "success": True,
        "block_index": block_index,
        "block_hash": submission.block_hash,
        "parent_hash": result["parent_hash"],
        "miner": miner_address,
        "reward": reward,
        "block_type": "auxpow",
    }


@router.get("/status")
async def get_auxpow_status():
    """Get merge mining status and statistics."""
    if _db is None:
        raise HTTPException(status_code=500, detail="AuxPoW not initialized")

    total_blocks = await _db.blocks.count_documents({})
    auxpow_blocks = await _db.blocks.count_documents({"block_type": "auxpow"})
    native_blocks = total_blocks - auxpow_blocks
    pending_work = await _db.auxpow_work.count_documents({"used": False})

    # Get last AuxPoW block
    last_auxpow = await _db.blocks.find_one(
        {"block_type": "auxpow"}, {"_id": 0, "index": 1, "hash": 1, "miner": 1, "timestamp": 1, "auxpow.parent_hash": 1},
        sort=[("index", -1)]
    )

    difficulty = await _get_difficulty() if _get_difficulty else 0

    return {
        "merge_mining_enabled": True,
        "chain_id": AUXPOW_CHAIN_ID,
        "supported_parent_chains": ["bitcoin"],
        "current_difficulty": difficulty,
        "statistics": {
            "total_blocks": total_blocks,
            "auxpow_blocks": auxpow_blocks,
            "native_blocks": native_blocks,
            "auxpow_percentage": round(auxpow_blocks / max(1, total_blocks) * 100, 2),
            "pending_work_items": pending_work,
        },
        "last_auxpow_block": {
            "index": last_auxpow["index"] if last_auxpow else None,
            "hash": last_auxpow["hash"][:16] + "..." if last_auxpow else None,
            "miner": last_auxpow["miner"] if last_auxpow else None,
            "parent_hash": last_auxpow.get("auxpow", {}).get("parent_hash", "")[:16] + "..." if last_auxpow else None,
            "timestamp": last_auxpow["timestamp"] if last_auxpow else None,
        },
        "how_to_merge_mine": {
            "step_1": "GET /api/auxpow/create-work?miner_address=YOUR_BRICS_ADDRESS",
            "step_2": "Embed 'coinbase_commitment' in your Bitcoin coinbase scriptSig",
            "step_3": "Mine Bitcoin normally",
            "step_4": "POST /api/auxpow/submit with parent block proof",
        },
    }


@router.get("/work-history")
async def get_work_history(limit: int = 20):
    """Get recent AuxPoW work items and their status."""
    if _db is None:
        raise HTTPException(status_code=500, detail="AuxPoW not initialized")

    works = await _db.auxpow_work.find(
        {}, {"_id": 0, "work_id": 1, "block_index": 1, "difficulty": 1,
             "miner_address": 1, "created_at": 1, "used": 1}
    ).sort("created_at", -1).limit(min(limit, 100)).to_list(min(limit, 100))

    return {"work_items": works, "count": len(works)}
