from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import hashlib
import json
import time
import secrets
from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError
import io
import qrcode
import base64
import asyncio
import httpx
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="BricsCoin API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== BRICSCOIN CONSTANTS ====================
MAX_SUPPLY = 21_000_000
INITIAL_REWARD = 50
HALVING_INTERVAL = 210_000
DIFFICULTY_ADJUSTMENT_INTERVAL = 2016
TARGET_BLOCK_TIME = 600  # 10 minutes in seconds
INITIAL_DIFFICULTY = 4  # Number of leading zeros

# P2P Network Configuration
NODE_ID = os.environ.get('NODE_ID', str(uuid.uuid4())[:8])
NODE_URL = os.environ.get('NODE_URL', '')
SEED_NODES = os.environ.get('SEED_NODES', '').split(',') if os.environ.get('SEED_NODES') else []

# Store connected peers
connected_peers: Dict[str, Dict] = {}
sync_lock = asyncio.Lock()

# ==================== MODELS ====================
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender: str
    recipient: str
    amount: float
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    signature: Optional[str] = None
    
class TransactionCreate(BaseModel):
    sender: str
    recipient: str
    amount: float
    signature: str
    public_key: str

class Block(BaseModel):
    index: int
    timestamp: str
    transactions: List[Dict[str, Any]]
    proof: int
    previous_hash: str
    hash: str
    miner: str
    difficulty: int
    nonce: int

class MiningSubmit(BaseModel):
    block_data: str
    nonce: int
    hash: str
    miner_address: str

class WalletCreate(BaseModel):
    name: Optional[str] = "My Wallet"

class WalletResponse(BaseModel):
    address: str
    public_key: str
    private_key: str
    name: str
    created_at: str

class TransactionRequest(BaseModel):
    sender_private_key: str
    sender_address: str
    recipient_address: str
    amount: float

class NetworkStats(BaseModel):
    total_supply: float
    circulating_supply: float
    total_blocks: int
    current_difficulty: int
    hashrate_estimate: float
    pending_transactions: int
    last_block_time: str
    next_halving_block: int
    current_reward: float

# P2P Models
class PeerInfo(BaseModel):
    node_id: str
    url: str
    version: str = "1.0.0"
    blocks_height: int = 0

class PeerRegister(BaseModel):
    node_id: str
    url: str
    version: str = "1.0.0"

class ChainSync(BaseModel):
    blocks: List[Dict[str, Any]]
    from_height: int
    to_height: int

class BroadcastBlock(BaseModel):
    block: Dict[str, Any]
    sender_node_id: str

class BroadcastTransaction(BaseModel):
    transaction: Dict[str, Any]
    sender_node_id: str

# ==================== BLOCKCHAIN LOGIC ====================
def sha256_hash(data: str) -> str:
    """Calculate SHA256 hash"""
    return hashlib.sha256(data.encode()).hexdigest()

def calculate_block_hash(index: int, timestamp: str, transactions: list, proof: int, previous_hash: str, nonce: int) -> str:
    """Calculate block hash using SHA256"""
    block_string = f"{index}{timestamp}{json.dumps(transactions, sort_keys=True)}{proof}{previous_hash}{nonce}"
    return sha256_hash(block_string)

def get_mining_reward(block_height: int) -> float:
    """Calculate mining reward with halving"""
    halvings = block_height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return INITIAL_REWARD / (2 ** halvings)

def check_difficulty(hash_value: str, difficulty: int) -> bool:
    """Check if hash meets difficulty requirement"""
    return hash_value.startswith('0' * difficulty)

