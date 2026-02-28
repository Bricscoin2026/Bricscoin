import { motion } from "framer-motion";
import { Shield, CheckCircle, Clock, AlertTriangle, Lock, Cpu, Globe, Zap, FileText, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useState, useEffect } from "react";

const API = process.env.REACT_APP_BACKEND_URL;

const PROTOCOL_LAYERS = [
  {
    layer: "Core Protocol",
    icon: Cpu,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    criteria: [
      {
        name: "Proof-of-Work Consensus",
        description: "SHA-256 mining with dynamic difficulty adjustment every 20 blocks. Halving every 210,000 blocks.",
        status: "stable",
        notes: "Battle-tested algorithm. Difficulty adjustment clamped at 1.5x/0.67x per step for smooth transitions.",
      },
      {
        name: "Hybrid PQC Block Signing",
        description: "Every block is signed with both ECDSA (secp256k1) and ML-DSA-65 (Dilithium) for quantum resistance.",
        status: "stable",
        notes: "FIPS 204 compliant. Signature overhead addressed via pruning support.",
      },
      {
        name: "Transaction Validation",
        description: "Client-side signing with server-side verification. Replay protection via timestamp and signature uniqueness.",
        status: "stable",
        notes: "5-minute timestamp window. IP-based rate limiting on write endpoints.",
      },
      {
        name: "Sub-unit Precision (JBS)",
        description: "8 decimal places of precision (1 BRICS = 100,000,000 JBS), matching Bitcoin's satoshi model.",
        status: "stable",
        notes: "Consistent rounding applied across all balance calculations.",
      },
    ],
  },
  {
    layer: "Security & Privacy",
    icon: Shield,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    criteria: [
      {
        name: "Dandelion++ Transaction Propagation",
        description: "Transactions route through a random stem path before broadcast, raising the cost of network-level origin analysis.",
        status: "stable",
        notes: "10-minute epochs, 90% stem probability, 4-hop max, 30s embargo timeout. Per Dandelion++ paper (arXiv:1805.11060).",
      },
      {
        name: "LSAG Ring Signatures",
        description: "Linkable Spontaneous Anonymous Group signatures hide the real sender among a set of decoys. Mandatory minimum ring size enforced at protocol level.",
        status: "stable",
        notes: "Min ring size: 32 (2x Monero), Default: 32, Max: 64. Dynamic sizing based on UTXO set. Key images prevent double-spend.",
      },
      {
        name: "Shielded Transactions (zk-STARK)",
        description: "Amounts hidden using zero-knowledge proofs. Displayed as 'SHIELDED' in the public explorer.",
        status: "stable",
        notes: "Privacy score reflects actual shielded transaction usage per wallet.",
      },
      {
        name: "Privacy Modes (Strong / Maximum)",
        description: "All transactions are private by default. No transparent mode exists. Users choose between Strong (zk-STARK + Ring) and Maximum (full stack with stealth addresses).",
        status: "stable",
        notes: "Privacy is MANDATORY. The 'Safe' transparent mode has been eliminated from the protocol.",
      },
      {
        name: "Chain Security (Checkpoints & Reorg Protection)",
        description: "Automatic checkpoints after sync. Deep reorganization attempts (>100 blocks) are rejected.",
        status: "stable",
        notes: "Prevents 51% attack rollbacks beyond the checkpoint depth.",
      },
      {
        name: "Tor Hidden Service",
        description: "Optional .onion access for anonymous node connectivity.",
        status: "stable",
        notes: "Configured on the production server. Does not affect clearnet operation.",
      },
    ],
  },
  {
    layer: "Network & Scalability",
    icon: Globe,
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/20",
    criteria: [
      {
        name: "P2P Node Discovery & Sync",
        description: "Seed-node based peer discovery with periodic blockchain synchronization.",
        status: "stable",
        notes: "Batch sync (500 blocks for full, 100 for periodic). Checkpoint validation on incoming blocks.",
      },
      {
        name: "Light Client (SPV) Support",
        description: "API endpoints for block headers and Merkle proofs, enabling lightweight wallet verification.",
        status: "stable",
        notes: "Reduces bandwidth for mobile and resource-constrained clients.",
      },
      {
        name: "Blockchain Pruning",
        description: "Chain size analysis API to identify pruning opportunities, particularly for PQC signature data.",
        status: "stable",
        notes: "Addresses the storage overhead introduced by large Dilithium signatures.",
      },
      {
        name: "API Rate Limiting & DDoS Protection",
        description: "Multi-layer protection: per-IP rate limits (slowapi), burst detection middleware, and IP blacklisting.",
        status: "stable",
        notes: "Read-only endpoints exempt from per-route limits. Write endpoints strictly rate-limited.",
      },
      {
        name: "Anti-Sybil PoW Handshake",
        description: "New peers must solve a computational puzzle before being accepted. Prevents low-cost Sybil attacks via VPS flooding.",
        status: "stable",
        notes: "16-bit PoW difficulty, max 3 peers per ASN, 50 total peer slots. Opening 500 VPS is no longer free.",
      },
    ],
  },
];

