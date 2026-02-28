import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  FileText, ChevronRight, Shield, Cpu, Coins, Blocks, 
  Lock, MessageSquare, Clock, Award, Brain, Globe, 
  Pickaxe, Zap, ArrowUp, ExternalLink, BookOpen
} from "lucide-react";
import { motion } from "framer-motion";

const API = process.env.REACT_APP_BACKEND_URL;

const sections = [
  { id: "abstract", title: "Abstract", icon: BookOpen },
  { id: "introduction", title: "1. Introduction", icon: Globe },
  { id: "specifications", title: "2. Technical Specs", icon: Cpu },
  { id: "architecture", title: "3. Architecture", icon: Blocks },
  { id: "pqc", title: "4. Post-Quantum Crypto", icon: Shield },
  { id: "mining", title: "5. Mining & Consensus", icon: Pickaxe },
  { id: "tokenomics", title: "6. Tokenomics", icon: Coins },
  { id: "applications", title: "7. On-Chain Apps", icon: Zap },
  { id: "security", title: "8. Security", icon: Lock },
  { id: "roadmap", title: "9. Roadmap", icon: ChevronRight },
  { id: "conclusion", title: "10. Conclusion", icon: FileText },
  { id: "references", title: "References", icon: BookOpen },
];

function TableOfContents({ activeSection }) {
  return (
    <nav className="hidden lg:block sticky top-24 w-56 shrink-0" data-testid="whitepaper-toc">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-semibold">Contents</p>
      <ul className="space-y-1">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded transition-all duration-200 ${
                activeSection === s.id
                  ? "text-primary bg-primary/10 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <s.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{s.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SectionHeading({ id, children, level = 2 }) {
  const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  const sizes = { 1: "text-3xl sm:text-4xl", 2: "text-xl sm:text-2xl", 3: "text-lg sm:text-xl" };
  return (
    <Tag id={id} className={`${sizes[level]} font-heading font-bold scroll-mt-24 mb-4 mt-12 first:mt-0`}>
      {children}
    </Tag>
  );
}

function SpecTable({ rows }) {
  return (
    <div className="overflow-x-auto my-6 rounded border border-white/10">
      <table className="w-full text-sm" data-testid="spec-table">
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
              <td className="px-4 py-2.5 font-medium text-muted-foreground border-r border-white/10 w-[40%]">{label}</td>
              <td className="px-4 py-2.5 font-mono text-sm">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="border border-white/10 rounded bg-white/[0.02] p-5 my-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary" />
        <h4 className="font-heading font-bold text-base">{title}</h4>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

export default function Whitepaper() {
  const [activeSection, setActiveSection] = useState("abstract");
  const [stats, setStats] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/network/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="min-h-screen" data-testid="whitepaper-page">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative border-b border-white/10 bg-gradient-to-b from-primary/5 to-transparent"
      >
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4 font-semibold">Technical Document</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold mb-4">
              BricsCoin <span className="gold-text">Whitepaper</span>
            </h1>
            <p className="text-sm font-medium text-primary/80 tracking-wide mb-3">
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
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              A Decentralized SHA-256 Proof-of-Work Cryptocurrency with Post-Quantum Cryptographic Security
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="bg-white/5 px-3 py-1 rounded-full">Version 3.1</span>
              <span className="bg-white/5 px-3 py-1 rounded-full">February 2026</span>
              <span className="bg-white/5 px-3 py-1 rounded-full">Author: Jabo86</span>
              {stats && <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">Block Height: {stats.block_height?.toLocaleString()}</span>}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-12 flex gap-10">
        <TableOfContents activeSection={activeSection} />

        <article ref={contentRef} className="flex-1 min-w-0 text-[15px] leading-relaxed text-foreground/90 whitepaper-prose">
          {/* ABSTRACT */}
          <SectionHeading id="abstract" level={2}>Abstract</SectionHeading>
          <p>
            <strong>BRICSCOIN</strong> &mdash;{" "}
            <span className="text-base font-bold text-primary">B</span>lockchain{" "}
            <span className="text-base font-bold text-primary">R</span>esilient{" "}
            <span className="text-base font-bold text-primary">I</span>nfrastructure for{" "}
            <span className="text-base font-bold text-primary">C</span>ryptographic{" "}
            <span className="text-base font-bold text-primary">S</span>ecurity:{" "}
            <span className="text-base font-bold text-primary">C</span>ertified{" "}
            <span className="text-base font-bold text-primary">O</span>pen{" "}
            <span className="text-base font-bold text-primary">I</span>nnovation{" "}
            <span className="text-base font-bold text-primary">N</span>etwork &mdash; is a decentralized cryptocurrency built on the proven SHA-256 Proof-of-Work consensus mechanism, enhanced with <strong>post-quantum cryptographic security</strong> and <strong>mandatory privacy at consensus level</strong>. The name reflects the project's core mission: building resilient, open, and secure digital infrastructure for a post-quantum world. It has no political, geopolitical, or institutional affiliation of any kind.
          </p>
          <p className="mt-3">
            With a fixed supply of <strong>21,000,000 coins</strong>, ultra-low transaction fees of <strong>0.000005 BRICS</strong> (burned), and a hybrid <strong>ECDSA + ML-DSA-65</strong> signature scheme providing quantum resistance, BricsCoin is a fair, transparent, secure, and future-proof digital currency.
          </p>
          <p className="mt-3">
            Every transaction on BricsCoin is fully private by design: <strong>LSAG Ring Signatures</strong> (32-64 decoys) hide the sender, <strong>Stealth Addresses</strong> (DHKE) hide the receiver, and <strong>zk-STARK proofs</strong> hide the amount. No plaintext sender address or amount is ever stored on the blockchain. Privacy is enforced at the consensus level &mdash; nodes reject blocks containing private transactions with missing or invalid cryptographic proofs.
          </p>
          <p className="mt-3">
            BricsCoin goes beyond a simple payment network by offering a suite of on-chain applications: <strong>BricsChat</strong> (quantum-proof encrypted messaging), <strong>Time Capsule</strong> (time-locked on-chain data), <strong>BricsNFT</strong> (PQC-signed certificates), and an <strong>AI Oracle</strong> (GPT-5.2 powered network intelligence).
          </p>

          {/* 1. INTRODUCTION */}
          <SectionHeading id="introduction" level={2}>1. Introduction</SectionHeading>
          
          <SectionHeading id="intro-bg" level={3}>1.1 Background</SectionHeading>
          <p>
            Since Bitcoin's inception in 2009, Proof-of-Work has proven to be the most secure and decentralized consensus mechanism for digital currencies. BricsCoin builds upon this foundation, implementing a clean SHA-256-based blockchain optimized for modern ASIC mining hardware, while introducing a comprehensive suite of on-chain applications.
          </p>

          <SectionHeading id="intro-quantum" level={3}>1.2 The Quantum Threat</SectionHeading>
          <p>
            The development of large-scale quantum computers poses a significant and imminent threat to current cryptographic systems. Shor's algorithm can break ECDSA and RSA &mdash; the foundations of most blockchain security. BricsCoin proactively addresses this threat by implementing a hybrid post-quantum cryptographic scheme based on <strong>NIST FIPS 204 (ML-DSA-65)</strong>, formerly known as CRYSTALS-Dilithium.
          </p>

          <SectionHeading id="intro-vision" level={3}>1.3 Vision</SectionHeading>
          <p>BricsCoin's mission is to create a truly decentralized currency that:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
            <li>Remains accessible to hardware miners worldwide via SHA-256 PoW</li>
            <li>Maintains ultra-low, deflationary transaction fees (0.000005 BRICS, burned)</li>
            <li>Enforces mandatory privacy: sender, receiver, and amount hidden on every transaction</li>
            <li>Offers quantum-resistant security through ML-DSA-65 hybrid signatures</li>
            <li>Validates privacy proofs at the consensus level &mdash; nodes reject non-compliant blocks</li>
            <li>Hosts on-chain applications: Chat, Certificates, Time Capsules, AI Oracle</li>
            <li>Operates as a fully open-source project under MIT license</li>
          </ul>

          {/* 2. TECHNICAL SPECIFICATIONS */}
          <SectionHeading id="specifications" level={2}>2. Technical Specifications</SectionHeading>
          <SpecTable rows={[
            ["Algorithm", "SHA-256 Proof-of-Work"],
            ["Consensus", "Proof-of-Work (Nakamoto Consensus)"],
            ["Max Supply", "21,000,000 BRICS"],
            ["Block Reward", "50 BRICS (initial)"],
            ["Halving Interval", "Every 210,000 blocks"],
            ["Target Block Time", "~600 seconds (10 minutes)"],
            ["Difficulty Adjustment", "Per-block sliding window (5 blocks)"],
            ["Transaction Fee", "0.000005 BRICS (burned)"],
            ["Fee Model", "Deflationary (all fees permanently destroyed)"],
            ["Signature Algorithm", "ECDSA secp256k1 + ML-DSA-65 (hybrid)"],
            ["Address Format (Legacy)", "BRICS + 40 hex chars (45 total)"],
            ["Address Format (PQC)", "BRICSPQ + 38 hex chars (45 total)"],
            ["Mining Protocol", "Stratum v1 (port 3333)"],
            ["Mining Pools", "SOLO + PPLNS (dual-server architecture)"],
            ["License", "MIT"],
          ]} />

          {/* 3. ARCHITECTURE */}
          <SectionHeading id="architecture" level={2}>3. Blockchain Architecture</SectionHeading>

          <SectionHeading id="arch-block" level={3}>3.1 Block Structure</SectionHeading>
          <p>Each block in the BricsCoin chain contains:</p>
          <SpecTable rows={[
            ["Index", "Sequential block number starting from genesis (0)"],
            ["Timestamp", "UTC block creation time (ISO 8601)"],
            ["Transactions", "Ordered list of validated transactions"],
            ["Previous Hash", "SHA-256 hash of the preceding block"],
            ["Nonce", "Proof-of-Work solution value"],
            ["Difficulty", "Mining difficulty target at time of creation"],
            ["Miner Address", "BRICS/BRICSPQ address receiving block reward"],
            ["PQC Signature", "Hybrid ECDSA + ML-DSA-65 block signature"],
            ["Hash", "SHA-256 hash of the complete block header"],
          ]} />

          <SectionHeading id="arch-tx" level={3}>3.2 Transaction Structure</SectionHeading>
          <p>BricsCoin supports two transaction structures. All user-to-user transactions are <strong>private by default</strong>:</p>
          
          <InfoCard icon={Lock} title="Private Transaction (Mandatory for all transfers)">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Sender</strong>: Always <code>"RING_HIDDEN"</code> &mdash; real sender is never stored on-chain</li>
              <li><strong>Recipient</strong>: One-time stealth address (<code>BRICSX...</code>)</li>
              <li><strong>Amount</strong>: NOT stored &mdash; only cryptographic commitment + encrypted_amount</li>
              <li><strong>Ring Signature (LSAG)</strong>: c0, s-values, key_image, tx_nonce, public_keys ring (32-64 members)</li>
              <li><strong>Stealth Address</strong>: ephemeral_pubkey for recipient discovery</li>
              <li><strong>zk-STARK Proof</strong>: proof_hash + stark_verified flag</li>
              <li><strong>Fee</strong>: 0.000005 BRICS (public, burned)</li>
              <li><strong>Timestamp</strong>: UTC creation time (ISO 8601)</li>
            </ul>
          </InfoCard>

          <InfoCard icon={Blocks} title="System Transactions (coinbase, chat, NFT, timecapsule)">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Sender/Recipient</strong>: BRICS or BRICSPQ addresses</li>
              <li><strong>Amount</strong>: Transfer amount (max 8 decimal places)</li>
              <li><strong>Signature</strong>: ECDSA digital signature (signed client-side)</li>
              <li><strong>Type</strong>: mining_reward, burn, chat, nft, timecapsule</li>
            </ul>
          </InfoCard>

          <SectionHeading id="arch-network" level={3}>3.3 Network Architecture</SectionHeading>
          <InfoCard icon={Globe} title="Dual-Server Architecture">
            <p>BricsCoin operates on a dual-server architecture for maximum reliability:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Main Server</strong>: FastAPI backend (Python), React frontend, SOLO stratum, MongoDB database</li>
              <li><strong>PPLNS Server</strong>: Dedicated Stratum server for the PPLNS mining pool with independent share tracking</li>
            </ul>
            <p className="mt-2">Communication between servers uses authenticated HTTP API calls for block propagation, share submission, and network synchronization.</p>
          </InfoCard>

          {/* 4. PQC */}
          <SectionHeading id="pqc" level={2}>4. Post-Quantum Cryptography</SectionHeading>

          <SectionHeading id="pqc-hybrid" level={3}>4.1 The Hybrid Approach</SectionHeading>
          <p>BricsCoin implements a <strong>hybrid signature scheme</strong> combining two algorithms:</p>
          <div className="grid sm:grid-cols-2 gap-4 my-4">
            <InfoCard icon={Lock} title="ECDSA (secp256k1)">
              The classical algorithm used by Bitcoin and Ethereum. Provides proven, battle-tested security against classical computers. Serves as the backward-compatible fallback layer.
            </InfoCard>
            <InfoCard icon={Shield} title="ML-DSA-65 (FIPS 204)">
              The NIST-standardized post-quantum digital signature algorithm (formerly CRYSTALS-Dilithium). Provides security against both classical and quantum computing attacks using module-lattice cryptography.
            </InfoCard>
          </div>
          <p>This dual approach ensures <strong>defense in depth</strong>: even if one algorithm is compromised, the other provides a complete security layer. Legacy wallets continue to function while PQC wallets offer quantum resistance.</p>

          <SectionHeading id="pqc-signing" level={3}>4.2 Client-Side Signing</SectionHeading>
          <p>
            A critical architectural decision in BricsCoin is that <strong>all cryptographic signing occurs in the user's browser</strong>. Private keys are generated locally using the <code>@noble/post-quantum</code> library, transactions are signed client-side before submission, and private keys are <strong>never transmitted to any server</strong>. The server only verifies pre-signed transactions. This eliminates the most common attack vector in cryptocurrency platforms: server-side key compromise.
          </p>

          <SectionHeading id="pqc-addresses" level={3}>4.3 PQC Wallet Addresses</SectionHeading>
          <SpecTable rows={[
            ["Legacy Format", "BRICS + SHA256(pub_key)[:40] = 45 chars"],
            ["PQC Format", "BRICSPQ + SHA256(pub_key)[:38] = 45 chars"],
            ["Migration", "Zero-cost migration from legacy to PQC"],
            ["Key Generation", "Client-side via @noble/post-quantum"],
          ]} />

          <SectionHeading id="pqc-blocks" level={3}>4.4 Block Signing</SectionHeading>
          <p>
            Starting with v2.0, each node maintains its own PQC key pair. When a node mines a new block, it signs the block header with both its ECDSA and ML-DSA-65 private keys, providing verifiable attribution, integrity, and quantum-resistant authenticity for all blocks on the chain.
          </p>

          {/* 5. MINING */}
          <SectionHeading id="mining" level={2}>5. Mining & Consensus</SectionHeading>

          <SectionHeading id="mining-pow" level={3}>5.1 SHA-256 Proof-of-Work</SectionHeading>
          <p>
            BricsCoin uses the same SHA-256 hashing algorithm as Bitcoin, ensuring full compatibility with the massive installed base of ASIC mining hardware. Miners connect via the standard <strong>Stratum v1 protocol</strong> on port 3333, making it compatible with all major mining software (CGMiner, BFGMiner, NerdMiner, etc.).
          </p>

          <SectionHeading id="mining-pools" level={3}>5.2 Mining Pools</SectionHeading>
          <p>BricsCoin supports two mining pool modes:</p>
          <div className="grid sm:grid-cols-2 gap-4 my-4">
            <InfoCard icon={Pickaxe} title="SOLO Pool">
              The finder of the block receives the full 50 BRICS reward. Ideal for high-hashrate miners. Integrated directly into the main server's Stratum endpoint.
            </InfoCard>
            <InfoCard icon={Pickaxe} title="PPLNS Pool">
              Pay Per Last N Shares &mdash; rewards are distributed proportionally among all miners who contributed shares in the window preceding the block. Ideal for smaller miners who want consistent payouts. Runs on a dedicated server.
            </InfoCard>
          </div>

          <SectionHeading id="mining-difficulty" level={3}>5.3 Automatic Difficulty Adjustment</SectionHeading>
          <p>
            BricsCoin implements a fully automatic, <strong>per-block difficulty adjustment algorithm</strong> targeting a block time of <strong>600 seconds</strong> (10 minutes). The algorithm:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
            <li>Uses a <strong>sliding window of the last 20 blocks</strong> for stability</li>
            <li>Estimates network hashrate from total work done divided by elapsed time</li>
            <li>Calculates new difficulty as: <code className="bg-white/5 px-1 rounded">new_diff = hashrate_estimate * 600</code></li>
            <li>Applies a <strong>safety clamp</strong> (max 1.25x increase or 0.75x decrease) to prevent oscillations</li>
            <li><strong>Anti-spike detection:</strong> if short-term hashrate exceeds 3x the long-term average, the adjustment is dampened to prevent post-attack difficulty crash</li>
            <li><strong>Coinbase maturity:</strong> mining rewards locked for {150} block confirmations (50% higher than Bitcoin&apos;s 100)</li>
            <li>Recalculates on <strong>every single block</strong> for maximum responsiveness to hashrate changes</li>
          </ul>
          <p className="mt-3">
            This design ensures the chain remains stable and responsive even with significant hashrate fluctuations, automatically lowering difficulty when miners leave and increasing it when new miners join.
          </p>

          {/* 6. TOKENOMICS */}
          <SectionHeading id="tokenomics" level={2}>6. Tokenomics</SectionHeading>

          <SectionHeading id="token-supply" level={3}>6.1 Supply</SectionHeading>
          <SpecTable rows={[
            ["Maximum Supply", "21,000,000 BRICS (hard cap)"],
            ["Block Reward", "50 BRICS (halves every 210,000 blocks)"],
            ["Premine", "None — 100% Fair Launch"],
            ["Distribution", "All 21,000,000 BRICS are exclusively mineable"],
          ]} />

          <SectionHeading id="token-fees" level={3}>6.2 Deflationary Fee Model</SectionHeading>
          <p>
            Transaction fees of <strong>0.000005 BRICS</strong> are <strong>permanently burned</strong> (destroyed), creating ongoing deflationary pressure on the supply. This mechanism reduces circulating supply with every transaction, provides anti-spam protection, and aligns incentives for long-term holders. All on-chain features (BricsChat, Time Capsule, BricsNFT) use the same burn fee.
          </p>

          <SectionHeading id="token-halving" level={3}>6.3 Halving Schedule</SectionHeading>
          <SpecTable rows={[
            ["Genesis", "Block 0 — 50 BRICS reward"],
            ["1st Halving", "Block 210,000 — 25 BRICS"],
            ["2nd Halving", "Block 420,000 — 12.5 BRICS"],
            ["3rd Halving", "Block 630,000 — 6.25 BRICS"],
            ["4th Halving", "Block 840,000 — 3.125 BRICS"],
            ["Final Coin", "~Year 2150 (estimated)"],
          ]} />

          <SectionHeading id="token-jabos" level={3}>6.4 Jabos (JBS) &mdash; The Sub-unit of BricsCoin</SectionHeading>
          <p>
            Just as Bitcoin has the <strong>Satoshi</strong> (its smallest indivisible unit), BricsCoin has the <strong>Jabos (JBS)</strong>,
            named after <strong>Jabo86</strong>, the creator of BricsCoin.
          </p>
          <SpecTable rows={[
            ["Name", "Jabos (JBS)"],
            ["Ratio", "1 BRICS = 100,000,000 JBS"],
            ["Smallest Unit", "1 JBS = 0.00000001 BRICS"],
            ["Named After", "Jabo86, the creator of BricsCoin"],
            ["Purpose", "Human-readable micro-transactions and fee display"],
          ]} />
          <p className="mt-3">
            Jabos is a <strong>display-level convention</strong>, not a separate token. The blockchain internally processes values with 8 decimal places,
            and 1 JBS corresponds to the smallest possible fraction. This makes it intuitive to express small amounts:
            instead of writing <code className="bg-white/5 px-1 rounded">0.00003500 BRICS</code>, users can say <code className="bg-white/5 px-1 rounded">3,500 JBS</code>.
          </p>
          <p className="mt-2">
            Both the desktop wallet and the mobile wallet support JBS display through a currency selector, alongside real-time crypto pair conversions (USDT, BTC, ETH, etc.) via a backend price proxy.
          </p>

          {/* 7. ON-CHAIN APPS */}
          <SectionHeading id="applications" level={2}>7. On-Chain Applications</SectionHeading>
          <p>BricsCoin hosts a suite of on-chain applications that leverage PQC signatures and the deflationary burn-fee mechanism.</p>

          <InfoCard icon={MessageSquare} title="7.1 BricsChat — Quantum-Proof On-Chain Messaging">
            <p>
              BricsChat is the <strong>world's first PQC-encrypted on-chain messaging system</strong>. Each message is signed with the sender's hybrid ECDSA + ML-DSA-65 keys, stored immutably on the blockchain, publicly visible in the Global Feed, and accompanied by a 0.000005 BRICS burn fee.
            </p>
            <p className="mt-2"><strong>Use cases:</strong> Immutable declarations, public statements, provable communication timestamps, community governance.</p>
          </InfoCard>

          <InfoCard icon={Clock} title="7.2 Decentralized Time Capsule">
            <p>
              The Time Capsule feature allows users to store encrypted data on-chain that becomes accessible only at a specific future block height. Data is locked until the target block is mined, each capsule creation burns 0.000005 BRICS, and content is immutable once locked.
            </p>
            <p className="mt-2"><strong>Use cases:</strong> Timed announcements, future predictions, proof-of-knowledge, community events.</p>
          </InfoCard>

          <InfoCard icon={Award} title="7.3 BricsNFT — PQC-Signed On-Chain Certificates">
            <p>
              BricsNFT is the <strong>world's first NFT system with post-quantum cryptographic signatures</strong>. It allows minting of immutable certificates (Diplomas, Property Deeds, Authenticity Certificates, Professional Licenses, Memberships, Awards, Software Licenses, and Custom types) signed with ECDSA + ML-DSA-65.
            </p>
            <p className="mt-2">The blockchain records <strong>who</strong> signed <strong>what</strong> and <strong>when</strong> &mdash; immutably. Features include a public gallery, certificate transfers, on-chain verification, and transfer history tracking.</p>
          </InfoCard>

          <InfoCard icon={Brain} title="7.4 AI Blockchain Oracle (GPT-5.2)">
            <p>
              The AI Oracle is powered by <strong>GPT-5.2</strong> and provides real-time network intelligence: health scores, mining analysis, security assessments, difficulty trend predictions, hashrate forecasts, halving impact analysis, and a conversational AI that answers questions about BricsCoin using live network data.
            </p>
          </InfoCard>

          {/* 8. SECURITY */}
          <SectionHeading id="security" level={2}>8. Security</SectionHeading>

          <SectionHeading id="sec-audit" level={3}>8.1 Live Security Audit</SectionHeading>
          <p>
            BricsCoin includes a built-in security audit system that runs <strong>27 real-time tests</strong> covering input validation (8 tests), classical cryptography (5 tests), post-quantum cryptography (6 tests), and attack prevention (8 tests). The audit can be executed at any time via <code className="bg-white/5 px-1 rounded">GET /api/security/audit</code>.
          </p>

          <SectionHeading id="sec-mitigations" level={3}>8.2 Attack Mitigations</SectionHeading>
          <SpecTable rows={[
            ["Replay Attack", "Signature uniqueness + timestamp validation"],
            ["51% Attack", "SHA-256 PoW (same security model as Bitcoin) + merge mining with BTC"],
            ["Sybil Attack", "PoW handshake (16-bit) + per-ASN limits (max 3) + 50 peer slots"],
            ["DDoS", "Rate limiting (500 req/min default) + burst detection + IP blacklisting"],
            ["Quantum Attack", "ML-DSA-65 hybrid signatures (NIST FIPS 204)"],
            ["Key Theft", "Client-side signing (keys never leave the device)"],
            ["Double Spend", "Key image tracking per private TX + confirmation depth"],
            ["Chain Analysis", "LSAG Ring Signatures (32-64 decoys) — sender NOT stored on-chain"],
            ["Amount Tracing", "zk-STARK proofs — plaintext amount NEVER stored on-chain"],
            ["Recipient Linking", "Stealth addresses (DHKE) — one-time addresses per payment"],
            ["Timing Analysis", "Dandelion++ with propagation jitter (100-2000ms) + dummy traffic"],
            ["Block Reorg", "Coinbase maturity (150 blocks) + checkpoint depth (100 blocks)"],
            ["Hashrate Spike", "Adaptive difficulty with anti-spike dampening (detects 3x surges)"],
          ]} />

          <SectionHeading id="sec-infra" level={3}>8.3 Infrastructure Security</SectionHeading>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
            <li><strong>Cloudflare</strong> reverse proxy with DDoS protection and SSL termination</li>
            <li><strong>Docker</strong> containerized deployment with isolated services</li>
            <li><strong>Rate limiting</strong> on all public endpoints (exempt for inter-node communication)</li>
            <li><strong>CORS</strong> and security headers properly configured</li>
            <li><strong>MongoDB</strong> with authentication and network isolation</li>
          </ul>

          <SectionHeading id="sec-dandelion" level={3}>8.4 Dandelion++ Transaction Privacy</SectionHeading>
          <p>
            BricsCoin implements the <strong>Dandelion++ protocol</strong> (Fanti et al., 2018) to mitigate network-level transaction origin analysis. 
            When a transaction is created, instead of being broadcast immediately to all peers, it enters a <em>stem phase</em> where it is 
            forwarded to a single randomly selected relay peer. After a probabilistic number of hops (1-N), the transaction transitions to the 
            <em>diffusion phase</em> and is broadcast normally. This significantly raises the cost for network observers attempting to correlate 
            transactions with originating nodes.
          </p>
          <SpecTable rows={[
            ["Protocol", "Dandelion++ (arxiv.org/abs/1805.11060)"],
            ["Stem Routing Rate", "~90% of transactions enter stem phase"],
            ["Epoch Rotation", "Stem relay peer rotated every 10 minutes"],
            ["Propagation Jitter", "100-2000ms random delay per hop, randomized batch accumulation (2-5 TXs)"],
            ["Dummy Traffic", "Decoy transactions generated every 15-60s, indistinguishable from real traffic"],
            ["Failsafe", "Embargo timeout: stuck transactions auto-diffuse after 30s"],
            ["Tor Integration", "Hidden Service (.onion) for additional network-layer privacy"],
          ]} />

          <SectionHeading id="sec-lightclient" level={3}>8.5 Light Client & Pruning</SectionHeading>
          <p>
            To address the increased storage requirements from PQC signatures (~19x larger than ECDSA), BricsCoin provides a <strong>Light Client API</strong> for 
            SPV-style verification and a <strong>block pruning system</strong> that removes full transaction data from old blocks while preserving headers and PQC signatures.
          </p>
          <SpecTable rows={[
            ["Light Headers API", "Block headers without transaction data for SPV clients"],
            ["Verified Balance", "Balance queries with chain height proof"],
            ["TX Inclusion Proof", "Verify transaction existence with block header"],
            ["Block Pruning", "Remove old TX data, keep headers + PQC signatures"],
            ["Estimated Savings", "40-60% for blocks with large transaction lists"],
          ]} />

          <SectionHeading id="sec-privacymodes" level={3}>8.6 Mandatory Privacy (Consensus-Enforced)</SectionHeading>
          <p>
            All user-to-user transactions on BricsCoin are <strong>fully private by default and by protocol</strong>. The transparent transaction endpoint 
            has been permanently disabled (returns HTTP 410 Gone). Privacy is not optional &mdash; it is enforced at the consensus level.
          </p>
          <SpecTable rows={[
            ["Sender Privacy", "LSAG Ring Signatures with 32-64 decoys. Sender stored as 'RING_HIDDEN'. Per-TX nonce (I = x*Hp(P||nonce)) ensures unique key images."],
            ["Receiver Privacy", "Diffie-Hellman Stealth Addresses (BRICSX...). One-time address per payment. Only recipient with scan key can identify incoming payments."],
            ["Amount Privacy", "zk-STARK commitment + encrypted_amount. No plaintext amount exists in the transaction document. Only the sender and recipient can decrypt."],
            ["Consensus Enforcement", "Nodes reject blocks containing private TXs with: missing ring_signature, ring_size < 32, missing ephemeral_pubkey, missing proof_hash, or invalid ring signature verification."],
            ["Double-Spend", "Key image recorded per TX. Duplicate key images rejected at both TX submission and block validation."],
            ["Balance Ledger", "Private balance operations stored in separate, unlinkable debit/credit records. Not synced to peers. No cross-reference between sender and receiver."],
          ]} />
          <p className="mt-2">
            <strong>On-chain view of a private transaction:</strong> <code className="bg-white/5 px-1 rounded">sender: "RING_HIDDEN"</code>, <code className="bg-white/5 px-1 rounded">recipient: "BRICSXa4f..."</code>, <code className="bg-white/5 px-1 rounded">display_amount: "SHIELDED"</code>. 
            No plaintext sender address, no plaintext amount, no linkable metadata.
          </p>

          <SectionHeading id="sec-threatmodel" level={3}>8.7 Threat Model</SectionHeading>
          <p>
            BricsCoin publishes a comprehensive, versioned <strong>Threat Model</strong> (available at <code className="bg-white/5 px-1 rounded">/threat-model</code>) 
            that transparently documents: what the protocol protects against, what it does not, and the assumptions underlying each defense. 
            The model follows the STRIDE framework adapted for blockchain systems and covers cryptographic attacks (including quantum), 
            chain analysis, network-level threats, and consensus attacks.
          </p>

          <SectionHeading id="sec-protocolstatus" level={3}>8.8 Protocol Status & Freeze Checklist</SectionHeading>
          <p>
            The <strong>Protocol Status</strong> page (available at <code className="bg-white/5 px-1 rounded">/protocol-status</code>) tracks the stability
            of every protocol component across three layers: Core Protocol, Security & Privacy, and Network & Scalability.
            It defines the criteria that must be met before the protocol is considered frozen for production use, including
            load testing benchmarks, documentation currency, and zero critical bugs in the backlog.
          </p>

          {/* 9. ROADMAP */}
          <SectionHeading id="roadmap" level={2}>9. Roadmap</SectionHeading>

          <SectionHeading id="road-done" level={3}>9.1 Completed</SectionHeading>
          
          <p className="text-xs uppercase tracking-widest text-primary/60 font-bold mt-4 mb-2">Core Protocol</p>
          <div className="space-y-2 my-2">
            {[
              "SHA-256 PoW blockchain with automatic per-block difficulty adjustment",
              "ECDSA wallets, transactions, and client-side signing",
              "Post-Quantum Cryptography (ML-DSA-65) hybrid signatures on every block",
              "PQC wallets with zero-cost migration from legacy",
              "Deflationary burn-fee mechanism",
              "SOLO + PPLNS dual mining pools with Stratum v1 protocol",
              "Merge Mining (AuxPoW) with Bitcoin hashrate",
              "Miner reward routing to PQC addresses",
              "Jabos (JBS): sub-unit of BricsCoin (1 BRICS = 100M JBS)",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          <p className="text-xs uppercase tracking-widest text-emerald-400/60 font-bold mt-6 mb-2">Security & Privacy</p>
          <div className="space-y-2 my-2">
            {[
              "zk-STARK zero-knowledge proofs for shielded transactions",
              "Total Privacy Suite: zk-STARK + LSAG Ring Signatures (mandatory min 32, dynamic up to 64) + Stealth Addresses + Dummy Traffic + Propagation Jitter",
              "Privacy Mode selection: Safe / Strong Privacy / Maximum Privacy",
              "Dandelion++ protocol for network-level transaction privacy (Fanti et al., 2018)",
              "Tor Hidden Service (.onion) for network-layer privacy",
              "Privacy Score: per-wallet metric aggregating PQC, shielded TX, and privacy suite usage",
              "Published Threat Model (STRIDE framework, versioned, 12 threats analyzed)",
              "API rate limiting, DDoS protection, and IP-based blocking",
              "Light Client API with SPV-style block header verification",
              "Block pruning system for PQC signature storage optimization",
              "Live security audit (27/27 automated tests)",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          <p className="text-xs uppercase tracking-widest text-violet-400/60 font-bold mt-6 mb-2">Ecosystem</p>
          <div className="space-y-2 my-2">
            {[
              "Web interface: Dashboard, Block Explorer, Wallet, Mining",
              "BricsChat: on-chain PQC-encrypted messaging",
              "Decentralized Time Capsule",
              "BricsNFT: PQC-signed on-chain certificates",
              "AI Blockchain Oracle (off-chain advisory, does not influence consensus)",
              "NFT Premine Renunciation certificate on-chain",
              "Mobile Wallet PWA with multi-currency price ticker",
              "BRICS/JBS toggle in send form with auto-conversion",
              "Exchange Listing application page",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          <SectionHeading id="road-future" level={3}>9.2 Future Development</SectionHeading>
          <div className="space-y-2 my-4">
            {[
              "PQC Smart Contracts (escrow, multisig, time-lock, token creation) — first blockchain with quantum-resistant contract signing",
              "Verifiable AI Oracle with on-chain zk-proofs — off-chain advisory responses signed with PQC and proof hash recorded on-chain",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">&#9679;</span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          {/* 10. CONCLUSION */}
          <SectionHeading id="conclusion" level={2}>10. Conclusion</SectionHeading>
          <p>
            BricsCoin combines the proven security of SHA-256 Proof-of-Work with forward-looking post-quantum cryptographic protection. By implementing ML-DSA-65 alongside ECDSA in a hybrid scheme, BricsCoin is positioned to remain secure even as quantum computing technology advances.
          </p>
          <p className="mt-3">
            Beyond a simple payment network, BricsCoin offers a complete ecosystem of on-chain applications &mdash; from quantum-proof messaging to PQC-signed certificates &mdash; all contributing to a deflationary token economy through burn fees.
          </p>
          <p className="mt-3">
            The commitment to client-side signing, open-source development, and community-driven governance ensures that BricsCoin remains transparent, accessible, and trustworthy for the post-quantum era.
          </p>

          {/* REFERENCES */}
          <SectionHeading id="references" level={2}>References</SectionHeading>
          <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground my-4">
            <li>NIST FIPS 204: Module-Lattice-Based Digital Signature Standard (ML-DSA). National Institute of Standards and Technology, 2024.</li>
            <li>Nakamoto, S. &ldquo;Bitcoin: A Peer-to-Peer Electronic Cash System.&rdquo; 2008.</li>
            <li>Ducas, L. et al. &ldquo;CRYSTALS-Dilithium: A Lattice-Based Digital Signature Scheme.&rdquo; IACR, 2018.</li>
            <li>SEC 2: Recommended Elliptic Curve Domain Parameters (secp256k1). Certicom Research, 2010.</li>
            <li>Grover, L. K. &ldquo;A fast quantum mechanical algorithm for database search.&rdquo; STOC, 1996.</li>
            <li>Shor, P. W. &ldquo;Algorithms for quantum computation: discrete logarithms and factoring.&rdquo; FOCS, 1994.</li>
            <li>Fanti, G. et al. &ldquo;Dandelion++: Lightweight Cryptocurrency Networking with Formal Anonymity Guarantees.&rdquo; ACM SIGMETRICS, 2018. <a href="https://arxiv.org/abs/1805.11060" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">arxiv.org/abs/1805.11060</a></li>
            <li>Ben-Sasson, E. et al. &ldquo;Scalable, transparent, and post-quantum secure computational integrity.&rdquo; (zk-STARKs), 2018.</li>
            <li>Noether, S. et al. &ldquo;Ring Confidential Transactions.&rdquo; Ledger, 2016.</li>
          </ol>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-white/10 text-sm text-muted-foreground space-y-2">
            <div className="flex flex-wrap gap-4">
              <a href="https://bricscoin26.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> bricscoin26.org
              </a>
              <a href="https://codeberg.org/Bricscoin_26/Bricscoin" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> Source Code (Codeberg)
              </a>
            </div>
            <p>License: MIT &mdash; BricsCoin is free and open-source software.</p>
          </div>
        </article>
      </div>

      {/* Back to top */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors z-50"
        data-testid="scroll-to-top"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </div>
  );
}
