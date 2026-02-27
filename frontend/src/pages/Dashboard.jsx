import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Coins, Blocks, Activity, TrendingUp, Clock, ChevronRight, Pickaxe,
  ShieldCheck, Lock, Atom, MessageCircle, FileText, MessageSquareLock,
  Send, Sprout, Eye, Shield, Award, Brain, HardDrive
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay * 0.1, duration: 0.3 }}>
      <Card className="bg-card border-white/10 card-hover stat-shine">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <p className="text-2xl font-heading font-bold">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
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
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05, duration: 0.2 }}>
      <Link to={`/block/${block.index}`} className="flex items-center justify-between p-4 border-b border-white/5 table-row-hover">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
            <Blocks className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Block #{block.index}</p>
            <p className="text-sm text-muted-foreground font-mono">{block.hash?.substring(0, 16)}...</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />{new Date(block.timestamp).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">{block.transactions?.length || 0} txs</p>
        </div>
      </Link>
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
          getNetworkStats(), getBlocks(5),
          getPQCStats().catch(() => null), getPQCNodeKeys().catch(() => null),
          getChatFeed(8).catch(() => null), getChatStats().catch(() => null),
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
            <Card key={i} className="bg-card border-white/10"><CardContent className="p-6"><Skeleton className="h-20 bg-muted/20" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const pqcBlocks = pqcStats?.total_pqc_blocks || 0;
  const totalBlocks = pqcStats?.total_blocks || 1;
  const pqcPercent = totalBlocks > 0 ? ((pqcBlocks / totalBlocks) * 100).toFixed(1) : 0;
  const isActive = pqcStats?.status === "active";

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* ==================== HERO ==================== */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          <Link to="/about">
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 cursor-pointer px-3 py-1" data-testid="security-audit-badge">
              <ShieldCheck className="w-4 h-4 mr-2" />Security Audit Passed
            </Badge>
          </Link>
          <Link to="/wallet">
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer px-3 py-1" data-testid="quantum-safe-badge">
              <Atom className="w-4 h-4 mr-2" />Post-Quantum
            </Badge>
          </Link>
          <Link to="/threat-model">
            <Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 cursor-pointer px-3 py-1" data-testid="threat-model-badge">
              <Shield className="w-4 h-4 mr-2" />Threat Model
            </Badge>
          </Link>
        </div>
        <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text mb-4">BRICSCOIN</h1>
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
        <p className="text-sm text-muted-foreground mb-6">2 February 2026 &middot; Author: Jabo86</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild className="gold-button rounded-sm" data-testid="start-mining-btn">
            <Link to="/blockchain"><Pickaxe className="w-4 h-4 mr-2" />Mining Info</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 rounded-sm" data-testid="create-wallet-btn">
            <Link to="/wallet"><ShieldCheck className="w-4 h-4 mr-2" />Create PQC Wallet</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 rounded-sm" data-testid="whitepaper-btn">
            <Link to="/whitepaper"><FileText className="w-4 h-4 mr-2" />Whitepaper</Link>
          </Button>
        </div>
      </motion.div>

      {/* ==================== CHAIN STATS ==================== */}
      {/* ==================== LAYER 1: CORE PROTOCOL ==================== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 px-2 py-0.5 rounded bg-primary/5 border border-primary/10">Layer 1</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Core Protocol</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">SHA-256 Proof-of-Work &middot; Post-Quantum Signatures &middot; Privacy by Design</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Coins} title="Circulating Supply" value={`${stats?.circulating_supply?.toLocaleString() || 0} BRICS`} subtitle={`of ${(21000000).toLocaleString()} max`} delay={0} />
        <StatCard icon={TrendingUp} title="Remaining to Mine" value={`${stats?.remaining_supply?.toLocaleString() || 0} BRICS`} subtitle={`of ${(21000000).toLocaleString()} max`} delay={1} />
        <StatCard icon={Blocks} title="Total Blocks" value={stats?.total_blocks?.toLocaleString() || 0} subtitle={`Difficulty: ${stats?.current_difficulty || 0}`} delay={2} />
        <StatCard icon={Pickaxe} title="Block Reward" value={`${stats?.current_reward || 50} BRICS`} subtitle={`Next halving: Block ${stats?.next_halving_block?.toLocaleString() || 210000}`} delay={3} />
      </div>

      {/* ==================== LAYER 2: NETWORK & PRIVACY ==================== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 px-2 py-0.5 rounded bg-emerald-500/5 border border-emerald-500/10">Layer 2</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Security & Privacy</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Quantum-Resistant Signatures &middot; Dandelion++ &middot; Tor &middot; SPV Light Client</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quantum Security */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="bg-card border-white/10 overflow-hidden relative h-full" data-testid="quantum-security-widget">
            <div className="absolute inset-0 opacity-[0.03]" style={{ background: "radial-gradient(ellipse at 30% 50%, #10b981, transparent 70%)" }} />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-sm bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base">Quantum Security</h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                    <span className="text-xs text-muted-foreground">{isActive ? "ML-DSA-65 Active" : "Inactive"}</span>
                  </div>
                </div>
              </div>
              <div className="mb-5">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">PQC Block Coverage</span>
                  <span className="text-2xl font-heading font-bold text-emerald-400">{pqcPercent}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pqcPercent, 100)}%` }} transition={{ delay: 0.5, duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{pqcBlocks.toLocaleString()} / {totalBlocks.toLocaleString()} blocks signed</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1"><Lock className="w-3.5 h-3.5 text-emerald-400/70" /><span className="text-xs text-muted-foreground">Wallets</span></div>
                  <p className="text-lg font-bold">{pqcStats?.total_pqc_wallets?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5 text-emerald-400/70" /><span className="text-xs text-muted-foreground">PQC Txs</span></div>
                  <p className="text-lg font-bold">{pqcStats?.total_pqc_transactions?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1"><Atom className="w-3.5 h-3.5 text-emerald-400/70" /><span className="text-xs text-muted-foreground">Scheme</span></div>
                  <p className="text-xs font-medium leading-tight mt-0.5">ECDSA + ML-DSA-65</p>
                </div>
              </div>
              <div className="mt-4">
                <Button asChild variant="outline" size="sm" className="w-full border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 rounded-sm" data-testid="quantum-wallet-cta">
                  <Link to="/wallet"><ShieldCheck className="w-4 h-4 mr-2" />Quantum-Resistant Wallet<ChevronRight className="w-4 h-4 ml-auto" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dandelion++ Network Privacy */}
        {dandelion && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-card border-white/10 overflow-hidden relative h-full" data-testid="dandelion-monitor">
              <div className="absolute inset-0 opacity-[0.03]" style={{ background: "radial-gradient(ellipse at 70% 50%, #10b981, transparent 70%)" }} />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-sm bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                    <Sprout className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base">Dandelion++ Privacy</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Active — Reducing TX origin exposure</span>
                    </div>
                  </div>
                </div>

                {/* Pipeline */}
                <div className="flex items-center gap-1.5 mb-5 p-3 rounded-sm bg-white/[0.02] border border-white/[0.06]">
                  {[
                    { icon: Send, label: "New TX", sub: "", color: "amber" },
                    { icon: Sprout, label: "Stem", sub: "single relay", color: "emerald" },
                    { icon: Sprout, label: "Random Hops", sub: "1-N relays", color: "emerald" },
                    { icon: Activity, label: "Diffusion", sub: "all peers", color: "cyan" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5 flex-1">
                      {i > 0 && <div className="text-muted-foreground/30 text-xs">→</div>}
                      <div className="text-center flex-1">
                        <div className={`w-8 h-8 rounded-full bg-${step.color}-500/15 flex items-center justify-center mx-auto mb-1 border border-${step.color}-500/20`}>
                          <step.icon className={`w-3.5 h-3.5 text-${step.color}-400`} />
                        </div>
                        <p className={`text-[9px] text-${step.color}-400 font-bold`}>{step.label}</p>
                        {step.sub && <p className="text-[8px] text-muted-foreground">{step.sub}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5 text-center">
                    <p className="text-lg font-bold text-emerald-400">~{Math.round(dandelion.config.stem_probability * 100)}%</p>
                    <p className="text-[9px] text-muted-foreground">Stem Routing</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-sm p-3 border border-white/5 text-center">
                    <p className="text-lg font-bold text-cyan-400">Active</p>
                    <p className="text-[9px] text-muted-foreground">Status</p>
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
                <div className="mt-4">
                  <Button asChild variant="outline" size="sm" className="w-full border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 rounded-sm" data-testid="dandelion-network-cta">
                    <Link to="/network"><Sprout className="w-4 h-4 mr-2" />Protocol Details<ChevronRight className="w-4 h-4 ml-auto" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Privacy Modes Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Safe", desc: "Standard PQC transaction", icon: ShieldCheck, color: "emerald", tab: "pqc", features: "Quantum-resistant, fast, low fees" },
            { label: "Strong Privacy", desc: "Shielded zk-STARK", icon: Eye, color: "violet", tab: "zk", features: "Hidden amounts, verifiable proofs" },
            { label: "Maximum Privacy", desc: "Ring + Stealth + Hidden", icon: Lock, color: "red", tab: "privacy", features: "Sender, recipient & amount protected" },
          ].map((mode, i) => (
            <Link key={i} to={`/wallet?tab=${mode.tab}`} className={`p-4 rounded-sm border border-${mode.color}-500/20 bg-${mode.color}-500/5 hover:bg-white/[0.04] transition-all group`} data-testid={`dash-mode-${mode.label.toLowerCase().replace(/ /g, "-")}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <mode.icon className={`w-5 h-5 text-${mode.color}-400`} />
                <span className="font-bold text-sm">{mode.label}</span>
                <div className="ml-auto flex gap-0.5">
                  {[1, 2, 3].map(j => (
                    <div key={j} className={`w-1.5 h-3 rounded-sm ${j <= i + 1 ? `bg-${mode.color}-400` : "bg-white/10"}`} />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">{mode.desc}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{mode.features}</p>
            </Link>
          ))}
        </div>
        <div className="flex gap-3 mt-3">
          <Button asChild variant="outline" size="sm" className="border-white/10 text-xs">
            <Link to="/wallet"><Lock className="w-3.5 h-3.5 mr-1.5" />Send with Privacy</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="border-white/10 text-xs">
            <Link to="/threat-model"><Shield className="w-3.5 h-3.5 mr-1.5" />Threat Model</Link>
          </Button>
        </div>
      </motion.div>

      {/* ==================== BLOCKCHAIN ==================== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="bg-card border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading">Recent Blocks</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-primary">
                <Link to="/blockchain">View All<ChevronRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {blocks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No blocks mined yet. Be the first to mine!</div>
            ) : blocks.map((block, index) => <BlockRow key={block.index} block={block} index={index} />)}
          </CardContent>
        </Card>
      </motion.div>

      {/* ==================== COMMUNITY & APPS ==================== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-heading font-bold">Community & On-Chain Apps</h2>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BricsChat Feed */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="bg-card border-white/10 h-full" data-testid="bricschat-global-feed">
            <CardHeader className="border-b border-white/10 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading flex items-center gap-2 text-base">
                  <MessageSquareLock className="w-5 h-5 text-primary" />BricsChat Live
                </CardTitle>
                <div className="flex items-center gap-2">
                  {chatStats && <Badge variant="outline" className="border-primary/30 text-primary text-xs">{chatStats.total_messages} msg</Badge>}
                  <Button asChild variant="ghost" size="sm" className="text-primary"><Link to="/chat"><Send className="w-3 h-3 mr-1" />Join</Link></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {chatFeed.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquareLock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3 border-primary/30 text-primary"><Link to="/chat">Start Chatting</Link></Button>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {chatFeed.map((msg) => {
                    let decoded = "[Encrypted]";
                    try { const bytes = msg.encrypted_content.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || []; decoded = new TextDecoder().decode(new Uint8Array(bytes)); } catch {}
                    const senderShort = msg.sender_address ? `${msg.sender_address.slice(0, 10)}...${msg.sender_address.slice(-4)}` : "?";
                    return (
                      <div key={msg.id} className="flex items-start gap-3 p-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors" data-testid={`feed-msg-${msg.id}`}>
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /></div>
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
        </motion.div>

        {/* Apps Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <Card className="bg-card border-white/10 h-full" data-testid="network-activity-feed">
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="font-heading flex items-center gap-2 text-base"><Activity className="w-5 h-5 text-green-400" />On-Chain Apps</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {[
                { icon: MessageSquareLock, label: "BricsChat", desc: "PQC-encrypted on-chain messaging", stat: chatStats?.total_messages ?? 0, sub: `${chatStats?.unique_users ?? 0} users`, color: "primary", to: "/chat" },
                { icon: Clock, label: "Time Capsules", desc: "Decentralized time-locked storage", stat: capsuleStats?.total_capsules ?? 0, sub: `${capsuleStats?.locked ?? 0} locked`, color: "blue-400", to: "/timecapsule" },
                { icon: Brain, label: "AI Oracle", desc: "Off-chain advisory oracle (does not influence consensus)", stat: "", sub: "Query data", color: "violet-400", to: "/oracle" },
                { icon: Award, label: "BricsNFT", desc: "PQC-signed on-chain certificates", stat: "", sub: "Mint & verify", color: "amber-400", to: "/nft" },
              ].map((app, i) => (
                <Link key={i} to={app.to} className={`flex items-center gap-4 p-3 bg-${app.color === "primary" ? "primary" : app.color.split("-")[0]}-500/5 rounded border border-${app.color === "primary" ? "primary" : app.color.split("-")[0]}-500/15 hover:bg-white/[0.04] transition-colors`} data-testid={`app-card-${app.label.toLowerCase().replace(/ /g, "-")}`}>
                  <app.icon className={`w-7 h-7 text-${app.color} flex-shrink-0`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{app.label}</p>
                    <p className="text-xs text-muted-foreground">{app.desc}</p>
                  </div>
                  {app.stat !== "" && (
                    <div className="text-right">
                      <p className={`text-lg font-bold text-${app.color}`}>{app.stat}</p>
                      <p className="text-xs text-muted-foreground">{app.sub}</p>
                    </div>
                  )}
                  {app.stat === "" && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ==================== LEGAL + EXPLORERS ==================== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="flex justify-center items-center gap-8">
        <a href="https://blockspot.io/coin/bricscoin/" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" data-testid="blockspot-explorer-link">
          <img src="/blockspot-logo.png" alt="BricsCoin on Blockspot.io" className="h-12 w-auto" />
        </a>
        <a href="https://www.coincarp.com/currencies/bricscoin/" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" data-testid="coincarp-explorer-link">
          <img src="/coincarp-logo.png" alt="BricsCoin on CoinCarp" className="h-12 w-auto" />
        </a>
      </motion.div>
    </div>
  );
}
