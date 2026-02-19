#!/usr/bin/env python3
"""BricsCoin Whitepaper PDF Generator"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus.flowables import HRFlowable
import os

# Colors
GOLD = HexColor('#D4A843')
DARK_BG = HexColor('#0A0A0A')
DARK_CARD = HexColor('#1A1A1A')
TEXT_GRAY = HexColor('#333333')
LIGHT_GRAY = HexColor('#666666')
GREEN = HexColor('#10B981')

def build_whitepaper():
    output_path = "/app/downloads/BricsCoin_Whitepaper_v3.pdf"
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'],
        fontSize=28, spaceAfter=6, textColor=HexColor('#1a1a1a'),
        fontName='Helvetica-Bold', alignment=TA_CENTER)
    
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
        fontSize=14, spaceAfter=20, textColor=LIGHT_GRAY,
        fontName='Helvetica', alignment=TA_CENTER)
    
    h1_style = ParagraphStyle('H1', parent=styles['Heading1'],
        fontSize=20, spaceBefore=24, spaceAfter=12,
        textColor=HexColor('#1a1a1a'), fontName='Helvetica-Bold',
        borderWidth=0, borderPadding=0)
    
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'],
        fontSize=15, spaceBefore=18, spaceAfter=8,
        textColor=HexColor('#2a2a2a'), fontName='Helvetica-Bold')
    
    h3_style = ParagraphStyle('H3', parent=styles['Heading3'],
        fontSize=12, spaceBefore=12, spaceAfter=6,
        textColor=HexColor('#333333'), fontName='Helvetica-Bold')
    
    body_style = ParagraphStyle('Body', parent=styles['Normal'],
        fontSize=10.5, spaceAfter=8, textColor=TEXT_GRAY,
        fontName='Helvetica', alignment=TA_JUSTIFY, leading=15)
    
    body_bold = ParagraphStyle('BodyBold', parent=body_style,
        fontName='Helvetica-Bold')
    
    caption_style = ParagraphStyle('Caption', parent=styles['Normal'],
        fontSize=9, textColor=LIGHT_GRAY, fontName='Helvetica-Oblique',
        alignment=TA_CENTER, spaceAfter=12)
    
    code_style = ParagraphStyle('Code', parent=styles['Normal'],
        fontSize=9, fontName='Courier', textColor=HexColor('#2d2d2d'),
        backColor=HexColor('#f5f5f5'), borderWidth=0.5,
        borderColor=HexColor('#e0e0e0'), borderPadding=8,
        spaceAfter=12, leading=13)
    
    toc_style = ParagraphStyle('TOC', parent=styles['Normal'],
        fontSize=11, spaceAfter=6, textColor=HexColor('#333333'),
        fontName='Helvetica', leftIndent=20)

    story = []

    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 3*cm))
    
    # Logo
    logo_path = "/app/frontend/public/bricscoin-logo.png"
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=6*cm, height=6*cm)
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 1*cm))
    
    story.append(Paragraph("BRICSCOIN", title_style))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("A Post-Quantum Secure Cryptocurrency", subtitle_style))
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width="40%", thickness=1, color=GOLD, hAlign='CENTER'))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("Technical Whitepaper v3.0", ParagraphStyle('ver', parent=subtitle_style, fontSize=12)))
    story.append(Spacer(1, 4*mm))
    
    author_style = ParagraphStyle('Author', parent=subtitle_style, fontSize=12, textColor=HexColor('#444444'))
    story.append(Paragraph("Created by <b>Jabo86</b>", author_style))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("February 2026", ParagraphStyle('date', parent=subtitle_style, fontSize=11, textColor=LIGHT_GRAY)))
    story.append(Spacer(1, 2*cm))
    
    # Abstract box on cover
    abstract_text = (
        "BricsCoin is a decentralized cryptocurrency built on SHA-256 Proof-of-Work consensus, "
        "featuring a hybrid post-quantum cryptographic signature scheme that combines classical "
        "ECDSA (secp256k1) with NIST-standardized ML-DSA-65 (FIPS 204). Both signatures are "
        "required at the consensus level for transaction validation, providing genuine quantum "
        "resistance rather than superficial implementation. BricsCoin is designed for ASIC mining "
        "compatibility via the Stratum v1 protocol with BIP320 version rolling support."
    )
    
    abstract_style = ParagraphStyle('Abstract', parent=body_style,
        fontSize=10, textColor=LIGHT_GRAY, alignment=TA_CENTER, leading=14)
    story.append(Paragraph(abstract_text, abstract_style))
    
    story.append(PageBreak())

    # ==================== TABLE OF CONTENTS ====================
    story.append(Paragraph("Table of Contents", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#cccccc')))
    story.append(Spacer(1, 6*mm))
    
    toc_items = [
        "1. Introduction",
        "2. Protocol Architecture",
        "3. Consensus Mechanism",
        "4. Post-Quantum Cryptography",
        "5. Tokenomics",
        "6. Mining Protocol",
        "7. Transaction Model",
        "8. Network Architecture",
        "9. Wallet Ecosystem",
        "10. Security Analysis",
        "11. Conclusion",
    ]
    for item in toc_items:
        story.append(Paragraph(item, toc_style))
    
    story.append(PageBreak())

    # ==================== 1. INTRODUCTION ====================
    story.append(Paragraph("1. Introduction", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "The advent of large-scale quantum computers poses an existential threat to the cryptographic "
        "foundations of modern blockchain networks. Elliptic Curve Digital Signature Algorithm (ECDSA), "
        "the signature scheme used by Bitcoin and the vast majority of cryptocurrencies, is vulnerable "
        "to Shor's algorithm, which can efficiently solve the elliptic curve discrete logarithm problem "
        "on a sufficiently powerful quantum computer.", body_style))
    
    story.append(Paragraph(
        "BricsCoin addresses this threat proactively by implementing a hybrid signature scheme at the "
        "consensus level. Every transaction from a post-quantum (PQC) wallet requires two valid signatures: "
        "one from ECDSA (secp256k1) for backward compatibility and one from ML-DSA-65 (formerly Dilithium), "
        "a lattice-based digital signature algorithm standardized by NIST in FIPS 204. A transaction is "
        "rejected by the network if either signature fails verification.", body_style))
    
    story.append(Paragraph(
        "This is not a superficial or preparatory implementation. BricsCoin enforces hybrid signature "
        "verification at the consensus layer, making it one of the first operational blockchains to "
        "require post-quantum signatures for transaction validity.", body_style))

    story.append(Paragraph("1.1 Design Principles", h2_style))
    
    principles = [
        ["<b>Quantum Resistance</b>", "Hybrid ECDSA + ML-DSA-65 signatures enforced at the consensus level. Both signatures must be valid for a transaction to be accepted."],
        ["<b>ASIC Compatibility</b>", "SHA-256 Proof-of-Work enables mining with existing Bitcoin ASIC hardware (Bitaxe, Antminer, etc.) via Stratum v1 protocol."],
        ["<b>Client-Side Security</b>", "All private keys are generated and stored locally. Signing operations occur entirely in the user's browser or desktop wallet. Private keys never leave the device."],
        ["<b>Bitcoin-Proven Economics</b>", "Fixed supply of 21 million coins, halving every 210,000 blocks, and difficulty adjustment every 2,016 blocks mirror Bitcoin's time-tested economic model."],
    ]
    
    for p in principles:
        story.append(Paragraph(f"{p[0]}: {p[1]}", body_style))

    # ==================== 2. PROTOCOL ARCHITECTURE ====================
    story.append(PageBreak())
    story.append(Paragraph("2. Protocol Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "BricsCoin operates as a full-stack blockchain system with the following components:", body_style))
    
    arch_data = [
        ['Component', 'Technology', 'Purpose'],
        ['Consensus Engine', 'FastAPI (Python)', 'Block validation, transaction processing, chain management'],
        ['Mining Interface', 'Stratum v1 Server', 'ASIC miner communication, job distribution, share validation'],
        ['Database', 'MongoDB', 'Persistent storage for blocks, transactions, wallets, mining stats'],
        ['Web Frontend', 'React.js', 'Block explorer, wallet interface, mining dashboard, network stats'],
        ['Desktop Wallet', 'Electron', 'Cross-platform native wallet with full PQC signing capability'],
        ['PQC Module', 'ML-DSA-65 (FIPS 204)', 'Post-quantum signature generation and verification'],
    ]
    
    t = Table(arch_data, colWidths=[3.2*cm, 3.5*cm, 9.8*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Table 1: BricsCoin System Architecture Components", caption_style))

    # ==================== 3. CONSENSUS MECHANISM ====================
    story.append(Paragraph("3. Consensus Mechanism", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("3.1 SHA-256 Proof-of-Work", h2_style))
    story.append(Paragraph(
        "BricsCoin uses SHA-256 double-hashing for its Proof-of-Work consensus, identical to Bitcoin's mining "
        "algorithm. This design choice enables compatibility with the extensive ecosystem of SHA-256 ASIC miners, "
        "including consumer-grade devices like the Bitaxe series and industrial miners such as the Antminer S19/S21.", body_style))
    
    story.append(Paragraph(
        "Block validity requires that the SHA-256 hash of the block header, when interpreted as a 256-bit integer, "
        "is less than or equal to the current target value:", body_style))
    
    story.append(Paragraph(
        "H(block_header) &le; target<br/><br/>"
        "where target = MAX_TARGET / difficulty<br/>"
        "and MAX_TARGET = 2<super>256</super> - 1", code_style))
    
    story.append(Paragraph("3.2 Difficulty Adjustment Algorithm", h2_style))
    story.append(Paragraph(
        "The difficulty adjustment mechanism ensures a stable average block time of 10 minutes (600 seconds), "
        "regardless of changes in total network hashrate.", body_style))
    
    diff_params = [
        ['Parameter', 'Value'],
        ['Target Block Time', '600 seconds (10 minutes)'],
        ['Adjustment Interval', 'Every 2,016 blocks (~14 days at target rate)'],
        ['Maximum Adjustment Factor', '4x increase or 0.25x decrease per interval'],
        ['Initial Difficulty', '1,000,000'],
        ['Bootstrap Phase', 'Every 10 blocks for the first 2,016 blocks'],
    ]
    
    t2 = Table(diff_params, colWidths=[5*cm, 11.5*cm])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t2)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Table 2: Difficulty Adjustment Parameters", caption_style))
    
    story.append(Paragraph(
        "The adjustment formula is:", body_style))
    story.append(Paragraph(
        "new_difficulty = current_difficulty x (expected_time / actual_time)<br/><br/>"
        "clamped to: 0.25 x current_difficulty &le; new_difficulty &le; 4 x current_difficulty", code_style))
    
    story.append(Paragraph(
        "A bootstrap phase with accelerated adjustment (every 10 blocks) operates during the first 2,016 blocks "
        "to allow the network to quickly converge on an appropriate difficulty level for the initial hashrate.", body_style))

    # ==================== 4. POST-QUANTUM CRYPTOGRAPHY ====================
    story.append(PageBreak())
    story.append(Paragraph("4. Post-Quantum Cryptography", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "BricsCoin implements a Level 1 (strong) post-quantum security model. The hybrid signature scheme "
        "is enforced at the consensus level, meaning both classical and post-quantum signatures are mandatory "
        "for transaction validation. This is not a preparatory or experimental feature.", body_style))
    
    story.append(Paragraph("4.1 Hybrid Signature Scheme", h2_style))
    story.append(Paragraph(
        "Every PQC transaction carries two independent signatures:", body_style))
    
    sig_data = [
        ['Algorithm', 'Standard', 'Key Size', 'Signature Size', 'Security Level'],
        ['ECDSA', 'secp256k1', '32 bytes (private)\n64 bytes (public)', '64 bytes', 'Classical (128-bit)'],
        ['ML-DSA-65', 'FIPS 204', '4,032 bytes (private)\n1,952 bytes (public)', '3,309 bytes', 'NIST Level 3\n(quantum-safe)'],
    ]
    
    t3 = Table(sig_data, colWidths=[2.2*cm, 2*cm, 3.8*cm, 2.8*cm, 3.2*cm])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t3)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Table 3: Hybrid Signature Scheme Algorithms", caption_style))
    
    story.append(Paragraph("4.2 Consensus-Level Enforcement", h2_style))
    story.append(Paragraph(
        "The verification function implements a strict AND logic:", body_style))
    story.append(Paragraph(
        "hybrid_valid = ecdsa_valid AND dilithium_valid", code_style))
    story.append(Paragraph(
        "If <b>either</b> signature fails verification, the entire transaction is rejected by the network. "
        "There is no fallback to single-signature validation. This ensures that even if ECDSA is broken "
        "by a quantum computer, an attacker cannot forge a valid transaction without also forging the "
        "ML-DSA-65 signature, which remains computationally infeasible.", body_style))
    
    story.append(Paragraph("4.3 Address Derivation", h2_style))
    story.append(Paragraph(
        "PQC wallet addresses are derived from both public keys, cryptographically binding the address "
        "to both the classical and post-quantum key pairs:", body_style))
    story.append(Paragraph(
        "combined_hash = SHA-256(ecdsa_public_key || dilithium_public_key)<br/>"
        "address = \"BRICSPQ\" + combined_hash[0:38]", code_style))
    story.append(Paragraph(
        "The \"BRICSPQ\" prefix distinguishes post-quantum addresses from legacy \"BRICS\" addresses, "
        "enabling the network to enforce appropriate signature verification rules based on the address type.", body_style))
    
    story.append(Paragraph("4.4 Deterministic Key Generation", h2_style))
    story.append(Paragraph(
        "Both ECDSA and ML-DSA-65 key pairs are generated deterministically from a single 12-word BIP39 "
        "mnemonic seed phrase. The seed is split into two domains:", body_style))
    story.append(Paragraph(
        "ecdsa_private_key = seed[0:32]<br/>"
        "dilithium_seed = SHA-256(seed[32:64] || 'dilithium-v1')<br/>"
        "dilithium_pk, dilithium_sk = ML_DSA_65.keygen_internal(dilithium_seed)", code_style))
    story.append(Paragraph(
        "This deterministic derivation ensures that a user can fully recover their post-quantum wallet "
        "from the seed phrase alone, including both the ECDSA and ML-DSA-65 key pairs.", body_style))
    
    story.append(Paragraph("4.5 Client-Side Signing", h2_style))
    story.append(Paragraph(
        "All cryptographic operations (key generation, signing, address derivation) are performed locally "
        "on the user's device. In the web wallet, this is achieved using JavaScript implementations of both "
        "algorithms running in the browser. In the desktop wallet (Electron), the same operations run in "
        "the Node.js main process. Private keys are never transmitted to any server.", body_style))

    # ==================== 5. TOKENOMICS ====================
    story.append(PageBreak())
    story.append(Paragraph("5. Tokenomics", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "BricsCoin follows Bitcoin's proven deflationary monetary policy with identical core parameters:", body_style))
    
    token_data = [
        ['Parameter', 'Value'],
        ['Ticker Symbol', 'BRICS'],
        ['Maximum Supply', '21,000,000 BRICS'],
        ['Initial Block Reward', '50 BRICS'],
        ['Halving Interval', 'Every 210,000 blocks (~4 years)'],
        ['Transaction Fee', '0.000005 BRICS (fixed)'],
        ['Smallest Unit', '0.00000001 BRICS (1 satoshi equivalent)'],
        ['Target Block Time', '10 minutes'],
        ['Hashing Algorithm', 'SHA-256 (double-hash)'],
        ['Launch Date', 'February 2, 2026'],
    ]
    
    t4 = Table(token_data, colWidths=[4.5*cm, 12*cm])
    t4.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t4)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Table 4: BricsCoin Tokenomics", caption_style))
    
    story.append(Paragraph("5.1 Emission Schedule", h2_style))
    story.append(Paragraph(
        "The block reward halves every 210,000 blocks following the formula:", body_style))
    story.append(Paragraph(
        "reward(height) = 50 / 2<super>floor(height / 210,000)</super>", code_style))
    
    halving_data = [
        ['Halving', 'Block Range', 'Block Reward', 'Coins Minted', 'Cumulative Supply'],
        ['0 (Genesis)', '0 - 209,999', '50 BRICS', '10,500,000', '10,500,000'],
        ['1st', '210,000 - 419,999', '25 BRICS', '5,250,000', '15,750,000'],
        ['2nd', '420,000 - 629,999', '12.5 BRICS', '2,625,000', '18,375,000'],
        ['3rd', '630,000 - 839,999', '6.25 BRICS', '1,312,500', '19,687,500'],
        ['4th', '840,000 - 1,049,999', '3.125 BRICS', '656,250', '20,343,750'],
    ]
    
    t5 = Table(halving_data, colWidths=[2.2*cm, 3.5*cm, 2.8*cm, 3*cm, 3.3*cm])
    t5.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t5)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Table 5: Halving Schedule", caption_style))

    # ==================== 6. MINING PROTOCOL ====================
    story.append(PageBreak())
    story.append(Paragraph("6. Mining Protocol", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("6.1 Stratum v1 Protocol", h2_style))
    story.append(Paragraph(
        "BricsCoin implements the Stratum v1 mining protocol on TCP port 3333, enabling direct compatibility "
        "with SHA-256 ASIC miners. The implementation includes:", body_style))
    
    stratum_features = [
        "<b>mining.subscribe</b> - Session initialization and extranonce assignment",
        "<b>mining.authorize</b> - Worker authentication with wallet_address.worker_name format",
        "<b>mining.set_difficulty</b> - Dynamic share difficulty adjustment",
        "<b>mining.notify</b> - Job distribution with block template, Merkle branches, and version",
        "<b>mining.submit</b> - Share submission with nonce, timestamp, and extranonce2",
    ]
    for f in stratum_features:
        story.append(Paragraph(f"&bull; {f}", body_style))
    
    story.append(Paragraph("6.2 BIP320 Version Rolling", h2_style))
    story.append(Paragraph(
        "The Stratum implementation supports BIP320 version rolling via the <b>mining.configure</b> method. "
        "This allows ASIC miners to use bits in the block version field as additional nonce space, "
        "significantly increasing the nonce search space and enabling higher hashrates. The version rolling "
        "mask is set to <b>0x1FFFE000</b>, consistent with Bitcoin's implementation.", body_style))
    
    story.append(Paragraph("6.3 Share and Block Validation", h2_style))
    story.append(Paragraph(
        "The mining server performs two levels of validation for each submitted share:", body_style))
    story.append(Paragraph(
        "1. <b>Share validation</b>: The hash must meet the share difficulty target sent to the miner.<br/>"
        "2. <b>Block validation</b>: If the hash also meets the current network difficulty target, "
        "the share qualifies as a valid block and is added to the blockchain.", body_style))

    story.append(Paragraph("6.4 Hashrate Calculation", h2_style))
    story.append(Paragraph(
        "Network hashrate is estimated from accepted shares using a progressive time window:", body_style))
    story.append(Paragraph(
        "hashrate = (share_count x share_difficulty x 2<super>32</super>) / time_window", code_style))

    # ==================== 7. TRANSACTION MODEL ====================
    story.append(Paragraph("7. Transaction Model", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("7.1 Legacy Transactions (ECDSA)", h2_style))
    story.append(Paragraph(
        "Legacy transactions from \"BRICS\" addresses require a single ECDSA (secp256k1) signature. "
        "The transaction data is serialized as:", body_style))
    story.append(Paragraph(
        "tx_data = sender_address || recipient_address || amount || timestamp<br/>"
        "signature = ECDSA_sign(private_key, SHA-256(tx_data))", code_style))
    
    story.append(Paragraph("7.2 PQC Transactions (Hybrid)", h2_style))
    story.append(Paragraph(
        "Transactions from \"BRICSPQ\" addresses require both an ECDSA and an ML-DSA-65 signature "
        "over the same transaction data. The server performs three verification steps:", body_style))
    story.append(Paragraph(
        "1. <b>Hybrid signature verification</b>: Both ECDSA and ML-DSA-65 signatures must be valid<br/>"
        "2. <b>Address ownership verification</b>: SHA-256(ecdsa_pubkey || dilithium_pubkey) must match the sender address<br/>"
        "3. <b>Balance verification</b>: Sender balance must cover amount + transaction fee (0.000005 BRICS)", body_style))
    
    story.append(Paragraph("7.3 Migration Transactions", h2_style))
    story.append(Paragraph(
        "BricsCoin provides a seamless migration path from legacy ECDSA wallets to PQC hybrid wallets. "
        "The migration process generates a new PQC wallet and transfers all funds from the legacy address "
        "in a single atomic transaction. Migration transactions are fee-exempt to incentivize adoption "
        "of quantum-safe addresses.", body_style))
    
    story.append(Paragraph("7.4 Coinbase Transactions", h2_style))
    story.append(Paragraph(
        "Block rewards are distributed via coinbase transactions with sender \"COINBASE\". The reward "
        "is sent to the miner's registered wallet address. Coinbase transactions include the current "
        "block height and reward amount.", body_style))

    # ==================== 8. NETWORK ARCHITECTURE ====================
    story.append(PageBreak())
    story.append(Paragraph("8. Network Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "BricsCoin operates as a distributed system with the following network services:", body_style))
    
    story.append(Paragraph("8.1 API Layer", h2_style))
    story.append(Paragraph(
        "The RESTful API provides endpoints for:", body_style))
    
    api_categories = [
        "<b>Blockchain</b>: Block retrieval, chain statistics, transaction history, block explorer",
        "<b>Wallet</b>: Balance queries, PQC wallet creation/recovery, transaction submission",
        "<b>Mining</b>: Mining templates, active miner statistics, hashrate monitoring",
        "<b>Network</b>: Peer management, node synchronization, network statistics",
        "<b>Security</b>: PQC signature verification, security audit endpoints",
    ]
    for a in api_categories:
        story.append(Paragraph(f"&bull; {a}", body_style))
    
    story.append(Paragraph("8.2 Data Persistence", h2_style))
    story.append(Paragraph(
        "MongoDB serves as the persistent data store with collections for blocks, transactions, "
        "wallets, mining statistics, and peer information. The database uses indexed queries "
        "for efficient block explorer operations and balance calculations.", body_style))

    # ==================== 9. WALLET ECOSYSTEM ====================
    story.append(Paragraph("9. Wallet Ecosystem", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("9.1 Web Wallet (PWA)", h2_style))
    story.append(Paragraph(
        "The browser-based wallet supports both legacy ECDSA and PQC hybrid wallets. "
        "All cryptographic operations run client-side using JavaScript implementations. "
        "Wallet data is stored in the browser's localStorage and can be exported as encrypted JSON backups.", body_style))
    
    story.append(Paragraph("9.2 Desktop Wallet (BricsCoin Wallet)", h2_style))
    story.append(Paragraph(
        "The cross-platform desktop wallet is built with Electron and provides:", body_style))
    
    desktop_features = [
        "Full PQC wallet creation with 12-word seed phrase",
        "Hybrid ECDSA + ML-DSA-65 transaction signing",
        "Wallet import and recovery from seed phrase",
        "Transaction history and balance monitoring",
        "Available for Windows (.exe), macOS (.dmg/.zip), and Linux (.AppImage)",
    ]
    for d in desktop_features:
        story.append(Paragraph(f"&bull; {d}", body_style))
    
    story.append(Paragraph("9.3 Wallet Migration", h2_style))
    story.append(Paragraph(
        "A guided migration wizard enables users to transfer funds from legacy ECDSA wallets "
        "to new PQC hybrid wallets in a single step. The migration is fee-exempt and generates "
        "a complete PQC key set from a new seed phrase.", body_style))

    # ==================== 10. SECURITY ANALYSIS ====================
    story.append(PageBreak())
    story.append(Paragraph("10. Security Analysis", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("10.1 Quantum Threat Model", h2_style))
    story.append(Paragraph(
        "Shor's algorithm, running on a sufficiently powerful quantum computer, can break ECDSA "
        "by solving the elliptic curve discrete logarithm problem in polynomial time. Conservative "
        "estimates suggest that a cryptographically relevant quantum computer may exist within "
        "10-15 years. BricsCoin's hybrid scheme provides defense-in-depth:", body_style))
    
    threat_data = [
        ['Scenario', 'ECDSA Status', 'ML-DSA-65 Status', 'Transaction Valid?'],
        ['Pre-quantum era', 'Secure', 'Secure', 'Yes (both valid)'],
        ['Quantum computer breaks ECDSA', 'Broken', 'Secure', 'No (ECDSA forged,\nbut ML-DSA required)'],
        ['Hypothetical: both broken', 'Broken', 'Broken', 'No'],
        ['Classical attack only', 'Secure', 'Secure', 'Yes'],
    ]
    
    t6 = Table(threat_data, colWidths=[4.2*cm, 3*cm, 3*cm, 3.5*cm])
    t6.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t6)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Table 6: Quantum Threat Scenarios", caption_style))
    
    story.append(Paragraph("10.2 Why Hybrid Instead of Pure PQC?", h2_style))
    story.append(Paragraph(
        "The hybrid approach provides several advantages over a pure post-quantum signature scheme:", body_style))
    story.append(Paragraph(
        "&bull; <b>Defense in depth</b>: If either algorithm is found to have a vulnerability, the other provides a safety net.<br/>"
        "&bull; <b>Backward compatibility</b>: Legacy wallets can continue to operate with ECDSA-only signatures.<br/>"
        "&bull; <b>Proven + Novel</b>: ECDSA has decades of real-world security validation; ML-DSA-65 provides future-proof quantum resistance.<br/>"
        "&bull; <b>NIST standardization</b>: ML-DSA-65 (Dilithium) was selected by NIST through a rigorous multi-year evaluation process and standardized as FIPS 204.", body_style))
    
    story.append(Paragraph("10.3 Client-Side Key Security", h2_style))
    story.append(Paragraph(
        "Private keys are generated and stored exclusively on the user's device. The signing process "
        "operates entirely in the browser (via WebCrypto API and JavaScript implementations) or in the "
        "Electron desktop wallet's Node.js process. The server never receives or processes private keys. "
        "Only the resulting signatures and public keys are transmitted for verification.", body_style))
    story.append(Paragraph(
        "<b>Security considerations</b>: While client-side signing provides strong protection against server-side "
        "compromises, users should be aware that browser-based wallets are subject to the security of the "
        "host operating system and browser environment. For maximum security, the desktop wallet is recommended.", body_style))

    # ==================== 11. CONCLUSION ====================
    story.append(Paragraph("11. Conclusion", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "BricsCoin represents a significant advancement in cryptocurrency security by implementing "
        "post-quantum cryptography at the consensus level rather than as an optional or superficial feature. "
        "The hybrid ECDSA + ML-DSA-65 signature scheme, enforced for all PQC wallet transactions, ensures "
        "that the network is resilient against both classical and quantum computational attacks.", body_style))
    
    story.append(Paragraph(
        "By combining Bitcoin's proven SHA-256 Proof-of-Work consensus and deflationary monetary policy "
        "with NIST-standardized post-quantum signatures, BricsCoin offers a practical path forward for "
        "cryptocurrency security in the quantum computing era. The ASIC mining compatibility ensures "
        "robust network security, while the seamless migration tools enable a smooth transition from "
        "legacy to quantum-safe addresses.", body_style))
    
    story.append(Paragraph(
        "BricsCoin is fully operational, open-source, and available for community participation. "
        "All source code, documentation, and desktop wallet binaries are publicly available.", body_style))
    
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="60%", thickness=0.5, color=GOLD, hAlign='CENTER'))
    story.append(Spacer(1, 6*mm))
    
    links_style = ParagraphStyle('Links', parent=body_style, alignment=TA_CENTER, fontSize=10)
    story.append(Paragraph("<b>Website</b>: https://bricscoin26.org", links_style))
    story.append(Paragraph("<b>Source Code</b>: https://codeberg.org/Bricscoin_26/Bricscoin", links_style))
    story.append(Paragraph("<b>Community</b>: https://bricscoin26-chat.org/community", links_style))
    story.append(Paragraph("<b>Twitter/X</b>: @Bricscoin26", links_style))

    # Build PDF
    doc.build(story)
    print(f"Whitepaper generated: {output_path}")
    return output_path

if __name__ == "__main__":
    build_whitepaper()
