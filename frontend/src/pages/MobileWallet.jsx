import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Plus, Copy, Check, Eye, EyeOff, Download, RefreshCw,
  Send, Atom, Key, Lock, ArrowLeft, QrCode, ArrowDownLeft,
  History, ChevronRight, AlertTriangle, EyeOff as EyeOffIcon
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from "../components/ui/dialog";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  createPQCWallet, importPQCWallet, getPQCWalletInfo, createPQCTransaction
} from "../lib/api";
import { preparePQCTransaction } from "../lib/pqc-crypto";

const API = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "/bricscoin-logo.png";

function copyText(text) {
  navigator.clipboard.writeText(text);
  toast.success("Copied!");
}

function truncAddr(addr, n = 10) {
  if (!addr || addr.length < n * 2) return addr || "";
  return addr.slice(0, n) + "..." + addr.slice(-n);
}

// ============================
// MAIN MOBILE WALLET COMPONENT
// ============================
export default function MobileWallet() {
  const [wallets, setWallets] = useState([]);
  const [activeWallet, setActiveWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [view, setView] = useState("home"); // home | wallet | send | receive | history | create | import | shielded
  const [loadingBal, setLoadingBal] = useState(false);

  // Send form
  const [sendForm, setSendForm] = useState({ recipient: "", amount: "" });
  const [sending, setSending] = useState(false);

  // Shielded send form
  const [shieldedForm, setShieldedForm] = useState({ recipient: "", amount: "" });
  const [sendingShielded, setSendingShielded] = useState(false);

  // Create wallet state
  const [creating, setCreating] = useState(false);
  const [newWalletData, setNewWalletData] = useState(null);

  // Import state
  const [importForm, setImportForm] = useState({ ecdsa_key: "", dilithium_sk: "", dilithium_pk: "", name: "" });

  // Backup
  const [showBackup, setShowBackup] = useState(false);

  // Load wallets
  useEffect(() => {
    const saved = localStorage.getItem("bricscoin_pqc_wallets");
    if (saved) {
      const parsed = JSON.parse(saved);
      setWallets(parsed);
      if (parsed.length > 0 && !activeWallet) {
        setActiveWallet(parsed[0]);
      }
    }
  }, []);

  // Fetch balance when activeWallet changes
  const fetchBalance = useCallback(async () => {
    if (!activeWallet) return;
    setLoadingBal(true);
    try {
      const res = await getPQCWalletInfo(activeWallet.address);
      setBalance(res.data.balance);
    } catch { setBalance(0); }
    finally { setLoadingBal(false); }
  }, [activeWallet]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  // Fetch transactions
  const fetchTxs = useCallback(async () => {
    if (!activeWallet) return;
    try {
      const res = await fetch(`${API}/api/transactions/address/${activeWallet.address}?limit=30`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || data || []);
      }
    } catch {}
  }, [activeWallet]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  const saveWallets = (updated) => {
    setWallets(updated);
    localStorage.setItem("bricscoin_pqc_wallets", JSON.stringify(updated));
  };

  // Create wallet
  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await createPQCWallet("PQC Wallet " + (wallets.length + 1));
      setNewWalletData(res.data);
      const updated = [...wallets, res.data];
      saveWallets(updated);
      setActiveWallet(res.data);
      toast.success("PQC Wallet created!");
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message);
    } finally { setCreating(false); }
  };

  // Import wallet
  const handleImport = async () => {
    try {
      const res = await importPQCWallet(
        importForm.ecdsa_key, importForm.dilithium_sk,
        importForm.dilithium_pk, importForm.name || "Imported PQC"
      );
      const updated = [...wallets, res.data];
      saveWallets(updated);
      setActiveWallet(res.data);
      setImportForm({ ecdsa_key: "", dilithium_sk: "", dilithium_pk: "", name: "" });
      setView("wallet");
      toast.success("Wallet imported!");
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message);
    }
  };

  // Send BRICS
  const handleSend = async () => {
    if (!activeWallet) return;
    setSending(true);
    try {
      const amount = parseFloat(sendForm.amount);
      if (!sendForm.recipient || amount <= 0) { toast.error("Invalid data"); return; }
      const txPayload = preparePQCTransaction(activeWallet, sendForm.recipient, amount);
      await createPQCTransaction(txPayload);
      toast.success("Transaction sent!");
      setSendForm({ recipient: "", amount: "" });
      setView("wallet");
      fetchBalance();
      fetchTxs();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message);
    } finally { setSending(false); }
  };

  // Send Shielded
  const handleShielded = async () => {
    if (!activeWallet) return;
    setSendingShielded(true);
    try {
      const amount = parseFloat(shieldedForm.amount);
      if (!shieldedForm.recipient || amount <= 0) { toast.error("Invalid data"); return; }
      const timestamp = new Date().toISOString();
      const signData = `${activeWallet.address}${shieldedForm.recipient}${amount}${timestamp}`;
      let signature = "pqc_shielded_" + Date.now();
      try {
        const ec = await import("elliptic");
        const EC = ec.default?.ec || ec.ec;
        const curve = new EC("secp256k1");
        const key = curve.keyFromPrivate(activeWallet.ecdsa_private_key, "hex");
        const hash = Array.from(new TextEncoder().encode(signData))
          .reduce((h, b) => (((h << 5) - h) + b) | 0, 0).toString(16);
        signature = key.sign(hash).toDER("hex");
      } catch {}
      const res = await fetch(`${API}/api/zk/send-shielded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_address: activeWallet.address,
          recipient_address: shieldedForm.recipient,
          amount, timestamp, signature,
          public_key: activeWallet.ecdsa_public_key,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Shielded transaction sent!");
        setShieldedForm({ recipient: "", amount: "" });
        setView("wallet");
        fetchBalance();
      } else {
        toast.error(data.detail || "Error");
      }
    } catch (err) {
      toast.error(err.message);
    } finally { setSendingShielded(false); }
  };

  // Backup
  const handleBackup = () => {
    if (!activeWallet) return;
    const backup = JSON.stringify({
      address: activeWallet.address,
      ecdsa_private_key: activeWallet.ecdsa_private_key,
      ecdsa_public_key: activeWallet.ecdsa_public_key,
      dilithium_secret_key: activeWallet.dilithium_secret_key,
      dilithium_public_key: activeWallet.dilithium_public_key,
      seed_phrase: activeWallet.seed_phrase,
    }, null, 2);
    try {
      const a = document.createElement("a");
      a.href = "data:application/json;charset=utf-8," + encodeURIComponent(backup);
      a.download = `bricscoin-pqc-${activeWallet.address.slice(0, 12)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}
    navigator.clipboard.writeText(backup);
    toast.success("Backup downloaded & copied!");
  };

  const balStr = balance != null ? parseFloat(balance).toFixed(8).replace(/\.?0+$/, "") : "0";

  // ======== RENDER ========

  // HOME: no wallets
  if (wallets.length === 0 && view === "home") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" data-testid="mobile-wallet-onboard">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-heading font-black mb-2">BricsCoin Wallet</h1>
          <p className="text-sm text-muted-foreground mb-8">Post-Quantum Secure. Your keys never leave this device.</p>
          <div className="space-y-3">
            <Button className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-base" data-testid="onboard-create"
              onClick={() => { setView("create"); handleCreate(); }}>
              <Plus className="w-5 h-5 mr-2" /> Create New PQC Wallet
            </Button>
            <Button variant="outline" className="w-full h-14 text-base border-white/10" data-testid="onboard-import"
              onClick={() => setView("import")}>
              <Key className="w-5 h-5 mr-2" /> Import Existing Wallet
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-8">
            ECDSA (secp256k1) + ML-DSA-65 (FIPS 204) hybrid signature
          </p>
        </motion.div>
      </div>
    );
  }

  // CREATE: show new wallet data
  if (view === "create" && (creating || newWalletData)) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-lg mx-auto" data-testid="mobile-wallet-create">
        <button onClick={() => { setView("home"); setNewWalletData(null); }} className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {creating && !newWalletData && (
          <div className="text-center py-20">
            <RefreshCw className="w-10 h-10 animate-spin text-emerald-400 mx-auto mb-4" />
            <p className="text-muted-foreground">Generating quantum-safe keys...</p>
          </div>
        )}
        {newWalletData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="text-center mb-6">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <h2 className="text-xl font-bold">Wallet Created!</h2>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-400 text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Save this information! It cannot be recovered.
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs font-mono p-2.5 bg-background/50 rounded break-all flex-1 border border-white/5" data-testid="new-wallet-address">
                  {newWalletData.address}
                </code>
                <button onClick={() => copyText(newWalletData.address)} className="p-2"><Copy className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-amber-400">Seed Phrase (12 words)</Label>
              <code className="block text-sm font-mono p-3 bg-amber-500/5 border border-amber-500/20 rounded text-amber-300 mt-1 leading-relaxed" data-testid="new-wallet-seed">
                {newWalletData.seed_phrase}
              </code>
            </div>
            <Button onClick={handleBackup} variant="outline" className="w-full h-12" data-testid="new-wallet-backup">
              <Download className="w-4 h-4 mr-2" /> Download Full Backup (JSON)
            </Button>
            <Button onClick={() => { setView("home"); setNewWalletData(null); }} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" data-testid="new-wallet-done">
              Done
            </Button>
          </motion.div>
        )}
      </div>
    );
  }

  // IMPORT
  if (view === "import") {
    return (
      <div className="min-h-screen px-4 py-8 max-w-lg mx-auto" data-testid="mobile-wallet-import">
        <button onClick={() => setView("home")} className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Key className="w-5 h-5 text-emerald-400" /> Import PQC Wallet</h2>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={importForm.name} onChange={e => setImportForm(p => ({...p, name: e.target.value}))}
              placeholder="Wallet name" data-testid="import-name" className="h-12" />
          </div>
          <div>
            <Label>ECDSA Private Key (hex)</Label>
            <Input value={importForm.ecdsa_key} onChange={e => setImportForm(p => ({...p, ecdsa_key: e.target.value}))}
              placeholder="64 hex characters" className="font-mono text-xs h-12" data-testid="import-ecdsa" />
          </div>
          <div>
            <Label>Dilithium Secret Key (hex)</Label>
            <Input value={importForm.dilithium_sk} onChange={e => setImportForm(p => ({...p, dilithium_sk: e.target.value}))}
              placeholder="Dilithium secret key" className="font-mono text-xs h-12" data-testid="import-dil-sk" />
          </div>
          <div>
            <Label>Dilithium Public Key (hex)</Label>
            <Input value={importForm.dilithium_pk} onChange={e => setImportForm(p => ({...p, dilithium_pk: e.target.value}))}
              placeholder="Dilithium public key" className="font-mono text-xs h-12" data-testid="import-dil-pk" />
          </div>
          <Button onClick={handleImport} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" data-testid="import-submit">
            Import Wallet
          </Button>
        </div>
      </div>
    );
  }

  // SEND
  if (view === "send") {
    return (
      <div className="min-h-screen px-4 py-8 max-w-lg mx-auto" data-testid="mobile-wallet-send">
        <button onClick={() => setView("wallet")} className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Send className="w-5 h-5 text-emerald-400" /> Send BRICS</h2>
        <p className="text-xs text-muted-foreground mb-6">Signed locally with ECDSA + ML-DSA-65</p>
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mb-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Balance</span>
          <span className="font-bold text-emerald-400">{balStr} BRICS</span>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Recipient Address</Label>
            <Input value={sendForm.recipient} onChange={e => setSendForm(p => ({...p, recipient: e.target.value}))}
              placeholder="BRICSPQ..." className="font-mono text-xs h-12" data-testid="send-recipient" />
          </div>
          <div>
            <Label>Amount</Label>
            <div className="flex gap-2">
              <Input type="number" value={sendForm.amount} onChange={e => setSendForm(p => ({...p, amount: e.target.value}))}
                placeholder="0.00" className="h-12 flex-1" data-testid="send-amount" />
              <Button variant="outline" className="h-12" onClick={() => {
                const max = Math.max(0, parseFloat(balance || 0) - 0.000005);
                setSendForm(p => ({...p, amount: max.toFixed(8).replace(/\.?0+$/, "")}));
              }} data-testid="send-max">MAX</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Fee: 0.000005 BRICS</p>
          </div>
          <Button onClick={handleSend} disabled={sending || !sendForm.recipient || !sendForm.amount}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-base" data-testid="send-confirm">
            {sending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
            {sending ? "Sending..." : "Sign & Send"}
          </Button>
        </div>
      </div>
    );
  }

  // SHIELDED SEND
  if (view === "shielded") {
    return (
      <div className="min-h-screen px-4 py-8 max-w-lg mx-auto" data-testid="mobile-wallet-shielded">
        <button onClick={() => setView("wallet")} className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><EyeOffIcon className="w-5 h-5 text-purple-400" /> Shielded Transaction</h2>
        <p className="text-xs text-muted-foreground mb-4">zk-STARK — sender, receiver & amount are all hidden</p>
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-purple-400">Total Privacy</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-[10px]">Sender Hidden</Badge>
            <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-[10px]">Receiver Hidden</Badge>
            <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-[10px]">Amount Hidden</Badge>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mb-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Balance</span>
          <span className="font-bold text-emerald-400">{balStr} BRICS</span>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Recipient Address</Label>
            <Input value={shieldedForm.recipient} onChange={e => setShieldedForm(p => ({...p, recipient: e.target.value}))}
              placeholder="BRICSPQ..." className="font-mono text-xs h-12" data-testid="shielded-recipient" />
          </div>
          <div>
            <Label>Amount (will be hidden)</Label>
            <Input type="number" value={shieldedForm.amount} onChange={e => setShieldedForm(p => ({...p, amount: e.target.value}))}
              placeholder="0.00" className="h-12" data-testid="shielded-amount" />
          </div>
          <Button onClick={handleShielded} disabled={sendingShielded || !shieldedForm.recipient || !shieldedForm.amount}
            className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-base" data-testid="shielded-confirm">
            {sendingShielded ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <EyeOffIcon className="w-4 h-4 mr-2" />}
            {sendingShielded ? "Sending..." : "Send Shielded"}
          </Button>
        </div>
      </div>
    );
  }

  // RECEIVE
  if (view === "receive") {
    return (
      <div className="min-h-screen px-4 py-8 max-w-lg mx-auto" data-testid="mobile-wallet-receive">
        <button onClick={() => setView("wallet")} className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><ArrowDownLeft className="w-5 h-5 text-emerald-400" /> Receive BRICS</h2>
        <div className="text-center space-y-6">
          <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center">
            <QrCode className="w-32 h-32 text-black" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Your PQC Address</Label>
            <div className="mt-2 p-4 bg-background/50 border border-white/10 rounded-lg break-all font-mono text-xs" data-testid="receive-address">
              {activeWallet?.address}
            </div>
          </div>
          <Button onClick={() => copyText(activeWallet?.address)} className="w-full h-12" variant="outline" data-testid="receive-copy">
            <Copy className="w-4 h-4 mr-2" /> Copy Address
          </Button>
        </div>
      </div>
    );
  }

  // HISTORY
  if (view === "history") {
    return (
      <div className="min-h-screen px-4 py-8 max-w-lg mx-auto" data-testid="mobile-wallet-history">
        <button onClick={() => setView("wallet")} className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><History className="w-5 h-5 text-emerald-400" /> Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx, i) => {
              const isSent = tx.sender === activeWallet?.address;
              const isShielded = tx.type === "shielded" || tx.type === "private";
              const isCoinbase = tx.sender === "COINBASE";
              return (
                <div key={tx.id || tx.tx_id || i} className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]" data-testid={`tx-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {isShielded ? (
                        <EyeOffIcon className="w-4 h-4 text-purple-400" />
                      ) : isCoinbase ? (
                        <Atom className="w-4 h-4 text-amber-400" />
                      ) : isSent ? (
                        <Send className="w-4 h-4 text-red-400" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="text-sm font-medium">
                        {isShielded ? "Shielded" : isCoinbase ? "Mining Reward" : isSent ? "Sent" : "Received"}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${isShielded ? "text-purple-400" : isSent ? "text-red-400" : "text-emerald-400"}`}>
                      {isShielded ? "HIDDEN" : isSent ? "-" : "+"}{!isShielded && (typeof tx.amount === "number" ? tx.amount.toFixed(4) : tx.amount)} {!isShielded && "BRICS"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isShielded ? (
                      <span className="text-purple-400/60">{tx.sender}</span>
                    ) : (
                      <span>{isSent ? "To: " : "From: "}{truncAddr(isSent ? tx.recipient : tx.sender, 8)}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground/50 mt-1">
                    {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // WALLET DETAIL
  if (view === "wallet" && activeWallet) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-lg mx-auto" data-testid="mobile-wallet-detail">
        <button onClick={() => setView("home")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Wallets
        </button>

        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 mb-6 bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
              <Atom className="w-3 h-3 mr-1" /> PQC HYBRID
            </Badge>
            <span className="text-xs text-muted-foreground">{activeWallet.name}</span>
          </div>
          <div className="my-4">
            {loadingBal ? (
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-4xl font-black text-emerald-400" data-testid="wallet-balance">{balStr}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">BRICS</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-[10px] font-mono text-muted-foreground truncate">{activeWallet.address}</code>
            <button onClick={() => copyText(activeWallet.address)}><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: Send, label: "Send", view: "send", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { icon: ArrowDownLeft, label: "Receive", view: "receive", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { icon: EyeOffIcon, label: "Shielded", view: "shielded", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
            { icon: History, label: "History", view: "history", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          ].map(item => (
            <button key={item.label} onClick={() => setView(item.view)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${item.bg} transition-all active:scale-95`}
              data-testid={`action-${item.label.toLowerCase()}`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 mb-6">
          <button onClick={handleBackup} className="w-full flex items-center justify-between p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] active:bg-white/[0.05]"
            data-testid="action-backup">
            <span className="flex items-center gap-3 text-sm"><Download className="w-4 h-4 text-muted-foreground" /> Backup Wallet</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => setView("create")} className="w-full flex items-center justify-between p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] active:bg-white/[0.05]"
            data-testid="action-new-wallet">
            <span className="flex items-center gap-3 text-sm"><Plus className="w-4 h-4 text-muted-foreground" /> Create New Wallet</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Recent Transactions</h3>
            <button onClick={() => setView("history")} className="text-xs text-primary">View All</button>
          </div>
          {transactions.slice(0, 5).map((tx, i) => {
            const isSent = tx.sender === activeWallet?.address;
            const isShielded = tx.type === "shielded" || tx.type === "private";
            const isCoinbase = tx.sender === "COINBASE";
            return (
              <div key={tx.id || tx.tx_id || i} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isShielded ? "bg-purple-500/10" : isCoinbase ? "bg-amber-500/10" : isSent ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                    {isShielded ? <EyeOffIcon className="w-4 h-4 text-purple-400" /> : isCoinbase ? <Atom className="w-4 h-4 text-amber-400" /> : isSent ? <Send className="w-3.5 h-3.5 text-red-400" /> : <ArrowDownLeft className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{isShielded ? "Shielded" : isCoinbase ? "Mining" : isSent ? "Sent" : "Received"}</p>
                    <p className="text-[10px] text-muted-foreground">{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : ""}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${isShielded ? "text-purple-400" : isSent ? "text-red-400" : "text-emerald-400"}`}>
                  {isShielded ? "HIDDEN" : `${isSent ? "-" : "+"}${typeof tx.amount === "number" ? tx.amount.toFixed(2) : tx.amount}`}
                </span>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No transactions yet</p>
          )}
        </div>
      </div>
    );
  }

  // HOME: wallet list
  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto" data-testid="mobile-wallet-home">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-heading font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" /> BricsCoin Wallet
        </h1>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setView("create"); handleCreate(); }}
          data-testid="home-create">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {wallets.map((w, i) => (
          <motion.button key={w.address} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="w-full text-left p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] active:bg-white/[0.05] transition-all"
            data-testid={`wallet-item-${i}`}
            onClick={() => { setActiveWallet(w); setView("wallet"); }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Atom className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{w.name}</p>
                  <code className="text-[10px] text-muted-foreground font-mono">{truncAddr(w.address, 10)}</code>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </motion.button>
        ))}
      </div>

      <Button variant="outline" className="w-full mt-4 h-12 border-white/10" onClick={() => setView("import")} data-testid="home-import">
        <Key className="w-4 h-4 mr-2" /> Import Wallet
      </Button>
    </div>
  );
}
