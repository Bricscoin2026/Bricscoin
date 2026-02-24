"""
BricsCoin PPLNS Stratum Mining Server + HTTP API
=================================================
Runs on port 3334 (Stratum) and port 8080 (HTTP API).
Connects to the MAIN node's MongoDB for blockchain data.
Uses its own `pplns_miners` collection for miner tracking.

CRITICAL FIX: Uses double_sha256 for block header hashing (matching the main node).
The previous version used single SHA-256, causing all submitted blocks to be rejected.
"""

import asyncio
import json
import hashlib
import struct
import time
import os
import logging
import uuid
import threading
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from http.server import HTTPServer, BaseHTTPRequestHandler
from dotenv import load_dotenv
from pathlib import Path

# ================= ENV =================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

STRATUM_HOST = os.environ.get('STRATUM_HOST', '0.0.0.0')
STRATUM_PORT = int(os.environ.get('STRATUM_PORT', 3334))
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'bricscoin')
HTTP_API_PORT = int(os.environ.get('PPLNS_API_PORT', 8080))
NODE_ID = os.environ.get('NODE_ID', 'pplns-node')
MAIN_NODE_URL = os.environ.get('MAIN_NODE_URL', 'http://5.161.254.163:8001')

# ================= LOGGING =================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("pplns-stratum")

# ================= DATABASE =================
# Async client for Stratum server
async_client = AsyncIOMotorClient(MONGO_URL)
db = async_client[DB_NAME]

# Sync client for HTTP API (runs in separate thread)
sync_client = MongoClient(MONGO_URL)
sync_db = sync_client[DB_NAME]

# ================= CONSTANTS =================
INITIAL_DIFFICULTY = 1
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50
COIN = 100_000_000
TARGET_BLOCK_TIME = 600

# ================= GLOBAL STATE =================
miners: Dict[str, dict] = {}
current_job: Optional[dict] = None
job_cache: Dict[str, dict] = {}
job_counter = 0
extranonce_counter = 0
recent_shares: Dict[str, set] = {}


# ================= HASHING =================
def double_sha256(data: bytes) -> bytes:
    """Bitcoin-standard double SHA-256 hash. CRITICAL: must match the main node."""
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()


def reverse_bytes(data: bytes) -> bytes:
    return data[::-1]


def swap_endian_words(hex_str: str) -> str:
    """Standard Stratum protocol: reverse bytes within each 4-byte word."""
    result = ""
    for i in range(0, len(hex_str), 8):
        word = hex_str[i:i+8]
        result += "".join([word[j:j+2] for j in range(6, -1, -2)])
    return result


def var_int(n: int) -> bytes:
    if n < 0xfd: return bytes([n])
    if n <= 0xffff: return b'\xfd' + n.to_bytes(2, 'little')
    if n <= 0xffffffff: return b'\xfe' + n.to_bytes(4, 'little')
    return b'\xff' + n.to_bytes(8, 'little')


def difficulty_to_nbits(difficulty: int) -> str:
    if difficulty <= 0: difficulty = 1
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


def get_mining_reward(height: int) -> int:
    halvings = height // HALVING_INTERVAL
    if halvings >= 64: return 0
    return (INITIAL_REWARD * COIN) >> halvings


def format_hashrate(h):
    if h >= 1e18: return f"{h/1e18:.2f} EH/s"
    if h >= 1e15: return f"{h/1e15:.2f} PH/s"
    if h >= 1e12: return f"{h/1e12:.2f} TH/s"
    if h >= 1e9: return f"{h/1e9:.2f} GH/s"
    if h >= 1e6: return f"{h/1e6:.2f} MH/s"
    if h >= 1e3: return f"{h/1e3:.2f} KH/s"
    return f"{h:.2f} H/s"


# ================= NETWORK DIFFICULTY =================
_cached_difficulty = 10000  # Safe default, updated by successful API calls

async def get_network_difficulty() -> int:
    """Fetch current difficulty from main node API.
    Caches last known difficulty to avoid defaulting to 1 on API failure."""
    global _cached_difficulty
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            resp = await http_client.get(f"{MAIN_NODE_URL}/api/network/stats")
            if resp.status_code == 200:
                stats = resp.json()
                diff = max(1, stats.get("current_difficulty", _cached_difficulty))
                _cached_difficulty = diff  # Cache for next failure
                return diff
    except Exception as e:
        logger.warning(f"Failed to fetch difficulty from main node: {e}")
    return _cached_difficulty  # Return cached value, never default to 1


