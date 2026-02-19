#!/usr/bin/env python3
"""BricsCoin Professional Whitepaper PDF Generator"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, 
    TableStyle, PageBreak, Image, KeepTogether)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfgen import canvas
import os

# Colors
GOLD = HexColor('#C9A84C')
DARK = HexColor('#1A1A2E')
TEXT_DARK = HexColor('#2C2C2C')
TEXT_BODY = HexColor('#3A3A3A')
TEXT_LIGHT = HexColor('#6B6B6B')
ACCENT = HexColor('#C9A84C')
BG_LIGHT = HexColor('#FAFAFA')
BORDER = HexColor('#E5E5E5')
TABLE_HEADER = HexColor('#1A1A2E')
TABLE_ALT = HexColor('#F5F5F0')

W, H = A4

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []
    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()
    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)
    def draw_page_number(self, page_count):
        if self._pageNumber > 1:
            self.setFont("Helvetica", 8)
            self.setFillColor(TEXT_LIGHT)
            self.drawCentredString(W/2, 1.2*cm, f"{self._pageNumber}")
            self.setFont("Helvetica", 7)
            self.drawString(2*cm, 1.2*cm, "BricsCoin Whitepaper v3.0")
            self.drawRightString(W - 2*cm, 1.2*cm, "bricscoin26.org")

def make_table_style():
    return TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_BODY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, TABLE_ALT]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ])

def build_whitepaper():
    output_path = "/app/downloads/BricsCoin_Whitepaper_v3.pdf"
    doc = SimpleDocTemplate(output_path, pagesize=A4,
        rightMargin=2.2*cm, leftMargin=2.2*cm,
        topMargin=2.2*cm, bottomMargin=2.5*cm)

    # Styles
    title_main = ParagraphStyle('TitleMain', fontName='Helvetica-Bold',
        fontSize=36, textColor=DARK, alignment=TA_CENTER, spaceAfter=4, leading=42)
    
    title_sub = ParagraphStyle('TitleSub', fontName='Helvetica',
        fontSize=16, textColor=TEXT_LIGHT, alignment=TA_CENTER, spaceAfter=6, leading=22)
    
    title_ver = ParagraphStyle('TitleVer', fontName='Helvetica',
        fontSize=13, textColor=GOLD, alignment=TA_CENTER, spaceAfter=4)
    
    title_author = ParagraphStyle('TitleAuthor', fontName='Helvetica-Bold',
        fontSize=13, textColor=TEXT_DARK, alignment=TA_CENTER, spaceAfter=4)
    
    title_date = ParagraphStyle('TitleDate', fontName='Helvetica',
        fontSize=11, textColor=TEXT_LIGHT, alignment=TA_CENTER, spaceAfter=8)
    
    abstract_s = ParagraphStyle('Abstract', fontName='Helvetica',
        fontSize=10, textColor=TEXT_BODY, alignment=TA_JUSTIFY, leading=15,
        spaceAfter=8, leftIndent=1*cm, rightIndent=1*cm)
    
    h1 = ParagraphStyle('H1', fontName='Helvetica-Bold',
        fontSize=22, textColor=DARK, spaceBefore=20, spaceAfter=10, leading=26)
    
    h2 = ParagraphStyle('H2', fontName='Helvetica-Bold',
        fontSize=14, textColor=TEXT_DARK, spaceBefore=16, spaceAfter=8, leading=18)
    
    body = ParagraphStyle('Body', fontName='Helvetica',
        fontSize=10.5, textColor=TEXT_BODY, alignment=TA_JUSTIFY, spaceAfter=8, leading=15)
    
    code = ParagraphStyle('Code', fontName='Courier',
        fontSize=9, textColor=HexColor('#333333'), backColor=HexColor('#F5F5F0'),
        borderWidth=0.5, borderColor=BORDER, borderPadding=10,
        spaceAfter=12, leading=13)
    
    caption = ParagraphStyle('Caption', fontName='Helvetica-Oblique',
        fontSize=9, textColor=TEXT_LIGHT, alignment=TA_CENTER, spaceAfter=14)
    
    toc_s = ParagraphStyle('TOC', fontName='Helvetica',
        fontSize=11, textColor=TEXT_DARK, spaceAfter=7, leftIndent=15)
    
    bullet = ParagraphStyle('Bullet', fontName='Helvetica',
        fontSize=10.5, textColor=TEXT_BODY, alignment=TA_JUSTIFY, spaceAfter=5, 
        leading=15, leftIndent=15, bulletIndent=0)
    
    link_s = ParagraphStyle('Link', fontName='Helvetica',
        fontSize=10, textColor=TEXT_DARK, alignment=TA_CENTER, spaceAfter=4)

    story = []

    # ===================== COVER PAGE =====================
    story.append(Spacer(1, 2*cm))
    
    logo_path = "/app/downloads/bricscoin-logo-transparent.png"
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=5.5*cm, height=5.5*cm)
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 1.2*cm))
    
    story.append(Paragraph("BRICSCOIN", title_main))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("A Post-Quantum Secure Cryptocurrency", title_sub))
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="30%", thickness=1.5, color=GOLD, hAlign='CENTER'))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("Technical Whitepaper v3.0", title_ver))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("Jabo86", title_author))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("February 2026", title_date))
    story.append(Spacer(1, 1.5*cm))
    
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, hAlign='CENTER'))
    story.append(Spacer(1, 5*mm))
    
    story.append(Paragraph(
        "BricsCoin is a decentralized cryptocurrency built on SHA-256 Proof-of-Work consensus, "
        "featuring a hybrid post-quantum cryptographic signature scheme that combines classical "
        "ECDSA (secp256k1) with NIST-standardized ML-DSA-65 (FIPS 204). Both signatures are "
        "required at the consensus level for transaction validation, providing genuine quantum "
        "resistance. BricsCoin is designed for ASIC mining compatibility via the Stratum v1 "
        "protocol with BIP320 version rolling support.", abstract_s))
    
    story.append(PageBreak())

    # ===================== TABLE OF CONTENTS =====================
    story.append(Paragraph("Table of Contents", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 8*mm))
    
    for item in [
        "1. Introduction", "2. Protocol Architecture", "3. Consensus Mechanism",
        "4. Post-Quantum Cryptography", "5. Tokenomics", "6. Mining Protocol",
        "7. Transaction Model", "8. Network Architecture", "9. Wallet Ecosystem",
        "10. Security Analysis", "11. Conclusion"]:
        story.append(Paragraph(item, toc_s))
    
    story.append(PageBreak())

    # ===================== 1. INTRODUCTION =====================
    story.append(Paragraph("1. Introduction", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "The advent of large-scale quantum computers poses an existential threat to the "
        "cryptographic foundations of modern blockchain networks. Elliptic Curve Digital "
        "Signature Algorithm (ECDSA), the signature scheme used by Bitcoin and the vast "
        "majority of cryptocurrencies, is vulnerable to Shor's algorithm, which can "
        "efficiently solve the elliptic curve discrete logarithm problem on a sufficiently "
        "powerful quantum computer.", body))
    
    story.append(Paragraph(
        "BricsCoin addresses this threat proactively by implementing a hybrid signature "
        "scheme at the consensus level. Every transaction from a post-quantum (PQC) wallet "
        "requires two valid signatures: one from ECDSA (secp256k1) for backward compatibility "
        "and one from ML-DSA-65 (formerly Dilithium), a lattice-based digital signature "
        "algorithm standardized by NIST in FIPS 204. A transaction is rejected by the "
        "network if either signature fails verification.", body))
    
    story.append(Paragraph(
        "This is not a superficial or preparatory implementation. BricsCoin enforces hybrid "
        "signature verification at the consensus layer, making it one of the first operational "
        "blockchains to require post-quantum signatures for transaction validity.", body))

    story.append(Paragraph("1.1 Design Principles", h2))
    
    for title, desc in [
        ("Quantum Resistance", "Hybrid ECDSA + ML-DSA-65 signatures enforced at the consensus level. Both signatures must be valid for a transaction to be accepted by the network."),
        ("ASIC Compatibility", "SHA-256 Proof-of-Work enables mining with existing Bitcoin ASIC hardware (Bitaxe, Antminer) via Stratum v1 protocol with BIP320 version rolling."),
        ("Client-Side Security", "All private keys are generated and stored locally. Signing operations occur entirely in the user's browser or desktop wallet. Private keys never leave the device."),
        ("Bitcoin-Proven Economics", "Fixed supply of 21 million coins, halving every 210,000 blocks, and difficulty adjustment every 2,016 blocks mirror Bitcoin's time-tested economic model."),
    ]:
        story.append(Paragraph(f"<b>{title}.</b> {desc}", bullet))

    # ===================== 2. PROTOCOL ARCHITECTURE =====================
    story.append(PageBreak())
    story.append(Paragraph("2. Protocol Architecture", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "BricsCoin operates as a full-stack blockchain system comprising several "
        "interconnected components:", body))
    
    t = Table([
        ['Component', 'Technology', 'Purpose'],
        ['Consensus Engine', 'FastAPI (Python)', 'Block validation, transaction processing, chain management'],
        ['Mining Interface', 'Stratum v1 Server', 'ASIC miner communication, job distribution, share validation'],
        ['Database', 'MongoDB', 'Persistent storage for blocks, transactions, wallets, mining stats'],
        ['Web Frontend', 'React.js', 'Block explorer, wallet interface, mining dashboard, network stats'],
        ['Desktop Wallet', 'Electron', 'Cross-platform native wallet with full PQC signing capability'],
        ['PQC Module', 'ML-DSA-65 (FIPS 204)', 'Post-quantum signature generation and verification'],
    ], colWidths=[3.2*cm, 3.5*cm, 9.3*cm])
    t.setStyle(make_table_style())
    story.append(t)
    story.append(Paragraph("Table 1: System Architecture Components", caption))

    # ===================== 3. CONSENSUS MECHANISM =====================
    story.append(Paragraph("3. Consensus Mechanism", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("3.1 SHA-256 Proof-of-Work", h2))
    story.append(Paragraph(
        "BricsCoin uses SHA-256 double-hashing for its Proof-of-Work consensus, identical "
        "to Bitcoin's mining algorithm. This design choice enables compatibility with the "
        "extensive ecosystem of SHA-256 ASIC miners, including consumer-grade devices like "
        "the Bitaxe series and industrial miners such as the Antminer S19/S21.", body))
    
    story.append(Paragraph(
        "Block validity requires that the SHA-256 hash of the block header, when interpreted "
        "as a 256-bit integer, is less than or equal to the current target value:", body))
    
    story.append(Paragraph(
        "H(block_header) &le; target<br/><br/>"
        "where:  target = MAX_TARGET / difficulty<br/>"
        "        MAX_TARGET = 2^256 - 1", code))
    
    story.append(Paragraph("3.2 Difficulty Adjustment", h2))
    story.append(Paragraph(
        "The difficulty adjustment mechanism ensures a stable average block time of 10 "
        "minutes (600 seconds), regardless of changes in total network hashrate.", body))
    
    t2 = Table([
        ['Parameter', 'Value'],
        ['Target Block Time', '600 seconds (10 minutes)'],
        ['Adjustment Interval', 'Every 2,016 blocks (~14 days at target rate)'],
        ['Maximum Adjustment', '4x increase or 0.25x decrease per interval'],
        ['Initial Difficulty', '1,000,000'],
        ['Bootstrap Phase', 'Every 10 blocks for the first 2,016 blocks'],
    ], colWidths=[4.5*cm, 11.5*cm])
    t2.setStyle(make_table_style())
    story.append(t2)
    story.append(Paragraph("Table 2: Difficulty Adjustment Parameters", caption))
    
    story.append(Paragraph(
        "The adjustment formula:", body))
    story.append(Paragraph(
        "new_difficulty = current_difficulty x (expected_time / actual_time)<br/><br/>"
        "clamped to:  0.25 x current  &le;  new_difficulty  &le;  4 x current", code))

    # ===================== 4. POST-QUANTUM CRYPTOGRAPHY =====================
    story.append(PageBreak())
    story.append(Paragraph("4. Post-Quantum Cryptography", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "BricsCoin implements a <b>Level 1 (strong)</b> post-quantum security model. The "
        "hybrid signature scheme is enforced at the consensus level. Both classical and "
        "post-quantum signatures are mandatory for transaction validation.", body))
    
    story.append(Paragraph("4.1 Hybrid Signature Scheme", h2))
    story.append(Paragraph("Every PQC transaction carries two independent signatures:", body))
    
    t3 = Table([
        ['Algorithm', 'Standard', 'Key Size', 'Signature', 'Security'],
        ['ECDSA', 'secp256k1', '32 B (priv) / 64 B (pub)', '64 bytes', 'Classical 128-bit'],
        ['ML-DSA-65', 'FIPS 204', '4,032 B (priv) / 1,952 B (pub)', '3,309 bytes', 'NIST Level 3 (quantum)'],
    ], colWidths=[2.2*cm, 2*cm, 4.2*cm, 2.5*cm, 3.3*cm])
    t3.setStyle(make_table_style())
    story.append(t3)
    story.append(Paragraph("Table 3: Hybrid Signature Algorithms", caption))
    
    story.append(Paragraph("4.2 Consensus-Level Enforcement", h2))
    story.append(Paragraph("The verification function implements strict AND logic:", body))
    story.append(Paragraph("hybrid_valid = ecdsa_valid AND dilithium_valid", code))
    story.append(Paragraph(
        "If <b>either</b> signature fails, the transaction is rejected. There is no "
        "fallback to single-signature validation. Even if ECDSA is broken by a quantum "
        "computer, an attacker cannot forge a valid transaction without also forging the "
        "ML-DSA-65 signature, which remains computationally infeasible.", body))
    
    story.append(Paragraph("4.3 Address Derivation", h2))
    story.append(Paragraph(
        "PQC wallet addresses are derived from both public keys, cryptographically binding "
        "the address to both key pairs:", body))
    story.append(Paragraph(
        "combined_hash = SHA-256(ecdsa_public_key || dilithium_public_key)<br/>"
        "address = \"BRICSPQ\" + combined_hash[0:38]", code))
    story.append(Paragraph(
        "The \"BRICSPQ\" prefix distinguishes post-quantum addresses from legacy \"BRICS\" "
        "addresses, enabling appropriate signature verification rules.", body))
    
    story.append(Paragraph("4.4 Deterministic Key Generation", h2))
    story.append(Paragraph(
        "Both key pairs are generated deterministically from a single 12-word BIP39 "
        "mnemonic seed phrase:", body))
    story.append(Paragraph(
        "ecdsa_private_key  = seed[0:32]<br/>"
        "dilithium_seed     = SHA-256(seed[32:64] || 'dilithium-v1')<br/>"
        "dilithium_pk, sk   = ML_DSA_65.keygen_internal(dilithium_seed)", code))
    story.append(Paragraph(
        "This ensures complete wallet recovery from the seed phrase alone, including "
        "both ECDSA and ML-DSA-65 key pairs.", body))
    
    story.append(Paragraph("4.5 Client-Side Signing", h2))
    story.append(Paragraph(
        "All cryptographic operations occur locally on the user's device. In the web wallet, "
        "JavaScript implementations run in the browser. In the desktop wallet, operations run "
        "in the Electron/Node.js process. Private keys are never transmitted to any server. "
        "Only the resulting signatures and public keys are sent for verification.", body))

    # ===================== 5. TOKENOMICS =====================
    story.append(PageBreak())
    story.append(Paragraph("5. Tokenomics", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "BricsCoin follows Bitcoin's proven deflationary monetary policy:", body))
    
    t4 = Table([
        ['Parameter', 'Value'],
        ['Ticker Symbol', 'BRICS'],
        ['Maximum Supply', '21,000,000 BRICS'],
        ['Initial Block Reward', '50 BRICS'],
        ['Halving Interval', 'Every 210,000 blocks (~4 years)'],
        ['Transaction Fee', '0.000005 BRICS (fixed)'],
        ['Smallest Unit', '0.00000001 BRICS'],
        ['Target Block Time', '10 minutes'],
        ['Hashing Algorithm', 'SHA-256 (double-hash)'],
    ], colWidths=[4.5*cm, 11.5*cm])
    t4.setStyle(make_table_style())
    story.append(t4)
    story.append(Paragraph("Table 4: Tokenomics Parameters", caption))
    
    story.append(Paragraph("5.1 Emission Schedule", h2))
    story.append(Paragraph(
        "The block reward halves every 210,000 blocks:", body))
    story.append(Paragraph(
        "reward(height) = 50 / 2 ^ floor(height / 210,000)", code))
    
    t5 = Table([
        ['Halving', 'Block Range', 'Reward', 'Coins Minted', 'Cumulative'],
        ['Genesis', '0 - 209,999', '50 BRICS', '10,500,000', '10,500,000'],
        ['1st', '210,000 - 419,999', '25 BRICS', '5,250,000', '15,750,000'],
        ['2nd', '420,000 - 629,999', '12.5 BRICS', '2,625,000', '18,375,000'],
        ['3rd', '630,000 - 839,999', '6.25 BRICS', '1,312,500', '19,687,500'],
        ['4th', '840,000 - 1,049,999', '3.125 BRICS', '656,250', '20,343,750'],
    ], colWidths=[2*cm, 3.6*cm, 2.5*cm, 3*cm, 3*cm])
    t5.setStyle(make_table_style())
    story.append(t5)
    story.append(Paragraph("Table 5: Halving Schedule", caption))

    # ===================== 6. MINING PROTOCOL =====================
    story.append(Paragraph("6. Mining Protocol", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("6.1 Stratum v1", h2))
    story.append(Paragraph(
        "BricsCoin implements the Stratum v1 mining protocol on TCP port 3333, enabling "
        "direct compatibility with SHA-256 ASIC miners:", body))
    
    for method, desc in [
        ("mining.subscribe", "Session initialization and extranonce assignment"),
        ("mining.authorize", "Worker authentication (wallet_address.worker_name)"),
        ("mining.set_difficulty", "Dynamic share difficulty adjustment"),
        ("mining.notify", "Job distribution with block template and Merkle branches"),
        ("mining.submit", "Share submission with nonce, timestamp, and extranonce2"),
    ]:
        story.append(Paragraph(f"<b>{method}</b> -- {desc}", bullet))
    
    story.append(Paragraph("6.2 BIP320 Version Rolling", h2))
    story.append(Paragraph(
        "The implementation supports BIP320 version rolling via <b>mining.configure</b>, "
        "allowing ASIC miners to use bits in the block version field as additional nonce "
        "space. The version rolling mask is <b>0x1FFFE000</b>, consistent with Bitcoin.", body))
    
    story.append(Paragraph("6.3 Hashrate Calculation", h2))
    story.append(Paragraph("Network hashrate is estimated from accepted shares:", body))
    story.append(Paragraph(
        "hashrate = (share_count x share_difficulty x 2^32) / time_window", code))

    # ===================== 7. TRANSACTION MODEL =====================
    story.append(PageBreak())
    story.append(Paragraph("7. Transaction Model", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("7.1 Legacy Transactions (ECDSA)", h2))
    story.append(Paragraph(
        "Transactions from \"BRICS\" addresses require a single ECDSA signature:", body))
    story.append(Paragraph(
        "tx_data   = sender || recipient || amount || timestamp<br/>"
        "signature = ECDSA_sign(private_key, SHA-256(tx_data))", code))
    
    story.append(Paragraph("7.2 PQC Transactions (Hybrid)", h2))
    story.append(Paragraph(
        "Transactions from \"BRICSPQ\" addresses require both ECDSA and ML-DSA-65 "
        "signatures. The server performs three verification steps:", body))
    for s in [
        "<b>Hybrid signature verification:</b> Both ECDSA and ML-DSA-65 must be valid",
        "<b>Address ownership:</b> SHA-256(ecdsa_pubkey || dilithium_pubkey) must match sender",
        "<b>Balance check:</b> Sender balance must cover amount + fee (0.000005 BRICS)",
    ]:
        story.append(Paragraph(s, bullet))
    
    story.append(Paragraph("7.3 Migration Transactions", h2))
    story.append(Paragraph(
        "BricsCoin provides seamless migration from legacy ECDSA wallets to PQC hybrid "
        "wallets. The migration generates a new PQC wallet and transfers all funds in a "
        "single atomic transaction. Migration transactions are <b>fee-exempt</b> to "
        "incentivize adoption of quantum-safe addresses.", body))

    # ===================== 8. NETWORK ARCHITECTURE =====================
    story.append(Paragraph("8. Network Architecture", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("8.1 API Layer", h2))
    story.append(Paragraph("The RESTful API provides endpoints for:", body))
    for cat in [
        "<b>Blockchain:</b> Block retrieval, chain statistics, transaction history, explorer",
        "<b>Wallet:</b> Balance queries, PQC wallet creation/recovery, transaction submission",
        "<b>Mining:</b> Mining templates, active miner statistics, hashrate monitoring",
        "<b>Network:</b> Peer management, node synchronization, network statistics",
        "<b>Security:</b> PQC signature verification, security audit endpoints",
    ]:
        story.append(Paragraph(cat, bullet))
    
    story.append(Paragraph("8.2 Data Persistence", h2))
    story.append(Paragraph(
        "MongoDB serves as the persistent data store with indexed collections for blocks, "
        "transactions, wallets, mining statistics, and peer information.", body))

    # ===================== 9. WALLET ECOSYSTEM =====================
    story.append(Paragraph("9. Wallet Ecosystem", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("9.1 Web Wallet (PWA)", h2))
    story.append(Paragraph(
        "The browser-based wallet supports both legacy ECDSA and PQC hybrid wallets. "
        "All cryptographic operations run client-side. Wallet data is stored in localStorage "
        "and can be exported as encrypted JSON backups.", body))
    
    story.append(Paragraph("9.2 Desktop Wallet", h2))
    story.append(Paragraph("Cross-platform Electron desktop wallet providing:", body))
    for f in [
        "Full PQC wallet creation with 12-word seed phrase",
        "Hybrid ECDSA + ML-DSA-65 transaction signing",
        "Wallet import and recovery from seed phrase",
        "Available for Windows (.exe), macOS (.dmg/.zip), and Linux (.AppImage)",
    ]:
        story.append(Paragraph(f, bullet))
    
    story.append(Paragraph("9.3 Wallet Migration", h2))
    story.append(Paragraph(
        "A guided migration wizard enables users to transfer funds from legacy ECDSA wallets "
        "to new PQC hybrid wallets. The migration is fee-exempt and generates a complete PQC "
        "key set from a new seed phrase.", body))

    # ===================== 10. SECURITY ANALYSIS =====================
    story.append(PageBreak())
    story.append(Paragraph("10. Security Analysis", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("10.1 Quantum Threat Model", h2))
    story.append(Paragraph(
        "Shor's algorithm, on a sufficiently powerful quantum computer, can break ECDSA "
        "by solving the elliptic curve discrete logarithm problem in polynomial time. "
        "BricsCoin's hybrid scheme provides defense-in-depth:", body))
    
    t6 = Table([
        ['Scenario', 'ECDSA', 'ML-DSA-65', 'TX Valid?'],
        ['Pre-quantum era', 'Secure', 'Secure', 'Yes'],
        ['Quantum breaks ECDSA', 'Broken', 'Secure', 'No (ML-DSA required)'],
        ['Both broken (hypothetical)', 'Broken', 'Broken', 'No'],
        ['Classical attack only', 'Secure', 'Secure', 'Yes'],
    ], colWidths=[4.5*cm, 2.5*cm, 2.5*cm, 4*cm])
    t6.setStyle(make_table_style())
    story.append(t6)
    story.append(Paragraph("Table 6: Quantum Threat Scenarios", caption))
    
    story.append(Paragraph("10.2 Why Hybrid?", h2))
    for reason in [
        "<b>Defense in depth:</b> If either algorithm has a vulnerability, the other provides a safety net.",
        "<b>Backward compatibility:</b> Legacy wallets continue to operate with ECDSA-only signatures.",
        "<b>Proven + Novel:</b> ECDSA has decades of validation; ML-DSA-65 provides quantum resistance.",
        "<b>NIST standardization:</b> ML-DSA-65 was selected through a rigorous multi-year NIST evaluation and standardized as FIPS 204.",
    ]:
        story.append(Paragraph(reason, bullet))
    
    story.append(Paragraph("10.3 Client-Side Security", h2))
    story.append(Paragraph(
        "Private keys are generated and stored exclusively on the user's device. The server "
        "never receives or processes private keys. Only signatures and public keys are "
        "transmitted. For maximum security, the desktop wallet is recommended over the "
        "browser-based wallet.", body))

    # ===================== 11. CONCLUSION =====================
    story.append(Paragraph("11. Conclusion", h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "BricsCoin represents a significant advancement in cryptocurrency security by "
        "implementing post-quantum cryptography at the consensus level. The hybrid ECDSA + "
        "ML-DSA-65 signature scheme, enforced for all PQC wallet transactions, ensures "
        "resilience against both classical and quantum computational attacks.", body))
    
    story.append(Paragraph(
        "By combining Bitcoin's proven SHA-256 Proof-of-Work consensus and deflationary "
        "monetary policy with NIST-standardized post-quantum signatures, BricsCoin offers "
        "a practical path forward for cryptocurrency security in the quantum computing era.", body))
    
    story.append(Paragraph(
        "BricsCoin is fully operational, open-source, and available for community "
        "participation.", body))
    
    story.append(Spacer(1, 1.5*cm))
    story.append(HRFlowable(width="50%", thickness=1, color=GOLD, hAlign='CENTER'))
    story.append(Spacer(1, 8*mm))
    
    story.append(Paragraph("<b>Website:</b> https://bricscoin26.org", link_s))
    story.append(Paragraph("<b>Source Code:</b> https://codeberg.org/Bricscoin_26/Bricscoin", link_s))
    story.append(Paragraph("<b>Community:</b> https://bricscoin26-chat.org/community", link_s))
    story.append(Paragraph("<b>Twitter/X:</b> @Bricscoin26", link_s))
    
    story.append(Spacer(1, 1.5*cm))
    footer_s = ParagraphStyle('Footer', fontName='Helvetica',
        fontSize=9, textColor=TEXT_LIGHT, alignment=TA_CENTER)
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, hAlign='CENTER'))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("BricsCoin -- Created and developed by Jabo86", footer_s))
    story.append(Paragraph("Copyright 2026 BricsCoin Project. All rights reserved.", footer_s))

    # Build
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Whitepaper generated: {output_path}")

if __name__ == "__main__":
    build_whitepaper()
