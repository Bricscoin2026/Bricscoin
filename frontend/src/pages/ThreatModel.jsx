import { motion } from "framer-motion";
import { Shield, AlertTriangle, Lock, Wifi, Eye, Cpu, Globe, Zap, Server, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

const THREATS = [
  {
    category: "Cryptographic Attacks",
    icon: Lock,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    threats: [
      {
        name: "Quantum Computing (Shor's Algorithm)",
        severity: "Critical",
        description: "A sufficiently powerful quantum computer could break ECDSA signatures, allowing an attacker to derive private keys from public keys and steal funds.",
        protection: "BricsCoin uses hybrid signatures: ECDSA + ML-DSA-65 (Dilithium). Even if ECDSA is broken, ML-DSA-65 remains secure against known quantum attacks. All PQC wallets are quantum-safe by default.",
        status: "mitigated",
        assumption: "NIST post-quantum standards (ML-DSA) are secure against quantum adversaries with up to 2^128 quantum operations.",
      },
      {
        name: "Harvest Now, Decrypt Later",
        severity: "High",
        description: "An adversary records encrypted/signed data today, waiting for quantum computers to break the cryptography in the future.",
        protection: "PQC migration path: users can migrate legacy wallets to PQC. New transactions use hybrid signatures. Dual-signature scheme ensures forward security.",
        status: "mitigated",
        assumption: "Users migrate to PQC wallets before large-scale quantum computers exist (estimated 10-15 years).",
      },
      {
        name: "Hash Function Collision (SHA-256)",
        severity: "Medium",
        description: "Finding collisions in SHA-256 could allow block manipulation or double-spend attacks.",
        protection: "SHA-256 remains secure against both classical and quantum attacks (Grover's provides only quadratic speedup, requiring 2^128 operations). No known practical attack.",
        status: "mitigated",
        assumption: "SHA-256 preimage resistance holds at 2^256 classical, 2^128 quantum.",
      },
    ],
  },
  {
    category: "Chain Analysis & Privacy",
    icon: Eye,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
    threats: [
      {
        name: "Transaction Graph Analysis",
        severity: "High",
        description: "Analyzing transaction patterns to link addresses and deanonymize users (e.g., common-input ownership heuristic).",
        protection: "Ring signatures obscure the true sender among decoys. Stealth addresses generate one-time recipient addresses. Pedersen commitments hide transaction amounts.",
        status: "mitigated",
        assumption: "Ring size >= 5 provides sufficient privacy set. Users follow privacy best practices.",
      },
      {
        name: "Amount Correlation",
        severity: "Medium",
        description: "Matching input/output amounts to trace fund flows, even with address privacy.",
        protection: "zk-STARK proofs hide transaction amounts while proving validity. Amounts displayed as 'SHIELDED' in the public explorer.",
        status: "mitigated",
        assumption: "zk-STARK proofs are zero-knowledge and computationally sound under the Random Oracle Model.",
      },
      {
        name: "Timing Analysis",
        severity: "Medium",
        description: "Correlating transaction submission times with user activity patterns to deanonymize.",
        protection: "Dandelion++ protocol randomizes transaction propagation path. Transactions pass through 1-4 random stem hops before broadcast, obscuring the originating node.",
        status: "mitigated",
        assumption: "Sufficient network size (>10 nodes) for effective Dandelion++ anonymization.",
      },
    ],
  },
  {
    category: "Network-Level Attacks",
    icon: Wifi,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    threats: [
      {
        name: "Eclipse Attack",
        severity: "High",
        description: "An attacker controls all of a node's peer connections, isolating it from the honest network to enable double-spends or censorship.",
        protection: "Seed node list with known-good nodes. Peer diversity enforcement. Peer heartbeat and rotation. DNS seed fallback.",
        status: "partial",
        assumption: "At least one honest seed node is reachable. Internet connection is not fully controlled by adversary.",
      },
      {
        name: "Network-Level Deanonymization",
        severity: "High",
        description: "A network observer monitoring multiple nodes can determine which node first broadcast a transaction, revealing the originator's IP.",
        protection: "Dandelion++ protocol (stem/fluff phases). Tor Hidden Service (.onion) for anonymous node access. IP address never linked to transaction data on-chain.",
        status: "mitigated",
        assumption: "Dandelion++ provides formal anonymity guarantees with sufficient honest nodes (>50% of stem relay nodes).",
      },
      {
        name: "DDoS / Rate Limiting",
        severity: "Medium",
        description: "Flooding the node with requests to degrade service availability or prevent legitimate transactions.",
        protection: "API rate limiting (100 requests/minute per IP). IP-based blocking after repeated failures. Nginx proxy with connection limits. In-memory caching for heavy endpoints.",
        status: "mitigated",
        assumption: "Rate limits are sufficient for normal usage while blocking abuse patterns.",
      },
    ],
  },
  {
    category: "Consensus & Protocol",
    icon: Cpu,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    threats: [
      {
        name: "51% Attack",
        severity: "Critical",
        description: "An entity controlling >50% of network hashrate could reorganize blocks, enabling double-spends.",
        protection: "SHA-256 PoW with difficulty adjustment. Merge mining with Bitcoin/Litecoin increases effective hashrate security. Block checkpointing for finality.",
        status: "partial",
        assumption: "Combined merge-mining hashrate provides sufficient security. Network grows to deter single-entity control.",
      },
      {
        name: "Selfish Mining",
        severity: "Medium",
        description: "A miner withholds blocks to gain an unfair advantage over honest miners.",
        protection: "Standard Bitcoin-style block propagation. Timestamp validation. Network monitoring for unusual block patterns.",
        status: "partial",
        assumption: "Honest majority of miners. Economic incentives favor honest mining.",
      },
      {
        name: "Transaction Malleability",
        severity: "Low",
        description: "Modifying transaction data without invalidating the signature, potentially confusing wallet software.",
        protection: "Transaction ID is derived from signed data. Hybrid PQC signatures cover all transaction fields. Signature verification is mandatory for all transaction types.",
        status: "mitigated",
        assumption: "Transaction format is canonical and deterministic.",
      },
    ],
  },
];

const EXPLICIT_NON_PROTECTIONS = [
  {
    icon: Globe,
    title: "Endpoint Security",
    description: "BricsCoin does not protect against compromised client devices, keyloggers, or malware on the user's machine. Private key security is the user's responsibility.",
  },
  {
    icon: Server,
    title: "Centralized Services",
    description: "Third-party services (exchanges, explorers, wallets) that interact with BricsCoin are outside the protocol's security model. Their security is their own.",
  },
  {
    icon: Zap,
    title: "Side-Channel Attacks",
    description: "The reference implementation does not currently include side-channel resistant cryptographic implementations. Hardware-level timing attacks are not addressed.",
  },
  {
    icon: AlertTriangle,
    title: "Social Engineering",
    description: "No cryptographic protocol can protect against users voluntarily sharing private keys, seed phrases, or being deceived into malicious transactions.",
  },
];

function SeverityBadge({ severity }) {
  const colors = {
    Critical: "bg-red-500/20 text-red-400 border-red-500/30",
    High: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colors[severity]}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    mitigated: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    partial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };
  const labels = {
    mitigated: "Mitigated",
    partial: "Partially Mitigated",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function ThreatModel() {
  const totalThreats = THREATS.reduce((acc, cat) => acc + cat.threats.length, 0);
  const mitigated = THREATS.reduce((acc, cat) => acc + cat.threats.filter(t => t.status === "mitigated").length, 0);
  const partial = totalThreats - mitigated;

  return (
    <div className="space-y-8 max-w-5xl mx-auto" data-testid="threat-model-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">Threat Model</h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          A transparent analysis of what BricsCoin protects against, what it does not, and the assumptions underlying each defense. 
          This document follows responsible disclosure principles.
        </p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Threat Categories", value: THREATS.length, color: "text-primary" },
          { label: "Threats Analyzed", value: totalThreats, color: "gold-text" },
          { label: "Fully Mitigated", value: mitigated, color: "text-emerald-400" },
          { label: "Partially Mitigated", value: partial, color: "text-amber-400" },
        ].map((s, i) => (
          <Card key={i} className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Security Layers */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="bg-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Security Architecture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Consensus", sub: "SHA-256 PoW", icon: Cpu, color: "text-amber-400" },
                { label: "Signatures", sub: "ECDSA + ML-DSA-65", icon: Lock, color: "text-emerald-400" },
                { label: "Privacy", sub: "zk-STARK + Ring Sig", icon: Eye, color: "text-violet-400" },
                { label: "Network", sub: "Dandelion++ + Tor", icon: Wifi, color: "text-cyan-400" },
                { label: "DDoS", sub: "Rate Limit + Cache", icon: Shield, color: "text-red-400" },
              ].map((l, i) => (
                <div key={i} className="p-3 rounded-sm border border-white/[0.06] bg-white/[0.02] text-center">
                  <l.icon className={`w-5 h-5 ${l.color} mx-auto mb-1.5`} />
                  <p className="text-xs font-bold">{l.label}</p>
                  <p className="text-[10px] text-muted-foreground">{l.sub}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Threat Categories */}
      {THREATS.map((category, ci) => (
        <motion.div key={ci} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + ci * 0.1 }}>
          <Card className={`bg-card ${category.borderColor}`} data-testid={`threat-category-${ci}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <category.icon className={`w-5 h-5 ${category.color}`} />
                {category.category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.threats.map((threat, ti) => (
                <div key={ti} className="p-4 rounded-sm border border-white/[0.06] bg-white/[0.02] space-y-3" data-testid={`threat-${ci}-${ti}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <h4 className="font-bold text-sm">{threat.name}</h4>
                    <div className="flex gap-2">
                      <SeverityBadge severity={threat.severity} />
                      <StatusBadge status={threat.status} />
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="font-bold text-red-400/80 mb-0.5">Threat</p>
                      <p className="text-muted-foreground leading-relaxed">{threat.description}</p>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-400/80 mb-0.5">Protection</p>
                      <p className="text-muted-foreground leading-relaxed">{threat.protection}</p>
                    </div>
                    <div>
                      <p className="font-bold text-cyan-400/80 mb-0.5">Assumption</p>
                      <p className="text-muted-foreground leading-relaxed italic">{threat.assumption}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* What We DON'T Protect Against */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card className="bg-card border-red-500/20" data-testid="non-protections">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-red-400">
              <AlertTriangle className="w-5 h-5" />
              What BricsCoin Does NOT Protect Against
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Transparency is critical. No system is perfect. The following are explicitly outside BricsCoin's security perimeter.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXPLICIT_NON_PROTECTIONS.map((np, i) => (
                <div key={i} className="p-3 rounded-sm border border-red-500/10 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <np.icon className="w-4 h-4 text-red-400/70" />
                    <p className="text-xs font-bold text-red-400">{np.title}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{np.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Methodology */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card className="bg-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-primary" />
              Methodology & References
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>This threat model follows the STRIDE framework adapted for blockchain systems:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {["Spoofing (identity)", "Tampering (data)", "Repudiation (deniability)", "Information Disclosure", "Denial of Service", "Elevation of Privilege"].map((s, i) => (
                <div key={i} className="p-2 rounded-sm bg-white/[0.02] border border-white/[0.06] text-[10px] text-center">{s}</div>
              ))}
            </div>
            <div className="pt-3 space-y-1.5">
              <p className="font-bold text-foreground">Key References:</p>
              <p>NIST FIPS 204 - ML-DSA (Dilithium) Standard</p>
              <p>Fanti et al. - "Dandelion++: Lightweight Cryptocurrency Networking" (2018) - <a href="https://arxiv.org/abs/1805.11060" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">arxiv.org/abs/1805.11060</a></p>
              <p>Ben-Sasson et al. - "Scalable, transparent, and post-quantum secure computational integrity" (zk-STARKs)</p>
              <p>Noether et al. - "Ring Confidential Transactions" (RingCT)</p>
            </div>

            <div className="pt-4 flex gap-3">
              <Button asChild variant="outline" size="sm" className="border-white/10 text-xs">
                <Link to="/whitepaper">Read Whitepaper</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-white/10 text-xs">
                <Link to="/network">Network Status</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
