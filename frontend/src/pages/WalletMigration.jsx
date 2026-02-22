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
import { getWalletBalance, createPQCWallet, migrateToPQC } from "../lib/api";
import { prepareSecureTransaction } from "../lib/crypto";
import { Link } from "react-router-dom";

export default function WalletMigration({ embedded }) {
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
      toast.success("PQC wallet generated for migration!");
    } catch (err) {
      toast.error("PQC wallet generation error: " + (err.response?.data?.detail || err.message));
    }
  };

  const executeMigration = async () => {
    if (!selectedLegacy || !newPQCWallet || legacyBalance <= 0) return;
    setMigrating(true);
    try {
      // Send full balance - no fee for migration
      const amount = Math.floor(legacyBalance * 1e8) / 1e8;
      const txData = prepareSecureTransaction(selectedLegacy, newPQCWallet.address, amount);
      await migrateToPQC(txData);
      setMigrationComplete(true);
      setStep(4);
      toast.success("Migration completed successfully!");
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg || JSON.stringify(d)).join(', ')
        : detail || err.message;
      toast.error("Migration error: " + msg);
    } finally {
      setMigrating(false);
    }
  };

  const steps = [
    { num: 1, label: "Select Legacy Wallet" },
    { num: 2, label: "Generate PQC Wallet" },
    { num: 3, label: "Transfer Funds" },
    { num: 4, label: "Complete" },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto" data-testid="wallet-migration-page">
      {/* Header */}
      {!embedded && (
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
          <ArrowRight className="w-8 h-8 text-amber-400" />
          Quantum-Safe Migration
        </h1>
        <p className="text-muted-foreground mt-1">
          Transfer your funds from a legacy ECDSA wallet to a hybrid PQC wallet
        </p>
      </div>
      )}

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
              Select Legacy Wallet to Migrate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {legacyWallets.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No legacy wallets found in the browser.</p>
                <p className="text-sm text-muted-foreground">
                  Go to the <Link to="/wallet" className="text-primary underline">Wallet</Link> page to create one first.
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
              Generate PQC Destination Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded bg-background/30 border border-white/5">
              <p className="text-xs text-muted-foreground">Selected Legacy Wallet</p>
              <code className="text-sm font-mono text-foreground">{selectedLegacy.address}</code>
              <p className="text-lg font-bold text-foreground mt-1">
                {loadingBalance ? <RefreshCw className="w-4 h-4 animate-spin inline" /> : `${legacyBalance} BRICS`}
              </p>
            </div>

            <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-400 font-medium mb-2">
                A new PQC wallet with hybrid ECDSA + ML-DSA-65 (FIPS 204) signature will be created.
                Your funds will be transferred automatically.
              </p>
            </div>

            <Button onClick={generatePQCWallet} className="w-full bg-emerald-600 hover:bg-emerald-700"
              data-testid="migration-generate-pqc">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Generate PQC Wallet and Proceed
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              Back
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
              Confirm Transfer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* From */}
            <div className="p-3 rounded bg-background/30 border border-white/5">
              <p className="text-xs text-amber-400 font-medium">FROM (Legacy ECDSA)</p>
              <code className="text-xs font-mono text-foreground break-all">{selectedLegacy.address}</code>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
            </div>

            {/* To */}
            <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 font-medium">TO (PQC Hybrid)</p>
              <code className="text-xs font-mono text-foreground break-all">{newPQCWallet.address}</code>
            </div>

            <div className="text-center py-2">
              <p className="text-3xl font-bold text-foreground">{legacyBalance} BRICS</p>
              <p className="text-xs text-muted-foreground">Total amount to migrate</p>
            </div>

            {legacyBalance <= 0 && (
              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  The legacy wallet has 0 balance. Migration will register the PQC wallet but will not transfer funds.
                </p>
              </div>
            )}

            <Button onClick={executeMigration} disabled={migrating} className="w-full bg-amber-600 hover:bg-amber-700"
              data-testid="migration-execute">
              {migrating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
              {migrating ? "Migration in progress..." : "Execute Migration"}
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
            <h2 className="text-2xl font-bold text-foreground mb-2">Migration Complete!</h2>
            <p className="text-muted-foreground mb-2">
              Your funds are now protected by post-quantum cryptography.
            </p>
            <code className="text-xs font-mono text-emerald-400 mb-6 break-all max-w-sm">
              {newPQCWallet?.address}
            </code>

            <div className="flex gap-3">
              <Link to="/pqc-wallet">
                <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="migration-go-pqc">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Go to PQC Wallet
                </Button>
              </Link>
              <Button variant="outline" onClick={() => { setStep(1); setSelectedLegacy(null); setNewPQCWallet(null); setMigrationComplete(false); }}
                data-testid="migration-again">
                Migrate Another Wallet
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
            Why migrate?
          </h3>
          <p className="text-sm text-muted-foreground">
            Legacy wallets use only ECDSA (secp256k1), which is vulnerable to future quantum computers. 
            The PQC wallet adds a second signature with ML-DSA-65 (FIPS 204), a quantum-resistant algorithm 
            approved by NIST. Signing happens entirely in the browser: private keys never leave your device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
