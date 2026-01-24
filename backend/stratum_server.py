"""
BricsCoin Stratum Mining Server
Supports ASIC miners like Bitaxe, NerdMiner, Antminer, etc.
Protocol: Stratum v1 (JSON-RPC over TCP)
"""

import asyncio
import json
import hashlib
import time
import os
import logging
from datetime import datetime, timezone
from typing import Dict, Set, Optional
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
INITIAL_DIFFICULTY = 4
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50

# Connected miners
miners: Dict[str, dict] = {}
job_counter = 0
current_job = None

def sha256(data: str) -> str:
    """Calculate SHA256 hash"""
    return hashlib.sha256(data.encode()).hexdigest()

def sha256d(data: bytes) -> bytes:
    """Double SHA256 (standard for Bitcoin-like coins)"""
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def get_mining_reward(block_height: int) -> float:
    """Calculate mining reward with halving"""
    halvings = block_height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return INITIAL_REWARD / (2 ** halvings)

def check_difficulty(hash_value: str, difficulty: int) -> bool:
    """Check if hash meets difficulty requirement (integer difficulty = number of leading zeros)"""
    return hash_value.startswith('0' * difficulty)

def check_difficulty_float(hash_value: str, difficulty: float) -> bool:
    """Check if hash meets float difficulty (for share validation)
    
    For very low difficulties (< 1), we use a target-based system.
    Difficulty 1 = hash must be < 00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
    Difficulty 0.001 = hash must be < much higher target (easier)
    """
    if difficulty >= 1:
        # For difficulty >= 1, use leading zeros method
        return hash_value.startswith('0' * int(difficulty))
    
    # For fractional difficulty, convert to target
    # Bitcoin-like: target = max_target / difficulty
    # We use a simplified version
    max_target = int('f' * 64, 16)  # Maximum possible hash value
    target = int(max_target / (difficulty * 65535))  # Scale factor for low difficulties
    
    hash_int = int(hash_value, 16)
    return hash_int < target

async def get_current_difficulty() -> int:
    """Get current network difficulty"""
    blocks_count = await db.blocks.count_documents({})
    if blocks_count < 2016:
        return INITIAL_DIFFICULTY
    
    # Simplified difficulty - can be enhanced
    return INITIAL_DIFFICULTY

async def get_block_template() -> dict:
    """Get current block template for mining"""
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        # Create genesis if needed
        return None
    
    pending_txs = await db.transactions.find(
        {"confirmed": False}, {"_id": 0}
    ).limit(100).to_list(100)
    
    new_index = last_block['index'] + 1
    difficulty = await get_current_difficulty()
    timestamp = datetime.now(timezone.utc).isoformat()
    
    return {
        "index": new_index,
        "timestamp": timestamp,
        "transactions": pending_txs,
        "previous_hash": last_block['hash'],
        "difficulty": difficulty,
        "reward": get_mining_reward(new_index)
    }

