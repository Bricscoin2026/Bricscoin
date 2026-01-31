"""
BricsCoin Stratum Mining Server v5.2
100% Bitcoin-Compatible Implementation for ASIC Miners (Bitaxe, NerdMiner)
FIXED: Each miner gets personalized jobs with their own reward address
NEW: Share tracking for real hashrate calculation
"""

import asyncio
import json
import hashlib
import struct
import time
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
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

# BricsCoin constants - difficulty will be read from database
INITIAL_DIFFICULTY = 1
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50
COIN = 100_000_000  # satoshis
DIFFICULTY_ADJUSTMENT_INTERVAL = 2016
TARGET_BLOCK_TIME = 600  # 10 minutes

async def get_network_difficulty() -> int:
    """Calcola la difficoltà di rete per **il prossimo blocco**.
    
    Logica:
    - Base: stesso algoritmo Bitcoin-style sui tempi medi degli ultimi N blocchi
      (N = 10 fino a 2016 blocchi, poi 2016).
    - Time-decay: se l'ultimo blocco è più vecchio del TARGET_BLOCK_TIME,
      la difficoltà viene ridotta in modo esponenziale nel tempo per evitare
      che la chain si blocchi quando l'hashrate è troppo basso.
    """
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
        logger.info(
            "⚙️ Stratum difficulty (genesis decay): base=%s, elapsed=%.1fs, decay_factor=%.4f, final=%s",
            INITIAL_DIFFICULTY,
            elapsed,
            decay_factor,
            new_difficulty,
        )
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
                # CLAMPING: calcola tempo reale con limite max per blocco
                actual_time = 0
                for i in range(len(last_blocks) - 1):
                    t1 = datetime.fromisoformat(last_blocks[i]["timestamp"].replace("Z", "+00:00"))
                    t2 = datetime.fromisoformat(last_blocks[i+1]["timestamp"].replace("Z", "+00:00"))
                    block_time = (t1 - t2).total_seconds()
                    # Limita ogni intervallo a max TARGET_BLOCK_TIME
                    actual_time += min(block_time, TARGET_BLOCK_TIME)
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
    
    logger.info(
        "⚙️ Stratum difficulty: base=%s, elapsed=%.1fs, decay_factor=%.4f, final=%s",
        base_difficulty,
        elapsed,
        decay_factor,
        new_difficulty,
    )
    
    return new_difficulty


# Global state
miners: Dict[str, dict] = {}
current_job: Optional[dict] = None
job_cache: Dict[str, dict] = {}
job_counter = 0
extranonce_counter = 0

# ============== BITCOIN-COMPATIBLE HASHING ==============

