import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Lock, Fingerprint, Activity, Search, ShieldCheck, Hash, Clock } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color }} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function TxRow({ tx }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] text-xs font-mono hover:bg-white/[0.02] transition-colors px-2 rounded">
      <div className="flex items-center gap-1.5 min-w-[110px]">
        <EyeOff size={11} className="text-violet-400 shrink-0" />
        <span className="text-violet-400 font-semibold">RING_HIDDEN</span>
      </div>
      <span className="text-muted-foreground">{">"}</span>
      <div className="min-w-[110px] text-cyan-400">{tx.recipient_preview || "BRICSX..."}</div>
      <span className="text-muted-foreground">{">"}</span>
      <div className="min-w-[80px] text-emerald-400 font-semibold">SHIELDED</div>
      <div className="flex items-center gap-1 min-w-[60px]">
        <Shield size={10} className="text-amber-400" />
        <span className="text-amber-400">Ring {tx.ring_size}</span>
      </div>
      <div className="flex items-center gap-1 min-w-[60px]" title={`Key Image: ${tx.key_image_preview}`}>
        <Fingerprint size={10} className="text-rose-400" />
        <span className="text-rose-400/70 truncate max-w-[80px]">{tx.key_image_preview || "..."}</span>
      </div>
      <div className="flex items-center gap-1 min-w-[60px]" title={`Proof: ${tx.proof_hash_preview}`}>
        <Hash size={10} className="text-teal-400" />
        <span className="text-teal-400/70">{tx.stark_verified ? "VALID" : "..."}</span>
      </div>
      <div className="ml-auto flex items-center gap-1 text-muted-foreground">
        <Clock size={10} />
        <span>{tx.timestamp ? new Date(tx.timestamp).toLocaleString("en-US", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
      </div>
    </div>
  );
}

