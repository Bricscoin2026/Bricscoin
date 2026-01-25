"""
BricsCoin Stratum Mining Server - Bitcoin Compatible
Full implementation of Stratum v1 protocol for ASIC miners
Supports: Bitaxe, NerdMiner, Antminer, Whatsminer, etc.
"""

import asyncio
import json
import hashlib
import struct
import time
import os
import logging
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
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
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
NETWORK_DIFFICULTY = 4  # Number of leading zeros required
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50
COINBASE_MESSAGE = b"BricsCoin"

# Global state
miners: Dict[str, dict] = {}
current_job: Optional[dict] = None
recent_jobs: Dict[str, dict] = {}
job_counter = 0
extranonce_counter = 0

# ============== BITCOIN HELPER FUNCTIONS ==============

def double_sha256(data: bytes) -> bytes:
    """Double SHA256 hash (Bitcoin standard)"""
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def sha256(data: bytes) -> bytes:
    """Single SHA256 hash"""
    return hashlib.sha256(data).digest()

def reverse_bytes(data: bytes) -> bytes:
    """Reverse byte order"""
    return data[::-1]

def hex_to_bytes(hex_str: str) -> bytes:
    """Convert hex string to bytes"""
    return bytes.fromhex(hex_str)

def bytes_to_hex(data: bytes) -> str:
    """Convert bytes to hex string"""
    return data.hex()

def int_to_little_endian(value: int, length: int) -> bytes:
    """Convert integer to little-endian bytes"""
    return value.to_bytes(length, byteorder='little')

def little_endian_to_int(data: bytes) -> int:
    """Convert little-endian bytes to integer"""
    return int.from_bytes(data, byteorder='little')

def var_int(n: int) -> bytes:
    """Encode variable length integer (Bitcoin format)"""
    if n < 0xfd:
        return struct.pack('<B', n)
    elif n <= 0xffff:
        return struct.pack('<BH', 0xfd, n)
    elif n <= 0xffffffff:
        return struct.pack('<BI', 0xfe, n)
    else:
        return struct.pack('<BQ', 0xff, n)

def merkle_root(hashes: List[bytes]) -> bytes:
    """Calculate merkle root from list of hashes"""
    if not hashes:
        return b'\x00' * 32
    
    while len(hashes) > 1:
        if len(hashes) % 2 == 1:
            hashes.append(hashes[-1])
        
        new_hashes = []
        for i in range(0, len(hashes), 2):
            new_hashes.append(double_sha256(hashes[i] + hashes[i + 1]))
        hashes = new_hashes
    
    return hashes[0]

def difficulty_to_target(difficulty: int) -> bytes:
    """Convert difficulty (leading zeros) to target bytes"""
    # For difficulty N, we need N leading zeros in hex
    # Target = 0x00...00FF...FF where there are N zeros
    target_hex = '0' * (difficulty * 2) + 'f' * (64 - difficulty * 2)
    return hex_to_bytes(target_hex)

def target_to_nbits(target: bytes) -> bytes:
    """Convert target to compact nbits format (Bitcoin)"""
    # Find first non-zero byte
    target_hex = target.hex()
    first_non_zero = 0
    for i, c in enumerate(target_hex):
        if c != '0':
            first_non_zero = i // 2
            break
    
    # Bitcoin compact format
    # For difficulty 4 (0000ffff...), we use a standard value
    # nbits = 0x1d00ffff is Bitcoin genesis difficulty
    if first_non_zero <= 2:
        return hex_to_bytes("1d00ffff")
    elif first_non_zero <= 3:
        return hex_to_bytes("1c0fffff")
    else:
        return hex_to_bytes("1b0fffff")

def check_hash_meets_target(block_hash: bytes, difficulty: int) -> bool:
    """Check if hash meets difficulty target"""
    hash_hex = block_hash.hex()
    return hash_hex.startswith('0' * difficulty)

def get_mining_reward(block_height: int) -> float:
    """Calculate mining reward with halving"""
    halvings = block_height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return INITIAL_REWARD / (2 ** halvings)

# ============== COINBASE TRANSACTION ==============

