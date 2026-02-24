from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Request, Depends
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import hashlib
import json
import time
import secrets
from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError
from ecdsa.util import sigdecode_der
import io
import qrcode
import base64
import asyncio
import httpx
from contextlib import asynccontextmanager
from mnemonic import Mnemonic
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from collections import defaultdict
import ipaddress

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ==================== SECURITY CONFIGURATION ====================
limiter = Limiter(key_func=get_remote_address)
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.WARNING)

ip_blacklist: Dict[str, datetime] = {}
failed_attempts: Dict[str, int] = defaultdict(int)
MAX_FAILED_ATTEMPTS = 10
BLACKLIST_DURATION = 3600

ALLOWED_ORIGINS = [
    "https://bricscoin26.org",
    "https://www.bricscoin26.org",
    "http://localhost:3000",
]

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(
    title="BricsCoin API", 
    version="2.0.0",
    docs_url=None if os.environ.get('PRODUCTION') == 'true' else "/docs",
    redoc_url=None if os.environ.get('PRODUCTION') == 'true' else "/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")

# ==================== BRICSCOIN CONSTANTS ====================
MAX_SUPPLY = 21_000_000
INITIAL_REWARD = 50
HALVING_INTERVAL = 210_000
DIFFICULTY_ADJUSTMENT_INTERVAL = 2016
TARGET_BLOCK_TIME = 600
INITIAL_DIFFICULTY = 1000000
PREMINE_AMOUNT = 1_000_000
TRANSACTION_FEE = 0.05

GENESIS_WALLET_ADDRESS = None

NODE_ID = os.environ.get('NODE_ID', str(uuid.uuid4())[:8])
NODE_URL = os.environ.get('NODE_URL', '')
SEED_NODES = os.environ.get('SEED_NODES', '').split(',') if os.environ.get('SEED_NODES') else []

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

class WalletImportSeed(BaseModel):
    seed_phrase: str
    name: Optional[str] = "Imported Wallet"

class WalletImportPrivateKey(BaseModel):
    private_key: str
    name: Optional[str] = "Imported Wallet"
    
    @field_validator('private_key')
    @classmethod
    def validate_private_key(cls, v):
        if not re.match(r'^[a-fA-F0-9]{64}$', v):
            raise ValueError('Invalid private key format')
        return v.lower()

class WalletResponse(BaseModel):
    address: str
    public_key: str
    private_key: str
    name: str
    created_at: str
    seed_phrase: Optional[str] = None

class SecureTransactionRequest(BaseModel):
    sender_address: str
    recipient_address: str
    amount: float
    timestamp: str
    signature: str
    public_key: str
    
    @field_validator('sender_address', 'recipient_address')
    @classmethod
    def validate_address(cls, v):
        if not v.startswith('BRICS') or len(v) < 40:
            raise ValueError('Invalid BRICS address format')
        if not re.match(r'^BRICS[a-fA-F0-9]{40}$', v):
            raise ValueError('Address must be BRICS followed by 40 hex characters')
        return v
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        if v > 21_000_000:
            raise ValueError('Amount exceeds maximum supply')
        if len(str(v).split('.')[-1]) > 8 if '.' in str(v) else False:
            raise ValueError('Amount has too many decimal places (max 8)')
        return v
    
    @field_validator('signature')
    @classmethod
    def validate_signature(cls, v):
        if not re.match(r'^[a-fA-F0-9]+$', v) or len(v) < 64:
            raise ValueError('Invalid signature format')
        return v.lower()
    
    @field_validator('public_key')
    @classmethod
    def validate_public_key(cls, v):
        if not re.match(r'^[a-fA-F0-9]{128}$', v):
            raise ValueError('Invalid public key format (expected 128 hex chars)')
        return v.lower()

class TransactionRequest(BaseModel):
    sender_private_key: str
    sender_address: str
    recipient_address: str
    amount: float

class NetworkStats(BaseModel):
    total_supply: float
    circulating_supply: float
    remaining_supply: float
    total_blocks: int
    current_difficulty: int
    hashrate_estimate: float
    pending_transactions: int
    last_block_time: str
    next_halving_block: int
    current_reward: float

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
    return hashlib.sha256(data.encode()).hexdigest()

def calculate_block_hash(index: int, timestamp: str, transactions: list, proof: int, previous_hash: str, nonce: int) -> str:
    block_string = f"{index}{timestamp}{json.dumps(transactions, sort_keys=True)}{proof}{previous_hash}{nonce}"
    return sha256_hash(block_string)

def get_mining_reward(block_height: int) -> float:
    halvings = block_height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return INITIAL_REWARD / (2 ** halvings)

def check_difficulty(hash_value: str, difficulty: int) -> bool:
    max_target = 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
    target = max_target // difficulty
    hash_int = int(hash_value, 16)
    return hash_int <= target

