import { useState, useEffect, useCallback } from "react";
import {
  Network, Users, Cpu, BarChart3, RefreshCw, Clock,
  ShieldCheck, Zap, Globe, Box, Activity, Server,
  Pickaxe, CircleDot, Link2, Eye, ArrowRightLeft, Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function truncAddr(a) {
  if (!a) return "";
  return a.length > 24 ? `${a.slice(0, 14)}...${a.slice(-6)}` : a;
}
function timeAgo(ts) {
  if (!ts) return "";
  try {
    const d = (Date.now() - new Date(ts).getTime()) / 1000;
    if (d < 60) return `${Math.floor(d)}s ago`;
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  } catch { return ts; }
}

export default function P2Pool() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [stats, setStats] = useState(null);
  const [miners, setMiners] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [peers, setPeers] = useState([]);
  const [sharechain, setSharechain] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [pplnsPreview, setPplnsPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, m, b, p, sc, pay, pplns] = await Promise.all([
        fetch(`${API}/p2pool/stats`).then(r => r.json()),
        fetch(`${API}/p2pool/miners`).then(r => r.json()),
        fetch(`${API}/p2pool/blocks?limit=20`).then(r => r.json()),
        fetch(`${API}/p2pool/peers`).then(r => r.json()),
        fetch(`${API}/p2pool/sharechain?limit=30`).then(r => r.json()),
        fetch(`${API}/p2pool/payouts?limit=10`).then(r => r.json()),
        fetch(`${API}/p2pool/pplns/preview`).then(r => r.json()),
      ]);
      setStats(s); setMiners(m.miners || []); setBlocks(b.blocks || []);
      setPeers(p.peers || []); setSharechain(sc.shares || []);
      setPayouts(pay.payouts || []); setPplnsPreview(pplns);
    } catch (e) { console.error("P2Pool load:", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { const i = setInterval(loadData, 30000); return () => clearInterval(i); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 text-primary animate-spin" /></div>;

  const pool = stats?.pool || {};
  const net = stats?.network || {};
  const chain = stats?.sharechain || {};
  const poolPeers = stats?.peers || {};
  const poolMiners = stats?.miners || {};
  const shares = stats?.shares || {};
  const hr = stats?.hashrate || {};

  return (
    <div className="space-y-8" data-testid="p2pool-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Network className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">P2Pool</h1>
              <p className="text-muted-foreground text-sm">Truly Decentralized Mining — No Central Operator — Verified by All Peers</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); loadData(); toast.success("Refreshed"); }} disabled={refreshing} data-testid="refresh-btn">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </motion.div>

      {/* Two Pool Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-bold text-sm">SOLO Pool</h3>
              <Badge variant="outline" className="border-primary/50 text-primary ml-auto">Port 3333</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Finder keeps the full <span className="text-primary font-bold">50 BRICS</span> reward. 0% fee. Your luck, your reward.</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-400" />
              <h3 className="font-heading font-bold text-sm">PPLNS Pool</h3>
              <Badge variant="outline" className="border-green-500/50 text-green-400 ml-auto">Port 3334</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Reward split proportionally among all miners based on shares. Steady income, less variance.</p>
          </CardContent>
        </Card>
      </div>

      {/* Decentralization Notice */}
      <Card className="bg-card border-white/10">
        <CardContent className="p-3 flex items-center gap-3">
          <Lock className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-bold text-green-400">Trustless & Decentralized:</span> Every share is validated independently by all P2P nodes. 
            The sharechain is public and verifiable. No single operator can manipulate payouts. 
            Node ID: <span className="font-mono text-primary">{pool.node_id || "..."}</span>
          </p>
        </CardContent>
      </Card>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: Cpu, label: "Pool Hashrate", value: hr.pool_hashrate_readable || "0 H/s" },
          { icon: Users, label: "Active Miners", value: poolMiners.active || 0 },
          { icon: BarChart3, label: "Shares (24h)", value: (shares.last_24h || 0).toLocaleString() },
          { icon: Globe, label: "P2P Nodes", value: `${poolPeers.online || 0} / ${poolPeers.total || 0}` },
          { icon: Link2, label: "Sharechain", value: `#${chain.height || 0}` },
        ].map(s => (
          <Card key={s.label} className="bg-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-lg font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={v => setSearchParams({ tab: v })} className="space-y-6">
        <TabsList className="bg-card border border-white/10 flex-wrap">
          <TabsTrigger value="overview" data-testid="tab-overview"><Activity className="w-4 h-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="sharechain" data-testid="tab-sharechain"><Link2 className="w-4 h-4 mr-1" />Sharechain</TabsTrigger>
          <TabsTrigger value="miners" data-testid="tab-miners"><Pickaxe className="w-4 h-4 mr-1" />Miners</TabsTrigger>
          <TabsTrigger value="blocks" data-testid="tab-blocks"><Box className="w-4 h-4 mr-1" />Blocks</TabsTrigger>
          <TabsTrigger value="pplns" data-testid="tab-pplns"><ArrowRightLeft className="w-4 h-4 mr-1" />PPLNS</TabsTrigger>
          <TabsTrigger value="peers" data-testid="tab-peers"><Server className="w-4 h-4 mr-1" />Peers</TabsTrigger>
          <TabsTrigger value="connect" data-testid="tab-connect"><Zap className="w-4 h-4 mr-1" />Connect</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-white/10">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Network</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Difficulty", (net.difficulty || 0).toLocaleString()],
                  ["Share Difficulty", (net.share_difficulty || 0).toLocaleString()],
                  ["Total Blocks", (net.total_blocks || 0).toLocaleString()],
                  ["Block Reward", `${net.block_reward || 50} BRICS`],
                  ["Last Block", net.last_block ? timeAgo(net.last_block.timestamp) : "—"],
                  ["Last Miner", truncAddr(net.last_block?.miner)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-card border-white/10">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Pool Performance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Pool Hashrate", hr.pool_hashrate_readable || "0 H/s", true],
                  ["Shares (1h)", (shares.last_hour || 0).toLocaleString()],
                  ["Shares (24h)", (shares.last_24h || 0).toLocaleString()],
                  ["Blocks Found (24h)", stats?.blocks?.found_24h || 0],
                  ["Sharechain Height", `#${chain.height || 0}`],
                ].map(([k, v, gold]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className={`font-mono ${gold ? "font-bold text-primary" : ""}`}>{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Top Miners */}
          {poolMiners.top_miners?.length > 0 && (
            <Card className="bg-card border-white/10">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Pickaxe className="w-4 h-4 text-primary" />Top Miners (24h)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10">
                      <th className="text-left py-2 text-xs text-muted-foreground">#</th>
                      <th className="text-left py-2 text-xs text-muted-foreground">Worker</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Shares</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Blocks</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Last Share</th>
                    </tr></thead>
                    <tbody>
                      {poolMiners.top_miners.map((m, i) => (
                        <tr key={m.worker} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 font-mono text-xs text-primary">{truncAddr(m.worker)}</td>
                          <td className="py-2 text-right">{m.shares_24h.toLocaleString()}</td>
                          <td className="py-2 text-right">{m.blocks_found}</td>
                          <td className="py-2 text-right text-xs text-muted-foreground">{timeAgo(m.last_share)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sharechain */}
        <TabsContent value="sharechain" className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                The <span className="font-bold text-primary">sharechain</span> is a separate mini-blockchain where every share is linked to the previous one.
                Any P2P node independently validates every share. This makes the pool <strong>trustless</strong> — no one can fake shares or manipulate payouts.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />Sharechain
                <Badge variant="outline" className="ml-2">Height: {chain.height || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sharechain.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sharechain is empty — shares will appear when miners submit work</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10">
                      <th className="text-left py-2 text-xs text-muted-foreground">Height</th>
                      <th className="text-left py-2 text-xs text-muted-foreground">Share ID</th>
                      <th className="text-left py-2 text-xs text-muted-foreground">Worker</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Difficulty</th>
                      <th className="text-left py-2 text-xs text-muted-foreground">Prev Share</th>
                      <th className="text-center py-2 text-xs text-muted-foreground">Validators</th>
                      <th className="text-center py-2 text-xs text-muted-foreground">Block?</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Time</th>
                    </tr></thead>
                    <tbody>
                      {sharechain.map(s => (
                        <tr key={s.share_id} className={`border-b border-white/5 hover:bg-white/5 ${s.is_block ? "bg-primary/5" : ""}`}>
                          <td className="py-2 font-bold">#{s.height}</td>
                          <td className="py-2 font-mono text-xs">{s.share_id?.slice(0, 12)}...</td>
                          <td className="py-2 font-mono text-xs text-primary">{truncAddr(s.worker)}</td>
                          <td className="py-2 text-right">{s.share_difficulty}</td>
                          <td className="py-2 font-mono text-xs text-muted-foreground">{s.previous_share_id === "genesis" ? "genesis" : s.previous_share_id?.slice(0, 8) + "..."}</td>
                          <td className="py-2 text-center">
                            <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">{s.validated_by?.length || 0}</Badge>
                          </td>
                          <td className="py-2 text-center">{s.is_block ? <Box className="w-4 h-4 text-primary mx-auto" /> : "—"}</td>
                          <td className="py-2 text-right text-xs text-muted-foreground">{timeAgo(s.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Miners */}
        <TabsContent value="miners" className="space-y-4">
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Active Miners <Badge variant="outline" className="ml-2">{miners.length}</Badge></CardTitle></CardHeader>
            <CardContent>
              {miners.length === 0 ? (
                <div className="text-center py-12">
                  <Pickaxe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No miners connected</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10">
                      <th className="text-left py-2 text-xs text-muted-foreground">Worker</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Hashrate</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Shares (1h)</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Shares (24h)</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Blocks</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Last Seen</th>
                      <th className="text-center py-2 text-xs text-muted-foreground">Status</th>
                    </tr></thead>
                    <tbody>
                      {miners.map(m => (
                        <tr key={m.worker} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2 font-mono text-xs text-primary">{truncAddr(m.worker)}</td>
                          <td className="py-2 text-right font-mono">{m.hashrate_readable}</td>
                          <td className="py-2 text-right">{m.shares_1h.toLocaleString()}</td>
                          <td className="py-2 text-right">{m.shares_24h.toLocaleString()}</td>
                          <td className="py-2 text-right">{m.blocks_found}</td>
                          <td className="py-2 text-right text-xs text-muted-foreground">{timeAgo(m.last_seen)}</td>
                          <td className="py-2 text-center"><Badge variant="outline" className={m.online ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}>{m.online ? "Online" : "Offline"}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocks */}
        <TabsContent value="blocks" className="space-y-4">
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Box className="w-4 h-4 text-primary" />Recent Blocks</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/10">
                    <th className="text-left py-2 text-xs text-muted-foreground">Block</th>
                    <th className="text-left py-2 text-xs text-muted-foreground">Hash</th>
                    <th className="text-left py-2 text-xs text-muted-foreground">Miner</th>
                    <th className="text-right py-2 text-xs text-muted-foreground">Difficulty</th>
                    <th className="text-right py-2 text-xs text-muted-foreground">Time</th>
                    <th className="text-center py-2 text-xs text-muted-foreground">PQC</th>
                  </tr></thead>
                  <tbody>
                    {blocks.map(b => (
                      <tr key={b.index} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 font-bold text-primary">#{b.index}</td>
                        <td className="py-2 font-mono text-xs">{b.hash?.slice(0, 16)}...</td>
                        <td className="py-2 font-mono text-xs">{truncAddr(b.miner)}</td>
                        <td className="py-2 text-right">{(b.difficulty || 0).toLocaleString()}</td>
                        <td className="py-2 text-right text-xs text-muted-foreground">{timeAgo(b.timestamp)}</td>
                        <td className="py-2 text-center">{b.pqc_scheme ? <ShieldCheck className="w-4 h-4 text-green-400 mx-auto" /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PPLNS */}
        <TabsContent value="pplns" className="space-y-4">
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-3 flex items-center gap-3">
              <ArrowRightLeft className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-green-400">PPLNS (Pay Per Last N Shares):</span> When a block is found, the {net.block_reward || 50} BRICS reward is
                split proportionally among all miners who contributed shares in the last {chain.pplns_window || 2016} share window.
                The calculation is <strong>deterministic</strong> — any node produces the same result.
              </p>
            </CardContent>
          </Card>

          {/* PPLNS Preview */}
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-primary" />PPLNS Payout Preview (if block found now)</CardTitle></CardHeader>
            <CardContent>
              {!pplnsPreview?.payouts?.length ? (
                <p className="text-center text-muted-foreground py-8">No shares in the PPLNS window yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10">
                      <th className="text-left py-2 text-xs text-muted-foreground">#</th>
                      <th className="text-left py-2 text-xs text-muted-foreground">Worker</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Reward (BRICS)</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Share %</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Shares</th>
                    </tr></thead>
                    <tbody>
                      {pplnsPreview.payouts.map((p, i) => (
                        <tr key={p.worker} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 font-mono text-xs text-primary">{truncAddr(p.worker)}</td>
                          <td className="py-2 text-right font-bold text-green-400">{p.amount.toFixed(6)}</td>
                          <td className="py-2 text-right">{p.share_percentage.toFixed(2)}%</td>
                          <td className="py-2 text-right">{p.shares_in_window}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Total: {net.block_reward || 50} BRICS distributed among {pplnsPreview.miners_in_window} miners
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout History */}
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Payout History</CardTitle></CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payouts yet</p>
              ) : (
                <div className="space-y-3">
                  {payouts.map(p => (
                    <Card key={p.payout_id} className="bg-background border-white/5">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className={p.pool_mode === "solo" ? "border-primary/50 text-primary" : "border-green-500/50 text-green-400"}>
                            {p.pool_mode.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Block #{p.block_height}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(p.timestamp)}</span>
                        </div>
                        <div className="text-xs space-y-1">
                          {p.payouts?.slice(0, 5).map((w, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="font-mono text-primary">{truncAddr(w.worker)}</span>
                              <span className="font-bold">{w.amount.toFixed(6)} BRICS ({w.share_percentage.toFixed(1)}%)</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Peers */}
        <TabsContent value="peers" className="space-y-4">
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Server className="w-4 h-4 text-primary" />P2P Network <Badge variant="outline" className="ml-2">{peers.filter(p => p.online).length} online</Badge></CardTitle></CardHeader>
            <CardContent>
              {peers.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No peers yet — run a BricsCoin node to join the P2Pool network</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {peers.map(p => (
                    <Card key={p.peer_id} className="bg-background border-white/5">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-primary">{p.peer_id}</span>
                          <Badge variant="outline" className={p.online ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}>{p.online ? "Online" : "Offline"}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{p.node_url}</p>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Port: {p.stratum_port}</span>
                          <span>v{p.version}</span>
                          <span>{timeAgo(p.last_seen)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connect */}
        <TabsContent value="connect" className="space-y-4">
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />How to Mine on P2Pool</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  { n: 1, t: "Create a PQC Wallet", d: "Go to the Wallet page. Your BRICSPQ address is your mining address and receives rewards directly." },
                  { n: 2, t: "Choose Your Pool Mode", d: "" },
                  { n: 3, t: "Configure Your ASIC Miner", d: "" },
                  { n: 4, t: "Run Your Own P2Pool Node (Recommended)", d: "Running your own node makes the network more decentralized. Every node validates shares independently." },
                ].map(s => (
                  <div key={s.n} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-sm flex-shrink-0">{s.n}</div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">{s.t}</h3>
                      {s.n === 2 && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded bg-background border border-primary/20">
                            <p className="font-bold text-sm text-primary mb-1">SOLO Pool</p>
                            <p className="font-mono text-xs text-primary">stratum+tcp://bricscoin26.org:3333</p>
                            <p className="text-xs text-muted-foreground mt-1">Finder keeps 50 BRICS. High variance, big reward.</p>
                          </div>
                          <div className="p-3 rounded bg-background border border-green-500/20">
                            <p className="font-bold text-sm text-green-400 mb-1">PPLNS Pool</p>
                            <p className="font-mono text-xs text-green-400">stratum+tcp://bricscoin26.org:3334</p>
                            <p className="text-xs text-muted-foreground mt-1">Reward split proportionally. Steady income.</p>
                          </div>
                        </div>
                      )}
                      {s.n === 3 && (
                        <div className="mt-2 p-3 rounded bg-background border border-white/10">
                          <p className="text-xs text-muted-foreground">Worker: <span className="font-mono text-primary">YOUR_BRICSPQ_ADDRESS</span></p>
                          <p className="text-xs text-muted-foreground">Password: <span className="font-mono">x</span></p>
                        </div>
                      )}
                      {s.d && <p className="text-xs text-muted-foreground mt-1">{s.d}</p>}
                      {s.n === 4 && (
                        <div className="mt-2 p-3 rounded bg-background border border-white/10">
                          <code className="text-xs text-muted-foreground">
                            git clone https://codeberg.org/Bricscoin_26/Bricscoin<br />
                            cd Bricscoin && docker compose up -d
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-sm font-bold flex items-center gap-2"><CircleDot className="w-4 h-4 text-primary" />Pool Specifications</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ["Algorithm", "SHA256"], ["Pool Fee", "0%"],
                      ["SOLO Port", "3333"], ["PPLNS Port", "3334"],
                      ["Block Reward", "50 BRICS"], ["PQC", "ECDSA + ML-DSA-65"],
                      ["PPLNS Window", `${chain.pplns_window || 2016} shares`], ["Protocol", "Stratum v1"],
                    ].map(([k, v]) => (
                      <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="font-mono text-primary">{v}</span></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
