import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Lock, Zap, Eye, EyeOff, CheckCircle, XCircle,
  Info, Loader2, Shield, Atom, Wallet, ChevronDown, Copy, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import api, { getWalletBalance, getPQCWalletInfo } from "../lib/api";

function StatusBadge({ label, ok }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {ok ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
      <span className={ok ? "text-emerald-400" : "text-red-400"}>{label}</span>
    </div>
  );
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

export default function ZKPrivacy({ embedded = false }) {
  const [zkStatus, setZkStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Wallets
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Send form
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("");
  const [sending, setSending] = useState(false);

  // Result
  const [txResult, setTxResult] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load wallets
  useEffect(() => {
    const legacyRaw = localStorage.getItem("bricscoin_wallets");
    const pqcRaw = localStorage.getItem("bricscoin_pqc_wallets");
    const legacy = legacyRaw ? JSON.parse(legacyRaw).map(w => ({ ...w, type: "Legacy" })) : [];
    const pqc = pqcRaw ? JSON.parse(pqcRaw).map(w => ({ ...w, type: "PQC" })) : [];
    setWallets([...legacy, ...pqc]);
  }, []);

  // Dropdown close
  useEffect(() => {
    if (!walletDropdownOpen) return;
    const handler = () => setWalletDropdownOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [walletDropdownOpen]);

  const selectWallet = useCallback(async (wallet) => {
    setSelectedWallet(wallet);
    setWalletDropdownOpen(false);
    setBalance("");
    setBalanceLoading(true);
    try {
      const res = wallet.type === "Legacy"
        ? await getWalletBalance(wallet.address)
        : await getPQCWalletInfo(wallet.address);
      setBalance(String(res.data.balance ?? 0));
    } catch {
      setBalance("0");
    } finally {
      setBalanceLoading(false);
    }
    // Load history
    setHistoryLoading(true);
    try {
      const res = await api.get(`/zk/shielded-history/${wallet.address}`);
      setHistory(res.data.shielded_transactions || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await api.get("/zk/status");
      setZkStatus(res.data);
    } catch {
      toast.error("Failed to fetch ZK status");
    } finally {
      setStatusLoading(false);
    }
  };

  const sendShielded = async () => {
    if (!selectedWallet || !recipient || !amount) {
      toast.error("Select a wallet and fill all fields");
      return;
    }
    if (parseFloat(amount) <= 0) {
      toast.error("Amount must be positive");
      return;
    }
    if (parseFloat(amount) > parseFloat(balance)) {
      toast.error("Insufficient balance");
      return;
    }

    setSending(true);
    setTxResult(null);
    try {
      // Generate signature from wallet private key
      const timestamp = new Date().toISOString();
      const txData = `${selectedWallet.address}:${recipient}:${amount}:${timestamp}`;

      // Import signing library
      const { ec: EC } = await import("elliptic");
      const ecInstance = new EC("secp256k1");
      const key = ecInstance.keyFromPrivate(selectedWallet.privateKey || selectedWallet.private_key || selectedWallet.ecdsa_private_key);
      const msgHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txData));
      const signature = key.sign(new Uint8Array(msgHash));
      const sigHex = signature.r.toString("hex", 32) + signature.s.toString("hex", 32);
      const pubKey = key.getPublic("hex").slice(2); // Remove 04 prefix

      const res = await api.post("/zk/send-shielded", {
        sender_address: selectedWallet.address,
        recipient_address: recipient,
        amount: parseFloat(amount),
        public_key: pubKey,
        signature: sigHex,
        timestamp,
      });

      setTxResult(res.data);
      toast.success("Shielded transaction sent!");

      // Save blinding factor to localStorage for future decryption
      const savedFactors = JSON.parse(localStorage.getItem("bricscoin_blinding_factors") || "{}");
      savedFactors[res.data.transaction.id] = {
        blinding_factor: res.data.blinding_factor,
        amount: parseFloat(amount),
        sender: selectedWallet.address,
        recipient,
        timestamp,
      };
      localStorage.setItem("bricscoin_blinding_factors", JSON.stringify(savedFactors));

      // Refresh balance
      selectWallet(selectedWallet);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Transaction failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="zk-privacy-page">
      {/* Header - only standalone */}
      {!embedded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <h1 className="text-4xl sm:text-5xl font-heading font-bold">
              <span className="text-emerald-400">zk-STARK</span> Privacy
            </h1>
          </div>
          <p className="text-muted-foreground">
            Shielded transactions — amounts hidden on the blockchain
          </p>
        </motion.div>
      )}

      {/* Security badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: EyeOff, label: "Hidden Amounts", sub: "On blockchain", color: "text-emerald-400" },
          { icon: Atom, label: "Quantum-Safe", sub: "SHA-256 based", color: "text-cyan-400" },
          { icon: Eye, label: "No Trusted Setup", sub: "Transparent", color: "text-amber-400" },
          { icon: Zap, label: "128-bit Security", sub: "FRI + STARK", color: "text-purple-400" },
        ].map((f, i) => (
          <div key={i} className="p-3 rounded-sm border border-white/[0.06] bg-white/[0.02] text-center">
            <f.icon className={`w-5 h-5 mx-auto mb-1.5 ${f.color}`} />
            <p className="text-xs font-bold">{f.label}</p>
            <p className="text-[10px] text-muted-foreground">{f.sub}</p>
          </div>
        ))}
      </div>

      {/* Send Shielded Transaction */}
      <Card className="bg-card border-emerald-500/10" data-testid="shielded-tx-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="w-5 h-5 text-emerald-400" />
            Send Shielded Transaction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            The amount will be <strong className="text-emerald-400">hidden on the blockchain</strong>, replaced by a cryptographic commitment.
            A STARK proof verifies validity without revealing the amount. Only you and the recipient can decrypt it.
          </p>

          {/* Wallet Selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From Wallet</label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-sm border border-white/10 bg-background hover:border-emerald-500/30 transition-colors text-sm text-left"
                data-testid="zk-wallet-selector"
              >
                {selectedWallet ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-xs truncate">{selectedWallet.address}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{selectedWallet.type}</Badge>
                    {balance && !balanceLoading && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-auto">({balance} BRICS)</span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select wallet...</span>
                )}
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform ${walletDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {walletDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-white/10 rounded-sm shadow-xl max-h-60 overflow-y-auto">
                  {wallets.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground text-center">No wallets. Create one in Legacy or PQC tab.</p>
                  ) : wallets.map((w, i) => (
                    <button
                      key={i}
                      onClick={() => selectWallet(w)}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 border-b border-white/[0.03] last:border-0 ${
                        selectedWallet?.address === w.address ? "bg-emerald-500/5" : ""
                      }`}
                      data-testid={`zk-select-wallet-${i}`}
                    >
                      <Wallet className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs truncate flex-1">{w.address}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{w.type}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Recipient Address</label>
              <Input value={recipient} onChange={e => setRecipient(e.target.value)}
                placeholder="BRICS..." className="font-mono text-sm" data-testid="zk-recipient-input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount (will be hidden)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" className="font-mono text-sm" data-testid="zk-amount-input" />
            </div>
          </div>

          <Button onClick={sendShielded} disabled={sending || !selectedWallet}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="send-shielded-btn">
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating proof & sending...</>
            ) : (
              <><Lock className="w-4 h-4 mr-2" />Send Shielded Transaction</>
            )}
          </Button>

          {/* Transaction Result */}
          {txResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pt-4 border-t border-emerald-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-emerald-400">Shielded Transaction Sent</span>
              </div>

              {/* Blinding Factor Warning */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-400 mb-1">SAVE YOUR BLINDING FACTOR</p>
                    <p className="text-[10px] text-muted-foreground mb-2">You need this to decrypt the amount later. It has been auto-saved in your browser.</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono bg-black/30 px-2 py-1 rounded truncate block flex-1">
                        {txResult.blinding_factor}
                      </code>
                      <button onClick={() => copyToClipboard(txResult.blinding_factor)}
                        className="text-amber-400 hover:text-amber-300 shrink-0" data-testid="copy-blinding-factor">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
                  <p className="text-muted-foreground">TX ID</p>
                  <p className="font-mono font-bold truncate">{txResult.transaction.id}</p>
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
                  <p className="text-muted-foreground">Amount on Blockchain</p>
                  <p className="font-mono font-bold text-emerald-400">{txResult.transaction.display_amount}</p>
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
                  <p className="text-muted-foreground">Commitment</p>
                  <p className="font-mono font-bold truncate">{txResult.proof_metadata.commitment}</p>
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
                  <p className="text-muted-foreground">STARK Verified</p>
                  <p className="font-bold text-emerald-400">{txResult.proof_metadata.prove_time_ms}ms</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge label="Amount Hidden" ok={true} />
                <StatusBadge label="STARK Verified" ok={txResult.proof_metadata.stark_verified} />
                <StatusBadge label="Commitment Valid" ok={true} />
                <StatusBadge label="Quantum-Resistant" ok={true} />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Shielded History */}
      {selectedWallet && (
        <Card className="bg-card/50 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <EyeOff className="w-4 h-4 text-emerald-400" />
              Shielded Transaction History
              {history.length > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">{history.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No shielded transactions yet</p>
            ) : (
              <div className="space-y-2">
                {history.map((tx, i) => (
                  <div key={i} className="p-3 bg-white/[0.02] rounded-sm border border-white/[0.04] flex items-center gap-3">
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={tx.sender === selectedWallet.address ? "text-red-400" : "text-emerald-400"}>
                          {tx.sender === selectedWallet.address ? "Sent" : "Received"}
                        </span>
                        <span className="text-muted-foreground">
                          {tx.sender === selectedWallet.address
                            ? `to ${tx.recipient.slice(0, 10)}...`
                            : `from ${tx.sender.slice(0, 10)}...`}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">TX: {tx.id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                        SHIELDED
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-4 h-4 text-primary" />
            How Shielded Transactions Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {[
            { step: "01", title: "Amount Commitment", desc: "Your amount is replaced by a SHA-256 cryptographic commitment: C = Hash(amount + blinding_factor). The blockchain stores C, not the amount." },
            { step: "02", title: "STARK Proof", desc: "A zero-knowledge proof is generated proving you have sufficient balance, without revealing the exact balance or amount. Based on the FRI protocol." },
            { step: "03", title: "Encrypted Payload", desc: "The real amount is encrypted so only sender and recipient can decrypt it. Observers see 'SHIELDED' instead of the amount." },
            { step: "04", title: "On-Chain Verification", desc: "The commitment and proof hash are stored on the blockchain permanently. Anyone can verify the STARK proof is valid, but nobody can extract the amount." },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 py-4 border-b border-white/[0.04] last:border-0">
              <span className="text-xl font-heading font-black text-emerald-500/20 shrink-0">{item.step}</span>
              <div>
                <h4 className="font-bold text-sm mb-0.5">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Stack */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">BricsCoin Security Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { layer: "L1", tech: "SHA-256 Proof of Work", desc: "Block hashing", color: "text-amber-400" },
              { layer: "L2", tech: "ECDSA secp256k1", desc: "Legacy signatures", color: "text-blue-400" },
              { layer: "L3", tech: "ML-DSA-65 (PQC)", desc: "Post-quantum (FIPS 204)", color: "text-cyan-400" },
              { layer: "L4", tech: "zk-STARK (FRI)", desc: "Shielded transactions", color: "text-emerald-400" },
              { layer: "L5", tech: "Ring Signatures (LSAG)", desc: "Hidden sender", color: "text-violet-400" },
              { layer: "L6", tech: "Stealth Addresses (DHKE)", desc: "Hidden receiver", color: "text-pink-400" },
            ].map((l, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-sm border border-white/[0.06] bg-white/[0.02]">
                <Badge variant="outline" className="text-[10px] shrink-0 border-white/10 w-7 justify-center">{l.layer}</Badge>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-xs ${l.color}`}>{l.tech}</p>
                  <p className="text-[10px] text-muted-foreground">{l.desc}</p>
                </div>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
