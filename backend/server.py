from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Request, Depends
from fastapi.responses import StreamingResponse, JSONResponse
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
from datetime import datetime, timezone, timedelta
import hashlib
import json
import time
import secrets
from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError, util
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
from pqc_crypto import (
    generate_pqc_wallet, recover_pqc_wallet,
    hybrid_sign, hybrid_verify, create_migration_transaction
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ==================== SECURITY CONFIGURATION ====================
# Rate Limiting
limiter = Limiter(key_func=get_remote_address)

# Security logging
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.WARNING)

# IP blacklist for detected attacks
ip_blacklist: Dict[str, datetime] = {}
failed_attempts: Dict[str, int] = defaultdict(int)
MAX_FAILED_ATTEMPTS = 10
BLACKLIST_DURATION = 3600  # 1 hour in seconds

# Allowed domains for CORS (production)
ALLOWED_ORIGINS = [
    "https://bricscoin26.org",
    "https://www.bricscoin26.org",
    "http://localhost:3000",  # Development only
]

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app with security settings
app = FastAPI(
    title="BricsCoin API", 
    version="2.0.0",
    docs_url=None if os.environ.get('PRODUCTION') == 'true' else "/docs",  # Disable docs in production
    redoc_url=None if os.environ.get('PRODUCTION') == 'true' else "/redoc"
)

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== BRICSCOIN CONSTANTS ====================
MAX_SUPPLY = 21_000_000
INITIAL_REWARD = 50
HALVING_INTERVAL = 210_000
DIFFICULTY_ADJUSTMENT_INTERVAL = 2016
TARGET_BLOCK_TIME = 600  # 10 minutes in seconds
INITIAL_DIFFICULTY = 1000000  # Bitcoin-style difficulty (higher = harder)
PREMINE_AMOUNT = 1_000_000  # Initial premine for development/distribution
TRANSACTION_FEE = 0.000005  # Fee per transaction in BRICS

# Genesis wallet for premine (will be created on first run)
GENESIS_WALLET_ADDRESS = None  # Set dynamically when genesis block is created

# P2P Network Configuration
NODE_ID = os.environ.get('NODE_ID', str(uuid.uuid4())[:8])
NODE_URL = os.environ.get('NODE_URL', '')
SEED_NODES = os.environ.get('SEED_NODES', '').split(',') if os.environ.get('SEED_NODES') else []

# Store connected peers
connected_peers: Dict[str, Dict] = {}
sync_lock = asyncio.Lock()

# Node PQC keypair for block signing (loaded on startup)
node_pqc_keys: Dict[str, str] = {}

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

# SECURE Transaction Request - NO private key sent over network!
# Transaction is signed CLIENT-SIDE and only signature is sent
class SecureTransactionRequest(BaseModel):
    """
    Secure transaction model - private key NEVER leaves the client.
    Client signs the transaction locally and sends only the signature.
    """
    sender_address: str
    recipient_address: str
    amount: float
    timestamp: str
    signature: str  # Transaction signed client-side
    public_key: str  # Sender's public key for verification
    
    @field_validator('sender_address', 'recipient_address')
    @classmethod
    def validate_address(cls, v):
        if not v.startswith('BRICS') or len(v) < 40:
            raise ValueError('Invalid BRICS address format')
        # Accept both legacy (BRICS + 40 hex) and PQC (BRICSPQ + 38 hex) addresses
        if not re.match(r'^BRICS(PQ)?[a-fA-F0-9]{38,40}$', v):
            raise ValueError('Invalid address format')
        return v
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        if v > 21_000_000:
            raise ValueError('Amount exceeds maximum supply')
        # Check for reasonable precision (8 decimal places like Bitcoin)
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

# Legacy model - DEPRECATED, kept for backward compatibility but will be removed
class TransactionRequest(BaseModel):
    """DEPRECATED: Use SecureTransactionRequest instead"""
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
    hashrate_from_shares: float  # Hashrate reale calcolato dalle shares
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

# ==================== PQC MODELS ====================
class PQCWalletCreate(BaseModel):
    name: Optional[str] = "PQC Wallet"

class PQCWalletImportKeys(BaseModel):
    ecdsa_private_key: str
    dilithium_secret_key: str
    dilithium_public_key: str
    name: Optional[str] = "Imported PQC Wallet"

class PQCSecureTransactionRequest(BaseModel):
    sender_address: str
    recipient_address: str
    amount: float
    timestamp: str
    ecdsa_signature: str
    dilithium_signature: str
    ecdsa_public_key: str
    dilithium_public_key: str

    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        if v > 21_000_000:
            raise ValueError('Amount exceeds maximum supply')
        return v

class PQCVerifyRequest(BaseModel):
    message: str
    ecdsa_public_key: str
    dilithium_public_key: str
    ecdsa_signature: str
    dilithium_signature: str

class MigrationRequest(BaseModel):
    legacy_private_key: str
    pqc_address: str
    amount: float

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
    """
    Check if hash meets difficulty requirement (Bitcoin-style).
    Converts hash to integer and compares against target.
    Higher difficulty = lower target = harder to find valid hash.
    """
    # Bitcoin-style: target = max_target / difficulty
    # max_target for SHA256 is 2^256 - 1, but we use a practical max
    max_target = 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
    target = max_target // difficulty
    
    # Convert hash to integer
    hash_int = int(hash_value, 16)
    
    return hash_int <= target

async def get_current_difficulty() -> int:
    """
    Calcola la difficoltà per il PROSSIMO blocco.
    
    Bitcoin-style adjustment:
    - Ogni 10 blocchi (o 2016 dopo 2016 blocchi), ricalcola la difficoltà
    - Se i blocchi sono troppo veloci → aumenta difficoltà
    - Se i blocchi sono troppo lenti → diminuisce difficoltà
    - Limiti: max 4x aumento, min 0.25x diminuzione per adjustment
    - NO decay temporale (causa il bug difficulty=1)
    """
    blocks_count = await db.blocks.count_documents({})
    
    # Primo blocco: difficoltà iniziale
    if blocks_count == 0:
        return INITIAL_DIFFICULTY
    
    # Prendi l'ultimo blocco
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        return INITIAL_DIFFICULTY
    
    # Difficoltà corrente dall'ultimo blocco
    current_difficulty = max(1, last_block.get("difficulty", INITIAL_DIFFICULTY))
    current_index = last_block.get("index", 0)
    
    # Intervallo di adjustment: 10 blocchi all'inizio, poi 2016
    adjustment_interval = 10 if blocks_count < 2016 else 2016
    
    # Calcola solo ai blocchi di adjustment (es: 10, 20, 30... o 2016, 4032...)
    if current_index > 0 and current_index % adjustment_interval == 0:
        # Prendi gli ultimi N blocchi per calcolare il tempo medio
        last_blocks = await db.blocks.find({}, {"_id": 0, "timestamp": 1, "index": 1, "difficulty": 1}).sort("index", -1).limit(adjustment_interval + 1).to_list(adjustment_interval + 1)
        
        if len(last_blocks) >= 2:
            # Ordina per index crescente
            last_blocks.sort(key=lambda x: x.get("index", 0))
            
            try:
                first_time = datetime.fromisoformat(last_blocks[0]["timestamp"].replace("Z", "+00:00"))
                last_time = datetime.fromisoformat(last_blocks[-1]["timestamp"].replace("Z", "+00:00"))
                actual_time = (last_time - first_time).total_seconds()
            except (ValueError, KeyError):
                actual_time = TARGET_BLOCK_TIME * len(last_blocks)
            
            if actual_time <= 0:
                actual_time = 1
            
            # Tempo previsto per N blocchi
            expected_time = TARGET_BLOCK_TIME * (len(last_blocks) - 1)
            
            # Ratio: se actual < expected, blocchi veloci → aumenta diff
            # se actual > expected, blocchi lenti → diminuisce diff
            ratio = expected_time / actual_time
            
            # Limiti Bitcoin: max 4x, min 0.25x
            ratio = max(0.25, min(4.0, ratio))
            
            new_difficulty = max(1, int(current_difficulty * ratio))
            
            avg_block_time = actual_time / max(1, len(last_blocks) - 1)
            
            logging.info(
                "⚙️ DIFFICULTY ADJUSTMENT @ block %d: current=%d, avg_time=%.1fs, target=%ds, ratio=%.2f, NEW=%d",
                current_index,
                current_difficulty,
                avg_block_time,
                TARGET_BLOCK_TIME,
                ratio,
                new_difficulty
            )
            
            return new_difficulty
    
    # Non siamo a un blocco di adjustment: mantieni la difficoltà corrente
    return current_difficulty

