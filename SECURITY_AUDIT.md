# BricsCoin Security Audit Report

**Status**: PASSED  
**Date**: February 17, 2026  
**Version**: v3.0.0 (Post-Quantum)  
**Total Tests**: 27/27 Passed (100%)  
**Audit Type**: Live (tests executed in real-time via `/api/security/audit`)

---

## Executive Summary

BricsCoin has completed a comprehensive security audit covering input validation, classical cryptography (ECDSA/SHA-256), post-quantum cryptography (ML-DSA-65), and attack prevention. All 27 security tests pass. The audit runs in real-time and can be re-executed at any time.

---

## Audit Results

### 1. Input Validation (8/8 Tests Passed)

| Test | Status | Description |
|------|--------|-------------|
| Legacy address format (BRICS...) | PASS | Validates `BRICS` + 40 hex characters |
| PQC address format (BRICSPQ...) | PASS | Validates `BRICSPQ` + 38 hex characters |
| Reject invalid address format | PASS | Non-BRICS addresses rejected |
| Amount bounds validation | PASS | Amount must be > 0 and <= max supply |
| Amount precision (max 8 decimals) | PASS | Prevents floating point issues |
| Reject negative amounts | PASS | Negative values rejected |
| Signature hex format check | PASS | Validates hex encoding |
| Public key hex format check | PASS | Validates 128-char hex format |

### 2. Classical Cryptography (5/5 Tests Passed)

| Test | Status | Description |
|------|--------|-------------|
| ECDSA secp256k1 key generation | PASS | Key pair generation verified |
| ECDSA SHA-256 sign & verify | PASS | Signature creation and verification |
| DER signature format (JS compatible) | PASS | Cross-platform JavaScript compatibility |
| Address derivation from public key | PASS | Deterministic address generation |
| SHA-256 block hashing | PASS | Block hash integrity |

### 3. Post-Quantum Cryptography (6/6 Tests Passed)

| Test | Status | Description |
|------|--------|-------------|
| ML-DSA-65 key pair generation | PASS | Dilithium key generation (FIPS 204) |
| PQC address format (BRICSPQ...) | PASS | Correct PQC address derivation |
| Hybrid ECDSA + ML-DSA-65 signing | PASS | Dual-algorithm signature creation |
| Hybrid signature verification | PASS | Both signatures verified independently |
| PQC wallet key recovery | PASS | Key recovery from stored credentials |
| Node PQC key pair configured | PASS | Network node has active PQC keys |

### 4. Attack Prevention & Security (8/8 Tests Passed)

| Test | Status | Description |
|------|--------|-------------|
| Replay attack protection | PASS | Signature uniqueness enforced |
| Timestamp window validation (5 min) | PASS | Stale transactions rejected |
| IP blacklisting after failed attempts | PASS | Automatic IP blocking |
| Rate limiting (slowapi) active | PASS | Request throttling configured |
| Security headers (X-Frame, HSTS, XSS) | PASS | HTTP security headers set |
| CORS origin restriction | PASS | Cross-origin requests controlled |
| Migration restricted to PQC only | PASS | Only BRICSPQ addresses accepted |
| Self-send transaction prevention | PASS | Cannot send to own address |

---

## Security Architecture

### Cryptographic Stack

| Layer | Algorithm | Purpose |
|-------|-----------|---------|
| Block Hashing | SHA-256 | Proof-of-Work consensus |
| Transaction Signing (Classical) | ECDSA secp256k1 | Digital signatures |
| Transaction Signing (Quantum) | ML-DSA-65 (FIPS 204) | Post-quantum digital signatures |
| Hybrid Scheme | ECDSA + ML-DSA-65 | Backward-compatible quantum resistance |
| Key Derivation | SHA-256 | Address generation from public key |

### Client-Side Security

All cryptographic operations are performed **in the user's browser**:

1. **Key Generation**: Private keys are generated locally using `@noble/post-quantum`
2. **Transaction Signing**: Transactions are signed client-side before submission
3. **Zero Key Transmission**: Private keys are NEVER sent to the server
4. **Signature Verification**: The server only verifies pre-signed transactions

### Network Security

| Feature | Configuration |
|---------|---------------|
| Rate Limiting | Wallet: 5 req/min, Transactions: 10 req/min |
| CORS | Restricted to allowed origins |
| Security Headers | X-Frame-Options, HSTS, X-XSS-Protection, Referrer-Policy |
| IP Blacklisting | Auto-block after repeated failed attempts |
| Timestamp Validation | 5-minute window for transaction freshness |
| Anti-Replay | Signature uniqueness check (no duplicate transactions) |

---

## How to Run the Audit

The security audit runs live on the network. Execute it at any time:

```bash
curl https://bricscoin26.org/api/security/audit | python3 -m json.tool
```

Or visit the [About page](https://bricscoin26.org/about) and click "Esegui Audit".

---

## Disclosure

This audit was conducted internally. For security vulnerability reports, please contact the team via Codeberg issues.

**Repository**: [codeberg.org/Bricscoin_26/Bricscoin](https://codeberg.org/Bricscoin_26/Bricscoin)
