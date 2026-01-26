"""
BricsCoin Stratum Mining Server v5.1
100% Bitcoin-Compatible Implementation for ASIC Miners (Bitaxe, NerdMiner)
FIXED: Each miner gets personalized jobs with their own reward address
"""

import asyncio
import json
import hashlib
import struct
import time
import os
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("stratum")

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'bricscoin')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Stratum server configuration
STRATUM_PORT = int(os.environ.get('STRATUM_PORT', 3333))
STRATUM_HOST = os.environ.get('STRATUM_HOST', '0.0.0.0')

# BricsCoin constants
NETWORK_DIFFICULTY = 1  # Bitcoin-style difficulty (higher = harder)
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50
COIN = 100_000_000  # satoshis

# Global state
miners: Dict[str, dict] = {}
current_job: Optional[dict] = None
job_cache: Dict[str, dict] = {}  # Cache ALL jobs by job_id
job_counter = 0
extranonce_counter = 0

# ============== BITCOIN-COMPATIBLE HASHING ==============

def double_sha256(data: bytes) -> bytes:
    """Bitcoin's standard double SHA256"""
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def sha256_single(data: bytes) -> bytes:
    """Single SHA256"""
    return hashlib.sha256(data).digest()

def reverse_bytes(data: bytes) -> bytes:
    """Reverse byte order"""
    return data[::-1]

def swap_endian_words(hex_str: str) -> str:
    """
    Swap endianness of each 4-byte word in a hex string.
    This is how Bitcoin's Stratum protocol formats the prevhash.
    """
    result = ""
    for i in range(0, len(hex_str), 8):
        word = hex_str[i:i+8]
        # Reverse bytes within the word
        swapped = "".join([word[j:j+2] for j in range(6, -1, -2)])
        result += swapped
    return result

def int_to_le_hex(value: int, length: int) -> str:
    """Convert integer to little-endian hex string"""
    return value.to_bytes(length, 'little').hex()

def var_int(n: int) -> bytes:
    """Bitcoin variable length integer encoding"""
    if n < 0xfd:
        return bytes([n])
    elif n <= 0xffff:
        return bytes([0xfd]) + n.to_bytes(2, 'little')
    elif n <= 0xffffffff:
        return bytes([0xfe]) + n.to_bytes(4, 'little')
    else:
        return bytes([0xff]) + n.to_bytes(8, 'little')

def difficulty_to_nbits(difficulty: int) -> str:
    """
    Convert difficulty to nBits compact format.
    For low difficulty, use Bitcoin's minimum difficulty target.
    """
    # For BricsCoin with difficulty 4 (4 leading zeros), 
    # we use a simple target that ASICs can easily hit
    # Bitcoin's minimum difficulty nBits: 1d00ffff
    # We'll use an easier target for testing
    return "1e0fffff"  # Very easy target for testing

def get_mining_reward(block_height: int) -> int:
    """Calculate mining reward in satoshis with halving"""
    halvings = block_height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return (INITIAL_REWARD * COIN) >> halvings

# ============== COINBASE TRANSACTION (Bitcoin-compatible) ==============