async def get_circulating_supply() -> float:
    """Calculate total circulating supply (premine + mining rewards)"""
    blocks_count = await db.blocks.count_documents({})
    supply = PREMINE_AMOUNT  # Start with premine
    # Start from block 1 (not 0) - genesis block doesn't give mining reward
    for i in range(1, blocks_count):
        supply += get_mining_reward(i)
    return min(supply, MAX_SUPPLY)

async def create_genesis_block():
    """Create genesis block with premine transaction if it doesn't exist"""
    global GENESIS_WALLET_ADDRESS
    
    existing = await db.blocks.find_one({"index": 0})
    if existing:
        # Load genesis wallet from existing genesis block
        if existing.get('transactions') and len(existing['transactions']) > 0:
            GENESIS_WALLET_ADDRESS = existing['transactions'][0].get('recipient')
        return
    
    # Create genesis wallet
    mnemo = Mnemonic("english")
    seed_phrase = mnemo.generate(strength=128)
    seed = mnemo.to_seed(seed_phrase)
    private_key = SigningKey.from_string(seed[:32], curve=SECP256k1)
    public_key = private_key.get_verifying_key()
    
    # Generate address
    public_key_hex = public_key.to_string().hex()
    address_hash = hashlib.sha256(public_key_hex.encode()).hexdigest()[:40]
    genesis_address = f"BRICS{address_hash}"
    GENESIS_WALLET_ADDRESS = genesis_address
    
    # Store genesis wallet in database
    genesis_wallet = {
        "address": genesis_address,
        "public_key": public_key_hex,
        "private_key": private_key.to_string().hex(),
        "seed_phrase": seed_phrase,
        "name": "Genesis Wallet (Premine)",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_genesis": True
    }
    await db.genesis_wallet.delete_many({})  # Clear old genesis wallet
    await db.genesis_wallet.insert_one(genesis_wallet)
    
    # Create premine transaction
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
    logging.info(f"Genesis wallet seed phrase: {seed_phrase}")
    logging.info(f"IMPORTANT: Save this seed phrase securely!")

# ==================== P2P NETWORK FUNCTIONS ====================
async def register_with_peer(peer_url: str) -> bool:
    """Register this node with a peer"""
    if not NODE_URL:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            blocks_count = await db.blocks.count_documents({})
            response = await client.post(
                f"{peer_url}/api/p2p/register",
                json={
                    "node_id": NODE_ID,
                    "url": NODE_URL,
                    "version": "1.0.0"
                }
            )
            if response.status_code == 200:
                peer_data = response.json()
                connected_peers[peer_data['node_id']] = {
                    "url": peer_url,
                    "node_id": peer_data['node_id'],
                    "version": peer_data.get('version', '1.0.0'),
                    "last_seen": datetime.now(timezone.utc).isoformat()
                }
                logging.info(f"Registered with peer: {peer_url}")
                return True
    except Exception as e:
        logging.error(f"Failed to register with peer {peer_url}: {e}")
    return False

async def broadcast_to_peers(endpoint: str, data: dict, exclude_node: str = None):
    """Broadcast data to all connected peers"""
    tasks = []
    for node_id, peer in connected_peers.items():
        if node_id == exclude_node:
            continue
        tasks.append(send_to_peer(peer['url'], endpoint, data))
    
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

