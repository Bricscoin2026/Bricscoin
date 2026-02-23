"""
BricsNFT - Quantum-Proof On-Chain Certificates
World's first NFT system with Post-Quantum Cryptography (PQC) signatures.
Each certificate is minted as a PQC transaction on the BricsCoin blockchain.
Use cases: diplomas, property deeds, authenticity certificates, professional certifications.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import hashlib
import uuid
from pqc_crypto import hybrid_verify

router = APIRouter(prefix="/api/nft", tags=["BricsNFT"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

MINT_FEE = 0.00001  # Fee per mint (burned)
BURN_ADDRESS = "BRICSPQ_BURN_000000000000000000000000000000"

CERTIFICATE_TYPES = [
    "diploma", "property", "authenticity", "professional",
    "membership", "award", "license", "custom"
]


class MintCertificate(BaseModel):
    creator_address: str
    recipient_address: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    certificate_type: str = Field(..., description="Type of certificate")
    metadata: Optional[dict] = None
    # PQC signatures
    ecdsa_signature: str
    dilithium_signature: str
    ecdsa_public_key: str
    dilithium_public_key: str


class TransferCertificate(BaseModel):
    certificate_id: str
    from_address: str
    to_address: str
    ecdsa_signature: str
    dilithium_signature: str
    ecdsa_public_key: str
    dilithium_public_key: str


async def get_balance(address: str) -> float:
    balance = 0.0
    received = await db.transactions.find({"recipient": address}, {"_id": 0}).to_list(10000)
    for tx in received:
        balance += tx['amount']
    sent = await db.transactions.find({"sender": address}, {"_id": 0}).to_list(10000)
    for tx in sent:
        balance -= tx['amount']
        balance -= tx.get('fee', 0)
    return max(0.0, round(balance, 8))


@router.post("/mint")
async def mint_certificate(cert: MintCertificate):
    """Mint a new PQC-signed certificate on the blockchain"""
    
    if cert.certificate_type not in CERTIFICATE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid type. Choose from: {', '.join(CERTIFICATE_TYPES)}")
    
    # Verify PQC wallet exists
    wallet = await db.pqc_wallets.find_one({"address": cert.creator_address}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="PQC wallet not found")
    
    # Check balance for fee
    balance = await get_balance(cert.creator_address)
    if balance < MINT_FEE:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Need {MINT_FEE} BRICS, have {balance}")
    
    # Create content hash from certificate data
    cert_content = f"{cert.title}|{cert.description}|{cert.certificate_type}|{cert.creator_address}|{cert.recipient_address or ''}"
    content_hash = hashlib.sha256(cert_content.encode()).hexdigest()
    
    # Verify PQC signatures
    sig_data = f"{cert.creator_address}{content_hash}"
    try:
        is_valid = hybrid_verify(
            sig_data,
            cert.ecdsa_signature,
            cert.dilithium_signature,
            cert.ecdsa_public_key,
            cert.dilithium_public_key
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid PQC signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Signature verification failed: {str(e)}")
    
    # Generate unique certificate ID
    cert_id = f"BRICSNFT-{uuid.uuid4().hex[:12].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Get current block height
    last_block = await db.blocks.find_one({}, {"_id": 0, "index": 1}, sort=[("index", -1)])
    block_height = last_block["index"] if last_block else 0
    
    # Create fee transaction (burned)
    tx_id = hashlib.sha256(f"nft-mint-{cert_id}-{now}".encode()).hexdigest()
    fee_tx = {
        "tx_id": tx_id,
        "sender": cert.creator_address,
        "recipient": BURN_ADDRESS,
        "amount": MINT_FEE,
        "fee": 0,
        "timestamp": now,
        "confirmed": False,
        "type": "nft_mint",
        "nft_id": cert_id,
        "pqc_signed": True,
    }
    await db.transactions.insert_one(fee_tx)
    
    # Store the certificate
    certificate = {
        "id": cert_id,
        "title": cert.title,
        "description": cert.description,
        "certificate_type": cert.certificate_type,
        "creator_address": cert.creator_address,
        "owner_address": cert.recipient_address or cert.creator_address,
        "content_hash": content_hash,
        "metadata": cert.metadata or {},
        "tx_id": tx_id,
        "block_height": block_height,
        "created_at": now,
        "pqc_verified": True,
        "ecdsa_signature": cert.ecdsa_signature[:64] + "...",
        "dilithium_signature": cert.dilithium_signature[:64] + "...",
        "transfer_history": [
            {
                "from": cert.creator_address,
                "to": cert.recipient_address or cert.creator_address,
                "timestamp": now,
                "type": "mint"
            }
        ],
        "revoked": False,
    }
    await db.nft_certificates.insert_one(certificate)
    
    # Remove _id before returning
    certificate.pop("_id", None)
    
    return {
        "certificate": certificate,
        "fee_burned": MINT_FEE,
        "tx_id": tx_id,
        "message": f"Certificate {cert_id} minted successfully on block #{block_height}"
    }


@router.get("/certificates")
async def list_certificates(limit: int = 50, cert_type: Optional[str] = None):
    """List all certificates (public gallery)"""
    query = {"revoked": {"$ne": True}}
    if cert_type and cert_type in CERTIFICATE_TYPES:
        query["certificate_type"] = cert_type
    
    certs = await db.nft_certificates.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(min(limit, 200)).to_list(min(limit, 200))
    
    return {"certificates": certs, "count": len(certs)}


@router.get("/certificate/{cert_id}")
async def get_certificate(cert_id: str):
    """Get a specific certificate by ID"""
    cert = await db.nft_certificates.find_one({"id": cert_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return {"certificate": cert}


@router.get("/verify/{cert_id}")
async def verify_certificate(cert_id: str):
    """Verify a certificate's authenticity on-chain"""
    cert = await db.nft_certificates.find_one({"id": cert_id}, {"_id": 0})
    if not cert:
        return {
            "valid": False,
            "certificate_id": cert_id,
            "reason": "Certificate not found on the blockchain"
        }
    
    # Check the on-chain transaction
    tx = await db.transactions.find_one({"tx_id": cert.get("tx_id")}, {"_id": 0})
    
    return {
        "valid": True,
        "certificate_id": cert_id,
        "title": cert["title"],
        "certificate_type": cert["certificate_type"],
        "creator": cert["creator_address"],
        "owner": cert["owner_address"],
        "content_hash": cert["content_hash"],
        "block_height": cert.get("block_height"),
        "created_at": cert["created_at"],
        "pqc_verified": cert.get("pqc_verified", False),
        "on_chain_tx": cert.get("tx_id"),
        "tx_confirmed": tx.get("confirmed", False) if tx else False,
        "revoked": cert.get("revoked", False),
    }