def create_job(template: dict) -> dict:
    """Create a mining job from block template"""
    global job_counter
    job_counter += 1
    
    # Create coinbase transaction (miner reward)
    coinbase = f"BRICS Block {template['index']} Reward {template['reward']}"
    
    # Merkle root (simplified - just hash of transactions)
    tx_data = json.dumps(template['transactions'], sort_keys=True)
    merkle_root = sha256(tx_data) if template['transactions'] else sha256(coinbase)
    
    # Block header data for mining
    block_data = f"{template['index']}{template['timestamp']}{tx_data}{template['previous_hash']}"
    
    return {
        "job_id": f"{job_counter:08x}",
        "prevhash": template['previous_hash'],
        "coinbase": coinbase,
        "merkle_root": merkle_root,
        "block_data": block_data,
        "version": "00000001",
        "nbits": f"{template['difficulty']:08x}",
        "ntime": hex(int(time.time()))[2:],
        "difficulty": template['difficulty'],
        "template": template,
        "clean_jobs": True
    }

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
        self.difficulty = 0.001  # Very low difficulty for NerdMiner/small devices
        
    def connection_made(self, transport):
        self.transport = transport
        peername = transport.get_extra_info('peername')
        self.miner_id = f"{peername[0]}:{peername[1]}"
        logger.info(f"Miner connected: {self.miner_id}")
        
        # Generate unique extranonce for this miner
        self.extranonce1 = hashlib.md5(self.miner_id.encode()).hexdigest()[:8]
        
        miners[self.miner_id] = {
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "worker": None,
            "hashrate": 0,
            "shares_accepted": 0,
            "shares_rejected": 0,
            "last_share": None
        }
    
    def connection_lost(self, exc):
        logger.info(f"Miner disconnected: {self.miner_id}")
        if self.miner_id in miners:
            del miners[self.miner_id]
    
    def data_received(self, data):
        self.buffer += data
        
        while b'\n' in self.buffer:
            line, self.buffer = self.buffer.split(b'\n', 1)
            if not line or line.strip() == b'':
                continue
            try:
                decoded = line.decode('utf-8').strip()
                if not decoded:
                    continue
                message = json.loads(decoded)
                if isinstance(message, dict):
                    asyncio.create_task(self.handle_message(message))
                else:
                    logger.warning(f"Invalid message type: {type(message)}")
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
    
    def send_response(self, msg_id, result, error=None):
        """Send JSON-RPC response"""
        response = {
            "id": msg_id,
            "result": result,
            "error": error
        }
        self.transport.write((json.dumps(response) + '\n').encode())
    
    def send_notification(self, method, params):
        """Send JSON-RPC notification (no id)"""
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
        
        logger.debug(f"Received from {self.miner_id}: {method}")
        
        if method == 'mining.subscribe':
            await self.handle_subscribe(msg_id, params)
        elif method == 'mining.authorize':
            await self.handle_authorize(msg_id, params)
        elif method == 'mining.submit':
            await self.handle_submit(msg_id, params)
        elif method == 'mining.extranonce.subscribe':
            self.send_response(msg_id, True)
        elif method == 'mining.get_transactions':
            self.send_response(msg_id, [])
        elif method == 'mining.suggest_difficulty':
            # NerdMiner suggests a difficulty - accept it
            if params and len(params) > 0:
                suggested = params[0]
                if isinstance(suggested, (int, float)) and suggested > 0:
                    self.difficulty = max(0.001, min(suggested, 1))  # Between 0.001 and 1
                    self.send_notification("mining.set_difficulty", [self.difficulty])
                    logger.info(f"Set difficulty to {self.difficulty} for {self.miner_id}")
            self.send_response(msg_id, True)
        elif method == 'mining.configure':
            # Support mining.configure for version rolling
            self.send_response(msg_id, {"version-rolling": False})
        else:
            logger.warning(f"Unknown method: {method}")
            self.send_response(msg_id, None, [20, f"Unknown method: {method}", None])
    
    async def handle_subscribe(self, msg_id, params):
        """Handle mining.subscribe"""
        self.subscribed = True
        
        # Response format: [[subscription_id, extranonce1, extranonce2_size]]
        result = [
            [
                ["mining.set_difficulty", f"subscription_{self.miner_id}"],
                ["mining.notify", f"subscription_{self.miner_id}"]
            ],
            self.extranonce1,  # Extranonce1 (unique per miner)
            4  # Extranonce2 size in bytes
        ]
        
        self.send_response(msg_id, result)
        
        # Send initial difficulty
        self.send_notification("mining.set_difficulty", [self.difficulty])
        
        # Send current job
        await self.send_job()
        
        logger.info(f"Miner subscribed: {self.miner_id}")
    
    async def handle_authorize(self, msg_id, params):
        """Handle mining.authorize"""
        if len(params) >= 1:
            self.worker_name = params[0]
            # Worker format: address.worker_name or just address
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
            self.send_response(msg_id, False, [24, "Unauthorized worker", None])
            return
        
        try:
            worker_name = params[0]
            job_id = params[1]
            extranonce2 = params[2]
            ntime = params[3]
            nonce = params[4]
            
            # Verify the share
            job = current_job
            if not job or job['job_id'] != job_id:
                miners[self.miner_id]['shares_rejected'] += 1
                self.send_response(msg_id, False, [21, "Job not found", None])
                return
            
            # Calculate hash
            block_data = job['block_data']
            full_nonce = self.extranonce1 + extranonce2 + nonce
            test_data = block_data + full_nonce
            block_hash = sha256(test_data)
            
            # Block difficulty (for actual block)
            block_difficulty = job['difficulty']
            
            # Share difficulty (much lower for miners)
            share_difficulty = self.difficulty
            
            # First check if meets share difficulty (accept the share)
            if check_difficulty_float(block_hash, share_difficulty):
                miners[self.miner_id]['shares_accepted'] += 1
                miners[self.miner_id]['last_share'] = datetime.now(timezone.utc).isoformat()
                logger.info(f"Share accepted from {self.worker_name} - Hash: {block_hash[:16]}...")
                
                # Then check if it also meets block difficulty
                if check_difficulty(block_hash, block_difficulty):
                    # Valid block found!
                    logger.info(f"🎉 BLOCK FOUND by {self.worker_name}! Hash: {block_hash}")
                    
                    # Submit block to database
                    template = job['template']
                    new_block = {
                        "index": template['index'],
                        "timestamp": template['timestamp'],
                        "transactions": template['transactions'],
                        "proof": int(nonce, 16) if isinstance(nonce, str) else nonce,
                        "previous_hash": template['previous_hash'],
                        "nonce": int(nonce, 16) if isinstance(nonce, str) else nonce,
                        "miner": miners[self.miner_id].get('address', self.worker_name),
                        "difficulty": block_difficulty,
                        "hash": block_hash
                    }
                    
                    # Check if block already exists
                    existing = await db.blocks.find_one({"index": template['index']})
                    if existing:
                        self.send_response(msg_id, True)  # Share was still valid
                        return
                    
                    await db.blocks.insert_one(new_block)
                    
                    # Confirm transactions
                    tx_ids = [tx['id'] for tx in template.get('transactions', [])]
                    if tx_ids:
                        await db.transactions.update_many(
                            {"id": {"$in": tx_ids}},
                            {"$set": {"confirmed": True, "block_index": template['index']}}
                        )
                    
                    miners[self.miner_id]['blocks_found'] = miners[self.miner_id].get('blocks_found', 0) + 1
                    
                    # Notify all miners of new job
                    await self.server.broadcast_new_job()
                
                self.send_response(msg_id, True)
                
            else:
                # Share doesn't meet even the share difficulty
                miners[self.miner_id]['shares_rejected'] += 1
                self.send_response(msg_id, False, [23, "Low difficulty share", None])
                
        except Exception as e:
            logger.error(f"Submit error: {e}")
            self.send_response(msg_id, False, [20, str(e), None])
    
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
            job['coinbase'],  # coinb1
            "",  # coinb2
            [],  # merkle_branch (simplified)
            job['version'],
            job['nbits'],
            job['ntime'],
            job['clean_jobs']
        ]
        
        self.send_notification("mining.notify", params)