async def send_to_peer(peer_url: str, endpoint: str, data: dict) -> bool:
    """Send data to a specific peer"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(f"{peer_url}/api/p2p/{endpoint}", json=data)
            return response.status_code == 200
    except Exception as e:
        logging.error(f"Failed to send to peer {peer_url}: {e}")
        return False

async def sync_blockchain_from_peer(peer_url: str, full_sync: bool = False):
    """Sync blockchain from a peer if they have a longer chain"""
    async with sync_lock:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Get peer's chain info
                response = await client.get(f"{peer_url}/api/p2p/chain/info")
                if response.status_code != 200:
                    return False
                
                peer_info = response.json()
                our_height = await db.blocks.count_documents({})
                
                if peer_info['height'] <= our_height:
                    logging.info(f"Chain up to date with {peer_url} (our: {our_height}, peer: {peer_info['height']})")
                    return True  # Our chain is longer or equal
                
                blocks_behind = peer_info['height'] - our_height
                logging.info(f"Syncing {blocks_behind} blocks from {peer_url}...")
                
                # Sync in batches of 500 blocks for full sync, 100 for periodic
                batch_size = 500 if full_sync else 100
                current_height = our_height
                total_synced = 0
                
                while current_height < peer_info['height']:
                    response = await client.get(
                        f"{peer_url}/api/p2p/chain/blocks",
                        params={"from_height": current_height, "limit": batch_size},
                        timeout=120.0
                    )
                    
                    if response.status_code != 200:
                        logging.error(f"Failed to get blocks from {peer_url}")
                        break
                    
                    blocks_data = response.json()
                    blocks = blocks_data.get('blocks', [])
                    
                    if not blocks:
                        break
                    
                    # Add blocks in order
                    for block in blocks:
                        existing = await db.blocks.find_one({"index": block['index']})
                        if existing:
                            continue
                        
                        # For sync, we trust peer's blocks if hash chain is valid
                        if block['index'] == 0:
                            # Genesis block - just add it
                            await db.blocks.insert_one(block)
                            total_synced += 1
                        else:
                            # Verify previous hash exists
                            prev_block = await db.blocks.find_one({"index": block['index'] - 1})
                            if prev_block and prev_block['hash'] == block['previous_hash']:
                                await db.blocks.insert_one(block)
                                total_synced += 1
                            elif not prev_block:
                                # Missing previous block, will get it in next iteration
                                logging.warning(f"Missing block #{block['index'] - 1}, skipping #{block['index']}")
                                continue
                    
                    current_height = blocks[-1]['index'] + 1 if blocks else current_height + batch_size
                    
                    if total_synced > 0 and total_synced % 100 == 0:
                        logging.info(f"Sync progress: {total_synced} blocks synced...")
                
                if total_synced > 0:
                    logging.info(f"✓ Synced {total_synced} blocks from {peer_url}")
                return True
                
        except Exception as e:
            logging.error(f"Failed to sync from peer {peer_url}: {e}")
            return False

async def validate_block(block: dict) -> bool:
    """Validate a block (including PQC signature if present)"""
    try:
        # Verify hash
        calculated_hash = calculate_block_hash(
            block['index'],
            block['timestamp'],
            block['transactions'],
            block.get('proof', block.get('nonce', 0)),
            block['previous_hash'],
            block.get('nonce', 0)
        )
        
        if block['hash'] != calculated_hash:
            # Try alternative calculation for submitted blocks
            block_data = f"{block['index']}{block['timestamp']}{json.dumps(block['transactions'], sort_keys=True)}{block['previous_hash']}"
            full_data = block_data + str(block.get('nonce', 0))
            alt_hash = sha256_hash(full_data)
            if block['hash'] != alt_hash:
                return False
        
        # Verify difficulty
        if not check_difficulty(block['hash'], block.get('difficulty', INITIAL_DIFFICULTY)):
            return False
        
        # Verify previous hash (except genesis)
        if block['index'] > 0:
            prev_block = await db.blocks.find_one({"index": block['index'] - 1}, {"_id": 0})
            if prev_block and prev_block['hash'] != block['previous_hash']:
                return False
        
        # Verify PQC signature if present
        if block.get('pqc_ecdsa_signature') and block.get('pqc_dilithium_signature'):
            block_sig_data = f"{block['index']}{block['timestamp']}{block['hash']}{block.get('miner', '')}"
            pqc_result = hybrid_verify(
                block['pqc_public_key_ecdsa'],
                block['pqc_public_key_dilithium'],
                block['pqc_ecdsa_signature'],
                block['pqc_dilithium_signature'],
                block_sig_data
            )
            if not pqc_result['hybrid_valid']:
                logging.warning(f"Block {block['index']} PQC signature invalid!")
                return False
        
        return True
    except Exception as e:
        logging.error(f"Block validation error: {e}")
        return False

async def discover_peers():
    """Discover peers from seed nodes and perform initial sync"""
    logging.info("Starting peer discovery and initial blockchain sync...")
    
    for seed_url in SEED_NODES:
        if seed_url and seed_url.strip():
            seed_url = seed_url.strip()
            logging.info(f"Connecting to seed node: {seed_url}")
            
            # Register with seed
            registered = await register_with_peer(seed_url)
            if registered:
                # Perform full initial sync from seed
                logging.info(f"Starting full blockchain sync from {seed_url}...")
                await sync_blockchain_from_peer(seed_url, full_sync=True)
    
    our_height = await db.blocks.count_documents({})
    logging.info(f"Initial sync complete. Local blockchain height: {our_height}")

async def periodic_sync():
    """Periodically sync with peers"""
    while True:
        await asyncio.sleep(60)  # Sync every minute
        for peer in list(connected_peers.values()):
            await sync_blockchain_from_peer(peer['url'])

# ==================== WALLET FUNCTIONS ====================
# BIP39 Mnemonic generator
mnemo = Mnemonic("english")

def generate_wallet_from_seed(seed_phrase: str = None):
    """Generate wallet from seed phrase or create new one"""
    if seed_phrase:
        # Validate seed phrase
        if not mnemo.check(seed_phrase):
            raise ValueError("Invalid seed phrase")
        seed = mnemo.to_seed(seed_phrase)
    else:
        # Generate new seed phrase (12 words)
        seed_phrase = mnemo.generate(strength=128)  # 128 bits = 12 words
        seed = mnemo.to_seed(seed_phrase)
    
    # Derive private key from seed (first 32 bytes) - MUST match genesis wallet generation
    private_key_bytes = seed[:32]
    private_key = SigningKey.from_string(private_key_bytes, curve=SECP256k1)
    public_key = private_key.get_verifying_key()
    
    # Generate address from public key hash
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
    """Generate new wallet with ECDSA keys and seed phrase"""
    return generate_wallet_from_seed()

def recover_wallet_from_private_key(private_key_hex: str):
    """Recover wallet from private key"""
    try:
        private_key = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
        public_key = private_key.get_verifying_key()
        
        pub_key_hex = public_key.to_string().hex()
        address_hash = sha256_hash(pub_key_hex)
        address = "BRICS" + address_hash[:40]
        
        return {
            "private_key": private_key_hex,
            "public_key": pub_key_hex,
            "address": address
        }
    except Exception as e:
        raise ValueError(f"Invalid private key: {str(e)}")

def sign_transaction(private_key_hex: str, transaction_data: str) -> str:
    """Sign transaction with private key (SHA-256, compatible with JS elliptic)"""
    private_key = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
    msg_hash = hashlib.sha256(transaction_data.encode()).digest()
    signature = private_key.sign_digest(msg_hash)
    return signature.hex()

def verify_signature(public_key_hex: str, signature_hex: str, transaction_data: str) -> bool:
    """Verify transaction signature (SHA-256, handles both DER and raw formats)"""
    try:
        public_key = VerifyingKey.from_string(bytes.fromhex(public_key_hex), curve=SECP256k1)
        msg_hash = hashlib.sha256(transaction_data.encode()).digest()
        sig_bytes = bytes.fromhex(signature_hex)
        # DER signatures start with 0x30 and are longer than 64 bytes
        if len(sig_bytes) > 64 and sig_bytes[0] == 0x30:
            return public_key.verify_digest(sig_bytes, msg_hash, sigdecode=util.sigdecode_der)
        return public_key.verify_digest(sig_bytes, msg_hash)
    except (BadSignatureError, Exception):
        return False

def js_number_str(n):
    """Format number like JavaScript does (no trailing .0 for integers)"""
    if isinstance(n, float) and n == int(n):
        return str(int(n))
    return str(n)

def build_tx_data(sender, recipient, amount, timestamp):
    """Build transaction data string matching JavaScript format"""
    return f"{sender}{recipient}{js_number_str(amount)}{timestamp}"

def generate_address_from_public_key(public_key_hex: str) -> str:
    """Generate BRICS address from public key - used to verify sender owns the address"""
    address_hash = sha256_hash(public_key_hex)
    return "BRICS" + address_hash[:40]

async def get_balance(address: str) -> float:
    """Calculate balance for an address (includes pending transactions)"""
    balance = 0.0
    
    # Add ALL received transactions (confirmed + pending) - includes mining rewards
    received = await db.transactions.find({"recipient": address}, {"_id": 0}).to_list(10000)
    for tx in received:
        balance += tx['amount']
    
    # Subtract ALL sent transactions (confirmed + pending) including fees
    sent = await db.transactions.find({"sender": address}, {"_id": 0}).to_list(10000)
    for tx in sent:
        balance -= tx['amount']
        balance -= tx.get('fee', 0)  # Subtract fee too
    
    return balance

# ==================== API ENDPOINTS ====================


# Mining / Stratum endpoints

@api_router.get("/mining/miners")
async def get_active_miners():
    """Return active miners based on database state.

    IMPORTANTO:
    - Non legge più lo stato in-memory del processo Stratum (che vive in un
      container/processo separato), ma utilizza la collezione `miners` su MongoDB.
    - I miner sono considerati *online* se:
      - non sono marcati come offline, e
      - l'ultimo `last_seen` è recente (es. ultimi 10 minuti).
    """
    # Finestra di attività (in secondi) oltre la quale un miner è considerato offline
    activity_window_seconds = 600  # 10 minuti

    # Recupera tutti i miner salvati in DB (la quantità è comunque molto piccola)
    docs = await db.miners.find({}, {"_id": 0}).to_list(1000)

    now = datetime.now(timezone.utc)
    active_miners = []

    for doc in docs:
        last_seen_str = doc.get("last_seen")
        online_flag = doc.get("online", True)

        # Se manca last_seen o è marcato esplicitamente offline, salta
        if not last_seen_str or not online_flag:
            continue

        try:
            last_seen = datetime.fromisoformat(last_seen_str.replace("Z", "+00:00"))
        except ValueError:
            # Formato non valido: meglio saltare questo record
            continue

        elapsed = (now - last_seen).total_seconds()
        if elapsed > activity_window_seconds:
            # Troppo vecchio, consideralo offline
            continue

        active_miners.append(doc)

    return {"miners": active_miners, "count": len(active_miners)}


@api_router.get("/miners/stats")
async def get_miners_stats():
    """
    Statistiche sui minatori attivi basate sulla collezione miner_shares.
    Più affidabile rispetto alla collezione miners perché traccia l'attività reale.
    """
    # Finestra di attività: ultimi 5 minuti
    activity_window = timedelta(minutes=5)
    cutoff_time = (datetime.now(timezone.utc) - activity_window).isoformat()
    
    # Conta minatori unici che hanno inviato share negli ultimi 5 minuti
    active_workers = await db.miner_shares.distinct(
        "worker",
        {"timestamp": {"$gte": cutoff_time}}
    )
    
    # Statistiche aggregate
    total_shares_24h_cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": total_shares_24h_cutoff}}},
        {"$group": {
            "_id": "$worker",
            "shares": {"$sum": 1},
            "blocks": {"$sum": {"$cond": ["$is_block", 1, 0]}},
            "last_seen": {"$max": "$timestamp"}
        }},
        {"$sort": {"shares": -1}}
    ]
    
    miner_stats = await db.miner_shares.aggregate(pipeline).to_list(100)
    
    # Calcola hashrate stimato (approssimativo basato sulle share)
    total_shares = sum(m.get("shares", 0) for m in miner_stats)
    total_blocks = sum(m.get("blocks", 0) for m in miner_stats)
    
    return {
        "active_miners": len(active_workers),
        "total_miners_24h": len(miner_stats),
        "total_shares_24h": total_shares,
        "total_blocks_24h": total_blocks,
        "miners": [
            {
                "worker": m["_id"],
                "shares": m["shares"],
                "blocks": m["blocks"],
                "last_seen": m["last_seen"]
            }
            for m in miner_stats[:20]  # Top 20 miners
        ]
    }


@api_router.get("/miners/count")
async def get_miners_count():
    """Get connected miners count (backward compatible)"""
    try:
        with open('/tmp/miners_count.txt', 'r') as f:
            return {"connected_miners": int(f.read().strip())}
    except Exception:
        return {"connected_miners": 0}


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
    
    # ============ HASHRATE CALCULATION ============
    # Bitcoin-style: hashrate = difficulty * 2^32 / block_time
    # 2^32 derives from max_target = 2^224, so 2^256 / 2^224 = 2^32
    HASHRATE_MULTIPLIER = 2 ** 32
    
    hashrate_estimate = 0.0
    if blocks_count >= 2:
        num_blocks = min(20, blocks_count)
        recent_blocks = await db.blocks.find({}, {"_id": 0, "timestamp": 1, "difficulty": 1}).sort("index", -1).limit(num_blocks).to_list(num_blocks)
        
        if len(recent_blocks) >= 2:
            try:
                first_block = recent_blocks[-1]
                last_block_data = recent_blocks[0]
                
                first_time = datetime.fromisoformat(first_block["timestamp"].replace("Z", "+00:00"))
                last_time = datetime.fromisoformat(last_block_data["timestamp"].replace("Z", "+00:00"))
                
                total_time = (last_time - first_time).total_seconds()
                num_intervals = len(recent_blocks) - 1
                
                if total_time > 0 and num_intervals > 0:
                    avg_block_time = total_time / num_intervals
                    avg_difficulty = sum(b.get("difficulty", 1) for b in recent_blocks) / len(recent_blocks)
                    # Formula: hashrate = difficulty * 2^48 / block_time
                    hashrate_estimate = (avg_difficulty * HASHRATE_MULTIPLIER) / avg_block_time
                else:
                    hashrate_estimate = (current_difficulty * HASHRATE_MULTIPLIER) / TARGET_BLOCK_TIME
            except (ValueError, KeyError):
                hashrate_estimate = (current_difficulty * HASHRATE_MULTIPLIER) / TARGET_BLOCK_TIME
        else:
            hashrate_estimate = (current_difficulty * HASHRATE_MULTIPLIER) / TARGET_BLOCK_TIME
    else:
        hashrate_estimate = (current_difficulty * HASHRATE_MULTIPLIER) / TARGET_BLOCK_TIME
    
    # ============ HASHRATE DALLE SHARES ============
    # Calcola anche l'hashrate basandosi sulle shares (backup/verifica)
    hashrate_from_shares = 0.0
    try:
        five_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        
        pipeline = [
            {"$match": {"timestamp": {"$gte": five_min_ago}}},
            {"$group": {
                "_id": None,
                "total_shares": {"$sum": 1},
                "weighted_difficulty": {"$sum": "$share_difficulty"}
            }}
        ]
        
        result = await db.miner_shares.aggregate(pipeline).to_list(1)
        
        if result and len(result) > 0:
            total_shares = result[0].get("total_shares", 0)
            weighted_difficulty = result[0].get("weighted_difficulty", 0)
            
            if total_shares > 0 and weighted_difficulty > 0:
                time_window = 300
                avg_share_diff = weighted_difficulty / total_shares
                # Usa lo stesso moltiplicatore
                hashrate_from_shares = (total_shares * avg_share_diff * HASHRATE_MULTIPLIER) / time_window
    except Exception:
        pass
    
    return NetworkStats(
        total_supply=MAX_SUPPLY,
        circulating_supply=circulating,
        remaining_supply=MAX_SUPPLY - circulating,
        total_blocks=blocks_count,
        current_difficulty=current_difficulty,
        hashrate_estimate=hashrate_estimate,
        hashrate_from_shares=hashrate_from_shares,
        pending_transactions=pending_count,
        last_block_time=last_block_time,
        next_halving_block=next_halving,
        current_reward=get_mining_reward(current_height)
    )

@api_router.get("/tokenomics")
async def get_tokenomics():
    """Get tokenomics and premine transparency info"""
    blocks_count = await db.blocks.count_documents({})
    mining_rewards = sum(get_mining_reward(i) for i in range(1, blocks_count))
    
    # Get genesis wallet address
    genesis_wallet = await db.genesis_wallet.find_one({}, {"_id": 0, "private_key": 0, "seed_phrase": 0})
    genesis_address = genesis_wallet.get('address') if genesis_wallet else None
    
    return {
        "total_supply": MAX_SUPPLY,
        "premine": {
            "amount": PREMINE_AMOUNT,
            "percentage": round((PREMINE_AMOUNT / MAX_SUPPLY) * 100, 2),
            "wallet_address": genesis_address,
            "allocation": {
                "team": {"amount": 1000000, "percentage": 100, "description": "Founder and core team"}
            },
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

@api_router.get("/richlist")
async def get_rich_list(limit: int = 100):
    """Get list of wallets sorted by balance (Rich List)"""
    try:
        # Get all unique addresses from transactions
        pipeline = [
            {"$group": {
                "_id": None,
                "senders": {"$addToSet": "$sender"},
                "recipients": {"$addToSet": "$recipient"}
            }}
        ]
        
        result = await db.transactions.aggregate(pipeline).to_list(1)
        
        addresses = set()
        if result:
            addresses.update(result[0].get("senders", []))
            addresses.update(result[0].get("recipients", []))
        
        # Also get miners from blocks
        miner_addresses = await db.blocks.distinct("miner")
        addresses.update(miner_addresses)
        
        # Remove empty/None addresses
        addresses = {a for a in addresses if a and a.startswith("BRICS")}
        
        # Calculate balance for each address
        wallets = []
        circulating = await get_circulating_supply()
        
        for address in addresses:
            balance = await get_balance(address)
            if balance > 0.001:  # Filter dust/rounding errors
                wallets.append({
                    "address": address,
                    "balance": round(balance, 8),
                    "percentage": round((balance / circulating) * 100, 4) if circulating > 0 else 0
                })
        
        # Sort by balance descending
        wallets.sort(key=lambda x: x["balance"], reverse=True)
        
        # Limit results
        wallets = wallets[:limit]
        
        # Add rank
        for i, wallet in enumerate(wallets):
            wallet["rank"] = i + 1
        
        return {
            "wallets": wallets,
            "total_holders": len(wallets),
            "circulating_supply": circulating
        }
    except Exception as e:
        logging.error(f"Rich list error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate rich list")

@api_router.get("/genesis-wallet")
async def get_genesis_wallet_info():
    """Get genesis wallet public info (for transparency)"""
    genesis_wallet = await db.genesis_wallet.find_one({}, {"_id": 0, "private_key": 0, "seed_phrase": 0})
    if not genesis_wallet:
        raise HTTPException(status_code=404, detail="Genesis wallet not found")
    
    # Get balance
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
    """Reset blockchain completely - DANGEROUS! Requires admin key"""
    # Simple admin key check (in production, use proper authentication)
    expected_key = os.environ.get('ADMIN_KEY', 'bricscoin-admin-2026')
    if admin_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    # Clear all blockchain data
    await db.blocks.delete_many({})
    await db.transactions.delete_many({})
    await db.genesis_wallet.delete_many({})
    await db.pending_transactions.delete_many({})
    
    # Recreate genesis block with new wallet
    await create_genesis_block()
    
    # Get new genesis wallet info
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
@limiter.limit("60/minute")
async def get_transactions(request: Request, limit: int = 20, offset: int = 0, confirmed: Optional[bool] = None):
    """Get transactions with pagination"""
    # Input validation
    limit = min(max(1, limit), 100)  # Clamp between 1-100
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
    """Get specific transaction"""
    # Validate tx_id format (UUID)
    if not re.match(r'^[a-fA-F0-9-]{36}$', tx_id):
        raise HTTPException(status_code=400, detail="Invalid transaction ID format")
    
    tx = await db.transactions.find_one({"id": tx_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@api_router.post("/transactions/secure")
@limiter.limit("10/minute")
async def create_secure_transaction(request: Request, tx_request: SecureTransactionRequest):
    """
    Create a secure transaction - PRIVATE KEY NEVER SENT TO SERVER.
    
    The transaction must be signed CLIENT-SIDE before submission.
    This endpoint only verifies the signature and processes the transaction.
    Transaction fee: 0.05 BRICS
    """
    client_ip = get_remote_address(request)
    
    # Check if IP is blacklisted
    if client_ip in ip_blacklist:
        if datetime.now(timezone.utc) < ip_blacklist[client_ip]:
            security_logger.warning(f"Blacklisted IP attempted transaction: {client_ip}")
            raise HTTPException(status_code=403, detail="Access temporarily blocked")
        else:
            del ip_blacklist[client_ip]
    
    # Calculate total cost (amount + fee)
    total_cost = tx_request.amount + TRANSACTION_FEE
    
    # Validate sender has enough balance (amount + fee)
    sender_balance = await get_balance(tx_request.sender_address)
    if sender_balance < total_cost:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. Need: {total_cost} BRICS (amount: {tx_request.amount} + fee: {TRANSACTION_FEE}). Available: {sender_balance}"
        )
    
    # Verify that the public key matches the sender address
    expected_address = generate_address_from_public_key(tx_request.public_key)
    if expected_address != tx_request.sender_address:
        failed_attempts[client_ip] += 1
        if failed_attempts[client_ip] >= MAX_FAILED_ATTEMPTS:
            ip_blacklist[client_ip] = datetime.now(timezone.utc).replace(
                second=datetime.now(timezone.utc).second + BLACKLIST_DURATION
            )
            security_logger.warning(f"IP blacklisted for failed attempts: {client_ip}")
        security_logger.warning(f"Address mismatch attempt from {client_ip}: {tx_request.sender_address}")
        raise HTTPException(status_code=400, detail="Public key does not match sender address")
    
    # Create transaction data for verification (same format as client-side signing)
    tx_data = build_tx_data(tx_request.sender_address, tx_request.recipient_address, tx_request.amount, tx_request.timestamp)
    
    # CRITICAL: Verify the signature
    try:
        is_valid = verify_signature(tx_request.public_key, tx_request.signature, tx_data)
        if not is_valid:
            failed_attempts[client_ip] += 1
            security_logger.warning(f"Invalid signature from {client_ip} for address {tx_request.sender_address}")
            raise HTTPException(status_code=400, detail="Invalid transaction signature")
    except BadSignatureError:
        failed_attempts[client_ip] += 1
        security_logger.warning(f"Bad signature from {client_ip}")
        raise HTTPException(status_code=400, detail="Invalid transaction signature")
    except Exception as e:
        security_logger.error(f"Signature verification error: {e}")
        raise HTTPException(status_code=400, detail="Signature verification failed")
    
    # Check for replay attacks - timestamp must be recent (within 5 minutes)
    try:
        tx_time = datetime.fromisoformat(tx_request.timestamp.replace('Z', '+00:00'))
        time_diff = abs((datetime.now(timezone.utc) - tx_time).total_seconds())
        if time_diff > 300:  # 5 minutes
            security_logger.warning(f"Stale transaction attempt from {client_ip}")
            raise HTTPException(status_code=400, detail="Transaction timestamp too old or too far in future")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid timestamp format")
    
    # Check for duplicate transactions (same signature = replay attack)
    existing = await db.transactions.find_one({"signature": tx_request.signature})
    if existing:
        security_logger.warning(f"Replay attack attempt from {client_ip}")
        raise HTTPException(status_code=400, detail="Transaction already exists (possible replay attack)")
    
    # Reset failed attempts on successful validation
    failed_attempts[client_ip] = 0
    
    # Create transaction - INSTANTLY CONFIRMED
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
        "confirmed": True,  # Instantly confirmed!
        "block_index": None,
        "ip_hash": hashlib.sha256(client_ip.encode()).hexdigest()[:16]  # Anonymized IP for audit
    }
    
    await db.transactions.insert_one(transaction)
    del transaction["_id"]
    del transaction["ip_hash"]  # Don't return ip_hash to client
    
    # Broadcast transaction to peers
    asyncio.create_task(broadcast_to_peers(
        "broadcast/transaction",
        {"transaction": transaction, "sender_node_id": NODE_ID}
    ))
    
    logger.info(f"Secure transaction created: {tx_id} ({tx_request.amount} BRICS)")
    return transaction

# DEPRECATED: Legacy endpoint - will be removed in future versions
@api_router.post("/transactions")
@limiter.limit("5/minute")
async def create_transaction_legacy(request: Request, tx_request: TransactionRequest):
    """
    DEPRECATED: This endpoint sends private keys over the network and is insecure.
    Use POST /transactions/secure instead with client-side signing.
    """
    security_logger.warning(f"Deprecated /transactions endpoint used from {get_remote_address(request)}")
    
    # Validate sender has enough balance
    sender_balance = await get_balance(tx_request.sender_address)
    if sender_balance < tx_request.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {sender_balance}")
    
    if tx_request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Create transaction data for signing
    tx_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    tx_data = build_tx_data(tx_request.sender_address, tx_request.recipient_address, tx_request.amount, timestamp)
    
    # Sign transaction
    try:
        signature = sign_transaction(tx_request.sender_private_key, tx_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid private key: {str(e)}")
    
    # Get public key from private key
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
    
    # Broadcast transaction to peers
    asyncio.create_task(broadcast_to_peers(
        "broadcast/transaction",
        {"transaction": transaction, "sender_node_id": NODE_ID}
    ))
    
    return {
        **transaction,
        "warning": "DEPRECATED: This endpoint is insecure. Use /transactions/secure with client-side signing."
    }

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
    
    # PQC Block Signing: sign block hash with node's hybrid keys
    pqc_block_sig = {}
    if node_pqc_keys:
        block_sig_data = f"{new_index}{timestamp}{submission.hash}{submission.miner_address}"
        sig_result = hybrid_sign(
            node_pqc_keys["ecdsa_private_key"],
            node_pqc_keys["dilithium_secret_key"],
            block_sig_data
        )
        pqc_block_sig = {
            "pqc_ecdsa_signature": sig_result["ecdsa_signature"],
            "pqc_dilithium_signature": sig_result["dilithium_signature"],
            "pqc_public_key_ecdsa": node_pqc_keys["ecdsa_public_key"],
            "pqc_public_key_dilithium": node_pqc_keys["dilithium_public_key"],
            "pqc_scheme": "ecdsa_secp256k1+ml-dsa-65",
        }

    new_block = {
        "index": new_index,
        "timestamp": timestamp,
        "transactions": pending_txs,
        "proof": submission.nonce,
        "previous_hash": last_block['hash'],
        "nonce": submission.nonce,
        "miner": submission.miner_address,
        "difficulty": difficulty,
        "hash": submission.hash,
        **pqc_block_sig
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
    
    # Broadcast new block to peers
    asyncio.create_task(broadcast_to_peers(
        "broadcast/block",
        {"block": new_block, "sender_node_id": NODE_ID}
    ))
    
    return {
        "success": True,
        "block": new_block,
        "reward": get_mining_reward(new_index)
    }

# Wallet endpoints - with rate limiting
@api_router.post("/wallet/create")
@limiter.limit("5/minute")
async def create_wallet(request: Request, wallet_request: WalletCreate):
    """Create a new wallet with seed phrase"""
    wallet_data = generate_wallet()
    
    wallet = {
        "address": wallet_data['address'],
        "public_key": wallet_data['public_key'],
        "private_key": wallet_data['private_key'],
        "seed_phrase": wallet_data['seed_phrase'],
        "name": wallet_request.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Log wallet creation (without sensitive data)
    logger.info(f"Wallet created: {wallet_data['address'][:20]}...")
    
    return wallet

@api_router.post("/wallet/import/seed")
@limiter.limit("5/minute")
async def import_wallet_seed(request: Request, wallet_request: WalletImportSeed):
    """Import wallet from seed phrase (12 words)"""
    # Validate seed phrase format
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
    """Import wallet from private key"""
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

# ==================== PQC ENDPOINTS ====================

@api_router.post("/pqc/wallet/create")
@limiter.limit("5/minute")
async def create_pqc_wallet(request: Request, wallet_request: PQCWalletCreate):
    """Create a new Post-Quantum Cryptographic hybrid wallet"""
    wallet_data = generate_pqc_wallet()
    wallet_data["name"] = wallet_request.name
    wallet_data["created_at"] = datetime.now(timezone.utc).isoformat()

    # Store PQC wallet metadata in DB (no private keys!)
    await db.pqc_wallets.update_one(
        {"address": wallet_data["address"]},
        {"$set": {
            "address": wallet_data["address"],
            "wallet_type": "pqc_hybrid",
            "ecdsa_public_key": wallet_data["ecdsa_public_key"],
            "dilithium_public_key": wallet_data["dilithium_public_key"],
            "created_at": wallet_data["created_at"],
        }},
        upsert=True
    )

    logger.info(f"PQC wallet created: {wallet_data['address'][:20]}...")
    return wallet_data


@api_router.post("/pqc/wallet/import")
@limiter.limit("5/minute")
async def import_pqc_wallet(request: Request, wallet_request: PQCWalletImportKeys):
    """Import/recover a PQC wallet from its key pair"""
    try:
        wallet_data = recover_pqc_wallet(
            wallet_request.ecdsa_private_key,
            wallet_request.dilithium_secret_key,
            wallet_request.dilithium_public_key
        )
        wallet_data["name"] = wallet_request.name
        wallet_data["created_at"] = datetime.now(timezone.utc).isoformat()
        return wallet_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.get("/pqc/wallet/{address}")
async def get_pqc_wallet_info(address: str):
    """Get PQC wallet public info and balance"""
    if not address.startswith("BRICSPQ"):
        raise HTTPException(status_code=400, detail="Not a PQC address (must start with BRICSPQ)")
    
    balance = await get_balance(address)
    wallet_meta = await db.pqc_wallets.find_one(
        {"address": address}, {"_id": 0}
    )
    
    return {
        "address": address,
        "balance": balance,
        "wallet_type": "pqc_hybrid" if wallet_meta else "unknown",
        "ecdsa_public_key": wallet_meta.get("ecdsa_public_key") if wallet_meta else None,
        "dilithium_public_key": wallet_meta.get("dilithium_public_key") if wallet_meta else None,
        "created_at": wallet_meta.get("created_at") if wallet_meta else None,
    }


@api_router.post("/pqc/verify")
async def verify_pqc_signature(req: PQCVerifyRequest):
    """Verify a hybrid PQC signature"""
    result = hybrid_verify(
        req.ecdsa_public_key,
        req.dilithium_public_key,
        req.ecdsa_signature,
        req.dilithium_signature,
        req.message
    )
    return result


@api_router.post("/pqc/transaction/secure")
@limiter.limit("10/minute")
async def create_pqc_transaction(request: Request, tx: PQCSecureTransactionRequest):
    """Create a transaction signed with hybrid PQC signatures"""
    # Verify sender is a PQC address
    if not tx.sender_address.startswith("BRICSPQ"):
        raise HTTPException(status_code=400, detail="Sender must be a PQC address")

    # Verify the hybrid signature
    tx_data = build_tx_data(tx.sender_address, tx.recipient_address, tx.amount, tx.timestamp)
    verification = hybrid_verify(
        tx.ecdsa_public_key,
        tx.dilithium_public_key,
        tx.ecdsa_signature,
        tx.dilithium_signature,
        tx_data
    )
    if not verification["hybrid_valid"]:
        detail = "Hybrid signature verification failed."
        if not verification["ecdsa_valid"]:
            detail += " ECDSA invalid."
        if not verification["dilithium_valid"]:
            detail += " Dilithium invalid."
        raise HTTPException(status_code=400, detail=detail)

    # Verify address ownership
    from pqc_crypto import hashlib as pqc_hashlib
    combined_hash = hashlib.sha256(
        (tx.ecdsa_public_key + tx.dilithium_public_key).encode()
    ).hexdigest()
    expected_address = "BRICSPQ" + combined_hash[:38]
    if tx.sender_address != expected_address:
        raise HTTPException(status_code=400, detail="Public keys do not match sender address")

    # Check balance
    balance = await get_balance(tx.sender_address)
    if balance < tx.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance: {balance} < {tx.amount}")

    # Create transaction
    tx_id = hashlib.sha256(
        f"{tx.sender_address}{tx.recipient_address}{tx.amount}{tx.timestamp}{tx.ecdsa_signature[:32]}".encode()
    ).hexdigest()

    transaction = {
        "tx_id": tx_id,
        "sender": tx.sender_address,
        "recipient": tx.recipient_address,
        "amount": tx.amount,
        "timestamp": tx.timestamp,
        "ecdsa_signature": tx.ecdsa_signature,
        "dilithium_signature": tx.dilithium_signature,
        "ecdsa_public_key": tx.ecdsa_public_key,
        "dilithium_public_key": tx.dilithium_public_key,
        "signature_scheme": "ecdsa_secp256k1+ml-dsa-65",
        "confirmed": False,
    }
    await db.transactions.insert_one(transaction)
    transaction.pop("_id", None)

    logger.info(f"PQC transaction created: {tx_id[:16]}... from {tx.sender_address[:15]}...")
    return transaction


@api_router.get("/pqc/wallets/list")
async def list_pqc_wallets(limit: int = 50):
    """List PQC wallets with balance > 0"""
    all_wallets = await db.pqc_wallets.find(
        {}, {"_id": 0, "address": 1, "wallet_type": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(500)
    
    active_wallets = []
    for w in all_wallets:
        bal = await get_balance(w["address"])
        if bal > 0:
            w["balance"] = bal
            active_wallets.append(w)
    
    active_wallets.sort(key=lambda x: x["balance"], reverse=True)
    return {"wallets": active_wallets[:limit], "total": len(active_wallets)}


@api_router.post("/pqc/migrate")
@limiter.limit("5/minute")
async def migrate_to_pqc(request: Request, tx_request: SecureTransactionRequest):
    """
    Migrate funds from legacy ECDSA wallet to PQC wallet - NO FEE.
    Same validation as /transactions/secure but fee is waived for migration.
    """
    client_ip = get_remote_address(request)

    if client_ip in ip_blacklist:
        if datetime.now(timezone.utc) < ip_blacklist[client_ip]:
            raise HTTPException(status_code=403, detail="Access temporarily blocked")
        else:
            del ip_blacklist[client_ip]

    # Must migrate TO a PQC address
    if not tx_request.recipient_address.startswith("BRICSPQ"):
        raise HTTPException(status_code=400, detail="Destinazione deve essere un indirizzo PQC (BRICSPQ...)")

    # Must migrate FROM a legacy address
    if tx_request.sender_address.startswith("BRICSPQ"):
        raise HTTPException(status_code=400, detail="Mittente deve essere un wallet legacy (BRICS...)")

    # Check balance - NO FEE for migration
    sender_balance = await get_balance(tx_request.sender_address)
    if sender_balance < tx_request.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Saldo insufficiente. Necessario: {tx_request.amount} BRICS. Disponibile: {sender_balance}"
        )

    # Verify public key matches sender
    expected_address = generate_address_from_public_key(tx_request.public_key)
    if expected_address != tx_request.sender_address:
        failed_attempts[client_ip] += 1
        raise HTTPException(status_code=400, detail="La chiave pubblica non corrisponde all'indirizzo")

    # Verify signature
    tx_data = build_tx_data(tx_request.sender_address, tx_request.recipient_address, tx_request.amount, tx_request.timestamp)
    try:
        is_valid = verify_signature(tx_request.public_key, tx_request.signature, tx_data)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Firma non valida")
    except BadSignatureError:
        raise HTTPException(status_code=400, detail="Firma non valida")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Verifica firma fallita")

    # Anti-replay
    try:
        tx_time = datetime.fromisoformat(tx_request.timestamp.replace('Z', '+00:00'))
        if abs((datetime.now(timezone.utc) - tx_time).total_seconds()) > 300:
            raise HTTPException(status_code=400, detail="Timestamp troppo vecchio")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato timestamp non valido")

    existing = await db.transactions.find_one({"signature": tx_request.signature})
    if existing:
        raise HTTPException(status_code=400, detail="Transazione duplicata")

    failed_attempts[client_ip] = 0

    tx_id = str(uuid.uuid4())
    transaction = {
        "id": tx_id,
        "sender": tx_request.sender_address,
        "recipient": tx_request.recipient_address,
        "amount": tx_request.amount,
        "fee": 0,  # NO FEE for PQC migration
        "timestamp": tx_request.timestamp,
        "signature": tx_request.signature,
        "public_key": tx_request.public_key,
        "confirmed": True,
        "migration": True,
        "migration_type": "legacy_to_pqc",
        "block_index": None,
        "ip_hash": hashlib.sha256(client_ip.encode()).hexdigest()[:16]
    }

    await db.transactions.insert_one(transaction)
    del transaction["_id"]
    del transaction["ip_hash"]

    asyncio.create_task(broadcast_to_peers(
        "broadcast/transaction",
        {"transaction": transaction, "sender_node_id": NODE_ID}
    ))

    logger.info(f"PQC migration: {tx_id} - {tx_request.amount} BRICS from {tx_request.sender_address[:15]}... to {tx_request.recipient_address[:15]}...")
    return transaction


@api_router.get("/pqc/stats")
async def get_pqc_stats():
    """Get PQC network statistics"""
    # Count only wallets with balance > 0 (active wallets)
    all_pqc_wallets = await db.pqc_wallets.find({}, {"_id": 0, "address": 1}).to_list(1000)
    active_count = 0
    for w in all_pqc_wallets:
        bal = await get_balance(w["address"])
        if bal > 0:
            active_count += 1
    
    total_pqc_txs = await db.transactions.count_documents({"signature_scheme": "ecdsa_secp256k1+ml-dsa-65"})
    # Count migration transactions too
    total_migrations = await db.transactions.count_documents({"migration": True})
    total_pqc_blocks = await db.blocks.count_documents({"pqc_scheme": {"$exists": True}})
    total_blocks = await db.blocks.count_documents({})
    return {
        "total_pqc_wallets": active_count,
        "total_pqc_transactions": total_pqc_txs + total_migrations,
        "total_pqc_blocks": total_pqc_blocks,
        "total_blocks": total_blocks,
        "signature_scheme": "ECDSA (secp256k1) + ML-DSA-65 (FIPS 204)",
        "quantum_resistant": True,
        "status": "active"
    }


@api_router.get("/pqc/node/keys")
async def get_node_pqc_public_keys():
    """Get this node's PQC public keys for block signature verification"""
    if not node_pqc_keys:
        raise HTTPException(status_code=503, detail="Node PQC keys not initialized")
    return {
        "node_id": NODE_ID,
        "ecdsa_public_key": node_pqc_keys["ecdsa_public_key"],
        "dilithium_public_key": node_pqc_keys["dilithium_public_key"],
        "scheme": "ecdsa_secp256k1+ml-dsa-65"
    }