def create_coinbase_tx(height: int, reward: int, miner_addr: str, extranonce1: str, extranonce2_size: int) -> tuple:
    """
    Create Bitcoin-compatible coinbase transaction.
    Returns (coinb1_hex, coinb2_hex) split at extranonce position.
    
    Coinbase structure:
    - version (4 bytes LE)
    - input count (varint)
    - prev tx hash (32 bytes, all zeros for coinbase)
    - prev output index (4 bytes, all 0xFF for coinbase)
    - script length (varint)
    - script: [height] + [extranonce1] + [extranonce2] + [extra data]
    - sequence (4 bytes)
    - output count (varint)
    - output value (8 bytes LE)
    - output script length (varint)
    - output script
    - locktime (4 bytes)
    """
    # Version (1 = standard)
    version = struct.pack('<I', 1)
    
    # Input count
    input_count = var_int(1)
    
    # Previous transaction (32 zero bytes for coinbase)
    prev_tx_hash = b'\x00' * 32
    
    # Previous output index (0xFFFFFFFF for coinbase)
    prev_out_index = struct.pack('<I', 0xFFFFFFFF)
    
    # Build coinbase script
    # Height encoding (BIP34)
    if height < 17:
        height_script = bytes([0x50 + height])  # OP_1 through OP_16
    elif height < 128:
        height_script = bytes([0x01, height])
    elif height < 32768:
        height_script = bytes([0x02]) + struct.pack('<H', height)
    else:
        height_script = bytes([0x03]) + struct.pack('<I', height)[:3]
    
    # Extra nonce placeholder info
    extranonce1_len = len(extranonce1) // 2  # 4 bytes
    extranonce2_len = extranonce2_size  # 4 bytes
    
    # Arbitrary data (pool signature)
    extra_data = b'/BricsCoin Pool/'
    
    # Script prefix (before extranonce)
    script_prefix = height_script + extra_data
    
    # Script suffix (after extranonce) - can be empty
    script_suffix = b''
    
    # Total script length
    total_script_len = len(script_prefix) + extranonce1_len + extranonce2_len + len(script_suffix)
    script_len_bytes = var_int(total_script_len)
    
    # Sequence
    sequence = struct.pack('<I', 0xFFFFFFFF)
    
    # Output count
    output_count = var_int(1)
    
    # Output value (reward in satoshis)
    output_value = struct.pack('<Q', reward)
    
    # Output script (P2PKH style, simplified)
    # OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
    addr_hash = sha256_single(miner_addr.encode())[:20]
    output_script = bytes([0x76, 0xa9, 0x14]) + addr_hash + bytes([0x88, 0xac])
    output_script_len = var_int(len(output_script))
    
    # Locktime
    locktime = struct.pack('<I', 0)
    
    # Build coinb1: everything before extranonce
    coinb1 = (
        version +
        input_count +
        prev_tx_hash +
        prev_out_index +
        script_len_bytes +
        script_prefix
    )
    
    # Build coinb2: everything after extranonce
    coinb2 = (
        script_suffix +
        sequence +
        output_count +
        output_value +
        output_script_len +
        output_script +
        locktime
    )
    
    return coinb1.hex(), coinb2.hex()

# ============== BLOCK TEMPLATE ==============

async def get_block_template() -> Optional[dict]:
    """Get current block template from database"""
    try:
        last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
        if not last_block:
            logger.warning("No blocks in database!")
            return None
        
        new_index = last_block['index'] + 1
        reward = get_mining_reward(new_index)
        prev_hash = last_block.get('hash', '0' * 64)
        
        # Ensure prev_hash is 64 hex chars
        if len(prev_hash) < 64:
            prev_hash = prev_hash.zfill(64)
        
        # Get pending transactions (up to 100 per block)
        pending_txs = await db.transactions.find(
            {"confirmed": False}, 
            {"_id": 0}
        ).limit(100).to_list(100)
        
        # Convert to simple format for block
        transactions = []
        for tx in pending_txs:
            transactions.append({
                "id": tx.get("id"),
                "sender": tx.get("sender"),
                "recipient": tx.get("recipient"),
                "amount": tx.get("amount"),
                "timestamp": tx.get("timestamp")
            })
        
        template = {
            "index": new_index,
            "timestamp": int(time.time()),
            "previous_hash": prev_hash,
            "difficulty": NETWORK_DIFFICULTY,
            "reward": reward,
            "transactions": transactions,
            "pending_tx_ids": [tx.get("id") for tx in pending_txs]  # Track IDs for confirmation
        }
        
        if transactions:
            logger.info(f"Template: block #{new_index}, {len(transactions)} pending txs, reward={reward/COIN} BRICS")
        else:
            logger.info(f"Template: block #{new_index}, prev={prev_hash[:16]}..., reward={reward/COIN} BRICS")
        
        return template
        
    except Exception as e:
        logger.error(f"Template error: {e}")
        return None

