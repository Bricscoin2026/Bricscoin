"""
BricsCoin Stratum Mining Server v6.1
Bitcoin-compatible Stratum server
FINAL FIX: Correct share + block validation
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
from typing import Dict, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# ================== ENV & LOG ==================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("stratum")

# ================== DATABASE ==================

mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
db_name = os.getenv("DB_NAME", "bricscoin")
db = AsyncIOMotorClient(mongo_url)[db_name]

# ================== CONFIG ==================

STRATUM_HOST = os.getenv("STRATUM_HOST", "0.0.0.0")
STRATUM_PORT = int(os.getenv("STRATUM_PORT", 3333))

INITIAL_DIFFICULTY = 1
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50
COIN = 100_000_000
TARGET_BLOCK_TIME = 600

MAX_TARGET = 0x00000000FFFF0000000000000000000000000000000000000000000000000000

# ================== GLOBAL STATE ==================

miners: Dict[str, dict] = {}
job_cache: Dict[str, dict] = {}
current_job: Optional[dict] = None
job_counter = 0
extranonce_counter = 0

# ================== HASHING ==================

def double_sha256(data: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def reverse_bytes(b: bytes) -> bytes:
    return b[::-1]

def swap_endian_words(h: str) -> str:
    return "".join(
        "".join(reversed(h[i:i+8][j:j+2] for j in range(0, 8, 2)))
        for i in range(0, len(h), 8)
    )

def var_int(n: int) -> bytes:
    if n < 0xfd:
        return bytes([n])
    elif n <= 0xffff:
        return b'\xfd' + n.to_bytes(2, 'little')
    elif n <= 0xffffffff:
        return b'\xfe' + n.to_bytes(4, 'little')
    return b'\xff' + n.to_bytes(8, 'little')

# ================== DIFFICULTY ==================

async def get_network_difficulty() -> int:
    last = await db.blocks.find_one({}, sort=[("index", -1)])
    if not last:
        return INITIAL_DIFFICULTY

    diff = max(1, int(last.get("difficulty", 1)))

    try:
        last_time = datetime.fromisoformat(last["timestamp"].replace("Z", "+00:00"))
        elapsed = (datetime.now(timezone.utc) - last_time).total_seconds()
        if elapsed > TARGET_BLOCK_TIME:
            decay = 0.5 ** (elapsed / TARGET_BLOCK_TIME - 1)
            diff = max(1, int(diff * decay))
    except Exception:
        pass

    return diff

def difficulty_to_nbits(diff: int) -> str:
    diff = max(1, diff)
    target = MAX_TARGET // diff
    t_hex = f"{target:064x}".lstrip("0")
    exponent = (len(t_hex) + 1) // 2
    coefficient = int(t_hex[:6].ljust(6, "0"), 16)
    return f"{(exponent << 24) | coefficient:08x}"

# ================== COINBASE ==================

def get_reward(height: int) -> int:
    halvings = height // HALVING_INTERVAL
    return 0 if halvings >= 64 else (INITIAL_REWARD * COIN) >> halvings

def create_coinbase(height, reward, miner, extranonce1, extranonce2_size):
    version = struct.pack("<I", 1)
    vin = var_int(1)
    prev = b"" * 32
    idx = struct.pack("<I", 0xffffffff)

    height_script = bytes([0x01, height]) if height < 128 else b"\x01"
    msg = b"/BricsCoin/"
    script = height_script + msg

    script_len = var_int(len(script) + len(extranonce1)//2 + extranonce2_size)
    seq = struct.pack("<I", 0xffffffff)

    vout = var_int(1)
    value = struct.pack("<Q", reward)
    addr = hashlib.sha256(miner.encode()).digest()[:20]
    pk = b"\x76\xa9\x14" + addr + b"\x88\xac"
    pk_len = var_int(len(pk))
    lock = struct.pack("<I", 0)

    coinb1 = (version + vin + prev + idx + script_len + script).hex()
    coinb2 = (seq + vout + value + pk_len + pk + lock).hex()
    return coinb1, coinb2

# ================== BLOCK TEMPLATE ==================

async def get_block_template():
    last = await db.blocks.find_one({}, sort=[("index", -1)])
    if not last:
        return None

    height = last["index"] + 1
    return {
        "index": height,
        "previous_hash": last["hash"],
        "difficulty": await get_network_difficulty(),
        "reward": get_reward(height),
        "timestamp": int(time.time()),
        "transactions": [],
        "pending_tx_ids": []
    }

# ================== SHARE VERIFICATION ==================

async def verify_share(job, extranonce1, extranonce2, ntime, nonce, net_diff):
    coinbase = bytes.fromhex(job["coinb1"] + extranonce1 + extranonce2 + job["coinb2"])
    merkle = double_sha256(coinbase)

    header = (
        struct.pack("<I", int(job["version"], 16)) +
        bytes.fromhex(swap_endian_words(job["prevhash"])) +
        merkle +
        struct.pack("<I", int(ntime, 16)) +
        struct.pack("<I", int(job["nbits"], 16)) +
        struct.pack("<I", int(nonce, 16))
    )

    h = reverse_bytes(double_sha256(header))
    h_int = int.from_bytes(h, "big")

    share_target = MAX_TARGET // job["share_difficulty"]
    block_target = MAX_TARGET // net_diff

    return (
        h_int <= share_target,
        h_int <= block_target,
        h.hex()
    )

# ================== STRATUM MINER ==================

class StratumMiner:
    def __init__(self, reader, writer, server):
        global extranonce_counter
        extranonce_counter += 1

        self.reader = reader
        self.writer = writer
        self.server = server
        self.id = f"{writer.get_extra_info('peername')}"
        self.extranonce1 = f"{extranonce_counter:08x}"
        self.extranonce2_size = 4
        self.difficulty = 1
        self.authorized = False
        self.worker = None
        self.jobs = {}

    def send(self, obj):
        self.writer.write((json.dumps(obj) + "\n").encode())

    async def handle(self, msg):
        m = msg.get("method")
        p = msg.get("params", [])
        i = msg.get("id")

        if m == "mining.subscribe":
            self.send({"id": i, "result": [[["mining.notify","1"]], self.extranonce1, self.extranonce2_size], "error": None})
            self.send({"id": None, "method": "mining.set_difficulty", "params": [self.difficulty]})

        elif m == "mining.authorize":
            self.worker = p[0]
            self.authorized = True
            miners[self.id] = {"worker": self.worker, "shares": 0, "blocks": 0}
            self.send({"id": i, "result": True, "error": None})

        elif m == "mining.submit":
            job = self.jobs.get(p[1])
            if not job:
                self.send({"id": i, "result": False, "error": [21,"Job not found",None]})
                return

            is_share, is_block, h = await verify_share(
                job, self.extranonce1, p[2], p[3], p[4],
                await get_network_difficulty()
            )

            if not is_share:
                self.send({"id": i, "result": False, "error": [23,"Low difficulty share",None]})
                return

            self.send({"id": i, "result": True, "error": None})
            miners[self.id]["shares"] += 1

            if is_block:
                await self.server.save_block(job, h)
                miners[self.id]["blocks"] += 1

    async def send_job(self, job):
        self.jobs[job["job_id"]] = job
        self.send({"id": None, "method": "mining.notify", "params": [
            job["job_id"], job["prevhash"], job["coinb1"], job["coinb2"],
            job["merkle_branch"], job["version"], job["nbits"], job["ntime"], False
        ]})

# ================== STRATUM SERVER ==================

class StratumServer:
    async def start(self):
        self.miners = []
        self.server = await asyncio.start_server(self.handle_conn, STRATUM_HOST, STRATUM_PORT)
        asyncio.create_task(self.job_loop())
        logger.info(f"Stratum server listening on {STRATUM_HOST}:{STRATUM_PORT}")
        async with self.server:
            await self.server.serve_forever()

    async def handle_conn(self, r, w):
        miner = StratumMiner(r, w, self)
        self.miners.append(miner)
        while True:
            line = await r.readline()
            if not line:
                break
            await miner.handle(json.loads(line))

    async def job_loop(self):
        while True:
            tpl = await get_block_template()
            if tpl:
                for m in self.miners:
                    job = self.create_job(tpl, m)
                    await m.send_job(job)
            await asyncio.sleep(30)

    def create_job(self, tpl, miner):
        global job_counter
        job_counter += 1
        coinb1, coinb2 = create_coinbase(
            tpl["index"], tpl["reward"], miner.worker,
            miner.extranonce1, miner.extranonce2_size
        )
        return {
            "job_id": f"{job_counter:x}",
            "prevhash": swap_endian_words(tpl["previous_hash"]),
            "coinb1": coinb1,
            "coinb2": coinb2,
            "merkle_branch": [],
            "version": "20000000",
            "nbits": difficulty_to_nbits(tpl["difficulty"]),
            "ntime": f"{tpl['timestamp']:08x}",
            "share_difficulty": miner.difficulty,
            "template": tpl
        }

    async def save_block(self, job, h):
        tpl = job["template"]
        await db.blocks.insert_one({
            "index": tpl["index"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "hash": h,
            "previous_hash": tpl["previous_hash"],
            "difficulty": tpl["difficulty"],
            "miner": job["template"]
        })
        logger.info(f"✅ BLOCK FOUND #{tpl['index']} {h}")

# ================== MAIN ==================

async def main():
    await StratumServer().start()

if __name__ == "__main__":
    asyncio.run(main())
