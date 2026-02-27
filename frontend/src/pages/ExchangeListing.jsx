import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Globe, Shield, Pickaxe, Atom, Lock, Eye, Copy, Check,
  ExternalLink, FileText, Code, Users, Layers, Zap,
  Link2, Coins, Smartphone, Brain, ChevronRight
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const SPECS = [
  ["Name", "BricsCoin"],
  ["Ticker", "BRICS"],
  ["Sub-unit", "Jabos (JBS) — 1 BRICS = 100,000,000 JBS"],
  ["Algorithm", "SHA-256 Proof-of-Work (Bitcoin-compatible)"],
  ["Block Time", "~60 seconds"],
  ["Block Reward", "50 BRICS (halving every 210,000 blocks)"],
  ["Max Supply", "21,000,000 BRICS"],
  ["Premine", "None (renounced via on-chain NFT)"],
  ["Consensus", "Nakamoto Consensus + AuxPoW (Merge Mining)"],
  ["Transaction Signing", "Hybrid ECDSA secp256k1 + ML-DSA-65 (FIPS 204)"],
  ["Privacy", "zk-STARK + Ring Signatures + Stealth Addresses"],
  ["Launch", "Fair launch, no ICO, no pre-sale"],
];

const LINKS = [
  { label: "Website", url: "https://bricscoin26.org", icon: Globe },
  { label: "Block Explorer", url: "https://bricscoin26.org/blockchain", icon: Layers },
  { label: "Whitepaper", url: "https://bricscoin26.org/whitepaper", icon: FileText },
  { label: "Mining Pool", url: "https://bricscoin26.org/mining", icon: Pickaxe },
  { label: "Source Code", url: "https://codeberg.org/jabo86", icon: Code },
  { label: "Mobile Wallet", url: "https://bricscoin26.org/mobile-wallet", icon: Smartphone },
];

const FEATURES = [
  {
    title: "Post-Quantum Cryptography (PQC)",
    desc: "First blockchain with NIST-standardized ML-DSA-65 (FIPS 204) hybrid signatures. Every transaction is dual-signed: ECDSA + ML-DSA-65. Quantum-computer resistant from day one.",
    icon: Atom, color: "#06B6D4", tag: "WORLD FIRST"
  },
  {
    title: "Total Privacy Suite",
    desc: "zk-STARK proofs hide amounts. Ring Signatures (LSAG) hide the sender. Stealth Addresses (DHKE) hide the receiver. Full Monero-level privacy with quantum resistance.",
    icon: Lock, color: "#10B981", tag: "PRIVACY"
  },
  {
    title: "Merge Mining (AuxPoW)",
    desc: "Bitcoin miners can mine BricsCoin simultaneously at zero extra cost. Leverages Bitcoin's massive hashrate for network security.",
    icon: Link2, color: "#F97316", tag: "SECURITY"
  },
  {
    title: "Jabos (JBS) Sub-unit",
    desc: "Like Satoshi for Bitcoin. 1 BRICS = 100,000,000 JBS. Named after Jabo86, the creator. Human-readable micro-transactions.",
    icon: Coins, color: "#D4AF37", tag: "USABILITY"
  },
  {
    title: "AI Blockchain Oracle",
    desc: "On-chain AI Oracle powered by GPT-5.2. Query blockchain data, get analysis, and verify AI responses with PQC signatures.",
    icon: Brain, color: "#8B5CF6", tag: "AI"
  },
  {
    title: "PWA Mobile Wallet",
    desc: "Installable Progressive Web App. PQC wallets, QR codes, shielded transactions, multi-currency price ticker — all from mobile browser.",
    icon: Smartphone, color: "#3B82F6", tag: "MOBILE"
  },
];

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded hover:bg-white/10 transition-colors" title={`Copy ${label}`}>
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

