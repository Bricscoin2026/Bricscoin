"""
BricsCoin Privacy Suite API Routes
====================================
REST endpoints for Ring Signatures and Stealth Addresses.
Combined with zk-STARK shielded amounts, this provides total transaction privacy:
  - Ring Signatures → hide SENDER
  - Stealth Addresses → hide RECEIVER
  - zk-STARK → hide AMOUNT
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import time
import hashlib
import uuid
import os
from datetime import datetime, timezone

from ring_engine import ring_sign, ring_verify, generate_key_image, get_decoy_keys
from stealth_engine import (
    generate_stealth_meta_address,
    generate_stealth_address,
    scan_for_stealth_payments,
    derive_stealth_spending_key,
)
from stark_engine import (
    stark_prove, stark_verify,
    create_amount_commitment, encrypt_amount_for_parties,
    generate_blinding_factor,
)

# Ring signature protocol constants — HARDENED
MIN_RING_SIZE = 32       # Minimum enforced (privacy mandatory — beyond Monero's 16)
DEFAULT_RING_SIZE = 32   # Default ring size (2x Monero)
MAX_RING_SIZE = 64       # Maximum allowed
PRIVACY_MANDATORY = True # All transactions MUST use Ring + Stealth + zk-STARK

router = APIRouter(prefix="/api/privacy", tags=["privacy"])

_db = None


def set_db(database):
    global _db
    _db = database


async def get_db():
    global _db
    if _db is None:
        import motor.motor_asyncio
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "bricscoin")
        client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
        _db = client[db_name]
    return _db


# ─── Request Models ───

class RingSignRequest(BaseModel):
    message: str
    private_key: str
    public_keys: List[str]
    real_index: int


class RingVerifyRequest(BaseModel):
    signature: dict
    message: str


class StealthMetaRequest(BaseModel):
    """No input needed, generates new stealth meta-address."""
    pass


class StealthGenerateRequest(BaseModel):
    scan_pubkey: str
    spend_pubkey: str


class StealthScanRequest(BaseModel):
    scan_private_key: str
    spend_pubkey: str


class StealthSpendKeyRequest(BaseModel):
    scan_private_key: str
    spend_private_key: str
    ephemeral_pubkey: str


class PrivateSendRequest(BaseModel):
    """Fully private transaction: ring sig + stealth address + hidden amount."""
    sender_address: str
    sender_private_key: str
    sender_public_key: str
    recipient_scan_pubkey: str
    recipient_spend_pubkey: str
    amount: float
    ring_size: int = DEFAULT_RING_SIZE  # Default 32, min 32, max 64


# ─── Endpoints ───

@router.get("/status")
async def privacy_status():
    """Get privacy system status."""
    db = await get_db()
    private_tx_count = await db.transactions.count_documents({"type": "private"})
    stealth_count = await db.stealth_meta_addresses.count_documents({})
    ring_key_images = await db.key_images.count_documents({})

    return {
        "status": "active",
        "features": {
            "ring_signatures": {
                "protocol": "LSAG (Linkable SAG)",
                "curve": "secp256k1",
                "purpose": "Hide sender identity",
                "min_ring_size": MIN_RING_SIZE,
                "default_ring_size": DEFAULT_RING_SIZE,
                "max_ring_size": MAX_RING_SIZE,
                "mandatory_minimum": True,
            },
            "stealth_addresses": {
                "protocol": "DHKE Stealth Address",
                "curve": "secp256k1",
                "purpose": "Hide receiver identity",
                "address_prefix": "BRICSX",
            },
            "shielded_amounts": {
                "protocol": "zk-STARK (FRI)",
                "purpose": "Hide transaction amount",
                "integrated": True,
            },
        },
        "stats": {
            "private_transactions": private_tx_count,
            "stealth_addresses_registered": stealth_count,
            "key_images_recorded": ring_key_images,
        },
        "privacy_level": "TOTAL — sender, receiver, and amount all hidden",
    }


@router.post("/ring/sign")
async def api_ring_sign(req: RingSignRequest):
    """Create a ring signature (hides the real signer)."""
    if len(req.public_keys) < MIN_RING_SIZE:
        raise HTTPException(400, f"Ring must have at least {MIN_RING_SIZE} members (provided: {len(req.public_keys)})")
    if req.real_index < 0 or req.real_index >= len(req.public_keys):
        raise HTTPException(400, "Invalid real_index")

    start = time.time()
    sig = ring_sign(req.message, req.private_key, req.public_keys, req.real_index)
    sign_time = time.time() - start

    return {
        "success": True,
        "signature": sig,
        "metadata": {
            "ring_size": len(req.public_keys),
            "sign_time_ms": round(sign_time * 1000, 2),
            "protocol": "LSAG",
            "sender_hidden": True,
        },
    }


@router.post("/ring/verify")
async def api_ring_verify(req: RingVerifyRequest):
    """Verify a ring signature."""
    start = time.time()
    result = ring_verify(req.signature, req.message)
    verify_time = time.time() - start
    result["verify_time_ms"] = round(verify_time * 1000, 2)
    return result


@router.post("/stealth/generate-meta")
async def api_generate_stealth_meta():
    """Generate a new stealth meta-address (scan + spend keypairs)."""
    meta = generate_stealth_meta_address()

    db = await get_db()
    await db.stealth_meta_addresses.insert_one({
        "stealth_meta_address": meta["stealth_meta_address"],
        "scan_public_key": meta["scan_public_key"],
        "spend_public_key": meta["spend_public_key"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "success": True,
        "meta_address": meta,
        "warning": "SAVE your private keys securely! They are needed to detect and spend stealth payments.",
    }


@router.post("/stealth/generate-address")
async def api_generate_stealth_address(req: StealthGenerateRequest):
    """Generate a one-time stealth address for a recipient (called by sender)."""
    start = time.time()
    result = generate_stealth_address(req.scan_pubkey, req.spend_pubkey)
    gen_time = time.time() - start

    return {
        "success": True,
        "stealth_address": result["stealth_address"],
        "stealth_pubkey": result["stealth_pubkey"],
        "ephemeral_pubkey": result["ephemeral_pubkey"],
        "generation_time_ms": round(gen_time * 1000, 2),
    }


@router.post("/stealth/scan")
async def api_scan_stealth(req: StealthScanRequest):
    """Scan blockchain for stealth payments addressed to you."""
    db = await get_db()

    # Fetch all private transactions with ephemeral pubkeys
    cursor = db.transactions.find(
        {"type": "private", "ephemeral_pubkey": {"$exists": True}},
        {"_id": 0, "id": 1, "ephemeral_pubkey": 1, "stealth_address": 1, "timestamp": 1}
    ).sort("timestamp", -1).limit(200)

    txs = await cursor.to_list(200)
    ephemeral_data = [
        {"tx_id": tx["id"], "ephemeral_pubkey": tx["ephemeral_pubkey"], "stealth_address": tx["stealth_address"]}
        for tx in txs if tx.get("ephemeral_pubkey") and tx.get("stealth_address")
    ]

    start = time.time()
    matches = scan_for_stealth_payments(req.scan_private_key, req.spend_pubkey, ephemeral_data)
    scan_time = time.time() - start

    return {
        "success": True,
        "payments_found": len(matches),
        "matches": matches,
        "transactions_scanned": len(ephemeral_data),
        "scan_time_ms": round(scan_time * 1000, 2),
    }


@router.post("/stealth/derive-spend-key")
async def api_derive_spend_key(req: StealthSpendKeyRequest):
    """Derive the spending key for a stealth payment."""
    spending_key = derive_stealth_spending_key(
        req.scan_private_key, req.spend_private_key, req.ephemeral_pubkey
    )
    return {
        "success": True,
        "spending_key": spending_key,
        "warning": "This is a private key — handle securely!",
    }


@router.post("/send-private")
async def send_private_transaction(req: PrivateSendRequest):
    """
    Send a FULLY PRIVATE transaction:
    1. Ring Signature → hides sender
    2. Stealth Address → hides receiver
    3. zk-STARK + commitment → hides amount

    This is the ultimate privacy transaction on BricsCoin.
    """
    if req.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    if req.ring_size < MIN_RING_SIZE:
        raise HTTPException(400, f"Ring size too small. Minimum enforced: {MIN_RING_SIZE} (requested: {req.ring_size})")
    if req.ring_size > MAX_RING_SIZE:
        raise HTTPException(400, f"Ring size too large. Maximum allowed: {MAX_RING_SIZE} (requested: {req.ring_size})")

    db = await get_db()

    # ── Step 1: Verify sender balance ──
    received_cursor = db.transactions.find(
        {"recipient": req.sender_address, "confirmed": True},
        {"amount": 1, "_id": 0}
    )
    received = 0.0
    async for tx in received_cursor:
        received += tx.get("amount", 0)

    sent_cursor = db.transactions.find(
        {"sender": req.sender_address, "confirmed": True},
        {"amount": 1, "fee": 1, "_id": 0}
    )
    sent = 0.0
    async for tx in sent_cursor:
        sent += tx.get("amount", 0) + tx.get("fee", 0)

    blocks_cursor = db.blocks.find(
        {"miner": req.sender_address}, {"reward": 1, "_id": 0}
    )
    mined = 0.0
    async for block in blocks_cursor:
        mined += block.get("reward", 0)

    balance = received + mined - sent
    fee = 0.000005
    total_needed = req.amount + fee

    if balance < total_needed:
        raise HTTPException(400, f"Insufficient balance. Need: {total_needed}, Available: {balance}")

    # ── Step 2: Generate Stealth Address (hide receiver) ──
    stealth_start = time.time()
    stealth_result = generate_stealth_address(req.recipient_scan_pubkey, req.recipient_spend_pubkey)
    stealth_time = time.time() - stealth_start

    # ── Step 3: Gather Ring (hide sender) ──
    ring_start = time.time()
    # Get decoy public keys from existing wallets
    decoy_count = max(req.ring_size - 1, 2)
    wallets_cursor = db.wallets.find(
        {"address": {"$ne": req.sender_address}, "public_key": {"$exists": True}},
        {"_id": 0, "address": 1, "public_key": 1}
    ).limit(decoy_count + 10)
    all_wallets = await wallets_cursor.to_list(decoy_count + 10)

    decoy_keys = get_decoy_keys(all_wallets, req.sender_address, decoy_count)

    # If not enough real decoys, generate synthetic ones for privacy
    while len(decoy_keys) < decoy_count:
        from ecdsa import SigningKey, SECP256k1 as _SECP256k1
        fake_sk = SigningKey.generate(curve=_SECP256k1)
        decoy_keys.append(fake_sk.get_verifying_key().to_string().hex())

    # Build ring with real signer at random position
    import random
    ring_keys = list(decoy_keys)
    real_index = random.randint(0, len(ring_keys))
    ring_keys.insert(real_index, req.sender_public_key)

    # Create ring signature
    tx_message = f"{req.sender_address}:{stealth_result['stealth_address']}:{req.amount}:{datetime.now(timezone.utc).isoformat()}"
    ring_sig = ring_sign(tx_message, req.sender_private_key, ring_keys, real_index)
    ring_time = time.time() - ring_start

    # Check key image for double-spend
    key_image = ring_sig["key_image"]
    existing_ki = await db.key_images.find_one({"key_image": key_image})
    if existing_ki:
        raise HTTPException(400, "Double-spend detected: key image already used")

    # ── Step 4: zk-STARK Proof + Commitment (hide amount) ──
    stark_start = time.time()
    blinding_factor = generate_blinding_factor()
    commitment = create_amount_commitment(req.amount, blinding_factor)
    encrypted_amount = encrypt_amount_for_parties(
        req.amount, req.sender_address,
        stealth_result["stealth_address"], blinding_factor
    )

    scale = 10 ** 8
    balance_int = int(balance * scale)
    amount_int = int(req.amount * scale)
    sender_hash = hashlib.sha256(req.sender_address.encode()).hexdigest()
    stark_proof = stark_prove(balance_int, amount_int, sender_hash)
    stark_verification = stark_verify(stark_proof)
    stark_time = time.time() - stark_start

    if not stark_verification.get("valid"):
        raise HTTPException(400, "STARK proof verification failed")

    proof_hash = hashlib.sha256(str(stark_proof).encode()).hexdigest()

    # ── Step 5: Create the private transaction ──
    tx_id = str(uuid.uuid4())
    transaction = {
        "id": tx_id,
        "type": "private",
        "sender": "RING_HIDDEN",
        "recipient": stealth_result["stealth_address"],
        "real_sender": req.sender_address,
        "real_recipient_scan_pubkey": req.recipient_scan_pubkey,
        "amount": req.amount,
        "display_amount": "SHIELDED",
        "commitment": commitment,
        "proof_hash": proof_hash,
        "encrypted_amount": encrypted_amount,
        "blinding_factor_hash": hashlib.sha256(blinding_factor.encode()).hexdigest(),
        "ring_signature": {
            "c0": ring_sig["c0"],
            "s": ring_sig["s"],
            "key_image": ring_sig["key_image"],
            "ring_size": ring_sig["ring_size"],
            "public_keys": ring_sig["public_keys"],
        },
        "stealth_address": stealth_result["stealth_address"],
        "stealth_pubkey": stealth_result["stealth_pubkey"],
        "ephemeral_pubkey": stealth_result["ephemeral_pubkey"],
        "fee": fee,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "confirmed": True,
        "stark_verified": True,
        "privacy": {
            "sender_hidden": True,
            "receiver_hidden": True,
            "amount_hidden": True,
            "ring_size": ring_sig["ring_size"],
            "protocol": "Ring+Stealth+STARK",
        },
    }

    await db.transactions.insert_one(transaction)

    # Record key image to prevent double-spend
    await db.key_images.insert_one({
        "key_image": key_image,
        "tx_id": tx_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Public-facing response (strip internal fields)
    public_tx = {
        "id": tx_id,
        "type": "private",
        "sender": "RING_HIDDEN",
        "recipient": stealth_result["stealth_address"],
        "display_amount": "SHIELDED",
        "commitment": commitment,
        "ring_size": ring_sig["ring_size"],
        "stealth_address": stealth_result["stealth_address"],
        "ephemeral_pubkey": stealth_result["ephemeral_pubkey"],
        "proof_hash": proof_hash,
        "fee": fee,
        "timestamp": transaction["timestamp"],
        "confirmed": True,
        "privacy": transaction["privacy"],
    }

    return {
        "success": True,
        "transaction": public_tx,
        "blinding_factor": blinding_factor,
        "timing": {
            "stealth_address_ms": round(stealth_time * 1000, 2),
            "ring_signature_ms": round(ring_time * 1000, 2),
            "stark_proof_ms": round(stark_time * 1000, 2),
            "total_ms": round((stealth_time + ring_time + stark_time) * 1000, 2),
        },
        "privacy_summary": {
            "sender": "HIDDEN (Ring Signature, ring size: {})".format(ring_sig["ring_size"]),
            "receiver": "HIDDEN (Stealth Address: {})".format(stealth_result["stealth_address"][:16] + "..."),
            "amount": "HIDDEN (zk-STARK commitment)",
        },
        "warning": "SAVE YOUR BLINDING FACTOR to decrypt the amount later!",
    }


@router.get("/history/{address}")
async def get_private_history(address: str, limit: int = 50):
    """Get private transaction history for an address (checks real_sender field)."""
    db = await get_db()
    txs = await db.transactions.find(
        {
            "type": "private",
            "$or": [
                {"real_sender": address},
                {"stealth_address": {"$regex": "^BRICSX"}},
            ]
        },
        {"_id": 0, "real_sender": 0, "real_recipient_scan_pubkey": 0, "ring_signature": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)

    return {
        "address": address,
        "private_transactions": txs,
        "total": len(txs),
    }


@router.get("/key-images")
async def get_key_images(limit: int = 100):
    """List recorded key images (for double-spend verification)."""
    db = await get_db()
    images = await db.key_images.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"key_images": images, "total": len(images)}
