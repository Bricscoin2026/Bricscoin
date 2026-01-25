import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Blocks, ArrowRightLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Skeleton } from "../components/ui/skeleton";
import { getBlocks, getTransactions } from "../lib/api";
import { motion } from "framer-motion";

function truncateHash(hash, length = 16) {
  if (!hash) return "";
  if (hash.length <= length * 2) return hash;
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
}

function BlocksTable({ blocks, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-16 bg-muted/20" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-testid="blocks-table">
        <thead>
          <tr className="border-b border-white/10 text-left">
            <th className="p-4 text-sm font-medium text-muted-foreground">Height</th>
            <th className="p-4 text-sm font-medium text-muted-foreground">Hash</th>
            <th className="p-4 text-sm font-medium text-muted-foreground">Miner</th>
            <th className="p-4 text-sm font-medium text-muted-foreground">Txs</th>
            <th className="p-4 text-sm font-medium text-muted-foreground">Time</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((block, idx) => (
            <motion.tr
              key={block.index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="border-b border-white/5 table-row-hover"
              data-testid={`block-${block.index}`}
            >
              <td className="p-4">
                <Link 
                  to={`/block/${block.index}`}
                  className="font-mono text-primary hover:underline"
                >
                  #{block.index}
                </Link>
              </td>
              <td className="p-4 font-mono text-sm text-muted-foreground">
                {truncateHash(block.hash)}
              </td>
              <td className="p-4 font-mono text-sm text-muted-foreground">
                {truncateHash(block.miner, 8)}
              </td>
              <td className="p-4">{block.transactions?.length || 0}</td>
              <td className="p-4 text-sm text-muted-foreground">
                {new Date(block.timestamp).toLocaleString()}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionsTable({ transactions, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-16 bg-muted/20" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-testid="transactions-table">
        <thead>
          <tr className="border-b border-white/10 text-left">
            <th className="p-4 text-sm font-medium text-muted-foreground">TX Hash</th>
            <th className="p-4 text-sm font-medium text-muted-foreground">From</th>
            <th className="p-4 text-sm font-medium text-muted-foreground">To</th>
            <th className="p-4 text-sm font-medium text-muted-foreground">Amount</th>
            <th className="p-4 text-sm font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, idx) => (
            <motion.tr
              key={tx.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="border-b border-white/5 table-row-hover"
              data-testid={`tx-${tx.id}`}
            >
              <td className="p-4">
                <Link 
                  to={`/tx/${tx.id}`}
                  className="font-mono text-sm text-primary hover:underline"
                >
                  {truncateHash(tx.id, 8)}
                </Link>
              </td>
              <td className="p-4 font-mono text-sm text-muted-foreground">
                {truncateHash(tx.sender, 8)}
              </td>
              <td className="p-4 font-mono text-sm text-muted-foreground">
                {truncateHash(tx.recipient, 8)}
              </td>
              <td className="p-4 font-mono text-primary">
                {tx.amount} BRICS
              </td>
              <td className="p-4">
                <span className={tx.confirmed ? "confirmed-badge" : "pending-badge"}>
                  {tx.confirmed ? "Confirmed" : "Pending"}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Explorer() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [blocks, setBlocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [blocksTotal, setBlocksTotal] = useState(0);
  const [txTotal, setTxTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const tab = searchParams.get("tab") || "blocks";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (tab === "blocks") {
          const res = await getBlocks(limit, (page - 1) * limit);
          setBlocks(res.data.blocks);
          setBlocksTotal(res.data.total);
        } else {
          const res = await getTransactions(limit, (page - 1) * limit);
          setTransactions(res.data.transactions);
          setTxTotal(res.data.total);
        }
      } catch (error) {
        console.error("Error fetching explorer data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tab, page]);

  const totalPages = Math.ceil((tab === "blocks" ? blocksTotal : txTotal) / limit);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    // Determine search type
    if (searchQuery.startsWith("BRICS")) {
      window.location.href = `/wallet?address=${searchQuery}`;
    } else if (searchQuery.length === 64) {
      // Could be block hash or tx hash
      window.location.href = `/tx/${searchQuery}`;
    } else if (!isNaN(searchQuery)) {
      window.location.href = `/block/${searchQuery}`;
    }
  };

  return (
    <div className="space-y-6" data-testid="explorer-page">
      {/* Search Bar */}
      <Card className="bg-card border-white/10">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-10 bg-background border-white/20 font-mono"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="explorer-search-input"
              />
            </div>
            <Button type="submit" className="gold-button rounded-sm" data-testid="explorer-search-btn">
              {t('search')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs 
        value={tab} 
        onValueChange={(value) => setSearchParams({ tab: value, page: "1" })}
      >
        <TabsList className="bg-card border border-white/10">
          <TabsTrigger 
            value="blocks" 
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            data-testid="blocks-tab"
          >
            <Blocks className="w-4 h-4 mr-2" />
            {t('blocks')}
          </TabsTrigger>
          <TabsTrigger 
            value="transactions"
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            data-testid="transactions-tab"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            {t('transactions')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="mt-6">
          <Card className="bg-card border-white/10">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading">
                {t('latestBlocks')} ({blocksTotal.toLocaleString()} {t('total')})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <BlocksTable blocks={blocks} loading={loading} t={t} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <Card className="bg-card border-white/10">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="font-heading">
                {t('latestTransactions')} ({txTotal.toLocaleString()} {t('total')})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 && !loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  {t('noTransactions')}
                </div>
              ) : (
                <TransactionsTable transactions={transactions} loading={loading} t={t} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/20"
            disabled={page <= 1}
            onClick={() => setSearchParams({ tab, page: (page - 1).toString() })}
            data-testid="prev-page-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('previous')}
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            {t('page')} {page} {t('of')} {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20"
            disabled={page >= totalPages}
            onClick={() => setSearchParams({ tab, page: (page + 1).toString() })}
            data-testid="next-page-btn"
          >
            {t('next')}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
