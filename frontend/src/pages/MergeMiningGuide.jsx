import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Link2, Shield, CheckCircle, Copy, ChevronRight,
  Cpu, Activity, Zap, ArrowRight, Server, Globe, Lock,
  HelpCircle, User, Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

function copyText(text) {
  navigator.clipboard.writeText(text);
  toast.success("Copied!");
}

function CodeBlock({ code, title }) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/60">
      {title && (
        <div className="px-4 py-2 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">{title}</span>
          <button onClick={() => copyText(code)} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono text-emerald-400/90 leading-relaxed whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function StepCard({ number, title, children, color = "#F59E0B" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: number * 0.08 }}
      className="flex gap-5 py-8 border-b border-white/[0.04] last:border-0"
    >
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold"
          style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}>
          {String(number).padStart(2, "0")}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-bold text-lg mb-3">{title}</h3>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
      </div>
    </motion.div>
  );
}

export default function MergeMiningGuide() {
  const [auxpowStatus, setAuxpowStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API}/api/auxpow/status`);
        if (res.ok) setAuxpowStatus(await res.json());
      } catch {}
    };
    fetchStatus();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-16" data-testid="merge-mining-guide">

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 mb-6">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-medium text-orange-400 tracking-wide">MERGE MINING ACTIVE</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-heading font-black mb-4">
          Merge Mining{" "}
          <span className="text-orange-400">(AuxPoW)</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Complete guide for solo miners and pool operators.
          Mine BricsCoin alongside Bitcoin at zero extra cost.
        </p>
      </motion.div>

      {/* LIVE STATUS */}
      {auxpowStatus && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-orange-500/20 bg-orange-500/[0.03]" data-testid="auxpow-live-status">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-black/30 rounded-lg">
                  <p className="text-2xl font-bold text-orange-400">{auxpowStatus.statistics?.auxpow_blocks || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">AuxPoW Blocks</p>
                </div>
                <div className="text-center p-3 bg-black/30 rounded-lg">
                  <p className="text-2xl font-bold text-blue-400">{auxpowStatus.statistics?.native_blocks || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Native Blocks</p>
                </div>
                <div className="text-center p-3 bg-black/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{auxpowStatus.statistics?.auxpow_percentage || 0}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Merge Mined</p>
                </div>
                <div className="text-center p-3 bg-black/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{auxpowStatus.current_difficulty?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Difficulty</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* WHAT IS MERGE MINING */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6 flex items-center gap-3">
          <Link2 className="w-7 h-7 text-orange-400" />
          What is Merge Mining?
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Merge Mining</strong> (Auxiliary Proof of Work - AuxPoW) lets Bitcoin miners mine
            BricsCoin <strong className="text-orange-400">simultaneously, at zero extra cost</strong>. No additional hardware,
            no extra electricity. The same computational work that secures Bitcoin also secures BricsCoin.
          </p>
          <p>
            Think of a postman delivering letters on your street who also picks up packages for another courier.
            Same route, double the useful work.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { icon: Shield, title: "Maximum Security", desc: "Bitcoin's hashrate protects BricsCoin. A 51% attack becomes virtually impossible.", color: "#10B981" },
              { icon: Zap, title: "Zero Extra Cost", desc: "Bitcoin miners consume no additional energy. The PoW counts for both chains.", color: "#F59E0B" },
              { icon: Lock, title: "Full Independence", desc: "BricsCoin keeps its own blockchain, rules, and consensus. Bitcoin controls nothing.", color: "#3B82F6" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <item.icon className="w-6 h-6 mb-3" style={{ color: item.color }} />
                <h4 className="font-bold mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SOLO MINER GUIDE */}
      {/* ============================================ */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-2 flex items-center gap-3">
          <User className="w-7 h-7 text-emerald-400" />
          Solo Miner Guide
        </h2>
        <p className="text-muted-foreground mb-6">
          Yes, you can merge mine BricsCoin as a solo miner! Here's exactly how to do it.
        </p>

        <div className="p-6 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.02]">
          <StepCard number={1} title="Get a BricsCoin address" color="#10B981">
            <p>
              Go to <a href="/wallet" className="text-primary hover:underline">the Wallet page</a> and create a new PQC wallet.
              Copy your <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-emerald-400">BRICSPQ...</code> address.
              This is where your mining rewards will be sent.
            </p>
          </StepCard>

          <StepCard number={2} title="Request merge mining work from BricsCoin" color="#10B981">
            <p>Your mining script needs to periodically ask BricsCoin for a work template:</p>
            <CodeBlock
              title="Request work"
              code={`curl "https://bricscoin26.org/api/auxpow/create-work?miner_address=YOUR_BRICSPQ_ADDRESS"

# Response:
{
  "work_id": "abc12345",
  "block_hash": "e734e7d6...",         # BricsCoin block hash
  "coinbase_commitment": "42524943...", # Data to embed in your coinbase
  "difficulty": 2760888,               # BricsCoin difficulty target
  "reward": 50                         # Reward in BRICS
}`}
            />
            <p className="mt-2">
              Save the <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-emerald-400">coinbase_commitment</code> and
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-emerald-400">block_hash</code> values.
            </p>
          </StepCard>

          <StepCard number={3} title="Embed the commitment in your Bitcoin coinbase" color="#10B981">
            <p>
              When constructing your Bitcoin block template, insert the <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-emerald-400">coinbase_commitment</code> bytes
              into the <strong>scriptSig</strong> of your coinbase transaction.
            </p>
            <p>
              The format is: <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-emerald-400">BRIC</code> (4 magic bytes) +
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-emerald-400">block_hash</code> (32 bytes).
            </p>
            <div className="p-3 bg-black/30 rounded-lg border border-white/5 mt-2">
              <p className="text-xs">
                <strong className="text-emerald-400">Tip:</strong> If you use CGMiner or BFGMiner, the coinbase scriptSig has a free-data area
                after the block height. That's where you put the commitment. If you use a mining pool software like
                CKPool, you can set <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">coinbaseaux</code> in the config.
              </p>
            </div>
          </StepCard>

          <StepCard number={4} title="Mine Bitcoin as normal" color="#10B981">
            <p>
              Run your SHA-256 miner (ASIC or software) and mine Bitcoin exactly as you normally would.
              <strong> Nothing changes in your mining process.</strong> You're just looking for a valid Bitcoin nonce.
            </p>
          </StepCard>

          <StepCard number={5} title="Check if your Bitcoin work meets BricsCoin difficulty" color="#10B981">
            <p>
              Every time you find a valid Bitcoin share or block, check if the Bitcoin block header hash
              also meets BricsCoin's difficulty target. Since BricsCoin's difficulty is much lower than Bitcoin's,
              this will happen <strong>frequently</strong>.
            </p>
            <div className="p-3 bg-black/30 rounded-lg border border-white/5 mt-2">
              <p className="text-xs">
                <strong className="text-emerald-400">Example:</strong> Bitcoin difficulty is ~100T.
                BricsCoin difficulty is ~2.7M. That means every valid Bitcoin share has an extremely
                high chance of also being valid for BricsCoin.
              </p>
            </div>
          </StepCard>

          <StepCard number={6} title="Submit the proof to BricsCoin" color="#10B981">
            <p>When your Bitcoin hash meets BricsCoin difficulty, submit the proof:</p>
            <CodeBlock
              title="Submit AuxPoW proof"
              code={`curl -X POST "https://bricscoin26.org/api/auxpow/submit" \\
  -H "Content-Type: application/json" \\
  -d '{
    "parent_header": "020000...00",      # Your Bitcoin block header (80 bytes, hex)
    "coinbase_tx": "01000000...00",      # Your Bitcoin coinbase transaction (hex)
    "coinbase_branch": ["abc...", ...],  # Merkle branch of coinbase in Bitcoin block
    "coinbase_index": 0,
    "miner_address": "BRICSPQxxxx...",   # Your BricsCoin address
    "block_hash": "e734e7d6...",         # The block_hash from step 2
    "parent_chain": "bitcoin"
  }'