@router.get("/owner/{address}")
async def get_certificates_by_owner(address: str, limit: int = 50):
    """Get all certificates owned by an address"""
    certs = await db.nft_certificates.find(
        {"owner_address": address, "revoked": {"$ne": True}}, {"_id": 0}
    ).sort("created_at", -1).limit(min(limit, 200)).to_list(min(limit, 200))
    
    return {"certificates": certs, "count": len(certs), "owner": address}


@router.get("/creator/{address}")
async def get_certificates_by_creator(address: str, limit: int = 50):
    """Get all certificates created by an address"""
    certs = await db.nft_certificates.find(
        {"creator_address": address}, {"_id": 0}
    ).sort("created_at", -1).limit(min(limit, 200)).to_list(min(limit, 200))
    
    return {"certificates": certs, "count": len(certs), "creator": address}


@router.post("/transfer")
async def transfer_certificate(transfer: TransferCertificate):
    """Transfer a certificate to another PQC address"""
    cert = await db.nft_certificates.find_one({"id": transfer.certificate_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if cert["owner_address"] != transfer.from_address:
        raise HTTPException(status_code=403, detail="Only the owner can transfer this certificate")
    
    if cert.get("revoked"):
        raise HTTPException(status_code=400, detail="Cannot transfer a revoked certificate")
    
    # Verify PQC signatures
    sig_data = f"{transfer.from_address}{transfer.to_address}{transfer.certificate_id}"
    try:
        is_valid = hybrid_verify(
            sig_data,
            transfer.ecdsa_signature,
            transfer.dilithium_signature,
            transfer.ecdsa_public_key,
            transfer.dilithium_public_key
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid PQC signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Signature verification failed: {str(e)}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update certificate
    await db.nft_certificates.update_one(
        {"id": transfer.certificate_id},
        {
            "$set": {"owner_address": transfer.to_address},
            "$push": {
                "transfer_history": {
                    "from": transfer.from_address,
                    "to": transfer.to_address,
                    "timestamp": now,
                    "type": "transfer"
                }
            }
        }
    )
    
    return {
        "certificate_id": transfer.certificate_id,
        "new_owner": transfer.to_address,
        "previous_owner": transfer.from_address,
        "timestamp": now,
        "message": "Certificate transferred successfully"
    }


@router.get("/stats")
async def get_nft_stats():
    """Get NFT system statistics"""
    total = await db.nft_certificates.count_documents({"revoked": {"$ne": True}})
    
    # Count by type
    pipeline = [
        {"$match": {"revoked": {"$ne": True}}},
        {"$group": {"_id": "$certificate_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    type_counts = {}
    async for doc in db.nft_certificates.aggregate(pipeline):
        type_counts[doc["_id"]] = doc["count"]
    
    # Unique creators
    creators = await db.nft_certificates.distinct("creator_address")
    
    # Total fees burned from NFT mints
    nft_txs = await db.transactions.count_documents({"type": "nft_mint"})
    total_burned = nft_txs * MINT_FEE
    
    return {
        "total_certificates": total,
        "certificates_by_type": type_counts,
        "unique_creators": len(creators),
        "mint_fee": MINT_FEE,
        "total_fees_burned": round(total_burned, 8),
        "supported_types": CERTIFICATE_TYPES,
    }
