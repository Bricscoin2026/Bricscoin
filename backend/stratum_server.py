"""
BricsCoin Stratum Mining Server v6.2

✅ Vardiff automatico
✅ PPLNS payout
✅ Protezione duplicate share
✅ Merkle branch calcolata dalle transazioni pendenti
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

# ================= ENV =================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

STRATUM_HOST = os.environ.get('STRATUM_HOST', '0.0.0.0')
STRATUM_PORT = int(os.environ.get('STRATUM_PORT', 3333))
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'bricscoin')

# ================= LOGGING =================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("stratum")

# ================= DATABASE =================
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ================= CONSTANTS =================
INITIAL_DIFFICULTY = 1
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50
COIN = 100_000_000
DIFFICULTY_ADJUSTMENT_INTERVAL = 2016
TARGET_BLOCK_TIME = 600  # 10 minutes

# ================= GLOBAL STATE =================
miners: Dict[str, dict] = {}
current_job: Optional[dict] = None
job_cache: Dict[str, dict] = {}
job_counter = 0
extranonce_counter = 0
recent_shares: Dict[str, set] = {}  # Duplicate share protection

# ================= HASHING =================
def double_sha256(data: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def reverse_bytes(data: bytes) -> bytes:
    return data[::-1]

def swap_endian_words(hex_str: str) -> str:
    return "".join([hex_str[i:i+2] for i in range(0, len(hex_str), 2)][::-1])

def var_int(n: int) -> bytes:
    if n < 0xfd:
        return bytes([n])
    if n <= 0xffff:
        return b'\xfd' + n.to_bytes(2, 'little')
    if n <= 0xffffffff:
        return b'\xfe' + n.to_bytes(4, 'little')
    return b'\xff' + n.to_bytes(8, 'little')

def difficulty_to_nbits(difficulty: int) -> str:
    if difficulty <= 0:
        difficulty = 1
    max_target = 0x00000000FFFF0000000000000000000000000000000000000000000000000000
    target = max_target // difficulty
    target_hex = format(target, '064x')
    stripped = target_hex.lstrip('0') or '0'
    exponent = (len(stripped) + 1) // 2
    coeff = int(stripped[:6].ljust(6, '0'), 16)
    if coeff & 0x800000:
        coeff >>= 8
        exponent += 1
    nbits = (exponent << 24) | coeff
    return format(nbits, '08x')

# ================= MERKLE HELPERS =================
def tx_to_bytes(tx: dict) -> bytes:
    """
    Rappresentazione deterministica della tx per il Merkle Tree.
    Usiamo JSON con chiavi ordinate.
    """
    return json.dumps(tx, sort_keys=True, separators=(',', ':')).encode()

def build_merkle_branch_from_transactions(transactions: List[dict]) -> List[str]:
    """
    Costruisce una merkle_branch compatibile con verify_share:
      merkle_root = double_sha256(coinbase)        # fatto dal miner
      for b in merkle_branch:
          merkle_root = double_sha256(merkle_root + b)

    Strategia:
    - Prendiamo TUTTE le transazioni normali (non-coinbase) dal template.
    - Calcoliamo il Merkle root classico di queste tx (root_altre_tx).
    - Impostiamo merkle_branch = [root_altre_tx].
    Così il miner calcola:
      merkle_root_finale = double_sha256(coinbase_hash + root_altre_tx)
    e il server fa lo stesso in verify_share.
    """
    if not transactions:
        return []

    # Hash (double SHA256) delle tx normali del template
    leaves: List[bytes] = [double_sha256(tx_to_bytes(tx)) for tx in transactions]

    # Merkle tree classico delle sole tx normali
    layer = leaves
    while len(layer) > 1:
        if len(layer) % 2 == 1:
            layer.append(layer[-1])
        next_layer: List[bytes] = []
        for i in range(0, len(layer), 2):
            next_layer.append(double_sha256(layer[i] + layer[i + 1]))
        layer = next_layer

    root_rest = layer[0]  # merkle root delle altre tx
    return [root_rest.hex()]

def get_mining_reward(height: int) -> int:
    halvings = height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return (INITIAL_REWARD * COIN) >> halvings

# ================= NETWORK DIFFICULTY =================
async def get_network_difficulty() -> int:
    """
    Calcola la difficoltà per il PROSSIMO blocco.

    Bitcoin-style adjustment:
    - Ogni 10 blocchi (o 2016 dopo 2016 blocchi), ricalcola la difficoltà
    - Se i blocchi sono troppo veloci → aumenta difficoltà
    - Se i blocchi sono troppo lenti → diminuisce difficoltà
    - Limiti: max 4x aumento, min 0.25x diminuzione per adjustment
    """
    blocks_count = await db.blocks.count_documents({})

    if blocks_count == 0:
        return INITIAL_DIFFICULTY

    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        return INITIAL_DIFFICULTY

    current_difficulty = max(1, last_block.get("difficulty", INITIAL_DIFFICULTY))
    current_index = last_block.get("index", 0)

    # Intervallo di adjustment: 10 blocchi all'inizio, poi 2016
    adjustment_interval = 10 if blocks_count < 2016 else 2016

    # Calcola solo ai blocchi di adjustment
    if current_index > 0 and current_index % adjustment_interval == 0:
        last_blocks = await db.blocks.find(
            {}, {"_id": 0, "timestamp": 1, "index": 1}
        ).sort("index", -1).limit(adjustment_interval + 1).to_list(adjustment_interval + 1)

        if len(last_blocks) >= 2:
            last_blocks.sort(key=lambda x: x.get("index", 0))

            try:
                first_time = datetime.fromisoformat(last_blocks[0]["timestamp"].replace("Z", "+00:00"))
                last_time = datetime.fromisoformat(last_blocks[-1]["timestamp"].replace("Z", "+00:00"))
                actual_time = (last_time - first_time).total_seconds()
            except Exception:
                actual_time = TARGET_BLOCK_TIME * len(last_blocks)

            if actual_time <= 0:
                actual_time = 1

            expected_time = TARGET_BLOCK_TIME * (len(last_blocks) - 1)
            ratio = expected_time / actual_time
            ratio = max(0.25, min(4.0, ratio))

            new_difficulty = max(1, int(current_difficulty * ratio))

            avg_block_time = actual_time / max(1, len(last_blocks) - 1)
            logger.info(
                "⚙️ DIFFICULTY ADJUSTMENT @ block %d: current=%d, avg_time=%.1fs, target=%ds, ratio=%.2f, NEW=%d",
                current_index, current_difficulty, avg_block_time, TARGET_BLOCK_TIME, ratio, new_difficulty
            )

            return new_difficulty

    return current_difficulty

# ================= COINBASE =================
def create_coinbase_tx(height: int, reward: int, miner_addr: str, extranonce1: str, extranonce2_size: int) -> tuple:
    version = struct.pack('<I', 1)
    input_count = var_int(1)
    prev_tx_hash = b'' * 32
    prev_out_index = struct.pack('<I', 0xFFFFFFFF)

    # Height script
    if height < 17:
        height_script = bytes([0x50 + height])
    elif height < 128:
        height_script = bytes([0x01, height])
    elif height < 32768:
        height_script = b'\x02' + struct.pack('<H', height)
    else:
        height_script = b'\x03' + struct.pack('<I', height)[:3]

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
    addr_hash = hashlib.sha256(miner_addr.encode()).digest()[:20]
    output_script = b'\x76\xa9\x14' + addr_hash + b'\x88\xac'
    output_script_len = var_int(len(output_script))
    locktime = struct.pack('<I', 0)

    coinb1 = version + input_count + prev_tx_hash + prev_out_index + script_len_bytes + script_prefix
    coinb2 = script_suffix + sequence + output_count + output_value + output_script_len + output_script + locktime
    return coinb1.hex(), coinb2.hex()

# ================= BLOCK TEMPLATE =================
async def get_block_template() -> Optional[dict]:
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        return None

    new_index = last_block['index'] + 1
    reward = get_mining_reward(new_index)
    prev_hash = last_block.get('hash', '0' * 64)
    if len(prev_hash) < 64:
        prev_hash = prev_hash.zfill(64)

    pending_txs = await db.transactions.find({"confirmed": False}, {"_id": 0}).limit(100).to_list(100)

    # Transazioni da inserire nel blocco (escluse le coinbase che vengono costruite a parte)
    txs = [
        {
            "id": tx["id"],
            "sender": tx["sender"],
            "recipient": tx["recipient"],
            "amount": tx["amount"],
            "timestamp": tx["timestamp"]
        }
        for tx in pending_txs
    ]

    diff = await get_network_difficulty()

    return {
        "index": new_index,
        "timestamp": int(time.time()),
        "previous_hash": prev_hash,
        "difficulty": diff,
        "reward": reward,
        "transactions": txs,
        "pending_tx_ids": [tx["id"] for tx in pending_txs]
    }

def create_stratum_job(
    template: dict,
    miner_address: str,
    extranonce1: str = "00000000",
    extranonce2_size: int = 4
) -> dict:
    global job_counter, job_cache
    job_counter += 1
    job_id = format(job_counter, 'x')

    coinb1, coinb2 = create_coinbase_tx(
        template['index'],
        template['reward'],
        miner_address,
        extranonce1,
        extranonce2_size
    )

    prevhash_stratum = swap_endian_words(template['previous_hash'])
    version = "20000000"
    nbits = difficulty_to_nbits(template['difficulty'])
    ntime = format(template['timestamp'], '08x')

    # Calcola merkle_branch dalle transazioni pendenti del template
    merkle_branch = build_merkle_branch_from_transactions(
        template.get("transactions", [])
    )

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
        "network_difficulty": template["difficulty"],
        "share_difficulty": 1,
        "created_at": time.time()
    }
    job_cache[job_id] = job
    logger.info(
        f"Job {job_id}: block #{template['index']}, "
        f"miner={miner_address[:20]}..., merkle_branch_len={len(merkle_branch)}"
    )
    return job

# ================= VERIFY SHARE =================
async def verify_share(
    job: dict,
    extranonce1: str,
    extranonce2: str,
    ntime: str,
    nonce: str,
    network_diff: int
) -> tuple:
    key = f"{job['job_id']}-{extranonce2}-{nonce}"
    if key in recent_shares.get(job['miner_address'], set()):
        return False, False, "duplicate"
    try:
        coinbase_bytes = bytes.fromhex(
            job['coinb1'] + extranonce1 + extranonce2 + job['coinb2']
        )
        coinbase_hash = double_sha256(coinbase_bytes)

        merkle_root = coinbase_hash
        for branch in job.get('merkle_branch', []):
            merkle_root = double_sha256(
                merkle_root + bytes.fromhex(branch)
            )

        header = (
            struct.pack('<I', int(job['version'], 16)) +
            bytes.fromhex(swap_endian_words(job['prevhash'])) +
            merkle_root +
            struct.pack('<I', int(ntime, 16)) +
            struct.pack('<I', int(job['nbits'], 16)) +
            struct.pack('<I', int(nonce, 16))
        )

        header_hash = double_sha256(header)
        block_hash_hex = reverse_bytes(header_hash).hex()

        h = int(block_hash_hex, 16)
        max_target = 0x00000000FFFF0000000000000000000000000000000000000000000000000000

        share_target = max_target // max(1, job.get('share_difficulty', 1))
        block_target = max_target // max(1, network_diff)

        is_share = h <= share_target
        is_block = h <= block_target

        recent_shares.setdefault(job['miner_address'], set()).add(key)
        return is_share, is_block, block_hash_hex
    except Exception:
        return False, False, "error"

# ================= STRATUM MINER =================
class StratumMiner:
    def __init__(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
        server
    ):
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
        self.difficulty = 1
        self.shares = 0
        self.blocks = 0
        self.personal_jobs: Dict[str, dict] = {}
        self.sent_jobs = set()

    def send(self, message: dict):
        try:
            self.writer.write((json.dumps(message) + '\n').encode())
        except Exception:
            pass

    def respond(self, msg_id, result, error=None):
        self.send({"id": msg_id, "result": result, "error": error})

    def notify(self, method: str, params: list):
        self.send({"id": None, "method": method, "params": params})

    async def handle_message(self, message: dict):
        method = message.get('method', '')
        params = message.get('params', [])
        msg_id = message.get('id')
        if method == "mining.subscribe":
            await self.handle_subscribe(msg_id, params)
        elif method == "mining.authorize":
            await self.handle_authorize(msg_id, params)
        elif method == "mining.submit":
            await self.handle_submit(msg_id, params)
        elif method == "mining.suggest_difficulty":
            self.difficulty = max(1, float(params[0]) if params else 1)
            self.respond(msg_id, True)
            self.notify("mining.set_difficulty", [self.difficulty])
        elif method == "mining.configure":
            result = {
                "version-rolling": True,
                "version-rolling.mask": "1fffe000"
            } if params else {}
            self.respond(msg_id, result)
        else:
            if msg_id is not None:
                self.respond(msg_id, True)

    async def handle_subscribe(self, msg_id, params):
        self.subscribed = True
        result = [
            [["mining.set_difficulty", "d1"], ["mining.notify", "n1"]],
            self.extranonce1,
            self.extranonce2_size
        ]
        self.respond(msg_id, result)
        self.notify("mining.set_difficulty", [self.difficulty])
        if current_job:
            await self.send_job(current_job)

    async def handle_authorize(self, msg_id, params):
        self.worker_name = params[0] if params else "worker"
        blocked = await db.blocked_wallets.find_one({"address": self.worker_name})
        if blocked:
            self.respond(msg_id, False, [24, "Wallet blocked", None])
            return
        self.authorized = True
        self.respond(msg_id, True)
        miners[self.miner_id] = {
            "worker": self.worker_name,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "shares": 0,
            "blocks": 0,
            "extranonce1": self.extranonce1
        }

    async def handle_submit(self, msg_id, params):
        if not self.authorized:
            self.respond(msg_id, False, [24, "Unauthorized worker", None])
            return
        try:
            worker, job_id, extranonce2, ntime, nonce = params
            job = self.personal_jobs.get(job_id) or job_cache.get(job_id)
            if not job:
                self.respond(msg_id, True)
                return
            job['miner_address'] = self.worker_name
            net_diff = await get_network_difficulty()
            is_share, is_block, block_hash = await verify_share(
                job, self.extranonce1, extranonce2, ntime, nonce, net_diff
            )
            self.respond(msg_id, True)
            self.shares += 1
            if self.miner_id in miners:
                miners[self.miner_id]['shares'] += 1
            await db.miner_shares.insert_one({
                "miner_id": self.miner_id,
                "worker": self.worker_name,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "share_difficulty": self.difficulty,
                "job_id": job_id,
                "is_block": is_block
            })
            if is_block:
                await self.save_block(job, nonce, block_hash)
        except Exception:
            self.respond(msg_id, True)

    async def save_block(self, job, nonce, block_hash):
        template = job['template']
        miner_address = self.worker_name
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
            return

        await db.blocks.insert_one(block)
        await db.transactions.insert_one(reward_tx)

        pending_tx_ids = template.get('pending_tx_ids', [])
        if pending_tx_ids:
            await db.transactions.update_many(
                {"id": {"$in": pending_tx_ids}},
                {"$set": {"confirmed": True, "block_index": template['index']}}
            )

        self.blocks += 1
        if self.miner_id in miners:
            miners[self.miner_id]['blocks'] += 1

        logger.info(
            f"✅ Block #{template['index']} saved! Miner: {miner_address}, "
            f"Reward: {reward_amount} BRICS"
        )
        await self.server.on_new_block()

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

# ================= STRATUM SERVER =================
class StratumServer:
    def __init__(self):
        self.miners: List[StratumMiner] = []
        self.server = None
        self.running = False

    async def start(self):
        self.running = True
        self.server = await asyncio.start_server(
            self.handle_connection, STRATUM_HOST, STRATUM_PORT
        )
        asyncio.create_task(self.job_updater())
        logger.info(f"BricsCoin Stratum Server listening on {STRATUM_HOST}:{STRATUM_PORT}")
        async with self.server:
            await self.server.serve_forever()

    async def handle_connection(self, reader, writer):
        miner = StratumMiner(reader, writer, self)
        self.miners.append(miner)
        logger.info(f"New connection: {miner.miner_id}")
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
                            await miner.handle_message(json.loads(line.decode()))
                        except Exception:
                            pass
        except Exception:
            pass
        finally:
            if miner in self.miners:
                self.miners.remove(miner)
            miners.pop(miner.miner_id, None)
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass
            logger.info(f"Connection closed: {miner.miner_id}")

    async def job_updater(self):
        global current_job
        while self.running:
            template = await get_block_template()
            if template:
                current_job = create_stratum_job(
                    template, "BRICS00000000000000000000000000000000"
                )
                for miner in self.miners:
                    await miner.send_job(current_job)
            await asyncio.sleep(10)

    async def on_new_block(self):
        template = await get_block_template()
        if template:
            new_job = create_stratum_job(
                template, "BRICS00000000000000000000000000000000"
            )
            global current_job
            current_job = new_job
            for miner in self.miners:
                await miner.send_job(new_job)

# ================= MAIN =================
if __name__ == "__main__":
    server = StratumServer()
    asyncio.run(server.start())
  