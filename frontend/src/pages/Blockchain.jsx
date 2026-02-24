import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Blocks, ArrowRightLeft, ChevronLeft, ChevronRight, Search,
  Coins, TrendingUp, Activity, Clock, Shield, Server, Pickaxe,
  Network as NetworkIcon, RefreshCw, Globe, Copy, Users, Trophy,
  AlertCircle, Cpu, CheckCircle, Eye, ExternalLink, Check, MonitorCog
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "../components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  getNetworkStats, getBlocks, getTransactions, getNodeInfo,
  getPeers, registerPeer, triggerSync
} from "../lib/api";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import RunNode from "./RunNode";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function truncateHash(hash, length = 12) {
  if (!hash) return "";
  return hash.length <= length * 2 ? hash : `${hash.slice(0, length)}...${hash.slice(-6)}`;
}

const formatHashrate = (value) => {
  if (!value || typeof value !== "number") return "-";
  const abs = Math.abs(value);
  if (abs >= 1e15) return (value / 1e15).toFixed(2) + " PH/s";
  if (abs >= 1e12) return (value / 1e12).toFixed(2) + " TH/s";
  if (abs >= 1e9) return (value / 1e9).toFixed(2) + " GH/s";
  if (abs >= 1e6) return (value / 1e6).toFixed(2) + " MH/s";
  if (abs >= 1e3) return (value / 1e3).toFixed(2) + " kH/s";
  return value.toFixed(0) + " H/s";
};

