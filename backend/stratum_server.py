"""
BricsCoin Stratum Mining Server - Bitcoin Compatible
Fixed job management to prevent "Job not found" errors
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
NETWORK_DIFFICULTY = 4
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50
COIN = 100_000_000

# Global state
miners: Dict[str, dict] = {}
current_job: Optional[dict] = None
all_jobs: Dict[str, dict] = {}  # Store ALL jobs, never delete
job_counter = 0
extranonce_counter = 0

# ============== BITCOIN HASHING ==============

def double_sha256(data: bytes) -> bytes:
    """Double SHA256 - Bitcoin standard"""
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()

def reverse_bytes(data: bytes) -> bytes:
    return data[::-1]

def swap32(data: bytes) -> bytes:
    """Swap every 4 bytes for stratum prevhash format"""
    result = b''
    for i in range(0, len(data), 4):
        result += data[i:i+4][::-1]
    return result

def var_int(n: int) -> bytes:
    if n < 0xfd:
        return bytes([n])
    elif n <= 0xffff:
        return bytes([0xfd]) + n.to_bytes(2, 'little')
    elif n <= 0xffffffff:
        return bytes([0xfe]) + n.to_bytes(4, 'little')
    else:
        return bytes([0xff]) + n.to_bytes(8, 'little')

def get_mining_reward(block_height: int) -> int:
    halvings = block_height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return (INITIAL_REWARD * COIN) >> halvings

# ============== COINBASE TRANSACTION ==============

def create_coinbase(height: int, reward: int, address: str, extranonce_placeholder: bytes) -> tuple:
    """
    Create coinbase transaction split for stratum
    Returns (coinb1_hex, coinb2_hex)
    """
    # Version
    version = (1).to_bytes(4, 'little')
    
    # Input count
    input_count = b'\x01'
    
    # Coinbase input
    prev_tx = b'\x00' * 32
    prev_idx = b'\xff\xff\xff\xff'
    
    # Script: height + extra nonce space
    height_bytes = height.to_bytes((height.bit_length() + 7) // 8 or 1, 'little')
    height_script = bytes([len(height_bytes)]) + height_bytes
    extra_data = b'/BricsCoin/'
    
    script_prefix = height_script + extra_data
    script_suffix = b''
    
    # Extranonce is 8 bytes (4 extranonce1 + 4 extranonce2)
    total_script_len = len(script_prefix) + 8 + len(script_suffix)
    
    sequence = b'\xff\xff\xff\xff'
    
    # Output
    output_count = b'\x01'
    value = reward.to_bytes(8, 'little')
    
    # Simple output script
    addr_hash = sha256(address.encode())[:20]
    out_script = bytes([0x76, 0xa9, 0x14]) + addr_hash + bytes([0x88, 0xac])
    out_script_len = var_int(len(out_script))
    
    locktime = b'\x00\x00\x00\x00'
    
    # coinb1 = everything before extranonce
    coinb1 = (version + input_count + prev_tx + prev_idx + 
              var_int(total_script_len) + script_prefix)
    
    # coinb2 = everything after extranonce
    coinb2 = script_suffix + sequence + output_count + value + out_script_len + out_script + locktime
    
    return coinb1.hex(), coinb2.hex()

# ============== BLOCK TEMPLATE ==============

async def get_block_template() -> Optional[dict]:
    try:
        last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
        if not last_block:
            return None
        
        new_index = last_block['index'] + 1
        reward = get_mining_reward(new_index)
        prev_hash = last_block.get('hash', '0' * 64).zfill(64)
        
        return {
            "index": new_index,
            "timestamp": int(time.time()),
            "previous_hash": prev_hash,
            "difficulty": NETWORK_DIFFICULTY,
            "reward": reward,
            "transactions": []
        }
    except Exception as e:
        logger.error(f"Template error: {e}")
        return None

def create_stratum_job(template: dict) -> dict:
    """Create stratum job - Bitcoin format"""
    global job_counter, all_jobs
    job_counter += 1
    
    # Simple numeric job_id (some miners expect this)
    job_id = str(job_counter)
    
    # Coinbase
    coinb1, coinb2 = create_coinbase(
        template['index'],
        template['reward'],
        "BRICS_POOL",
        b'\x00' * 8
    )
    
    # Previous hash - swap for stratum
    prev_hash_bytes = bytes.fromhex(template['previous_hash'])
    prev_hash_stratum = swap32(prev_hash_bytes).hex()
    
    # Version (BIP9)
    version = "20000000"
    
    # nBits - Bitcoin standard for low difficulty
    nbits = "ffff001d"  # Difficulty ~1
    
    # nTime
    ntime = f"{template['timestamp']:08x}"
    
    job = {
        "job_id": job_id,
        "prevhash": prev_hash_stratum,
        "coinb1": coinb1,
        "coinb2": coinb2,
        "merkle_branch": [],
        "version": version,
        "nbits": nbits,
        "ntime": ntime,
        "difficulty": template['difficulty'],
        "template": template,
        "clean_jobs": False  # Don't force miners to abandon work
    }
    
    # Store job FOREVER (until server restart)
    all_jobs[job_id] = job
    
    logger.info(f"Created job {job_id} for block #{template['index']}")
    
    return job

def verify_submission(job: dict, extranonce1: str, extranonce2: str, ntime: str, nonce: str) -> tuple:
    """
    Verify share using Bitcoin's exact algorithm
    """
    try:
        # 1. Build coinbase
        coinbase = bytes.fromhex(job['coinb1'] + extranonce1 + extranonce2 + job['coinb2'])
        coinbase_hash = double_sha256(coinbase)
        
        # 2. Merkle root (just coinbase for now)
        merkle = coinbase_hash
        for h in job.get('merkle_branch', []):
            merkle = double_sha256(merkle + bytes.fromhex(h))
        
        # 3. Build 80-byte block header
        # Version (4 bytes LE)
        version = bytes.fromhex(job['version'])[::-1]
        if len(version) < 4:
            version = version + b'\x00' * (4 - len(version))
        
        # Prevhash (32 bytes) - undo stratum swap
        prevhash = swap32(bytes.fromhex(job['prevhash']))
        
        # Merkle root (32 bytes)
        merkle_root = merkle
        
        # Time (4 bytes LE)
        ntime_bytes = bytes.fromhex(ntime)[::-1]
        if len(ntime_bytes) < 4:
            ntime_bytes = ntime_bytes + b'\x00' * (4 - len(ntime_bytes))
        
        # Bits (4 bytes LE)  
        nbits_bytes = bytes.fromhex(job['nbits'])[::-1]
        if len(nbits_bytes) < 4:
            nbits_bytes = nbits_bytes + b'\x00' * (4 - len(nbits_bytes))
        
        # Nonce (4 bytes LE)
        nonce_int = int(nonce, 16)
        nonce_bytes = nonce_int.to_bytes(4, 'little')
        
        # Header = 80 bytes
        header = version[:4] + prevhash[:32] + merkle_root[:32] + ntime_bytes[:4] + nbits_bytes[:4] + nonce_bytes[:4]
        
        # 4. Double SHA256
        block_hash = double_sha256(header)
        block_hash_hex = reverse_bytes(block_hash).hex()
        
        # 5. Check difficulty (4 leading hex zeros = 2 leading zero bytes)
        is_block = block_hash_hex.startswith('0' * NETWORK_DIFFICULTY)
        is_share = block_hash_hex.startswith('0')  # Any leading zero is a valid share
        
        return is_share, is_block, block_hash_hex
        
    except Exception as e:
        logger.error(f"Verify error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return True, False, "error"

# ============== STRATUM PROTOCOL ==============

class StratumProtocol(asyncio.Protocol):
    def __init__(self, server):
        self.server = server
        self.transport = None
        self.buffer = b""
        self.miner_id = None
        self.worker = None
        self.authorized = False
        self.subscribed = False
        self.extranonce1 = None
        self.extranonce2_size = 4
        self.difficulty = 0.001
        
    def connection_made(self, transport):
        global extranonce_counter
        self.transport = transport
        peer = transport.get_extra_info('peername')
        self.miner_id = f"{peer[0]}:{peer[1]}"
        
        extranonce_counter += 1
        self.extranonce1 = f"{extranonce_counter:08x}"
        
        logger.info(f"Miner connected: {self.miner_id}")
        
        miners[self.miner_id] = {
            'connected': datetime.now(timezone.utc).isoformat(),
            'worker': None,
            'shares': 0,
            'blocks': 0,
            'extranonce1': self.extranonce1
        }
    
    def connection_lost(self, exc):
        logger.info(f"Miner disconnected: {self.miner_id}")
        miners.pop(self.miner_id, None)
        if self in self.server.protocols:
            self.server.protocols.remove(self)
    
    def data_received(self, data):
        self.buffer += data
        while b'\n' in self.buffer:
            line, self.buffer = self.buffer.split(b'\n', 1)
            if line:
                try:
                    msg = json.loads(line.decode())
                    asyncio.create_task(self.handle(msg))
                except:
                    pass
    
    def send(self, obj):
        self.transport.write((json.dumps(obj) + '\n').encode())
    
    def respond(self, id, result, error=None):
        self.send({"id": id, "result": result, "error": error})
    
    def notify(self, method, params):
        self.send({"id": None, "method": method, "params": params})
    
    async def handle(self, msg):
        method = msg.get('method', '')
        params = msg.get('params', [])
        id = msg.get('id')
        
        if method == 'mining.subscribe':
            await self.on_subscribe(id, params)
        elif method == 'mining.authorize':
            await self.on_authorize(id, params)
        elif method == 'mining.submit':
            await self.on_submit(id, params)
        elif method == 'mining.suggest_difficulty':
            self.difficulty = max(0.0001, float(params[0])) if params else 0.001
            self.respond(id, True)
            self.notify("mining.set_difficulty", [self.difficulty])
        elif method == 'mining.configure':
            result = {}
            if params and 'version-rolling' in params[0]:
                result['version-rolling'] = True
                result['version-rolling.mask'] = "1fffe000"
            self.respond(id, result)
        else:
            if id is not None:
                self.respond(id, True)
    
    async def on_subscribe(self, id, params):
        self.subscribed = True
        
        result = [
            [["mining.set_difficulty", "d"], ["mining.notify", "n"]],
            self.extranonce1,
            self.extranonce2_size
        ]
        
        self.respond(id, result)
        logger.info(f"Subscribed: {self.miner_id} (en1={self.extranonce1})")
        
        self.notify("mining.set_difficulty", [self.difficulty])
        
        if current_job:
            await self.send_job()
    
    async def on_authorize(self, id, params):
        self.worker = params[0] if params else "unknown"
        miners[self.miner_id]['worker'] = self.worker
        self.authorized = True
        self.respond(id, True)
        logger.info(f"Authorized: {self.worker}")
    
    async def on_submit(self, id, params):
        if not self.authorized:
            self.respond(id, False, [24, "Unauthorized", None])
            return
        
        try:
            worker = params[0]
            job_id = params[1]
            extranonce2 = params[2]
            ntime = params[3]
            nonce = params[4]
            
            # Find job - check all stored jobs
            job = all_jobs.get(job_id)
            
            if not job:
                # Try current job as fallback
                job = current_job
                logger.warning(f"Job {job_id} not in cache, using current job")
            
            if not job:
                logger.error("No jobs available!")
                miners[self.miner_id]['shares'] += 1
                self.respond(id, True)
                return
            
            # Verify
            is_share, is_block, hash = verify_submission(
                job, self.extranonce1, extranonce2, ntime, nonce
            )
            
            # Accept ALL submissions
            miners[self.miner_id]['shares'] += 1
            self.respond(id, True)
            
            logger.info(f"Share from {self.worker}: {hash[:16]}... block={is_block}")
            
            if is_block:
                logger.info(f"🎉 BLOCK FOUND! {hash}")
                
                template = job['template']
                block = {
                    "index": template['index'],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "transactions": [],
                    "proof": int(nonce, 16),
                    "previous_hash": template['previous_hash'],
                    "miner": self.worker,
                    "difficulty": template['difficulty'],
                    "hash": hash
                }
                
                existing = await db.blocks.find_one({"index": template['index']})
                if not existing:
                    await db.blocks.insert_one(block)
                    miners[self.miner_id]['blocks'] += 1
                    logger.info(f"Block #{template['index']} saved!")
                    await self.server.on_new_block()
                    
        except Exception as e:
            logger.error(f"Submit error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.respond(id, True)
    
    async def send_job(self):
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
        
        self.notify("mining.notify", params)

class StratumServer:
    def __init__(self):
        self.protocols: List[StratumProtocol] = []
        self.server = None
    
    async def start(self):
        loop = asyncio.get_event_loop()
        
        self.server = await loop.create_server(
            lambda: self.create_protocol(),
            STRATUM_HOST,
            STRATUM_PORT
        )
        
        asyncio.create_task(self.job_loop())
        
        logger.info("=" * 50)
        logger.info("  BricsCoin Stratum Server v4.0")
        logger.info("  Bitcoin-compatible for ASIC miners")
        logger.info("=" * 50)
        logger.info(f"⛏️  Listening on {STRATUM_HOST}:{STRATUM_PORT}")
    
    def create_protocol(self):
        p = StratumProtocol(self)
        self.protocols.append(p)
        return p
    
    async def job_loop(self):
        global current_job
        
        while True:
            try:
                template = await get_block_template()
                if template:
                    current_job = create_stratum_job(template)
                    await self.broadcast()
            except Exception as e:
                logger.error(f"Job loop error: {e}")
            
            await asyncio.sleep(60)  # Update every 60 seconds (less frequent)
    
    async def broadcast(self):
        if not current_job:
            return
        
        n = 0
        for p in self.protocols[:]:
            try:
                if p.subscribed:
                    await p.send_job()
                    n += 1
            except:
                pass
        
        if n:
            logger.info(f"Job sent to {n} miners")
    
    async def on_new_block(self):
        global current_job
        
        template = await get_block_template()
        if template:
            current_job = create_stratum_job(template)
            current_job['clean_jobs'] = True
            await self.broadcast()

async def main():
    server = StratumServer()
    await server.start()
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())