def create_coinbase_tx(block_height: int, reward: float, miner_address: str, extranonce1: str, extranonce2_size: int) -> tuple:
    """
    Create coinbase transaction split into coinb1 and coinb2
    Returns (coinb1_hex, coinb2_hex)
    """
    # Block height in script (BIP34)
    height_bytes = block_height.to_bytes((block_height.bit_length() + 7) // 8 or 1, 'little')
    height_script = bytes([len(height_bytes)]) + height_bytes
    
    # Coinbase script: height + message + extranonce placeholder
    coinbase_script_prefix = height_script + COINBASE_MESSAGE
    extranonce_placeholder_size = len(bytes.fromhex(extranonce1)) + extranonce2_size
    
    # Transaction structure
    # Version (4 bytes)
    version = int_to_little_endian(1, 4)
    
    # Input count
    input_count = var_int(1)
    
    # Coinbase input
    prev_tx = b'\x00' * 32  # Null txid
    prev_index = b'\xff\xff\xff\xff'  # -1
    
    # Script length will include extranonce
    script_len = len(coinbase_script_prefix) + extranonce_placeholder_size
    script_len_bytes = var_int(script_len)
    
    # Sequence
    sequence = b'\xff\xff\xff\xff'
    
    # Output count
    output_count = var_int(1)
    
    # Output value (reward in satoshis)
    value = int_to_little_endian(int(reward * 100000000), 8)
    
    # Output script (P2PKH-like for simplicity)
    # OP_DUP OP_HASH160 <address_hash> OP_EQUALVERIFY OP_CHECKSIG
    address_hash = sha256(miner_address.encode())[:20]
    output_script = bytes([0x76, 0xa9, 0x14]) + address_hash + bytes([0x88, 0xac])
    output_script_len = var_int(len(output_script))
    
    # Locktime
    locktime = b'\x00\x00\x00\x00'
    
    # Build coinb1 (everything before extranonce)
    coinb1 = (version + input_count + prev_tx + prev_index + 
              script_len_bytes + coinbase_script_prefix)
    
    # Build coinb2 (everything after extranonce)
    coinb2 = sequence + output_count + value + output_script_len + output_script + locktime
    
    return bytes_to_hex(coinb1), bytes_to_hex(coinb2)

# ============== BLOCK TEMPLATE ==============

async def get_block_template() -> Optional[dict]:
    """Get current block template for mining"""
    try:
        last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
        if not last_block:
            return None
        
        new_index = last_block['index'] + 1
        reward = get_mining_reward(new_index)
        timestamp = int(time.time())
        
        # Previous hash (needs to be reversed for Stratum)
        prev_hash = last_block.get('hash', '0' * 64)
        
        return {
            "index": new_index,
            "timestamp": timestamp,
            "previous_hash": prev_hash,
            "difficulty": NETWORK_DIFFICULTY,
            "reward": reward,
            "transactions": []  # Simplified - no pending transactions for now
        }
    except Exception as e:
        logger.error(f"Error getting block template: {e}")
        return None

def create_job(template: dict, extranonce1: str, extranonce2_size: int = 4) -> dict:
    """Create a mining job from block template"""
    global job_counter, recent_jobs
    job_counter += 1
    
    job_id = f"{job_counter:08x}"
    
    # Create coinbase transaction
    coinb1, coinb2 = create_coinbase_tx(
        template['index'],
        template['reward'],
        "BRICS_POOL",  # Pool address placeholder
        extranonce1,
        extranonce2_size
    )
    
    # Previous hash - reverse byte order for Stratum protocol
    prev_hash_bytes = hex_to_bytes(template['previous_hash'])
    # Swap every 4 bytes (32-bit words) for Stratum
    prev_hash_swapped = b''
    for i in range(0, 32, 4):
        prev_hash_swapped += prev_hash_bytes[i:i+4][::-1]
    prev_hash_hex = bytes_to_hex(prev_hash_swapped)
    
    # Version (little-endian hex)
    version = "20000000"
    
    # nBits (compact difficulty)
    target = difficulty_to_target(template['difficulty'])
    nbits = bytes_to_hex(target_to_nbits(target))
    
    # nTime (little-endian hex)
    ntime = f"{template['timestamp']:08x}"
    
    job = {
        "job_id": job_id,
        "prevhash": prev_hash_hex,
        "coinb1": coinb1,
        "coinb2": coinb2,
        "merkle_branch": [],  # Empty for coinbase-only blocks
        "version": version,
        "nbits": nbits,
        "ntime": ntime,
        "difficulty": template['difficulty'],
        "template": template,
        "clean_jobs": True
    }
    
    # Cache job
    recent_jobs[job_id] = job
    if len(recent_jobs) > 50:  # Keep last 50 jobs
        oldest = list(recent_jobs.keys())[0]
        del recent_jobs[oldest]
    
    return job

def verify_share(job: dict, extranonce1: str, extranonce2: str, ntime: str, nonce: str) -> tuple:
    """
    Verify a submitted share
    Returns (is_valid_share, is_valid_block, block_hash_hex)
    """
    try:
        # Reconstruct coinbase transaction
        coinbase_hex = job['coinb1'] + extranonce1 + extranonce2 + job['coinb2']
        coinbase_bytes = hex_to_bytes(coinbase_hex)
        coinbase_hash = double_sha256(coinbase_bytes)
        
        # Calculate merkle root (just coinbase hash for now)
        merkle = coinbase_hash
        for branch_hash in job.get('merkle_branch', []):
            merkle = double_sha256(merkle + hex_to_bytes(branch_hash))
        
        # Build block header (80 bytes)
        version_bytes = hex_to_bytes(job['version'])[::-1]  # Little-endian
        
        # Previous hash - need to reverse the swapped version back
        prevhash_swapped = hex_to_bytes(job['prevhash'])
        prevhash_bytes = b''
        for i in range(0, 32, 4):
            prevhash_bytes += prevhash_swapped[i:i+4][::-1]
        
        ntime_bytes = hex_to_bytes(ntime)[::-1]  # Little-endian
        nbits_bytes = hex_to_bytes(job['nbits'])[::-1]  # Little-endian
        nonce_bytes = hex_to_bytes(nonce)[::-1]  # Little-endian
        
        # Block header
        header = (version_bytes + prevhash_bytes + merkle + 
                  ntime_bytes + nbits_bytes + nonce_bytes)
        
        # Double SHA256 of header
        block_hash = double_sha256(header)
        block_hash_hex = bytes_to_hex(reverse_bytes(block_hash))  # Display format
        
        # Check if meets difficulty
        is_valid_block = check_hash_meets_target(reverse_bytes(block_hash), job['difficulty'])
        
        # For shares, accept much lower difficulty
        # A share is valid if it has at least 1 leading zero
        is_valid_share = block_hash_hex.startswith('0')
        
        return is_valid_share, is_valid_block, block_hash_hex
        
    except Exception as e:
        logger.error(f"Share verification error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False, False, ""

# ============== STRATUM PROTOCOL ==============

class StratumProtocol(asyncio.Protocol):
    """Stratum protocol handler for each miner connection"""
    
    def __init__(self, server):
        self.server = server
        self.transport = None
        self.buffer = b""
        self.miner_id = None
        self.worker_name = None
        self.authorized = False
        self.subscribed = False
        self.extranonce1 = None
        self.extranonce2_size = 4
        self.difficulty = 1  # Share difficulty for miner
        self.shares_accepted = 0
        self.shares_rejected = 0
        self.blocks_found = 0
        
    def connection_made(self, transport):
        global extranonce_counter
        self.transport = transport
        peername = transport.get_extra_info('peername')
        self.miner_id = f"{peername[0]}:{peername[1]}"
        
        # Generate unique extranonce1 for this miner
        extranonce_counter += 1
        self.extranonce1 = f"{extranonce_counter:08x}"
        
        logger.info(f"Miner connected: {self.miner_id}")
        
        # Track miner
        miners[self.miner_id] = {
            'connected_at': datetime.now(timezone.utc).isoformat(),
            'worker': None,
            'address': None,
            'shares_accepted': 0,
            'shares_rejected': 0,
            'blocks_found': 0,
            'last_share': None,
            'extranonce1': self.extranonce1
        }
    
    def connection_lost(self, exc):
        logger.info(f"Miner disconnected: {self.miner_id}")
        if self.miner_id in miners:
            del miners[self.miner_id]
    
    def data_received(self, data):
        self.buffer += data
        
        while b'\n' in self.buffer:
            line, self.buffer = self.buffer.split(b'\n', 1)
            if line:
                try:
                    message = json.loads(line.decode('utf-8'))
                    asyncio.create_task(self.handle_message(message))
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid JSON from {self.miner_id}: {e}")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
    
    def send_response(self, msg_id, result, error=None):
        """Send JSON-RPC response"""
        response = {
            "id": msg_id,
            "result": result,
            "error": error
        }
        self.transport.write((json.dumps(response) + '\n').encode())
    
    def send_notification(self, method, params):
        """Send JSON-RPC notification"""
        notification = {
            "id": None,
            "method": method,
            "params": params
        }
        self.transport.write((json.dumps(notification) + '\n').encode())
    
    async def handle_message(self, message):
        """Handle incoming Stratum message"""
        method = message.get('method')
        params = message.get('params', [])
        msg_id = message.get('id')
        
        if method == 'mining.subscribe':
            await self.handle_subscribe(msg_id, params)
        elif method == 'mining.authorize':
            await self.handle_authorize(msg_id, params)
        elif method == 'mining.submit':
            await self.handle_submit(msg_id, params)
        elif method == 'mining.extranonce.subscribe':
            self.send_response(msg_id, True)
        elif method == 'mining.suggest_difficulty':
            if params and len(params) > 0:
                suggested = float(params[0])
                self.difficulty = max(0.001, min(suggested, 16))
                self.send_notification("mining.set_difficulty", [self.difficulty])
            self.send_response(msg_id, True)
        elif method == 'mining.configure':
            # Version rolling support
            result = {}
            if params and len(params) >= 2:
                extensions = params[0]
                if 'version-rolling' in extensions:
                    result['version-rolling'] = True
                    result['version-rolling.mask'] = "1fffe000"
            self.send_response(msg_id, result)
        else:
            logger.debug(f"Unknown method: {method}")
            self.send_response(msg_id, None, [20, f"Unknown method: {method}", None])
    
    async def handle_subscribe(self, msg_id, params):
        """Handle mining.subscribe"""
        self.subscribed = True
        
        # Response format for cgminer/bfgminer compatible miners
        result = [
            [
                ["mining.set_difficulty", f"sub_{self.miner_id}"],
                ["mining.notify", f"sub_{self.miner_id}"]
            ],
            self.extranonce1,
            self.extranonce2_size
        ]
        
        self.send_response(msg_id, result)
        
        # Send initial difficulty
        self.send_notification("mining.set_difficulty", [self.difficulty])
        
        # Send current job
        await self.send_job()
        
        logger.info(f"Miner subscribed: {self.miner_id} (extranonce1={self.extranonce1})")
    
    async def handle_authorize(self, msg_id, params):
        """Handle mining.authorize"""
        if len(params) >= 1:
            self.worker_name = params[0]
            # Extract address from worker name (format: address.worker or just address)
            if '.' in self.worker_name:
                address = self.worker_name.split('.')[0]
            else:
                address = self.worker_name
            
            miners[self.miner_id]['worker'] = self.worker_name
            miners[self.miner_id]['address'] = address
        
        self.authorized = True
        self.send_response(msg_id, True)
        logger.info(f"Miner authorized: {self.worker_name}")
    
    async def handle_submit(self, msg_id, params):
        """Handle mining.submit (share submission)"""
        if not self.authorized:
            self.send_response(msg_id, False, [24, "Unauthorized", None])
            return
        
        try:
            worker_name = params[0]
            job_id = params[1]
            extranonce2 = params[2]
            ntime = params[3]
            nonce = params[4]
            
            # Find job
            job = recent_jobs.get(job_id) or (current_job if current_job and current_job['job_id'] == job_id else None)
            
            if not job:
                # Accept anyway to keep miner happy, but log it
                logger.warning(f"Job {job_id} not found, accepting share anyway")
                self.shares_accepted += 1
                miners[self.miner_id]['shares_accepted'] += 1
                self.send_response(msg_id, True)
                return
            
            # Verify the share
            is_valid_share, is_valid_block, block_hash = verify_share(
                job, self.extranonce1, extranonce2, ntime, nonce
            )
            
            if is_valid_share:
                self.shares_accepted += 1
                miners[self.miner_id]['shares_accepted'] += 1
                miners[self.miner_id]['last_share'] = datetime.now(timezone.utc).isoformat()
                
                logger.info(f"✓ Share ACCEPTED from {self.worker_name} - Hash: {block_hash[:16]}...")
                
                if is_valid_block:
                    # BLOCK FOUND!
                    logger.info(f"🎉🎉🎉 BLOCK FOUND by {self.worker_name}! Hash: {block_hash}")
                    
                    template = job['template']
                    new_block = {
                        "index": template['index'],
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "transactions": template.get('transactions', []),
                        "proof": int(nonce, 16),
                        "previous_hash": template['previous_hash'],
                        "nonce": int(nonce, 16),
                        "miner": miners[self.miner_id].get('address', self.worker_name),
                        "difficulty": template['difficulty'],
                        "hash": block_hash
                    }
                    
                    # Save to database
                    existing = await db.blocks.find_one({"index": template['index']})
                    if not existing:
                        await db.blocks.insert_one(new_block)
                        self.blocks_found += 1
                        miners[self.miner_id]['blocks_found'] += 1
                        logger.info(f"Block #{template['index']} saved to database!")
                        
                        # Broadcast new job to all miners
                        await self.server.broadcast_new_job()
                
                self.send_response(msg_id, True)
            else:
                self.shares_rejected += 1
                miners[self.miner_id]['shares_rejected'] += 1
                logger.info(f"✗ Share rejected from {self.worker_name} - Hash: {block_hash[:16]}...")
                # Still accept to keep miner going
                self.send_response(msg_id, True)
                
        except Exception as e:
            logger.error(f"Submit error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.send_response(msg_id, True)  # Accept anyway
    
    async def send_job(self):
        """Send mining job to this miner"""
        if not current_job:
            return
        
        job = current_job
        
        # mining.notify params:
        # job_id, prevhash, coinb1, coinb2, merkle_branch, version, nbits, ntime, clean_jobs
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
        
        self.send_notification("mining.notify", params)

class StratumServer:
    """Main Stratum server"""
    
    def __init__(self):
        self.protocols: List[StratumProtocol] = []
        self.server = None
        self.job_update_task = None
    
    async def start(self):
        """Start the Stratum server"""
        loop = asyncio.get_event_loop()
        
        self.server = await loop.create_server(
            lambda: self.create_protocol(),
            STRATUM_HOST,
            STRATUM_PORT
        )
        
        # Start job updater
        self.job_update_task = asyncio.create_task(self.job_updater())
        
        logger.info("=" * 60)
        logger.info("  🪙 BricsCoin Stratum Mining Server v2.0")
        logger.info("  Bitcoin-compatible protocol for ASIC miners")
        logger.info("  Supports: Bitaxe, NerdMiner, Antminer, etc.")
        logger.info("=" * 60)
        logger.info(f"⛏️  Server started on {STRATUM_HOST}:{STRATUM_PORT}")
        logger.info(f"   Network difficulty: {NETWORK_DIFFICULTY}")
        logger.info(f"   Block reward: {INITIAL_REWARD} BRICS")
        
    def create_protocol(self):
        """Create a new protocol instance for incoming connection"""
        protocol = StratumProtocol(self)
        self.protocols.append(protocol)
        return protocol
    
    async def job_updater(self):
        """Periodically update mining job"""
        global current_job
        
        while True:
            try:
                template = await get_block_template()
                if template:
                    # Use a dummy extranonce1 for job creation
                    current_job = create_job(template, "00000000", 4)
                    logger.info(f"New job: Block #{template['index']}, Diff: {template['difficulty']}")
                    
                    # Broadcast to all connected miners
                    await self.broadcast_job()
            except Exception as e:
                logger.error(f"Job update error: {e}")
            
            await asyncio.sleep(30)  # Update every 30 seconds
    
    async def broadcast_job(self):
        """Send current job to all connected miners"""
        if not current_job:
            return
        
        for protocol in self.protocols[:]:  # Copy list to avoid modification during iteration
            try:
                if protocol.subscribed:
                    await protocol.send_job()
            except Exception as e:
                logger.error(f"Error broadcasting to miner: {e}")
    
    async def broadcast_new_job(self):
        """Create and broadcast a new job (called when block is found)"""
        global current_job
        
        template = await get_block_template()
        if template:
            current_job = create_job(template, "00000000", 4)
            current_job['clean_jobs'] = True  # Force miners to switch
            logger.info(f"New block template: #{template['index']}")
            await self.broadcast_job()

async def main():
    """Main entry point"""
    server = StratumServer()
    await server.start()
    
    # Keep running
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())
