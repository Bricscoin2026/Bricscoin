import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield, Lock, Eye, EyeOff, CheckCircle, XCircle, Users,
  Loader2, Wallet, ChevronDown, Copy, AlertTriangle, Send,
  Fingerprint, UserX, Scan, Key, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import api, { getWalletBalance, getPQCWalletInfo } from "../lib/api";

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  toast.success("Copiato!");
}

function PrivacyBadges() {
  const badges = [
    { icon: UserX, label: "Sender Hidden", sub: "Ring Signature", color: "text-violet-400" },
    { icon: EyeOff, label: "Receiver Hidden", sub: "Stealth Address", color: "text-cyan-400" },
    { icon: Lock, label: "Amount Hidden", sub: "zk-STARK", color: "text-emerald-400" },
    { icon: Fingerprint, label: "Anti Double-Spend", sub: "Key Image", color: "text-amber-400" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {badges.map((b, i) => (
        <div key={i} className="p-3 rounded-sm border border-white/[0.06] bg-white/[0.02] text-center">
          <b.icon className={`w-5 h-5 mx-auto mb-1.5 ${b.color}`} />
          <p className="text-xs font-bold">{b.label}</p>
          <p className="text-[10px] text-muted-foreground">{b.sub}</p>
        </div>
      ))}
    </div>
  );
}

function StealthSetup({ onMetaGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [meta, setMeta] = useState(null);

  // Load existing meta from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bricscoin_stealth_meta");
    if (saved) setMeta(JSON.parse(saved));
  }, []);

  const generateMeta = async () => {
    setGenerating(true);
    try {
      const res = await api.post("/privacy/stealth/generate-meta", {});
      const data = res.data.meta_address;
      setMeta(data);
      localStorage.setItem("bricscoin_stealth_meta", JSON.stringify(data));
      if (onMetaGenerated) onMetaGenerated(data);
      toast.success("Stealth meta-address generato!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Errore generazione stealth");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="bg-card border-cyan-500/10" data-testid="stealth-setup-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="w-5 h-5 text-cyan-400" />
          Stealth Address Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Genera il tuo <strong className="text-cyan-400">stealth meta-address</strong> per ricevere pagamenti privati.
          Il mittente crea un indirizzo one-time — nessuno sulla blockchain può collegarlo a te.
        </p>
        {meta ? (
          <div className="space-y-2">
            <div className="p-3 bg-cyan-500/5 rounded-sm border border-cyan-500/10">
              <p className="text-[10px] text-muted-foreground mb-1">Stealth Meta-Address</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono truncate flex-1" data-testid="stealth-meta-addr">{meta.stealth_meta_address}</code>
                <button onClick={() => copyToClipboard(meta.stealth_meta_address)} className="text-cyan-400 hover:text-cyan-300 shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white/[0.02] rounded-sm border border-white/[0.04]">
                <p className="text-[10px] text-muted-foreground">Scan Public Key</p>
                <p className="font-mono text-[10px] truncate">{meta.scan_public_key?.slice(0, 24)}...</p>
              </div>
              <div className="p-2 bg-white/[0.02] rounded-sm border border-white/[0.04]">
                <p className="text-[10px] text-muted-foreground">Spend Public Key</p>
                <p className="font-mono text-[10px] truncate">{meta.spend_public_key?.slice(0, 24)}...</p>
              </div>
            </div>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground">
                  Le chiavi private sono salvate nel browser. <strong className="text-amber-400">Esegui il backup!</strong>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Button onClick={generateMeta} disabled={generating} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" data-testid="generate-stealth-meta-btn">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generazione...</> : <><Key className="w-4 h-4 mr-2" />Genera Stealth Meta-Address</>}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function StealthScanner() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);

  const scanPayments = async () => {
    const saved = localStorage.getItem("bricscoin_stealth_meta");
    if (!saved) {
      toast.error("Prima genera uno stealth meta-address!");
      return;
    }
    const meta = JSON.parse(saved);
    setScanning(true);
    try {
      const res = await api.post("/privacy/stealth/scan", {
        scan_private_key: meta.scan_private_key,
        spend_pubkey: meta.spend_public_key,
      });
      setResults(res.data);
      if (res.data.payments_found > 0) {
        toast.success(`Trovati ${res.data.payments_found} pagamenti stealth!`);
      } else {
        toast.info("Nessun pagamento stealth trovato");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Errore scansione");
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card className="bg-card/50 border-white/10" data-testid="stealth-scanner-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scan className="w-4 h-4 text-cyan-400" />
          Scan Stealth Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Scansiona la blockchain per trovare pagamenti stealth indirizzati a te.
        </p>
        <Button onClick={scanPayments} disabled={scanning} variant="outline" className="w-full" data-testid="scan-stealth-btn">
          {scanning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scansione...</> : <><Scan className="w-4 h-4 mr-2" />Scansiona Blockchain</>}
        </Button>
        {results && (
          <div className="p-3 bg-white/[0.02] rounded-sm border border-white/[0.04] text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Transazioni scansionate</span>
              <span>{results.transactions_scanned}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Pagamenti trovati</span>
              <span className={results.payments_found > 0 ? "text-emerald-400 font-bold" : ""}>{results.payments_found}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tempo</span>
              <span>{results.scan_time_ms}ms</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PrivacySuite({ embedded = false }) {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [balance, setBalance] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Send form
  const [recipientScan, setRecipientScan] = useState("");
  const [recipientSpend, setRecipientSpend] = useState("");
  const [amount, setAmount] = useState("");
  const [ringSize, setRingSize] = useState("16");
  const [sending, setSending] = useState(false);
  const [txResult, setTxResult] = useState(null);

  // Privacy status
  const [privacyStatus, setPrivacyStatus] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const legacyRaw = localStorage.getItem("bricscoin_wallets");
    const pqcRaw = localStorage.getItem("bricscoin_pqc_wallets");
    const legacy = legacyRaw ? JSON.parse(legacyRaw).map(w => ({ ...w, type: "Legacy" })) : [];
    const pqc = pqcRaw ? JSON.parse(pqcRaw).map(w => ({ ...w, type: "PQC" })) : [];
    setWallets([...legacy, ...pqc]);
  }, []);

  useEffect(() => {
    api.get("/privacy/status").then(r => setPrivacyStatus(r.data)).catch(() => {});
  }, []);

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
      const res = await api.get(`/privacy/history/${wallet.address}`);
      setHistory(res.data.private_transactions || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const sendPrivate = async () => {
    if (!selectedWallet || !recipientScan || !recipientSpend || !amount) {
      toast.error("Compila tutti i campi");
      return;
    }
    if (parseFloat(amount) <= 0) {
      toast.error("L'importo deve essere positivo");
      return;
    }
    if (parseFloat(amount) > parseFloat(balance)) {
      toast.error("Saldo insufficiente");
      return;
    }

    setSending(true);
    setTxResult(null);
    try {
      const privKey = selectedWallet.privateKey || selectedWallet.private_key || selectedWallet.ecdsa_private_key;
      const { ec: EC } = await import("elliptic");
      const ecInstance = new EC("secp256k1");
      const key = ecInstance.keyFromPrivate(privKey);
      const pubKey = key.getPublic("hex").slice(2);

      const res = await api.post("/privacy/send-private", {
        sender_address: selectedWallet.address,
        sender_private_key: privKey,
        sender_public_key: pubKey,
        recipient_scan_pubkey: recipientScan,
        recipient_spend_pubkey: recipientSpend,
        amount: parseFloat(amount),
        ring_size: parseInt(ringSize),
      });

      setTxResult(res.data);
      toast.success("Transazione privata inviata con successo!");

      // Save blinding factor
      const savedFactors = JSON.parse(localStorage.getItem("bricscoin_blinding_factors") || "{}");
      savedFactors[res.data.transaction.id] = {
        blinding_factor: res.data.blinding_factor,
        amount: parseFloat(amount),
        sender: selectedWallet.address,
        recipient: res.data.transaction.stealth_address,
        timestamp: res.data.transaction.timestamp,
        type: "private",
      };
      localStorage.setItem("bricscoin_blinding_factors", JSON.stringify(savedFactors));

      // Refresh balance
      selectWallet(selectedWallet);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Transazione fallita");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="privacy-suite-page">
      {!embedded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-7 h-7 text-violet-400" />
            <h1 className="text-4xl sm:text-5xl font-heading font-bold">
              <span className="text-violet-400">Total</span> Privacy
            </h1>
          </div>
          <p className="text-muted-foreground">
            Ring Signatures + Stealth Addresses + zk-STARK — Total transaction privacy
          </p>
        </motion.div>
      )}

      <PrivacyBadges />

      {/* Send Fully Private Transaction */}
      <Card className="bg-card border-violet-500/10" data-testid="private-tx-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-violet-400" />
            Send Private Transaction
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-[10px] ml-auto">TOTAL PRIVACY</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Invia una transazione con <strong className="text-violet-400">privacy totale</strong>:
            il mittente è nascosto tra un ring di firme, il destinatario riceve su un indirizzo stealth one-time,
            e l'importo è protetto da zk-STARK.
          </p>

          {/* Wallet Selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From Wallet</label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-sm border border-white/10 bg-background hover:border-violet-500/30 transition-colors text-sm text-left"
                data-testid="privacy-wallet-selector"
              >
                {selectedWallet ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <Wallet className="w-4 h-4 text-violet-400 shrink-0" />
                    <span className="font-mono text-xs truncate">{selectedWallet.address}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{selectedWallet.type}</Badge>
                    {balance && !balanceLoading && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-auto">({balance} BRICS)</span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Seleziona wallet...</span>
                )}
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform ${walletDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {walletDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-white/10 rounded-sm shadow-xl max-h-60 overflow-y-auto">
                  {wallets.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nessun wallet. Creane uno nella tab Legacy o PQC.</p>
                  ) : wallets.map((w, i) => (
                    <button
                      key={i}
                      onClick={() => selectWallet(w)}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 border-b border-white/[0.03] last:border-0 ${
                        selectedWallet?.address === w.address ? "bg-violet-500/5" : ""
                      }`}
                      data-testid={`privacy-select-wallet-${i}`}
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

          {/* Recipient Stealth Keys */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Recipient Scan Public Key</label>
              <Input value={recipientScan} onChange={e => setRecipientScan(e.target.value)}
                placeholder="Scan public key del destinatario..." className="font-mono text-xs" data-testid="privacy-recipient-scan-input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Recipient Spend Public Key</label>
              <Input value={recipientSpend} onChange={e => setRecipientSpend(e.target.value)}
                placeholder="Spend public key del destinatario..." className="font-mono text-xs" data-testid="privacy-recipient-spend-input" />
            </div>
          </div>

          {/* Amount + Ring Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount (will be hidden)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" className="font-mono text-sm" data-testid="privacy-amount-input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ring Size (anonymity set)</label>
              <select
                value={ringSize}
                onChange={e => setRingSize(e.target.value)}
                className="w-full px-3 py-2 rounded-sm border border-white/10 bg-background text-sm"
                data-testid="privacy-ring-size-select"
              >
                <option value="3">3 (Fast)</option>
                <option value="5">5 (Default)</option>
                <option value="7">7 (Higher Privacy)</option>
                <option value="11">11 (Maximum)</option>
              </select>
            </div>
          </div>

          <Button onClick={sendPrivate} disabled={sending || !selectedWallet}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white" data-testid="send-private-btn">
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ring Sign + Stealth + STARK...</>
            ) : (
              <><Shield className="w-4 h-4 mr-2" />Send Private Transaction</>
            )}
          </Button>

          {/* Transaction Result */}
          {txResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pt-4 border-t border-violet-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-violet-400" />
                <span className="font-bold text-violet-400">Private Transaction Sent!</span>
              </div>

              {/* Blinding Factor Warning */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-400 mb-1">SALVA IL BLINDING FACTOR</p>
                    <p className="text-[10px] text-muted-foreground mb-2">Ti serve per decriptare l'importo. Salvato nel browser automaticamente.</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono bg-black/30 px-2 py-1 rounded truncate block flex-1">
                        {txResult.blinding_factor}
                      </code>
                      <button onClick={() => copyToClipboard(txResult.blinding_factor)} className="text-amber-400 hover:text-amber-300 shrink-0" data-testid="copy-blinding-factor-private">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Summary */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-violet-500/5 rounded-sm border border-violet-500/10 text-center">
                  <UserX className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Sender</p>
                  <p className="font-bold text-violet-400">HIDDEN</p>
                  <p className="text-[10px] text-muted-foreground">Ring: {txResult.transaction?.ring_size}</p>
                </div>
                <div className="p-2.5 bg-cyan-500/5 rounded-sm border border-cyan-500/10 text-center">
                  <EyeOff className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Receiver</p>
                  <p className="font-bold text-cyan-400">HIDDEN</p>
                  <p className="text-[10px] text-muted-foreground">Stealth</p>
                </div>
                <div className="p-2.5 bg-emerald-500/5 rounded-sm border border-emerald-500/10 text-center">
                  <Lock className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Amount</p>
                  <p className="font-bold text-emerald-400">HIDDEN</p>
                  <p className="text-[10px] text-muted-foreground">zk-STARK</p>
                </div>
              </div>

              {/* TX Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white/[0.02] rounded-sm border border-white/[0.04]">
                  <p className="text-muted-foreground">TX ID</p>
                  <p className="font-mono font-bold truncate">{txResult.transaction?.id}</p>
                </div>
                <div className="p-2.5 bg-white/[0.02] rounded-sm border border-white/[0.04]">
                  <p className="text-muted-foreground">Stealth Address</p>
                  <p className="font-mono font-bold truncate">{txResult.transaction?.stealth_address}</p>
                </div>
              </div>

              {/* Timing */}
              {txResult.timing && (
                <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  <span>Ring: {txResult.timing.ring_signature_ms}ms</span>
                  <span>Stealth: {txResult.timing.stealth_address_ms}ms</span>
                  <span>STARK: {txResult.timing.stark_proof_ms}ms</span>
                  <span className="font-bold text-foreground">Total: {txResult.timing.total_ms}ms</span>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Stealth Setup + Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StealthSetup />
        <StealthScanner />
      </div>

      {/* Private Transaction History */}
      {selectedWallet && (
        <Card className="bg-card/50 border-white/10" data-testid="private-history-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-violet-400" />
              Private Transaction History
              {history.length > 0 && (
                <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 ml-2">{history.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nessuna transazione privata ancora</p>
            ) : (
              <div className="space-y-2">
                {history.map((tx, i) => (
                  <div key={i} className="p-3 bg-white/[0.02] rounded-sm border border-white/[0.04] flex items-center gap-3">
                    <Shield className="w-4 h-4 text-violet-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-[10px]">PRIVATE</Badge>
                        <span className="text-muted-foreground truncate">
                          to {tx.stealth_address?.slice(0, 16)}...
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">TX: {tx.id}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">SHIELDED</Badge>
                      <p className="text-[10px] text-muted-foreground">
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : ""}
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
            Come Funziona la Privacy Totale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {[
            { step: "01", title: "Ring Signature (Sender Hidden)", desc: "La tua firma viene mescolata con quelle di altri utenti nel \"ring\". Nessuno può determinare chi ha realmente firmato la transazione. Il Key Image previene il double-spending.", color: "text-violet-400" },
            { step: "02", title: "Stealth Address (Receiver Hidden)", desc: "Viene generato un indirizzo one-time per il destinatario usando DHKE. Solo il destinatario, con la sua scan key, puo' riconoscere il pagamento.", color: "text-cyan-400" },
            { step: "03", title: "zk-STARK Proof (Amount Hidden)", desc: "L'importo viene nascosto tramite un commitment crittografico. Una STARK proof (FRI protocol) dimostra la validita' senza rivelare l'importo.", color: "text-emerald-400" },
            { step: "04", title: "On-Chain Result", desc: "La blockchain mostra: sender = RING_HIDDEN, receiver = BRICSX... (stealth), amount = SHIELDED. Privacy totale mantenuta.", color: "text-amber-400" },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 py-4 border-b border-white/[0.04] last:border-0">
              <span className={`text-xl font-heading font-black ${item.color} opacity-30 shrink-0`}>{item.step}</span>
              <div>
                <h4 className={`font-bold text-sm mb-0.5 ${item.color}`}>{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Stack */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">BricsCoin Full Security Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { layer: "L1", tech: "SHA-256 Proof of Work", desc: "Block hashing", color: "text-amber-400" },
              { layer: "L2", tech: "ECDSA secp256k1", desc: "Legacy signatures", color: "text-blue-400" },
              { layer: "L3", tech: "ML-DSA-65 (PQC)", desc: "Post-quantum (FIPS 204)", color: "text-cyan-400" },
              { layer: "L4", tech: "zk-STARK (FRI)", desc: "Hidden amounts", color: "text-emerald-400" },
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
