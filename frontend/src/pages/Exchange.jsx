import { useState, useEffect, useRef, useCallback } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import {
  getTicker, getOrderbook, getRecentTrades, getCandles,
  placeOrder, getOpenOrders, cancelOrder, getExchangeWallet,
  exchangeLogin, exchangeRegister,
  getUsdtDepositAddress, getBricsDepositAddress,
  withdrawUsdt, withdrawBrics
} from "../lib/exchange-api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, BarChart3,
  LogIn, UserPlus, X, Wallet, RefreshCw, Copy, ArrowDownToLine, ArrowUpFromLine
} from "lucide-react";

// ============ CHART COMPONENT ============
function PriceChart({ candles, interval, setInterval }) {
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#0a0e17" }, textColor: "#8a8f98" },
      grid: { vertLines: { color: "#1a1e2e" }, horzLines: { color: "#1a1e2e" } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: "#1a1e2e" },
      timeScale: { borderColor: "#1a1e2e", timeVisible: true },
      localization: { locale: "en-US" },
      width: containerRef.current.clientWidth,
      height: 400,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, []);

  useEffect(() => {
    if (seriesRef.current && candles.length > 0) {
      seriesRef.current.setData(candles);
    }
  }, [candles]);

  const intervals = ["1m", "5m", "15m", "1h", "4h", "1d"];

  return (
    <div className="relative" data-testid="price-chart">
      <div className="flex gap-1 mb-2">
        {intervals.map(i => (
          <button key={i} onClick={() => setInterval(i)}
            className={`px-2 py-1 text-xs rounded ${interval === i ? "bg-yellow-500/20 text-yellow-400" : "text-gray-500 hover:text-gray-300"}`}>
            {i}
          </button>
        ))}
      </div>
      <div ref={containerRef} />
    </div>
  );
}

