import { useEffect, useState } from "react";
import { 
  Trophy, 
  Wallet, 
  TrendingUp, 
  Users,
  RefreshCw,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function RichList() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(null);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/richlist?limit=100`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching rich list:", error);
      toast.error("Error loading the Rich List");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success("Address copied!");
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const shortenAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 12)}...${address.slice(-8)}`;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-orange-600";
    return "text-muted-foreground";
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) {
      return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          rank === 1 ? "bg-yellow-500/20" : 
          rank === 2 ? "bg-gray-400/20" : 
          "bg-orange-600/20"
        }`}>
          <Trophy className={`w-4 h-4 ${getRankColor(rank)}`} />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">{rank}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="richlist-loading">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">Rich List</h1>
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 bg-card" />
          ))}
        </div>
        <Card className="bg-card border-white/10">
          <CardContent className="p-0">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 m-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="richlist-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Rich List</h1>
          <p className="text-muted-foreground">Wallet ranking by BRICS balance</p>
        </div>
        <Button
          variant="outline"
          className="border-white/20"
          onClick={handleRefresh}
          disabled={refreshing}
          data-testid="refresh-richlist-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-card border-white/10" data-testid="stat-holders">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Holders Totali</p>
                  <p className="text-2xl font-heading font-bold">{data?.total_holders || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Wallets with balance &gt; 0</p>
                </div>
                <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-primary/20 text-primary">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-white/10" data-testid="stat-circulating">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Supply Circolante</p>
                  <p className="text-2xl font-heading font-bold">
                    {data?.circulating_supply?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">BRICS in circolazione</p>
                </div>
                <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-secondary/20 text-secondary">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-white/10" data-testid="stat-top-wallet">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Top Wallet</p>
                  <p className="text-2xl font-heading font-bold gold-text">
                    {data?.wallets?.[0]?.balance?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data?.wallets?.[0]?.percentage || 0}% del circolante
                  </p>
                </div>
                <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-yellow-500/20 text-yellow-500">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Rich List Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-card border-white/10" data-testid="richlist-table">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-heading flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Top 100 Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-sm text-muted-foreground font-medium">
              <div className="col-span-1">#</div>
              <div className="col-span-5 md:col-span-6">Indirizzo</div>
              <div className="col-span-4 md:col-span-3 text-right">Bilancio</div>
              <div className="col-span-2 text-right">%</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-white/5">
              {data?.wallets?.map((wallet, idx) => (
                <motion.div
                  key={wallet.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="grid grid-cols-12 gap-4 p-4 items-center table-row-hover"
                  data-testid={`wallet-row-${wallet.rank}`}
                >
                  <div className="col-span-1">
                    {getRankIcon(wallet.rank)}
                  </div>
                  <div className="col-span-5 md:col-span-6">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/explorer?search=${wallet.address}`}
                        className="font-mono text-sm hover:text-primary transition-colors"
                      >
                        <span className="hidden md:inline">{wallet.address}</span>
                        <span className="md:hidden">{shortenAddress(wallet.address)}</span>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-50 hover:opacity-100"
                        onClick={() => copyAddress(wallet.address)}
                      >
                        {copiedAddress === wallet.address ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-3 text-right">
                    <span className={`font-mono font-bold ${wallet.rank <= 3 ? "gold-text" : ""}`}>
                      {wallet.balance.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground ml-1 text-xs">BRICS</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm text-muted-foreground">
                      {wallet.percentage}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {(!data?.wallets || data.wallets.length === 0) && (
              <div className="p-8 text-center text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No wallets found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Info */}
      <Card className="bg-card border-white/10">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            The Rich List shows the top 100 wallets by BRICS balance. 
            Data is updated automatically every minute.
            Click on an address to view details in the Explorer.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
