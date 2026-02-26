import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Wallet as WalletIcon, ShieldCheck, ArrowRight, RefreshCw, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { motion } from "framer-motion";
import { getWalletBalance, getPQCWalletInfo } from "../lib/api";
import LegacyWallet from "./Wallet";
import PQCWalletPage from "./PQCWallet";
import WalletMigrationPage from "./WalletMigration";

function PortfolioSummary() {
  const [totalBalance, setTotalBalance] = useState(null);
  const [walletCount, setWalletCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTotalBalance = useCallback(async () => {
    setLoading(true);
    try {
      const legacyRaw = localStorage.getItem("bricscoin_wallets");
      const pqcRaw = localStorage.getItem("bricscoin_pqc_wallets");
      const legacyWallets = legacyRaw ? JSON.parse(legacyRaw) : [];
      const pqcWallets = pqcRaw ? JSON.parse(pqcRaw) : [];

      const allAddresses = [
        ...legacyWallets.map(w => ({ address: w.address, type: "legacy" })),
        ...pqcWallets.map(w => ({ address: w.address, type: "pqc" })),
      ];

      setWalletCount(allAddresses.length);

      if (allAddresses.length === 0) {
        setTotalBalance(0);
        setLoading(false);
        return;
      }

      const results = await Promise.allSettled(
        allAddresses.map(({ address, type }) =>
          type === "legacy"
            ? getWalletBalance(address).then(r => r.data.balance)
            : getPQCWalletInfo(address).then(r => r.data.balance)
        )
      );

      const sum = results.reduce((acc, r) => {
        if (r.status === "fulfilled" && typeof r.value === "number") {
          return acc + r.value;
        }
        return acc;
      }, 0);

      setTotalBalance(sum);
    } catch {
      setTotalBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTotalBalance(); }, [fetchTotalBalance]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchTotalBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchTotalBalance]);

  const BRICS_PRICE_USDT = 1.00;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      data-testid="portfolio-summary"
    >
      {/* Total Balance Card */}
      <div className="relative overflow-hidden rounded-sm border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground font-medium">Bilancio Totale</p>
            <button
              onClick={fetchTotalBalance}
              className="text-muted-foreground hover:text-primary transition-colors"
              data-testid="refresh-total-balance-btn"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="text-3xl sm:text-4xl font-heading font-bold gold-text" data-testid="total-balance-value">
            {loading ? (
              <span className="animate-pulse text-2xl">Caricamento...</span>
            ) : totalBalance !== null ? (
              `${totalBalance.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BRICS`
            ) : (
              "Errore"
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-2" data-testid="wallet-count-label">
            {walletCount} wallet{walletCount !== 1 ? "s" : ""} collegati
          </p>
        </div>
      </div>

      {/* Price Ticker Card */}
      <div className="relative overflow-hidden rounded-sm border border-white/10 bg-card p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-secondary" />
            <p className="text-sm text-muted-foreground font-medium">Prezzo BRICS</p>
          </div>
          <p className="text-3xl sm:text-4xl font-heading font-bold text-secondary" data-testid="price-ticker-value">
            ${BRICS_PRICE_USDT.toFixed(2)} USDT
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground" data-testid="portfolio-usdt-value">
              Valore portfolio:{" "}
              <span className="text-foreground font-medium">
                {loading || totalBalance === null
                  ? "..."
                  : `$${(totalBalance * BRICS_PRICE_USDT).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`}
              </span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function WalletHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "legacy";
  return (
    <div className="space-y-6" data-testid="wallet-hub-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <WalletIcon className="w-7 h-7 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">Wallet</h1>
        </div>
        <p className="text-muted-foreground">Gestisci i tuoi wallet BRICS — Legacy, Quantum-Proof e Migrazione</p>
      </motion.div>

      <PortfolioSummary />

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-5">
        <TabsList className="bg-card border border-white/10">
          <TabsTrigger value="legacy" data-testid="tab-legacy-wallet">
            <WalletIcon className="w-4 h-4 mr-2" />Legacy Wallet
          </TabsTrigger>
          <TabsTrigger value="pqc" data-testid="tab-pqc-wallet">
            <ShieldCheck className="w-4 h-4 mr-2" />PQC Wallet
          </TabsTrigger>
          <TabsTrigger value="migration" data-testid="tab-migration">
            <ArrowRight className="w-4 h-4 mr-2" />Migrazione
          </TabsTrigger>
        </TabsList>

        <TabsContent value="legacy">
          <LegacyWallet embedded />
        </TabsContent>
        <TabsContent value="pqc">
          <PQCWalletPage embedded />
        </TabsContent>
        <TabsContent value="migration">
          <WalletMigrationPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