async def get_current_difficulty() -> int:
    blocks_count = await db.blocks.count_documents({})

    if blocks_count == 0:
        return INITIAL_DIFFICULTY

    if blocks_count == 1:
        last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
        if not last_block:
            return INITIAL_DIFFICULTY
        try:
            last_time = datetime.fromisoformat(last_block["timestamp"].replace("Z", "+00:00"))
        except (ValueError, KeyError):
            last_time = datetime.now(timezone.utc)
        now = datetime.now(timezone.utc)
        elapsed = (now - last_time).total_seconds()
        if elapsed <= TARGET_BLOCK_TIME:
            return INITIAL_DIFFICULTY
        delay_units = elapsed / TARGET_BLOCK_TIME
        decay_factor = 0.5 ** (delay_units - 1)
        new_difficulty = int(INITIAL_DIFFICULTY * decay_factor)
        if new_difficulty < 1:
            new_difficulty = 1
        return new_difficulty

    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        return INITIAL_DIFFICULTY

    current_difficulty = last_block.get("difficulty", INITIAL_DIFFICULTY)

    adjustment_interval = 10 if blocks_count < DIFFICULTY_ADJUSTMENT_INTERVAL else DIFFICULTY_ADJUSTMENT_INTERVAL

    if blocks_count % adjustment_interval == 0:
        last_blocks = await db.blocks.find({}, {"_id": 0}).sort("index", -1).limit(adjustment_interval).to_list(adjustment_interval)
        if len(last_blocks) == adjustment_interval:
            first_block = last_blocks[-1]
            last_block_data = last_blocks[0]
            try:
                first_time = datetime.fromisoformat(first_block["timestamp"].replace("Z", "+00:00"))
                last_time = datetime.fromisoformat(last_block_data["timestamp"].replace("Z", "+00:00"))
                actual_time = (last_time - first_time).total_seconds()
            except (ValueError, KeyError):
                actual_time = TARGET_BLOCK_TIME * adjustment_interval
            if actual_time <= 0:
                actual_time = 1
            expected_time = TARGET_BLOCK_TIME * adjustment_interval
            ratio = expected_time / actual_time
            ratio = max(0.25, min(4.0, ratio))
            base_difficulty = max(1, int(current_difficulty * ratio))
        else:
            base_difficulty = current_difficulty
    else:
        base_difficulty = current_difficulty

    try:
        last_time = datetime.fromisoformat(last_block["timestamp"].replace("Z", "+00:00"))
    except (ValueError, KeyError):
        last_time = datetime.now(timezone.utc)
    now = datetime.now(timezone.utc)
    elapsed = (now - last_time).total_seconds()

    if elapsed <= TARGET_BLOCK_TIME:
        return base_difficulty

    delay_units = elapsed / TARGET_BLOCK_TIME
    decay_factor = 0.5 ** (delay_units - 1)
    new_difficulty = int(base_difficulty * decay_factor)
    if new_difficulty < 1:
        new_difficulty = 1

    return new_difficulty

async def get_circulating_supply() -> float:
    blocks_count = await db.blocks.count_documents({})
    supply = PREMINE_AMOUNT
    for i in range(1, blocks_count):
        supply += get_mining_reward(i)
    return min(supply, MAX_SUPPLY)

