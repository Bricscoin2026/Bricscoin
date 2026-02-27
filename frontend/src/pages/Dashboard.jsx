import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Coins, 
  Blocks, 
  Activity, 
  TrendingUp, 
  Clock,
  ChevronRight,
  Pickaxe,
  ShieldCheck,
  Lock,
  Atom,
  MessageCircle,
  FileText,
  MessageSquareLock,
  Send,
  Sprout
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { getNetworkStats, getBlocks, getPQCStats, getPQCNodeKeys, getChatStats, getChatFeed, getTimeCapsuleStats } from "../lib/api";
import api from "../lib/api";
import { motion } from "framer-motion";

function StatCard({ icon: Icon, title, value, subtitle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
    >
      <Card className="bg-card border-white/10 card-hover stat-shine">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <p className="text-2xl font-heading font-bold">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BlockRow({ block, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <Link
        to={`/block/${block.index}`}
        className="flex items-center justify-between p-4 border-b border-white/5 table-row-hover"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
            <Blocks className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Block #{block.index}</p>
            <p className="text-sm text-muted-foreground font-mono">
              {block.hash?.substring(0, 16)}...
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(block.timestamp).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {block.transactions?.length || 0} txs
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

function QuantumSecurityWidget({ pqcStats, nodeKeys, delay = 0 }) {
  const pqcBlocks = pqcStats?.total_pqc_blocks || 0;
  const totalBlocks = pqcStats?.total_blocks || 1;
  const pqcPercent = totalBlocks > 0 ? ((pqcBlocks / totalBlocks) * 100).toFixed(1) : 0;
  const isActive = pqcStats?.status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
    >
      <Card className="bg-card border-white/10 overflow-hidden relative" data-testid="quantum-security-widget">
        {/* Subtle animated background glow */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          background: "radial-gradient(ellipse at 30% 50%, #10b981, transparent 70%)"
        }} />

        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-sm bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base">Quantum Security</h3>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                <span className="text-xs text-muted-foreground">
                  {isActive ? "ML-DSA-65 Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* PQC Block Coverage */}
          <div className="mb-5">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">PQC Block Coverage</span>
              <span className="text-2xl font-heading font-bold text-emerald-400">{pqcPercent}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pqcPercent, 100)}%` }}
                transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {pqcBlocks.toLocaleString()} / {totalBlocks.toLocaleString()} blocks signed
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400/70" />
                <span className="text-xs text-muted-foreground">Wallets</span>
              </div>
              <p className="text-lg font-bold">{pqcStats?.total_pqc_wallets?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400/70" />
                <span className="text-xs text-muted-foreground">PQC Txs</span>
              </div>
              <p className="text-lg font-bold">{pqcStats?.total_pqc_transactions?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Atom className="w-3.5 h-3.5 text-emerald-400/70" />
                <span className="text-xs text-muted-foreground">Scheme</span>
              </div>
              <p className="text-xs font-medium leading-tight mt-0.5">ECDSA + ML-DSA-65</p>
            </div>
          </div>

          {/* Node ID */}
          {nodeKeys?.node_id && (
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Node</span>
              <span className="text-xs font-mono text-muted-foreground/80">{nodeKeys.node_id}</span>
            </div>
          )}

          {/* CTA */}
          <div className="mt-4">
            <Button asChild variant="outline" size="sm" className="w-full border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 rounded-sm" data-testid="quantum-wallet-cta">
              <Link to="/wallet">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Quantum-Safe Wallet
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [pqcStats, setPqcStats] = useState(null);
  const [nodeKeys, setNodeKeys] = useState(null);
  const [chatFeed, setChatFeed] = useState([]);
  const [chatStats, setChatStats] = useState(null);
  const [capsuleStats, setCapsuleStats] = useState(null);
  const [dandelion, setDandelion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, blocksRes, pqcRes, nodeRes, feedRes, chatStatsRes, capsuleRes] = await Promise.all([
          getNetworkStats(),
          getBlocks(5),
          getPQCStats().catch(() => null),
          getPQCNodeKeys().catch(() => null),
          getChatFeed(8).catch(() => null),
          getChatStats().catch(() => null),
          getTimeCapsuleStats().catch(() => null),
        ]);
        setStats(statsRes.data);
        setBlocks(blocksRes.data?.blocks || []);
        if (pqcRes) setPqcStats(pqcRes.data);
        if (nodeRes) setNodeKeys(nodeRes.data);
        if (feedRes) setChatFeed(feedRes.data?.messages || []);
        if (chatStatsRes) setChatStats(chatStatsRes.data);
        if (capsuleRes) setCapsuleStats(capsuleRes.data);
        api.get("/dandelion/status").then(r => setDandelion(r.data)).catch(() => {});
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border-white/10">
              <CardContent className="p-6">
                <Skeleton className="h-20 bg-muted/20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <div className="flex justify-center gap-3 mb-4">
          <Link to="/about">
            <Badge 
              className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 cursor-pointer px-3 py-1"
              data-testid="security-audit-badge"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Security Audit Passed
            </Badge>
          </Link>
          <Link to="/wallet">
            <Badge 
              className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer px-3 py-1"
              data-testid="quantum-safe-badge"
            >
              <Atom className="w-4 h-4 mr-2" />
              Quantum-Safe
            </Badge>
          </Link>
        </div>
        <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text mb-4">
          BRICSCOIN
        </h1>
        <p className="text-sm font-medium text-primary/80 tracking-wide mb-3">
          <span className="text-lg font-bold text-primary">B</span>lockchain{" "}
          <span className="text-lg font-bold text-primary">R</span>esilient{" "}
          <span className="text-lg font-bold text-primary">I</span>nfrastructure for{" "}
          <span className="text-lg font-bold text-primary">C</span>ryptographic{" "}
          <span className="text-lg font-bold text-primary">S</span>ecurity &mdash;{" "}
          <span className="text-lg font-bold text-primary">C</span>ertified{" "}
          <span className="text-lg font-bold text-primary">O</span>pen{" "}
          <span className="text-lg font-bold text-primary">I</span>nnovation{" "}
          <span className="text-lg font-bold text-primary">N</span>etwork
        </p>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
          A Decentralized SHA256 Proof-of-Work Cryptocurrency with Post-Quantum Security
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          2 February 2026 &middot; Author: Jabo86
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild className="gold-button rounded-sm" data-testid="start-mining-btn">
            <Link to="/blockchain">
              <Pickaxe className="w-4 h-4 mr-2" />
              Mining Info
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 rounded-sm" data-testid="create-wallet-btn">
            <Link to="/wallet">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Create PQC Wallet
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 rounded-sm" data-testid="community-chat-btn">
            <Link to="/chat">
              <MessageCircle className="w-4 h-4 mr-2" />
              Community Chat
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 rounded-sm" data-testid="whitepaper-btn">
            <Link to="/whitepaper">
              <FileText className="w-4 h-4 mr-2" />
              Whitepaper
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Coins}
          title="Circulating Supply"
          value={`${stats?.circulating_supply?.toLocaleString() || 0} BRICS`}
          subtitle={`of ${(21000000).toLocaleString()} max`}
          delay={0}
        />
        <StatCard
          icon={TrendingUp}
          title="Remaining to Mine"
          value={`${stats?.remaining_supply?.toLocaleString() || 0} BRICS`}
          subtitle={`of ${(21000000).toLocaleString()} max`}
          delay={1}
        />
        <StatCard
          icon={Blocks}
          title="Total Blocks"
          value={stats?.total_blocks?.toLocaleString() || 0}
          subtitle={`Difficulty: ${stats?.current_difficulty || 0}`}
          delay={2}
        />
        <StatCard
          icon={Activity}
          title="Pending Transactions"
          value={stats?.pending_transactions || 0}
          subtitle="In mempool"
          delay={3}
        />
      </div>

      {/* Block Reward + Quantum Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <StatCard
            icon={Pickaxe}
            title="Block Reward"
            value={`${stats?.current_reward || 50} BRICS`}
            subtitle={`Next halving: Block ${stats?.next_halving_block?.toLocaleString() || 210000}`}
            delay={0}
          />
        </motion.div>
        <QuantumSecurityWidget pqcStats={pqcStats} nodeKeys={nodeKeys} delay={4} />
      </div>

      {/* Dandelion++ Live Monitor */}
      {dandelion && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.37 }}>
          <Card className="bg-card border-white/10 overflow-hidden relative" data-testid="dandelion-monitor">
            <div className="absolute inset-0 opacity-[0.03]" style={{ background: "radial-gradient(ellipse at 70% 50%, #10b981, transparent 70%)" }} />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-sm bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                    <Sprout className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base">Dandelion++ Network Privacy</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Active — Reducing TX origin exposure</span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  ACTIVE
                </Badge>
              </div>

              {/* Visual Pipeline — aggregate only */}
              <div className="flex items-center gap-1.5 mb-5 p-3 rounded-sm bg-white/[0.02] border border-white/[0.06]">
                <div className="flex-1 text-center">
                  <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-1 border border-amber-500/20">
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-[9px] text-muted-foreground">New TX</p>
                </div>
                <div className="text-muted-foreground/30 text-xs">→</div>
                <div className="flex-1 text-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-1 border border-emerald-500/20">
                    <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[9px] text-emerald-400 font-bold">Stem Phase</p>
                  <p className="text-[8px] text-muted-foreground">single relay</p>
                </div>
                <div className="text-muted-foreground/30 text-xs">→</div>
                <div className="flex-1 text-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-1 border border-emerald-500/20">
                    <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[9px] text-emerald-400">Random Hops</p>
                  <p className="text-[8px] text-muted-foreground">1-N relays</p>
                </div>
                <div className="text-muted-foreground/30 text-xs">→</div>
                <div className="flex-1 text-center">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/15 flex items-center justify-center mx-auto mb-1 border border-cyan-500/20">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <p className="text-[9px] text-cyan-400 font-bold">Diffusion</p>
                  <p className="text-[8px] text-muted-foreground">all peers</p>
                </div>
              </div>

              {/* Aggregate-only stats — no precise counts or timers */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5 text-center">
                  <p className="text-lg font-bold text-emerald-400">
                    {dandelion.state.total_fluffed > 0
                      ? `~${Math.round(dandelion.config.stem_probability * 100)}%`
                      : "90%"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Stem Routing Rate</p>
                </div>
                <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5 text-center">
                  <p className="text-lg font-bold text-cyan-400">
                    {dandelion.state.total_fluffed > 0 ? "Active" : "Ready"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Propagation Status</p>
                </div>
                <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5 text-center">
                  <p className="text-lg font-bold">Multi-hop</p>
                  <p className="text-[9px] text-muted-foreground">Relay Mode</p>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                Dandelion++ makes it significantly more costly for network observers to correlate transactions with originating nodes. 
                Based on <a href="https://arxiv.org/abs/1805.11060" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Fanti et al. (2018)</a>.
              </p>

              {/* CTA */}
              <div className="mt-4">
                <Button asChild variant="outline" size="sm" className="w-full border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 rounded-sm" data-testid="dandelion-network-cta">
                  <Link to="/network">
                    <Sprout className="w-4 h-4 mr-2" />
                    Protocol Details
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Blocks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-card border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading">Recent Blocks</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-primary">
                <Link to="/blockchain">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {blocks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No blocks mined yet. Be the first to mine!
              </div>
            ) : (
              blocks.map((block, index) => (
                <BlockRow key={block.index} block={block} index={index} />
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Live Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BricsChat Global Feed */}
          <Card className="bg-card border-white/10" data-testid="bricschat-global-feed">
            <CardHeader className="border-b border-white/10 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading flex items-center gap-2 text-base">
                  <MessageSquareLock className="w-5 h-5 text-primary" />
                  BricsChat Live Feed
                </CardTitle>
                <div className="flex items-center gap-2">
                  {chatStats && (
                    <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                      {chatStats.total_messages} messages
                    </Badge>
                  )}
                  <Button asChild variant="ghost" size="sm" className="text-primary">
                    <Link to="/chat">
                      <Send className="w-3 h-3 mr-1" />Join
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {chatFeed.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquareLock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No messages yet. Be the first to send a quantum-proof message!</p>
                  <Button asChild variant="outline" size="sm" className="mt-3 border-primary/30 text-primary">
                    <Link to="/chat">Start Chatting</Link>
                  </Button>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {chatFeed.map((msg) => {
                    let decoded = "[Encrypted]";
                    try {
                      const bytes = msg.encrypted_content.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || [];
                      decoded = new TextDecoder().decode(new Uint8Array(bytes));
                    } catch {}
                    const senderShort = msg.sender_address ? `${msg.sender_address.slice(0, 10)}...${msg.sender_address.slice(-4)}` : "?";
                    return (
                      <div key={msg.id} className="flex items-start gap-3 p-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors" data-testid={`feed-msg-${msg.id}`}>
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs text-primary">{senderShort}</span>
                            <span className="text-xs text-muted-foreground">Block #{msg.block_height}</span>
                          </div>
                          <p className="text-sm text-foreground/90 break-words">{decoded}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(msg.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Network Activity Summary */}
          <Card className="bg-card border-white/10" data-testid="network-activity-feed">
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="font-heading flex items-center gap-2 text-base">
                <Activity className="w-5 h-5 text-green-400" />
                Network Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Chat Stats */}
              <div className="flex items-center gap-4 p-3 bg-primary/5 rounded border border-primary/15">
                <MessageSquareLock className="w-8 h-8 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold">BricsChat</p>
                  <p className="text-xs text-muted-foreground">PQC-encrypted on-chain messaging</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold gold-text">{chatStats?.total_messages ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{chatStats?.unique_users ?? 0} users</p>
                </div>
              </div>

              {/* Time Capsule Stats */}
              <div className="flex items-center gap-4 p-3 bg-blue-500/5 rounded border border-blue-500/15">
                <Clock className="w-8 h-8 text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold">Time Capsules</p>
                  <p className="text-xs text-muted-foreground">Decentralized time-locked storage</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-400">{capsuleStats?.total_capsules ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{capsuleStats?.locked ?? 0} locked</p>
                </div>
              </div>

              {/* PQC Security */}
              <div className="flex items-center gap-4 p-3 bg-green-500/5 rounded border border-green-500/15">
                <ShieldCheck className="w-8 h-8 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold">Quantum Security</p>
                  <p className="text-xs text-muted-foreground">Hybrid ECDSA + ML-DSA-65</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-400">{pqcStats?.pqc_wallets ?? 0}</p>
                  <p className="text-xs text-muted-foreground">PQC wallets</p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button asChild variant="outline" size="sm" className="border-white/10 text-xs">
                  <Link to="/chat">BricsChat</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-white/10 text-xs">
                  <Link to="/timecapsule">Time Capsule</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-white/10 text-xs">
                  <Link to="/oracle">AI Oracle</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Disclaimer Legale */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-card/50 border-white/5" data-testid="legal-disclaimer">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Legal Disclaimer</h3>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              BRICScoin is released exclusively as free and open-source software for purely informational, experimental, and research purposes. Nothing contained in BRICScoin, in its source code, documentation, or any associated communications constitutes financial, investment, legal, tax, or any other form of advice or recommendation.
              BRICScoin is not an investment, a financial instrument, a security, a share, a derivative, or any product or contract of a financial or investment nature. No tokens are offered, sold, or distributed; no funds are raised (via ICO, presale, or otherwise); and no economic returns, profits, or value appreciation are promised, guaranteed, or implied in any way.
              The creator and contributors do not manage, control, promote, endorse, or have any affiliation with markets, exchanges, trading platforms, wallets, or third-party services that may independently choose to list, trade, or reference BRICScoin. Any listing, trading, or economic use conducted by third parties occurs without the involvement, responsibility, or approval of the creator or contributors.
              Use of the software, including but not limited to running nodes, mining, validating transactions, or any other interaction with the network, is entirely voluntary and at the sole risk and responsibility of the user. Mining and interacting with cryptocurrencies involve significant risks, including but not limited to: total loss of funds, hardware damage, cybersecurity issues, extreme volatility, and potential legal, tax, or regulatory consequences.
              The software is provided "AS IS", without any warranties of any kind, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, reliability, security, or freedom from errors, bugs, or vulnerabilities. To the fullest extent permitted by law, the creator, contributors, and anyone involved in development shall not be liable, under any theory of liability, for any direct, indirect, incidental, consequential, special, punitive, or exemplary damages, including loss of profits, data, goodwill, hardware, or other intangible losses, claims, fines, penalties, or any other consequences arising from the use, misuse, malfunction, or inability to use the software or network.
              Users are solely responsible for ensuring compliance with all applicable laws, regulations, tax obligations, and restrictions in their jurisdiction, including those relating to cryptocurrencies, mining activities, taxation, anti-money laundering (AML), and "know-your-customer" (KYC) requirements.
              By accessing, downloading, compiling, running, modifying, or otherwise interacting with BRICScoin, the user acknowledges that they have read, understood, and fully accepted this disclaimer and agree to assume all risks associated with its use.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Explorer Logos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center items-center gap-8"
      >
        <a
          href="https://blockspot.io/coin/bricscoin/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
          data-testid="blockspot-explorer-link"
        >
          <img
            src="/blockspot-logo.png"
            alt="BricsCoin on Blockspot.io"
            className="h-12 w-auto"
          />
        </a>
        <a
          href="https://www.coincarp.com/currencies/bricscoin/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
          data-testid="coincarp-explorer-link"
        >
          <img
            src="/coincarp-logo.png"
            alt="BricsCoin on CoinCarp"
            className="h-12 w-auto"
          />
        </a>
      </motion.div>
    </div>
  );
}
