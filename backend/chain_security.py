"""
BricsCoin Chain Security Module
================================
A) Checkpoint System — Freezes blocks periodically. No reorg can go past a checkpoint.
B) Deep Reorganization Rejection — Rejects chains that try to reorg more than MAX_REORG_DEPTH blocks.

Together, these protect a young chain with low hashrate against 51% attacks.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("chain_security")

# ─── Configuration ───
MAX_REORG_DEPTH = 10          # Max blocks a reorg can replace
CHECKPOINT_INTERVAL = 50      # Create a checkpoint every N blocks
CHECKPOINT_CONFIRMATIONS = 20 # Block needs N confirmations before checkpoint

_db = None


def set_db(database):
    global _db
    _db = database


async def get_db():
    return _db


# ═══════════════════════════════════════════
# A) CHECKPOINT SYSTEM
# ═══════════════════════════════════════════

async def create_checkpoint(block_index: int, block_hash: str, reason: str = "automatic") -> dict:
    """Create a checkpoint for a specific block. Once checkpointed, this block cannot be replaced."""
    db = await get_db()

    existing = await db.checkpoints.find_one({"block_index": block_index})
    if existing:
        return {"status": "already_exists", "checkpoint": {"block_index": block_index, "block_hash": existing["block_hash"]}}

    checkpoint = {
        "block_index": block_index,
        "block_hash": block_hash,
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.checkpoints.insert_one(checkpoint)
    logger.info(f"CHECKPOINT created: block #{block_index} hash={block_hash[:16]}... reason={reason}")
    return {"status": "created", "checkpoint": {"block_index": block_index, "block_hash": block_hash}}


async def auto_checkpoint():
    """Automatically create checkpoints for confirmed blocks at regular intervals."""
    db = await get_db()
    chain_height = await db.blocks.count_documents({})

    if chain_height < CHECKPOINT_CONFIRMATIONS:
        return 0

    # Checkpoint blocks that have enough confirmations
    safe_height = chain_height - CHECKPOINT_CONFIRMATIONS
    last_checkpoint = await db.checkpoints.find_one(sort=[("block_index", -1)])
    last_cp_index = last_checkpoint["block_index"] if last_checkpoint else 0

    created = 0
    # Create checkpoints at every CHECKPOINT_INTERVAL from the last checkpoint
    next_cp = last_cp_index + CHECKPOINT_INTERVAL
    while next_cp <= safe_height:
        block = await db.blocks.find_one({"index": next_cp}, {"_id": 0, "index": 1, "hash": 1})
        if block:
            await create_checkpoint(block["index"], block["hash"], reason="automatic_interval")
            created += 1
        next_cp += CHECKPOINT_INTERVAL

    return created


async def get_checkpoints(limit: int = 50) -> list:
    """Get all checkpoints ordered by block index."""
    db = await get_db()
    checkpoints = await db.checkpoints.find(
        {}, {"_id": 0}
    ).sort("block_index", -1).limit(limit).to_list(limit)
    return checkpoints


async def get_latest_checkpoint() -> Optional[dict]:
    """Get the most recent checkpoint."""
    db = await get_db()
    return await db.checkpoints.find_one(sort=[("block_index", -1)], projection={"_id": 0})


async def validate_against_checkpoints(blocks: list) -> dict:
    """
    Validate a list of blocks against existing checkpoints.
    Returns {'valid': True/False, 'violation': ...}
    """
    db = await get_db()
    checkpoints = await db.checkpoints.find({}, {"_id": 0}).to_list(500)
    cp_map = {cp["block_index"]: cp["block_hash"] for cp in checkpoints}

    for block in blocks:
        idx = block.get("index")
        if idx in cp_map:
            if block.get("hash") != cp_map[idx]:
                logger.warning(
                    f"CHECKPOINT VIOLATION: block #{idx} hash={block.get('hash', '?')[:16]}... "
                    f"expected={cp_map[idx][:16]}..."
                )
                return {
                    "valid": False,
                    "violation": {
                        "block_index": idx,
                        "expected_hash": cp_map[idx],
                        "received_hash": block.get("hash"),
                        "reason": "Block contradicts checkpoint",
                    }
                }
    return {"valid": True}


# ═══════════════════════════════════════════
# B) DEEP REORGANIZATION REJECTION
# ═══════════════════════════════════════════

async def check_reorg_depth(peer_blocks: list, our_height: int) -> dict:
    """
    Check if accepting peer blocks would cause a reorg deeper than MAX_REORG_DEPTH.

    A deep reorg means the peer is proposing to replace blocks we already have.
    If the fork point is more than MAX_REORG_DEPTH blocks behind our tip, reject.
    """
    db = await get_db()

    if not peer_blocks:
        return {"allowed": True, "reorg_depth": 0}

    # Find the fork point: the lowest block index in the peer chain
    # that conflicts with our chain
    reorg_depth = 0

    for block in sorted(peer_blocks, key=lambda b: b.get("index", 0)):
        idx = block.get("index")
        if idx is None:
            continue

        our_block = await db.blocks.find_one({"index": idx}, {"_id": 0, "hash": 1})
        if our_block and our_block.get("hash") != block.get("hash"):
            # This block conflicts — count the reorg depth
            reorg_depth = our_height - idx
            break

    if reorg_depth > MAX_REORG_DEPTH:
        logger.warning(
            f"DEEP REORG REJECTED: depth={reorg_depth} blocks (max={MAX_REORG_DEPTH}). "
            f"Possible 51% attack attempt!"
        )
        return {
            "allowed": False,
            "reorg_depth": reorg_depth,
            "max_allowed": MAX_REORG_DEPTH,
            "reason": f"Reorganization too deep ({reorg_depth} > {MAX_REORG_DEPTH})",
        }

    return {"allowed": True, "reorg_depth": reorg_depth}


async def can_accept_block(block: dict) -> dict:
    """
    Combined security check for a new block:
    1. Check it doesn't violate any checkpoint
    2. Check it doesn't cause a deep reorganization
    Returns {'accepted': True/False, 'reason': ...}
    """
    db = await get_db()
    our_height = await db.blocks.count_documents({})
    block_index = block.get("index", 0)

    # Check 1: Checkpoint validation
    cp_check = await validate_against_checkpoints([block])
    if not cp_check["valid"]:
        await log_security_event("checkpoint_violation", block, cp_check["violation"])
        return {
            "accepted": False,
            "reason": "CHECKPOINT_VIOLATION",
            "detail": cp_check["violation"],
        }

    # Check 2: Deep reorg detection
    # If this block's index is significantly behind our chain tip
    # and we already have a different block at that index, it's a reorg
    if block_index < our_height:
        existing = await db.blocks.find_one({"index": block_index}, {"_id": 0, "hash": 1})
        if existing and existing.get("hash") != block.get("hash"):
            reorg_depth = our_height - block_index
            if reorg_depth > MAX_REORG_DEPTH:
                await log_security_event("deep_reorg_attempt", block, {
                    "reorg_depth": reorg_depth,
                    "our_height": our_height,
                })
                return {
                    "accepted": False,
                    "reason": "DEEP_REORG_REJECTED",
                    "detail": f"Reorg depth {reorg_depth} exceeds max {MAX_REORG_DEPTH}",
                }

    return {"accepted": True, "reason": "OK"}


# ═══════════════════════════════════════════
# SECURITY EVENT LOGGING
# ═══════════════════════════════════════════

async def log_security_event(event_type: str, block: dict, detail: dict):
    """Log a security event for audit purposes."""
    db = await get_db()
    event = {
        "type": event_type,
        "block_index": block.get("index"),
        "block_hash": block.get("hash", "")[:32],
        "detail": detail,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "severity": "HIGH" if "violation" in event_type or "attack" in event_type else "MEDIUM",
    }
    await db.security_events.insert_one(event)
    logger.warning(f"SECURITY EVENT [{event_type}]: block #{block.get('index')} — {detail}")


async def get_security_events(limit: int = 50) -> list:
    """Get recent security events."""
    db = await get_db()
    events = await db.security_events.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return events


async def get_security_status() -> dict:
    """Get overall chain security status."""
    db = await get_db()
    chain_height = await db.blocks.count_documents({})
    checkpoint_count = await db.checkpoints.count_documents({})
    latest_cp = await get_latest_checkpoint()
    recent_events = await db.security_events.count_documents({})
    high_severity = await db.security_events.count_documents({"severity": "HIGH"})

    return {
        "chain_height": chain_height,
        "max_reorg_depth": MAX_REORG_DEPTH,
        "checkpoint_interval": CHECKPOINT_INTERVAL,
        "checkpoint_confirmations": CHECKPOINT_CONFIRMATIONS,
        "total_checkpoints": checkpoint_count,
        "latest_checkpoint": {
            "block_index": latest_cp["block_index"] if latest_cp else None,
            "block_hash": latest_cp["block_hash"] if latest_cp else None,
        },
        "protected_range": f"Blocks 0 — {latest_cp['block_index'] if latest_cp else 0} are immutable",
        "security_events": {
            "total": recent_events,
            "high_severity": high_severity,
        },
        "protections": {
            "checkpoint_system": "ACTIVE",
            "deep_reorg_rejection": f"ACTIVE (max {MAX_REORG_DEPTH} blocks)",
        },
    }
