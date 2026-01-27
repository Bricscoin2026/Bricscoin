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
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { getNetworkStats, getBlocks } from "../lib/api";
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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, blocksRes] = await Promise.all([
          getNetworkStats(),
          getBlocks(5)
        ]);
        setStats(statsRes.data);
        setBlocks(blocksRes.data.blocks);
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
        <div className="flex justify-center mb-4">
          <Link to="/about">
            <Badge 
              className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 cursor-pointer px-3 py-1"
              data-testid="security-audit-badge"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Security Audit Passed ✓
            </Badge>
          </Link>
        </div>
        <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text mb-4">
          BRICSCOIN
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
          Decentralized cryptocurrency powered by SHA256 Proof-of-Work. Mine with ASIC hardware and join the network.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild className="gold-button rounded-sm" data-testid="start-mining-btn">
            <Link to="/mining">
              <Pickaxe className="w-4 h-4 mr-2" />
              Mining Info
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 rounded-sm" data-testid="create-wallet-btn">
            <Link to="/wallet">
              <Coins className="w-4 h-4 mr-2" />
              Create Wallet
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

      {/* Block Reward Card */}
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
      </div>

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
                <Link to="/explorer">
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

      {/* Protocol Disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-card border-yellow-500/20">
          <CardHeader className="border-b border-yellow-500/20">
            <CardTitle className="font-heading flex items-center gap-2 text-yellow-500">
              ⚠️ Protocol Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
              <div>
                <h4 className="text-primary font-bold mb-3">{"<>"} BRICScoin</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Decentralized monetary protocol</li>
                  <li>• Open-source software released publicly</li>
                  <li>• Does not represent an investment</li>
                  <li>• Does not guarantee value</li>
                  <li>• No central entity controls or manages it</li>
                  <li>• Functions only with voluntary network usage</li>
                </ul>
              </div>
              <div>
                <h4 className="text-primary font-bold mb-3">⚡ Purpose & Distribution</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Technical experiment only</li>
                  <li>• Tests peer-to-peer value transfer</li>
                  <li>• No financial or political objectives</li>
                  <li>• No pre-sale or initial allocation</li>
                  <li>• No sale of coins</li>
                  <li>• Units issued exclusively via mining</li>
                </ul>
              </div>
              <div>
                <h4 className="text-primary font-bold mb-3">◇ Markets & Responsibility</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Protocol does not require markets</li>
                  <li>• Trading is by independent third parties</li>
                  <li>• Creator does not control price or listings</li>
                  <li>• Not affiliated with any organization or state</li>
                  <li>• Use entirely at your own risk</li>
                  <li>• No guarantees or support provided</li>
                </ul>
              </div>
            </div>
            <p className="text-center text-yellow-500 font-mono mt-6 text-sm">Code is the only authority.</p>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
}
