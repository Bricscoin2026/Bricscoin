import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  Blocks, Shield, Wallet, MessageSquareLock, Clock, Award,
  Brain, Pickaxe, Globe, ArrowRight, Zap, Lock, Eye,
  ChevronDown, Atom, Network, BarChart3, ShieldCheck
} from "lucide-react";
import { Button } from "../components/ui/button";

/* ─── animated grid background ─── */
function CyberGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)" }} />
      {/* Grid lines */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,215,0,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,215,0,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float-particle ${8 + Math.random() * 12}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }} />
      ))}
    </div>
  );
}

/* ─── animated counter ─── */
function AnimCounter({ target, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── feature card with glassmorphism ─── */
function FeatureCard({ icon: Icon, title, description, link, color, delay = 0, tag }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: delay * 0.1, duration: 0.5, ease: "easeOut" }}
    >
      <Link to={link} className="block group" data-testid={`feature-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className="relative h-full p-6 rounded-sm border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm
                        hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-500
                        overflow-hidden">
          {/* Glow on hover */}
          <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700`}
            style={{ background: `radial-gradient(circle, ${color}15, transparent 70%)` }} />

          <div className="relative z-10">
            {tag && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm mb-3"
                style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
                {tag}
              </span>
            )}
            <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-4"
              style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <h3 className="text-lg font-heading font-bold mb-2 group-hover:text-foreground transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
            <div className="flex items-center gap-1 mt-4 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color }}>
              Explore <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── section title ─── */