@api_router.get("/pqc/block/{block_index}/verify")
async def verify_block_pqc_signature(block_index: int):
    """Verify the PQC signature of a specific block"""
    block = await db.blocks.find_one({"index": block_index}, {"_id": 0})
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    if not block.get("pqc_ecdsa_signature"):
        return {
            "block_index": block_index,
            "has_pqc_signature": False,
            "message": "Block was mined before PQC signing was enabled"
        }
    
    block_sig_data = f"{block['index']}{block['timestamp']}{block['hash']}{block.get('miner', '')}"
    result = hybrid_verify(
        block["pqc_public_key_ecdsa"],
        block["pqc_public_key_dilithium"],
        block["pqc_ecdsa_signature"],
        block["pqc_dilithium_signature"],
        block_sig_data
    )
    return {
        "block_index": block_index,
        "has_pqc_signature": True,
        "ecdsa_valid": result["ecdsa_valid"],
        "dilithium_valid": result["dilithium_valid"],
        "hybrid_valid": result["hybrid_valid"],
        "scheme": block.get("pqc_scheme", "unknown")
    }

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

# ==================== P2P ENDPOINTS ====================
@api_router.post("/p2p/register")
async def register_peer(peer: PeerRegister):
    """Register a new peer node"""
    peer_data = {
        "url": peer.url,
        "node_id": peer.node_id,
        "version": peer.version,
        "last_seen": datetime.now(timezone.utc).isoformat()
    }
    
    # Save to memory
    connected_peers[peer.node_id] = peer_data
    
    # Save to database for persistence
    await db.peers.update_one(
        {"node_id": peer.node_id},
        {"$set": peer_data},
        upsert=True
    )
    
    logging.info(f"Peer registered: {peer.node_id} at {peer.url}")
    
    blocks_count = await db.blocks.count_documents({})
    
    return {
        "node_id": NODE_ID,
        "version": "1.0.0",
        "blocks_height": blocks_count,
        "message": "Peer registered successfully"
    }