async def create_genesis_block():
    global GENESIS_WALLET_ADDRESS
    
    existing = await db.blocks.find_one({"index": 0})
    if existing:
        if existing.get('transactions') and len(existing['transactions']) > 0:
            GENESIS_WALLET_ADDRESS = existing['transactions'][0].get('recipient')
        return
    
    mnemo = Mnemonic("english")
    seed_phrase = mnemo.generate(strength=128)
    seed = mnemo.to_seed(seed_phrase)
    private_key = SigningKey.from_string(seed[:32], curve=SECP256k1)
    public_key = private_key.get_verifying_key()
    
    public_key_hex = public_key.to_string().hex()
    address_hash = hashlib.sha256(public_key_hex.encode()).hexdigest()[:40]
    genesis_address = f"BRICS{address_hash}"
    GENESIS_WALLET_ADDRESS = genesis_address
    
    genesis_wallet = {
        "address": genesis_address,
        "public_key": public_key_hex,
        "private_key": private_key.to_string().hex(),
        "seed_phrase": seed_phrase,
        "name": "Genesis Wallet (Premine)",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_genesis": True
    }
    await db.genesis_wallet.delete_many({})
    await db.genesis_wallet.insert_one(genesis_wallet)
    
    premine_tx = {
        "id": "genesis-premine-tx",
        "sender": "COINBASE",
        "recipient": genesis_address,
        "amount": PREMINE_AMOUNT,
        "fee": 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "signature": "genesis",
        "confirmed": True,
        "block_index": 0
    }
    
    genesis_block = {
        "index": 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "transactions": [premine_tx],
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
    await db.transactions.insert_one(premine_tx)
    
    logging.info(f"Genesis block created with premine to {genesis_address}")

# ==================== P2P NETWORK FUNCTIONS ====================
async def register_with_peer(peer_url: str) -> bool:
    if not NODE_URL:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            blocks_count = await db.blocks.count_documents({})
            response = await http_client.post(
                f"{peer_url}/api/p2p/register",
                json={"node_id": NODE_ID, "url": NODE_URL, "version": "1.0.0"}
            )
            if response.status_code == 200:
                peer_data = response.json()
                connected_peers[peer_data['node_id']] = {
                    "url": peer_url,
                    "node_id": peer_data['node_id'],
                    "version": peer_data.get('version', '1.0.0'),
                    "last_seen": datetime.now(timezone.utc).isoformat()
                }
                return True
    except Exception as e:
        logging.error(f"Failed to register with peer {peer_url}: {e}")
    return False

async def broadcast_to_peers(endpoint: str, data: dict, exclude_node: str = None):
    tasks = []
    for node_id, peer in connected_peers.items():
        if node_id == exclude_node:
            continue
        tasks.append(send_to_peer(peer['url'], endpoint, data))
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

async def send_to_peer(peer_url: str, endpoint: str, data: dict) -> bool:
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.post(f"{peer_url}/api/p2p/{endpoint}", json=data)
            return response.status_code == 200
    except Exception as e:
        logging.error(f"Failed to send to peer {peer_url}: {e}")
        return False

async def sync_blockchain_from_peer(peer_url: str):
    async with sync_lock:
        try:
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                response = await http_client.get(f"{peer_url}/api/p2p/chain/info")
                if response.status_code != 200:
                    return
                peer_info = response.json()
                our_height = await db.blocks.count_documents({})
                if peer_info['height'] <= our_height:
                    return
                response = await http_client.get(
                    f"{peer_url}/api/p2p/chain/blocks",
                    params={"from_height": our_height, "limit": 100}
                )
                if response.status_code != 200:
                    return
                blocks_data = response.json()
                for block in blocks_data['blocks']:
                    if await validate_block(block):
                        existing = await db.blocks.find_one({"index": block['index']})
                        if not existing:
                            await db.blocks.insert_one(block)
        except Exception as e:
            logging.error(f"Failed to sync from peer {peer_url}: {e}")

async def validate_block(block: dict) -> bool:
    try:
        calculated_hash = calculate_block_hash(
            block['index'],
            block['timestamp'],
            block['transactions'],
            block.get('proof', block.get('nonce', 0)),
            block['previous_hash'],
            block.get('nonce', 0)
        )
        if block['hash'] != calculated_hash:
            block_data = f"{block['index']}{block['timestamp']}{json.dumps(block['transactions'], sort_keys=True)}{block['previous_hash']}"
            full_data = block_data + str(block.get('nonce', 0))
            alt_hash = sha256_hash(full_data)
            if block['hash'] != alt_hash:
                return False
        if not check_difficulty(block['hash'], block.get('difficulty', INITIAL_DIFFICULTY)):
            return False
        if block['index'] > 0:
            prev_block = await db.blocks.find_one({"index": block['index'] - 1}, {"_id": 0})
            if prev_block and prev_block['hash'] != block['previous_hash']:
                return False
        return True
    except Exception as e:
        logging.error(f"Block validation error: {e}")
        return False

async def discover_peers():
    for seed_url in SEED_NODES:
        if seed_url and seed_url.strip():
            await register_with_peer(seed_url.strip())
            await sync_blockchain_from_peer(seed_url.strip())

async def periodic_sync():
    while True:
        await asyncio.sleep(60)
        for peer in list(connected_peers.values()):
            await sync_blockchain_from_peer(peer['url'])

# ==================== WALLET FUNCTIONS ====================
mnemo = Mnemonic("english")

def generate_wallet_from_seed(seed_phrase: str = None):
    if seed_phrase:
        if not mnemo.check(seed_phrase):
            raise ValueError("Invalid seed phrase")
        seed = mnemo.to_seed(seed_phrase)
    else:
        seed_phrase = mnemo.generate(strength=128)
        seed = mnemo.to_seed(seed_phrase)
    
    private_key_bytes = seed[:32]
    private_key = SigningKey.from_string(private_key_bytes, curve=SECP256k1)
    public_key = private_key.get_verifying_key()
    
    pub_key_hex = public_key.to_string().hex()
    address_hash = sha256_hash(pub_key_hex)
    address = "BRICS" + address_hash[:40]
    
    return {
        "private_key": private_key.to_string().hex(),
        "public_key": pub_key_hex,
        "address": address,
        "seed_phrase": seed_phrase
    }

def generate_wallet():
    return generate_wallet_from_seed()

def recover_wallet_from_private_key(private_key_hex: str):
    try:
        private_key = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
        public_key = private_key.get_verifying_key()
        pub_key_hex = public_key.to_string().hex()
        address_hash = sha256_hash(pub_key_hex)
        address = "BRICS" + address_hash[:40]
        return {"private_key": private_key_hex, "public_key": pub_key_hex, "address": address}
    except Exception as e:
        raise ValueError(f"Invalid private key: {str(e)}")

def sign_transaction(private_key_hex: str, transaction_data: str) -> str:
    private_key = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
    signature = private_key.sign(transaction_data.encode())
    return signature.hex()

def verify_signature(public_key_hex: str, signature_hex: str, transaction_data: str) -> bool:
    try:
        public_key = VerifyingKey.from_string(bytes.fromhex(public_key_hex), curve=SECP256k1)
        sig_bytes = bytes.fromhex(signature_hex)
        
        try:
            msg_hash = hashlib.sha256(transaction_data.encode()).digest()
            if public_key.verify_digest(sig_bytes, msg_hash, sigdecode=sigdecode_der):
                return True
        except: pass
        
        try:
            if public_key.verify(sig_bytes, transaction_data.encode(), sigdecode=sigdecode_der):
                return True
        except: pass
        
        try:
            hex_hash = hashlib.sha256(transaction_data.encode()).hexdigest()
            msg_hash2 = hashlib.sha256(hex_hash.encode()).digest()
            if public_key.verify_digest(sig_bytes, msg_hash2, sigdecode=sigdecode_der):
                return True
        except: pass
        
        try:
            msg_hash = hashlib.sha256(transaction_data.encode()).digest()
            if public_key.verify_digest(sig_bytes, msg_hash):
                return True
        except: pass
        
        return False
    except Exception as e:
        logging.error(f"Errore firma: {e}")
        return False

def generate_address_from_public_key(public_key_hex: str) -> str:
    address_hash = sha256_hash(public_key_hex)
    return "BRICS" + address_hash[:40]

async def get_balance(address: str) -> float:
    balance = 0.0
    received = await db.transactions.find({"recipient": address}, {"_id": 0}).to_list(10000)
    for tx in received:
        balance += tx['amount']
    sent = await db.transactions.find({"sender": address}, {"_id": 0}).to_list(10000)
    for tx in sent:
        balance -= tx['amount']
        balance -= tx.get('fee', 0)
    return balance

# ==================== API ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "BricsCoin API", "version": "1.0.0"}

@api_router.get("/network/stats", response_model=NetworkStats)
async def get_network_stats():
    """Get network statistics with REAL hashrate calculation"""
    blocks_count = await db.blocks.count_documents({})
    pending_count = await db.transactions.count_documents({"confirmed": False})
    
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    last_block_time = last_block['timestamp'] if last_block else datetime.now(timezone.utc).isoformat()
    
    current_difficulty = await get_current_difficulty()
    circulating = await get_circulating_supply()
    
    current_height = blocks_count
    halvings_done = current_height // HALVING_INTERVAL
    next_halving = (halvings_done + 1) * HALVING_INTERVAL
    
    # ========== HASHRATE REALE - Esclude gap > 5 minuti ==========
    hashrate_estimate = 0.0
    try:
        recent = await db.blocks.find({}, {"_id": 0, "timestamp": 1, "difficulty": 1}).sort("index", -1).limit(20).to_list(20)
        if len(recent) >= 2:
            intervals = []
            for i in range(len(recent) - 1):
                t1 = datetime.fromisoformat(recent[i]['timestamp'].replace('Z', '+00:00'))
                t2 = datetime.fromisoformat(recent[i+1]['timestamp'].replace('Z', '+00:00'))
                diff = (t1 - t2).total_seconds()
                # Escludi gap > 5 minuti (300 secondi) - miner erano spenti
                if 0 < diff <= 300:
                    intervals.append(diff)
            
            if intervals:
                avg_time = sum(intervals) / len(intervals)
                avg_diff = sum(b.get("difficulty", 1) for b in recent) / len(recent)
                hashrate_estimate = (avg_diff * (2 ** 32)) / avg_time
    except:
        pass
    
    return NetworkStats(
        total_supply=MAX_SUPPLY,
        circulating_supply=circulating,
        remaining_supply=MAX_SUPPLY - circulating,
        total_blocks=blocks_count,
        current_difficulty=current_difficulty,
        hashrate_estimate=hashrate_estimate,
        pending_transactions=pending_count,
        last_block_time=last_block_time,
        next_halving_block=next_halving,
        current_reward=get_mining_reward(current_height)
    )

@api_router.get("/tokenomics")
async def get_tokenomics():
    blocks_count = await db.blocks.count_documents({})
    mining_rewards = sum(get_mining_reward(i) for i in range(1, blocks_count))
    genesis_wallet = await db.genesis_wallet.find_one({}, {"_id": 0, "private_key": 0, "seed_phrase": 0})
    genesis_address = genesis_wallet.get('address') if genesis_wallet else None
    
    return {
        "total_supply": MAX_SUPPLY,
        "premine": {
            "amount": PREMINE_AMOUNT,
            "percentage": round((PREMINE_AMOUNT / MAX_SUPPLY) * 100, 2),
            "wallet_address": genesis_address,
            "allocation": {"team": {"amount": 1000000, "percentage": 100, "description": "Founder and core team"}},
            "note": "Premine is held by the founder (Jabo86) for project development and growth."
        },
        "mining_rewards": {
            "total_available": MAX_SUPPLY - PREMINE_AMOUNT,
            "mined_so_far": mining_rewards,
            "percentage_mined": round((mining_rewards / (MAX_SUPPLY - PREMINE_AMOUNT)) * 100, 4),
            "current_block_reward": get_mining_reward(blocks_count),
            "halving_interval": HALVING_INTERVAL,
            "next_halving": ((blocks_count // HALVING_INTERVAL) + 1) * HALVING_INTERVAL
        },
        "fees": {
            "transaction_fee": TRANSACTION_FEE,
            "destination": "burned",
            "note": "Transaction fees are BURNED (destroyed) - they reduce the total supply over time, making BRICS deflationary."
        }
    }

@api_router.get("/genesis-wallet")
async def get_genesis_wallet_info():
    genesis_wallet = await db.genesis_wallet.find_one({}, {"_id": 0, "private_key": 0, "seed_phrase": 0})
    if not genesis_wallet:
        raise HTTPException(status_code=404, detail="Genesis wallet not found")
    balance = await get_balance(genesis_wallet['address'])
    return {
        "address": genesis_wallet['address'],
        "name": genesis_wallet.get('name', 'Genesis Wallet'),
        "balance": balance,
        "premine_amount": PREMINE_AMOUNT,
        "created_at": genesis_wallet.get('created_at')
    }

@api_router.post("/admin/reset-blockchain")
async def reset_blockchain(admin_key: str):
    expected_key = os.environ.get('ADMIN_KEY', 'bricscoin-admin-2026')
    if admin_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    await db.blocks.delete_many({})
    await db.transactions.delete_many({})
    await db.genesis_wallet.delete_many({})
    await db.pending_transactions.delete_many({})
    await create_genesis_block()
    genesis_wallet = await db.genesis_wallet.find_one({}, {"_id": 0})
    return {
        "success": True,
        "message": "Blockchain reset successfully",
        "genesis_wallet": {
            "address": genesis_wallet['address'],
            "seed_phrase": genesis_wallet['seed_phrase'],
            "private_key": genesis_wallet['private_key'],
            "IMPORTANT": "SAVE THIS SEED PHRASE SECURELY! It controls the 1,000,000 BRICS premine!"
        }
    }

@api_router.get("/blocks")
async def get_blocks(limit: int = 20, offset: int = 0):
    blocks = await db.blocks.find({}, {"_id": 0}).sort("index", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.blocks.count_documents({})
    return {"blocks": blocks, "total": total}

@api_router.get("/blocks/{index}")
async def get_block(index: int):
    block = await db.blocks.find_one({"index": index}, {"_id": 0})
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block

@api_router.get("/blocks/hash/{block_hash}")
async def get_block_by_hash(block_hash: str):
    block = await db.blocks.find_one({"hash": block_hash}, {"_id": 0})
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block

@api_router.get("/transactions")
@limiter.limit("60/minute")
async def get_transactions(request: Request, limit: int = 20, offset: int = 0, confirmed: Optional[bool] = None):
    limit = min(max(1, limit), 100)
    offset = max(0, offset)
    query = {}
    if confirmed is not None:
        query["confirmed"] = confirmed
    transactions = await db.transactions.find(query, {"_id": 0}).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.transactions.count_documents(query)
    return {"transactions": transactions, "total": total}

@api_router.get("/transactions/{tx_id}")
@limiter.limit("120/minute")
async def get_transaction(request: Request, tx_id: str):
    if not re.match(r'^[a-fA-F0-9-]{36}$', tx_id):
        raise HTTPException(status_code=400, detail="Invalid transaction ID format")
    tx = await db.transactions.find_one({"id": tx_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@api_router.post("/transactions/secure")
@limiter.limit("10/minute")
async def create_secure_transaction(request: Request, tx_request: SecureTransactionRequest):
    client_ip = get_remote_address(request)
    
    if client_ip in ip_blacklist:
        if datetime.now(timezone.utc) < ip_blacklist[client_ip]:
            raise HTTPException(status_code=403, detail="Access temporarily blocked")
        else:
            del ip_blacklist[client_ip]
    
    total_cost = tx_request.amount + TRANSACTION_FEE
    sender_balance = await get_balance(tx_request.sender_address)
    if sender_balance < total_cost:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Need: {total_cost} BRICS. Available: {sender_balance}")
    
    expected_address = generate_address_from_public_key(tx_request.public_key)
    if expected_address != tx_request.sender_address:
        failed_attempts[client_ip] += 1
        raise HTTPException(status_code=400, detail="Public key does not match sender address")
    
    amount_str = str(tx_request.amount)
    if amount_str.endswith('.0'):
        amount_str = amount_str[:-2]
    tx_data = f"{tx_request.sender_address}{tx_request.recipient_address}{amount_str}{tx_request.timestamp}"
    
    try:
        is_valid = verify_signature(tx_request.public_key, tx_request.signature, tx_data)
        if not is_valid:
            failed_attempts[client_ip] += 1
            raise HTTPException(status_code=400, detail="Invalid transaction signature")
    except BadSignatureError:
        failed_attempts[client_ip] += 1
        raise HTTPException(status_code=400, detail="Invalid transaction signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Signature verification failed")
    
    try:
        tx_time = datetime.fromisoformat(tx_request.timestamp.replace('Z', '+00:00'))
        time_diff = abs((datetime.now(timezone.utc) - tx_time).total_seconds())
        if time_diff > 300:
            raise HTTPException(status_code=400, detail="Transaction timestamp too old or too far in future")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid timestamp format")
    
    existing = await db.transactions.find_one({"signature": tx_request.signature})
    if existing:
        raise HTTPException(status_code=400, detail="Transaction already exists (possible replay attack)")
    
    failed_attempts[client_ip] = 0
    
    tx_id = str(uuid.uuid4())
    transaction = {
        "id": tx_id,
        "sender": tx_request.sender_address,
        "recipient": tx_request.recipient_address,
        "amount": tx_request.amount,
        "fee": TRANSACTION_FEE,
        "timestamp": tx_request.timestamp,
        "signature": tx_request.signature,
        "public_key": tx_request.public_key,
        "confirmed": True,
        "block_index": None,
        "ip_hash": hashlib.sha256(client_ip.encode()).hexdigest()[:16]
    }
    
    await db.transactions.insert_one(transaction)
    del transaction["_id"]
    del transaction["ip_hash"]
    
    asyncio.create_task(broadcast_to_peers("broadcast/transaction", {"transaction": transaction, "sender_node_id": NODE_ID}))
    
    logger.info(f"Secure transaction created: {tx_id} ({tx_request.amount} BRICS)")
    return transaction

@api_router.post("/transactions")
@limiter.limit("5/minute")
async def create_transaction_legacy(request: Request, tx_request: TransactionRequest):
    sender_balance = await get_balance(tx_request.sender_address)
    if sender_balance < tx_request.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {sender_balance}")
    if tx_request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    tx_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    tx_data = f"{tx_request.sender_address}{tx_request.recipient_address}{tx_request.amount}{timestamp}"
    
    try:
        signature = sign_transaction(tx_request.sender_private_key, tx_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid private key: {str(e)}")
    
    private_key = SigningKey.from_string(bytes.fromhex(tx_request.sender_private_key), curve=SECP256k1)
    public_key_hex = private_key.get_verifying_key().to_string().hex()
    
    transaction = {
        "id": tx_id,
        "sender": tx_request.sender_address,
        "recipient": tx_request.recipient_address,
        "amount": tx_request.amount,
        "timestamp": timestamp,
        "signature": signature,
        "public_key": public_key_hex,
        "confirmed": False,
        "block_index": None
    }
    
    await db.transactions.insert_one(transaction)
    del transaction["_id"]
    
    asyncio.create_task(broadcast_to_peers("broadcast/transaction", {"transaction": transaction, "sender_node_id": NODE_ID}))
    
    return {**transaction, "warning": "DEPRECATED: This endpoint is insecure. Use /transactions/secure with client-side signing."}

@api_router.get("/transactions/address/{address}")
async def get_address_transactions(address: str, limit: int = 50):
    transactions = await db.transactions.find(
        {"$or": [{"sender": address}, {"recipient": address}]}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"transactions": transactions}

@api_router.get("/mining/template")
async def get_mining_template():
    await create_genesis_block()
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        raise HTTPException(status_code=500, detail="No genesis block")
    
    pending_txs = await db.transactions.find({"confirmed": False}, {"_id": 0}).limit(10).to_list(10)
    new_index = last_block['index'] + 1
    difficulty = await get_current_difficulty()
    reward = get_mining_reward(new_index)
    timestamp = datetime.now(timezone.utc).isoformat()
    
    block_template = {
        "index": new_index,
        "timestamp": timestamp,
        "transactions": pending_txs,
        "previous_hash": last_block['hash'],
        "difficulty": difficulty,
        "reward": reward,
        "target": "0" * difficulty
    }
    block_data = f"{new_index}{timestamp}{json.dumps(pending_txs, sort_keys=True)}{last_block['hash']}"
    
    return {"template": block_template, "block_data": block_data, "difficulty": difficulty, "target": "0" * difficulty, "reward": reward}

@api_router.post("/mining/submit")
async def submit_mined_block(submission: MiningSubmit):
    full_data = submission.block_data + str(submission.nonce)
    calculated_hash = sha256_hash(full_data)
    
    if calculated_hash != submission.hash:
        raise HTTPException(status_code=400, detail="Invalid hash")
    
    difficulty = await get_current_difficulty()
    if not check_difficulty(submission.hash, difficulty):
        raise HTTPException(status_code=400, detail=f"Hash doesn't meet difficulty")
    
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        raise HTTPException(status_code=500, detail="No genesis block")
    
    new_index = last_block['index'] + 1
    existing = await db.blocks.find_one({"index": new_index})
    if existing:
        raise HTTPException(status_code=409, detail="Block already mined")
    
    pending_txs = await db.transactions.find({"confirmed": False}, {"_id": 0}).limit(10).to_list(10)
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
    
    await db.blocks.insert_one(new_block)
    
    tx_ids = [tx['id'] for tx in pending_txs]
    if tx_ids:
        await db.transactions.update_many({"id": {"$in": tx_ids}}, {"$set": {"confirmed": True, "block_index": new_index}})
    
    del new_block["_id"]
    
    asyncio.create_task(broadcast_to_peers("broadcast/block", {"block": new_block, "sender_node_id": NODE_ID}))
    
    return {"success": True, "block": new_block, "reward": get_mining_reward(new_index)}

@api_router.post("/wallet/create")
@limiter.limit("5/minute")
async def create_wallet(request: Request, wallet_request: WalletCreate):
    wallet_data = generate_wallet()
    wallet = {
        "address": wallet_data['address'],
        "public_key": wallet_data['public_key'],
        "private_key": wallet_data['private_key'],
        "seed_phrase": wallet_data['seed_phrase'],
        "name": wallet_request.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    logger.info(f"Wallet created: {wallet_data['address'][:20]}...")
    return wallet

@api_router.post("/wallet/import/seed")
@limiter.limit("5/minute")
async def import_wallet_seed(request: Request, wallet_request: WalletImportSeed):
    words = wallet_request.seed_phrase.strip().split()
    if len(words) != 12:
        raise HTTPException(status_code=400, detail="Seed phrase must be exactly 12 words")
    try:
        wallet_data = generate_wallet_from_seed(wallet_request.seed_phrase)
        wallet = {
            "address": wallet_data['address'],
            "public_key": wallet_data['public_key'],
            "private_key": wallet_data['private_key'],
            "seed_phrase": wallet_data['seed_phrase'],
            "name": wallet_request.name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        return wallet
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/wallet/import/key")
@limiter.limit("5/minute")
async def import_wallet_key(request: Request, wallet_request: WalletImportPrivateKey):
    try:
        wallet_data = recover_wallet_from_private_key(wallet_request.private_key)
        wallet = {
            "address": wallet_data['address'],
            "public_key": wallet_data['public_key'],
            "private_key": wallet_data['private_key'],
            "name": wallet_request.name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        return wallet
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/wallet/{address}/balance")
async def get_wallet_balance(address: str):
    balance = await get_balance(address)
    return {"address": address, "balance": balance}

@api_router.get("/wallet/{address}/qr")
async def get_wallet_qr(address: str):
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
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(address)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    base64_img = base64.b64encode(buffer.getvalue()).decode()
    return {"qr_code": f"data:image/png;base64,{base64_img}"}

@api_router.get("/address/{address}")
async def get_address_info(address: str):
    balance = await get_balance(address)
    tx_count = await db.transactions.count_documents({"$or": [{"sender": address}, {"recipient": address}]})
    mined_blocks = await db.blocks.count_documents({"miner": address})
    recent_txs = await db.transactions.find({"$or": [{"sender": address}, {"recipient": address}]}, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(10)
    return {"address": address, "balance": balance, "transaction_count": tx_count, "mined_blocks": mined_blocks, "recent_transactions": recent_txs}

# ==================== P2P ENDPOINTS ====================
@api_router.post("/p2p/register")
async def register_peer(peer: PeerRegister):
    connected_peers[peer.node_id] = {"url": peer.url, "node_id": peer.node_id, "version": peer.version, "last_seen": datetime.now(timezone.utc).isoformat()}
    blocks_count = await db.blocks.count_documents({})
    return {"node_id": NODE_ID, "version": "1.0.0", "blocks_height": blocks_count, "message": "Peer registered successfully"}

@api_router.get("/p2p/peers")
async def get_peers():
    return {"node_id": NODE_ID, "peers": list(connected_peers.values()), "peer_count": len(connected_peers)}

@api_router.get("/p2p/chain/info")
async def get_chain_info():
    blocks_count = await db.blocks.count_documents({})
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    return {"node_id": NODE_ID, "height": blocks_count, "last_block_hash": last_block['hash'] if last_block else None, "difficulty": await get_current_difficulty()}

@api_router.get("/p2p/chain/blocks")
async def get_chain_blocks(from_height: int = 0, limit: int = 100):
    blocks = await db.blocks.find({"index": {"$gte": from_height}}, {"_id": 0}).sort("index", 1).limit(limit).to_list(limit)
    return {"blocks": blocks, "from_height": from_height, "count": len(blocks)}

@api_router.post("/p2p/broadcast/block")
async def receive_broadcast_block(data: BroadcastBlock):
    block = data.block
    existing = await db.blocks.find_one({"index": block['index']})
    if existing:
        return {"status": "already_exists"}
    if not await validate_block(block):
        return {"status": "invalid_block"}
    await db.blocks.insert_one(block)
    tx_ids = [tx['id'] for tx in block.get('transactions', [])]
    if tx_ids:
        await db.transactions.update_many({"id": {"$in": tx_ids}}, {"$set": {"confirmed": True, "block_index": block['index']}})
    asyncio.create_task(broadcast_to_peers("broadcast/block", {"block": block, "sender_node_id": NODE_ID}, exclude_node=data.sender_node_id))
    return {"status": "accepted", "block_index": block['index']}

@api_router.post("/p2p/broadcast/transaction")
async def receive_broadcast_transaction(data: BroadcastTransaction):
    tx = data.transaction
    existing = await db.transactions.find_one({"id": tx['id']})
    if existing:
        return {"status": "already_exists"}
    await db.transactions.insert_one(tx)
    asyncio.create_task(broadcast_to_peers("broadcast/transaction", {"transaction": tx, "sender_node_id": NODE_ID}, exclude_node=data.sender_node_id))
    return {"status": "accepted", "tx_id": tx['id']}

@api_router.post("/p2p/sync")
async def trigger_sync():
    synced = 0
    for peer in list(connected_peers.values()):
        try:
            await sync_blockchain_from_peer(peer['url'])
            synced += 1
        except: pass
    return {"status": "sync_complete", "peers_synced": synced}

@api_router.get("/p2p/node/info")
async def get_node_info():
    blocks_count = await db.blocks.count_documents({})
    pending_count = await db.transactions.count_documents({"confirmed": False})
    return {"node_id": NODE_ID, "node_url": NODE_URL, "version": "1.0.0", "blocks_height": blocks_count, "pending_transactions": pending_count, "connected_peers": len(connected_peers), "peer_list": [{"node_id": p['node_id'], "url": p['url']} for p in connected_peers.values()]}

# ==================== DOWNLOADS ENDPOINTS ====================
DOWNLOADS_DIR = '/app/downloads'

@api_router.get("/downloads")
async def list_downloads():
    files = []
    if os.path.exists(DOWNLOADS_DIR):
        for f in os.listdir(DOWNLOADS_DIR):
            path = os.path.join(DOWNLOADS_DIR, f)
            if os.path.isfile(path):
                files.append({"name": f, "size": os.path.getsize(path), "url": f"/api/downloads/{f}"})
    return {"files": files}

@api_router.get("/downloads/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(DOWNLOADS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, filename=filename, media_type="application/octet-stream")

# ==================== MINERS ENDPOINTS ====================
@api_router.get("/miners/stats")
async def get_miners_stats():
    try:
        with open('/tmp/miners_count.txt', 'r') as f:
            return {"active_miners": int(f.read().strip())}
    except:
        return {"active_miners": 0}

@api_router.get("/miners/count")
async def get_miners_count():
    try:
        with open('/tmp/miners_count.txt', 'r') as f:
            return {"connected_miners": int(f.read().strip())}
    except:
        return {"connected_miners": 0}

# Include router
app.include_router(api_router)

# ==================== MIDDLEWARES ====================
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if "server" in response.headers:
            del response.headers["server"]
        return response

class IPBlockingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = get_remote_address(request)
        if client_ip in ip_blacklist:
            if datetime.now(timezone.utc).timestamp() < ip_blacklist[client_ip].timestamp():
                return JSONResponse(status_code=403, content={"detail": "Access temporarily blocked"})
            else:
                del ip_blacklist[client_ip]
        response = await call_next(request)
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(IPBlockingMiddleware)

cors_origins = os.environ.get('CORS_ORIGINS', 'https://bricscoin26.org').split(',')
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

security_handler = logging.StreamHandler()
security_handler.setLevel(logging.WARNING)
security_handler.setFormatter(logging.Formatter('%(asctime)s - SECURITY - %(levelname)s - %(message)s'))
security_logger.addHandler(security_handler)

@app.on_event("startup")
async def startup_event():
    await create_genesis_block()
    logger.info(f"BricsCoin node started - ID: {NODE_ID}")
    if SEED_NODES:
        asyncio.create_task(discover_peers())
    asyncio.create_task(periodic_sync())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