// ============ ORDER BOOK ============
function OrderBook({ orderbook, lastPrice }) {
  const maxQty = Math.max(
    ...orderbook.asks.map(a => a[1]),
    ...orderbook.bids.map(b => b[1]),
    1
  );

  return (
    <div data-testid="order-book" className="text-xs">
      <div className="grid grid-cols-3 text-gray-500 mb-2 px-2">
        <span>Price (USDT)</span>
        <span className="text-right">Amount (BRICS)</span>
        <span className="text-right">Total</span>
      </div>
      {/* Asks (sells) - reversed so lowest is at bottom */}
      <div className="space-y-px max-h-[200px] overflow-hidden flex flex-col-reverse">
        {orderbook.asks.slice(0, 12).map(([price, qty], i) => (
          <div key={`a${i}`} className="grid grid-cols-3 px-2 py-0.5 relative">
            <div className="absolute inset-0 bg-red-500/10" style={{ width: `${(qty / maxQty) * 100}%`, right: 0, left: "auto" }} />
            <span className="text-red-400 relative z-10">{price.toFixed(6)}</span>
            <span className="text-right relative z-10">{qty.toFixed(2)}</span>
            <span className="text-right text-gray-500 relative z-10">{(price * qty).toFixed(4)}</span>
          </div>
        ))}
      </div>
      {/* Spread / Last Price */}
      <div className="py-2 px-2 text-center border-y border-white/5">
        <span className="text-lg font-bold text-yellow-400">{lastPrice.toFixed(6)}</span>
        <span className="text-gray-500 ml-2 text-xs">USDT</span>
      </div>
      {/* Bids (buys) */}
      <div className="space-y-px max-h-[200px] overflow-hidden">
        {orderbook.bids.slice(0, 12).map(([price, qty], i) => (
          <div key={`b${i}`} className="grid grid-cols-3 px-2 py-0.5 relative">
            <div className="absolute inset-0 bg-green-500/10" style={{ width: `${(qty / maxQty) * 100}%`, right: 0, left: "auto" }} />
            <span className="text-green-400 relative z-10">{price.toFixed(6)}</span>
            <span className="text-right relative z-10">{qty.toFixed(2)}</span>
            <span className="text-right text-gray-500 relative z-10">{(price * qty).toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ RECENT TRADES ============
function RecentTrades({ trades }) {
  return (
    <div data-testid="recent-trades" className="text-xs max-h-[300px] overflow-y-auto">
      <div className="grid grid-cols-3 text-gray-500 mb-2 px-2 sticky top-0 bg-[#0d1117]">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>
      {trades.map((t, i) => (
        <div key={i} className="grid grid-cols-3 px-2 py-0.5">
          <span className={t.side === "buy" ? "text-green-400" : "text-red-400"}>
            {t.price.toFixed(6)}
          </span>
          <span className="text-right">{t.amount.toFixed(2)}</span>
          <span className="text-right text-gray-500">
            {new Date(t.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
      {trades.length === 0 && <p className="text-center text-gray-500 py-4">No trades yet</p>}
    </div>
  );
}

// ============ TRADE FORM ============
function TradeForm({ side, wallet, lastPrice, onSubmit }) {
  const [orderType, setOrderType] = useState("limit");
  const [price, setPrice] = useState(lastPrice.toFixed(6));
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setPrice(lastPrice.toFixed(6)); }, [lastPrice]);

  const total = (parseFloat(price) || 0) * (parseFloat(amount) || 0);
  const available = side === "buy" ? wallet.usdt_available : wallet.brics_available;

  const handleMax = () => {
    if (side === "buy" && parseFloat(price) > 0) {
      setAmount((available / parseFloat(price)).toFixed(2));
    } else {
      setAmount(available.toFixed(8));
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    try {
      await onSubmit(side, orderType, parseFloat(amount), orderType === "limit" ? parseFloat(price) : null);
      setAmount("");
    } catch (e) {
      alert(e.response?.data?.detail || "Order failed");
    }
    setLoading(false);
  };

  const isBuy = side === "buy";

  return (
    <div className="space-y-3" data-testid={`trade-form-${side}`}>
      <div className="flex gap-1">
        {["limit", "market"].map(t => (
          <button key={t} onClick={() => setOrderType(t)}
            className={`px-3 py-1 text-xs rounded capitalize ${orderType === t ? "bg-white/10 text-white" : "text-gray-500"}`}>
            {t}
          </button>
        ))}
      </div>
      {orderType === "limit" && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Price (USDT)</label>
          <Input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.000001"
            className="bg-white/5 border-white/10 text-sm" data-testid={`${side}-price-input`} />
        </div>
      )}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Amount (BRICS)</label>
        <div className="relative">
          <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01"
            className="bg-white/5 border-white/10 text-sm pr-14" data-testid={`${side}-amount-input`} />
          <button onClick={handleMax} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-yellow-400 hover:text-yellow-300">
            MAX
          </button>
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Available: {available.toFixed(4)} {isBuy ? "USDT" : "BRICS"}</span>
        <span>Total: {total.toFixed(4)} USDT</span>
      </div>
      <Button onClick={handleSubmit} disabled={loading}
        className={`w-full ${isBuy ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white`}
        data-testid={`${side}-submit-btn`}>
        {loading ? "..." : `${isBuy ? "Buy" : "Sell"} BRICS`}
      </Button>
    </div>
  );
}

// ============ AUTH MODAL ============
function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let res;
      if (mode === "login") {
        res = await exchangeLogin(email, password);
      } else {
        res = await exchangeRegister(username, email, password);
      }
      localStorage.setItem("exchange_token", res.data.token);
      localStorage.setItem("exchange_user", JSON.stringify(res.data));
      onAuth(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Error");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" data-testid="auth-modal">
      <Card className="w-full max-w-md bg-[#0d1117] border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{mode === "login" ? "Login" : "Register"}</CardTitle>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
                className="bg-white/5 border-white/10" data-testid="auth-username" required />
            )}
            <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="bg-white/5 border-white/10" data-testid="auth-email" required />
            <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="bg-white/5 border-white/10" data-testid="auth-password" required />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" data-testid="auth-submit">
              {loading ? "..." : mode === "login" ? "Login" : "Register"}
            </Button>
            <p className="text-center text-sm text-gray-500">
              {mode === "login" ? "No account? " : "Already registered? "}
              <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-yellow-400 hover:underline">
                {mode === "login" ? "Register" : "Login"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ OPEN ORDERS TABLE ============
function OpenOrders({ orders, onCancel }) {
  if (orders.length === 0) return <p className="text-gray-500 text-sm text-center py-4">No open orders</p>;
  return (
    <div className="text-xs overflow-x-auto" data-testid="open-orders">
      <table className="w-full">
        <thead>
          <tr className="text-gray-500 border-b border-white/5">
            <th className="text-left py-2 px-2">Side</th>
            <th className="text-left py-2">Type</th>
            <th className="text-right py-2">Price</th>
            <th className="text-right py-2">Amount</th>
            <th className="text-right py-2">Filled</th>
            <th className="text-right py-2 px-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.order_id} className="border-b border-white/5">
              <td className={`py-2 px-2 ${o.side === "buy" ? "text-green-400" : "text-red-400"}`}>{o.side.toUpperCase()}</td>
              <td className="py-2 capitalize">{o.order_type}</td>
              <td className="text-right py-2">{o.price?.toFixed(6) || "Market"}</td>
              <td className="text-right py-2">{o.amount.toFixed(2)}</td>
              <td className="text-right py-2">{(o.filled || 0).toFixed(2)}</td>
              <td className="text-right py-2 px-2">
                <button onClick={() => onCancel(o.order_id)} className="text-red-400 hover:text-red-300" data-testid={`cancel-order-${o.order_id}`}>Cancel</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ WALLET PANEL ============
function WalletPanel({ wallet, onRefresh }) {
  const [tab, setTab] = useState("deposit");
  const [currency, setCurrency] = useState("usdt");
  const [depositInfo, setDepositInfo] = useState(null);
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchDeposit = useCallback(async (cur) => {
    setLoading(true);
    setMessage("");
    try {
      const res = cur === "usdt" ? await getUsdtDepositAddress() : await getBricsDepositAddress();
      setDepositInfo(res.data);
    } catch (e) { setMessage(e.response?.data?.detail || "Error"); }
    setLoading(false);
  }, []);

  // Reset and auto-fetch when currency changes
  useEffect(() => {
    setDepositInfo(null);
    if (tab === "deposit") {
      fetchDeposit(currency);
    }
  }, [currency, tab, fetchDeposit]);

  const handleWithdraw = async () => {
    if (!withdrawAddr || !withdrawAmt) return;
    setLoading(true);
    setMessage("");
    try {
      const fn = currency === "usdt" ? withdrawUsdt : withdrawBrics;
      await fn(parseFloat(withdrawAmt), withdrawAddr);
      setMessage("Withdrawal processed!");
      setWithdrawAddr("");
      setWithdrawAmt("");
      onRefresh();
    } catch (e) { setMessage(e.response?.data?.detail || "Withdrawal failed"); }
    setLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage("Copied!");
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div data-testid="wallet-panel" className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-white/5 rounded p-2">
          <span className="text-gray-500 text-xs">BRICS</span>
          <p className="font-bold">{wallet.brics_available.toFixed(4)}</p>
          {wallet.brics_locked > 0 && <p className="text-xs text-yellow-400">Locked: {wallet.brics_locked.toFixed(4)}</p>}
        </div>
        <div className="bg-white/5 rounded p-2">
          <span className="text-gray-500 text-xs">USDT</span>
          <p className="font-bold">{wallet.usdt_available.toFixed(4)}</p>
          {wallet.usdt_locked > 0 && <p className="text-xs text-yellow-400">Locked: {wallet.usdt_locked.toFixed(4)}</p>}
        </div>
      </div>

      <div className="flex gap-1">
        <button onClick={() => setTab("deposit")} className={`flex-1 py-1.5 text-xs rounded ${tab === "deposit" ? "bg-green-600/20 text-green-400" : "text-gray-500"}`}>
          <ArrowDownToLine className="w-3 h-3 inline mr-1" />Deposit
        </button>
        <button onClick={() => setTab("withdraw")} className={`flex-1 py-1.5 text-xs rounded ${tab === "withdraw" ? "bg-red-600/20 text-red-400" : "text-gray-500"}`}>
          <ArrowUpFromLine className="w-3 h-3 inline mr-1" />Withdraw
        </button>
      </div>

      <div className="flex gap-1">
        <button onClick={() => setCurrency("usdt")} className={`flex-1 py-1 text-xs rounded ${currency === "usdt" ? "bg-white/10 text-white" : "text-gray-500"}`}>USDT</button>
        <button onClick={() => setCurrency("brics")} className={`flex-1 py-1 text-xs rounded ${currency === "brics" ? "bg-white/10 text-white" : "text-gray-500"}`}>BRICS</button>
      </div>

      {tab === "deposit" && (
        <div className="space-y-2">
          {!depositInfo ? (
            <Button onClick={fetchDeposit} disabled={loading} size="sm" className="w-full bg-green-600 hover:bg-green-700 text-xs" data-testid="get-deposit-address-btn">
              {loading ? "..." : "Get Deposit Address"}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">{depositInfo.network}</p>
              <div className="flex items-center gap-1 bg-white/5 rounded p-2">
                <span className="text-xs font-mono break-all flex-1" data-testid="deposit-address">{depositInfo.address}</span>
                <button onClick={() => copyToClipboard(depositInfo.address)}><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
              </div>
              {depositInfo.memo && (
                <div className="flex items-center gap-1 bg-white/5 rounded p-2">
                  <span className="text-xs text-gray-400">Memo: </span>
                  <span className="text-xs font-mono" data-testid="deposit-memo">{depositInfo.memo}</span>
                  <button onClick={() => copyToClipboard(depositInfo.memo)}><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
                </div>
              )}
              <p className="text-xs text-yellow-400/70">{depositInfo.note}</p>
            </div>
          )}
        </div>
      )}

      {tab === "withdraw" && (
        <div className="space-y-2">
          <Input placeholder={currency === "usdt" ? "Tron address (T...)" : "BRICS address"} value={withdrawAddr}
            onChange={e => setWithdrawAddr(e.target.value)} className="bg-white/5 border-white/10 text-xs" data-testid="withdraw-address-input" />
          <div className="relative">
            <Input placeholder="Amount" type="number" value={withdrawAmt}
              onChange={e => setWithdrawAmt(e.target.value)} className="bg-white/5 border-white/10 text-xs pr-14" data-testid="withdraw-amount-input" />
            <button onClick={() => setWithdrawAmt(currency === "usdt" ? wallet.usdt_available.toFixed(4) : wallet.brics_available.toFixed(8))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-yellow-400">MAX</button>
          </div>
          <p className="text-xs text-gray-500">Min: {currency === "usdt" ? "5 USDT" : "1 BRICS"}</p>
          <Button onClick={handleWithdraw} disabled={loading} size="sm" className="w-full bg-red-600 hover:bg-red-700 text-xs" data-testid="withdraw-submit-btn">
            {loading ? "..." : `Withdraw ${currency.toUpperCase()}`}
          </Button>
        </div>
      )}

      {message && <p className="text-xs text-center text-yellow-400">{message}</p>}
    </div>
  );
}

// ============ MAIN EXCHANGE PAGE ============
export default function Exchange() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("exchange_user")); } catch { return null; }
  });
  const [showAuth, setShowAuth] = useState(false);
  const [ticker, setTicker] = useState({ last_price: 0.0086, high_24h: 0.0086, low_24h: 0.0086, volume_24h: 0, change_24h: 0 });
  const [orderbook, setOrderbook] = useState({ bids: [], asks: [] });
  const [trades, setTrades] = useState([]);
  const [candles, setCandles] = useState([]);
  const [interval, setChartInterval] = useState("1h");
  const [openOrders, setOpenOrders] = useState([]);
  const [wallet, setWallet] = useState({ brics_available: 0, brics_locked: 0, usdt_available: 0, usdt_locked: 0 });
  const [activeSide, setActiveSide] = useState("buy");

  const fetchData = useCallback(async () => {
    try {
      const [tickerRes, obRes, tradesRes] = await Promise.all([
        getTicker(), getOrderbook(), getRecentTrades(30)
      ]);
      setTicker(tickerRes.data);
      setOrderbook(obRes.data);
      setTrades(tradesRes.data);
    } catch (e) { console.error("Fetch error:", e); }
  }, []);

  const fetchCandles = useCallback(async () => {
    try {
      const res = await getCandles(interval, 100);
      setCandles(res.data);
    } catch (e) { console.error("Candles error:", e); }
  }, [interval]);

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const [walletRes, ordersRes] = await Promise.all([
        getExchangeWallet(), getOpenOrders()
      ]);
      setWallet(walletRes.data);
      setOpenOrders(ordersRes.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("exchange_token");
        localStorage.removeItem("exchange_user");
        setUser(null);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    fetchCandles();
    const iv = setInterval(fetchData, 3000);
    return () => clearInterval(iv);
  }, [fetchData, fetchCandles]);

  useEffect(() => { fetchCandles(); }, [interval, fetchCandles]);
  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  const handleOrder = async (side, type, amount, price) => {
    await placeOrder(side, type, amount, price);
    fetchData();
    fetchUserData();
  };

  const handleCancel = async (orderId) => {
    await cancelOrder(orderId);
    fetchData();
    fetchUserData();
  };

  const handleLogout = () => {
    localStorage.removeItem("exchange_token");
    localStorage.removeItem("exchange_user");
    setUser(null);
    setWallet({ brics_available: 0, brics_locked: 0, usdt_available: 0, usdt_locked: 0 });
    setOpenOrders([]);
  };

  const isPositive = ticker.change_24h >= 0;

  return (
    <div className="min-h-screen bg-[#080b12] text-white" data-testid="exchange-page">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={(u) => { setUser(u); setShowAuth(false); }} />}

      {/* Top Ticker Bar */}
      <div className="border-b border-white/5 bg-[#0a0e17]">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/bricscoin-logo.png" alt="BRICS" className="w-7 h-7" />
              <span className="text-lg font-bold">BRICS/USDT</span>
            </div>
            <div>
              <span className={`text-2xl font-bold ${isPositive ? "text-green-400" : "text-red-400"}`} data-testid="last-price">
                {ticker.last_price.toFixed(6)}
              </span>
              <span className={`ml-2 text-sm flex items-center gap-1 inline-flex ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {ticker.change_24h.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div><span className="text-gray-500">24h High</span><p className="font-medium">{ticker.high_24h.toFixed(6)}</p></div>
            <div><span className="text-gray-500">24h Low</span><p className="font-medium">{ticker.low_24h.toFixed(6)}</p></div>
            <div><span className="text-gray-500">24h Vol (USDT)</span><p className="font-medium">{ticker.volume_24h.toLocaleString()}</p></div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1.5 rounded">
                  <Wallet className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400">{wallet.brics_available.toFixed(2)} BRICS</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-400">{wallet.usdt_available.toFixed(2)} USDT</span>
                </div>
                <span className="text-sm text-gray-400">{user.username}</span>
                <Button onClick={handleLogout} variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="logout-btn">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setShowAuth(true)} size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold" data-testid="login-btn">
                  <LogIn className="w-4 h-4 mr-1" /> Login
                </Button>
                <Button onClick={() => setShowAuth(true)} variant="outline" size="sm" className="border-yellow-500/30 text-yellow-400" data-testid="register-btn">
                  <UserPlus className="w-4 h-4 mr-1" /> Register
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-[1800px] mx-auto p-2 grid grid-cols-12 gap-2" style={{ height: "calc(100vh - 72px)" }}>
        {/* Chart */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9">
          <Card className="bg-[#0a0e17] border-white/5 h-full">
            <CardContent className="p-3">
              <PriceChart candles={candles} interval={interval} setInterval={setChartInterval} />
            </CardContent>
          </Card>
        </div>

        {/* Order Book + Recent Trades */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-2">
          <Card className="bg-[#0a0e17] border-white/5 flex-1">
            <CardHeader className="py-2 px-3 border-b border-white/5">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-yellow-400" /> Order Book
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <OrderBook orderbook={orderbook} lastPrice={ticker.last_price} />
            </CardContent>
          </Card>
          <Card className="bg-[#0a0e17] border-white/5 flex-1">
            <CardHeader className="py-2 px-3 border-b border-white/5">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-400" /> Recent Trades
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RecentTrades trades={trades} />
            </CardContent>
          </Card>
        </div>

        {/* Trade Form */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <Card className="bg-[#0a0e17] border-white/5">
            <CardContent className="p-4">
              <div className="flex mb-4">
                <button onClick={() => setActiveSide("buy")}
                  className={`flex-1 py-2 text-sm font-bold rounded-l ${activeSide === "buy" ? "bg-green-600 text-white" : "bg-white/5 text-gray-500"}`}
                  data-testid="buy-tab">BUY</button>
                <button onClick={() => setActiveSide("sell")}
                  className={`flex-1 py-2 text-sm font-bold rounded-r ${activeSide === "sell" ? "bg-red-600 text-white" : "bg-white/5 text-gray-500"}`}
                  data-testid="sell-tab">SELL</button>
              </div>
              {user ? (
                <TradeForm side={activeSide} wallet={wallet} lastPrice={ticker.last_price} onSubmit={handleOrder} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-3">Login to start trading</p>
                  <Button onClick={() => setShowAuth(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold" data-testid="login-to-trade-btn">
                    Login / Register
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Wallet Panel */}
          {user && (
            <Card className="bg-[#0a0e17] border-white/5 mt-2">
              <CardHeader className="py-2 px-3 border-b border-white/5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-yellow-400" /> Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <WalletPanel wallet={wallet} onRefresh={fetchUserData} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Open Orders */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9">
          <Card className="bg-[#0a0e17] border-white/5">
            <CardHeader className="py-2 px-3 border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Open Orders</CardTitle>
              {user && (
                <button onClick={fetchUserData} className="text-gray-500 hover:text-white">
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {user ? (
                <OpenOrders orders={openOrders} onCancel={handleCancel} />
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">Login to see your orders</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