@api_router.get("/p2p/peers")
async def get_peers():
    """Get list of connected peers"""
    return {
        "node_id": NODE_ID,
        "peers": list(connected_peers.values()),
        "peer_count": len(connected_peers)
    }

@api_router.get("/p2p/chain/info")
async def get_chain_info():
    """Get chain information for sync"""
    blocks_count = await db.blocks.count_documents({})
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    
    return {
        "node_id": NODE_ID,
        "height": blocks_count,
        "last_block_hash": last_block['hash'] if last_block else None,
        "difficulty": await get_current_difficulty()
    }

@api_router.get("/p2p/chain/blocks")
async def get_chain_blocks(from_height: int = 0, limit: int = 500):
    """Get blocks for synchronization"""
    # Cap limit to prevent abuse but allow larger syncs
    actual_limit = min(limit, 1000)
    
    blocks = await db.blocks.find(
        {"index": {"$gte": from_height}},
        {"_id": 0}
    ).sort("index", 1).limit(actual_limit).to_list(actual_limit)
    
    return {
        "blocks": blocks,
        "from_height": from_height,
        "count": len(blocks)
    }

@api_router.post("/p2p/broadcast/block")
async def receive_broadcast_block(data: BroadcastBlock):
    """Receive a broadcasted block from a peer"""
    block = data.block
    
    # Check if we already have this block
    existing = await db.blocks.find_one({"index": block['index']})
    if existing:
        return {"status": "already_exists"}
    
    # Validate block
    if not await validate_block(block):
        return {"status": "invalid_block"}
    
    # Add block
    await db.blocks.insert_one(block)
    
    # Confirm transactions in block
    tx_ids = [tx['id'] for tx in block.get('transactions', [])]
    if tx_ids:
        await db.transactions.update_many(
            {"id": {"$in": tx_ids}},
            {"$set": {"confirmed": True, "block_index": block['index']}}
        )
    
    logging.info(f"Received block #{block['index']} from peer {data.sender_node_id}")
    
    # Re-broadcast to other peers
    asyncio.create_task(broadcast_to_peers(
        "broadcast/block",
        {"block": block, "sender_node_id": NODE_ID},
        exclude_node=data.sender_node_id
    ))
    
    return {"status": "accepted", "block_index": block['index']}

