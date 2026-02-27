import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Wallet as WalletIcon, ShieldCheck, ArrowRight, RefreshCw, TrendingUp, ChevronDown, Lock, Atom, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { motion } from "framer-motion";
import { getWalletBalance, getPQCWalletInfo } from "../lib/api";

const API = process.env.REACT_APP_BACKEND_URL || "";

import LegacyWallet from "./Wallet";
import PQCWalletPage from "./PQCWallet";
import WalletMigrationPage from "./WalletMigration";
import ZKPrivacy from "./ZKPrivacy";
import PrivacySuite from "./PrivacySuite";

const CRYPTO_PAIRS = [
  { id: "jabos", symbol: "JBS", color: "#D4AF37", isJbs: true },
  { id: "tether", symbol: "USDT", color: "#26A17B" },
  { id: "usd-coin", symbol: "USDC", color: "#2775CA" },
  { id: "bitcoin", symbol: "BTC", color: "#F7931A" },
  { id: "solana", symbol: "SOL", color: "#9945FF" },
  { id: "ethereum", symbol: "ETH", color: "#627EEA" },
  { id: "binancecoin", symbol: "BNB", color: "#F3BA2F" },
  { id: "ripple", symbol: "XRP", color: "#23292F" },
  { id: "dogecoin", symbol: "DOGE", color: "#C2A633" },
];

const JBS_PER_BRICS = 100_000_000;

function PortfolioSummary() {
  const [totalBalance, setTotalBalance] = useState(null);
  const [walletCount, setWalletCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState(CRYPTO_PAIRS[0]);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [privacyScore, setPrivacyScore] = useState(null);

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

  useEffect(() => {
    fetchTotalBalance(); fetchCryptoPrices();
    const pqcRaw = localStorage.getItem("bricscoin_pqc_wallets");
    const pqcWallets = pqcRaw ? JSON.parse(pqcRaw) : [];
    if (pqcWallets.length > 0) {
      fetch(`${API}/api/privacy-score/${pqcWallets[0].address}`)
        .then(r => r.json()).then(setPrivacyScore).catch(() => {});
    }
  }, [fetchTotalBalance, fetchCryptoPrices]);

  useEffect(() => {
    const interval = setInterval(() => { fetchTotalBalance(); fetchCryptoPrices(); }, 60000);
    return () => clearInterval(interval);
  }, [fetchTotalBalance, fetchCryptoPrices]);

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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="portfolio-summary"
    >
      {/* Total Balance Card */}
      <div className="relative overflow-hidden rounded-sm border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground font-medium">Total Balance</p>
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
              <span className="animate-pulse text-2xl">Loading...</span>
            ) : totalBalance !== null ? (
              `${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BRICS`
            ) : (
              "Error"
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-2" data-testid="wallet-count-label">
            {walletCount} wallet{walletCount !== 1 ? "s" : ""} connected
          </p>
        </div>
      </div>

      {/* Price Ticker Card */}
      <div className="relative overflow-hidden rounded-sm border border-white/10 bg-card p-5">
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">BRICS Pair</p>
            </div>
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
                        {pair.isJbs ? "100M" : cryptoPrices[pair.id]?.usd ? `$${cryptoPrices[pair.id].usd.toLocaleString()}` : "..."}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-3xl sm:text-4xl font-heading font-bold text-muted-foreground" data-testid="price-ticker-value">
            {selectedPair.isJbs && totalBalance != null ? (
              <>{Math.round(totalBalance * JBS_PER_BRICS).toLocaleString()} <span style={{ color: selectedPair.color }}>JBS</span></>
            ) : (
              <>0 <span style={{ color: selectedPair.color }}>{selectedPair.symbol}</span></>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1" data-testid="brics-pair-label">
            {selectedPair.isJbs ? `1 BRICS = ${JBS_PER_BRICS.toLocaleString()} JBS` : `1 BRICS = 0 ${selectedPair.symbol}`}
          </p>

          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                <span style={{ color: selectedPair.color }} className="font-medium">{selectedPair.symbol}</span> {selectedPair.isJbs ? "Rate" : "Price"}
              </span>
              <span className="text-sm font-mono font-medium" data-testid="real-crypto-price">
                {selectedPair.isJbs ? (
                  "1 JBS = 0.00000001 BRICS"
                ) : pricesLoading ? (
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

      {/* Privacy Score Card */}
      <div className="rounded-sm border border-white/10 bg-card p-5" data-testid="desktop-privacy-score">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" /> Privacy Score
          </p>
          {privacyScore && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
              background: privacyScore.score >= 75 ? "#10B98120" : privacyScore.score >= 50 ? "#F59E0B20" : "#EF444420",
              color: privacyScore.score >= 75 ? "#10B981" : privacyScore.score >= 50 ? "#F59E0B" : "#EF4444"
            }}>{privacyScore.level}</span>
          )}
        </div>
        {privacyScore ? (
          <>
            <p className="text-3xl sm:text-4xl font-heading font-bold mb-2" style={{
              color: privacyScore.score >= 75 ? "#10B981" : privacyScore.score >= 50 ? "#F59E0B" : "#EF4444"
            }}>{privacyScore.score}<span className="text-lg text-muted-foreground">/100</span></p>
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all" style={{
                width: `${privacyScore.score}%`,
                background: privacyScore.score >= 75 ? "#10B981" : privacyScore.score >= 50 ? "#F59E0B" : "#EF4444"
              }} />
            </div>
            <div className="space-y-1">
              {privacyScore.details?.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{d.feature}</span>
                  <span className={d.status === "active" ? "text-emerald-400" : d.status === "partial" ? "text-amber-400" : "text-red-400"}>
                    {d.status === "active" ? `+${d.points}` : d.tip || "+0"}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Create a PQC wallet to see your score</p>
        )}
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
        <p className="text-muted-foreground">Manage your BRICS wallets — Legacy, Quantum-Proof, Zero-Knowledge, Total Privacy & Migration</p>
      </motion.div>

      <PortfolioSummary />

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-5">
        <TabsList className="bg-card border border-white/10 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="legacy" data-testid="tab-legacy-wallet" className="text-xs sm:text-sm">
            <WalletIcon className="w-4 h-4 mr-1.5" />Legacy
          </TabsTrigger>
          <TabsTrigger value="pqc" data-testid="tab-pqc-wallet" className="text-xs sm:text-sm">
            <Atom className="w-4 h-4 mr-1.5" />PQC
          </TabsTrigger>
          <TabsTrigger value="zk" data-testid="tab-zk-stark" className="text-xs sm:text-sm">
            <Lock className="w-4 h-4 mr-1.5" />zk-STARK
          </TabsTrigger>
          <TabsTrigger value="privacy" data-testid="tab-privacy" className="text-xs sm:text-sm">
            <Shield className="w-4 h-4 mr-1.5" />Total Privacy
          </TabsTrigger>
          <TabsTrigger value="migration" data-testid="tab-migration" className="text-xs sm:text-sm">
            <ArrowRight className="w-4 h-4 mr-1.5" />Migration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="legacy">
          <LegacyWallet embedded />
        </TabsContent>
        <TabsContent value="pqc">
          <PQCWalletPage embedded />
        </TabsContent>
        <TabsContent value="zk">
          <ZKPrivacy embedded />
        </TabsContent>
        <TabsContent value="privacy">
          <PrivacySuite embedded />
        </TabsContent>
        <TabsContent value="migration">
          <WalletMigrationPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
