import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  FileText,
  Code,
  User,
  Target,
  Shield,
  Zap,
  CheckCircle,
  Clock,
  ExternalLink,
  Coins,
  ShieldCheck,
  Lock,
  AlertTriangle,
  RefreshCw,
  Atom,
  Loader2,
  XCircle,
  Globe,
  Wallet,
  Pickaxe,
  Network,
  HelpCircle,
  ArrowRight,
  Eye
} from "lucide-react";
import { getTokenomics } from "../lib/api";
import api from "../lib/api";
import { motion } from "framer-motion";

const ICON_MAP = {
  "check-circle": CheckCircle,
  "lock": Lock,
  "atom": Atom,
  "shield-alert": AlertTriangle,
  "eye-off": Eye,
  "shield-check": ShieldCheck,
};

function AuditCategory({ category }) {
  const Icon = ICON_MAP[category.icon] || CheckCircle;
  const allPassed = category.passed === category.total;
  return (
    <div className="p-4 bg-card/80 rounded-sm border border-white/10" data-testid={`audit-${category.name.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${allPassed ? "text-emerald-400" : "text-red-400"}`} />
          <h4 className="font-bold text-sm">{category.name}</h4>
        </div>
        <span className={`text-sm font-mono font-bold ${allPassed ? "text-emerald-400" : "text-red-400"}`}>
          {category.passed}/{category.total}
        </span>
      </div>
      <div className="space-y-1.5">
        {category.tests.map((test, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {test.passed
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            }
            <span className="text-muted-foreground">{test.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoSection({ icon: Icon, title, children, color = "primary", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
    >
      <Card className="bg-card/50 border-white/10 overflow-hidden" data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-sm bg-${color}/10 flex items-center justify-center shrink-0`}>
              <Icon className={`w-6 h-6 text-${color}`} />
            </div>
            <div className="space-y-3 min-w-0">
              <h3 className="text-lg sm:text-xl font-heading font-bold">{title}</h3>
              <div className="text-sm sm:text-base text-muted-foreground leading-relaxed space-y-2">
                {children}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function About() {
  const [tokenomics, setTokenomics] = useState(null);
  const [audit, setAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getTokenomics();
        setTokenomics(res.data);
      } catch (error) {
        console.error("Error fetching tokenomics:", error);
      }
    }
    fetchData();
  }, []);

  const runAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get("/security/audit");
      setAudit(res.data);
    } catch (error) {
      console.error("Error running audit:", error);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => { runAudit(); }, []);

  return (
    <div className="space-y-8 pb-12" data-testid="about-page">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 py-4"
      >
        <h1 className="text-4xl sm:text-5xl font-heading font-bold">
          What is <span className="gold-text">BricsCoin</span>?
        </h1>
        <p className="text-sm font-medium text-primary/80 tracking-wide">
          <span className="text-lg font-bold text-primary">B</span>lockchain{" "}
          <span className="text-lg font-bold text-primary">R</span>esilient{" "}
          <span className="text-lg font-bold text-primary">I</span>nfrastructure for{" "}
          <span className="text-lg font-bold text-primary">C</span>ryptographic{" "}
          <span className="text-lg font-bold text-primary">S</span>ecurity &mdash;{" "}
          <span className="text-lg font-bold text-primary">C</span>ertified{" "}
          <span className="text-lg font-bold text-primary">O</span>pen{" "}
          <span className="text-lg font-bold text-primary">I</span>nnovation{" "}
          <span className="text-lg font-bold text-primary">N</span>etwork
        </p>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
          Imagine digital money that nobody controls — no bank, no government, no corporation.
          BricsCoin is exactly that: a free, secure, and transparent digital currency.
        </p>
      </motion.div>

      {/* Simple Explanation Sections */}
      <div className="space-y-4">

        <InfoSection icon={HelpCircle} title="In Simple Terms" color="primary" delay={1}>
          <p>
            BricsCoin is a <strong className="text-foreground">cryptocurrency</strong> — a digital currency that exists only on the internet.
            Like the dollar or the euro, you can use it to send and receive payments. But unlike traditional currencies,
            there is no bank or institution controlling it.
          </p>
          <p>
            It works thanks to a technology called <strong className="text-foreground">blockchain</strong>: a public ledger where
            every transaction is permanently written and verifiable by anyone. Nobody can delete or modify a transaction
            once it is confirmed.
          </p>
        </InfoSection>

        <InfoSection icon={Shield} title="Security & Privacy" color="emerald" delay={2}>
          <p>
            BricsCoin is built on a protocol with <strong className="text-foreground">mandatory privacy enforced at the consensus level</strong>.
            Every transaction is protected by 3 independent cryptographic layers, verified by all nodes on the network.
          </p>
          <ul className="list-none space-y-1.5 ml-1">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Hidden Sender</strong> — LSAG Ring Signatures (32-64 decoys) with Gamma Distribution selection</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Hidden Receiver</strong> — Stealth Addresses (Diffie-Hellman Key Exchange)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Hidden Amount</strong> — zk-STARKs with Range Proofs (amount &gt; 0)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Anonymous Network</strong> — Dandelion++ with jitter and dummy traffic, Tor</span>
            </li>
          </ul>
          <p>
            It also integrates <strong className="text-foreground">post-quantum cryptography ML-DSA-65</strong> (FIPS 204)
            for block signing, ensuring resistance against future quantum computers.
            Transactions are <strong className="text-foreground">signed in your browser</strong> — your private key never leaves your device.
          </p>
        </InfoSection>

        <InfoSection icon={Network} title="Decentralization" color="primary" delay={3}>
          <p>
            <strong className="text-foreground">Decentralized</strong> means there is no single point of control.
            The BricsCoin network is made up of many independent computers (called <strong className="text-foreground">nodes</strong>)
            spread around the world, collaborating with each other.
          </p>
          <p>
            If one node goes down, the others keep running. Nobody can censor transactions or shut down the network.
            Anyone can download the software and run a node from their own computer, contributing to network security.
          </p>
          <p>
            Nodes communicate through a <strong className="text-foreground">peer-to-peer (P2P)</strong> network,
            the same principle used for file sharing on the internet. There is no central server: everyone is equal.
          </p>
        </InfoSection>

        <InfoSection icon={Wallet} title="The Wallet" color="primary" delay={4}>
          <p>
            The <strong className="text-foreground">wallet</strong> is your digital wallet. It works like a banking app,
            but without the bank. It allows you to:
          </p>
          <ul className="list-none space-y-1.5 ml-1">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Receive</strong> BRICS from anyone by sharing your address</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Send</strong> BRICS to any address in the world</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Check your balance</strong> and transaction history</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Export and import</strong> wallets with a 12-word seed phrase</span>
            </li>
          </ul>
          <p>
            The <strong className="text-foreground">seed phrase</strong> is a series of 12 words that serves as a backup of your wallet.
            If you lose your device, you can recover your funds by entering these 12 words. Keep it in a safe place and never share it!
          </p>
        </InfoSection>

        <InfoSection icon={Pickaxe} title="Mining" color="primary" delay={5}>
          <p>
            <strong className="text-foreground">Mining</strong> is the process by which new BRICS are created and transactions are verified.
            Miners use their computer's processing power to solve complex mathematical problems.
            Whoever finds the solution first adds a new "block" to the blockchain and receives a reward.
          </p>
          <p>
            Currently, each mined block produces <strong className="text-foreground">50 BRICS</strong> as a reward.
            This reward halves every 210,000 blocks (like Bitcoin), making BRICS increasingly scarce over time.
          </p>
          <p>
            BricsCoin was launched with a <strong className="text-foreground">100% Fair Launch</strong>: no premine,
            no reserves for founders. All 21 million BRICS can only be obtained through mining.
          </p>
        </InfoSection>

        <InfoSection icon={Eye} title="Transparency & Compliance" color="primary" delay={6}>
          <p>
            BricsCoin is <strong className="text-foreground">"private by default, compliant on-demand"</strong>.
            The source code is open source and available on Codeberg. Anyone can read, verify, and contribute.
          </p>
          <p>
            The public <strong className="text-foreground">Privacy Explorer</strong> shows blocks and transactions as they appear on-chain:
            no sender, no plaintext amounts — only opaque cryptographic proofs.
          </p>
          <p>
            For compliance, BricsCoin offers <strong className="text-foreground">View-Keys</strong>: special keys that allow
            a user to selectively reveal their transactions to an auditor, without compromising their spending keys
            or the privacy of other users on the network.
          </p>
        </InfoSection>
      </div>

      {/* Security Audit - Live */}
      <Card className="bg-card border-emerald-500/20 overflow-hidden relative" data-testid="security-audit-section">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          background: "radial-gradient(ellipse at 20% 50%, #10b981, transparent 70%)"
        }} />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Security Audit
              {audit?.all_passed && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">
                  {audit.total_passed}/{audit.total_tests} PASSED
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={runAudit}
              disabled={auditLoading}
              className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 rounded-sm"
              data-testid="run-audit-btn"
            >
              {auditLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {auditLoading ? "Running..." : "Run Audit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <p className="text-muted-foreground text-sm">
            This audit runs real-time security tests on the blockchain. It verifies classical and
            post-quantum cryptography, the privacy protocol (Ring Signatures, Stealth Addresses, zk-STARKs), all 11 consensus
            enforcement rules, and attack prevention mechanisms.
          </p>

          {audit ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {audit.categories.map((cat, i) => (
                  <AuditCategory key={i} category={cat} />
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">SHA-256</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">ECDSA secp256k1</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">ML-DSA-65 (FIPS 204)</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">LSAG Ring Signatures</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">Stealth Addresses</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">zk-STARKs</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">Dandelion++</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">AuxPoW Merge Mining</Badge>
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">11 Consensus Rules</Badge>
              </div>

              {audit.timestamp && (
                <p className="text-xs text-muted-foreground/50 pt-2">
                  Last audit: {new Date(audit.timestamp).toLocaleString("en-US")}
                </p>
              )}
            </>
          ) : auditLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <span className="ml-3 text-muted-foreground">Running security tests...</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Tokenomics Simplified */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Key Numbers
            <Badge variant="outline" className="ml-2 text-xs">Live Data</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-primary/5 rounded-sm border border-primary/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Max Supply</p>
              <p className="text-xl font-heading font-bold gold-text">21,000,000</p>
              <p className="text-xs text-muted-foreground">Total BRICS</p>
            </div>
            <div className="p-4 bg-emerald-500/5 rounded-sm border border-emerald-500/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Premine</p>
              <p className="text-xl font-heading font-bold text-emerald-400">0%</p>
              <p className="text-xs text-muted-foreground">Fair Launch</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-sm border border-primary/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Block Reward</p>
              <p className="text-xl font-heading font-bold gold-text">{tokenomics?.mining_rewards?.current_block_reward || 50}</p>
              <p className="text-xs text-muted-foreground">BRICS per block</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-sm border border-primary/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Transaction Fee</p>
              <p className="text-xl font-heading font-bold gold-text">0.000005</p>
              <p className="text-xs text-muted-foreground">BRICS (near zero)</p>
            </div>
          </div>

          {tokenomics?.mining_rewards?.mined_so_far > 0 && (
            <div className="p-4 bg-card rounded-sm border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Mined so far</span>
                <span className="text-sm font-mono font-bold gold-text">
                  {tokenomics.mining_rewards.mined_so_far?.toLocaleString()} BRICS
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(tokenomics.mining_rewards.percentage_mined, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {tokenomics.mining_rewards.percentage_mined}% of total
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tech Specs */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle>Technical Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Algorithm", value: "SHA-256" },
              { label: "Max Supply", value: "21M BRICS" },
              { label: "Block Reward", value: "50 BRICS" },
              { label: "Halving", value: "210,000 blocks" },
              { label: "Block Time", value: "~10 min" },
              { label: "Difficulty", value: "Dynamic" },
              { label: "TX Fee", value: "0.000005 BRICS" },
              { label: "Post-Quantum", value: "ML-DSA-65" },
              { label: "Ring Signatures", value: "LSAG (32-64)" },
              { label: "Stealth Addr", value: "DHKE" },
              { label: "Amount Hiding", value: "zk-STARKs" },
              { label: "Network Privacy", value: "Dandelion++" },
              { label: "Merge Mining", value: "AuxPoW (BTC)" },
              { label: "Consensus Rules", value: "11 enforced" },
              { label: "License", value: "MIT" },
              { label: "Mining", value: "Open to all" },
            ].map((spec, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-sm text-center">
                <p className="text-xs text-muted-foreground">{spec.label}</p>
                <p className="font-bold text-primary text-sm">{spec.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-sm border border-primary/10">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Jabo86</h3>
              <p className="text-muted-foreground">Founder & Lead Developer</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">SHA-256</Badge>
                <Badge variant="outline" className="text-xs">Blockchain</Badge>
                <Badge variant="outline" className="text-xs">PQC</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Whitepaper & Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Whitepaper
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              The official technical document with all details on architecture, tokenomics, and BricsCoin roadmap.
            </p>
            <Button
              onClick={() => window.location.href = '/whitepaper'}
              className="w-full"
              data-testid="whitepaper-btn"
            >
              <FileText className="w-4 h-4 mr-2" />
              Read the Whitepaper
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" />
              Source Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              BricsCoin is fully open source. Anyone can read the code, propose improvements, or run their own node.
            </p>
            <Button
              variant="outline"
              onClick={() => window.open('https://codeberg.org/Bricscoin_26/Bricscoin', '_blank')}
              className="w-full border-white/20"
              data-testid="codeberg-btn"
            >
              <Code className="w-4 h-4 mr-2" />
              View on Codeberg
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 pt-8">
        <h2 className="text-xl sm:text-2xl font-heading font-bold">Ready to discover BricsCoin?</h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Create your first wallet in seconds. No documents, email, or registration required.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button onClick={() => window.location.href = '/wallet'} data-testid="get-started-btn">
            <Wallet className="w-4 h-4 mr-2" />
            Create your Wallet
          </Button>
          <Button variant="outline" className="border-white/20" onClick={() => window.location.href = '/blockchain'}>
            <Globe className="w-4 h-4 mr-2" />
            Explore the Blockchain
          </Button>
          <Button variant="outline" className="border-white/20" onClick={() => window.open('https://x.com/Bricscoin26', '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Twitter/X
          </Button>
        </div>
      </div>
    </div>
  );
}
