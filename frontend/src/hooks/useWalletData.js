import { useState, useEffect, useCallback } from "react";
import { getWalletBalance, getPQCWalletInfo } from "../lib/api";

const API = process.env.REACT_APP_BACKEND_URL;

export const CRYPTO_PAIRS = [
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

export const JBS_PER_BRICS = 100_000_000;

export function useWalletData() {
  const [totalBalance, setTotalBalance] = useState(null);
  const [walletCount, setWalletCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(true);
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
        if (r.status === "fulfilled" && typeof r.value === "number") return acc + r.value;
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

  const fetchPrivacyScore = useCallback(async () => {
    const legacyRaw = localStorage.getItem("bricscoin_wallets");
    const pqcRaw = localStorage.getItem("bricscoin_pqc_wallets");
    const legacyWallets = legacyRaw ? JSON.parse(legacyRaw) : [];
    const pqcWallets = pqcRaw ? JSON.parse(pqcRaw) : [];
    const allAddresses = [
      ...pqcWallets.map(w => w.address),
      ...legacyWallets.map(w => w.address),
    ];
    if (allAddresses.length > 0) {
      const results = await Promise.all(
        allAddresses.map(addr =>
          fetch(`${API}/api/privacy-score/${addr}`).then(r => r.json()).catch(() => null)
        )
      );
      const valid = results.filter(Boolean);
      if (valid.length > 0) {
        const best = valid.reduce((a, b) => (a.score >= b.score ? a : b));
        setPrivacyScore(best);
      }
    }
  }, []);

  useEffect(() => {
    fetchTotalBalance();
    fetchCryptoPrices();
    fetchPrivacyScore();
  }, [fetchTotalBalance, fetchCryptoPrices, fetchPrivacyScore]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTotalBalance();
      fetchCryptoPrices();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchTotalBalance, fetchCryptoPrices]);

  return {
    totalBalance,
    walletCount,
    loading,
    cryptoPrices,
    pricesLoading,
    privacyScore,
    fetchTotalBalance,
    fetchCryptoPrices,
    fetchPrivacyScore,
  };
}