@api_router.post("/p2p/broadcast/transaction")
async def receive_broadcast_transaction(data: BroadcastTransaction):
    """Receive a broadcasted transaction from a peer"""
    tx = data.transaction
    
    # Check if we already have this transaction
    existing = await db.transactions.find_one({"id": tx['id']})
    if existing:
        return {"status": "already_exists"}
    
    # Add transaction
    await db.transactions.insert_one(tx)
    
    logging.info(f"Received transaction {tx['id'][:8]}... from peer {data.sender_node_id}")
    
    # Re-broadcast to other peers
    asyncio.create_task(broadcast_to_peers(
        "broadcast/transaction",
        {"transaction": tx, "sender_node_id": NODE_ID},
        exclude_node=data.sender_node_id
    ))
    
    return {"status": "accepted", "tx_id": tx['id']}

@api_router.post("/p2p/sync")
async def trigger_sync():
    """Manually trigger blockchain sync with peers"""
    synced = 0
    for peer in list(connected_peers.values()):
        try:
            await sync_blockchain_from_peer(peer['url'])
            synced += 1
        except Exception as e:
            logging.error(f"Sync failed with {peer['url']}: {e}")
    
    return {"status": "sync_complete", "peers_synced": synced}

@api_router.get("/p2p/node/info")
async def get_node_info():
    """Get this node's information"""
    blocks_count = await db.blocks.count_documents({})
    pending_count = await db.transactions.count_documents({"confirmed": False})
    
    return {
        "node_id": NODE_ID,
        "node_url": NODE_URL,
        "version": "1.0.0",
        "blocks_height": blocks_count,
        "pending_transactions": pending_count,
        "connected_peers": len(connected_peers),
        "peer_list": [{"node_id": p['node_id'], "url": p['url']} for p in connected_peers.values()]
    }