async def get_current_difficulty() -> int:
    """Calculate current difficulty based on block times"""
    blocks_count = await db.blocks.count_documents({})
    
    if blocks_count < DIFFICULTY_ADJUSTMENT_INTERVAL:
        return INITIAL_DIFFICULTY
    
    # Get the last DIFFICULTY_ADJUSTMENT_INTERVAL blocks
    last_blocks = await db.blocks.find({}, {"_id": 0}).sort("index", -1).limit(DIFFICULTY_ADJUSTMENT_INTERVAL).to_list(DIFFICULTY_ADJUSTMENT_INTERVAL)
    
    if len(last_blocks) < DIFFICULTY_ADJUSTMENT_INTERVAL:
        return INITIAL_DIFFICULTY
    
    # Calculate actual time taken
    first_block = last_blocks[-1]
    last_block = last_blocks[0]
    
    first_time = datetime.fromisoformat(first_block['timestamp'])
    last_time = datetime.fromisoformat(last_block['timestamp'])
    
    actual_time = (last_time - first_time).total_seconds()
    expected_time = TARGET_BLOCK_TIME * DIFFICULTY_ADJUSTMENT_INTERVAL
    
    current_difficulty = last_block.get('difficulty', INITIAL_DIFFICULTY)
    
    # Adjust difficulty
    if actual_time < expected_time / 4:
        return min(current_difficulty + 1, 32)
    elif actual_time > expected_time * 4:
        return max(current_difficulty - 1, 1)
    elif actual_time < expected_time:
        ratio = expected_time / actual_time
        if ratio > 1.1:
            return min(current_difficulty + 1, 32)
    elif actual_time > expected_time:
        ratio = actual_time / expected_time
        if ratio > 1.1:
            return max(current_difficulty - 1, 1)
    
    return current_difficulty

async def get_circulating_supply() -> float:
    """Calculate total circulating supply"""
    blocks_count = await db.blocks.count_documents({})
    supply = 0
    for i in range(blocks_count):
        supply += get_mining_reward(i)
    return min(supply, MAX_SUPPLY)

async def create_genesis_block():
    """Create genesis block if it doesn't exist"""
    existing = await db.blocks.find_one({"index": 0})
    if existing:
        return
    
    genesis_block = {
        "index": 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "transactions": [],
        "proof": 0,
        "previous_hash": "0" * 64,
        "nonce": 0,
        "miner": "genesis",
        "difficulty": INITIAL_DIFFICULTY
    }
    genesis_block["hash"] = calculate_block_hash(
        genesis_block["index"],
        genesis_block["timestamp"],
        genesis_block["transactions"],
        genesis_block["proof"],
        genesis_block["previous_hash"],
        genesis_block["nonce"]
    )
    
    await db.blocks.insert_one(genesis_block)
    logging.info("Genesis block created")

# ==================== WALLET FUNCTIONS ====================
def generate_wallet():
    """Generate new wallet with ECDSA keys"""
    private_key = SigningKey.generate(curve=SECP256k1)
    public_key = private_key.get_verifying_key()
    
    # Generate address from public key hash
    pub_key_hex = public_key.to_string().hex()
    address_hash = sha256_hash(pub_key_hex)
    address = "BRICS" + address_hash[:40]
    
    return {
        "private_key": private_key.to_string().hex(),
        "public_key": pub_key_hex,
        "address": address
    }

def sign_transaction(private_key_hex: str, transaction_data: str) -> str:
    """Sign transaction with private key"""
    private_key = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
    signature = private_key.sign(transaction_data.encode())
    return signature.hex()

def verify_signature(public_key_hex: str, signature_hex: str, transaction_data: str) -> bool:
    """Verify transaction signature"""
    try:
        public_key = VerifyingKey.from_string(bytes.fromhex(public_key_hex), curve=SECP256k1)
        return public_key.verify(bytes.fromhex(signature_hex), transaction_data.encode())
    except BadSignatureError:
        return False

async def get_balance(address: str) -> float:
    """Calculate balance for an address"""
    balance = 0.0
    
    # Add mining rewards
    blocks = await db.blocks.find({"miner": address}, {"_id": 0}).to_list(10000)
    for block in blocks:
        balance += get_mining_reward(block['index'])
    
    # Add received transactions
    received = await db.transactions.find({"recipient": address, "confirmed": True}, {"_id": 0}).to_list(10000)
    for tx in received:
        balance += tx['amount']
    
    # Subtract sent transactions
    sent = await db.transactions.find({"sender": address, "confirmed": True}, {"_id": 0}).to_list(10000)
    for tx in sent:
        balance -= tx['amount']
    
    return balance

# ==================== API ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "BricsCoin API", "version": "1.0.0"}

