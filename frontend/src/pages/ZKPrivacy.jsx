import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Lock, Zap, Eye, EyeOff, Send, CheckCircle, XCircle,
  Info, Loader2, Shield, Atom, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import api from "../lib/api";

function StatusBadge({ label, ok }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {ok ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
      <span className={ok ? "text-emerald-400" : "text-red-400"}>{label}</span>
    </div>
  );
}

export default function ZKPrivacy({ embedded = false }) {
  const [zkStatus, setZkStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Prove transaction
  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("");
  const [proving, setProving] = useState(false);
  const [proof, setProof] = useState(null);

  // Verify
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

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

  const generateProof = async () => {
    if (!sender || !recipient || !amount || !balance) {
      toast.error("Fill all fields");
      return;
    }
    setProving(true);
    setProof(null);
    setVerifyResult(null);
    try {
      const res = await api.post("/zk/prove-transaction", {
        sender_address: sender,
        recipient_address: recipient,
        amount: parseFloat(amount),
        balance: parseFloat(balance),
      });
      setProof(res.data);
      toast.success(`STARK proof generated in ${res.data.metadata.prove_time_ms}ms`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Proof generation failed");
    } finally {
      setProving(false);
    }
  };

  const verifyProof = async () => {
    if (!proof) return;
    setVerifying(true);
    try {
      const res = await api.post("/zk/verify", { proof: proof.proof });
      setVerifyResult(res.data);
      if (res.data.valid) {
        toast.success("Proof verified successfully");
      } else {
        toast.error("Proof verification failed");
      }
    } catch {
      toast.error("Verification error");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 pb-12" data-testid="zk-privacy-page">
      {/* Header - only show when standalone */}
      {!embedded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <h1 className="text-4xl sm:text-5xl font-heading font-bold">
              <span className="text-emerald-400">zk-STARK</span> Privacy
            </h1>
          </div>
          <p className="text-muted-foreground">
            Zero-Knowledge proofs — prove transaction validity without revealing amounts or balances
          </p>
        </motion.div>
      )}

      {/* Security Features Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Lock, label: "Zero Knowledge", sub: "Nothing revealed", color: "text-emerald-400" },
            { icon: Atom, label: "Quantum-Safe", sub: "Hash-based (SHA-256)", color: "text-cyan-400" },
            { icon: Eye, label: "Transparent", sub: "No trusted setup", color: "text-amber-400" },
            { icon: Zap, label: "128-bit Security", sub: "FRI protocol", color: "text-purple-400" },
          ].map((f, i) => (
            <div key={i} className="p-4 rounded-sm border border-white/[0.06] bg-white/[0.02] text-center">
              <f.icon className={`w-6 h-6 mx-auto mb-2 ${f.color}`} />
              <p className="text-sm font-bold">{f.label}</p>
              <p className="text-[10px] text-muted-foreground">{f.sub}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* System Status */}
      <Card className="bg-card/50 border-emerald-500/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-emerald-400" />
              Protocol Status
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchStatus} disabled={statusLoading}
              className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 rounded-sm"
              data-testid="fetch-zk-status-btn">
              {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check Status"}
            </Button>
          </div>
        </CardHeader>
        {zkStatus && (
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                {zkStatus.protocol}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-400">
                {zkStatus.security.hash_function}
              </Badge>
              <Badge variant="outline" className="border-cyan-500/20 text-cyan-400">
                Quantum-Resistant
              </Badge>
              <Badge variant="outline" className="border-amber-500/20 text-amber-400">
                No Trusted Setup
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div><span className="text-muted-foreground">Field Prime:</span> <span className="font-mono">{zkStatus.security.field_prime}</span></div>
              <div><span className="text-muted-foreground">FRI Queries:</span> <span className="font-mono">{zkStatus.security.fri_queries}</span></div>
              <div><span className="text-muted-foreground">Blowup Factor:</span> <span className="font-mono">{zkStatus.security.blowup_factor}x</span></div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Shielded Transaction Proof */}
      <Card className="bg-card border-white/10" data-testid="shielded-tx-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-emerald-400" />
            Generate Shielded Transaction Proof
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a STARK proof that your transaction is valid without revealing your balance or the exact amount.
            The verifier will only know that you have sufficient funds — nothing more.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sender Address</label>
              <Input value={sender} onChange={e => setSender(e.target.value)}
                placeholder="BRICS..." className="font-mono text-sm" data-testid="zk-sender-input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Recipient Address</label>
              <Input value={recipient} onChange={e => setRecipient(e.target.value)}
                placeholder="BRICS..." className="font-mono text-sm" data-testid="zk-recipient-input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Your Balance (private)</label>
              <Input type="number" value={balance} onChange={e => setBalance(e.target.value)}
                placeholder="0.00" className="font-mono text-sm" data-testid="zk-balance-input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount to Send (private)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" className="font-mono text-sm" data-testid="zk-amount-input" />
            </div>
          </div>

          <Button onClick={generateProof} disabled={proving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="generate-proof-btn">
            {proving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating STARK Proof...</>
            ) : (
              <><Lock className="w-4 h-4 mr-2" />Generate zk-STARK Proof</>
            )}
          </Button>

          {/* Proof Result */}
          {proof && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-emerald-400">Proof Generated</span>
                <span className="text-xs text-muted-foreground">({proof.metadata.prove_time_ms}ms)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
                  <p className="text-muted-foreground">Protocol</p>
                  <p className="font-mono font-bold">{proof.proof.protocol}</p>
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
                  <p className="text-muted-foreground">Security</p>
                  <p className="font-mono font-bold">{proof.proof.security_bits}-bit</p>
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
                  <p className="text-muted-foreground">Trace Root</p>
                  <p className="font-mono font-bold truncate">{proof.proof.trace.root}</p>
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
                  <p className="text-muted-foreground">FRI Layers</p>
                  <p className="font-mono font-bold">{proof.proof.fri.layers.length}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge label="Amount Hidden" ok={proof.metadata.amount_hidden} />
                <StatusBadge label="Balance Hidden" ok={proof.metadata.balance_hidden} />
                <StatusBadge label="Shielded TX" ok={proof.metadata.shielded} />
                <StatusBadge label="Quantum-Resistant" ok={true} />
              </div>

              {/* Verify Button */}
              <Button variant="outline" onClick={verifyProof} disabled={verifying}
                className="w-full border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                data-testid="verify-proof-btn">
                {verifying ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4 mr-2" />Verify Proof</>
                )}
              </Button>

              {/* Verification Result */}
              {verifyResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`p-4 rounded-sm border ${verifyResult.valid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {verifyResult.valid ? (
                      <><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="font-bold text-emerald-400">Proof Valid</span></>
                    ) : (
                      <><XCircle className="w-5 h-5 text-red-400" /><span className="font-bold text-red-400">Proof Invalid</span></>
                    )}
                    <span className="text-xs text-muted-foreground">({verifyResult.verify_time_ms}ms)</span>
                  </div>
                  {verifyResult.valid && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <StatusBadge label={`Boundary: ${verifyResult.boundary_check}`} ok={true} />
                      <StatusBadge label={`FRI: ${verifyResult.fri_check}`} ok={true} />
                      <StatusBadge label={`Merkle: ${verifyResult.merkle_check}`} ok={true} />
                      <StatusBadge label={`Queries: ${verifyResult.queries_verified}`} ok={true} />
                      <StatusBadge label={verifyResult.security_level} ok={true} />
                      <StatusBadge label="Quantum-Safe" ok={verifyResult.quantum_resistant} />
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            How zk-STARKs Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {[
            { step: "01", title: "Execution Trace", desc: "Your transaction computation (balance check, amount validation) is encoded as an algebraic execution trace — a matrix of field elements in F_p where p = 3 * 2^30 + 1." },
            { step: "02", title: "Polynomial Commitment", desc: "The trace is interpolated into polynomials and committed using a SHA-256 Merkle tree. This cryptographically binds the prover to the computation without revealing the data." },
            { step: "03", title: "Constraint Verification", desc: "Algebraic constraints (AIR) verify that each step follows the correct rules. Boundary constraints check that the final output is 'valid' — without seeing the inputs." },
            { step: "04", title: "FRI Protocol", desc: "The Fast Reed-Solomon IOP (FRI) verifies the committed polynomial has the expected low degree, proving the computation was honest. 16 random queries provide 128-bit security." },
            { step: "05", title: "Fiat-Shamir Transform", desc: "All verifier challenges are derived from SHA-256 hashes of previous messages, making the proof completely non-interactive and publicly verifiable." },
          ].map((item, i) => (
            <div key={i} className="flex gap-5 py-5 border-b border-white/[0.04] last:border-0">
              <span className="text-2xl font-heading font-black text-emerald-500/20 shrink-0">{item.step}</span>
              <div>
                <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Comparison */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-base">BricsCoin Security Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { layer: "Layer 1", tech: "SHA-256 Proof of Work", desc: "Block hashing & mining", color: "text-amber-400", active: true },
              { layer: "Layer 2", tech: "ECDSA secp256k1", desc: "Legacy transaction signatures", color: "text-blue-400", active: true },
              { layer: "Layer 3", tech: "ML-DSA-65 (PQC)", desc: "Post-quantum signatures (FIPS 204)", color: "text-cyan-400", active: true },
              { layer: "Layer 4", tech: "zk-STARK (FRI)", desc: "Zero-knowledge transaction privacy", color: "text-emerald-400", active: true },
            ].map((l, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-sm border border-white/[0.06] bg-white/[0.02]">
                <Badge variant="outline" className="text-[10px] shrink-0 border-white/10">{l.layer}</Badge>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${l.color}`}>{l.tech}</p>
                  <p className="text-xs text-muted-foreground">{l.desc}</p>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