# ==================== DOWNLOADS ENDPOINTS ====================
from fastapi.responses import FileResponse

DOWNLOADS_DIR = '/app/downloads'

@api_router.get("/downloads")
async def list_downloads():
    """List available wallet downloads"""
    files = []
    if os.path.exists(DOWNLOADS_DIR):
        for f in os.listdir(DOWNLOADS_DIR):
            path = os.path.join(DOWNLOADS_DIR, f)
            if os.path.isfile(path):
                files.append({
                    "name": f,
                    "size": os.path.getsize(path),
                    "url": f"/api/downloads/{f}"
                })
    return {"files": files}

@api_router.get("/downloads/{filename}")
async def download_file(filename: str):
    """Download a wallet file"""
    file_path = os.path.join(DOWNLOADS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, filename=filename, media_type="application/octet-stream")

# Include the router
app.include_router(api_router)

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Remove server header
        if "server" in response.headers:
            del response.headers["server"]
        
        return response

# IP Blocking Middleware
class IPBlockingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = get_remote_address(request)
        
        # Check if IP is blacklisted
        if client_ip in ip_blacklist:
            if datetime.now(timezone.utc).timestamp() < ip_blacklist[client_ip].timestamp():
                security_logger.warning(f"Blocked request from blacklisted IP: {client_ip}")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Access temporarily blocked due to suspicious activity"}
                )
            else:
                del ip_blacklist[client_ip]
        
        response = await call_next(request)
        return response