/* ========== NETWORK OVERVIEW SECTION ========== */
function NetworkOverview({ stats, blocks, nodeInfo, peers, onRefresh, refreshing }) {
  const supplyPercentage = stats ? (stats.circulating_supply / stats.total_supply) * 100 : 0;
  const chartData = blocks?.slice().reverse().map(b => ({
    block: b.index, difficulty: b.difficulty, txs: b.transactions?.length || 0
  })) || [];

  const [connectOpen, setConnectOpen] = useState(false);
  const [peerUrl, setPeerUrl] = useState("");

  const handleConnectPeer = async () => {
    if (!peerUrl) return;
    try {
      await registerPeer({ node_id: `web-${Date.now()}`, url: peerUrl, version: "1.0.0" });
      toast.success("Connected to peer!");
      setConnectOpen(false);
      setPeerUrl("");
      onRefresh();
    } catch { toast.error("Failed to connect to peer"); }
  };

  if (!stats) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 bg-card" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Blocks, title: "Block Height", value: stats.total_blocks?.toLocaleString(), sub: "Total blocks mined" },
          { icon: TrendingUp, title: "Circulating Supply", value: `${stats.circulating_supply?.toLocaleString()}`, sub: `${supplyPercentage.toFixed(4)}% mined` },
          { icon: Shield, title: "Difficulty", value: stats.current_difficulty?.toLocaleString(), sub: "Current difficulty" },
          { icon: Activity, title: "Hashrate", value: stats.hashrate_from_shares > 0 ? formatHashrate(stats.hashrate_from_shares) : formatHashrate(stats.hashrate_estimate), sub: stats.hashrate_from_shares > 0 ? "Real (from shares)" : "Estimated" },
          { icon: Clock, title: "Block Reward", value: `${stats.current_reward} BRICS`, sub: `Next halving: #${stats.next_halving_block?.toLocaleString()}` },
          { icon: Activity, title: "Pending TXs", value: stats.pending_transactions || 0, sub: "In mempool" },
          { icon: Server, title: "Algorithm", value: "SHA-256", sub: "Proof of Work" },
          { icon: NetworkIcon, title: "Block Time", value: "10 min", sub: "Target" },
        ].map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="bg-card border-white/10 card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{s.title}</p>
                    <p className="text-lg font-heading font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                  </div>
                  <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Supply Progress */}
      <Card className="bg-card border-white/10">
        <CardContent className="p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Supply Mined</span>
            <span className="font-mono">{stats.circulating_supply?.toLocaleString()} / 21,000,000 BRICS</span>
          </div>
          <Progress value={supplyPercentage} className="h-2" />
          <div className="grid grid-cols-4 gap-4 mt-4 text-center text-xs">
            <div><p className="font-bold gold-text">{stats.current_reward}</p><p className="text-muted-foreground">Block Reward</p></div>
            <div><p className="font-bold">{Math.floor(stats.total_blocks / 210000)}</p><p className="text-muted-foreground">Halvings</p></div>
            <div><p className="font-bold">{(stats.next_halving_block - stats.total_blocks).toLocaleString()}</p><p className="text-muted-foreground">To Halving</p></div>
            <div><p className="font-bold text-secondary">{(21000000 - stats.circulating_supply).toLocaleString()}</p><p className="text-muted-foreground">Remaining</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Difficulty History</CardTitle></CardHeader>
            <CardContent className="p-4"><div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="dG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FFD700" stopOpacity={0.3}/><stop offset="95%" stopColor="#FFD700" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="block" stroke="#94A3B8" fontSize={10} tickLine={false}/>
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false}/>
                  <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #27272A', borderRadius: '4px', fontSize: '12px' }}/>
                  <Area type="monotone" dataKey="difficulty" stroke="#FFD700" fill="url(#dG)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </div></CardContent>
          </Card>
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Transactions per Block</CardTitle></CardHeader>
            <CardContent className="p-4"><div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="tG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="block" stroke="#94A3B8" fontSize={10} tickLine={false}/>
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false}/>
                  <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #27272A', borderRadius: '4px', fontSize: '12px' }}/>
                  <Area type="monotone" dataKey="txs" stroke="#10B981" fill="url(#tG)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </div></CardContent>
          </Card>
        </div>
      )}

      {/* Node & Peers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Server className="w-4 h-4 text-primary"/>Node Info</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={async () => { try { await triggerSync(); toast.success("Sync triggered"); onRefresh(); } catch { toast.error("Sync failed"); } }}>
                  <Globe className="w-3 h-3 mr-1"/>Sync
                </Button>
                <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
                  <DialogTrigger asChild><Button variant="ghost" size="sm"><Globe className="w-3 h-3 mr-1"/>Add Peer</Button></DialogTrigger>
                  <DialogContent className="bg-card border-white/10">
                    <DialogHeader><DialogTitle>Connect to Peer</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Label>Peer URL</Label>
                      <Input placeholder="http://peer:8001" value={peerUrl} onChange={e => setPeerUrl(e.target.value)} className="font-mono"/>
                    </div>
                    <DialogFooter><Button className="gold-button" onClick={handleConnectPeer}>Connect</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs">
            <div><p className="text-muted-foreground">Node ID</p><p className="font-mono text-primary">{nodeInfo?.node_id || "N/A"}</p></div>
            <div><p className="text-muted-foreground">Version</p><p className="font-mono">{nodeInfo?.version || "1.0.0"}</p></div>
            <div><p className="text-muted-foreground">Height</p><p className="font-mono">{nodeInfo?.blocks_height?.toLocaleString() || 0}</p></div>
            <div><p className="text-muted-foreground">Peers</p><p className="font-mono text-secondary">{nodeInfo?.connected_peers || 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary"/>Connected Peers ({(peers?.length || 0) + 1})</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-white/5 bg-orange-500/5">
              <div className="flex items-center gap-2"><Pickaxe className="w-4 h-4 text-orange-500"/><div><p className="font-mono text-xs text-orange-500">Stratum Mining Pool</p><p className="text-xs text-muted-foreground">stratum+tcp://stratum.bricscoin26.org:3333</p></div></div>
              <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">Active</Badge>
            </div>
            {peers?.map((p, i) => (
              <div key={p.node_id || i} className="flex items-center justify-between p-3 border-b border-white/5">
                <div><p className="font-mono text-xs">{p.node_id}</p><p className="text-xs text-muted-foreground">{p.url}</p></div>
                <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">Connected</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Run Node CTA */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading font-bold gold-text">Run Your Own Node</h3>
              <p className="text-muted-foreground text-sm mt-1">Join the BricsCoin network for decentralization.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText("docker-compose up -d"); toast.success("Command copied!"); }}>
              <Copy className="w-3 h-3 mr-2"/>Copy Docker Command
            </Button>
          </div>
          <pre className="mt-3 p-3 bg-background/50 rounded border border-white/10 font-mono text-xs text-muted-foreground overflow-x-auto">
{`git clone https://codeberg.org/Bricscoin_26/Bricscoin.git
cd Bricscoin26 && docker-compose up -d
# Your node will sync automatically!`}
          </pre>
        </CardContent>
      </Card>

      {/* Technical Specs */}
      <Card className="bg-card border-white/10">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Technical Specifications</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
            {[
              ["Consensus", "Proof of Work (SHA-256)"], ["Max Supply", "21,000,000 BRICS"], ["Block Time", "10 minutes"],
              ["Diff Adjustment", "Every 2016 blocks"], ["Initial Reward", "50 BRICS"], ["Halving", "Every 210,000 blocks"],
              ["Signatures", "ECDSA + ML-DSA-65 (PQC)"], ["Address", "BRICS / BRICSPQ"], ["TX Fees", "0.000005 BRICS (burned)"],
              ["PQC Standard", "ML-DSA-65 (FIPS 204)"], ["Client Signing", "Browser-side only"], ["License", "MIT Open Source"],
            ].map(([k, v]) => (
              <div key={k}><p className="text-muted-foreground">{k}</p><p className="font-mono mt-0.5">{v}</p></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ========== EXPLORER SECTION ========== */
function ExplorerSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [blocks, setBlocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [blocksTotal, setBlocksTotal] = useState(0);
  const [txTotal, setTxTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [explorerTab, setExplorerTab] = useState("blocks");

  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  useEffect(() => {
    // Load both counts on mount
    async function loadCounts() {
      try {
        const [bRes, tRes] = await Promise.all([
          getBlocks(1, 0),
          getTransactions(1, 0),
        ]);
        setBlocksTotal(bRes.data.total);
        setTxTotal(tRes.data.total);
      } catch {}
    }
    loadCounts();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (explorerTab === "blocks") {
          const res = await getBlocks(limit, (page - 1) * limit);
          setBlocks(res.data.blocks);
          setBlocksTotal(res.data.total);
        } else {
          const res = await getTransactions(limit, (page - 1) * limit);
          setTransactions(res.data.transactions);
          setTxTotal(res.data.total);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    fetchData();
  }, [explorerTab, page]);

  const totalPages = Math.ceil((explorerTab === "blocks" ? blocksTotal : txTotal) / limit);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    if (searchQuery.startsWith("BRICS")) window.location.href = `/wallet?address=${searchQuery}`;
    else if (searchQuery.length === 64) window.location.href = `/tx/${searchQuery}`;
    else if (!isNaN(searchQuery)) window.location.href = `/block/${searchQuery}`;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <Input placeholder="Search block height, tx hash, address..." className="pl-10 font-mono text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} data-testid="explorer-search-input"/>
        </div>
        <Button type="submit" className="gold-button" data-testid="explorer-search-btn">Search</Button>
      </form>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        <Button variant={explorerTab === "blocks" ? "default" : "outline"} size="sm" onClick={() => { setExplorerTab("blocks"); setSearchParams({ page: "1" }); }} className={explorerTab === "blocks" ? "gold-button" : "border-white/20"}>
          <Blocks className="w-3 h-3 mr-2"/>Blocks ({blocksTotal.toLocaleString()})
        </Button>
        <Button variant={explorerTab === "transactions" ? "default" : "outline"} size="sm" onClick={() => { setExplorerTab("transactions"); setSearchParams({ page: "1" }); }} className={explorerTab === "transactions" ? "gold-button" : "border-white/20"}>
          <ArrowRightLeft className="w-3 h-3 mr-2"/>Transactions ({txTotal.toLocaleString()})
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card border-white/10">
        <CardContent className="p-0">
          {loading ? <div className="space-y-2 p-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 bg-muted/20"/>)}</div> : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid={explorerTab === "blocks" ? "blocks-table" : "transactions-table"}>
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    {explorerTab === "blocks" ? (
                      <><th className="p-3 text-xs text-muted-foreground">Height</th><th className="p-3 text-xs text-muted-foreground">Hash</th><th className="p-3 text-xs text-muted-foreground">Miner</th><th className="p-3 text-xs text-muted-foreground">Txs</th><th className="p-3 text-xs text-muted-foreground">Time</th></>
                    ) : (
                      <><th className="p-3 text-xs text-muted-foreground">TX ID</th><th className="p-3 text-xs text-muted-foreground">From</th><th className="p-3 text-xs text-muted-foreground">To</th><th className="p-3 text-xs text-muted-foreground">Amount</th><th className="p-3 text-xs text-muted-foreground">Status</th></>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {explorerTab === "blocks" ? blocks.map((b, idx) => (
                    <tr key={b.index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-3"><Link to={`/block/${b.index}`} className="font-mono text-sm text-primary hover:underline">#{b.index}</Link></td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{truncateHash(b.hash)}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{truncateHash(b.miner, 8)}</td>
                      <td className="p-3 text-sm">{b.transactions?.length || 0}</td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(b.timestamp).toLocaleString()}</td>
                    </tr>
                  )) : transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-3"><Link to={`/tx/${tx.id}`} className="font-mono text-xs text-primary hover:underline">{truncateHash(tx.id, 8)}</Link></td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{truncateHash(tx.sender, 8)}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{truncateHash(tx.recipient, 8)}</td>
                      <td className="p-3 font-mono text-sm text-primary">{tx.amount} BRICS</td>
                      <td className="p-3"><Badge variant="outline" className={tx.confirmed ? "border-green-500/50 text-green-400 text-xs" : "border-yellow-500/50 text-yellow-400 text-xs"}>{tx.confirmed ? "Confirmed" : "Pending"}</Badge></td>
                    </tr>
                  ))}
                  {((explorerTab === "blocks" && blocks.length === 0) || (explorerTab === "transactions" && transactions.length === 0)) && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setSearchParams({ page: (page - 1).toString() })}><ChevronLeft className="w-4 h-4"/>Prev</Button>
          <span className="text-xs text-muted-foreground px-3">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setSearchParams({ page: (page + 1).toString() })}>Next<ChevronRight className="w-4 h-4"/></Button>
        </div>
      )}
    </div>
  );
}

