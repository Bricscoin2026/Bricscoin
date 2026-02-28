import { motion } from "framer-motion";
import { FileText, Shield, Lock, Fingerprint, Eye, Atom, Layers, Cpu, Network, Binary, ChevronRight } from "lucide-react";

function Section({ id, title, icon: Icon, children, color = "#8B5CF6" }) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/[0.06]">
        <Icon size={16} style={{ color }} />
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Formula({ label, children }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 my-3 font-mono text-xs">
      {label && <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>}
      <div className="text-violet-300">{children}</div>
    </div>
  );
}

function Param({ name, children }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-white/[0.03] last:border-0 text-xs">
      <span className="font-mono text-amber-400 min-w-[180px] shrink-0">{name}</span>
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

const TOC = [
  { id: "abstract", label: "0. Abstract" },
  { id: "pqc", label: "1. Post-Quantum Cryptography" },
  { id: "ring", label: "2. Ring Signatures (LSAG)" },
  { id: "stealth", label: "3. Stealth Addresses (DHKE)" },
  { id: "stark", label: "4. zk-STARK Amount Hiding" },
  { id: "consensus", label: "5. Privacy Consensus Rules" },
  { id: "viewkey", label: "6. View-Key Protocol" },
  { id: "economic", label: "7. Economic Security" },
  { id: "network", label: "8. Network Obfuscation" },
  { id: "params", label: "9. Protocol Parameters" },
];

export default function YellowPaper() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-10 pb-6 border-b border-white/[0.06]">
          <div className="text-[10px] uppercase tracking-[0.3em] text-violet-400 mb-2">Formal Protocol Specification</div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">BricsCoin <span className="text-amber-400">Yellow Paper</span></h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Complete cryptographic specification of the BricsCoin privacy and security protocol.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-muted-foreground">
            <span className="bg-white/5 px-3 py-1 rounded-full">v1.0 — February 2026</span>
            <span className="bg-white/5 px-3 py-1 rounded-full">Author: Jabo86</span>
          </div>
        </div>

        <div className="flex gap-8">
          {/* TOC Sidebar */}
          <nav className="hidden lg:block w-56 shrink-0 sticky top-20 self-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Contents</div>
            {TOC.map(t => (
              <a key={t.id} href={`#${t.id}`} className="flex items-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-violet-400 transition-colors">
                <ChevronRight size={10} />
                {t.label}
              </a>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <Section id="abstract" title="0. Abstract" icon={FileText}>
              <p>
                BricsCoin is a SHA-256 Proof-of-Work cryptocurrency with mandatory privacy and post-quantum security.
                This document specifies the cryptographic protocols that enforce sender privacy (LSAG Ring Signatures),
                receiver privacy (Diffie-Hellman Stealth Addresses), and amount privacy (zk-STARK proofs), along with
                the consensus rules that validate these proofs at the block level.
              </p>
              <p>
                <strong>Key property:</strong> No plaintext sender address or transaction amount is ever stored in the blockchain.
                Privacy is enforced at the consensus level — nodes reject blocks containing private transactions with missing or invalid proofs.
              </p>
            </Section>

            <Section id="pqc" title="1. Why ML-DSA-65 (Not Falcon)" icon={Atom} color="#F59E0B">
              <p>
                BricsCoin uses a <strong>hybrid ECDSA + ML-DSA-65 (Dilithium)</strong> signature scheme for block signing.
                ML-DSA-65 was chosen over Falcon-512 for the following reasons:
              </p>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 my-3 space-y-2">
                <div className="flex gap-2 text-xs">
                  <span className="text-amber-400 font-semibold min-w-[140px]">Standardization</span>
                  <span>ML-DSA-65 is NIST FIPS 204 (finalized Aug 2024). Falcon is still in draft as FIPS 206.</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-amber-400 font-semibold min-w-[140px]">Implementation</span>
                  <span>ML-DSA-65 uses algebraic lattices (Module-LWE). Falcon requires complex Gaussian sampling over NTRU lattices — higher risk of side-channel attacks and implementation errors.</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-amber-400 font-semibold min-w-[140px]">Signature Size</span>
                  <span>ML-DSA-65: ~3,293 bytes. Falcon-512: ~666 bytes. BricsCoin uses block pruning to manage storage, so the larger signature is acceptable for the security gain.</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-amber-400 font-semibold min-w-[140px]">Verification Speed</span>
                  <span>ML-DSA-65 verification is faster and constant-time. Falcon verification involves floating-point FFT which can be non-deterministic across platforms.</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-amber-400 font-semibold min-w-[140px]">Crypto Agility</span>
                  <span>Versioned key types allow soft-fork upgrade to Falcon or any future scheme without hard-fork.</span>
                </div>
              </div>
              <Formula label="Hybrid Signature Scheme">
                Block_Signature = ECDSA(sk_ecdsa, H(block)) || ML-DSA-65(sk_dilithium, H(block))
                <br />Verification: ECDSA_verify(pk_ecdsa, sig_ecdsa, H(block)) AND ML-DSA-65_verify(pk_dilithium, sig_dilithium, H(block))
              </Formula>
              <p>A block is valid only if <strong>both</strong> signatures verify. This ensures security against both classical and quantum adversaries.</p>
            </Section>

            <Section id="ring" title="2. LSAG Ring Signatures" icon={Fingerprint} color="#8B5CF6">
              <p>
                BricsCoin hides the transaction sender using <strong>Linkable Spontaneous Anonymous Group (LSAG)</strong> signatures
                on the secp256k1 curve. The sender is hidden among a ring of 32-64 decoy public keys.
              </p>
              <Formula label="Key Image (per-TX unique)">
                I = x * H_p(P || nonce)
                <br />where x = private key, P = public key, nonce = random 256-bit per-TX value
                <br />H_p = hash-to-point on secp256k1 (SHA-256 based)
              </Formula>
              <p>
                <strong>Per-TX nonce:</strong> BricsCoin uses an account model (not UTXO). The nonce ensures each transaction produces a unique key image,
                allowing multiple transactions from the same account. Without the nonce, the key image would be deterministic and the same sender
                could only ever create one transaction.
              </p>
              <Formula label="Ring Signature Construction">
                For ring R = {"{"} P_0, P_1, ..., P_(n-1) {"}"} with signer at index pi:
                <br />1. Generate alpha = random scalar
                <br />2. L_pi = alpha * G,  R_pi = alpha * H_p(P_pi || nonce)
                <br />3. c_(pi+1) = H(m, L_pi, R_pi, I)
                <br />4. For each i != pi: s_i = random, L_i = s_i*G + c_i*P_i, R_i = s_i*H_p(P_i||nonce) + c_i*I
                <br />5. Close ring: s_pi = alpha - c_pi * x (mod n)
                <br />Output: (c_0, s_0...s_(n-1), I, nonce)
              </Formula>
              <Formula label="Verification">
                For i = 0 to n-1:
                <br />  L_i = s_i * G + c_i * P_i
                <br />  R_i = s_i * H_p(P_i || nonce) + c_i * I
                <br />  c_(i+1) = H(m, L_i, R_i, I)
                <br />Accept iff c_0 == c_n (ring closes)
              </Formula>
              <p><strong>Double-spend prevention:</strong> The key image I is stored on-chain. If the same I appears in two transactions, the second is rejected. Since I = x * H_p(P || nonce), and the nonce is random, the same (x, nonce) pair has negligible probability of recurrence.</p>
            </Section>

            <Section id="stealth" title="3. Stealth Addresses (DHKE)" icon={Eye} color="#06B6D4">
              <p>
                BricsCoin hides the transaction recipient using a <strong>Diffie-Hellman Key Exchange (DHKE) Stealth Address protocol</strong>.
                Each payment generates a one-time address that only the recipient can identify and spend from.
              </p>
              <Formula label="Protocol">
                Recipient publishes meta-address: (S = s*G, B = b*G)
                <br />where s = scan private key, b = spend private key
                <br /><br />Sender:
                <br />1. Generate ephemeral keypair: r, R = r*G
                <br />2. Shared secret: shared = r*S = r*s*G
                <br />3. One-time pubkey: P = H_s(shared)*G + B
                <br />4. Stealth address: BRICSX + SHA256(P)[:39]
                <br />5. Publish R alongside the transaction
                <br /><br />Recipient (scanning):
                <br />1. For each TX with ephemeral pubkey R:
                <br />2. Compute shared = s*R = s*r*G (same shared secret)
                <br />3. Derive P' = H_s(shared)*G + B
                <br />4. If BRICSX + SHA256(P')[:39] matches the TX recipient, it's ours
                <br /><br />Spending key: k = H_s(s*R) + b (mod ORDER)
              </Formula>
              <p><strong>Privacy guarantee:</strong> An external observer sees only the stealth address (BRICSX...) and the ephemeral pubkey R. Without the scan private key s, they cannot link the stealth address back to the recipient's meta-address.</p>
            </Section>

            <Section id="stark" title="4. zk-STARK Amount Hiding" icon={Lock} color="#10B981">
              <p>
                Transaction amounts are hidden using <strong>zk-STARK (Zero-Knowledge Scalable Transparent Arguments of Knowledge)</strong>.
                No plaintext amount is ever stored in the transaction document.
              </p>
              <Formula label="What is stored on-chain">
                commitment = SHA256(amount || blinding_factor)
                <br />encrypted_amount = AES-GCM(shared_secret, amount)
                <br />proof_hash = SHA256(STARK_proof)
                <br /><br />What is NOT stored: the plaintext amount
              </Formula>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 my-3 space-y-2">
                <div className="flex gap-2 text-xs">
                  <span className="text-emerald-400 font-semibold min-w-[140px]">Protocol</span>
                  <span>FRI (Fast Reed-Solomon Interactive Oracle Proof) with Fiat-Shamir heuristic</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-emerald-400 font-semibold min-w-[140px]">Security Level</span>
                  <span>128-bit computational security</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-emerald-400 font-semibold min-w-[140px]">Trusted Setup</span>
                  <span>None required (transparent setup)</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-emerald-400 font-semibold min-w-[140px]">Quantum Resistance</span>
                  <span>Based on hash functions (collision-resistant under quantum model)</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-emerald-400 font-semibold min-w-[140px]">Proof Size</span>
                  <span>~100-200 bytes (proof_hash stored, full proof verified at creation)</span>
                </div>
              </div>
              <p><strong>Why not Bulletproofs?</strong> Bulletproofs (used by Monero) rely on the discrete logarithm assumption, which is broken by quantum computers. zk-STARKs rely only on hash function collision resistance, making them quantum-resistant with no trusted setup.</p>
            </Section>

            <Section id="consensus" title="5. Privacy Consensus Rules" icon={Shield} color="#EF4444">
              <p>Privacy in BricsCoin is not optional — it is enforced at the consensus level. A block is rejected if it contains a private transaction violating any of these rules:</p>
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-4 my-3 space-y-2 text-xs">
                <div className="flex gap-2"><span className="text-red-400 font-mono min-w-[30px]">R1</span> <span>Private TX MUST contain <code className="text-amber-300">ring_signature</code> with valid structure (c0, s[], key_image, public_keys)</span></div>
                <div className="flex gap-2"><span className="text-red-400 font-mono min-w-[30px]">R2</span> <span><code className="text-amber-300">ring_size</code> MUST be &ge; 32 and &le; 64</span></div>
                <div className="flex gap-2"><span className="text-red-400 font-mono min-w-[30px]">R3</span> <span><code className="text-amber-300">key_image</code> MUST NOT already exist on-chain (double-spend rejection)</span></div>
                <div className="flex gap-2"><span className="text-red-400 font-mono min-w-[30px]">R4</span> <span>Private TX MUST contain <code className="text-amber-300">ephemeral_pubkey</code> (stealth address proof)</span></div>
                <div className="flex gap-2"><span className="text-red-400 font-mono min-w-[30px]">R5</span> <span>Private TX MUST contain <code className="text-amber-300">proof_hash</code> (zk-STARK amount proof)</span></div>
                <div className="flex gap-2"><span className="text-red-400 font-mono min-w-[30px]">R6</span> <span>If <code className="text-amber-300">ring_signature.message</code> is present, the LSAG ring MUST cryptographically verify</span></div>
                <div className="flex gap-2"><span className="text-red-400 font-mono min-w-[30px]">R7</span> <span>The transparent <code className="text-amber-300">/api/transaction</code> endpoint MUST return HTTP 410 Gone</span></div>
              </div>
              <p>These rules are enforced in both <code className="text-amber-300">validate_block()</code> (for blocks received from peers) and <code className="text-amber-300">submit_mined_block()</code> (before including transactions in a new block).</p>
            </Section>

            <Section id="viewkey" title="6. View-Key Protocol" icon={Eye} color="#06B6D4">
              <p>
                BricsCoin implements a <strong>View-Key (Audit Key)</strong> system that allows selective disclosure to third parties
                (exchanges, auditors, regulators) without compromising network-wide privacy.
              </p>
              <Formula label="View-Key Derivation">
                View-Key = Base64(scan_private_key || ":" || spend_public_key)
                <br /><br />Capabilities:
                <br />  - Scan blockchain for stealth payments using scan_private_key
                <br />  - Derive one-time addresses to identify incoming payments
                <br />  - Read encrypted amounts (via shared secret derivation)
                <br /><br />Restrictions:
                <br />  - CANNOT derive spending keys (requires spend_private_key)
                <br />  - CANNOT sign transactions
                <br />  - CANNOT see other wallets' transactions
              </Formula>
              <p><strong>Compliance model:</strong> "Private by default, compliant on-demand." A user shares their View-Key with an exchange. The exchange can verify deposits and withdrawals for that user without seeing any other wallet's activity.</p>
            </Section>

            <Section id="economic" title="7. Economic Security Parameters" icon={Layers} color="#F59E0B">
              <Param name="COINBASE_MATURITY">150 blocks. Mining rewards cannot be spent until 150 confirmations (50% more than Bitcoin's 100).</Param>
              <Param name="ADAPTIVE_DIFFICULTY">Dual-window Exponential Moving Average (EMA). Target: 600s block time. Anti-spike dampening detects 3x hashrate surges and limits difficulty adjustment to 4x per window.</Param>
              <Param name="ELASTIC_BLOCK_SIZE">Base: 100 TXs. Max growth: 2x median of last 100 blocks. Oversize penalty: quadratic reward reduction.</Param>
              <Param name="FEE_BURN">0.000005 BRICS per TX (deflationary). Fees are burned, not paid to miners.</Param>
              <Param name="MAX_SUPPLY">21,000,000 BRICS. Halving every 210,000 blocks.</Param>
              <Param name="CHECKPOINT_DEPTH">100 blocks. Chain reorganizations deeper than 100 blocks are rejected.</Param>
            </Section>

            <Section id="network" title="8. Network Obfuscation" icon={Network} color="#EC4899">
              <p>BricsCoin employs multiple layers of network-level privacy to prevent IP-based deanonymization:</p>
              <Param name="Dandelion++">90% of TXs enter stem phase (single-hop relay) before fluff (broadcast). Epoch rotation every 10 minutes.</Param>
              <Param name="Propagation Jitter">100-2000ms random delay per hop. Batch accumulation: 2-5 TXs before relay.</Param>
              <Param name="Dummy Traffic">Decoy transactions generated every 15-60s. Indistinguishable from real traffic.</Param>
              <Param name="Anti-Sybil PoW">16-bit proof-of-work required for each incoming peer connection. Max 3 peers per ASN. 50 peer slots.</Param>
              <Param name="Tor Integration">Hidden Service (.onion) for full network-layer anonymity.</Param>
            </Section>

            <Section id="params" title="9. Protocol Parameters Summary" icon={Cpu} color="#8B5CF6">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-0">
                <Param name="MIN_RING_SIZE">32 (2x Monero's 16)</Param>
                <Param name="MAX_RING_SIZE">64</Param>
                <Param name="DEFAULT_RING_SIZE">32</Param>
                <Param name="KEY_IMAGE_NONCE">256-bit random per TX</Param>
                <Param name="STEALTH_PREFIX">"BRICSX" (40 chars)</Param>
                <Param name="STEALTH_DOMAIN_TAG">b"BRICS_STEALTH_V1"</Param>
                <Param name="STARK_SECURITY">128-bit</Param>
                <Param name="STARK_PROTOCOL">FRI + Fiat-Shamir</Param>
                <Param name="PQC_SCHEME">ECDSA (secp256k1) + ML-DSA-65 (FIPS 204)</Param>
                <Param name="HASH_FUNCTION">SHA-256 (PoW, key derivation, commitments)</Param>
                <Param name="CURVE">secp256k1 (ring signatures, stealth addresses)</Param>
                <Param name="BLOCK_TIME_TARGET">600 seconds</Param>
                <Param name="COINBASE_MATURITY">150 blocks</Param>
                <Param name="BASE_BLOCK_SIZE">100 TXs</Param>
                <Param name="TX_FEE">0.000005 BRICS (burned)</Param>
              </div>
            </Section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