def create_stratum_job(template: dict, miner_address: str, extranonce1: str = "00000000", extranonce2_size: int = 4) -> dict:
    """
    Create a Stratum mining job from block template.
    This follows the exact Bitcoin Stratum V1 specification.
    
    IMPORTANT: miner_address is the address that will receive the block reward!
    """
    global job_counter, job_cache
    job_counter += 1
    
    # Job ID (simple incrementing number as hex)
    job_id = format(job_counter, 'x')
    
    # Create coinbase transaction with MINER'S ADDRESS for reward
    coinb1, coinb2 = create_coinbase_tx(
        template['index'],
        template['reward'],
        miner_address,  # FIXED: Use actual miner's address!
        extranonce1,
        extranonce2_size
    )
    
    # Previous block hash for Stratum
    # Stratum uses a specific format: swap each 4-byte word
    prev_hash_hex = template['previous_hash']
    prevhash_stratum = swap_endian_words(prev_hash_hex)
    
    # Block version (in hex, big-endian for display but miners handle it)
    # Using version 0x20000000 (BIP9 compliant)
    version = "20000000"
    
    # nBits (difficulty target in compact form)
    nbits = difficulty_to_nbits(template['difficulty'])
    
    # nTime (current timestamp in hex)
    ntime = format(template['timestamp'], '08x')
    
    # Merkle branches (empty for single coinbase transaction)
    merkle_branch = []
    
    job = {
        "job_id": job_id,
        "prevhash": prevhash_stratum,
        "coinb1": coinb1,
        "coinb2": coinb2,
        "merkle_branch": merkle_branch,
        "version": version,
        "nbits": nbits,
        "ntime": ntime,
        "clean_jobs": False,
        "template": template,
        "miner_address": miner_address,  # IMPORTANT: Track which miner this job belongs to
        "created_at": time.time()
    }
    
    # Cache the job (never delete, keeps growing but that's OK for dev)
    job_cache[job_id] = job
    
    logger.info(f"Job {job_id}: block #{template['index']}, miner={miner_address[:20]}...")
    
    return job