# ================= COINBASE =================
def create_coinbase_tx(height, reward, miner_addr, extranonce1, extranonce2_size):
    version = struct.pack('<I', 1)
    input_count = var_int(1)
    prev_tx_hash = b'\x00' * 32
    prev_out_index = struct.pack('<I', 0xFFFFFFFF)
    if height < 17: height_script = bytes([0x50 + height])
    elif height < 128: height_script = bytes([0x01, height])
    elif height < 32768: height_script = b'\x02' + struct.pack('<H', height)
    else: height_script = b'\x03' + struct.pack('<I', height)[:3]
    extra_data = b'/BricsCoin PPLNS Pool/'
    script_prefix = height_script + extra_data
    script_suffix = b''
    total_script_len = len(script_prefix) + len(extranonce1) // 2 + extranonce2_size + len(script_suffix)
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
async def get_block_template():
    """Fetch block template from main node via API.
    The PPLNS node doesn't have local blockchain data,
    so it fetches the latest block from the main node."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            # Get latest block from main node
            resp = await http_client.get(f"{MAIN_NODE_URL}/api/blocks?page=1&limit=1")
            if resp.status_code != 200:
                logger.warning(f"Failed to fetch blocks from main node: {resp.status_code}")
                return None
            data = resp.json()
            blocks = data.get("blocks", [])
            if not blocks:
                return None
            last_block = blocks[0]

            # Get network stats for difficulty
            stats_resp = await http_client.get(f"{MAIN_NODE_URL}/api/network/stats")
            if stats_resp.status_code == 200:
                stats = stats_resp.json()
                diff = stats.get("current_difficulty", 10000)
            else:
                diff = 10000

            # Get pending transactions
            try:
                tx_resp = await http_client.get(f"{MAIN_NODE_URL}/api/transactions/pending")
                pending_txs = tx_resp.json() if tx_resp.status_code == 200 else []
            except Exception:
                pending_txs = []

        new_index = last_block['index'] + 1
        reward = get_mining_reward(new_index)
        prev_hash = last_block.get('hash', '0' * 64)
        if len(prev_hash) < 64:
            prev_hash = prev_hash.zfill(64)

        txs = []
        tx_ids = []
        if isinstance(pending_txs, list):
            for tx in pending_txs[:100]:
                tid = tx.get("id", tx.get("tx_id"))
                if not tid:
                    continue
                txs.append({"id": tid, "sender": tx.get("sender", ""),
                            "recipient": tx.get("recipient", ""),
                            "amount": tx.get("amount", 0),
                            "timestamp": tx.get("timestamp", "")})
                tx_ids.append(tid)

        return {
            "index": new_index, "timestamp": int(time.time()),
            "previous_hash": prev_hash, "difficulty": diff,
            "reward": reward, "transactions": txs,
            "pending_tx_ids": tx_ids
        }
    except Exception as e:
        logger.error(f"get_block_template error: {e}")
        return None


def create_stratum_job(template, miner_address, extranonce1="00000000", extranonce2_size=4):
    global job_counter, job_cache
    job_counter += 1
    job_id = format(job_counter, 'x')
    coinb1, coinb2 = create_coinbase_tx(template['index'], template['reward'], miner_address, extranonce1, extranonce2_size)
    prevhash_stratum = swap_endian_words(template['previous_hash'])
    version = "20000000"
    nbits = difficulty_to_nbits(template['difficulty'])
    ntime = format(template['timestamp'], '08x')
    job = {
        "job_id": job_id, "prevhash": prevhash_stratum, "coinb1": coinb1, "coinb2": coinb2,
        "merkle_branch": [], "version": version, "nbits": nbits, "ntime": ntime,
        "clean_jobs": False, "template": template, "miner_address": miner_address,
        "network_difficulty": template["difficulty"], "share_difficulty": 1, "created_at": time.time()
    }
    job_cache[job_id] = job
    return job


# ================= VERIFY SHARE =================
async def verify_share(job, extranonce1, extranonce2, ntime, nonce, network_diff, version_bits=None):
    """
    Verify share using double_sha256 — MUST match the main node's hashing.
    This was the critical bug: previously used single SHA-256.
    """
    key = f"{job['job_id']}-{extranonce2}-{nonce}"
    if key in recent_shares.get(job['miner_address'], set()):
        return False, False, "duplicate"
    try:
        coinbase_bytes = bytes.fromhex(job['coinb1'] + extranonce1 + extranonce2 + job['coinb2'])
        coinbase_hash = double_sha256(coinbase_bytes)
        merkle_root = coinbase_hash
        for branch in job.get('merkle_branch', []):
            merkle_root = double_sha256(merkle_root + bytes.fromhex(branch))

        # Version rolling support (BIP320)
        base_version = int(job['version'], 16)
        if version_bits:
            mask = 0x1fffe000
            rolled = int(version_bits, 16)
            version = (base_version & ~mask) | (rolled & mask)
        else:
            version = base_version

        header = (
            struct.pack('<I', version)
            + bytes.fromhex(swap_endian_words(job['prevhash']))
            + merkle_root
            + struct.pack('<I', int(ntime, 16))
            + struct.pack('<I', int(job['nbits'], 16))
            + struct.pack('<I', int(nonce, 16))
        )
        # CRITICAL: double_sha256, not single sha256
        header_hash = double_sha256(header)
        block_hash_hex = reverse_bytes(header_hash).hex()

        hash_int = int(block_hash_hex, 16)
        MAX_TARGET = (2 ** 256) - 1
        share_diff = max(1, job.get('share_difficulty', 1))
        network_difficulty = max(1, network_diff)
        share_target = MAX_TARGET // share_diff
        block_target = MAX_TARGET // network_difficulty
        is_share = hash_int <= share_target
        is_block = hash_int <= block_target

        recent_shares.setdefault(job['miner_address'], set()).add(key)
        return is_share, is_block, block_hash_hex
    except Exception as e:
        logger.error(f"verify_share error: {e}")
        return False, False, "error"


# ================= STRATUM MINER =================
class StratumMiner:
    def __init__(self, reader, writer, server):
        self.reader = reader
        self.writer = writer
        self.server = server
        self.peer = writer.get_extra_info('peername')
        self.miner_id = f"{self.peer[0]}:{self.peer[1]}" if self.peer else "unknown"
        self.miner_ip = self.peer[0] if self.peer else "unknown"
        self.subscribed = False
        self.authorized = False
        self.worker_name = None
        global extranonce_counter
        extranonce_counter += 1
        self.extranonce1 = format(extranonce_counter, '08x')
        self.extranonce2_size = 4
        self.difficulty = 512
        self.shares = 0
        self.blocks = 0
        self.personal_jobs: Dict[str, dict] = {}
        self.sent_jobs = set()

    def send(self, message):
        try: self.writer.write((json.dumps(message) + '\n').encode())
        except Exception: pass

    def respond(self, msg_id, result, error=None):
        self.send({"id": msg_id, "result": result, "error": error})

    def notify(self, method, params):
        self.send({"id": None, "method": method, "params": params})

    async def handle_message(self, message):
        method = message.get('method', '')
        params = message.get('params', [])
        msg_id = message.get('id')
        if method != "mining.submit":
            logger.info(f"MSG [{self.miner_id}] method={method} params={str(params)[:100]}")
        if method == "mining.subscribe": await self.handle_subscribe(msg_id, params)
        elif method == "mining.authorize": await self.handle_authorize(msg_id, params)
        elif method == "mining.submit": await self.handle_submit(msg_id, params)
        elif method == "mining.suggest_difficulty":
            old_diff = self.difficulty
            self.difficulty = max(1, float(params[0]) if params else 1)
            logger.info(f"SUGGEST_DIFF [{self.worker_name}] {old_diff} -> {self.difficulty}")
            self.respond(msg_id, True)
            self.notify("mining.set_difficulty", [self.difficulty])
        elif method == "mining.configure":
            result = {"version-rolling": True, "version-rolling.mask": "1fffe000"} if params else {}
            self.respond(msg_id, result)
        else:
            if msg_id is not None: self.respond(msg_id, True)

    async def handle_subscribe(self, msg_id, params):
        self.subscribed = True
        result = [[["mining.set_difficulty", "d1"], ["mining.notify", "n1"]], self.extranonce1, self.extranonce2_size]
        self.respond(msg_id, result)
        self.notify("mining.set_difficulty", [self.difficulty])
        if current_job: await self.send_job(current_job)

    async def handle_authorize(self, msg_id, params):
        self.worker_name = params[0] if params else "worker"
        self.authorized = True
        self.respond(msg_id, True)
        logger.info(f"PPLNS Miner authorized: {self.worker_name} ({self.miner_id})")
        miners[self.miner_id] = {
            "worker": self.worker_name,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "shares": 0, "blocks": 0, "extranonce1": self.extranonce1
        }
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.pplns_miners.update_one(
            {"miner_id": self.miner_id},
            {"$set": {
                "miner_id": self.miner_id,
                "worker_name": self.worker_name,
                "worker": self.worker_name,
                "ip": self.miner_ip,
                "connected_at": now_iso,
                "last_seen": now_iso,
                "online": True,
                "shares": 0, "blocks": 0,
                "hashrate": 0, "hashrate_readable": "0 H/s",
            }},
            upsert=True
        )

    async def handle_submit(self, msg_id, params):
        if not self.authorized:
            self.respond(msg_id, False, [24, "Unauthorized worker", None])
            return
        try:
            worker, job_id, extranonce2, ntime, nonce = params[:5]
            version_bits = params[5] if len(params) > 5 else None
            job = self.personal_jobs.get(job_id) or job_cache.get(job_id)
            if not job:
                self.respond(msg_id, True)
                return
            job['miner_address'] = self.worker_name
            net_diff = await get_network_difficulty()
            is_share, is_block, block_hash = await verify_share(
                job, self.extranonce1, extranonce2, ntime, nonce, net_diff, version_bits
            )
            self.respond(msg_id, True)

            if is_share:
                self.shares += 1
                if self.miner_id in miners:
                    miners[self.miner_id]['shares'] += 1
                now_iso = datetime.now(timezone.utc).isoformat()

                # Track share in local pplns_shares collection
                await db.pplns_shares.insert_one({
                    "miner_id": self.miner_id,
                    "worker": self.worker_name,
                    "timestamp": now_iso,
                    "share_difficulty": self.difficulty,
                    "job_id": job_id,
                    "is_block": is_block,
                    "pool_mode": "pplns"
                })

                # Submit share to main node's sharechain via API
                share_hash = hashlib.sha256(f"{self.worker_name}{block_hash}{now_iso}".encode()).hexdigest()
                share_data = {
                    "share_id": share_hash[:24],
                    "worker": self.worker_name,
                    "share_hash": block_hash,
                    "share_difficulty": self.difficulty,
                    "network_difficulty": net_diff,
                    "block_height": job['template']['index'],
                    "nonce": nonce,
                    "timestamp": now_iso,
                    "peer_origin": NODE_ID,
                    "is_block": is_block,
                    "pool_mode": "pplns",
                }

                # Try HTTP API first (proper P2Pool propagation)
                try:
                    async with httpx.AsyncClient(timeout=5.0) as http_client:
                        resp = await http_client.post(
                            f"{MAIN_NODE_URL}/api/p2pool/share/submit",
                            json=share_data
                        )
                        if resp.status_code == 200:
                            logger.debug(f"Share submitted to main node: {share_hash[:16]}")
                        else:
                            logger.warning(f"Main node share submit failed: {resp.status_code}")
                            # Fallback: direct DB insert
                            share_data["height"] = 0
                            share_data["previous_share_id"] = "genesis"
                            share_data["validated"] = True
                            share_data["validated_by"] = [NODE_ID]
                            await db.p2pool_sharechain.insert_one(share_data)
                except Exception as e:
                    logger.debug(f"Main node API unreachable, using direct DB: {e}")
                    # Fallback: direct DB insert (works if same MongoDB)
                    try:
                        share_data["height"] = 0
                        share_data["previous_share_id"] = "genesis"
                        share_data["validated"] = True
                        share_data["validated_by"] = [NODE_ID]
                        await db.p2pool_sharechain.insert_one(share_data)
                    except Exception:
                        pass

                # Update miner stats
                await db.pplns_miners.update_one(
                    {"miner_id": self.miner_id},
                    {"$set": {"last_seen": now_iso, "online": True},
                     "$inc": {"shares": 1, "shares_1h": 1, "shares_24h": 1}},
                    upsert=True
                )

                logger.info(f"PPLNS SHARE [{self.worker_name}] diff={self.difficulty} hash={block_hash[:16]}... is_block={is_block}")

                if is_block:
                    logger.info(f"BLOCK FOUND by PPLNS miner {self.worker_name}! Hash: {block_hash}")
                    await self.save_block(job, nonce, block_hash)
        except Exception as e:
            logger.error(f"handle_submit error: {e}")
            self.respond(msg_id, True)

    async def save_block(self, job, nonce, block_hash):
        """Save a found block with PPLNS reward splitting.
        Reward is split proportionally among all PPLNS miners based on shares."""
        template = job['template']
        finder_address = self.worker_name
        reward_amount = template['reward'] / COIN
        timestamp = datetime.now(timezone.utc).isoformat()

        # Calculate PPLNS payouts: split reward based on recent shares
        PPLNS_WINDOW = 2016
        pplns_payouts = []
        try:
            # Get all PPLNS shares from sharechain (via main node API)
            async with httpx.AsyncClient(timeout=5.0) as http_client:
                resp = await http_client.get(f"{MAIN_NODE_URL}/api/p2pool/pplns/preview")
                if resp.status_code == 200:
                    preview = resp.json()
                    for payout in preview.get("payouts", []):
                        pplns_payouts.append({
                            "worker": payout["worker"],
                            "percentage": payout.get("share_percentage", payout.get("percentage", 0)),
                            "amount": round(reward_amount * payout.get("share_percentage", payout.get("percentage", 0)) / 100, 8)
                        })
        except Exception as e:
            logger.warning(f"Failed to get PPLNS preview: {e}")

        # Fallback: if no PPLNS data, split equally among active miners
        if not pplns_payouts:
            active_workers = list(set(
                m.get("worker", m.get("worker_name", "")) 
                for m in miners.values() if m.get("worker")
            ))
            if active_workers:
                share_each = round(reward_amount / len(active_workers), 8)
                for w in active_workers:
                    pplns_payouts.append({"worker": w, "percentage": 100/len(active_workers), "amount": share_each})
            else:
                # Last resort: give all to finder
                pplns_payouts = [{"worker": finder_address, "percentage": 100, "amount": reward_amount}]

        # Create reward transactions for each miner
        block_transactions = template.get('transactions', []).copy()
        reward_txs = []
        for payout in pplns_payouts:
            if payout["amount"] <= 0:
                continue
            tx = {
                "id": str(uuid.uuid4()), "sender": "COINBASE",
                "recipient": payout["worker"],
                "amount": payout["amount"],
                "timestamp": timestamp,
                "signature": "COINBASE_REWARD", "type": "mining_reward",
                "confirmed": True, "block_index": template['index'],
                "pool_mode": "pplns", "pplns_percentage": payout["percentage"]
            }
            reward_txs.append(tx)
            block_transactions.insert(0, {
                "id": tx["id"], "sender": "COINBASE",
                "recipient": payout["worker"],
                "amount": payout["amount"],
                "type": "mining_reward", "pool_mode": "pplns"
            })

        block = {
            "index": template['index'], "timestamp": timestamp,
            "transactions": block_transactions, "proof": int(nonce, 16),
            "previous_hash": template['previous_hash'], "hash": block_hash,
            "miner": finder_address, "difficulty": template['difficulty'],
            "nonce": int(nonce, 16), "pool_mode": "pplns",
            "pplns_payouts": [{"worker": p["worker"], "amount": p["amount"], "pct": p["percentage"]} for p in pplns_payouts]
        }

        # Submit to main node via HTTP API
        block_submitted = False
        try:
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                resp = await http_client.post(
                    f"{MAIN_NODE_URL}/api/p2pool/submit-block",
                    json=block
                )
                if resp.status_code == 200:
                    block_submitted = True
                    logger.info(f"PPLNS Block #{template['index']} submitted! Payouts: {len(pplns_payouts)} miners")
                else:
                    logger.warning(f"Main node block submit returned {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"Main node API unreachable for block submit: {e}")

        # Fallback: direct DB insert (only if same MongoDB, e.g., testing)
        if not block_submitted:
            existing = await db.blocks.find_one({"index": template['index']})
            if existing:
                logger.info(f"Block #{template['index']} already exists, skipping")
                return
            await db.blocks.insert_one(block)
            for tx in reward_txs:
                await db.transactions.insert_one(tx)
            logger.info(f"PPLNS Block #{template['index']} saved directly to DB")

        pending_tx_ids = template.get('pending_tx_ids', [])
        if pending_tx_ids:
            await db.transactions.update_many(
                {"$or": [{"id": {"$in": pending_tx_ids}}, {"tx_id": {"$in": pending_tx_ids}}]},
                {"$set": {"confirmed": True, "block_index": template['index']}}
            )
        self.blocks += 1
        if self.miner_id in miners:
            miners[self.miner_id]['blocks'] += 1
        payout_str = ", ".join(f"{p['worker'][:12]}..={p['amount']:.2f}" for p in pplns_payouts[:5])
        logger.info(f"PPLNS Block #{template['index']} found! Finder: {finder_address[:20]}..., Payouts: [{payout_str}], Hash: {block_hash[:32]}")
        await self.server.on_new_block()

    async def send_job(self, job):
        if not self.subscribed: return
        self.sent_jobs.add(job['job_id'])
        params = [job['job_id'], job['prevhash'], job['coinb1'], job['coinb2'],
                  job['merkle_branch'], job['version'], job['nbits'], job['ntime'], job['clean_jobs']]
        self.notify("mining.notify", params)


# ================= HASHRATE UPDATER =================
async def update_miner_hashrates():
    """Periodically update hashrate estimates for PPLNS miners."""
    while True:
        await asyncio.sleep(60)
        try:
            now = datetime.now(timezone.utc)
            hr_cutoff = (now - timedelta(hours=1)).isoformat()
            day_cutoff = (now - timedelta(hours=24)).isoformat()
            cutoff_10m = (now - timedelta(minutes=10)).isoformat()

            # Get active miners
            active_miners = await db.pplns_miners.find(
                {"online": True, "last_seen": {"$gte": cutoff_10m}}, {"_id": 0}
            ).to_list(100)

            for miner_doc in active_miners:
                worker = miner_doc.get("worker", miner_doc.get("worker_name", "unknown"))
                shares_1h = await db.pplns_shares.count_documents(
                    {"worker": worker, "timestamp": {"$gte": hr_cutoff}}
                )
                shares_24h = await db.pplns_shares.count_documents(
                    {"worker": worker, "timestamp": {"$gte": day_cutoff}}
                )
                avg_diff = 512
                pipeline = [
                    {"$match": {"worker": worker, "timestamp": {"$gte": hr_cutoff}}},
                    {"$group": {"_id": None, "avg": {"$avg": "$share_difficulty"}}}
                ]
                avg_res = await db.pplns_shares.aggregate(pipeline).to_list(1)
                if avg_res:
                    avg_diff = avg_res[0].get("avg", 512)
                hashrate = (shares_1h * avg_diff * (2**32)) / 3600 if shares_1h > 0 else 0

                await db.pplns_miners.update_one(
                    {"worker": worker},
                    {"$set": {
                        "shares_1h": shares_1h, "shares_24h": shares_24h,
                        "hashrate": round(hashrate, 2),
                        "hashrate_readable": format_hashrate(hashrate),
                    }}
                )

            # Mark stale miners offline
            await db.pplns_miners.update_many(
                {"online": True, "last_seen": {"$lt": cutoff_10m}},
                {"$set": {"online": False}}
            )
        except Exception as e:
            logger.error(f"Hashrate update error: {e}")


# ================= STRATUM SERVER =================
class StratumServer:
    def __init__(self):
        self.miners: List[StratumMiner] = []
        self.server = None
        self.running = False

    async def start(self):
        self.running = True
        self.server = await asyncio.start_server(self.handle_connection, STRATUM_HOST, STRATUM_PORT)
        asyncio.create_task(self.job_updater())
        asyncio.create_task(update_miner_hashrates())
        logger.info(f"BricsCoin PPLNS Stratum on {STRATUM_HOST}:{STRATUM_PORT}")
        async with self.server:
            await self.server.serve_forever()

    async def handle_connection(self, reader, writer):
        miner = StratumMiner(reader, writer, self)
        self.miners.append(miner)
        logger.info(f"PPLNS connection: {miner.miner_id}")
        try:
            buffer = b""
            while True:
                data = await reader.read(4096)
                if not data: break
                buffer += data
                while b'\n' in buffer:
                    line, buffer = buffer.split(b'\n', 1)
                    if line:
                        try: await miner.handle_message(json.loads(line.decode()))
                        except Exception as e: logger.error(f"Message error {miner.miner_id}: {e}")
        except Exception:
            pass
        finally:
            if miner in self.miners:
                self.miners.remove(miner)
            miners.pop(miner.miner_id, None)
            try:
                now_iso = datetime.now(timezone.utc).isoformat()
                await db.pplns_miners.update_one(
                    {"miner_id": miner.miner_id},
                    {"$set": {"online": False, "last_seen": now_iso}}
                )
            except Exception:
                pass
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass
            logger.info(f"PPLNS connection closed: {miner.miner_id}")

    async def job_updater(self):
        global current_job
        while self.running:
            template = await get_block_template()
            if template:
                current_job = create_stratum_job(template, "BRICS00000000000000000000000000000000")
                for miner in self.miners:
                    await miner.send_job(current_job)
            await asyncio.sleep(10)

    async def on_new_block(self):
        template = await get_block_template()
        if template:
            new_job = create_stratum_job(template, "BRICS00000000000000000000000000000000")
            global current_job
            current_job = new_job
            for miner in self.miners:
                await miner.send_job(new_job)


# ================= HTTP API (runs in separate thread) =================
class PPLNSHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/status":
            self._handle_status()
        elif self.path == "/miners":
            self._handle_miners()
        elif self.path == "/shares":
            self._handle_shares()
        else:
            self._respond(404, {"error": "not found"})

    def _handle_status(self):
        active = sync_db.pplns_miners.count_documents({"online": True})
        self._respond(200, {"status": "ok", "node_id": NODE_ID, "active_miners": active})

    def _handle_miners(self):
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        miners_docs = list(sync_db.pplns_miners.find(
            {"online": True, "last_seen": {"$gte": cutoff}}, {"_id": 0}
        ))
        # Deduplicate by worker address - keep the most recent entry
        seen_workers = {}
        for doc in miners_docs:
            worker = doc.get("worker", doc.get("worker_name", "unknown"))
            existing = seen_workers.get(worker)
            if not existing or doc.get("last_seen", "") > existing.get("last_seen", ""):
                seen_workers[worker] = doc
        result_miners = []
        for worker, doc in seen_workers.items():
            result_miners.append({
                "worker": worker,
                "online": True,
                "last_seen": doc.get("last_seen"),
                "shares_1h": doc.get("shares_1h", 0),
                "shares_24h": doc.get("shares_24h", 0),
                "blocks_found": doc.get("blocks_found", 0),
                "hashrate": doc.get("hashrate", 0),
                "hashrate_readable": doc.get("hashrate_readable", "0 H/s"),
                "node": NODE_ID,
                "pool_mode": "pplns",
            })
        self._respond(200, {"miners": result_miners, "active_count": len(result_miners)})

    def _handle_shares(self):
        """Expose share counts for aggregation by the main node."""
        now = datetime.now(timezone.utc)
        hr_cutoff = (now - timedelta(hours=1)).isoformat()
        day_cutoff = (now - timedelta(hours=24)).isoformat()
        shares_1h = sync_db.pplns_shares.count_documents({"timestamp": {"$gte": hr_cutoff}})
        shares_24h = sync_db.pplns_shares.count_documents({"timestamp": {"$gte": day_cutoff}})
        self._respond(200, {"shares_1h": shares_1h, "shares_24h": shares_24h, "node_id": NODE_ID})

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass


def run_http_api():
    server = HTTPServer(("0.0.0.0", HTTP_API_PORT), PPLNSHandler)
    logger.info(f"PPLNS HTTP API running on port {HTTP_API_PORT}")
    server.serve_forever()


# ================= MAIN =================
if __name__ == "__main__":
    # Start HTTP API in a background thread
    api_thread = threading.Thread(target=run_http_api, daemon=True)
    api_thread.start()

    # Start Stratum server
    server = StratumServer()
    asyncio.run(server.start())