# Network endpoints
@api_router.get("/network/stats", response_model=NetworkStats)
async def get_network_stats():
    """Get network statistics"""
    blocks_count = await db.blocks.count_documents({})
    pending_count = await db.transactions.count_documents({"confirmed": False})
    
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    last_block_time = last_block['timestamp'] if last_block else datetime.now(timezone.utc).isoformat()
    
    current_difficulty = await get_current_difficulty()
    circulating = await get_circulating_supply()
    
    # Calculate next halving
    current_height = blocks_count
    halvings_done = current_height // HALVING_INTERVAL
    next_halving = (halvings_done + 1) * HALVING_INTERVAL
    
    # Estimate hashrate (very rough estimate based on difficulty)
    hashrate_estimate = (2 ** current_difficulty) / TARGET_BLOCK_TIME
    
    return NetworkStats(
        total_supply=MAX_SUPPLY,
        circulating_supply=circulating,
        total_blocks=blocks_count,
        current_difficulty=current_difficulty,
        hashrate_estimate=hashrate_estimate,
        pending_transactions=pending_count,
        last_block_time=last_block_time,
        next_halving_block=next_halving,
        current_reward=get_mining_reward(current_height)
    )

# Block endpoints
@api_router.get("/blocks")
async def get_blocks(limit: int = 20, offset: int = 0):
    """Get blocks with pagination"""
    blocks = await db.blocks.find({}, {"_id": 0}).sort("index", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.blocks.count_documents({})
    return {"blocks": blocks, "total": total}

@api_router.get("/blocks/{index}")
async def get_block(index: int):
    """Get specific block"""
    block = await db.blocks.find_one({"index": index}, {"_id": 0})
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block

@api_router.get("/blocks/hash/{block_hash}")
async def get_block_by_hash(block_hash: str):
    """Get block by hash"""
    block = await db.blocks.find_one({"hash": block_hash}, {"_id": 0})
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block

# Transaction endpoints
@api_router.get("/transactions")
async def get_transactions(limit: int = 20, offset: int = 0, confirmed: Optional[bool] = None):
    """Get transactions with pagination"""
    query = {}
    if confirmed is not None:
        query["confirmed"] = confirmed
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.transactions.count_documents(query)
    return {"transactions": transactions, "total": total}

@api_router.get("/transactions/{tx_id}")
async def get_transaction(tx_id: str):
    """Get specific transaction"""
    tx = await db.transactions.find_one({"id": tx_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@api_router.post("/transactions")
async def create_transaction(request: TransactionRequest):
    """Create and broadcast a new transaction"""
    # Validate sender has enough balance
    sender_balance = await get_balance(request.sender_address)
    if sender_balance < request.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {sender_balance}")
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Create transaction data for signing
    tx_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    tx_data = f"{request.sender_address}{request.recipient_address}{request.amount}{timestamp}"
    
    # Sign transaction
    try:
        signature = sign_transaction(request.sender_private_key, tx_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid private key: {str(e)}")
    
    # Get public key from private key
    private_key = SigningKey.from_string(bytes.fromhex(request.sender_private_key), curve=SECP256k1)
    public_key_hex = private_key.get_verifying_key().to_string().hex()
    
    transaction = {
        "id": tx_id,
        "sender": request.sender_address,
        "recipient": request.recipient_address,
        "amount": request.amount,
        "timestamp": timestamp,
        "signature": signature,
        "public_key": public_key_hex,
        "confirmed": False,
        "block_index": None
    }
    
    await db.transactions.insert_one(transaction)
    del transaction["_id"]
    
    return transaction

@api_router.get("/transactions/address/{address}")
async def get_address_transactions(address: str, limit: int = 50):
    """Get transactions for an address"""
    transactions = await db.transactions.find(
        {"$or": [{"sender": address}, {"recipient": address}]},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"transactions": transactions}

# Mining endpoints
@api_router.get("/mining/template")
async def get_mining_template():
    """Get current block template for mining"""
    await create_genesis_block()
    
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        raise HTTPException(status_code=500, detail="No genesis block")
    
    # Get pending transactions (max 100 per block)
    pending_txs = await db.transactions.find({"confirmed": False}, {"_id": 0}).limit(100).to_list(100)
    
    new_index = last_block['index'] + 1
    difficulty = await get_current_difficulty()
    reward = get_mining_reward(new_index)
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Block data to hash (without nonce - miner will add it)
    block_template = {
        "index": new_index,
        "timestamp": timestamp,
        "transactions": pending_txs,
        "previous_hash": last_block['hash'],
        "difficulty": difficulty,
        "reward": reward,
        "target": "0" * difficulty
    }
    
    # Create a string for mining
    block_data = f"{new_index}{timestamp}{json.dumps(pending_txs, sort_keys=True)}{last_block['hash']}"
    
    return {
        "template": block_template,
        "block_data": block_data,
        "difficulty": difficulty,
        "target": "0" * difficulty,
        "reward": reward
    }

@api_router.post("/mining/submit")
async def submit_mined_block(submission: MiningSubmit):
    """Submit a mined block"""
    # Verify the hash
    full_data = submission.block_data + str(submission.nonce)
    calculated_hash = sha256_hash(full_data)
    
    if calculated_hash != submission.hash:
        raise HTTPException(status_code=400, detail="Invalid hash")
    
    # Get current difficulty
    difficulty = await get_current_difficulty()
    
    if not check_difficulty(submission.hash, difficulty):
        raise HTTPException(status_code=400, detail=f"Hash doesn't meet difficulty. Need {difficulty} leading zeros")
    
    # Get last block
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        raise HTTPException(status_code=500, detail="No genesis block")
    
    new_index = last_block['index'] + 1
    
    # Check if block already exists
    existing = await db.blocks.find_one({"index": new_index})
    if existing:
        raise HTTPException(status_code=409, detail="Block already mined")
    
    # Get pending transactions
    pending_txs = await db.transactions.find({"confirmed": False}, {"_id": 0}).limit(100).to_list(100)
    
    # Create the new block
    timestamp = datetime.now(timezone.utc).isoformat()
    new_block = {
        "index": new_index,
        "timestamp": timestamp,
        "transactions": pending_txs,
        "proof": submission.nonce,
        "previous_hash": last_block['hash'],
        "nonce": submission.nonce,
        "miner": submission.miner_address,
        "difficulty": difficulty,
        "hash": submission.hash
    }
    
    # Save block
    await db.blocks.insert_one(new_block)
    
    # Mark transactions as confirmed
    tx_ids = [tx['id'] for tx in pending_txs]
    if tx_ids:
        await db.transactions.update_many(
            {"id": {"$in": tx_ids}},
            {"$set": {"confirmed": True, "block_index": new_index}}
        )
    
    del new_block["_id"]
    
    logging.info(f"Block {new_index} mined by {submission.miner_address}")
    
    return {
        "success": True,
        "block": new_block,
        "reward": get_mining_reward(new_index)
    }

# Wallet endpoints
@api_router.post("/wallet/create")
async def create_wallet(request: WalletCreate):
    """Create a new wallet"""
    wallet_data = generate_wallet()
    
    wallet = {
        "address": wallet_data['address'],
        "public_key": wallet_data['public_key'],
        "private_key": wallet_data['private_key'],
        "name": request.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    return wallet

@api_router.get("/wallet/{address}/balance")
async def get_wallet_balance(address: str):
    """Get wallet balance"""
    balance = await get_balance(address)
    return {"address": address, "balance": balance}

@api_router.get("/wallet/{address}/qr")
async def get_wallet_qr(address: str):
    """Generate QR code for wallet address"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(address)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="image/png")

@api_router.get("/wallet/{address}/qr/base64")
async def get_wallet_qr_base64(address: str):
    """Generate QR code as base64 for wallet address"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(address)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    base64_img = base64.b64encode(buffer.getvalue()).decode()
    
    return {"qr_code": f"data:image/png;base64,{base64_img}"}

# Address lookup
@api_router.get("/address/{address}")
async def get_address_info(address: str):
    """Get full address information"""
    balance = await get_balance(address)
    
    # Get transaction count
    tx_count = await db.transactions.count_documents(
        {"$or": [{"sender": address}, {"recipient": address}]}
    )
    
    # Get mined blocks count
    mined_blocks = await db.blocks.count_documents({"miner": address})
    
    # Get recent transactions
    recent_txs = await db.transactions.find(
        {"$or": [{"sender": address}, {"recipient": address}]},
        {"_id": 0}
    ).sort("timestamp", -1).limit(10).to_list(10)
    
    return {
        "address": address,
        "balance": balance,
        "transaction_count": tx_count,
        "mined_blocks": mined_blocks,
        "recent_transactions": recent_txs
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await create_genesis_block()
    logger.info("BricsCoin node started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
