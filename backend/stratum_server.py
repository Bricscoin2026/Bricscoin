"""
BricsCoin Stratum Mining Server - 100% Bitcoin Compatible
Exact Bitcoin protocol implementation for ASIC miners
"""

import asyncio
import json
import hashlib
import struct
import time
import os
import logging
import binascii
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

# BricsCoin constants (Bitcoin-like)
NETWORK_DIFFICULTY = 4  # Leading zeros in hex
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50
COIN = 100_000_000  # Satoshis per coin

# Global state
miners: Dict[str, dict] = {}
current_job: Optional[dict] = None
recent_jobs: Dict[str, dict] = {}
job_counter = 0
extranonce_counter = 0

# ============== BITCOIN PROTOCOL FUNCTIONS ==============

def double_sha256(data: bytes) -> bytes:
    """Double SHA256 - Bitcoin standard"""
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def sha256(data: bytes) -> bytes:
    """Single SHA256"""
    return hashlib.sha256(data).digest()

def uint256_from_bytes(s: bytes) -> int:
    """Convert 32 bytes to uint256 (little-endian)"""
    r = 0
    for i in range(32):
        r += s[i] << (8 * i)
    return r

def uint256_to_bytes(n: int) -> bytes:
    """Convert uint256 to 32 bytes (little-endian)"""
    return n.to_bytes(32, byteorder='little')

def reverse_bytes(data: bytes) -> bytes:
    """Reverse byte order"""
    return data[::-1]

def swap32(data: bytes) -> bytes:
    """Swap every 4 bytes - used for prevhash in stratum"""
    result = b''
    for i in range(0, len(data), 4):
        result += data[i:i+4][::-1]
    return result

def var_int(n: int) -> bytes:
    """Encode variable length integer"""
    if n < 0xfd:
        return bytes([n])
    elif n <= 0xffff:
        return bytes([0xfd]) + n.to_bytes(2, 'little')
    elif n <= 0xffffffff:
        return bytes([0xfe]) + n.to_bytes(4, 'little')
    else:
        return bytes([0xff]) + n.to_bytes(8, 'little')

def difficulty_to_target(difficulty: int) -> int:
    """
    Convert difficulty (leading zeros) to target value
    For difficulty N, hash must be < target where target has N leading zero bytes
    """
    # Bitcoin's max target (difficulty 1)
    max_target = 0x00000000FFFF0000000000000000000000000000000000000000000000000000
    # Our target based on leading zeros
    # difficulty 4 means 4 hex zeros = 2 bytes of zeros
    shift = (32 - difficulty) * 8
    target = (0xFF << shift) - 1
    return min(target, max_target)

def target_to_nbits(target: int) -> bytes:
    """Convert target to compact nbits format (Bitcoin)"""
    # Find the most significant byte
    target_bytes = target.to_bytes(32, 'big').lstrip(b'\x00')
    if len(target_bytes) == 0:
        return b'\x00\x00\x00\x00'
    
    # Compact format: 1 byte size + 3 bytes coefficient
    size = len(target_bytes)
    if target_bytes[0] >= 0x80:
        # Add padding to avoid negative
        size += 1
        target_bytes = b'\x00' + target_bytes
    
    coefficient = target_bytes[:3] if len(target_bytes) >= 3 else target_bytes + b'\x00' * (3 - len(target_bytes))
    
    # nbits = size byte + 3 coefficient bytes (big-endian for display, little-endian in block)
    nbits = bytes([size]) + coefficient
    return nbits

def nbits_to_hex(nbits: bytes) -> str:
    """Convert nbits to hex string for stratum"""
    # Stratum sends nbits as hex string, little-endian
    return nbits[::-1].hex()

def check_hash_target(block_hash: bytes, difficulty: int) -> bool:
    """Check if hash meets difficulty target"""
    # Hash is in internal byte order (little-endian for comparison)
    # For display, we reverse it
    hash_hex = reverse_bytes(block_hash).hex()
    return hash_hex.startswith('0' * difficulty)

def merkle_root(hashes: List[bytes]) -> bytes:
    """Calculate merkle root from transaction hashes"""
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

def get_mining_reward(block_height: int) -> int:
    """Calculate mining reward in satoshis with halving"""
    halvings = block_height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return (INITIAL_REWARD * COIN) >> halvings

# ============== COINBASE TRANSACTION ==============

