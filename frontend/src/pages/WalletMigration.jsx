import { useState, useEffect } from "react";
import {
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  RefreshCw,
  Info,
  ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getWalletBalance, createPQCWallet, createSecureTransaction } from "../lib/api";
import { prepareSecureTransaction } from "../lib/crypto";
import { Link } from "react-router-dom";

export default function WalletMigration() {
  const [step, setStep] = useState(1);
  const [legacyWallets, setLegacyWallets] = useState([]);
  const [selectedLegacy, setSelectedLegacy] = useState(null);
  const [legacyBalance, setLegacyBalance] = useState(null);
  const [newPQCWallet, setNewPQCWallet] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Load legacy wallets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bricscoin_wallets");
    if (saved) {
      try {
        setLegacyWallets(JSON.parse(saved));
      } catch { setLegacyWallets([]); }
    }
  }, []);

  const selectLegacyWallet = async (wallet) => {
    setSelectedLegacy(wallet);
    setLoadingBalance(true);
    try {
      const res = await getWalletBalance(wallet.address);
      setLegacyBalance(res.data.balance);
    } catch {
      setLegacyBalance(0);
    } finally {
      setLoadingBalance(false);
    }
    setStep(2);
  };

  const generatePQCWallet = async () => {
    try {
      const res = await createPQCWallet("Migrated PQC Wallet");
      setNewPQCWallet(res.data);

      // Save to PQC wallets in localStorage
      const existing = JSON.parse(localStorage.getItem("bricscoin_pqc_wallets") || "[]");
      existing.push(res.data);
      localStorage.setItem("bricscoin_pqc_wallets", JSON.stringify(existing));

      setStep(3);
      toast.success("Wallet PQC generato per la migrazione!");
    } catch (err) {
      toast.error("Errore generazione wallet PQC: " + (err.response?.data?.detail || err.message));
    }
  };

  const executeMigration = async () => {
    if (!selectedLegacy || !newPQCWallet || legacyBalance <= 0) return;
    setMigrating(true);
    try {
      // Create a secure transaction from legacy wallet to new PQC wallet
      const txData = prepareSecureTransaction(selectedLegacy, newPQCWallet.address, legacyBalance);
      await createSecureTransaction(txData);
      setMigrationComplete(true);
      setStep(4);
      toast.success("Migrazione completata con successo!");
    } catch (err) {
      toast.error("Errore migrazione: " + (err.response?.data?.detail || err.message));
    } finally {
      setMigrating(false);
    }
  };

  const steps = [
    { num: 1, label: "Seleziona Wallet Legacy" },
    { num: 2, label: "Genera Wallet PQC" },
    { num: 3, label: "Trasferisci Fondi" },
    { num: 4, label: "Completato" },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto" data-testid="wallet-migration-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
          <ArrowRight className="w-8 h-8 text-amber-400" />
          Migrazione Quantum-Safe
        </h1>
        <p className="text-muted-foreground mt-1">
          Trasferisci i tuoi fondi da un wallet legacy ECDSA a un wallet PQC ibrido
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              step >= s.num
                ? step === s.num
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-muted-foreground border border-white/10"
            }`}>
              {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{s.num}</span>}
              {s.label}
            </div>
            {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Legacy Wallet */}
      {step === 1 && (
        <Card className="bg-card/60 border-white/10" data-testid="migration-step-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-400" />
              Seleziona Wallet Legacy da Migrare
            </CardTitle>
          </CardHeader>
          <CardContent>
            {legacyWallets.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Nessun wallet legacy trovato nel browser.</p>
                <p className="text-sm text-muted-foreground">
                  Vai alla pagina <Link to="/wallet" className="text-primary underline">Wallet</Link> per crearne uno prima.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {legacyWallets.map((w) => (
                  <motion.button key={w.address}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onClick={() => selectLegacyWallet(w)}
                    data-testid={`legacy-wallet-${w.address?.slice(0, 12)}`}
                    className="w-full text-left p-4 rounded border border-white/10 hover:border-amber-500/30 bg-background/30 transition-all"
                  >
                    <p className="text-sm font-medium text-foreground">{w.name || "Legacy Wallet"}</p>
                    <code className="text-xs font-mono text-muted-foreground">{w.address}</code>
                  </motion.button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Generate PQC Wallet */}
      {step === 2 && selectedLegacy && (
        <Card className="bg-card/60 border-white/10" data-testid="migration-step-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Genera Wallet PQC Destinazione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded bg-background/30 border border-white/5">
              <p className="text-xs text-muted-foreground">Wallet Legacy Selezionato</p>
              <code className="text-sm font-mono text-foreground">{selectedLegacy.address}</code>
              <p className="text-lg font-bold text-foreground mt-1">
                {loadingBalance ? <RefreshCw className="w-4 h-4 animate-spin inline" /> : `${legacyBalance} BRICS`}
              </p>
            </div>

            <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-400 font-medium mb-2">
                Verra creato un nuovo wallet PQC con firma ibrida ECDSA + ML-DSA-65 (FIPS 204).
                I tuoi fondi verranno trasferiti automaticamente.
              </p>
            </div>

            <Button onClick={generatePQCWallet} className="w-full bg-emerald-600 hover:bg-emerald-700"
              data-testid="migration-generate-pqc">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Genera Wallet PQC e Procedi
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              Indietro
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Transfer Funds */}
      {step === 3 && newPQCWallet && (
        <Card className="bg-card/60 border-white/10" data-testid="migration-step-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-cyan-400" />
              Conferma Trasferimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* From */}
            <div className="p-3 rounded bg-background/30 border border-white/5">
              <p className="text-xs text-amber-400 font-medium">DA (Legacy ECDSA)</p>
              <code className="text-xs font-mono text-foreground break-all">{selectedLegacy.address}</code>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
            </div>

            {/* To */}
            <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 font-medium">A (PQC Ibrido)</p>
              <code className="text-xs font-mono text-foreground break-all">{newPQCWallet.address}</code>
            </div>

            <div className="text-center py-2">
              <p className="text-3xl font-bold text-foreground">{legacyBalance} BRICS</p>
              <p className="text-xs text-muted-foreground">Importo totale da migrare</p>
            </div>

            {legacyBalance <= 0 && (
              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Il wallet legacy ha saldo 0. La migrazione registrera il wallet PQC ma non trasferira fondi.
                </p>
              </div>
            )}

            <Button onClick={executeMigration} disabled={migrating} className="w-full bg-amber-600 hover:bg-amber-700"
              data-testid="migration-execute">
              {migrating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
              {migrating ? "Migrazione in corso..." : "Esegui Migrazione"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <Card className="bg-card/60 border-emerald-500/20" data-testid="migration-step-4">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Migrazione Completata!</h2>
            <p className="text-muted-foreground mb-2">
              I tuoi fondi sono ora protetti dalla crittografia post-quantistica.
            </p>
            <code className="text-xs font-mono text-emerald-400 mb-6 break-all max-w-sm">
              {newPQCWallet?.address}
            </code>

            <div className="flex gap-3">
              <Link to="/pqc-wallet">
                <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="migration-go-pqc">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Vai al Wallet PQC
                </Button>
              </Link>
              <Button variant="outline" onClick={() => { setStep(1); setSelectedLegacy(null); setNewPQCWallet(null); setMigrationComplete(false); }}
                data-testid="migration-again">
                Migra un Altro Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-card/40 border-white/10">
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            Perche migrare?
          </h3>
          <p className="text-sm text-muted-foreground">
            I wallet legacy usano solo ECDSA (secp256k1), che e vulnerabile ai futuri computer quantistici. 
            Il wallet PQC aggiunge una seconda firma con ML-DSA-65 (FIPS 204), un algoritmo resistente agli attacchi 
            quantistici approvato dal NIST. La firma avviene interamente nel browser: le chiavi private non lasciano mai il tuo dispositivo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