export default function PrivacyExplorer() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewKey, setViewKey] = useState("");
  const [auditResult, setAuditResult] = useState(null);
  const [auditing, setAuditing] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/privacy/explorer/stats`).then(r => r.json()).then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const runAudit = async () => {
    if (!viewKey.trim()) return;
    setAuditing(true);
    try {
      const r = await fetch(`${API}/api/privacy/view-key/audit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ view_key: viewKey.trim() }),
      });
      const d = await r.json();
      if (r.ok) setAuditResult(d);
      else setAuditResult({ error: d.detail || "Invalid View-Key" });
    } catch { setAuditResult({ error: "Connection failed" }); }
    setAuditing(false);
  };

  const np = stats?.network_privacy || {};
  const txs = stats?.recent_transactions || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Eye size={20} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Privacy Explorer</h1>
              <p className="text-xs text-muted-foreground">The transparency of opacity. This is what a node sees.</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8" data-testid="privacy-stats-grid">
            <StatCard icon={Shield} label="Private Transactions" value={np.total_private} color="#8B5CF6" sub={`${np.privacy_ratio}% of all TXs`} />
            <StatCard icon={Fingerprint} label="Key Images" value={np.total_key_images} color="#F43F5E" sub="Unique, non-repeatable" />
            <StatCard icon={Activity} label="Avg Ring Size" value={np.ring_stats?.average} color="#F59E0B" sub={`Min: ${np.ring_stats?.minimum} / Max: ${np.ring_stats?.maximum}`} />
            <StatCard icon={Lock} label="Amount Visibility" value="0%" color="#10B981" sub="No plaintext on-chain" />
            <StatCard icon={ShieldCheck} label="Sender Visibility" value="0%" color="#06B6D4" sub="Only RING_HIDDEN" />
          </div>
        )}

        {/* Transaction List */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Activity size={14} className="text-violet-400" />
              Recent Private Transactions (Opaque View)
            </h2>
            <span className="text-[10px] text-muted-foreground bg-white/[0.03] px-2 py-1 rounded">
              Exactly what a node sees
            </span>
          </div>
          <div className="flex items-center gap-3 py-2 border-b border-white/[0.08] text-[10px] text-muted-foreground uppercase tracking-wider px-2 mb-1">
            <div className="min-w-[110px]">Sender</div>
            <div className="w-3" />
            <div className="min-w-[110px]">Recipient</div>
            <div className="w-3" />
            <div className="min-w-[80px]">Amount</div>
            <div className="min-w-[60px]">Ring</div>
            <div className="min-w-[60px]">Key Image</div>
            <div className="min-w-[60px]">zk-Proof</div>
            <div className="ml-auto">Time</div>
          </div>
          {txs.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No private transactions yet</p>}
          {txs.map((tx, i) => <TxRow key={tx.id || i} tx={tx} />)}
        </div>

        {/* View-Key Audit Section */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6" data-testid="view-key-audit-section">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-1">
            <Search size={14} className="text-cyan-400" />
            View-Key Audit
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Paste a View-Key to audit a specific wallet. View-Keys allow read-only access to a wallet's transactions without spending authority.
          </p>
          <div className="flex gap-2 mb-4">
            <input data-testid="view-key-input" type="text" value={viewKey} onChange={e => setViewKey(e.target.value)}
              placeholder="Paste View-Key here (base64 encoded)..."
              className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500/50"
              onKeyDown={e => e.key === "Enter" && runAudit()} />
            <button data-testid="audit-button" onClick={runAudit} disabled={auditing || !viewKey.trim()}
              className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 transition-colors disabled:opacity-50">
              {auditing ? "Scanning..." : "Audit"}
            </button>
          </div>

          {auditResult && !auditResult.error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Activity} label="Incoming TXs" value={auditResult.audit_result?.total_incoming} color="#10B981" />
                <StatCard icon={Activity} label="Outgoing TXs" value={auditResult.audit_result?.total_outgoing} color="#F43F5E" />
                <StatCard icon={Lock} label="Total Received" value={`${auditResult.audit_result?.total_received} BRICS`} color="#10B981" />
                <StatCard icon={Shield} label="Balance" value={`${auditResult.audit_result?.balance} BRICS`} color="#8B5CF6" />
              </div>
              <div className="text-[10px] text-muted-foreground">
                Scanned {auditResult.scan_summary?.transactions_scanned} TXs, found {auditResult.scan_summary?.stealth_payments_found} stealth payments.
                Permissions: {auditResult.permissions?.join(", ")}
              </div>
              {auditResult.audit_result?.incoming_transactions?.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-xs font-semibold text-emerald-400 mb-2">Incoming Payments</h3>
                  {auditResult.audit_result.incoming_transactions.map((tx, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 text-xs font-mono border-b border-white/[0.04]">
                      <span className="text-cyan-400">{tx.stealth_address?.substring(0, 16)}...</span>
                      <span className="text-emerald-400 font-bold">+{tx.amount} BRICS</span>
                      <span className="text-muted-foreground ml-auto">{tx.timestamp ? new Date(tx.timestamp).toLocaleString("en-US") : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          {auditResult?.error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {auditResult.error}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-8 bg-white/[0.02] border border-white/[0.06] rounded-lg p-6">
          <h2 className="text-sm font-semibold mb-3">How View-Keys Work</h2>
          <div className="grid md:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <div className="text-violet-400 font-semibold">1. Generate</div>
              <p>The wallet holder generates a View-Key from their stealth scan key. This key cannot sign transactions or move funds.</p>
            </div>
            <div className="space-y-1">
              <div className="text-cyan-400 font-semibold">2. Share</div>
              <p>The View-Key is shared with a trusted party (exchange, auditor, regulator). It grants read-only access to that wallet only.</p>
            </div>
            <div className="space-y-1">
              <div className="text-emerald-400 font-semibold">3. Verify</div>
              <p>The auditor uses the View-Key to scan the blockchain and see all incoming/outgoing payments and the wallet balance.</p>
            </div>
          </div>
          <div className="mt-4 text-[10px] text-center text-muted-foreground/60 border-t border-white/[0.04] pt-3">
            "Private by default, compliant on-demand" — BricsCoin enables regulatory compliance without sacrificing network-wide privacy.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
