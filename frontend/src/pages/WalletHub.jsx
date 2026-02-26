import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Wallet as WalletIcon, ShieldCheck, ArrowRight, RefreshCw, TrendingUp, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { motion } from "framer-motion";
import { getWalletBalance, getPQCWalletInfo } from "../lib/api";
import LegacyWallet from "./Wallet";
import PQCWalletPage from "./PQCWallet";
import WalletMigrationPage from "./WalletMigration";

const CRYPTO_PAIRS = [
  { id: "tether", symbol: "USDT", color: "#26A17B" },
  { id: "usd-coin", symbol: "USDC", color: "#2775CA" },
  { id: "bitcoin", symbol: "BTC", color: "#F7931A" },
  { id: "solana", symbol: "SOL", color: "#9945FF" },
  { id: "ethereum", symbol: "ETH", color: "#627EEA" },
  { id: "binancecoin", symbol: "BNB", color: "#F3BA2F" },
  { id: "ripple", symbol: "XRP", color: "#23292F" },
  { id: "dogecoin", symbol: "DOGE", color: "#C2A633" },
];

function PortfolioSummary() {
  const [totalBalance, setTotalBalance] = useState(null);
  const [walletCount, setWalletCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState(CRYPTO_PAIRS[0]);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  const fetchCryptoPrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      const ids = CRYPTO_PAIRS.map(p => p.id).join(",");
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      const data = await res.json();
      setCryptoPrices(data);
    } catch {
      setCryptoPrices({});
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => { fetchTotalBalance(); fetchCryptoPrices(); }, [fetchTotalBalance, fetchCryptoPrices]);

  useEffect(() => {
    const interval = setInterval(() => { fetchTotalBalance(); fetchCryptoPrices(); }, 60000);
    return () => clearInterval(interval);
  }, [fetchTotalBalance, fetchCryptoPrices]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [dropdownOpen]);

  const realPrice = cryptoPrices[selectedPair.id]?.usd ?? null;

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

      {/* Price Ticker Card with Currency Selector */}
      <div className="relative overflow-hidden rounded-sm border border-white/10 bg-card p-5">
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">Coppia BRICS</p>
            </div>
            {/* Currency Selector Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/10 bg-background hover:border-primary/40 transition-colors text-sm font-medium"
                data-testid="currency-selector-btn"
              >
                <span style={{ color: selectedPair.color }}>{selectedPair.symbol}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-white/10 rounded-sm shadow-xl overflow-hidden min-w-[120px]">
                  {CRYPTO_PAIRS.map((pair) => (
                    <button
                      key={pair.id}
                      onClick={() => { setSelectedPair(pair); setDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors flex items-center justify-between ${
                        selectedPair.id === pair.id ? "bg-white/5" : ""
                      }`}
                      data-testid={`select-pair-${pair.symbol.toLowerCase()}`}
                    >
                      <span style={{ color: pair.color }} className="font-medium">{pair.symbol}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {cryptoPrices[pair.id]?.usd ? `$${cryptoPrices[pair.id].usd.toLocaleString()}` : "..."}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* BRICS/CRYPTO pair price = 0 */}
          <p className="text-3xl sm:text-4xl font-heading font-bold text-muted-foreground" data-testid="price-ticker-value">
            0 <span style={{ color: selectedPair.color }}>{selectedPair.symbol}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1" data-testid="brics-pair-label">
            1 BRICS = 0 {selectedPair.symbol}
          </p>

          {/* Real price of selected crypto */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Prezzo <span style={{ color: selectedPair.color }} className="font-medium">{selectedPair.symbol}</span>
              </span>
              <span className="text-sm font-mono font-medium" data-testid="real-crypto-price">
                {pricesLoading ? (
                  <span className="animate-pulse text-muted-foreground">...</span>
                ) : realPrice !== null ? (
                  `$${realPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : (
                  "N/A"
                )}
              </span>
            </div>
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