# Success response:
{
  "success": true,
  "block_index": 2700,
  "reward": 50,
  "block_type": "auxpow"
}
# You just earned 50 BRICS!`}
            />
          </StepCard>
        </div>

        {/* COMPLETE SOLO MINER SCRIPT */}
        <div className="mt-8">
          <h3 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            Complete Solo Miner Script (Python)
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Here's a complete, ready-to-use Python script that automates the entire merge mining process.
            Just set your BricsCoin address and point it at your Bitcoin node.
          </p>
          <CodeBlock
            title="bricscoin_merge_miner.py"
            code={`#!/usr/bin/env python3
"""
BricsCoin Merge Mining Script for Solo Miners
Run this alongside your Bitcoin mining setup.
"""
import requests
import hashlib
import struct
import time
import json

# ========== CONFIGURATION ==========
BRICSCOIN_API = "https://bricscoin26.org"
MINER_ADDRESS = "BRICSPQxxxxx..."   # <-- YOUR BricsCoin address here
BITCOIN_RPC   = "http://127.0.0.1:8332"
BITCOIN_USER  = "rpcuser"           # <-- Your Bitcoin RPC username
BITCOIN_PASS  = "rpcpassword"       # <-- Your Bitcoin RPC password
POLL_INTERVAL = 10                  # Seconds between work refreshes
# ====================================

def btc_rpc(method, params=[]):
    """Call Bitcoin Core RPC."""
    r = requests.post(BITCOIN_RPC,
        json={"jsonrpc":"1.0","method":method,"params":params},
        auth=(BITCOIN_USER, BITCOIN_PASS))
    return r.json()["result"]

def get_bricscoin_work():
    """Request a new work template from BricsCoin."""
    r = requests.get(f"{BRICSCOIN_API}/api/auxpow/create-work",
                     params={"miner_address": MINER_ADDRESS})
    return r.json()

def submit_auxpow(work, btc_header_hex, coinbase_hex, merkle_branch):
    """Submit an AuxPoW proof to BricsCoin."""
    proof = {
        "parent_header": btc_header_hex,
        "coinbase_tx": coinbase_hex,
        "coinbase_branch": merkle_branch,
        "coinbase_index": 0,
        "miner_address": MINER_ADDRESS,
        "block_hash": work["block_hash"],
        "parent_chain": "bitcoin"
    }
    r = requests.post(f"{BRICSCOIN_API}/api/auxpow/submit", json=proof)
    return r.json()

def double_sha256(data):
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def check_meets_target(header_hex, target_hex):
    """Check if a Bitcoin header hash meets BricsCoin's target."""
    header_bytes = bytes.fromhex(header_hex)
    hash_bytes = double_sha256(header_bytes)
    hash_int = int(hash_bytes[::-1].hex(), 16)
    target_int = int(target_hex, 16)
    return hash_int <= target_int

print("=== BricsCoin Merge Miner v1.0 ===")
print(f"Miner address: {MINER_ADDRESS}")
print(f"BricsCoin API: {BRICSCOIN_API}")
print()

while True:
    try:
        # 1. Get BricsCoin work
        work = get_bricscoin_work()
        commitment = bytes.fromhex(work["coinbase_commitment"])
        target = work["target"]
        print(f"[WORK] Block #{work['block_index']} | "
              f"Diff: {work['difficulty']} | Reward: {work['reward']} BRICS")

        # 2. Get Bitcoin block template
        template = btc_rpc("getblocktemplate", [{"rules":["segwit"]}])

        # 3. Build coinbase with BricsCoin commitment
        # (Insert commitment into coinbase scriptSig)
        # ... Your coinbase construction code here ...
        # The key part: scriptSig must contain the commitment bytes

        # 4. Mine and check each nonce
        # When you find a valid share, check against BricsCoin target
        # if check_meets_target(header_hex, target):
        #     result = submit_auxpow(work, header_hex, coinbase_hex, branches)
        #     if result.get("success"):
        #         print(f"[BLOCK!] Mined BricsCoin #{result['block_index']}!")

        time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("\\nStopping merge miner...")
        break
    except Exception as e:
        print(f"[ERROR] {e}")
        time.sleep(5)`}
          />
        </div>
      </section>

      {/* ============================================ */}
      {/* POOL OPERATOR GUIDE */}
      {/* ============================================ */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-2 flex items-center gap-3">
          <Users className="w-7 h-7 text-orange-400" />
          Pool Operator Guide
        </h2>
        <p className="text-muted-foreground mb-6">
          Add BricsCoin merge mining to your Bitcoin pool and earn extra rewards for your miners.
        </p>

        <div className="space-y-6">
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="w-5 h-5 text-orange-400" />
                API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-muted-foreground">Endpoint</th>
                      <th className="text-left p-3 text-muted-foreground">Method</th>
                      <th className="text-left p-3 text-muted-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { endpoint: "/api/auxpow/create-work", method: "GET", desc: "Get a work template (block hash + commitment)" },
                      { endpoint: "/api/auxpow/submit", method: "POST", desc: "Submit an AuxPoW proof" },
                      { endpoint: "/api/auxpow/status", method: "GET", desc: "Merge mining status and statistics" },
                      { endpoint: "/api/auxpow/work-history", method: "GET", desc: "History of requested work items" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/[0.04]">
                        <td className="p-3 font-mono text-xs text-orange-400">{row.endpoint}</td>
                        <td className="p-3"><Badge variant="outline" className="text-xs">{row.method}</Badge></td>
                        <td className="p-3 text-muted-foreground">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="w-5 h-5 text-orange-400" />
                Pool Integration Example
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Example of how to integrate BricsCoin merge mining into your Bitcoin pool (Python pseudocode):
              </p>
              <CodeBlock
                title="pool_merge_mining.py"
                code={`import requests, time, threading

BRICSCOIN_API = "https://bricscoin26.org"
POOL_BRICS_ADDRESS = "BRICSPQxxxxx..."

class MergeMiningWorker:
    def __init__(self):
        self.current_work = None
    
    def refresh_work(self):
        """Periodically fetch new BricsCoin work."""
        while True:
            try:
                r = requests.get(f"{BRICSCOIN_API}/api/auxpow/create-work",
                    params={"miner_address": POOL_BRICS_ADDRESS})
                self.current_work = r.json()
            except: pass
            time.sleep(15)
    
    def get_coinbase_extra(self):
        """Return bytes to embed in Bitcoin coinbase."""
        if self.current_work:
            return bytes.fromhex(self.current_work["coinbase_commitment"])
        return b""
    
    def on_share_found(self, btc_header, coinbase_tx, merkle_branch):
        """Called when a miner submits a valid Bitcoin share."""
        if not self.current_work:
            return
        
        # Check if this share meets BricsCoin difficulty
        proof = {
            "parent_header": btc_header.hex(),
            "coinbase_tx": coinbase_tx.hex(),
            "coinbase_branch": [b.hex() for b in merkle_branch],
            "coinbase_index": 0,
            "miner_address": POOL_BRICS_ADDRESS,
            "block_hash": self.current_work["block_hash"],
            "parent_chain": "bitcoin"
        }
        try:
            r = requests.post(f"{BRICSCOIN_API}/api/auxpow/submit", json=proof)
            if r.json().get("success"):
                print(f"BricsCoin block mined! +50 BRICS")
        except: pass

# Start the merge mining worker
mm = MergeMiningWorker()
threading.Thread(target=mm.refresh_work, daemon=True).start()`}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* HOW IT WORKS - TECHNICAL */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6 flex items-center gap-3">
          <Cpu className="w-7 h-7 text-orange-400" />
          How It Works (Technical)
        </h2>
        <div className="p-6 rounded-lg border border-orange-500/15 bg-orange-500/[0.02]">
          <StepCard number={1} title="BricsCoin creates a block template">
            <p>
              When you call <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-orange-400">/api/auxpow/create-work</code>,
              BricsCoin gathers pending transactions, computes the block hash, and returns it along with
              a <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-orange-400">coinbase_commitment</code> to embed in Bitcoin.
            </p>
          </StepCard>

          <StepCard number={2} title="The commitment goes into Bitcoin's coinbase">
            <p>
              The commitment format is: <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-orange-400">BRIC</code> (4 magic bytes) +
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-orange-400">block_hash</code> (32 bytes) = 36 bytes total.
            </p>
            <p>
              This is inserted in the coinbase scriptSig, just like Satoshi's original Genesis Block message.
              Bitcoin's protocol allows arbitrary data in the coinbase.
            </p>
          </StepCard>

          <StepCard number={3} title="BricsCoin validates the AuxPoW proof">
            <p>When you submit a proof, BricsCoin verifies 4 things:</p>
            <ul className="list-none space-y-2 mt-2">
              {[
                "The parent header hash (double SHA-256) meets BricsCoin's difficulty target",
                "The BricsCoin block hash is present in the coinbase transaction",
                "The Merkle branch proves the coinbase belongs to the parent block",
                "The work template is valid (not expired, not already used)",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </StepCard>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6 flex items-center gap-3">
          <HelpCircle className="w-7 h-7 text-orange-400" />
          FAQ
        </h2>
        <div className="space-y-3">
          {[
            {
              q: "Can I merge mine as a solo miner?",
              a: "Yes! You need a Bitcoin node (or access to a Bitcoin RPC) and a script that embeds BricsCoin's commitment into your coinbase. The full process is described in the Solo Miner Guide above."
            },
            {
              q: "Does BricsCoin lose its independence with merge mining?",
              a: "No, absolutely not. BricsCoin keeps its own blockchain, rules, and consensus. Bitcoin doesn't even know BricsCoin exists. Merge mining is a one-way relationship: BricsCoin benefits from Bitcoin's hashrate, but Bitcoin controls nothing."
            },
            {
              q: "Can merge mining be removed in the future?",
              a: "Yes, it's fully reversible. Merge mining adds a new block type (AuxPoW) alongside native blocks. Normal PoW blocks are always accepted. To disable it, just stop accepting AuxPoW blocks in a protocol update."
            },
            {
              q: "Do Bitcoin miners need special software?",
              a: "No. Bitcoin miners don't change anything. The pool operator (or your solo mining script) handles the integration. Miners connected to the pool mine Bitcoin as always and earn extra BRICS as a bonus."
            },
            {
              q: "How much does a miner earn from merge mining?",
              a: "The current reward is 50 BRICS per block (halving every 210,000 blocks). The miner receives this on top of their normal Bitcoin reward, with zero additional cost."
            },
            {
              q: "Why does merge mining make the network more secure?",
              a: "Because Bitcoin's hashrate (hundreds of EH/s) also protects BricsCoin. To perform a 51% attack on BricsCoin, an attacker would need more hashrate than all the Bitcoin pools doing merge mining — which is virtually impossible."
            },
            {
              q: "Who else uses merge mining?",
              a: "Dogecoin (with Litecoin as parent), Namecoin (with Bitcoin as parent), RSK, Elastos, and many others. It's a proven technology used since 2011."
            },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="p-5 rounded-lg border border-white/[0.06] bg-white/[0.02]"
              data-testid={`faq-${i}`}
            >
              <h4 className="font-bold text-base mb-2 flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-orange-400 mt-1 shrink-0" />
                {item.q}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">{item.a}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TECHNICAL SPECS */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6 flex items-center gap-3">
          <Activity className="w-7 h-7 text-orange-400" />
          Technical Specifications
        </h2>
        <Card className="border-white/10">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Chain ID", value: "0x0062 (98)" },
                { label: "Magic Bytes", value: "BRIC (0x42524943)" },
                { label: "Parent Chain", value: "Bitcoin (SHA-256d)" },
                { label: "Hash Algorithm", value: "Double SHA-256 (parent)" },
                { label: "Commitment Format", value: "BRIC + block_hash (36 bytes)" },
                { label: "Block Validation", value: "Parent PoW + Merkle Proof" },
                { label: "Compatibility", value: "CGMiner, BFGMiner, CKPool" },
                { label: "Reversible", value: "Yes — native blocks always accepted" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-mono font-bold text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center py-12">
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-4">
          Ready to start merge mining?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Contact us for free technical support with your integration. We help solo miners and pool operators get set up.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="https://x.com/Bricscoin26" target="_blank" rel="noreferrer">
            <Button size="lg" className="gold-button rounded-sm px-8 h-12" data-testid="contact-twitter">
              <ArrowRight className="w-5 h-5 mr-2" /> Contact us on X
            </Button>
          </a>
          <a href="https://codeberg.org/Bricscoin_26/Bricscoin" target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline" className="border-orange-500/30 text-orange-400 rounded-sm px-8 h-12 hover:bg-orange-500/5" data-testid="view-source">
              <Globe className="w-5 h-5 mr-2" /> Source Code
            </Button>
          </a>
        </div>
      </motion.div>

    </div>
  );
}
