import asyncio, json, hashlib, struct, time, os, logging, uuid
from datetime import datetime, timezone
from collections import deque
from typing import Dict
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# ================== ENV ==================
ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

logging.basicConfig(level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("stratum")

mongo = AsyncIOMotorClient(os.getenv("MONGO_URL","mongodb://localhost:27017"))
db = mongo[os.getenv("DB_NAME","bricscoin")]

HOST = os.getenv("STRATUM_HOST","0.0.0.0")
PORT = int(os.getenv("STRATUM_PORT",3333))

# ================== CONSTANTS ==================
INITIAL_DIFFICULTY = 1
HALVING_INTERVAL = 210_000
INITIAL_REWARD = 50
COIN = 100_000_000
TARGET_BLOCK_TIME = 600
MAX_TARGET = 0x00000000FFFF0000000000000000000000000000000000000000000000000000
PPLNS_N = 1000

# ================== GLOBALS ==================
miners: Dict[str,dict] = {}
job_cache = {}
job_counter = 0
extranonce_counter = 0

# ================== HASH ==================
def dsha(b): return hashlib.sha256(hashlib.sha256(b).digest()).digest()
def rev(b): return b[::-1]

def swap_words(h):
    out=""
    for i in range(0,len(h),8):
        w=h[i:i+8]
        out+="".join(w[j:j+2] for j in (6,4,2,0))
    return out

def varint(n):
    if n<0xfd: return bytes([n])
    if n<=0xffff: return b'\xfd'+n.to_bytes(2,'little')
    if n<=0xffffffff: return b'\xfe'+n.to_bytes(4,'little')
    return b'\xff'+n.to_bytes(8,'little')

# ================== DIFFICULTY ==================
async def net_diff():
    b=await db.blocks.find_one({},sort=[("index",-1)])
    if not b: return 1
    diff=max(1,int(b.get("difficulty",1)))
    try:
        t=datetime.fromisoformat(b["timestamp"])
        elapsed=(datetime.now(timezone.utc)-t).total_seconds()
        if elapsed>TARGET_BLOCK_TIME:
            diff=max(1,int(diff*(0.5**(elapsed/TARGET_BLOCK_TIME-1))))
    except: pass
    return diff

def diff_to_nbits(d):
    d=max(1,d)
    t=MAX_TARGET//d
    h=f"{t:064x}".lstrip("0")
    e=(len(h)+1)//2
    c=int(h[:6].ljust(6,"0"),16)
    return f"{(e<<24)|c:08x}"

# ================== COINBASE ==================
def reward(height):
    h=height//HALVING_INTERVAL
    return 0 if h>=64 else (INITIAL_REWARD*COIN)>>h

def coinbase(height,rew,addr,en1,en2sz):
    v=struct.pack("<I",1)
    vin=varint(1)
    prev=b"\x00"*32
    idx=struct.pack("<I",0xffffffff)
    hs=b"\x01"+bytes([height%256])
    tag=b"/BricsCoin/"
    scr=hs+tag
    sl=varint(len(scr)+len(en1)//2+en2sz)
    seq=struct.pack("<I",0xffffffff)
    vout=varint(1)
    val=struct.pack("<Q",rew)
    pk=hashlib.sha256(addr.encode()).digest()[:20]
    sp=b"\x76\xa9\x14"+pk+b"\x88\xac"
    spl=varint(len(sp))
    lock=struct.pack("<I",0)
    return (v+vin+prev+idx+sl+scr).hex(), (seq+vout+val+spl+sp+lock).hex()

# ================== TEMPLATE ==================
async def template():
    last=await db.blocks.find_one({},sort=[("index",-1)])
    if not last: return None
    h=last["index"]+1
    return {
        "index":h,
        "previous_hash":last["hash"],
        "difficulty":await net_diff(),
        "reward":reward(h),
        "timestamp":int(time.time())
    }

# ================== SHARE VERIFY ==================
async def verify(job,en1,en2,ntime,nonce,ndiff):
    cb=bytes.fromhex(job["coinb1"]+en1+en2+job["coinb2"])
    mr=dsha(cb)
    hdr=(
        struct.pack("<I",int(job["version"],16))+
        bytes.fromhex(swap_words(job["prevhash"]))+
        mr+
        struct.pack("<I",int(ntime,16))+
        struct.pack("<I",int(job["nbits"],16))+
        struct.pack("<I",int(nonce,16))
    )
    h=rev(dsha(hdr))
    hi=int.from_bytes(h,"big")
    return (
        hi <= MAX_TARGET//job["share_difficulty"],
        hi <= MAX_TARGET//ndiff,
        h.hex()
    )

# ================== STRATUM MINER ==================
class Miner:
    def __init__(self,r,w,s):
        global extranonce_counter
        extranonce_counter+=1
        self.r=r; self.w=w; self.s=s
        self.id=str(w.get_extra_info("peername"))
        self.en1=f"{extranonce_counter:08x}"
        self.en2sz=4
        self.diff=1
        self.worker=None
        self.jobs={}
        self.last=None
        self.intervals=deque(maxlen=20)
        self.adjust_ctr=0

    def send(self,o):
        self.w.write((json.dumps(o)+"\n").encode())

    async def handle(self,m):
        meth=m.get("method"); p=m.get("params",[]); i=m.get("id")
        if meth=="mining.subscribe":
            self.send({"id":i,"result":[[["mining.notify","1"]],self.en1,self.en2sz],"error":None})
            self.send({"id":None,"method":"mining.set_difficulty","params":[self.diff]})
        elif meth=="mining.authorize":
            self.worker=p[0]; miners[self.id]={"worker":self.worker}
            self.send({"id":i,"result":True,"error":None})
        elif meth=="mining.submit":
            job=self.jobs.get(p[1])
            if not job:
                self.send({"id":i,"result":False,"error":[21,"Job not found",None]}); return

            key=(p[1],p[2],p[3],p[4])
            if key in job["seen"]:
                self.send({"id":i,"result":False,"error":[22,"Duplicate share",None]}); return
            job["seen"].add(key)

            is_share,is_block,h=await verify(
                job,self.en1,p[2],p[3],p[4],await net_diff()
            )
            if not is_share:
                self.send({"id":i,"result":False,"error":[23,"Low difficulty share",None]}); return

            self.send({"id":i,"result":True,"error":None})

            now=time.time()
            if self.last:
                self.intervals.append(now-self.last)
            self.last=now
            self.adjust_ctr+=1

            await db.miner_shares.insert_one({
                "worker":self.worker,
                "timestamp":datetime.now(timezone.utc),
                "difficulty":self.diff
            })

            if self.adjust_ctr>=15 and len(self.intervals)>=5:
                avg=sum(self.intervals)/len(self.intervals)
                if avg<8: self.diff=min(self.diff*2,1_000_000)
                elif avg>30: self.diff=max(self.diff//2,1)
                self.send({"id":None,"method":"mining.set_difficulty","params":[self.diff]})
                self.adjust_ctr=0

            if is_block:
                await self.s.save_block(job,h)

    async def send_job(self,job):
        self.jobs[job["job_id"]]=job
        self.send({"id":None,"method":"mining.notify","params":[
            job["job_id"],job["prevhash"],job["coinb1"],job["coinb2"],
            [],job["version"],job["nbits"],job["ntime"],False
        ]})

# ================== SERVER ==================
class Server:
    async def start(self):
        self.miners=[]
        srv=await asyncio.start_server(self.conn,HOST,PORT)
        asyncio.create_task(self.jobs())
        log.info(f"Stratum on {HOST}:{PORT}")
        async with srv: await srv.serve_forever()

    async def conn(self,r,w):
        m=Miner(r,w,self); self.miners.append(m)
        while True:
            l=await r.readline()
            if not l: break
            await m.handle(json.loads(l))

    async def jobs(self):
        while True:
            t=await template()
            if t:
                for m in self.miners:
                    global job_counter
                    job_counter+=1
                    c1,c2=coinbase(t["index"],t["reward"],m.worker,m.en1,m.en2sz)
                    j={
                        "job_id":f"{job_counter:x}",
                        "prevhash":swap_words(t["previous_hash"]),
                        "coinb1":c1,"coinb2":c2,
                        "version":"20000000",
                        "nbits":diff_to_nbits(t["difficulty"]),
                        "ntime":f"{t['timestamp']:08x}",
                        "share_difficulty":m.diff,
                        "template":t,
                        "seen":set()
                    }
                    await m.send_job(j)
            await asyncio.sleep(30)

    async def save_block(self,job,h):
        t=job["template"]
        await db.blocks.insert_one({
            "index":t["index"],
            "timestamp":datetime.now(timezone.utc).isoformat(),
            "hash":h,
            "previous_hash":t["previous_hash"],
            "difficulty":t["difficulty"],
            "miner":job
        })

        shares=await db.miner_shares.find().sort(
            "timestamp",-1).limit(PPLNS_N).to_list(PPLNS_N)
        tot=sum(s["difficulty"] for s in shares)
        for s in shares:
            rew=(t["reward"]/COIN)*(s["difficulty"]/tot)
            await db.balances.update_one(
                {"worker":s["worker"]},
                {"$inc":{"balance":rew}},upsert=True)

        log.info(f"✅ BLOCCO #{t['index']} {h}")

# ================== MAIN ==================
async def main():
    await Server().start()

if __name__=="__main__":
    asyncio.run(main())