/* ========== RICH LIST SECTION ========== */
function RichListSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedAddr, setCopiedAddr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/richlist?limit=100`);
        setData(await r.json());
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 bg-muted/20"/>)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-white/10"><CardContent className="p-4 text-center"><p className="text-lg font-bold">{data?.total_holders || 0}</p><p className="text-xs text-muted-foreground">Total Holders</p></CardContent></Card>
        <Card className="bg-card border-white/10"><CardContent className="p-4 text-center"><p className="text-lg font-bold">{data?.circulating_supply?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">Circulating Supply</p></CardContent></Card>
        <Card className="bg-card border-white/10"><CardContent className="p-4 text-center"><p className="text-lg font-bold gold-text">{data?.wallets?.[0]?.balance?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">Top Wallet</p></CardContent></Card>
      </div>
      <Card className="bg-card border-white/10">
        <CardContent className="p-0">
          <div className="grid grid-cols-12 gap-2 p-3 border-b border-white/10 text-xs text-muted-foreground font-medium">
            <div className="col-span-1">#</div><div className="col-span-6">Address</div><div className="col-span-3 text-right">Balance</div><div className="col-span-2 text-right">%</div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data?.wallets?.map(w => (
              <div key={w.address} className="grid grid-cols-12 gap-2 p-3 items-center border-b border-white/5 hover:bg-white/5 transition-colors">
                <div className="col-span-1">
                  {w.rank <= 3 ? <Trophy className={`w-4 h-4 ${w.rank === 1 ? "text-yellow-500" : w.rank === 2 ? "text-gray-400" : "text-orange-600"}`}/> : <span className="text-xs text-muted-foreground">{w.rank}</span>}
                </div>
                <div className="col-span-6 flex items-center gap-1">
                  <span className="font-mono text-xs truncate">{w.address}</span>
                  <button onClick={() => { navigator.clipboard.writeText(w.address); setCopiedAddr(w.address); setTimeout(() => setCopiedAddr(null), 1500); }} className="flex-shrink-0">
                    {copiedAddr === w.address ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3 text-muted-foreground"/>}
                  </button>
                </div>
                <div className="col-span-3 text-right font-mono text-xs font-bold">{w.balance.toLocaleString()} <span className="text-muted-foreground">BRICS</span></div>
                <div className="col-span-2 text-right text-xs text-muted-foreground">{w.percentage}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ========== MAIN BLOCKCHAIN PAGE ========== */
export default function Blockchain() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [stats, setStats] = useState(null);
  const [minerStats, setMinerStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [nodeInfo, setNodeInfo] = useState(null);
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsR, blocksR, nodeR, peersR, minerR] = await Promise.all([
        getNetworkStats(), getBlocks(50),
        getNodeInfo().catch(() => ({ data: null })),
        getPeers().catch(() => ({ data: { peers: [] } })),
        fetch(`${BACKEND_URL}/api/miners/stats`).then(r => r.json()).catch(() => null),
      ]);
      setStats(statsR.data);
      setBlocks(blocksR.data.blocks);
      setNodeInfo(nodeR.data);
      setPeers(peersR.data?.peers || []);
      setMinerStats(minerR);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 30000); return () => clearInterval(iv); }, [fetchData]);

  return (
    <div className="space-y-6" data-testid="blockchain-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Blocks className="w-7 h-7 text-primary" />
              <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">Blockchain</h1>
            </div>
            <p className="text-muted-foreground">Network, Explorer & Rich List</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); fetchData(); }} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}/>Refresh
          </Button>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-5">
        <TabsList className="bg-card border border-white/10 flex-wrap">
          <TabsTrigger value="overview" data-testid="tab-overview"><NetworkIcon className="w-4 h-4 mr-2"/>Overview</TabsTrigger>
          <TabsTrigger value="explorer" data-testid="tab-explorer"><Search className="w-4 h-4 mr-2"/>Explorer</TabsTrigger>
          <TabsTrigger value="richlist" data-testid="tab-richlist"><Trophy className="w-4 h-4 mr-2"/>Rich List</TabsTrigger>
          <TabsTrigger value="runnode" data-testid="tab-runnode"><MonitorCog className="w-4 h-4 mr-2"/>Run a Node</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <NetworkOverview stats={stats} blocks={blocks} nodeInfo={nodeInfo} peers={peers} onRefresh={fetchData} refreshing={refreshing}/>
        </TabsContent>
        <TabsContent value="explorer"><ExplorerSection/></TabsContent>
        <TabsContent value="richlist"><RichListSection/></TabsContent>
        <TabsContent value="runnode"><RunNode/></TabsContent>
      </Tabs>
    </div>
  );
}