const STATUS_CONFIG = {
  stable: { label: "Stable", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  testing: { label: "In Testing", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
  development: { label: "In Development", icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10" },
};

export default function ProtocolStatus() {
  const [networkStats, setNetworkStats] = useState(null);
  const [pqcStats, setPqcStats] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/network/stats`).then(r => r.json()).then(setNetworkStats).catch(() => {});
    fetch(`${API}/api/pqc/stats`).then(r => r.json()).then(setPqcStats).catch(() => {});
  }, []);

  const totalCriteria = PROTOCOL_LAYERS.reduce((sum, l) => sum + l.criteria.length, 0);
  const stableCriteria = PROTOCOL_LAYERS.reduce(
    (sum, l) => sum + l.criteria.filter(c => c.status === "stable").length, 0
  );
  const stabilityPercent = Math.round((stableCriteria / totalCriteria) * 100);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100" data-testid="protocol-status-page">
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-amber-400" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="protocol-status-title">
              Protocol Status
            </h1>
          </div>
          <p className="text-zinc-400 max-w-2xl text-sm sm:text-base">
            Current stability status of all BricsCoin protocol components. This page tracks the criteria
            required before the protocol can be considered frozen for production use.
          </p>
        </motion.div>

        {/* Stability Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-zinc-900/50 border-zinc-800" data-testid="stability-overview">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Protocol Stability</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-emerald-400" data-testid="stability-percent">
                      {stabilityPercent}%
                    </span>
                    <span className="text-sm text-zinc-500 pb-1">({stableCriteria}/{totalCriteria} criteria)</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${stabilityPercent}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Chain Height</p>
                  <p className="text-2xl font-bold text-zinc-100" data-testid="chain-height">
                    {networkStats ? networkStats.total_blocks.toLocaleString() : "..."}
                  </p>
                  <p className="text-xs text-zinc-500">blocks mined</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">PQC Coverage</p>
                  <p className="text-2xl font-bold text-zinc-100" data-testid="pqc-coverage">
                    {pqcStats ? `${pqcStats.total_pqc_blocks} / ${pqcStats.total_blocks}` : "..."}
                  </p>
                  <p className="text-xs text-zinc-500">blocks with PQC signatures</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Protocol Layers */}
        {PROTOCOL_LAYERS.map((layer, layerIdx) => (
          <motion.div
            key={layer.layer}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + layerIdx * 0.1 }}
            className="space-y-4"
            data-testid={`protocol-layer-${layerIdx}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${layer.bgColor}`}>
                <layer.icon className={`w-5 h-5 ${layer.color}`} />
              </div>
              <h2 className="text-lg font-semibold">{layer.layer}</h2>
              <span className="text-xs text-zinc-500 ml-auto">
                {layer.criteria.filter(c => c.status === "stable").length}/{layer.criteria.length} stable
              </span>
            </div>

            <div className="space-y-3">
              {layer.criteria.map((criterion, idx) => {
                const statusConf = STATUS_CONFIG[criterion.status];
                const StatusIcon = statusConf.icon;
                return (
                  <Card
                    key={idx}
                    className={`bg-zinc-900/30 border-zinc-800/60 hover:border-zinc-700/60 transition-colors`}
                    data-testid={`criterion-${layerIdx}-${idx}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <StatusIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${statusConf.color}`} />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm text-zinc-100">{criterion.name}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusConf.bg} ${statusConf.color} uppercase tracking-wider font-medium`}>
                              {statusConf.label}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{criterion.description}</p>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            <span className="text-zinc-600">Note:</span> {criterion.notes}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* Freeze Criteria Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="bg-zinc-900/50 border-zinc-800" data-testid="freeze-criteria">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Protocol Freeze Criteria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-400">
              <p>
                The protocol will be considered frozen when all of the following conditions are met:
              </p>
              <ul className="space-y-2">
                {[
                  { text: "All protocol components reach 'Stable' status", done: stabilityPercent === 100 },
                  { text: "Load testing confirms sub-200ms p95 latency on all public endpoints", done: true },
                  { text: "Zero critical or high-severity bugs in the backlog", done: true },
                  { text: "Whitepaper and Threat Model documentation are current and reviewed", done: true },
                  { text: "No consensus-breaking changes planned for the next release cycle", done: true },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                    <span className={item.done ? "text-zinc-300" : "text-zinc-400"}>{item.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-3">
          <Link to="/threat-model">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" data-testid="nav-threat-model">
              <Shield className="w-4 h-4 mr-2" /> Threat Model
            </Button>
          </Link>
          <Link to="/whitepaper">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" data-testid="nav-whitepaper">
              <FileText className="w-4 h-4 mr-2" /> Whitepaper
            </Button>
          </Link>
          <Link to="/network">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" data-testid="nav-network">
              <Globe className="w-4 h-4 mr-2" /> Network
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