function SectionTitle({ children, sub }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="text-center mb-12"
    >
      <h2 className="text-3xl sm:text-4xl font-heading font-bold">{children}</h2>
      {sub && <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">{sub}</p>}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════ */
/*                 LANDING PAGE                */
/* ═══════════════════════════════════════════ */
export default function Landing() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="relative -mt-6" data-testid="landing-page">

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <CyberGrid />

        {/* Parallax orb */}
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{
            background: "radial-gradient(circle, #FFD700, transparent 70%)",
            transform: `translateY(${scrollY * 0.15}px)`,
          }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary tracking-wide">LIVE ON MAINNET</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-black leading-[1.05] mb-6">
            The Chain That{" "}
            <span className="gold-text relative">
              Thinks Ahead.
              <div className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent" />
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Your money. Your rules. No middlemen.
            A decentralized SHA-256 blockchain with post-quantum security,
            encrypted messaging, on-chain NFTs, and a peer-to-peer network anyone can join.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/wallet">
              <Button size="lg" className="gold-button rounded-sm text-base px-8 h-12" data-testid="hero-get-started">
                <Wallet className="w-5 h-5 mr-2" />
                Get Started
              </Button>
            </Link>
            <Link to="/blockchain">
              <Button size="lg" variant="outline" className="border-white/10 rounded-sm text-base px-8 h-12 hover:bg-white/5" data-testid="hero-explore">
                <Eye className="w-5 h-5 mr-2" />
                Explore Blockchain
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 z-10"
        >
          <ChevronDown className="w-6 h-6 text-muted-foreground animate-bounce" />
        </motion.div>
      </section>

      {/* ═══ LIVE STATS BAR ═══ */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.01] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { label: "Max Supply", value: "21M", suffix: "BRICS" },
            { label: "Algorithm", value: "SHA-256", static: true },
            { label: "Premine", value: "0%", static: true },
            { label: "Quantum-Proof", value: "ML-DSA-65", static: true },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <p className="text-xl sm:text-2xl md:text-3xl font-heading font-bold gold-text break-words">
                {stat.static ? stat.value : stat.value}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ WHAT IS BRICSCOIN ═══ */}
      <section className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <SectionTitle sub="No banks. No middlemen. Just math and cryptography.">
            What is BricsCoin?
          </SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Blocks, title: "A Digital Currency",
                text: "BricsCoin is money that lives on the internet. Like Bitcoin, it uses the SHA-256 algorithm to secure every transaction. No bank or government controls it — the network belongs to everyone."
              },
              {
                icon: Lock, title: "Immutable Ledger",
                text: "Every transaction is permanently recorded on the blockchain — a public ledger that anyone can verify. Once confirmed, nothing can be altered, deleted, or censored."
              },
              {
                icon: Globe, title: "Fully Decentralized",
                text: "The network runs on independent computers (nodes) across the world. If one shuts down, the rest keep going. Anyone can download the software and run a node."
              },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="p-6 rounded-sm border border-white/[0.06] bg-white/[0.02]">
                <item.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-heading font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECURITY ═══ */}
      <section className="relative py-24 px-4 overflow-hidden">
        {/* Background accent */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ background: "radial-gradient(ellipse at 30% 50%, #10b981, transparent 60%)" }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <SectionTitle sub="Protected today. Protected tomorrow.">
            <ShieldCheck className="inline w-8 h-8 text-emerald-400 mr-2 -mt-1" />
            Military-Grade Security
          </SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="p-6 rounded-sm border border-emerald-500/10 bg-emerald-500/[0.02]">
              <Shield className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="font-heading font-bold text-lg mb-2">SHA-256 + ECDSA</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The same battle-tested cryptography that protects Bitcoin and banks worldwide.
                Every block is hashed with SHA-256, and every transaction is signed with ECDSA secp256k1.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="p-6 rounded-sm border border-emerald-500/10 bg-emerald-500/[0.02]">
              <Atom className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="font-heading font-bold text-lg mb-2">Post-Quantum Cryptography</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                BricsCoin integrates ML-DSA-65 (FIPS 204) — a lattice-based signature scheme designed
                to resist attacks from future quantum computers. Your funds are future-proof.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.5 }}
              className="p-6 rounded-sm border border-emerald-500/10 bg-emerald-500/[0.02]">
              <Lock className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="font-heading font-bold text-lg mb-2">Client-Side Signing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your private key never leaves your device. Transactions are signed directly in your
                browser before being broadcast to the network. Zero trust required.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.5 }}
              className="p-6 rounded-sm border border-emerald-500/10 bg-emerald-500/[0.02]">
              <Eye className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="font-heading font-bold text-lg mb-2">Live Security Audit</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Run a real-time security audit on the blockchain, any time. Every test — input validation,
                cryptography, attack prevention — is publicly verifiable.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ ECOSYSTEM ═══ */}
      <section className="relative py-24 px-4">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <SectionTitle sub="BricsCoin is not just a coin. It's an entire ecosystem built on the blockchain.">
            The Ecosystem
          </SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Wallet} title="Wallet" link="/wallet"
              color="#FFD700" delay={0} tag="Core"
              description="Create wallets instantly — no signup, no email, no KYC. Send and receive BRICS worldwide. Your keys, your coins. Secured with a 12-word seed phrase backup."
            />
            <FeatureCard
              icon={Blocks} title="Block Explorer" link="/blockchain"
              color="#FFD700" delay={1} tag="Core"
              description="Browse every block, every transaction, every address. The entire history of BricsCoin is public, transparent, and verifiable by anyone."
            />
            <FeatureCard
              icon={MessageSquareLock} title="BricsChat" link="/chat"
              color="#8B5CF6" delay={2} tag="Messaging"
              description="Send encrypted messages stored permanently on the blockchain. Quantum-proof signatures ensure no one can forge your identity. Fully decentralized, no servers."
            />
            <FeatureCard
              icon={Clock} title="Time Capsule" link="/timecapsule"
              color="#3B82F6" delay={3} tag="Unique"
              description="Lock messages inside the blockchain with a time lock. They can only be opened after a specific block height is reached. Like burying a letter for the future."
            />
            <FeatureCard
              icon={Award} title="BricsNFT" link="/nft"
              color="#EC4899" delay={4} tag="Certificates"
              description="Mint quantum-proof certificates on the blockchain — diplomas, property deeds, authenticity proofs, awards. Verified with ML-DSA-65 signatures, immutable forever."
            />
            <FeatureCard
              icon={Brain} title="AI Oracle" link="/oracle"
              color="#10B981" delay={5} tag="Intelligence"
              description="An AI-powered blockchain analyst. Ask it anything about BricsCoin — network health, mining stats, security status. It reads the chain and responds in real-time."
            />
            <FeatureCard
              icon={Pickaxe} title="Mining" link="/p2pool"
              color="#F59E0B" delay={6} tag="Earn"
              description="Mine BRICS with SHA-256 hardware. Join the PPLNS pool for steady rewards or mine solo for the full 50 BRICS block reward. Fair launch — no premine, no insider allocation."
            />
            <FeatureCard
              icon={Network} title="P2P Network" link="/network"
              color="#06B6D4" delay={7} tag="Infrastructure"
              description="A fully decentralized peer-to-peer network. Nodes discover each other automatically, sync the blockchain, and propagate transactions. Download the node and join."
            />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="relative py-24 px-4">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="max-w-4xl mx-auto">
          <SectionTitle sub="From zero to sending your first BRICS in under a minute.">
            How It Works
          </SectionTitle>

          <div className="space-y-0">
            {[
              { step: "01", title: "Create a Wallet", text: "Click 'New Wallet' — that's it. A unique address and a 12-word seed phrase are generated instantly. No registration, no personal data." },
              { step: "02", title: "Receive BRICS", text: "Share your address or QR code. When someone sends you BRICS, it appears in your wallet after the next block confirmation (~10 minutes)." },
              { step: "03", title: "Send BRICS", text: "Enter a recipient address, the amount, and click send. The transaction is signed in your browser and broadcast to the P2P network." },
              { step: "04", title: "Explore", text: "Use BricsChat to send encrypted messages, create Time Capsules, mint NFT certificates, or ask the AI Oracle about network health." },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex gap-6 py-8 border-b border-white/[0.04] last:border-0">
                <div className="shrink-0">
                  <span className="text-3xl font-heading font-black text-primary/20">{item.step}</span>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TOKENOMICS ═══ */}
      <section className="relative py-24 px-4">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <div className="max-w-4xl mx-auto">
          <SectionTitle sub="100% fair. 0% premine. Every single BRICS must be mined.">
            Tokenomics
          </SectionTitle>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Supply", value: "21M", sub: "Fixed forever" },
              { label: "Block Reward", value: "50 BRICS", sub: "Halves every 210K blocks" },
              { label: "TX Fee", value: "0.000005", sub: "Near zero cost" },
              { label: "Premine", value: "0%", sub: "100% fair launch" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-4 sm:p-5 rounded-sm border border-white/[0.06] bg-white/[0.02] text-center">
                <p className="text-lg sm:text-2xl font-heading font-bold gold-text">{item.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{item.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ background: "radial-gradient(ellipse at 50% 80%, #FFD700, transparent 60%)" }} />

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
            Ready to join the network?
          </h2>
          <p className="text-muted-foreground mb-8">
            Create your wallet in seconds. No signup, no email, no KYC.
            Just you and the blockchain.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/wallet">
              <Button size="lg" className="gold-button rounded-sm px-8 h-12" data-testid="cta-wallet">
                <Wallet className="w-5 h-5 mr-2" />
                Create Wallet
              </Button>
            </Link>
            <Link to="/network">
              <Button size="lg" variant="outline" className="border-white/10 rounded-sm px-8 h-12 hover:bg-white/5" data-testid="cta-network">
                <Globe className="w-5 h-5 mr-2" />
                Run a Node
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-10 text-xs text-muted-foreground">
            <a href="https://codeberg.org/Bricscoin_26/Bricscoin" target="_blank" rel="noreferrer"
              className="hover:text-primary transition-colors">Open Source</a>
            <a href="https://x.com/Bricscoin26" target="_blank" rel="noreferrer"
              className="hover:text-primary transition-colors">Twitter/X</a>
            <Link to="/whitepaper" className="hover:text-primary transition-colors">Whitepaper</Link>
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