export default function ExchangeListing() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/network/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const applicationText = `PROJECT: BricsCoin (BRICS)
ALGORITHM: SHA-256 Proof-of-Work (Bitcoin-compatible)
CONSENSUS: Nakamoto Consensus + AuxPoW (Merge Mining with Bitcoin)
MAX SUPPLY: 21,000,000 BRICS
BLOCK TIME: ~60 seconds
BLOCK REWARD: 50 BRICS (halving every 210,000 blocks)
PREMINE: None (renounced via on-chain NFT certificate)
SUB-UNIT: Jabos (JBS) — 1 BRICS = 100,000,000 JBS

UNIQUE FEATURES:
- First blockchain with NIST-standardized Post-Quantum signatures (ML-DSA-65 FIPS 204)
- Total Privacy: zk-STARK + Ring Signatures + Stealth Addresses
- Merge Mining (AuxPoW) with Bitcoin — zero extra cost for BTC miners
- AI Blockchain Oracle (GPT-5.2) with on-chain verification
- PWA Mobile Wallet with PQC-only support

LINKS:
- Website: https://bricscoin26.org
- Block Explorer: https://bricscoin26.org/blockchain
- Whitepaper: https://bricscoin26.org/whitepaper
- Source Code: https://codeberg.org/jabo86
- Mining Pool: stratum+tcp://stratum.bricscoin26.org:3333
- Mobile Wallet: https://bricscoin26.org/mobile-wallet

WALLETS: Web wallet (desktop + PWA mobile), PQC hybrid signing
NODE: Downloadable from website, Docker support
STRATUM: stratum+tcp://stratum.bricscoin26.org:3333 (port 3333)`;

  return (
    <div className="space-y-16 pb-16" data-testid="exchange-listing-page">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-8">
        <Badge className="mb-4 text-xs px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Exchange Listing Application
        </Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black mb-4">
          <span className="gold-text">BricsCoin</span> (BRICS)
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          The world's first <strong>Post-Quantum</strong> cryptocurrency with <strong>Total Privacy</strong>,{" "}
          <strong>Merge Mining</strong> with Bitcoin, and an <strong>AI Oracle</strong>.
          SHA-256 PoW, fair launch, no premine.
        </p>
      </motion.div>

      {/* Live Network Stats */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400" /> Live Network Stats
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Blocks", value: stats?.total_blocks?.toLocaleString() || "..." },
            { label: "Difficulty", value: stats?.current_difficulty?.toLocaleString() || "..." },
            { label: "Block Reward", value: `${stats?.current_reward || 50} BRICS` },
            { label: "Algorithm", value: "SHA-256" },
            { label: "Max Supply", value: "21M BRICS" },
            { label: "Premine", value: "NONE" },
          ].map((s, i) => (
            <Card key={i} className="border-white/[0.06] bg-white/[0.02]">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Technical Specifications */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" /> Technical Specifications
        </h2>
        <Card className="border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="listing-specs-table">
              <tbody>
                {SPECS.map(([label, value], i) => (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-sm text-muted-foreground font-medium w-[35%]">{label}</td>
                    <td className="px-6 py-3 text-sm font-mono">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Unique Features */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" /> What Makes BricsCoin Unique
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Card className="h-full border-white/[0.06] bg-white/[0.02]">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${f.color}10`, border: `1px solid ${f.color}20` }}>
                      <f.icon className="w-5 h-5" style={{ color: f.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm">{f.title}</h3>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderColor: `${f.color}40`, color: f.color }}>{f.tag}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Important Links */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-400" /> Links & Resources
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LINKS.map((link) => (
            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] transition-all group">
              <div className="flex items-center gap-3">
                <link.icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-bold">{link.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{link.url}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          ))}
        </div>
      </section>

      {/* Stratum / Node Info */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
          <Pickaxe className="w-5 h-5 text-emerald-400" /> Mining & Node
        </h2>
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
              <span className="text-sm text-muted-foreground">Stratum Pool</span>
              <div className="flex items-center gap-2">
                <code className="text-sm text-primary font-mono">stratum+tcp://stratum.bricscoin26.org:3333</code>
                <CopyButton text="stratum+tcp://stratum.bricscoin26.org:3333" label="Stratum URL" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
              <span className="text-sm text-muted-foreground">IP diretto</span>
              <div className="flex items-center gap-2">
                <code className="text-sm text-amber-400 font-mono">stratum+tcp://5.161.254.163:3333</code>
                <CopyButton text="stratum+tcp://5.161.254.163:3333" label="IP Address" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
              <span className="text-sm text-muted-foreground">Stratum Port</span>
              <code className="text-sm font-mono">3333</code>
            </div>
            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
              <span className="text-sm text-muted-foreground">Stratum Port (alt)</span>
              <code className="text-sm font-mono">3334</code>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Ready-to-Copy Application */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" /> Ready-to-Send Application
        </h2>
        <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-4">
              Copy this text and send it directly to exchanges for listing applications:
            </p>
            <div className="relative">
              <pre className="text-xs font-mono text-muted-foreground bg-black/40 p-5 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed border border-white/5"
                data-testid="application-text">
                {applicationText}
              </pre>
              <Button
                onClick={() => { navigator.clipboard.writeText(applicationText); toast.success("Application text copied!"); }}
                className="absolute top-3 right-3 h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-xs"
                data-testid="copy-application-btn"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy All
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Exchange Targets */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-emerald-400" /> Where to Apply
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: "TradeOgre", type: "Free listing", desc: "Specializzato in PoW e privacy coin. Scrivi a support@tradeogre.com o DM @TradeOgre su Twitter.", color: "#10B981", priority: "RECOMMENDED" },
            { name: "MEXC", type: "Free application", desc: "Grande exchange, lista molte coin PoW piccole. Applica su listing.mexc.com.", color: "#3B82F6", priority: "HIGH VISIBILITY" },
            { name: "Bisq", type: "Decentralized", desc: "DEX decentralizzato. Nessun permesso necessario, chiunque crea un mercato BTC/BRICS.", color: "#F97316", priority: "NO PERMISSION" },
          ].map((ex) => (
            <Card key={ex.name} className="border-white/[0.06] bg-white/[0.02]">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold">{ex.name}</h3>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderColor: `${ex.color}40`, color: ex.color }}>{ex.priority}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">{ex.type}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{ex.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center py-8 border-t border-white/5">
        <p className="text-2xl font-heading font-bold mb-2">
          <span className="gold-text">BricsCoin</span> — The Future is Quantum-Safe
        </p>
        <p className="text-muted-foreground text-sm mb-6">SHA-256 PoW + PQC + Privacy + AI Oracle + Merge Mining</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a href="https://bricscoin26.org/whitepaper" target="_blank" rel="noopener noreferrer">
            <Button className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700" data-testid="listing-cta-whitepaper">
              <FileText className="w-4 h-4 mr-2" /> Read Whitepaper
            </Button>
          </a>
          <a href="https://bricscoin26.org/blockchain" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="h-11 px-6 border-white/10" data-testid="listing-cta-explorer">
              <Layers className="w-4 h-4 mr-2" /> View Explorer
            </Button>
          </a>
          <a href="https://bricscoin26.org/wallet" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="h-11 px-6 border-white/10" data-testid="listing-cta-wallet">
              <Shield className="w-4 h-4 mr-2" /> Try Wallet
            </Button>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