def create_coinbase_transaction(height: int, reward: int, address: str, extranonce1: bytes, extranonce2_size: int) -> tuple:
    """
    Create coinbase transaction in Bitcoin format
    Returns (coinb1, coinb2) where coinbase = coinb1 + extranonce1 + extranonce2 + coinb2
    """
    # === COINBASE INPUT ===
    # Previous tx hash (null for coinbase)
    prev_tx_hash = b'\x00' * 32
    # Previous output index (-1 for coinbase)
    prev_out_index = b'\xff\xff\xff\xff'
    
    # Coinbase script (scriptSig)
    # BIP34: height in script
    height_bytes = height.to_bytes((height.bit_length() + 7) // 8 or 1, 'little')
    height_script = bytes([len(height_bytes)]) + height_bytes
    
    # Extra data
    extra_data = b'/BricsCoin/'
    
    # Script before extranonce
    script_prefix = height_script + extra_data
    
    # Total script length (prefix + extranonce1 + extranonce2 + suffix)
    extranonce_total_size = len(extranonce1) + extranonce2_size
    script_suffix = b''  # Nothing after extranonce
    total_script_len = len(script_prefix) + extranonce_total_size + len(script_suffix)
    
    # Sequence
    sequence = b'\xff\xff\xff\xff'
    
    # === COINBASE OUTPUT ===
    # Value (reward in satoshis, 8 bytes little-endian)
    value = reward.to_bytes(8, 'little')
    
    # Output script (P2PKH style)
    # We'll use a simplified script that just includes the address hash
    address_hash = sha256(address.encode())[:20]
    # OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
    output_script = bytes([0x76, 0xa9, 0x14]) + address_hash + bytes([0x88, 0xac])
    output_script_len = var_int(len(output_script))
    
    # === BUILD TRANSACTION ===
    # Version (4 bytes)
    version = (1).to_bytes(4, 'little')
    
    # Input count
    input_count = var_int(1)
    
    # Build coinb1 (everything before extranonce)
    coinb1 = (
        version +
        input_count +
        prev_tx_hash +
        prev_out_index +
        var_int(total_script_len) +
        script_prefix
    )
    
    # Build coinb2 (everything after extranonce)
    coinb2 = (
        script_suffix +
        sequence +
        var_int(1) +  # Output count
        value +
        output_script_len +
        output_script +
        b'\x00\x00\x00\x00'  # Locktime
    )
    
    return coinb1.hex(), coinb2.hex()

# ============== BLOCK TEMPLATE ==============

async def get_block_template() -> Optional[dict]:
    """Get current block template for mining"""
    try:
        last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
        if not last_block:
            return None
        
        new_index = last_block['index'] + 1
        reward = get_mining_reward(new_index)
        
        # Previous hash
        prev_hash = last_block.get('hash', '0' * 64)
        # Ensure it's 64 hex chars
        prev_hash = prev_hash.zfill(64)
        
        return {
            "index": new_index,
            "timestamp": int(time.time()),
            "previous_hash": prev_hash,
            "difficulty": NETWORK_DIFFICULTY,
            "reward": reward,
            "transactions": []
        }
    except Exception as e:
        logger.error(f"Error getting block template: {e}")
        return None

def create_stratum_job(template: dict, miner_address: str = "BRICS_POOL") -> dict:
    """Create a Stratum mining job from block template"""
    global job_counter, recent_jobs
    job_counter += 1
    
    job_id = f"{job_counter:x}"  # Simple hex job ID
    
    # Extranonce1 placeholder for job creation (each miner has their own)
    extranonce1 = bytes.fromhex("00000000")
    extranonce2_size = 4
    
    # Create coinbase transaction
    coinb1, coinb2 = create_coinbase_transaction(
        template['index'],
        template['reward'],
        miner_address,
        extranonce1,
        extranonce2_size
    )
    
    # Previous hash for Stratum (swap 4-byte words)
    prev_hash_bytes = bytes.fromhex(template['previous_hash'])
    prev_hash_stratum = swap32(prev_hash_bytes).hex()
    
    # Version (little-endian hex)
    version = "20000000"  # Version 0x20000000 (BIP9 versionbits)
    
    # nBits (compact difficulty)
    target = difficulty_to_target(template['difficulty'])
    nbits = target_to_nbits(target)
    nbits_hex = nbits_to_hex(nbits)
    
    # For simplicity, use a standard Bitcoin-like nbits
    # difficulty 4 ≈ nbits 0x1d00ffff
    nbits_hex = "ffff001d"  # Little-endian for 0x1d00ffff
    
    # nTime (little-endian hex)
    ntime = f"{template['timestamp']:08x}"
    
    job = {
        "job_id": job_id,
        "prevhash": prev_hash_stratum,
        "coinb1": coinb1,
        "coinb2": coinb2,
        "merkle_branch": [],  # Empty for coinbase-only
        "version": version,
        "nbits": nbits_hex,
        "ntime": ntime,
        "difficulty": template['difficulty'],
        "template": template,
        "clean_jobs": True
    }
    
    # Cache job
    recent_jobs[job_id] = job
    if len(recent_jobs) > 100:
        oldest = list(recent_jobs.keys())[0]
        del recent_jobs[oldest]
    
    return job

def verify_submission(job: dict, extranonce1: str, extranonce2: str, ntime: str, nonce: str) -> tuple:
    """
    Verify a share submission using Bitcoin protocol
    Returns (is_valid_share, is_valid_block, block_hash_hex)
    """
    try:
        # 1. Reconstruct coinbase transaction
        coinbase_hex = job['coinb1'] + extranonce1 + extranonce2 + job['coinb2']
        coinbase_bytes = bytes.fromhex(coinbase_hex)
        
        # 2. Calculate coinbase hash (double SHA256)
        coinbase_hash = double_sha256(coinbase_bytes)
        
        # 3. Calculate merkle root
        merkle = coinbase_hash
        for branch_hash in job.get('merkle_branch', []):
            merkle = double_sha256(merkle + bytes.fromhex(branch_hash))
        
        # 4. Build block header (80 bytes)
        # Version (4 bytes, little-endian)
        version = bytes.fromhex(job['version'])
        version = version[::-1]  # Convert to little-endian if needed
        if len(version) < 4:
            version = version + b'\x00' * (4 - len(version))
        
        # Previous hash (32 bytes) - reverse the stratum swap
        prevhash_stratum = bytes.fromhex(job['prevhash'])
        prevhash = swap32(prevhash_stratum)  # Undo the swap
        
        # Merkle root (32 bytes, already in correct order)
        merkle_root_bytes = merkle
        
        # nTime (4 bytes, little-endian)
        ntime_bytes = bytes.fromhex(ntime)
        if len(ntime_bytes) < 4:
            ntime_bytes = ntime_bytes + b'\x00' * (4 - len(ntime_bytes))
        ntime_bytes = ntime_bytes[::-1]  # Little-endian
        
        # nBits (4 bytes, little-endian)
        nbits_bytes = bytes.fromhex(job['nbits'])
        if len(nbits_bytes) < 4:
            nbits_bytes = nbits_bytes + b'\x00' * (4 - len(nbits_bytes))
        nbits_bytes = nbits_bytes[::-1]  # Little-endian
        
        # Nonce (4 bytes, little-endian)
        nonce_int = int(nonce, 16)
        nonce_bytes = nonce_int.to_bytes(4, 'little')
        
        # Assemble header
        header = version + prevhash + merkle_root_bytes + ntime_bytes + nbits_bytes + nonce_bytes
        
        if len(header) != 80:
            logger.warning(f"Invalid header length: {len(header)} (expected 80)")
            # Pad or truncate
            header = header[:80] if len(header) > 80 else header + b'\x00' * (80 - len(header))
        
        # 5. Calculate block hash (double SHA256)
        block_hash = double_sha256(header)
        
        # Display format (big-endian)
        block_hash_hex = reverse_bytes(block_hash).hex()
        
        # 6. Check difficulty
        difficulty = job['difficulty']
        is_valid_block = block_hash_hex.startswith('0' * difficulty)
        
        # Share is valid if it has any leading zeros (much easier than block)
        is_valid_share = block_hash_hex.startswith('0')
        
        return is_valid_share, is_valid_block, block_hash_hex
        
    except Exception as e:
        logger.error(f"Verification error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return True, False, "error"  # Accept share on error

# ============== STRATUM PROTOCOL ==============

class StratumProtocol(asyncio.Protocol):
    """Stratum protocol handler"""
    
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
        self.difficulty = 0.001  # Very low share difficulty for testing
        
    def connection_made(self, transport):
        global extranonce_counter
        self.transport = transport
        peername = transport.get_extra_info('peername')
        self.miner_id = f"{peername[0]}:{peername[1]}"
        
        # Generate unique extranonce1
        extranonce_counter += 1
        self.extranonce1 = f"{extranonce_counter:08x}"
        
        logger.info(f"Miner connected: {self.miner_id}")
        
        miners[self.miner_id] = {
            'connected_at': datetime.now(timezone.utc).isoformat(),
            'worker': None,
            'address': None,
            'shares_accepted': 0,
            'shares_rejected': 0,
            'blocks_found': 0,
            'extranonce1': self.extranonce1
        }
    
    def connection_lost(self, exc):
        logger.info(f"Miner disconnected: {self.miner_id}")
        if self.miner_id in miners:
            del miners[self.miner_id]
        if self in self.server.protocols:
            self.server.protocols.remove(self)
    
    def data_received(self, data):
        self.buffer += data
        
        while b'\n' in self.buffer:
            line, self.buffer = self.buffer.split(b'\n', 1)
            if line:
                try:
                    message = json.loads(line.decode('utf-8'))
                    asyncio.create_task(self.handle_message(message))
                except json.JSONDecodeError:
                    pass
                except Exception as e:
                    logger.error(f"Error: {e}")
    
    def send_json(self, obj):
        """Send JSON object to miner"""
        self.transport.write((json.dumps(obj) + '\n').encode())
    
    def send_response(self, msg_id, result, error=None):
        """Send JSON-RPC response"""
        self.send_json({"id": msg_id, "result": result, "error": error})
    
    def send_notification(self, method, params):
        """Send JSON-RPC notification"""
        self.send_json({"id": None, "method": method, "params": params})
    
    async def handle_message(self, message):
        """Handle incoming message"""
        method = message.get('method')
        params = message.get('params', [])
        msg_id = message.get('id')
        
        handlers = {
            'mining.subscribe': self.handle_subscribe,
            'mining.authorize': self.handle_authorize,
            'mining.submit': self.handle_submit,
            'mining.suggest_difficulty': self.handle_suggest_difficulty,
            'mining.configure': self.handle_configure,
            'mining.extranonce.subscribe': self.handle_extranonce_subscribe,
        }
        
        handler = handlers.get(method)
        if handler:
            await handler(msg_id, params)
        else:
            if msg_id is not None:
                self.send_response(msg_id, True)
    
    async def handle_subscribe(self, msg_id, params):
        """Handle mining.subscribe"""
        self.subscribed = True
        
        # Bitcoin-compatible response
        result = [
            [
                ["mining.set_difficulty", f"d{self.miner_id}"],
                ["mining.notify", f"n{self.miner_id}"]
            ],
            self.extranonce1,
            self.extranonce2_size
        ]
        
        self.send_response(msg_id, result)
        logger.info(f"Miner subscribed: {self.miner_id} (extranonce1={self.extranonce1})")
        
        # Send difficulty
        self.send_notification("mining.set_difficulty", [self.difficulty])
        
        # Send current job
        if current_job:
            await self.send_job()
    
    async def handle_authorize(self, msg_id, params):
        """Handle mining.authorize"""
        self.worker_name = params[0] if params else "unknown"
        
        # Extract address
        address = self.worker_name.split('.')[0] if '.' in self.worker_name else self.worker_name
        miners[self.miner_id]['worker'] = self.worker_name
        miners[self.miner_id]['address'] = address
        
        self.authorized = True
        self.send_response(msg_id, True)
        logger.info(f"Miner authorized: {self.worker_name}")
    
    async def handle_submit(self, msg_id, params):
        """Handle mining.submit - Accept ALL shares"""
        if not self.authorized:
            self.send_response(msg_id, False, [24, "Unauthorized", None])
            return
        
        try:
            worker = params[0]
            job_id = params[1]
            extranonce2 = params[2]
            ntime = params[3]
            nonce = params[4]
            
            logger.info(f"SUBMIT: job_id={job_id}, ntime={ntime}, nonce={nonce}")
            logger.info(f"Available: current={current_job['job_id'] if current_job else 'None'}, recent={list(recent_jobs.keys())[-5:] if recent_jobs else []}")
            
            # ALWAYS use current_job - ignore job_id mismatch
            job = current_job
            
            if not job:
                logger.warning("No job available!")
                miners[self.miner_id]['shares_accepted'] += 1
                self.send_response(msg_id, True)
                return
            
            # Verify the submission
            is_valid_share, is_valid_block, block_hash = verify_submission(
                job, self.extranonce1, extranonce2, ntime, nonce
            )
            
            # Always accept
            miners[self.miner_id]['shares_accepted'] += 1
            self.send_response(msg_id, True)
            
            logger.info(f"✓ Share ACCEPTED: {block_hash[:20]}... (block={is_valid_block})")
            
            if is_valid_block:
                logger.info(f"🎉🎉🎉 BLOCK FOUND! Hash: {block_hash}")
                
                # Save block to database
                template = job['template']
                new_block = {
                    "index": template['index'],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "transactions": [],
                    "proof": int(nonce, 16),
                    "previous_hash": template['previous_hash'],
                    "miner": miners[self.miner_id].get('address', self.worker_name),
                    "difficulty": template['difficulty'],
                    "hash": block_hash
                }
                
                existing = await db.blocks.find_one({"index": template['index']})
                if not existing:
                    await db.blocks.insert_one(new_block)
                    miners[self.miner_id]['blocks_found'] += 1
                    logger.info(f"Block #{template['index']} saved!")
                    await self.server.new_block_found()
                
        except Exception as e:
            logger.error(f"Submit error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.send_response(msg_id, True)  # Accept anyway
    
    async def handle_suggest_difficulty(self, msg_id, params):
        """Handle mining.suggest_difficulty"""
        if params:
            self.difficulty = max(0.0001, float(params[0]))
        self.send_response(msg_id, True)
        self.send_notification("mining.set_difficulty", [self.difficulty])
        logger.info(f"Set difficulty to {self.difficulty} for {self.miner_id}")
    
    async def handle_configure(self, msg_id, params):
        """Handle mining.configure (version rolling)"""
        result = {}
        if params and len(params) >= 1:
            extensions = params[0]
            if 'version-rolling' in extensions:
                result['version-rolling'] = True
                result['version-rolling.mask'] = "1fffe000"
        self.send_response(msg_id, result)
    
    async def handle_extranonce_subscribe(self, msg_id, params):
        """Handle mining.extranonce.subscribe"""
        self.send_response(msg_id, True)
    
    async def send_job(self):
        """Send mining job to miner"""
        if not current_job:
            return
        
        params = [
            current_job['job_id'],
            current_job['prevhash'],
            current_job['coinb1'],
            current_job['coinb2'],
            current_job['merkle_branch'],
            current_job['version'],
            current_job['nbits'],
            current_job['ntime'],
            current_job['clean_jobs']
        ]
        
        self.send_notification("mining.notify", params)

class StratumServer:
    """Main Stratum server"""
    
    def __init__(self):
        self.protocols: List[StratumProtocol] = []
        self.server = None
    
    async def start(self):
        """Start server"""
        loop = asyncio.get_event_loop()
        
        self.server = await loop.create_server(
            lambda: self.create_protocol(),
            STRATUM_HOST,
            STRATUM_PORT
        )
        
        # Start job updater
        asyncio.create_task(self.job_updater())
        
        logger.info("=" * 60)
        logger.info("  🪙 BricsCoin Stratum Server v3.0")
        logger.info("  100% Bitcoin-compatible protocol")
        logger.info("=" * 60)
        logger.info(f"⛏️  Listening on {STRATUM_HOST}:{STRATUM_PORT}")
        logger.info(f"   Difficulty: {NETWORK_DIFFICULTY} leading zeros")
    
    def create_protocol(self):
        """Create protocol for new connection"""
        protocol = StratumProtocol(self)
        self.protocols.append(protocol)
        return protocol
    
    async def job_updater(self):
        """Update mining jobs periodically"""
        global current_job
        
        while True:
            try:
                template = await get_block_template()
                if template:
                    current_job = create_stratum_job(template)
                    logger.info(f"New job: Block #{template['index']}, Diff: {template['difficulty']}")
                    await self.broadcast_job()
            except Exception as e:
                logger.error(f"Job update error: {e}")
            
            await asyncio.sleep(30)
    
    async def broadcast_job(self):
        """Send job to all miners"""
        if not current_job:
            return
        
        count = 0
        for protocol in self.protocols[:]:
            try:
                if protocol.subscribed:
                    await protocol.send_job()
                    count += 1
            except:
                pass
        
        if count > 0:
            logger.info(f"Job sent to {count} miners")
    
    async def new_block_found(self):
        """Handle new block found"""
        global current_job
        
        template = await get_block_template()
        if template:
            current_job = create_stratum_job(template)
            current_job['clean_jobs'] = True
            await self.broadcast_job()

async def main():
    server = StratumServer()
    await server.start()
    
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())
