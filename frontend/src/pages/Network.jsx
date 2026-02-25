import { useEffect, useState } from "react";
import {
  Globe, Server, Users, RefreshCw, Shield, Activity,
  Blocks, Copy, Pickaxe, Link as LinkIcon, Wifi, WifiOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getNetworkStats, getNodeInfo, getPeers } from "../lib/api";

export default function Network() {
  const [stats, setStats] = useState(null);
  const [nodeInfo, setNodeInfo] = useState(null);
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, nodeRes, peersRes] = await Promise.all([
        getNetworkStats(),
        getNodeInfo().catch(() => ({ data: null })),
        getPeers().catch(() => ({ data: { peers: [] } })),
      ]);
      setStats(statsRes.data);
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

  if (loading) {
    return (
      <div className="space-y-6" data-testid="network-loading">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-card rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalNodes = 1 + peers.length; // seed + peers
  const onlinePeers = peers.filter(p => 
    p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < 600000
  ).length;

  return (
    <div className="space-y-6" data-testid="network-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">P2P Network</h1>
          <p className="text-muted-foreground text-sm">
            Decentralized node network — real-time status
          </p>
        </div>
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

      {/* Network Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Globe,
            title: "Active Nodes",
            value: totalNodes,
            sub: `${onlinePeers} peer${onlinePeers !== 1 ? "s" : ""} + seed`,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            icon: Blocks,
            title: "Chain Height",
            value: stats?.total_blocks?.toLocaleString() || "0",
            sub: "Blocks mined",
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            icon: Shield,
            title: "Difficulty",
            value: stats?.current_difficulty?.toLocaleString() || "-",
            sub: "Current target",
            color: "text-orange-400",
            bg: "bg-orange-500/10",
          },
          {
            icon: Activity,
            title: "Protocol",
            value: "v2.0",
            sub: "P2P enabled",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
        ].map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="bg-card border-white/10" data-testid={`stat-${s.title.toLowerCase().replace(/\s/g, "-")}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{s.title}</p>
                    <p className="text-xl font-heading font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-sm ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Seed Node Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-card border-white/10" data-testid="node-info-card">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Seed Node
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Node ID</p>
                <p className="font-mono text-sm text-primary font-bold">
                  {nodeInfo?.node_id || "mainnet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Version</p>
                <p className="font-mono text-sm">{nodeInfo?.version || "2.0.0"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Chain Height</p>
                <p className="font-mono text-sm">
                  {(nodeInfo?.chain_height || nodeInfo?.blocks_height || stats?.total_blocks || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Connected Peers</p>
                <p className="font-mono text-sm text-emerald-400">
                  {nodeInfo?.connected_peers || peers.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Connected Peers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-card border-white/10" data-testid="peers-card">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Network Nodes ({totalNodes})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {/* Main Seed Node */}
              <div
                className="flex items-center justify-between p-4 bg-primary/5"
                data-testid="peer-seed-node"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-sm text-primary font-bold">mainnet</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      https://bricscoin26.org
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="hidden sm:block">
                    <p className="text-xs text-muted-foreground">Height</p>
                    <p className="font-mono text-sm">{stats?.total_blocks?.toLocaleString() || "..."}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs text-muted-foreground">Version</p>
                    <p className="font-mono text-sm">v2.0.0</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Seed Node
                  </span>
                </div>
              </div>
              {/* Stratum Pool */}
              <div
                className="flex items-center justify-between p-4 bg-orange-500/5"
                data-testid="peer-stratum-pool"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-orange-500/20 flex items-center justify-center">
                    <Pickaxe className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-mono text-sm text-orange-500">Stratum Mining Pool</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      stratum+tcp://stratum.bricscoin26.org:3333
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-orange-500/20 text-orange-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  Mining
                </span>
              </div>
              {/* Dynamic Peers */}
              {peers.map((peer, idx) => {
                const isRecent = peer.last_seen &&
                  (Date.now() - new Date(peer.last_seen).getTime()) < 600000;
                return (
                  <div
                    key={peer.node_id || idx}
                    className="flex items-center justify-between p-4"
                    data-testid={`peer-${peer.node_id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-secondary/20 flex items-center justify-center">
                        {isRecent ? (
                          <Wifi className="w-5 h-5 text-secondary" />
                        ) : (
                          <WifiOff className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-mono text-sm">{peer.node_id?.slice(0, 12) || "unknown"}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px] sm:max-w-none">
                          {peer.url || "URL not shared"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {peer.height > 0 && (
                        <div className="hidden sm:block">
                          <p className="text-xs text-muted-foreground">Height</p>
                          <p className="font-mono text-sm">{peer.height?.toLocaleString()}</p>
                        </div>
                      )}
                      {peer.version && (
                        <div className="hidden sm:block">
                          <p className="text-xs text-muted-foreground">Version</p>
                          <p className="font-mono text-sm">v{peer.version}</p>
                        </div>
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium ${
                        isRecent
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-zinc-500/20 text-zinc-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isRecent ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"
                        }`} />
                        {isRecent ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {peers.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No external peers connected yet. Run your own node to join the network!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* How P2P Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="bg-card border-white/10" data-testid="p2p-explainer">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" />
              How P2P Works
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  title: "Download & Start",
                  desc: "Clone the repo and run docker compose up. Your node downloads and validates the entire blockchain.",
                },
                {
                  step: "2",
                  title: "Auto-Connect",
                  desc: "Your node registers with the seed node and discovers all other peers automatically.",
                },
                {
                  step: "3",
                  title: "Validate & Propagate",
                  desc: "New blocks are validated independently and propagated to all connected nodes in real-time.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-heading font-bold text-primary">{item.step}</span>
                  </div>
                  <div>
                    <p className="font-heading font-bold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Run Your Node CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30" data-testid="run-node-cta">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-bold text-lg gold-text">Run Your Own Full Node</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Help decentralize BricsCoin! Your node syncs, validates, and connects to the P2P network automatically.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-white/20"
                onClick={() => {
                  navigator.clipboard.writeText("git clone https://codeberg.org/Bricscoin_26/Bricscoin.git && cd Bricscoin/bricscoin-node && cp .env.example .env && docker compose up -d");
                  toast.success("Command copied!");
                }}
                data-testid="copy-docker-cmd-btn"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Setup Command
              </Button>
            </div>
            <div className="mt-4 p-4 bg-background/50 rounded-sm border border-white/10">
              <pre className="font-mono text-xs text-muted-foreground overflow-x-auto">
{`# BRICScoin Full Node v2.0 — Quick Start
git clone https://codeberg.org/Bricscoin_26/Bricscoin.git
cd Bricscoin/bricscoin-node
cp .env.example .env

# Set your public URL in .env for P2P discovery:
# NODE_URL=https://your-node.example.com

docker compose up -d

# Your node will automatically:
#   Sync the entire blockchain
#   Register with the P2P network
#   Validate all blocks independently
#   Stay in sync with new blocks`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