# Add security middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(IPBlockingMiddleware)

# CORS Middleware - Restricted to allowed origins
cors_origins = os.environ.get('CORS_ORIGINS', 'https://bricscoin26.org').split(',')
# Clean up origins
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
    max_age=600,  # Cache preflight for 10 minutes
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Security logger with separate handler
security_handler = logging.StreamHandler()
security_handler.setLevel(logging.WARNING)
security_handler.setFormatter(logging.Formatter('%(asctime)s - SECURITY - %(levelname)s - %(message)s'))
security_logger.addHandler(security_handler)

@app.on_event("startup")
async def startup_event():
    await create_genesis_block()
    await init_node_pqc_keys()
    logger.info(f"BricsCoin node started - ID: {NODE_ID}")
    
    # Load peers from database
    await load_peers_from_db()
    
    # Discover and connect to seed peers
    if SEED_NODES:
        asyncio.create_task(discover_peers())
    
    # Start periodic sync task
    asyncio.create_task(periodic_sync())

async def load_peers_from_db():
    """Load saved peers from database on startup"""
    try:
        saved_peers = await db.peers.find({}, {"_id": 0}).to_list(100)
        for peer in saved_peers:
            if peer.get('node_id') and peer.get('url'):
                connected_peers[peer['node_id']] = peer
                logger.info(f"Loaded peer from DB: {peer['node_id']} at {peer['url']}")
        logger.info(f"Loaded {len(saved_peers)} peers from database")
    except Exception as e:
        logger.error(f"Failed to load peers from database: {e}")


async def init_node_pqc_keys():
    """Initialize or load the node's PQC keypair for block signing."""
    global node_pqc_keys
    existing = await db.node_config.find_one({"type": "pqc_keys"}, {"_id": 0})
    if existing:
        node_pqc_keys = {
            "ecdsa_private_key": existing["ecdsa_private_key"],
            "ecdsa_public_key": existing["ecdsa_public_key"],
            "dilithium_secret_key": existing["dilithium_secret_key"],
            "dilithium_public_key": existing["dilithium_public_key"],
        }
        logger.info(f"Loaded existing node PQC keys (pk={existing['ecdsa_public_key'][:16]}...)")
    else:
        wallet = generate_pqc_wallet()
        node_pqc_keys = {
            "ecdsa_private_key": wallet["ecdsa_private_key"],
            "ecdsa_public_key": wallet["ecdsa_public_key"],
            "dilithium_secret_key": wallet["dilithium_secret_key"],
            "dilithium_public_key": wallet["dilithium_public_key"],
        }
        await db.node_config.insert_one({
            "type": "pqc_keys",
            "ecdsa_private_key": wallet["ecdsa_private_key"],
            "ecdsa_public_key": wallet["ecdsa_public_key"],
            "dilithium_secret_key": wallet["dilithium_secret_key"],
            "dilithium_public_key": wallet["dilithium_public_key"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Generated new node PQC keys (pk={wallet['ecdsa_public_key'][:16]}...)")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
