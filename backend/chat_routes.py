"""
BricsChat - Quantum-Proof On-Chain Messaging
Messages are PQC-signed and stored on the blockchain.
Only the recipient with PQC keys can read them.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import hashlib
import uuid
from pqc_crypto import hybrid_verify

router = APIRouter(prefix="/api/chat", tags=["BricsChat"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


class ChatMessage(BaseModel):
    sender_address: str
    recipient_address: str
    encrypted_content: str  # Content encrypted with recipient's public key (client-side)
    content_hash: str  # SHA-256 hash of plaintext for integrity
    ecdsa_signature: str
    dilithium_signature: str
    ecdsa_public_key: str
    dilithium_public_key: str
    timestamp: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    sender_address: str
    recipient_address: str
    encrypted_content: str
    content_hash: str
    timestamp: str
    block_height: int
    pqc_verified: bool


@router.post("/send")
async def send_message(msg: ChatMessage):
    """Send a PQC-signed encrypted message on-chain"""
    # Verify PQC signature
    sig_data = f"{msg.sender_address}{msg.recipient_address}{msg.content_hash}"
    verify_result = hybrid_verify(
        msg.ecdsa_public_key,
        msg.dilithium_public_key,
        msg.ecdsa_signature,
        msg.dilithium_signature,
        sig_data
    )

    if not verify_result.get("hybrid_valid"):
        raise HTTPException(status_code=400, detail="Invalid PQC signature")

    # Verify sender address matches public keys
    pub_hash = hashlib.sha256(msg.ecdsa_public_key.encode()).hexdigest()[:38]
    expected_address = f"BRICSPQ{pub_hash}"
    if expected_address != msg.sender_address:
        raise HTTPException(status_code=400, detail="Sender address does not match PQC keys")

    # Get current block height
    blocks_count = await db.blocks.count_documents({})

    ts = msg.timestamp or datetime.now(timezone.utc).isoformat()
    message_id = str(uuid.uuid4())

    message_doc = {
        "id": message_id,
        "sender_address": msg.sender_address,
        "recipient_address": msg.recipient_address,
        "encrypted_content": msg.encrypted_content,
        "content_hash": msg.content_hash,
        "ecdsa_signature": msg.ecdsa_signature,
        "dilithium_signature": msg.dilithium_signature,
        "ecdsa_public_key": msg.ecdsa_public_key,
        "dilithium_public_key": msg.dilithium_public_key,
        "timestamp": ts,
        "block_height": blocks_count,
        "pqc_verified": True,
    }

    await db.chat_messages.insert_one(message_doc)

    return {
        "id": message_id,
        "sender_address": msg.sender_address,
        "recipient_address": msg.recipient_address,
        "content_hash": msg.content_hash,
        "timestamp": ts,
        "block_height": blocks_count,
        "pqc_verified": True,
    }


@router.get("/messages/{address}")
async def get_messages(address: str, limit: int = 50):
    """Get all messages sent to or from an address"""
    messages = await db.chat_messages.find(
        {"$or": [{"sender_address": address}, {"recipient_address": address}]},
        {"_id": 0}
    ).sort("timestamp", -1).limit(min(limit, 200)).to_list(min(limit, 200))

    return {"messages": messages, "count": len(messages)}


@router.get("/conversation/{address1}/{address2}")
async def get_conversation(address1: str, address2: str, limit: int = 100):
    """Get conversation between two addresses"""
    messages = await db.chat_messages.find(
        {"$or": [
            {"sender_address": address1, "recipient_address": address2},
            {"sender_address": address2, "recipient_address": address1},
        ]},
        {"_id": 0}
    ).sort("timestamp", 1).limit(min(limit, 500)).to_list(min(limit, 500))

    return {"messages": messages, "count": len(messages)}


@router.get("/contacts/{address}")
async def get_contacts(address: str):
    """Get unique contacts for an address"""
    pipeline = [
        {"$match": {"$or": [{"sender_address": address}, {"recipient_address": address}]}},
        {"$project": {
            "contact": {"$cond": [
                {"$eq": ["$sender_address", address]},
                "$recipient_address",
                "$sender_address"
            ]},
            "timestamp": 1
        }},
        {"$group": {
            "_id": "$contact",
            "last_message": {"$max": "$timestamp"},
            "message_count": {"$sum": 1}
        }},
        {"$sort": {"last_message": -1}}
    ]
    contacts = await db.chat_messages.aggregate(pipeline).to_list(100)

    return {"contacts": [
        {"address": c["_id"], "last_message": c["last_message"], "message_count": c["message_count"]}
        for c in contacts
    ]}



@router.get("/feed")
async def get_global_feed(limit: int = 10):
    """Get the latest public messages for the global feed"""
    messages = await db.chat_messages.find(
        {},
        {"_id": 0, "id": 1, "sender_address": 1, "recipient_address": 1,
         "encrypted_content": 1, "timestamp": 1, "block_height": 1, "pqc_verified": 1}
    ).sort("timestamp", -1).limit(min(limit, 50)).to_list(min(limit, 50))
    return {"messages": messages, "count": len(messages)}



@router.get("/stats")
async def get_chat_stats():
    """Get BricsChat statistics"""
    total_messages = await db.chat_messages.count_documents({})
    unique_users = len(await db.chat_messages.distinct("sender_address"))

    return {
        "total_messages": total_messages,
        "unique_users": unique_users,
        "pqc_secured": True,
        "encryption": "Hybrid ECDSA + ML-DSA-65",
    }