class StratumServer:
    """Main Stratum server"""
    
    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port
        self.server = None
        self.protocols: Set[StratumProtocol] = set()
    
    async def start(self):
        """Start the Stratum server"""
        loop = asyncio.get_event_loop()
        
        self.server = await loop.create_server(
            lambda: self._create_protocol(),
            self.host,
            self.port
        )
        
        logger.info(f"⛏️  BricsCoin Stratum Server started on {self.host}:{self.port}")
        logger.info(f"   Connect your ASIC miner to: stratum+tcp://{self.host}:{self.port}")
        
        # Start job update loop
        asyncio.create_task(self.job_update_loop())
        
        async with self.server:
            await self.server.serve_forever()
    
    def _create_protocol(self):
        protocol = StratumProtocol(self)
        self.protocols.add(protocol)
        return protocol
    
    async def job_update_loop(self):
        """Periodically update mining jobs"""
        global current_job
        
        while True:
            try:
                template = await get_block_template()
                if template:
                    current_job = create_job(template)
                    logger.info(f"New job created: Block #{template['index']}, Difficulty: {template['difficulty']}")
            except Exception as e:
                logger.error(f"Job update error: {e}")
            
            await asyncio.sleep(30)  # Update every 30 seconds
    
    async def broadcast_new_job(self):
        """Broadcast new job to all connected miners"""
        global current_job
        
        template = await get_block_template()
        if template:
            current_job = create_job(template)
            current_job['clean_jobs'] = True  # Force miners to drop old work
            
            for protocol in list(self.protocols):
                try:
                    await protocol.send_job()
                except Exception as e:
                    logger.error(f"Broadcast error: {e}")


async def main():
    """Main entry point"""
    logger.info("=" * 60)
    logger.info("  🪙 BricsCoin Stratum Mining Server")
    logger.info("  Supports: Bitaxe, NerdMiner, Antminer, etc.")
    logger.info("=" * 60)
    
    server = StratumServer(STRATUM_HOST, STRATUM_PORT)
    await server.start()


if __name__ == "__main__":
    asyncio.run(main())
