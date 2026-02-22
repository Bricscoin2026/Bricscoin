"""
Decentralized Time Capsule
Store encrypted data on-chain that can only be unlocked at a future block height.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import hashlib
import uuid
from pqc_crypto import hybrid_verify

router = APIRouter(prefix="/api/timecapsule", tags=["Time Capsule"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


class TimeCapsuleCreate(BaseModel):
    creator_address: str
    encrypted_content: str  # AES-encrypted content (key derived from block hash at unlock_height)
    content_hash: str  # SHA-256 hash of plaintext for integrity verification after unlock
    unlock_block_height: int  # Block height at which capsule can be opened
    title: str = "Time Capsule"
    description: Optional[str] = None
    recipient_address: Optional[str] = None  # Optional: specific recipient
    ecdsa_signature: str
    dilithium_signature: str
    ecdsa_public_key: str
    dilithium_public_key: str


class TimeCapsuleResponse(BaseModel):
    id: str
    creator_address: str
    title: str
    description: Optional[str]
    unlock_block_height: int
    created_at_block: int
    created_at: str
    is_unlocked: bool
    recipient_address: Optional[str]
    blocks_remaining: int


@router.post("/create")
async def create_capsule(capsule: TimeCapsuleCreate):
    """Create a new time capsule locked until a specific block height"""
    current_height = await db.blocks.count_documents({})

    if capsule.unlock_block_height <= current_height:
        raise HTTPException(
            status_code=400,
            detail=f"Unlock block height must be in the future. Current height: {current_height}"
        )

    # Verify PQC signature
    sig_data = f"{capsule.creator_address}{capsule.content_hash}{capsule.unlock_block_height}"
    verify_result = hybrid_verify(
        capsule.ecdsa_public_key,
        capsule.dilithium_public_key,
        capsule.ecdsa_signature,
        capsule.dilithium_signature,
        sig_data
    )

    if not verify_result.get("hybrid_valid"):
        raise HTTPException(status_code=400, detail="Invalid PQC signature")

    capsule_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    capsule_doc = {
        "id": capsule_id,
        "creator_address": capsule.creator_address,
        "encrypted_content": capsule.encrypted_content,
        "content_hash": capsule.content_hash,
        "unlock_block_height": capsule.unlock_block_height,
        "title": capsule.title,
        "description": capsule.description,
        "recipient_address": capsule.recipient_address,
        "created_at_block": current_height,
        "created_at": now,
        "ecdsa_signature": capsule.ecdsa_signature,
        "dilithium_signature": capsule.dilithium_signature,
        "ecdsa_public_key": capsule.ecdsa_public_key,
        "dilithium_public_key": capsule.dilithium_public_key,
        "pqc_verified": True,
    }

    await db.time_capsules.insert_one(capsule_doc)

    return {
        "id": capsule_id,
        "creator_address": capsule.creator_address,
        "title": capsule.title,
        "description": capsule.description,
        "unlock_block_height": capsule.unlock_block_height,
        "created_at_block": current_height,
        "created_at": now,
        "is_unlocked": False,
        "blocks_remaining": capsule.unlock_block_height - current_height,
    }


@router.get("/get/{capsule_id}")
async def get_capsule(capsule_id: str):
    """Get a time capsule. Content is only returned if the unlock block has been reached."""
    capsule = await db.time_capsules.find_one({"id": capsule_id}, {"_id": 0})
    if not capsule:
        raise HTTPException(status_code=404, detail="Time capsule not found")

    current_height = await db.blocks.count_documents({})
    is_unlocked = current_height >= capsule["unlock_block_height"]

    result = {
        "id": capsule["id"],
        "creator_address": capsule["creator_address"],
        "title": capsule["title"],
        "description": capsule.get("description"),
        "unlock_block_height": capsule["unlock_block_height"],
        "created_at_block": capsule["created_at_block"],
        "created_at": capsule["created_at"],
        "is_unlocked": is_unlocked,
        "recipient_address": capsule.get("recipient_address"),
        "blocks_remaining": max(0, capsule["unlock_block_height"] - current_height),
        "pqc_verified": capsule.get("pqc_verified", False),
    }

    if is_unlocked:
        result["encrypted_content"] = capsule["encrypted_content"]
        result["content_hash"] = capsule["content_hash"]

    return result


@router.get("/list")
async def list_capsules(limit: int = 50, show_unlocked: bool = True):
    """List all time capsules"""
    current_height = await db.blocks.count_documents({})
    query = {}
    if not show_unlocked:
        query["unlock_block_height"] = {"$gt": current_height}

    capsules = await db.time_capsules.find(
        query,
        {"_id": 0, "encrypted_content": 0, "ecdsa_signature": 0,
         "dilithium_signature": 0, "ecdsa_public_key": 0, "dilithium_public_key": 0}
    ).sort("created_at", -1).limit(min(limit, 200)).to_list(min(limit, 200))

    for c in capsules:
        c["is_unlocked"] = current_height >= c["unlock_block_height"]
        c["blocks_remaining"] = max(0, c["unlock_block_height"] - current_height)

    return {"capsules": capsules, "current_block_height": current_height, "count": len(capsules)}


@router.get("/address/{address}")
async def get_capsules_by_address(address: str, limit: int = 50):
    """Get time capsules created by or addressed to a specific address"""
    current_height = await db.blocks.count_documents({})

    capsules = await db.time_capsules.find(
        {"$or": [{"creator_address": address}, {"recipient_address": address}]},
        {"_id": 0, "encrypted_content": 0, "ecdsa_signature": 0,
         "dilithium_signature": 0, "ecdsa_public_key": 0, "dilithium_public_key": 0}
    ).sort("created_at", -1).limit(min(limit, 200)).to_list(min(limit, 200))

    for c in capsules:
        c["is_unlocked"] = current_height >= c["unlock_block_height"]
        c["blocks_remaining"] = max(0, c["unlock_block_height"] - current_height)

    return {"capsules": capsules, "count": len(capsules)}


@router.get("/stats")
async def get_capsule_stats():
    """Get Time Capsule statistics"""
    current_height = await db.blocks.count_documents({})
    total = await db.time_capsules.count_documents({})
    locked = await db.time_capsules.count_documents({"unlock_block_height": {"$gt": current_height}})
    unlocked = total - locked

    return {
        "total_capsules": total,
        "locked": locked,
        "unlocked": unlocked,
        "current_block_height": current_height,
    }
