import { useEffect, useState } from "react";
import { 
  Network as NetworkIcon, 
  Coins, 
  Blocks, 
  Clock, 
  TrendingUp,
  Activity,
  Server,
  Shield,
  RefreshCw,
  Globe,
  Link,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Skeleton } from "../components/ui/skeleton";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "../components/ui/dialog";
import { getNetworkStats, getBlocks, getNodeInfo, getPeers, registerPeer, triggerSync } from "../lib/api";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

function StatCard({ icon: Icon, title, value, subtitle, color = "primary", delay = 0 }) {
  const colorClasses = {
    primary: "bg-primary/20 text-primary",
    secondary: "bg-secondary/20 text-secondary",
    orange: "bg-orange-500/20 text-orange-500",
    blue: "bg-blue-500/20 text-blue-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
    >
      <Card className="bg-card border-white/10 card-hover" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <p className="text-2xl font-heading font-bold">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${colorClasses[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Network() {
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [nodeInfo, setNodeInfo] = useState(null);
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [peerUrl, setPeerUrl] = useState("");
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, blocksRes, nodeRes, peersRes] = await Promise.all([
        getNetworkStats(),
        getBlocks(50),
        getNodeInfo().catch(() => ({ data: null })),
        getPeers().catch(() => ({ data: { peers: [] } })),
      ]);
      setStats(statsRes.data);
      setBlocks(blocksRes.data.blocks);
      setNodeInfo(nodeRes.data);
      setPeers(peersRes.data?.peers || []);
    } catch (error) {
      console.error("Error fetching network data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSync = async () => {
    try {
      await triggerSync();
      toast.success("Blockchain sync triggered");
      fetchData();
    } catch (error) {
      toast.error("Sync failed");
    }
  };

  const handleConnectPeer = async () => {
    if (!peerUrl) {
      toast.error("Please enter a peer URL");
      return;
    }
    try {
      await registerPeer({
        node_id: `web-${Date.now()}`,
        url: peerUrl,
        version: "1.0.0"
      });
      toast.success("Connected to peer!");
      setConnectDialogOpen(false);
      setPeerUrl("");
      fetchData();
    } catch (error) {
      toast.error("Failed to connect to peer");
    }
  };

  // Calculate supply percentage
  const supplyPercentage = stats 
    ? (stats.circulating_supply / stats.total_supply) * 100 
    : 0;

  // Prepare chart data from blocks
  const chartData = blocks
    .slice()
    .reverse()
    .map((block, idx) => ({
      block: block.index,
      difficulty: block.difficulty,
      txs: block.transactions?.length || 0,
    }));

  if (loading) {
    return (
      <div className="space-y-6" data-testid="network-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="network-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Network</h1>
          <p className="text-muted-foreground">BricsCoin blockchain statistics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/20"
            onClick={handleSync}
            data-testid="sync-network-btn"
          >
            <Link className="w-4 h-4 mr-2" />
            Sync
          </Button>
          <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-white/20" data-testid="connect-peer-btn">
                <Globe className="w-4 h-4 mr-2" />
                Connect Peer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10" data-testid="connect-peer-dialog">
              <DialogHeader>
                <DialogTitle className="font-heading">Connect to Peer Node</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label>Peer Node URL</Label>
                <Input
                  placeholder="http://peer-node:8001"
                  value={peerUrl}
                  onChange={(e) => setPeerUrl(e.target.value)}
                  className="font-mono bg-background border-white/20"
                  data-testid="peer-url-input"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Enter the URL of another BricsCoin node to connect and sync
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleConnectPeer}
                  className="gold-button rounded-sm"
                  data-testid="confirm-connect-peer-btn"
                >
                  Connect
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            className="border-white/20"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="refresh-network-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Coins}
          title="Total Supply"
          value="21,000,000"
          subtitle="Maximum BRICS"
          color="primary"
          delay={0}
        />
        <StatCard
          icon={TrendingUp}
          title="Circulating Supply"
          value={`${stats?.circulating_supply?.toLocaleString() || 0}`}
          subtitle={`${supplyPercentage.toFixed(4)}% mined`}
          color="secondary"
          delay={1}
        />
        <StatCard
          icon={Blocks}
          title="Block Height"
          value={stats?.total_blocks?.toLocaleString() || 0}
          subtitle="Total blocks mined"
          color="blue"
          delay={2}
        />
        <StatCard
          icon={Shield}
          title="Difficulty"
          value={stats?.current_difficulty || 4}
          subtitle="Leading zeros required"
          color="orange"
          delay={3}
        />
        <StatCard
          icon={Activity}
          title="Pending TXs"
          value={stats?.pending_transactions || 0}
          subtitle="In mempool"
          color="primary"
          delay={4}
        />
        <StatCard
          icon={Clock}
          title="Block Reward"
          value={`${stats?.current_reward || 50} BRICS`}
          subtitle={`Next halving: #${stats?.next_halving_block?.toLocaleString()}`}
          color="secondary"
          delay={5}
        />
        <StatCard
          icon={Server}
          title="Algorithm"
          value="SHA256"
          subtitle="Proof of Work"
          color="blue"
          delay={6}
        />
        <StatCard
          icon={NetworkIcon}
          title="Target Block Time"
          value="10 min"
          subtitle="Difficulty adjusts every 2016 blocks"
          color="orange"
          delay={7}
        />
      </div>

      {/* Supply Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="bg-card border-white/10" data-testid="supply-progress-card">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Supply Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Mined</span>
                <span className="font-mono">
                  {stats?.circulating_supply?.toLocaleString()} / 21,000,000 BRICS
                </span>
              </div>
              <Progress value={supplyPercentage} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {supplyPercentage.toFixed(6)}% of total supply has been mined
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <p className="text-2xl font-heading font-bold gold-text">
                  {stats?.current_reward || 50}
                </p>
                <p className="text-xs text-muted-foreground">Current Block Reward</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-heading font-bold">
                  {Math.floor((stats?.total_blocks || 0) / 210000)}
                </p>
                <p className="text-xs text-muted-foreground">Halvings Occurred</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-heading font-bold">
                  {((stats?.next_halving_block || 210000) - (stats?.total_blocks || 0)).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Blocks to Halving</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-heading font-bold text-secondary">
                  {(21000000 - (stats?.circulating_supply || 0)).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Remaining to Mine</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="bg-card border-white/10" data-testid="difficulty-chart-card">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="font-heading">Difficulty History</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="diffGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FFD700" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="block" 
                        stroke="#94A3B8" 
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#94A3B8" 
                        fontSize={12}
                        tickLine={false}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0A0A0A', 
                          border: '1px solid #27272A',
                          borderRadius: '4px'
                        }}
                        labelStyle={{ color: '#94A3B8' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="difficulty" 
                        stroke="#FFD700" 
                        fill="url(#diffGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
          >
            <Card className="bg-card border-white/10" data-testid="txs-chart-card">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="font-heading">Transactions per Block</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="block" 
                        stroke="#94A3B8" 
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#94A3B8" 
                        fontSize={12}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0A0A0A', 
                          border: '1px solid #27272A',
                          borderRadius: '4px'
                        }}
                        labelStyle={{ color: '#94A3B8' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="txs" 
                        stroke="#10B981" 
                        fill="url(#txGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Technical Specs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <Card className="bg-card border-white/10" data-testid="specs-card">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading">Technical Specifications</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Consensus</p>
                <p className="font-mono">Proof of Work (SHA256)</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Max Supply</p>
                <p className="font-mono">21,000,000 BRICS</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Block Time Target</p>
                <p className="font-mono">10 minutes</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Difficulty Adjustment</p>
                <p className="font-mono">Every 2016 blocks</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Initial Block Reward</p>
                <p className="font-mono">50 BRICS</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Halving Interval</p>
                <p className="font-mono">Every 210,000 blocks</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Signature Algorithm</p>
                <p className="font-mono">ECDSA (secp256k1)</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Address Format</p>
                <p className="font-mono">BRICS + SHA256 prefix</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Mining</p>
                <p className="font-mono">Open to everyone</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* P2P Node Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <Card className="bg-card border-white/10" data-testid="node-info-card">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Node Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Node ID</p>
                <p className="font-mono text-primary">{nodeInfo?.node_id || "N/A"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-mono">{nodeInfo?.version || "1.0.0"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Block Height</p>
                <p className="font-mono">{nodeInfo?.blocks_height?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Connected Peers</p>
                <p className="font-mono text-secondary">{nodeInfo?.connected_peers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Connected Peers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
      >
        <Card className="bg-card border-white/10" data-testid="peers-card">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Connected Peers ({peers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {peers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No peers connected yet</p>
                <p className="text-sm mt-2">
                  Run your own node and connect to expand the network!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {peers.map((peer, idx) => (
                  <div
                    key={peer.node_id || idx}
                    className="flex items-center justify-between p-4 table-row-hover"
                    data-testid={`peer-${peer.node_id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-secondary/20 flex items-center justify-center">
                        <Server className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <p className="font-mono text-sm">{peer.node_id}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {peer.url}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="confirmed-badge">Connected</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Run Your Node CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30" data-testid="run-node-cta">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-bold text-lg gold-text">Run Your Own Node</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Download the Docker image and join the BricsCoin network. Mine blocks and earn rewards!
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-white/20"
                  onClick={() => {
                    navigator.clipboard.writeText("docker-compose up -d");
                    toast.success("Command copied!");
                  }}
                  data-testid="copy-docker-cmd-btn"
                >
                  Copy Docker Command
                </Button>
              </div>
            </div>
            <div className="mt-4 p-4 bg-background/50 rounded-sm border border-white/10">
              <pre className="font-mono text-xs text-muted-foreground overflow-x-auto">
{`# Quick Start
git clone https://github.com/bricscoin26/Bricscoin26.git
cd Bricscoin26
docker-compose up -d

# Your node will sync with the network automatically!`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
