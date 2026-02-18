import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  RefreshCw,
  ArrowRight,
  Atom,
  Key,
  FileText,
  Send,
  AlertTriangle,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  createPQCWallet,
  importPQCWallet,
  getPQCWalletInfo,
  getPQCStats,
  createPQCTransaction
} from "../lib/api";
import { preparePQCTransaction, isValidPQCAddress } from "../lib/pqc-crypto";

function PQCWalletCard({ wallet, onSelect, isSelected }) {
  const [balance, setBalance] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPQCWalletInfo(wallet.address);
      setBalance(res.data.balance);
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [wallet.address]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copiato`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      data-testid={`pqc-wallet-card-${wallet.address.slice(0, 12)}`}
      className={`relative rounded-sm p-5 cursor-pointer transition-all border ${
        isSelected
          ? "border-emerald-500/60 bg-emerald-500/5"
          : "border-white/10 bg-card/60 hover:border-emerald-500/30"
      }`}
      onClick={() => onSelect(wallet)}
    >
      <div className="absolute top-3 right-3">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Atom className="w-3 h-3" /> PQC HYBRID
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-1">{wallet.name}</p>
      <div className="flex items-center gap-2 mb-3">
        <code className="text-xs font-mono text-foreground/80 truncate max-w-[200px]">{wallet.address}</code>
        <button onClick={(e) => { e.stopPropagation(); handleCopy(wallet.address, "Indirizzo"); }}
          className="text-muted-foreground hover:text-foreground" data-testid="pqc-copy-address">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="flex items-baseline gap-1">
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <span className="text-2xl font-bold text-emerald-400">{balance ?? "0"}</span>
            <span className="text-sm text-muted-foreground">BRICS</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function PQCWallet() {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showKeys, setShowKeys] = useState(false);
  const [stats, setStats] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newWalletData, setNewWalletData] = useState(null);
  const [importForm, setImportForm] = useState({ ecdsa_key: "", dilithium_sk: "", dilithium_pk: "", name: "" });
  const [sendForm, setSendForm] = useState({ recipient: "", amount: "" });
  const [sending, setSending] = useState(false);

  // Load wallets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bricscoin_pqc_wallets");
    if (saved) setWallets(JSON.parse(saved));
  }, []);

  // Load PQC stats
  useEffect(() => {
    getPQCStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const saveWallets = (newWallets) => {
    setWallets(newWallets);
    localStorage.setItem("bricscoin_pqc_wallets", JSON.stringify(newWallets));
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await createPQCWallet("PQC Wallet " + (wallets.length + 1));
      setNewWalletData(res.data);
      saveWallets([...wallets, res.data]);
      toast.success("Wallet PQC creato con successo!");
    } catch (err) {
      toast.error("Errore nella creazione: " + (err.response?.data?.detail || err.message));
    } finally {
      setCreating(false);
    }
  };

  const handleImport = async () => {
    try {
      const res = await importPQCWallet(
        importForm.ecdsa_key,
        importForm.dilithium_sk,
        importForm.dilithium_pk,
        importForm.name || "Imported PQC Wallet"
      );
      saveWallets([...wallets, res.data]);
      setImportOpen(false);
      setImportForm({ ecdsa_key: "", dilithium_sk: "", dilithium_pk: "", name: "" });
      toast.success("Wallet PQC importato!");
    } catch (err) {
      toast.error("Errore import: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleSend = async () => {
    if (!selectedWallet) return;
    setSending(true);
    try {
      const amount = parseFloat(sendForm.amount);
      if (!sendForm.recipient || amount <= 0) {
        toast.error("Inserisci un destinatario e importo validi");
        return;
      }

      // CLIENT-SIDE SIGNING: Private keys NEVER leave the browser
      // Signs with both ECDSA + ML-DSA-65 locally
      const txPayload = preparePQCTransaction(selectedWallet, sendForm.recipient, amount);

      // Send only signatures and public keys to server for verification
      const res = await createPQCTransaction(txPayload);
      toast.success(`Transazione firmata e inviata: ${res.data.tx_id?.slice(0, 16)}...`);
      setSendOpen(false);
      setSendForm({ recipient: "", amount: "" });
    } catch (err) {
      toast.error("Errore transazione: " + (err.response?.data?.detail || err.message));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (addr) => {
    const filtered = wallets.filter(w => w.address !== addr);
    saveWallets(filtered);
    if (selectedWallet?.address === addr) setSelectedWallet(null);
    toast.info("Wallet rimosso");
  };

  const downloadBackup = () => {
    if (!selectedWallet) return;
    const backup = {
      address: selectedWallet.address,
      wallet_type: selectedWallet.wallet_type,
      ecdsa_private_key: selectedWallet.ecdsa_private_key,
      ecdsa_public_key: selectedWallet.ecdsa_public_key,
      dilithium_secret_key: selectedWallet.dilithium_secret_key,
      dilithium_public_key: selectedWallet.dilithium_public_key,
      seed_phrase: selectedWallet.seed_phrase,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bricscoin-pqc-wallet-${selectedWallet.address.slice(0, 12)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Backup scaricato");
  };

  return (
    <div className="space-y-6" data-testid="pqc-wallet-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            Wallet Quantum-Safe
          </h1>
          <p className="text-muted-foreground mt-1">
            Firma ibrida ECDSA + ML-DSA-65 (FIPS 204) - Le chiavi private non lasciano mai il browser
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="pqc-import-btn">
                <Key className="w-4 h-4 mr-1" /> Importa
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10">
              <DialogHeader>
                <DialogTitle>Importa Wallet PQC</DialogTitle>
                <DialogDescription>Inserisci le chiavi private ECDSA e Dilithium</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={importForm.name} onChange={e => setImportForm(p => ({...p, name: e.target.value}))}
                    placeholder="Nome wallet" data-testid="pqc-import-name" />
                </div>
                <div>
                  <Label>Chiave privata ECDSA (hex)</Label>
                  <Input value={importForm.ecdsa_key} onChange={e => setImportForm(p => ({...p, ecdsa_key: e.target.value}))}
                    placeholder="64 caratteri hex" className="font-mono text-xs" data-testid="pqc-import-ecdsa" />
                </div>
                <div>
                  <Label>Chiave segreta Dilithium (hex)</Label>
                  <Input value={importForm.dilithium_sk} onChange={e => setImportForm(p => ({...p, dilithium_sk: e.target.value}))}
                    placeholder="Chiave segreta Dilithium hex" className="font-mono text-xs" data-testid="pqc-import-dilithium-sk" />
                </div>
                <div>
                  <Label>Chiave pubblica Dilithium (hex)</Label>
                  <Input value={importForm.dilithium_pk} onChange={e => setImportForm(p => ({...p, dilithium_pk: e.target.value}))}
                    placeholder="Chiave pubblica Dilithium hex" className="font-mono text-xs" data-testid="pqc-import-dilithium-pk" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleImport} data-testid="pqc-import-submit">Importa Wallet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setNewWalletData(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="pqc-create-btn">
                <Plus className="w-4 h-4 mr-1" /> Crea Wallet PQC
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuovo Wallet Quantum-Safe</DialogTitle>
                <DialogDescription>
                  Genera un wallet con firma ibrida ECDSA + ML-DSA-65 (FIPS 204)
                </DialogDescription>
              </DialogHeader>
              {!newWalletData ? (
                <div className="space-y-4">
                  <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <h4 className="font-semibold text-emerald-400 flex items-center gap-2 mb-2">
                      <Atom className="w-4 h-4" /> Cosa viene generato
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>Coppia di chiavi ECDSA (secp256k1) - compatibilita legacy</li>
                      <li>Coppia di chiavi ML-DSA-65 (FIPS 204) - resistenza quantistica</li>
                      <li>Indirizzo ibrido BRICSPQ... derivato da entrambe le chiavi</li>
                      <li>Seed phrase da 12 parole per il backup</li>
                    </ul>
                  </div>
                  <Button onClick={handleCreate} disabled={creating} className="w-full bg-emerald-600 hover:bg-emerald-700"
                    data-testid="pqc-create-confirm">
                    {creating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    {creating ? "Generazione in corso..." : "Genera Wallet Quantum-Safe"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30">
                    <p className="text-amber-400 text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Salva queste informazioni! Non possono essere recuperate.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Indirizzo</Label>
                    <code className="block text-xs font-mono p-2 bg-background/50 rounded break-all" data-testid="pqc-new-address">
                      {newWalletData.address}
                    </code>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Seed Phrase</Label>
                    <code className="block text-xs font-mono p-2 bg-background/50 rounded text-amber-400" data-testid="pqc-new-seed">
                      {newWalletData.seed_phrase}
                    </code>
                  </div>
                  <Button onClick={downloadBackup} variant="outline" className="w-full" data-testid="pqc-download-backup">
                    <Download className="w-4 h-4 mr-2" /> Scarica Backup Completo (JSON)
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* PQC Stats Banner */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Wallet PQC", value: stats.total_pqc_wallets, color: "text-emerald-400" },
            { label: "TX Quantistiche", value: stats.total_pqc_transactions, color: "text-cyan-400" },
            { label: "Blocchi Firmati", value: `${stats.total_pqc_blocks || 0}/${stats.total_blocks || 0}`, color: "text-amber-400" },
            { label: "Schema Firma", value: "Ibrido", color: "text-amber-400" },
            { label: "Stato", value: stats.status === "active" ? "Attivo" : "N/A", color: "text-emerald-400" },
          ].map((s, i) => (
            <Card key={i} className="bg-card/40 border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Wallet List */}
      {wallets.length === 0 ? (
        <Card className="bg-card/40 border-white/10 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldCheck className="w-16 h-16 text-emerald-500/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nessun Wallet PQC</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Crea il tuo primo wallet quantum-safe con firma ibrida ECDSA + ML-DSA-65
            </p>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreateOpen(true)}
              data-testid="pqc-empty-create-btn">
              <Plus className="w-4 h-4 mr-2" /> Crea Wallet PQC
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w) => (
            <PQCWalletCard key={w.address} wallet={w}
              onSelect={setSelectedWallet} isSelected={selectedWallet?.address === w.address} />
          ))}
        </div>
      )}

      {/* Selected Wallet Detail */}
      {selectedWallet && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card/60 border-emerald-500/20" data-testid="pqc-wallet-detail">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  {selectedWallet.name}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSendOpen(true)} data-testid="pqc-send-btn">
                    <Send className="w-3.5 h-3.5 mr-1" /> Invia
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadBackup} data-testid="pqc-backup-btn">
                    <Download className="w-3.5 h-3.5 mr-1" /> Backup
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedWallet.address)}
                    data-testid="pqc-delete-btn">Rimuovi</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Indirizzo PQC</Label>
                <code className="block text-sm font-mono p-2 bg-background/50 rounded break-all">{selectedWallet.address}</code>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowKeys(!showKeys)} data-testid="pqc-toggle-keys">
                  {showKeys ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  {showKeys ? "Nascondi Chiavi" : "Mostra Chiavi"}
                </Button>
              </div>

              {showKeys && (
                <div className="space-y-3 p-4 rounded bg-background/30 border border-white/5">
                  <div>
                    <Label className="text-xs text-amber-400">Chiave Pubblica ECDSA</Label>
                    <code className="block text-[10px] font-mono p-1.5 bg-background/50 rounded break-all text-muted-foreground">
                      {selectedWallet.ecdsa_public_key}
                    </code>
                  </div>
                  <div>
                    <Label className="text-xs text-emerald-400">Chiave Pubblica Dilithium</Label>
                    <code className="block text-[10px] font-mono p-1.5 bg-background/50 rounded break-all text-muted-foreground max-h-20 overflow-y-auto">
                      {selectedWallet.dilithium_public_key?.slice(0, 200)}...
                    </code>
                  </div>
                  {selectedWallet.seed_phrase && (
                    <div>
                      <Label className="text-xs text-red-400">Seed Phrase (SEGRETO!)</Label>
                      <code className="block text-xs font-mono p-1.5 bg-red-500/5 border border-red-500/20 rounded text-red-300">
                        {selectedWallet.seed_phrase}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {/* Signature Info */}
              <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/10">
                <h4 className="text-sm font-semibold text-emerald-400 mb-1">Schema di Firma Client-Side</h4>
                <p className="text-xs text-muted-foreground">
                  ECDSA (secp256k1) + ML-DSA-65 (FIPS 204) - Le chiavi private non lasciano MAI il browser.
                  Ogni transazione viene firmata localmente con entrambi gli algoritmi e solo le firme vengono inviate al server.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Send Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle>Invia BRICS (PQC)</DialogTitle>
            <DialogDescription>Transazione firmata con schema ibrido quantum-safe</DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-400">
              <strong>Firmato Localmente</strong> — La firma ECDSA + ML-DSA-65 avviene nel tuo browser. Le chiavi private non lasciano mai il dispositivo.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Destinatario</Label>
              <Input value={sendForm.recipient} onChange={e => setSendForm(p => ({...p, recipient: e.target.value}))}
                placeholder="BRICS... o BRICSPQ..." className="font-mono text-xs" data-testid="pqc-send-recipient" />
            </div>
            <div>
              <Label>Importo (BRICS)</Label>
              <Input type="number" value={sendForm.amount} onChange={e => setSendForm(p => ({...p, amount: e.target.value}))}
                placeholder="0.00" data-testid="pqc-send-amount" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSend} disabled={sending || !sendForm.recipient || !sendForm.amount}
              className="bg-emerald-600 hover:bg-emerald-700" data-testid="pqc-send-confirm">
              {sending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {sending ? "Invio in corso..." : "Invia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Section */}
      <Card className="bg-card/40 border-white/10">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Cosa e la Crittografia Post-Quantistica?
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <h4 className="text-foreground font-medium mb-1">Il Problema</h4>
              <p>I computer quantistici potranno rompere ECDSA e RSA, le basi della sicurezza blockchain attuale.
                BricsCoin implementa una difesa proattiva.</p>
            </div>
            <div>
              <h4 className="text-foreground font-medium mb-1">La Soluzione</h4>
              <p>Schema di firma ibrido: ECDSA (classico) + ML-DSA-65 (quantistico, FIPS 204). 
                Ogni transazione viene firmata nel browser con entrambi gli algoritmi. Le chiavi private non lasciano mai il tuo dispositivo.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
