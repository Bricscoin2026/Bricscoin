import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  Blocks, Shield, Wallet, MessageSquareLock, Clock, Award,
  Brain, Pickaxe, Globe, ArrowRight, Zap, Lock, Eye, EyeOff,
  ChevronDown, Atom, Network, ShieldCheck, UserX, Fingerprint,
  CheckCircle, Layers, Scan, Link2
} from "lucide-react";
import { Button } from "../components/ui/button";

/* ─── animated grid background ─── */
function CyberGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)" }} />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,215,0,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,215,0,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
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

/* ─── feature card ─── */
function FeatureCard({ icon: Icon, title, description, link, color, delay = 0, tag }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: delay * 0.1, duration: 0.5, ease: "easeOut" }}>
      <Link to={link} className="block group" data-testid={`feature-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className="relative h-full p-6 rounded-sm border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm
                        hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-500 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
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
            <h3 className="text-lg font-heading font-bold mb-2 group-hover:text-foreground transition-colors">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            <div className="flex items-center gap-1 mt-4 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>
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
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }} className="text-center mb-12">
      <h2 className="text-3xl sm:text-4xl font-heading font-bold">{children}</h2>
      {sub && <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">{sub}</p>}
    </motion.div>
  );
}

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
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, #FFD700, transparent 70%)", transform: `translateY(${scrollY * 0.15}px)` }} />

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }} className="relative z-10 max-w-4xl">
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

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            The first blockchain with 6 layers of cryptographic security.
            Ring Signatures hide the sender. Stealth Addresses hide the receiver.
            zk-STARKs hide the amount. Post-quantum cryptography protects the future.
          </p>

          {/* Privacy badges inline */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { icon: UserX, label: "Sender Hidden", color: "#8B5CF6" },
              { icon: EyeOff, label: "Receiver Hidden", color: "#06B6D4" },
              { icon: Lock, label: "Amount Hidden", color: "#10B981" },
              { icon: Atom, label: "Quantum-Proof", color: "#F59E0B" },
            ].map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
                style={{ borderColor: `${b.color}30`, color: b.color, background: `${b.color}08` }}>
                <b.icon className="w-3.5 h-3.5" />
                {b.label}
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/wallet">
              <Button size="lg" className="gold-button rounded-sm text-base px-8 h-12" data-testid="hero-get-started">
                <Wallet className="w-5 h-5 mr-2" />Get Started
              </Button>
            </Link>
            <Link to="/blockchain">
              <Button size="lg" variant="outline" className="border-white/10 rounded-sm text-base px-8 h-12 hover:bg-white/5" data-testid="hero-explore">
                <Eye className="w-5 h-5 mr-2" />Explore Blockchain
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 z-10">
          <ChevronDown className="w-6 h-6 text-muted-foreground animate-bounce" />
        </motion.div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.01] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 text-center">
          {[
            { label: "Max Supply", value: "21M" },
            { label: "Algorithm", value: "SHA-256" },
            { label: "Premine", value: "0%" },
            { label: "Quantum-Proof", value: "ML-DSA-65" },
            { label: "Privacy Layers", value: "6" },
            { label: "Trusted Setup", value: "None" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <p className="text-xl sm:text-2xl font-heading font-bold gold-text break-words">{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ 6-LAYER SECURITY STACK ═══ */}
      <section className="relative py-24 px-4 overflow-hidden" data-testid="security-stack-section">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ background: "radial-gradient(ellipse at 30% 50%, #10b981, transparent 60%)" }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <SectionTitle sub="6 independent cryptographic layers protect every transaction. No single point of failure.">
            <ShieldCheck className="inline w-8 h-8 text-emerald-400 mr-2 -mt-1" />
            6-Layer Security Architecture
          </SectionTitle>

          <div className="space-y-3">
            {[
              {
                layer: "L1", tech: "SHA-256 Proof of Work", color: "#F59E0B",
                icon: Blocks, purpose: "Block Security",
                desc: "Every block is secured with the same algorithm that protects Bitcoin. Miners compete to find valid hashes, making the chain computationally immutable."
              },
              {
                layer: "L2", tech: "ECDSA secp256k1", color: "#3B82F6",
                icon: Fingerprint, purpose: "Transaction Signing",
                desc: "Every transaction is signed with elliptic curve cryptography. Your private key never leaves your device. Client-side signing means zero trust required."
              },
              {
                layer: "L3", tech: "ML-DSA-65 (FIPS 204)", color: "#06B6D4",
                icon: Atom, purpose: "Quantum Resistance",
                desc: "Lattice-based post-quantum signatures protect against future quantum computers. BricsCoin is one of the first chains to integrate NIST-standardized PQC."
              },
              {
                layer: "L4", tech: "zk-STARK (FRI Protocol)", color: "#10B981",
                icon: Lock, purpose: "Hidden Amounts",
                desc: "Zero-Knowledge Scalable Transparent Arguments of Knowledge. Prove a transaction is valid without revealing the amount. 128-bit security, no trusted setup, quantum-resistant hashing."
              },
              {
                layer: "L5", tech: "Ring Signatures (LSAG)", color: "#8B5CF6",
                icon: UserX, purpose: "Hidden Sender",
                desc: "Linkable Spontaneous Anonymous Group signatures. The real sender is hidden among a ring of decoy public keys. A Key Image prevents double-spending without revealing identity."
              },
              {
                layer: "L6", tech: "Stealth Addresses (DHKE)", color: "#EC4899",
                icon: EyeOff, purpose: "Hidden Receiver",
                desc: "Diffie-Hellman Key Exchange stealth protocol. Every payment goes to a unique one-time address. Only the recipient, with their scan key, can detect and claim the funds."
              },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="flex items-start gap-4 p-5 rounded-sm border bg-white/[0.01] transition-all duration-300 hover:bg-white/[0.03]"
                style={{ borderColor: `${item.color}15` }}
                data-testid={`security-layer-${item.layer}`}
              >
                <div className="shrink-0 w-12 h-12 rounded-sm flex items-center justify-center"
                  style={{ background: `${item.color}10`, border: `1px solid ${item.color}20` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
                      style={{ color: item.color, background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                      {item.layer}
                    </span>
                    <h3 className="font-heading font-bold text-base" style={{ color: item.color }}>{item.tech}</h3>
                    <span className="text-[10px] text-muted-foreground ml-auto hidden sm:block">{item.purpose}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
                <CheckCircle className="w-4 h-4 shrink-0 mt-1" style={{ color: item.color }} />
              </motion.div>
            ))}
          </div>

          {/* Privacy result summary */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-8 p-6 rounded-sm border border-emerald-500/15 bg-emerald-500/[0.03] text-center">
            <div className="flex flex-wrap justify-center gap-8 mb-4">
              <div className="text-center">
                <UserX className="w-6 h-6 text-violet-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-violet-400">SENDER</p>
                <p className="text-[10px] text-muted-foreground">Ring Signature</p>
              </div>
              <div className="text-center text-2xl text-muted-foreground">+</div>
              <div className="text-center">
                <EyeOff className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-cyan-400">RECEIVER</p>
                <p className="text-[10px] text-muted-foreground">Stealth Address</p>
              </div>
              <div className="text-center text-2xl text-muted-foreground">+</div>
              <div className="text-center">
                <Lock className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-emerald-400">AMOUNT</p>
                <p className="text-[10px] text-muted-foreground">zk-STARK Proof</p>
              </div>
              <div className="text-center text-2xl text-muted-foreground">=</div>
              <div className="text-center">
                <Shield className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-bold gold-text">TOTAL PRIVACY</p>
                <p className="text-[10px] text-muted-foreground">Fully Anonymous</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              On the public blockchain, a private transaction shows: <code className="text-violet-400 mx-1">RING_HIDDEN</code> {">"} <code className="text-cyan-400 mx-1">BRICSX...</code> {">"} <code className="text-emerald-400 mx-1">SHIELDED</code>
            </p>
          </motion.div>
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
                text: "BricsCoin is money that lives on the internet. Like Bitcoin, it uses SHA-256 to secure every transaction. No bank or government controls it — the network belongs to everyone."
              },
              {
                icon: Lock, title: "Immutable Ledger",
                text: "Every transaction is permanently recorded on the blockchain — a public ledger anyone can verify. Once confirmed, nothing can be altered, deleted, or censored."
              },
              {
                icon: Globe, title: "Fully Decentralized",
                text: "The network runs on independent nodes across the world. Anyone can download the software and run a node. If one shuts down, the rest keep going."
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

      {/* ═══ ECOSYSTEM ═══ */}
      <section className="relative py-24 px-4">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="max-w-6xl mx-auto">
          <SectionTitle sub="BricsCoin is not just a coin. It's an entire ecosystem built on the blockchain.">
            The Ecosystem
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={Wallet} title="Wallet Hub" link="/wallet" color="#FFD700" delay={0} tag="Core"
              description="Create wallets instantly. Legacy ECDSA or Post-Quantum PQC. Send BRICS worldwide with a 12-word seed phrase backup. No signup, no KYC." />
            <FeatureCard icon={Shield} title="Total Privacy" link="/wallet?tab=privacy" color="#8B5CF6" delay={1} tag="Privacy"
              description="Send fully anonymous transactions. Ring Signatures hide the sender, Stealth Addresses hide the receiver, zk-STARKs hide the amount. No one can trace your payments." />
            <FeatureCard icon={Lock} title="zk-STARK Shielded" link="/wallet?tab=zk" color="#10B981" delay={2} tag="Zero Knowledge"
              description="Generate STARK proofs to verify transactions without revealing amounts. 128-bit security, quantum-resistant, no trusted setup. Based on the FRI protocol." />
            <FeatureCard icon={Atom} title="Post-Quantum" link="/wallet?tab=pqc" color="#06B6D4" delay={3} tag="Quantum-Proof"
              description="ML-DSA-65 (FIPS 204) lattice-based signatures. Migrate your legacy wallet to a quantum-proof address. Your funds are safe against future quantum attacks." />
            <FeatureCard icon={Blocks} title="Block Explorer" link="/blockchain" color="#FFD700" delay={4} tag="Transparency"
              description="Browse every block, every transaction, every address. The entire history is public and verifiable. Shielded transactions show masked data." />
            <FeatureCard icon={MessageSquareLock} title="BricsChat" link="/chat" color="#8B5CF6" delay={5} tag="Messaging"
              description="Encrypted messages stored permanently on the blockchain. Quantum-proof signatures ensure no one can forge your identity. Fully decentralized." />
            <FeatureCard icon={Clock} title="Time Capsule" link="/timecapsule" color="#3B82F6" delay={6} tag="Unique"
              description="Lock messages inside the blockchain with a time lock. They can only be opened after a specific block height is reached." />
            <FeatureCard icon={Award} title="BricsNFT" link="/nft" color="#EC4899" delay={7} tag="Certificates"
              description="Mint quantum-proof certificates — diplomas, property deeds, authenticity proofs. Verified with ML-DSA-65 signatures, immutable forever." />
            <FeatureCard icon={Brain} title="AI Oracle" link="/oracle" color="#10B981" delay={8} tag="Intelligence"
              description="An AI-powered blockchain analyst. Ask it anything about BricsCoin — network health, mining stats, security status. Real-time chain analysis." />
            <FeatureCard icon={Pickaxe} title="Mining" link="/p2pool" color="#F59E0B" delay={9} tag="Earn"
              description="Mine BRICS with SHA-256 hardware. Join the PPLNS pool for steady rewards or mine solo for 50 BRICS/block. Fair launch — zero premine." />
            <FeatureCard icon={Network} title="P2P Network" link="/network" color="#06B6D4" delay={10} tag="Infrastructure"
              description="Fully decentralized peer-to-peer network. Nodes discover each other, sync the blockchain, and propagate transactions. Download and join." />
            <FeatureCard icon={Scan} title="Security Audit" link="/blockchain" color="#10B981" delay={11} tag="Verification"
              description="Run a real-time security audit on the blockchain. Every test — input validation, cryptography, attack prevention — is publicly verifiable." />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="relative py-24 px-4">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-4xl mx-auto">
          <SectionTitle sub="From zero to sending your first private transaction in under a minute.">
            How It Works
          </SectionTitle>
          <div className="space-y-0">
            {[
              { step: "01", title: "Create a Wallet", text: "Click 'New Wallet' — that's it. A unique address and a 12-word seed phrase are generated instantly. Choose Legacy (ECDSA) or Quantum-Proof (ML-DSA-65)." },
              { step: "02", title: "Set Up Stealth Address", text: "Generate your stealth meta-address in the Privacy tab. Share it with anyone who wants to send you untraceable payments." },
              { step: "03", title: "Send with Total Privacy", text: "Use the Total Privacy tab: your identity is hidden in a ring of signatures, the recipient gets a one-time stealth address, and the amount is shielded by a STARK proof." },
              { step: "04", title: "Explore the Ecosystem", text: "Send encrypted messages via BricsChat, mint NFT certificates, create Time Capsules, mine BRICS, or ask the AI Oracle about network health." },
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

      {/* ═══ COMPARISON ═══ */}
      <section className="relative py-24 px-4">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-4xl mx-auto">
          <SectionTitle sub="How BricsCoin stacks up against major privacy coins.">
            Privacy Comparison
          </SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="privacy-comparison-table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-muted-foreground font-medium">Feature</th>
                  <th className="p-3 text-center gold-text font-bold">BricsCoin</th>
                  <th className="p-3 text-center text-muted-foreground">Bitcoin</th>
                  <th className="p-3 text-center text-muted-foreground">Monero</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Hidden Sender", brics: true, btc: false, xmr: true },
                  { feature: "Hidden Receiver", brics: true, btc: false, xmr: true },
                  { feature: "Hidden Amount", brics: true, btc: false, xmr: true },
                  { feature: "Post-Quantum", brics: true, btc: false, xmr: false },
                  { feature: "No Trusted Setup", brics: true, btc: true, xmr: true },
                  { feature: "On-chain NFTs", brics: true, btc: false, xmr: false },
                  { feature: "Encrypted Messaging", brics: true, btc: false, xmr: false },
                  { feature: "AI Oracle", brics: true, btc: false, xmr: false },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="p-3 font-medium">{row.feature}</td>
                    <td className="p-3 text-center">
                      {row.brics ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" /> : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="p-3 text-center">
                      {row.btc ? <CheckCircle className="w-4 h-4 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground/40">-</span>}
                    </td>
                    <td className="p-3 text-center">
                      {row.xmr ? <CheckCircle className="w-4 h-4 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground/40">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ background: "radial-gradient(ellipse at 50% 80%, #FFD700, transparent 60%)" }} />

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
            Ready for Total Privacy?
          </h2>
          <p className="text-muted-foreground mb-8">
            Create your wallet in seconds. Send anonymous transactions.
            No signup, no email, no KYC. Just you, math, and cryptography.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/wallet">
              <Button size="lg" className="gold-button rounded-sm px-8 h-12" data-testid="cta-wallet">
                <Wallet className="w-5 h-5 mr-2" />Create Wallet
              </Button>
            </Link>
            <Link to="/wallet?tab=privacy">
              <Button size="lg" variant="outline" className="border-violet-500/30 text-violet-400 rounded-sm px-8 h-12 hover:bg-violet-500/5" data-testid="cta-privacy">
                <Shield className="w-5 h-5 mr-2" />Send Private TX
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