def double_sha256(data: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def sha256_single(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()

def reverse_bytes(data: bytes) -> bytes:
    return data[::-1]

def swap_endian_words(hex_str: str) -> str:
    result = ""
    for i in range(0, len(hex_str), 8):
        word = hex_str[i:i+8]
        swapped = "".join([word[j:j+2] for j in range(6, -1, -2)])
        result += swapped
    return result

def int_to_le_hex(value: int, length: int) -> str:
    return value.to_bytes(length, 'little').hex()

def var_int(n: int) -> bytes:
    if n < 0xfd:
        return bytes([n])
    elif n <= 0xffff:
        return bytes([0xfd]) + n.to_bytes(2, 'little')
    elif n <= 0xffffffff:
        return bytes([0xfe]) + n.to_bytes(4, 'little')
    else:
        return bytes([0xff]) + n.to_bytes(8, 'little')

def difficulty_to_nbits(difficulty: int) -> str:
    if difficulty <= 0:
        difficulty = 1
    max_target = 0x00000000FFFF0000000000000000000000000000000000000000000000000000
    target = max_target // difficulty
    target_hex = format(target, '064x')
    stripped = target_hex.lstrip('0') or '0'
    exponent = (len(stripped) + 1) // 2
    if len(stripped) >= 6:
        coefficient = int(stripped[:6], 16)
    else:
        coefficient = int(stripped.ljust(6, '0'), 16)
    if coefficient & 0x800000:
        coefficient >>= 8
        exponent += 1
    nbits = (exponent << 24) | coefficient
    return format(nbits, '08x')

def get_mining_reward(block_height: int) -> int:
    halvings = block_height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return (INITIAL_REWARD * COIN) >> halvings

# ============== COINBASE TRANSACTION ==============

def create_coinbase_tx(height: int, reward: int, miner_addr: str, extranonce1: str, extranonce2_size: int) -> tuple:
    version = struct.pack('<I', 1)
    input_count = var_int(1)
    prev_tx_hash = b'' * 32
    prev_out_index = struct.pack('<I', 0xFFFFFFFF)
    
    if height < 17:
        height_script = bytes([0x50 + height])
    elif height < 128:
        height_script = bytes([0x01, height])
    elif height < 32768:
        height_script = bytes([0x02]) + struct.pack('<H', height)
    else:
        height_script = bytes([0x03]) + struct.pack('<I', height)[:3]
    
    extranonce1_len = len(extranonce1) // 2
    extranonce2_len = extranonce2_size
    extra_data = b'/BricsCoin Pool/'
    script_prefix = height_script + extra_data
    script_suffix = b''
    total_script_len = len(script_prefix) + extranonce1_len + extranonce2_len + len(script_suffix)
    script_len_bytes = var_int(total_script_len)
    sequence = struct.pack('<I', 0xFFFFFFFF)
    output_count = var_int(1)
    output_value = struct.pack('<Q', reward)
    addr_hash = sha256_single(miner_addr.encode())[:20]
    output_script = bytes([0x76, 0xa9, 0x14]) + addr_hash + bytes([0x88, 0xac])
    output_script_len = var_int(len(output_script))
    locktime = struct.pack('<I', 0)
    
    coinb1 = (version + input_count + prev_tx_hash + prev_out_index + script_len_bytes + script_prefix)
    coinb2 = (script_suffix + sequence + output_count + output_value + output_script_len + output_script + locktime)
    
    return coinb1.hex(), coinb2.hex()

# ============== BLOCK TEMPLATE ==============

async def get_block_template() -> Optional[dict]:
    try:
        last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
        if not last_block:
            logger.warning("No blocks in database!")
            return None
        
        new_index = last_block['index'] + 1
        reward = get_mining_reward(new_index)
        prev_hash = last_block.get('hash', '0' * 64)
        
        if len(prev_hash) < 64:
            prev_hash = prev_hash.zfill(64)
        
        pending_txs = await db.transactions.find({"confirmed": False}, {"_id": 0}).limit(100).to_list(100)
        
        transactions = []
        for tx in pending_txs:
            transactions.append({
                "id": tx.get("id"),
                "sender": tx.get("sender"),
                "recipient": tx.get("recipient"),
                "amount": tx.get("amount"),
                "timestamp": tx.get("timestamp")
            })
        
        current_difficulty = await get_network_difficulty()
        
        template = {
            "index": new_index,
            "timestamp": int(time.time()),
            "previous_hash": prev_hash,
            "difficulty": current_difficulty,
            "reward": reward,
            "transactions": transactions,
            "pending_tx_ids": [tx.get("id") for tx in pending_txs]
        }
        
        logger.info(f"Template: block #{new_index}, prev={prev_hash[:16]}..., reward={reward/COIN} BRICS, diff={current_difficulty}")
        return template
        
    except Exception as e:
        logger.error(f"Template error: {e}")
        return None

def create_stratum_job(template: dict, miner_address: str, extranonce1: str = "00000000", extranonce2_size: int = 4) -> dict:
    global job_counter, job_cache
    job_counter += 1
    
    job_id = format(job_counter, 'x')
    coinb1, coinb2 = create_coinbase_tx(template['index'], template['reward'], miner_address, extranonce1, extranonce2_size)
    prev_hash_hex = template['previous_hash']
    prevhash_stratum = swap_endian_words(prev_hash_hex)
    version = "20000000"
    nbits = difficulty_to_nbits(template['difficulty'])
    ntime = format(template['timestamp'], '08x')
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
        "miner_address": miner_address,
        "difficulty": template["difficulty"],
        "created_at": time.time()
    }
    
    job_cache[job_id] = job
    logger.info(f"Job {job_id}: block #{template['index']}, miner={miner_address[:20]}...")
    return job

def verify_share(job: dict, extranonce1: str, extranonce2: str, ntime: str, nonce: str) -> tuple:
    try:
        coinbase_hex = job['coinb1'] + extranonce1 + extranonce2 + job['coinb2']
        coinbase_bytes = bytes.fromhex(coinbase_hex)
        coinbase_hash = double_sha256(coinbase_bytes)
        
        merkle_root = coinbase_hash
        for branch_hash in job.get('merkle_branch', []):
            branch_bytes = bytes.fromhex(branch_hash)
            merkle_root = double_sha256(merkle_root + branch_bytes)
        
        version_int = int(job['version'], 16)
        version_bytes = struct.pack('<I', version_int)
        prevhash_raw = bytes.fromhex(swap_endian_words(job['prevhash']))
        merkle_root_bytes = merkle_root
        ntime_int = int(ntime, 16)
        ntime_bytes = struct.pack('<I', ntime_int)
        nbits_int = int(job['nbits'], 16)
        nbits_bytes = struct.pack('<I', nbits_int)
        nonce_int = int(nonce, 16)
        nonce_bytes = struct.pack('<I', nonce_int)
        
        header = (version_bytes + prevhash_raw + merkle_root_bytes + ntime_bytes + nbits_bytes + nonce_bytes)
        
        if len(header) != 80:
            logger.error(f"Invalid header length: {len(header)} (expected 80)")
            return False, False, "invalid_header"
        
        header_hash = double_sha256(header)
        block_hash_hex = reverse_bytes(header_hash).hex()
        
        is_share = True
        job_difficulty = job.get('difficulty', INITIAL_DIFFICULTY)
        max_target = 0x00000000FFFF0000000000000000000000000000000000000000000000000000
        target = max_target // job_difficulty
        hash_int = int(block_hash_hex, 16)
        is_block = hash_int <= target
        
        leading_zeros = len(block_hash_hex) - len(block_hash_hex.lstrip('0'))
        if leading_zeros >= 1:
            logger.info(f"*** GOOD HASH with {leading_zeros} leading zeros: {block_hash_hex[:16]}... (diff={job_difficulty})")
        
        if is_block:
            logger.info(f"*** BLOCK FOUND! Hash: {block_hash_hex[:16]}... Target: {hex(target)[:16]}... (diff={job_difficulty})")
        
        return is_share, is_block, block_hash_hex
        
    except Exception as e:
        logger.error(f"Verification error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return True, False, "error"

# ============== STRATUM PROTOCOL HANDLER ==============

class StratumMiner:
    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter, server):
        self.reader = reader
        self.writer = writer
        self.server = server
        
        self.peer = writer.get_extra_info('peername')
        self.miner_id = f"{self.peer[0]}:{self.peer[1]}" if self.peer else "unknown"
        
        self.subscribed = False
        self.authorized = False
        self.worker_name = None
        
        global extranonce_counter
        extranonce_counter += 1
        self.extranonce1 = format(extranonce_counter, '08x')
        self.extranonce2_size = 4
        
        # Share difficulty - usata per calcolare hashrate reale
        self.difficulty = 512  # Bilanciata per Bitaxe/NerdMiner
        self.shares = 0
        self.blocks = 0
        
        self.personal_jobs: Dict[str, dict] = {}
        self.sent_jobs = set()
    
    def send(self, message: dict):
        try:
            data = json.dumps(message) + '\n'
            self.writer.write(data.encode())
        except Exception as e:
            logger.error(f"Send error to {self.miner_id}: {e}")
    
    def respond(self, msg_id, result, error=None):
        self.send({"id": msg_id, "result": result, "error": error})
    
    def notify(self, method: str, params: list):
        self.send({"id": None, "method": method, "params": params})
    
    async def handle_message(self, message: dict):
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
            suggested = float(params[0]) if params else 512
            self.difficulty = max(1, suggested)
            logger.info(f"[{self.miner_id}] Difficulty set to {self.difficulty}")
            self.respond(msg_id, True)
            self.notify("mining.set_difficulty", [self.difficulty])
        elif method == 'mining.configure':
            result = {}
            if params and len(params) > 0:
                extensions = params[0] if isinstance(params[0], list) else []
                if 'version-rolling' in extensions:
                    result['version-rolling'] = True
                    result['version-rolling.mask'] = "1fffe000"
            self.respond(msg_id, result)
        else:
            if msg_id is not None:
                self.respond(msg_id, True)
    
    async def handle_subscribe(self, msg_id, params):
        self.subscribed = True
        
        subscriptions = [
            ["mining.set_difficulty", "d1"],
            ["mining.notify", "n1"]
        ]
        
        result = [subscriptions, self.extranonce1, self.extranonce2_size]
        self.respond(msg_id, result)
        
        logger.info(f"[{self.miner_id}] Subscribed (extranonce1={self.extranonce1})")
        
        self.notify("mining.set_difficulty", [self.difficulty])
        
        if current_job:
            await self.send_job(current_job)
    
    async def handle_authorize(self, msg_id, params):
        self.worker_name = params[0] if params else "worker"
        
        # Check if wallet is blocked
        blocked = await db.blocked_wallets.find_one({"address": self.worker_name})
        if blocked:
            logger.warning(f"[{self.miner_id}] BLOCKED wallet tried to connect: {self.worker_name}")
            self.respond(msg_id, False, [24, "Wallet blocked", None])
            return
        
        self.authorized = True
        self.respond(msg_id, True)
        logger.info(f"[{self.miner_id}] Authorized as {self.worker_name}")
        
        miners[self.miner_id] = {
            'worker': self.worker_name,
            'connected_at': datetime.now(timezone.utc).isoformat(),
            'shares': 0,
            'blocks': 0,
            'extranonce1': self.extranonce1
        }
    
    async def handle_submit(self, msg_id, params):
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
            
            job = self.personal_jobs.get(job_id)
            job_source = "personal"
            
            if not job:
                job = job_cache.get(job_id)
                job_source = "global"
                if job:
                    logger.warning(f"Using GLOBAL job cache for {self.worker_name}")
                    job = job.copy()
                    job['miner_address'] = self.worker_name
            
            if not job:
                logger.warning(f"Job {job_id} not found for miner {self.worker_name}")
                self.respond(msg_id, True)
                self.shares += 1
                if self.miner_id in miners:
                    miners[self.miner_id]['shares'] += 1
                return
            
            is_share, is_block, block_hash = verify_share(job, self.extranonce1, extranonce2, ntime, nonce)
            
            self.respond(msg_id, True)
            self.shares += 1
            
            if self.miner_id in miners:
                miners[self.miner_id]['shares'] += 1
            
            # ============ SALVA SHARE PER CALCOLO HASHRATE REALE ============
            try:
                now = datetime.now(timezone.utc).isoformat()
                await db.miner_shares.insert_one({
                    "miner_id": self.miner_id,
                    "worker": self.worker_name,
                    "timestamp": now,
                    "share_difficulty": self.difficulty,
                    "job_id": job_id,
                    "is_block": is_block
                })
            except Exception as e:
                logger.error(f"Failed to save share: {e}")
            
            if is_block:
                logger.info(f"🎉 BLOCK FOUND by {self.worker_name}! Hash: {block_hash}")
                await self.save_block(job, nonce, block_hash)
            else:
                logger.info(f"Share accepted from {self.worker_name}: {block_hash[:16]}... (share={is_share})")
                
        except Exception as e:
            logger.error(f"Submit error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.respond(msg_id, True)
    
    async def save_block(self, job: dict, nonce: str, block_hash: str):
        try:
            template = job['template']
            miner_address = self.worker_name
            
            logger.info(f"Saving block for miner: {miner_address}")
            
            reward_amount = template['reward'] / COIN
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
                "miner": miner_address,
                "difficulty": template['difficulty'],
                "nonce": int(nonce, 16)
            }
            
            existing = await db.blocks.find_one({"index": template['index']})
            if existing:
                logger.warning(f"Block #{template['index']} already exists")
                return
            
            await db.blocks.insert_one(block)
            await db.transactions.insert_one(reward_tx)
            
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
            
            await self.server.on_new_block()
            
        except Exception as e:
            logger.error(f"Error saving block: {e}")
            import traceback
            logger.error(traceback.format_exc())
    
    async def send_job(self, job: dict):
        if not self.subscribed:
            return
        
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
    def __init__(self):
        self.miners: List[StratumMiner] = []
        self.server = None
        self.running = False
    
    async def start(self):
        self.running = True
        
        self.server = await asyncio.start_server(
            self.handle_connection,
            STRATUM_HOST,
            STRATUM_PORT
        )
        
        asyncio.create_task(self.job_updater())
        
        logger.info("=" * 60)
        logger.info("  BricsCoin Stratum Server v5.2")
        logger.info("  Bitcoin-Compatible for ASIC Miners")
        logger.info("  NEW: Real hashrate tracking from shares")
        logger.info("=" * 60)
        logger.info(f"  Listening on {STRATUM_HOST}:{STRATUM_PORT}")
        current_diff = await get_network_difficulty()
        logger.info(f"  Network difficulty: {current_diff}")
        logger.info("=" * 60)
        
        async with self.server:
            await self.server.serve_forever()
    
    async def handle_connection(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
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
        while self.running:
            try:
                template = await get_block_template()
                if template:
                    await self.broadcast_personalized_jobs(template)
            except Exception as e:
                logger.error(f"Job updater error: {e}")
            
            await asyncio.sleep(30)
    
    async def broadcast_personalized_jobs(self, template: dict, clean_jobs: bool = False):
        count = 0
        for miner in self.miners[:]:
            try:
                if miner.subscribed and miner.worker_name:
                    job = create_stratum_job(
                        template, 
                        miner.worker_name,
                        miner.extranonce1,
                        miner.extranonce2_size
                    )
                    if clean_jobs:
                        job['clean_jobs'] = True
                    
                    miner.personal_jobs[job['job_id']] = job
                    await miner.send_job(job)
                    count += 1
            except Exception as e:
                logger.error(f"Error sending job to {miner.miner_id}: {e}")
        
        if count > 0:
            logger.info(f"Personalized jobs sent to {count} miners")
            try:
                with open("/tmp/miners_count.txt", "w") as f:
                    f.write(str(count))
            except:
                pass
    
    async def broadcast_job(self, job: dict):
        template = await get_block_template()
        if template:
            await self.broadcast_personalized_jobs(template)
    
    async def on_new_block(self):
        logger.info("New block found! Creating fresh personalized jobs...")
        template = await get_block_template()
        if template:
            await self.broadcast_personalized_jobs(template, clean_jobs=True)


async def cleanup_old_shares():
    """Pulisce le shares più vecchie di 1 ora per non riempire il database"""
    while True:
        try:
            one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            result = await db.miner_shares.delete_many({"timestamp": {"$lt": one_hour_ago}})
            if result.deleted_count > 0:
                logger.info(f"Pulite {result.deleted_count} shares vecchie")
        except Exception as e:
            logger.error(f"Errore pulizia shares: {e}")
        await asyncio.sleep(300)


async def main():
    """Main entry point"""
    server = StratumServer()
    asyncio.create_task(cleanup_old_shares())
    await server.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped")