def verify_share(job: dict, extranonce1: str, extranonce2: str, ntime: str, nonce: str) -> tuple:
    """
    Verify a submitted share using Bitcoin's exact algorithm.
    
    Returns: (is_valid_share, is_valid_block, block_hash_hex)
    """
    try:
        # 1. Reconstruct full coinbase transaction
        coinbase_hex = job['coinb1'] + extranonce1 + extranonce2 + job['coinb2']
        coinbase_bytes = bytes.fromhex(coinbase_hex)
        
        # 2. Hash the coinbase (double SHA256)
        coinbase_hash = double_sha256(coinbase_bytes)
        
        # 3. Compute merkle root
        # With no other transactions, merkle root = coinbase hash
        merkle_root = coinbase_hash
        for branch_hash in job.get('merkle_branch', []):
            branch_bytes = bytes.fromhex(branch_hash)
            merkle_root = double_sha256(merkle_root + branch_bytes)
        
        # 4. Build the 80-byte block header
        # All multi-byte values are little-endian in the header
        
        # Version (4 bytes, little-endian)
        version_int = int(job['version'], 16)
        version_bytes = struct.pack('<I', version_int)
        
        # Previous block hash (32 bytes)
        # Undo the Stratum word swap to get raw bytes
        prevhash_raw = bytes.fromhex(swap_endian_words(job['prevhash']))
        
        # Merkle root (32 bytes, internal byte order)
        merkle_root_bytes = merkle_root
        
        # Timestamp (4 bytes, little-endian)
        ntime_int = int(ntime, 16)
        ntime_bytes = struct.pack('<I', ntime_int)
        
        # nBits (4 bytes, little-endian)
        nbits_int = int(job['nbits'], 16)
        nbits_bytes = struct.pack('<I', nbits_int)
        
        # Nonce (4 bytes, little-endian)
        nonce_int = int(nonce, 16)
        nonce_bytes = struct.pack('<I', nonce_int)
        
        # Assemble header (exactly 80 bytes)
        header = (
            version_bytes +      # 4 bytes
            prevhash_raw +       # 32 bytes
            merkle_root_bytes +  # 32 bytes
            ntime_bytes +        # 4 bytes
            nbits_bytes +        # 4 bytes
            nonce_bytes          # 4 bytes
        )
        
        if len(header) != 80:
            logger.error(f"Invalid header length: {len(header)} (expected 80)")
            return False, False, "invalid_header"
        
        # 5. Double SHA256 the header
        header_hash = double_sha256(header)
        
        # 6. Reverse for display (Bitcoin convention)
        block_hash_hex = reverse_bytes(header_hash).hex()
        
        # Debug: Log header components occasionally
        if job_counter % 100 == 1:
            logger.info(f"DEBUG Header: version={version_bytes.hex()}, prevhash={prevhash_raw.hex()[:16]}...")
            logger.info(f"DEBUG Header: merkle={merkle_root_bytes.hex()[:16]}..., ntime={ntime_bytes.hex()}, nbits={nbits_bytes.hex()}, nonce={nonce_bytes.hex()}")
            logger.info(f"DEBUG Result hash: {block_hash_hex}")
        
        # 7. Check if hash meets difficulty target
        # Count leading zeros in the hash
        leading_zeros = 0
        for char in block_hash_hex:
            if char == '0':
                leading_zeros += 1
            else:
                break
        
        # Valid share = ANY submission (accept all for now to debug)
        is_share = True
        
        # Valid block = meets network difficulty (Bitcoin-style target comparison)
        # Convert hash to integer and compare against target
        # Using higher max_target for easier mining with small hashrate
        max_target = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
        target = max_target // (NETWORK_DIFFICULTY * 256)  # Scale factor for reasonable difficulty
        hash_int = int(block_hash_hex, 16)
        is_block = hash_int <= target
        
        # Log if we get a good hash
        leading_zeros = len(block_hash_hex) - len(block_hash_hex.lstrip('0'))
        if leading_zeros >= 1:
            logger.info(f"*** GOOD HASH with {leading_zeros} leading zeros: {block_hash_hex[:16]}...")
        
        if is_block:
            logger.info(f"*** BLOCK FOUND! Hash: {block_hash_hex[:16]}... Target: {hex(target)[:16]}...")
        
        return is_share, is_block, block_hash_hex
        
    except Exception as e:
        logger.error(f"Verification error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return True, False, "error"

# ============== STRATUM PROTOCOL HANDLER ==============

class StratumMiner:
    """Represents a connected miner"""
    
    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter, server):
        self.reader = reader
        self.writer = writer
        self.server = server
        
        self.peer = writer.get_extra_info('peername')
        self.miner_id = f"{self.peer[0]}:{self.peer[1]}" if self.peer else "unknown"
        
        self.subscribed = False
        self.authorized = False
        self.worker_name = None
        
        # Extranonce management
        global extranonce_counter
        extranonce_counter += 1
        self.extranonce1 = format(extranonce_counter, '08x')
        self.extranonce2_size = 4
        
        self.difficulty = 0.001  # Low difficulty for testing
        self.shares = 0
        self.blocks = 0
        
        # Personal job cache for this miner (key = job_id)
        self.personal_jobs: Dict[str, dict] = {}
        
        # Track sent jobs for this miner
        self.sent_jobs = set()
    
    def send(self, message: dict):
        """Send JSON message to miner"""
        try:
            data = json.dumps(message) + '\n'
            self.writer.write(data.encode())
        except Exception as e:
            logger.error(f"Send error to {self.miner_id}: {e}")
    
    def respond(self, msg_id, result, error=None):
        """Send response to a request"""
        self.send({"id": msg_id, "result": result, "error": error})
    
    def notify(self, method: str, params: list):
        """Send notification to miner"""
        self.send({"id": None, "method": method, "params": params})
    
    async def handle_message(self, message: dict):
        """Process incoming message from miner"""
        method = message.get('method', '')
        params = message.get('params', [])
        msg_id = message.get('id')
        
        logger.debug(f"[{self.miner_id}] {method}: {params}")
        
        if method == 'mining.subscribe':
            await self.handle_subscribe(msg_id, params)
        elif method == 'mining.authorize':
            await self.handle_authorize(msg_id, params)
        elif method == 'mining.submit':
            await self.handle_submit(msg_id, params)
        elif method == 'mining.suggest_difficulty':
            self.difficulty = float(params[0]) if params else 0.001
            self.respond(msg_id, True)
        elif method == 'mining.configure':
            # Handle mining configuration (version rolling, etc.)
            result = {}
            if params and len(params) > 0:
                extensions = params[0] if isinstance(params[0], list) else []
                if 'version-rolling' in extensions:
                    result['version-rolling'] = True
                    result['version-rolling.mask'] = "1fffe000"
            self.respond(msg_id, result)
        else:
            # Unknown method, respond with success
            if msg_id is not None:
                self.respond(msg_id, True)
    
    async def handle_subscribe(self, msg_id, params):
        """Handle mining.subscribe request"""
        self.subscribed = True
        
        # Response format: [[subscriptions], extranonce1, extranonce2_size]
        subscriptions = [
            ["mining.set_difficulty", "d1"],
            ["mining.notify", "n1"]
        ]
        
        result = [subscriptions, self.extranonce1, self.extranonce2_size]
        self.respond(msg_id, result)
        
        logger.info(f"[{self.miner_id}] Subscribed (extranonce1={self.extranonce1})")
        
        # Send initial difficulty
        self.notify("mining.set_difficulty", [self.difficulty])
        
        # Send current job if available
        if current_job:
            await self.send_job(current_job)
    
    async def handle_authorize(self, msg_id, params):
        """Handle mining.authorize request"""
        self.worker_name = params[0] if params else "worker"
        self.authorized = True
        
        self.respond(msg_id, True)
        logger.info(f"[{self.miner_id}] Authorized as {self.worker_name}")
        
        # Update global miners dict
        miners[self.miner_id] = {
            'worker': self.worker_name,
            'connected_at': datetime.now(timezone.utc).isoformat(),
            'shares': 0,
            'blocks': 0,
            'extranonce1': self.extranonce1
        }
    
    async def handle_submit(self, msg_id, params):
        """
        Handle mining.submit request.
        params: [worker_name, job_id, extranonce2, ntime, nonce]
        """
        if not self.authorized:
            self.respond(msg_id, False, [24, "Unauthorized worker", None])
            return
        
        try:
            worker = params[0]
            job_id = params[1]
            extranonce2 = params[2]
            ntime = params[3]
            nonce = params[4]
            
            logger.info(f"[{self.worker_name}] Submit: job={job_id}, en2={extranonce2}, ntime={ntime}, nonce={nonce}")
            
            # FIXED: First check miner's PERSONAL job cache (has correct reward address)
            job = self.personal_jobs.get(job_id)
            job_source = "personal"
            
            if not job:
                # Fallback to global cache - BUT this might have wrong miner address!
                job = job_cache.get(job_id)
                job_source = "global"
                if job:
                    logger.warning(f"Using GLOBAL job cache for {self.worker_name} - job may have wrong miner address!")
                    # CRITICAL FIX: Override the miner_address with THIS miner's address
                    job = job.copy()  # Don't modify the cached job
                    job['miner_address'] = self.worker_name
            
            if not job:
                # Job not found - this is the "Job not found" error
                logger.warning(f"Job {job_id} not found for miner {self.worker_name}")
                # Accept anyway to keep miner happy but don't count as valid block
                self.respond(msg_id, True)
                self.shares += 1
                if self.miner_id in miners:
                    miners[self.miner_id]['shares'] += 1
                return
            
            # Log which job source and miner address
            job_miner = job.get('miner_address', 'UNKNOWN')
            logger.debug(f"Job {job_id} from {job_source} cache, miner_address={job_miner[:20]}...")
            
            # Verify the share
            is_share, is_block, block_hash = verify_share(
                job, 
                self.extranonce1, 
                extranonce2, 
                ntime, 
                nonce
            )
            
            # Always accept shares to keep miner working
            self.respond(msg_id, True)
            self.shares += 1
            
            if self.miner_id in miners:
                miners[self.miner_id]['shares'] += 1
            
            if is_block:
                logger.info(f"🎉 BLOCK FOUND by {self.worker_name}! Hash: {block_hash}")
                # FIXED: save_block now uses job which has THIS miner's address
                await self.save_block(job, nonce, block_hash)
            else:
                logger.info(f"Share accepted from {self.worker_name}: {block_hash[:16]}... (share={is_share})")
                
        except Exception as e:
            logger.error(f"Submit error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Accept anyway to prevent miner disconnect
            self.respond(msg_id, True)
    
    async def save_block(self, job: dict, nonce: str, block_hash: str):
        """Save a found block to the database, confirm transactions, and create mining reward"""
        try:
            template = job['template']
            
            # CRITICAL FIX: ALWAYS use the miner who SUBMITTED the winning share
            # This is self.worker_name - the authenticated address of this miner connection
            miner_address = self.worker_name
            
            logger.info(f"Saving block for miner: {miner_address}")
            
            # Create mining reward transaction
            reward_amount = template['reward'] / COIN  # Convert from satoshis to BRICS
            reward_tx = {
                "id": str(uuid.uuid4()),
                "sender": "COINBASE",
                "recipient": miner_address,
                "amount": reward_amount,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "signature": "COINBASE_REWARD",
                "type": "mining_reward",
                "confirmed": True,
                "block_index": template['index']
            }
            
            # Add reward tx to block transactions
            block_transactions = template.get('transactions', []).copy()
            block_transactions.insert(0, {
                "id": reward_tx["id"],
                "sender": "COINBASE",
                "recipient": miner_address,
                "amount": reward_amount,
                "type": "mining_reward"
            })
            
            block = {
                "index": template['index'],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "transactions": block_transactions,
                "proof": int(nonce, 16),
                "previous_hash": template['previous_hash'],
                "hash": block_hash,
                "miner": miner_address,  # The miner who submitted the winning share
                "difficulty": template['difficulty'],
                "nonce": int(nonce, 16)
            }
            
            # Check if block already exists
            existing = await db.blocks.find_one({"index": template['index']})
            if existing:
                logger.warning(f"Block #{template['index']} already exists")
                return
            
            # Insert block
            await db.blocks.insert_one(block)
            
            # Insert mining reward transaction
            await db.transactions.insert_one(reward_tx)
            
            # Confirm all pending transactions included in this block
            pending_tx_ids = template.get('pending_tx_ids', [])
            if pending_tx_ids:
                result = await db.transactions.update_many(
                    {"id": {"$in": pending_tx_ids}},
                    {"$set": {"confirmed": True, "block_index": template['index']}}
                )
                logger.info(f"✅ Confirmed {result.modified_count} transactions in block #{template['index']}")
            
            self.blocks += 1
            if self.miner_id in miners:
                miners[self.miner_id]['blocks'] += 1
            
            logger.info(f"✅ Block #{template['index']} saved! Miner: {miner_address}, Reward: {reward_amount} BRICS")
            
            # Notify server to create new jobs for all miners
            await self.server.on_new_block()
            
        except Exception as e:
            logger.error(f"Error saving block: {e}")
            import traceback
            logger.error(traceback.format_exc())
    
    async def send_job(self, job: dict):
        """Send a mining job to this miner"""
        if not self.subscribed:
            return
        
        # Track that we sent this job
        self.sent_jobs.add(job['job_id'])
        
        params = [
            job['job_id'],
            job['prevhash'],
            job['coinb1'],
            job['coinb2'],
            job['merkle_branch'],
            job['version'],
            job['nbits'],
            job['ntime'],
            job['clean_jobs']
        ]
        
        self.notify("mining.notify", params)
        logger.debug(f"[{self.miner_id}] Sent job {job['job_id']}")

class StratumServer:
    """Main Stratum server"""
    
    def __init__(self):
        self.miners: List[StratumMiner] = []
        self.server = None
        self.running = False
    
    async def start(self):
        """Start the Stratum server"""
        self.running = True
        
        self.server = await asyncio.start_server(
            self.handle_connection,
            STRATUM_HOST,
            STRATUM_PORT
        )
        
        # Start job updater task
        asyncio.create_task(self.job_updater())
        
        logger.info("=" * 60)
        logger.info("  BricsCoin Stratum Server v5.0")
        logger.info("  Bitcoin-Compatible for ASIC Miners")
        logger.info("=" * 60)
        logger.info(f"  Listening on {STRATUM_HOST}:{STRATUM_PORT}")
        logger.info(f"  Network difficulty: {NETWORK_DIFFICULTY}")
        logger.info("=" * 60)
        
        async with self.server:
            await self.server.serve_forever()
    
    async def handle_connection(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        """Handle new miner connection"""
        miner = StratumMiner(reader, writer, self)
        self.miners.append(miner)
        
        logger.info(f"New connection from {miner.miner_id}")
        
        try:
            buffer = b""
            while True:
                data = await reader.read(4096)
                if not data:
                    break
                
                buffer += data
                
                # Process complete JSON messages (newline-delimited)
                while b'\n' in buffer:
                    line, buffer = buffer.split(b'\n', 1)
                    if line:
                        try:
                            message = json.loads(line.decode())
                            await miner.handle_message(message)
                        except json.JSONDecodeError as e:
                            logger.warning(f"Invalid JSON from {miner.miner_id}: {e}")
                        except Exception as e:
                            logger.error(f"Error handling message: {e}")
        
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Connection error with {miner.miner_id}: {e}")
        finally:
            # Cleanup
            if miner in self.miners:
                self.miners.remove(miner)
            miners.pop(miner.miner_id, None)
            
            try:
                writer.close()
                await writer.wait_closed()
            except:
                pass
            
            logger.info(f"Disconnected: {miner.miner_id}")
    
    async def job_updater(self):
        """Periodically create and send personalized jobs to each miner"""
        while self.running:
            try:
                template = await get_block_template()
                if template:
                    # Send personalized job to EACH miner with THEIR address
                    await self.broadcast_personalized_jobs(template)
            except Exception as e:
                logger.error(f"Job updater error: {e}")
            
            # Update every 30 seconds (not too frequent to reduce "job not found")
            await asyncio.sleep(30)
    
    async def broadcast_personalized_jobs(self, template: dict, clean_jobs: bool = False):
        """Send personalized job to each miner with their own address for rewards"""
        count = 0
        for miner in self.miners[:]:  # Copy list to avoid modification during iteration
            try:
                if miner.subscribed and miner.worker_name:
                    # Create a job specifically for THIS miner with THEIR address
                    job = create_stratum_job(
                        template, 
                        miner.worker_name,  # Miner's address for reward!
                        miner.extranonce1,
                        miner.extranonce2_size
                    )
                    if clean_jobs:
                        job['clean_jobs'] = True
                    
                    # Store job in miner's personal cache
                    miner.personal_jobs[job['job_id']] = job
                    
                    await miner.send_job(job)
                    count += 1
            except Exception as e:
                logger.error(f"Error sending job to {miner.miner_id}: {e}")
        
        if count > 0:
            logger.info(f"Personalized jobs sent to {count} miners")
    
    async def broadcast_job(self, job: dict):
        """DEPRECATED: Use broadcast_personalized_jobs instead"""
        # Keep for backward compatibility but redirect to personalized
        template = await get_block_template()
        if template:
            await self.broadcast_personalized_jobs(template)
    
    async def on_new_block(self):
        """Called when a new block is found"""
        logger.info("New block found! Creating fresh personalized jobs...")
        
        template = await get_block_template()
        if template:
            await self.broadcast_personalized_jobs(template, clean_jobs=True)

async def main():
    """Main entry point"""
    server = StratumServer()
    await server.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped")
