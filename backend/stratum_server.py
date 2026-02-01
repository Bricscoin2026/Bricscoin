"""
BricsCoin Stratum Mining Server v6.2
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

STRATUM_HOST = os.environ.get('STRATUM_HOST', '0.0.0.0')
STRATUM_PORT = int(os.environ.get('STRATUM_PORT', 3333))
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'bricscoin')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("stratum")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

INITIAL_DIFFICULTY = 1
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50
COIN = 100_000_000
TARGET_BLOCK_TIME = 600

miners: Dict[str, dict] = {}
current_job: Optional[dict] = None
job_cache: Dict[str, dict] = {}
job_counter = 0
extranonce_counter = 0
recent_shares: Dict[str, set] = {}

def double_sha256(data: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def reverse_bytes(data: bytes) -> bytes:
    return data[::-1]

def swap_endian_words(hex_str: str) -> str:
    return "".join([hex_str[i:i+2] for i in range(0, len(hex_str), 2)][::-1])

def var_int(n: int) -> bytes:
    if n < 0xfd: return bytes([n])
    if n <= 0xffff: return b'\xfd' + n.to_bytes(2,'little')
    if n <= 0xffffffff: return b'\xfe' + n.to_bytes(4,'little')
    return b'\xff' + n.to_bytes(8,'little')

def difficulty_to_nbits(difficulty: int) -> str:
    if difficulty <= 0: difficulty = 1
    max_target = 0x00000000FFFF0000000000000000000000000000000000000000000000000000
    target = max_target // difficulty
    target_hex = format(target, '064x')
    stripped = target_hex.lstrip('0') or '0'
    exponent = (len(stripped) + 1) // 2
    coeff = int(stripped[:6].ljust(6,'0'),16)
    if coeff & 0x800000:
        coeff >>= 8
        exponent += 1
    nbits = (exponent << 24) | coeff
    return format(nbits,'08x')

def get_mining_reward(height: int) -> int:
    halvings = height // HALVING_INTERVAL
    if halvings >= 64: return 0
    return (INITIAL_REWARD * COIN) >> halvings

async def get_network_difficulty() -> int:
    blocks_count = await db.blocks.count_documents({})
    if blocks_count == 0:
        return INITIAL_DIFFICULTY
    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if not last_block:
        return INITIAL_DIFFICULTY
    current_difficulty = max(1, last_block.get("difficulty", INITIAL_DIFFICULTY))
    current_index = last_block.get("index", 0)
    adjustment_interval = 10 if blocks_count < 2016 else 2016
    if current_index > 0 and current_index % adjustment_interval == 0:
        last_blocks = await db.blocks.find({}, {"_id": 0, "timestamp": 1, "index": 1}).sort("index", -1).limit(adjustment_interval + 1).to_list(adjustment_interval + 1)
        if len(last_blocks) >= 2:
            last_blocks.sort(key=lambda x: x.get("index", 0))
            try:
                first_time = datetime.fromisoformat(last_blocks[0]["timestamp"].replace("Z", "+00:00"))
                last_time = datetime.fromisoformat(last_blocks[-1]["timestamp"].replace("Z", "+00:00"))
                actual_time = (last_time - first_time).total_seconds()
            except:
                actual_time = TARGET_BLOCK_TIME * len(last_blocks)
            if actual_time <= 0:
                actual_time = 1
            expected_time = TARGET_BLOCK_TIME * (len(last_blocks) - 1)
            ratio = expected_time / actual_time
            ratio = max(0.25, min(4.0, ratio))
            new_difficulty = max(1, int(current_difficulty * ratio))
            logger.info("DIFFICULTY ADJUSTMENT @ block %d: %d -> %d", current_index, current_difficulty, new_difficulty)
            return new_difficulty
    return current_difficulty

def create_coinbase_tx(height, reward, miner_addr, extranonce1, extranonce2_size):
    version = struct.pack('<I',1)
    input_count = var_int(1)
    prev_tx_hash = b''*32
    prev_out_index = struct.pack('<I',0xFFFFFFFF)
    if height<17: height_script = bytes([0x50 + height])
    elif height<128: height_script = bytes([0x01,height])
    elif height<32768: height_script = b'\x02'+struct.pack('<H',height)
    else: height_script = b'\x03'+struct.pack('<I',height)[:3]
    extra_data = b'/BricsCoin Pool/'
    script_prefix = height_script + extra_data
    total_script_len = len(script_prefix) + len(extranonce1)//2 + extranonce2_size
    script_len_bytes = var_int(total_script_len)
    sequence = struct.pack('<I',0xFFFFFFFF)
    output_count = var_int(1)
    output_value = struct.pack('<Q',reward)
    addr_hash = hashlib.sha256(miner_addr.encode()).digest()[:20]
    output_script = b'\x76\xa9\x14'+addr_hash+b'\x88\xac'
    output_script_len = var_int(len(output_script))
    locktime = struct.pack('<I',0)
    coinb1 = version + input_count + prev_tx_hash + prev_out_index + script_len_bytes + script_prefix
    coinb2 = sequence + output_count + output_value + output_script_len + output_script + locktime
    return coinb1.hex(), coinb2.hex()

async def get_block_template():
    last_block = await db.blocks.find_one({},{"_id":0},sort=[("index",-1)])
    if not last_block: return None
    new_index = last_block['index']+1
    reward = get_mining_reward(new_index)
    prev_hash = last_block.get('hash','0'*64).zfill(64)
    pending_txs = await db.transactions.find({"confirmed":False},{"_id":0}).limit(100).to_list(100)
    txs = [{"id":tx["id"],"sender":tx["sender"],"recipient":tx["recipient"],"amount":tx["amount"],"timestamp":tx["timestamp"]} for tx in pending_txs]
    diff = await get_network_difficulty()
    return {"index":new_index,"timestamp":int(time.time()),"previous_hash":prev_hash,"difficulty":diff,"reward":reward,"transactions":txs,"pending_tx_ids":[tx["id"] for tx in pending_txs]}

def create_stratum_job(template, miner_address, extranonce1="00000000", extranonce2_size=4):
    global job_counter, job_cache
    job_counter += 1
    job_id = format(job_counter,'x')
    coinb1, coinb2 = create_coinbase_tx(template['index'], template['reward'], miner_address, extranonce1, extranonce2_size)
    job = {
        "job_id":job_id,"prevhash":swap_endian_words(template['previous_hash']),"coinb1":coinb1,"coinb2":coinb2,
        "merkle_branch":[],"version":"20000000","nbits":difficulty_to_nbits(template['difficulty']),
        "ntime":format(template['timestamp'],'08x'),"clean_jobs":False,"template":template,
        "miner_address":miner_address,"network_difficulty":template["difficulty"],"share_difficulty":1,"created_at":time.time()
    }
    job_cache[job_id] = job
    logger.info(f"Job {job_id}: block #{template['index']}")
    return job

async def verify_share(job, extranonce1, extranonce2, ntime, nonce, network_diff):
    key = f"{job['job_id']}-{extranonce2}-{nonce}"
    if key in recent_shares.get(job['miner_address'], set()):
        return False, False, "duplicate"
    try:
        coinbase_bytes = bytes.fromhex(job['coinb1']+extranonce1+extranonce2+job['coinb2'])
        merkle_root = double_sha256(coinbase_bytes)
        for branch in job.get('merkle_branch',[]):
            merkle_root = double_sha256(merkle_root+bytes.fromhex(branch))
        header = struct.pack('<I',int(job['version'],16)) + bytes.fromhex(swap_endian_words(job['prevhash'])) + merkle_root + struct.pack('<I',int(ntime,16)) + struct.pack('<I',int(job['nbits'],16)) + struct.pack('<I',int(nonce,16))
        block_hash_hex = reverse_bytes(double_sha256(header)).hex()
        h = int(block_hash_hex,16)
        max_target = 0x00000000FFFF0000000000000000000000000000000000000000000000000000
        is_share = h <= max_target//max(1,job.get('share_difficulty',1))
        is_block = h <= max_target//max(1,network_diff)
        recent_shares.setdefault(job['miner_address'],set()).add(key)
        return is_share, is_block, block_hash_hex
    except:
        return False, False, "error"

class StratumMiner:
    def __init__(self,reader,writer,server):
        self.reader, self.writer, self.server = reader, writer, server
        self.peer = writer.get_extra_info('peername')
        self.miner_id = f"{self.peer[0]}:{self.peer[1]}" if self.peer else "unknown"
        self.subscribed, self.authorized, self.worker_name = False, False, None
        global extranonce_counter
        extranonce_counter += 1
        self.extranonce1 = format(extranonce_counter,'08x')
        self.extranonce2_size, self.difficulty, self.shares, self.blocks = 4, 1, 0, 0
        self.personal_jobs, self.sent_jobs = {}, set()

    def send(self,msg):
        try: self.writer.write((json.dumps(msg)+'\n').encode())
        except: pass
    def respond(self,msg_id,result,error=None): self.send({"id":msg_id,"result":result,"error":error})
    def notify(self,method,params): self.send({"id":None,"method":method,"params":params})

    async def handle_message(self,msg):
        method, params, msg_id = msg.get('method',''), msg.get('params',[]), msg.get('id')
        if method=="mining.subscribe": await self.handle_subscribe(msg_id)
        elif method=="mining.authorize": await self.handle_authorize(msg_id,params)
        elif method=="mining.submit": await self.handle_submit(msg_id,params)
        elif method=="mining.suggest_difficulty":
            self.difficulty = max(1,float(params[0]) if params else 1)
            self.respond(msg_id,True)
            self.notify("mining.set_difficulty",[self.difficulty])
        elif method=="mining.configure":
            self.respond(msg_id,{"version-rolling":True,"version-rolling.mask":"1fffe000"} if params else {})
        elif msg_id is not None: self.respond(msg_id,True)

    async def handle_subscribe(self,msg_id):
        self.subscribed=True
        self.respond(msg_id,[[["mining.set_difficulty","d1"],["mining.notify","n1"]],self.extranonce1,self.extranonce2_size])
        self.notify("mining.set_difficulty",[self.difficulty])
        if current_job: await self.send_job(current_job)

    async def handle_authorize(self,msg_id,params):
        self.worker_name = params[0] if params else "worker"
        blocked = await db.blocked_wallets.find_one({"address": self.worker_name})
        if blocked:
            self.respond(msg_id, False, [24, "Wallet blocked", None])
            return
        self.authorized = True
        self.respond(msg_id, True)
        miners[self.miner_id] = {"worker": self.worker_name, "connected_at": datetime.now(timezone.utc).isoformat(), "shares": 0, "blocks": 0}
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.miners.update_one({"miner_id": self.miner_id}, {"$set": {"miner_id": self.miner_id, "worker": self.worker_name, "connected_at": now_iso, "last_seen": now_iso, "online": True, "shares": 0, "blocks": 0}}, upsert=True)
        logger.info(f"Miner authorized: {self.worker_name[:20]}... ({self.miner_id})")

    async def handle_submit(self,msg_id,params):
        if not self.authorized:
            self.respond(msg_id,False,[24,"Unauthorized",None])
            return
        try:
            _,job_id,extranonce2,ntime,nonce = params
            job = self.personal_jobs.get(job_id) or job_cache.get(job_id)
            if not job:
                self.respond(msg_id,True)
                return
            job['miner_address'] = self.worker_name
            net_diff = await get_network_difficulty()
            is_share,is_block,block_hash = await verify_share(job,self.extranonce1,extranonce2,ntime,nonce,net_diff)
            self.respond(msg_id,True)
            self.shares += 1
            if self.miner_id in miners: miners[self.miner_id]['shares'] += 1
            now_iso = datetime.now(timezone.utc).isoformat()
            await db.miner_shares.insert_one({"miner_id": self.miner_id, "worker": self.worker_name, "timestamp": now_iso, "share_difficulty": self.difficulty, "job_id": job_id, "is_block": is_block})
            await db.miners.update_one({"miner_id": self.miner_id}, {"$set": {"last_seen": now_iso, "online": True}, "$inc": {"shares": 1}}, upsert=True)
            logger.info(f"Share from {self.worker_name[:20]}... (is_block={is_block})")
            if is_block:
                await self.save_block(job, nonce, block_hash)
        except:
            self.respond(msg_id, True)

    async def save_block(self,job,nonce,block_hash):
        template = job['template']
        miner_address = self.worker_name
        reward_amount = template['reward']/COIN
        reward_tx = {"id":str(uuid.uuid4()),"sender":"COINBASE","recipient":miner_address,"amount":reward_amount,"timestamp":datetime.now(timezone.utc).isoformat(),"signature":"COINBASE_REWARD","type":"mining_reward","confirmed":True,"block_index":template['index']}
        block_txs = template.get('transactions',[]).copy()
        block_txs.insert(0,{"id":reward_tx["id"],"sender":"COINBASE","recipient":miner_address,"amount":reward_amount,"type":"mining_reward"})
        block = {"index":template['index'],"timestamp":datetime.now(timezone.utc).isoformat(),"transactions":block_txs,"proof":int(nonce,16),"previous_hash":template['previous_hash'],"hash":block_hash,"miner":miner_address,"difficulty":template['difficulty'],"nonce":int(nonce,16)}
        if await db.blocks.find_one({"index":template['index']}): return
        await db.blocks.insert_one(block)
        await db.transactions.insert_one(reward_tx)
        if template.get('pending_tx_ids'):
            await db.transactions.update_many({"id":{"$in":template['pending_tx_ids']}},{"$set":{"confirmed":True,"block_index":template['index']}})
        self.blocks += 1
        if self.miner_id in miners: miners[self.miner_id]['blocks'] += 1
        await db.miners.update_one({"miner_id": self.miner_id}, {"$inc": {"blocks": 1}}, upsert=True)
        logger.info(f"Block #{template['index']} mined by {miner_address[:20]}...")
        await self.server.on_new_block()

    async def send_job(self,job):
        if not self.subscribed: return
        self.sent_jobs.add(job['job_id'])
        self.notify("mining.notify",[job['job_id'],job['prevhash'],job['coinb1'],job['coinb2'],job['merkle_branch'],job['version'],job['nbits'],job['ntime'],job['clean_jobs']])

class StratumServer:
    def __init__(self):
        self.miners, self.server, self.running = [], None, False

    async def start(self):
        self.running = True
        self.server = await asyncio.start_server(self.handle_connection,STRATUM_HOST,STRATUM_PORT)
        asyncio.create_task(self.job_updater())
        logger.info(f"Stratum Server listening on {STRATUM_HOST}:{STRATUM_PORT}")
        async with self.server: await self.server.serve_forever()

    async def handle_connection(self,reader,writer):
        miner = StratumMiner(reader,writer,self)
        self.miners.append(miner)
        logger.info(f"New connection: {miner.miner_id}")
        try:
            buffer = b""
            while True:
                data = await reader.read(4096)
                if not data: break
                buffer += data
                while b'\n' in buffer:
                    line, buffer = buffer.split(b'\n',1)
                    if line:
                        try: await miner.handle_message(json.loads(line.decode()))
                        except: pass
        except: pass
        finally:
            if miner in self.miners: self.miners.remove(miner)
            miners.pop(miner.miner_id, None)
            try:
                await db.miners.update_one({"miner_id": miner.miner_id}, {"$set": {"online": False, "last_seen": datetime.now(timezone.utc).isoformat()}})
            except: pass
            try:
                writer.close()
                await writer.wait_closed()
            except: pass
            logger.info(f"Connection closed: {miner.miner_id}")

    async def job_updater(self):
        global current_job
        while self.running:
            template = await get_block_template()
            if template:
                current_job = create_stratum_job(template,"BRICS00000000000000000000000000000000")
                for miner in self.miners: await miner.send_job(current_job)
            await asyncio.sleep(10)

    async def on_new_block(self):
        global current_job
        template = await get_block_template()
        if template:
            current_job = create_stratum_job(template,"BRICS00000000000000000000000000000000")
            for miner in self.miners: await miner.send_job(current_job)

if __name__=="__main__":
    asyncio.run(StratumServer().start())