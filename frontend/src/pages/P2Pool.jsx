import { useState, useEffect, useCallback } from "react";
import {
  Network, Users, Cpu, BarChart3, RefreshCw, Clock,
  ShieldCheck, Zap, ArrowUpRight, Globe, Box,
  Activity, Server, Pickaxe, CircleDot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function truncAddr(addr) {
  if (!addr) return "";
  return addr.length > 24 ? `${addr.slice(0, 14)}...${addr.slice(-6)}` : addr;
}

function fmtTime(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function timeAgo(ts) {
  if (!ts) return "";
  try {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return ts; }
}

export default function P2Pool() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [stats, setStats] = useState(null);
  const [miners, setMiners] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, minersRes, blocksRes, peersRes] = await Promise.all([
        fetch(`${API}/p2pool/stats`).then(r => r.json()),
        fetch(`${API}/p2pool/miners`).then(r => r.json()),
        fetch(`${API}/p2pool/blocks?limit=20`).then(r => r.json()),
        fetch(`${API}/p2pool/peers`).then(r => r.json()),
      ]);
      setStats(statsRes);
      setMiners(minersRes.miners || []);
      setBlocks(blocksRes.blocks || []);
      setPeers(peersRes.peers || []);
    } catch (e) {
      console.error("P2Pool load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
    toast.success("Pool data refreshed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const pool = stats?.pool || {};
  const network = stats?.network || {};
  const poolMiners = stats?.miners || {};
  const shares = stats?.shares || {};
  const hashrate = stats?.hashrate || {};
  const poolPeers = stats?.peers || {};

  return (
    <div className="space-y-8" data-testid="p2pool-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Network className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">P2Pool</h1>
              <p className="text-muted-foreground">Decentralized Mining Pool — No Central Operator</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} data-testid="refresh-btn">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Payout scheme banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 flex items-center gap-3">
          <Zap className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm"><span className="font-bold text-primary">SOLO Payout</span> — Whoever finds the block keeps the full {network.block_reward || 50} BRICS reward</p>
            <p className="text-xs text-muted-foreground">Decentralized P2P mining. No pool fees. No central operator. Connect your ASIC miner and start earning.</p>
          </div>
        </CardContent>
      </Card>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Pool Hashrate</p>
            </div>
            <p className="text-lg font-bold">{hashrate.pool_hashrate_readable || "0 H/s"}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Active Miners</p>
            </div>
            <p className="text-lg font-bold">{poolMiners.active || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Shares (24h)</p>
            </div>
            <p className="text-lg font-bold">{(shares.last_24h || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">P2P Nodes</p>
            </div>
            <p className="text-lg font-bold">{poolPeers.online || 0} <span className="text-xs text-muted-foreground font-normal">/ {poolPeers.total || 0}</span></p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-6">
        <TabsList className="bg-card border border-white/10">
          <TabsTrigger value="overview" data-testid="tab-overview"><Activity className="w-4 h-4 mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="miners" data-testid="tab-miners"><Pickaxe className="w-4 h-4 mr-2" />Miners</TabsTrigger>
          <TabsTrigger value="blocks" data-testid="tab-blocks"><Box className="w-4 h-4 mr-2" />Blocks</TabsTrigger>
          <TabsTrigger value="peers" data-testid="tab-peers"><Server className="w-4 h-4 mr-2" />Peers</TabsTrigger>
          <TabsTrigger value="connect" data-testid="tab-connect"><Zap className="w-4 h-4 mr-2" />Connect</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Network Info */}
            <Card className="bg-card border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Network Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Difficulty</span>
                  <span className="font-mono">{(network.difficulty || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Blocks</span>
                  <span className="font-mono">{(network.total_blocks || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Block Reward</span>
                  <span className="font-mono">{network.block_reward || 50} BRICS</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Block</span>
                  <span className="text-xs">{network.last_block ? timeAgo(network.last_block.timestamp) : "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Block Miner</span>
                  <span className="font-mono text-xs text-primary">{truncAddr(network.last_block?.miner)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Pool Performance */}
            <Card className="bg-card border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Pool Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pool Hashrate</span>
                  <span className="font-mono font-bold text-primary">{hashrate.pool_hashrate_readable || "0 H/s"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shares (last hour)</span>
                  <span className="font-mono">{(shares.last_hour || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shares (24h)</span>
                  <span className="font-mono">{(shares.last_24h || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Blocks Found (24h)</span>
                  <span className="font-mono">{stats?.blocks?.found_24h || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payout Scheme</span>
                  <Badge variant="outline" className="border-green-500/50 text-green-400">SOLO</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Miners */}
          {poolMiners.top_miners?.length > 0 && (
            <Card className="bg-card border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Pickaxe className="w-4 h-4 text-primary" />Top Miners (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-xs text-muted-foreground">#</th>
                        <th className="text-left py-2 text-xs text-muted-foreground">Worker</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Shares</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Blocks</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Last Share</th>
                      </tr>
                    </thead>
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

        {/* Miners */}
        <TabsContent value="miners" className="space-y-4">
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Active Miners
                <Badge variant="outline" className="ml-2">{miners.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {miners.length === 0 ? (
                <div className="text-center py-12">
                  <Pickaxe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No miners currently connected</p>
                  <p className="text-xs text-muted-foreground mt-1">Connect your ASIC to start mining</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-xs text-muted-foreground">Worker</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Hashrate</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Shares (1h)</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Shares (24h)</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Blocks</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Last Seen</th>
                        <th className="text-center py-2 text-xs text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {miners.map((m) => (
                        <tr key={m.worker} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2 font-mono text-xs text-primary">{truncAddr(m.worker)}</td>
                          <td className="py-2 text-right font-mono">{m.hashrate_readable}</td>
                          <td className="py-2 text-right">{m.shares_1h.toLocaleString()}</td>
                          <td className="py-2 text-right">{m.shares_24h.toLocaleString()}</td>
                          <td className="py-2 text-right">{m.blocks_found}</td>
                          <td className="py-2 text-right text-xs text-muted-foreground">{timeAgo(m.last_seen)}</td>
                          <td className="py-2 text-center">
                            <Badge variant="outline" className={m.online ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}>
                              {m.online ? "Online" : "Offline"}
                            </Badge>
                          </td>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Box className="w-4 h-4 text-primary" />Recent Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              {blocks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No blocks found yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-xs text-muted-foreground">Block</th>
                        <th className="text-left py-2 text-xs text-muted-foreground">Hash</th>
                        <th className="text-left py-2 text-xs text-muted-foreground">Miner</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Difficulty</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Time</th>
                        <th className="text-center py-2 text-xs text-muted-foreground">PQC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blocks.map((b) => (
                        <tr key={b.index} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2 font-bold text-primary">#{b.index}</td>
                          <td className="py-2 font-mono text-xs">{b.hash?.slice(0, 16)}...</td>
                          <td className="py-2 font-mono text-xs">{truncAddr(b.miner)}</td>
                          <td className="py-2 text-right">{(b.difficulty || 0).toLocaleString()}</td>
                          <td className="py-2 text-right text-xs text-muted-foreground">{timeAgo(b.timestamp)}</td>
                          <td className="py-2 text-center">
                            {b.pqc_scheme ? (
                              <ShieldCheck className="w-4 h-4 text-green-400 mx-auto" />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Peers */}
        <TabsContent value="peers" className="space-y-4">
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />P2P Nodes
                <Badge variant="outline" className="ml-2">{peers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {peers.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No P2P peers connected yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start your node to join the P2Pool network</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {peers.map((p) => (
                    <Card key={p.peer_id} className="bg-background border-white/5">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-primary">{p.peer_id}</span>
                          <Badge variant="outline" className={p.online ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}>
                            {p.online ? "Online" : "Offline"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{p.node_url}</p>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Stratum: {p.stratum_port}</span>
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

        {/* Connect Guide */}
        <TabsContent value="connect" className="space-y-4">
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />How to Connect to P2Pool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-sm flex-shrink-0">1</div>
                  <div>
                    <h3 className="text-sm font-bold">Get a PQC Wallet Address</h3>
                    <p className="text-xs text-muted-foreground mt-1">Go to the Wallet page and create a PQC wallet. Your wallet address (starting with BRICSPQ) is your mining address.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-sm flex-shrink-0">2</div>
                  <div>
                    <h3 className="text-sm font-bold">Configure Your ASIC Miner</h3>
                    <p className="text-xs text-muted-foreground mt-1">Point your SHA256 ASIC miner (Antminer, Bitaxe, etc.) to:</p>
                    <div className="mt-2 p-3 rounded bg-background border border-white/10">
                      <p className="font-mono text-xs text-primary">stratum+tcp://bricscoin26.org:3333</p>
                      <p className="text-xs text-muted-foreground mt-1">Worker: <span className="font-mono text-primary">YOUR_BRICSPQ_ADDRESS</span></p>
                      <p className="text-xs text-muted-foreground">Password: <span className="font-mono">x</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-sm flex-shrink-0">3</div>
                  <div>
                    <h3 className="text-sm font-bold">Start Mining</h3>
                    <p className="text-xs text-muted-foreground mt-1">Your miner will start submitting shares. When you find a block, the full 50 BRICS reward goes directly to your wallet address.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-sm flex-shrink-0">4</div>
                  <div>
                    <h3 className="text-sm font-bold">Run Your Own P2Pool Node (Advanced)</h3>
                    <p className="text-xs text-muted-foreground mt-1">Download and run the BricsCoin node software to become a P2Pool peer. This helps decentralize the network.</p>
                    <div className="mt-2 p-3 rounded bg-background border border-white/10">
                      <code className="text-xs text-muted-foreground">
                        git clone https://codeberg.org/Bricscoin_26/Bricscoin<br />
                        cd Bricscoin<br />
                        docker compose up -d
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pool Info */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-sm font-bold flex items-center gap-2"><CircleDot className="w-4 h-4 text-primary" />Pool Specifications</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Algorithm:</span> <span className="font-mono">SHA256</span></div>
                    <div><span className="text-muted-foreground">Payout:</span> <span className="font-mono text-primary">SOLO</span></div>
                    <div><span className="text-muted-foreground">Port:</span> <span className="font-mono">3333</span></div>
                    <div><span className="text-muted-foreground">Pool Fee:</span> <span className="font-mono text-green-400">0%</span></div>
                    <div><span className="text-muted-foreground">Block Reward:</span> <span className="font-mono">50 BRICS</span></div>
                    <div><span className="text-muted-foreground">PQC:</span> <span className="font-mono">ECDSA + ML-DSA-65</span></div>
                    <div><span className="text-muted-foreground">Min Payout:</span> <span className="font-mono">No minimum</span></div>
                    <div><span className="text-muted-foreground">Protocol:</span> <span className="font-mono">Stratum v1</span></div>
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
