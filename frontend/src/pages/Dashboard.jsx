import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Coins, 
  Blocks, 
  Activity, 
  TrendingUp, 
  Clock,
  ChevronRight,
  Pickaxe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { getNetworkStats, getBlocks } from "../lib/api";
import { motion } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";

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

function BlockRow({ block, index, t }) {
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
            <p className="font-mono text-sm">{t('block')} #{block.index}</p>
            <p className="text-xs text-muted-foreground font-mono hash-truncate">
              {block.hash}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm">{block.transactions?.length || 0} {t('txs')}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(block.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>
    </motion.div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, blocksRes] = await Promise.all([
          getNetworkStats(),
          getBlocks(5),
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
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black gold-text mb-4">
          {t('heroTitle')}
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
          {t('heroSubtitle')}
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Link to="/mining">
            <Button className="gold-button rounded-sm">
              <Pickaxe className="w-4 h-4 mr-2" />
              {t('startMining')}
            </Button>
          </Link>
          <Link to="/wallet">
            <Button variant="outline" className="rounded-sm border-white/20">
              {t('createWallet')}
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Coins}
          title={t('circulatingSupply')}
          value={`${stats?.circulating_supply?.toLocaleString() || 0} BRICS`}
          subtitle={`${t('ofMax').replace('{max}', (21000000).toLocaleString())}`}
          delay={0}
        />
        <StatCard
          icon={TrendingUp}
          title={t('remainingSupply')}
          value={`${stats?.remaining_supply?.toLocaleString() || 0} BRICS`}
          subtitle={`${t('ofMax').replace('{max}', (21000000).toLocaleString())}`}
          delay={1}
        />
        <StatCard
          icon={Blocks}
          title={t('totalBlocks')}
          value={stats?.total_blocks?.toLocaleString() || 0}
          subtitle={`${t('difficulty')}: ${stats?.current_difficulty || 0}`}
          delay={2}
        />
        <StatCard
          icon={Activity}
          title={t('pendingTransactions')}
          value={stats?.pending_transactions || 0}
          subtitle={t('inMempool')}
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
            title={t('blockReward')}
            value={`${stats?.current_reward || 50} BRICS`}
            subtitle={`${t('nextHalving')} ${stats?.next_halving_block?.toLocaleString() || 210000}`}
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
              <CardTitle className="flex items-center gap-2 font-heading">
                <Clock className="w-5 h-5 text-primary" />
                {t('recentBlocks')}
              </CardTitle>
              <Link to="/explorer">
                <Button variant="ghost" size="sm" className="text-primary">
                  {t('viewAll')} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {blocks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {t('noBlocksYet')}
              </div>
            ) : (
              blocks.map((block, idx) => (
                <BlockRow key={block.index} block={block} index={idx} t={t} />
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Network Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-card border-white/10 h-full">
            <CardContent className="p-6">
              <h3 className="font-heading font-bold text-lg mb-4">{t('halvingSchedule')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('currentReward')}</span>
                  <span className="font-mono text-primary">{stats?.current_reward || 50} BRICS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('blocksUntilHalving')}</span>
                  <span className="font-mono">{((stats?.next_halving_block || 210000) - (stats?.total_blocks || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('halvingInterval')}</span>
                  <span className="font-mono">210,000 {t('block').toLowerCase()}s</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-card border-white/10 h-full">
            <CardContent className="p-6">
              <h3 className="font-heading font-bold text-lg mb-4">{t('miningInfo')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('algorithm')}</span>
                  <span className="font-mono text-primary">SHA256</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('currentDifficulty')}</span>
                  <span className="font-mono">{stats?.current_difficulty || 4}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('targetBlockTime')}</span>
                  <span className="font-mono">10 {t('minutes')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
