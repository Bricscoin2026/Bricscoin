# BricsCoin

![Security Audit](https://img.shields.io/badge/Security%20Audit-PASSED-brightgreen?style=for-the-badge&logo=shield)
![Tests](https://img.shields.io/badge/Tests-27%2F27%20Passed-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![SHA256](https://img.shields.io/badge/Algorithm-SHA256-orange?style=for-the-badge)
![Quantum Safe](https://img.shields.io/badge/Quantum-ML--DSA--65-10b981?style=for-the-badge)

A decentralized cryptocurrency powered by SHA256 Proof-of-Work with Post-Quantum Cryptography (PQC).

## Security Audit Status

**SECURITY AUDIT PASSED** - February 2026

| Category | Status | Tests |
|----------|--------|-------|
| Input Validation | PASSED | 8/8 |
| Classical Cryptography | PASSED | 5/5 |
| Post-Quantum Cryptography | PASSED | 6/6 |
| Attack Prevention & Security | PASSED | 8/8 |
| **TOTAL** | **PASSED** | **27/27** |

### Security Features
- **Client-side transaction signing** - Private keys never leave your device
- **ECDSA secp256k1** - Same cryptography as Bitcoin
- **ML-DSA-65 (FIPS 204)** - Post-quantum digital signatures (Dilithium)
- **Hybrid signatures** - ECDSA + ML-DSA-65 for backward-compatible quantum resistance
- **Input validation** - All inputs validated with Pydantic
- **Rate limiting** - Protection against spam and DDoS
- **CORS protection** - Restricted to allowed origins
- **Security headers** - XSS, clickjacking, HSTS protection
- **Replay attack prevention** - Timestamp and signature validation
- **IP blacklisting** - Automatic blocking of suspicious activity

---

## Technical Specifications

| Parameter | Value |
|-----------|-------|
| **Algorithm** | SHA256 Proof-of-Work |
| **Max Supply** | 21,000,000 BRICS |
| **Block Reward** | 50 BRICS |
| **Halving Interval** | Every 210,000 blocks |
| **Target Block Time** | ~10 minutes |
| **Difficulty Adjustment** | Every 2016 blocks |
| **Transaction Fee** | 0.000005 BRICS (burned) |
| **Signature Algorithm** | ECDSA (secp256k1) + ML-DSA-65 (hybrid PQC) |
| **Address Format** | Legacy: `BRICS...` / PQC: `BRICSPQ...` |
| **Quantum Security** | ML-DSA-65 (FIPS 204) |
| **Client Signing** | Browser-side (keys never leave device) |
| **License** | MIT |

---

## Post-Quantum Cryptography (PQC)

BricsCoin implements a **hybrid signature scheme** combining classical ECDSA with the NIST-standardized ML-DSA-65 (formerly Dilithium) algorithm. This provides:

- **Backward compatibility**: Legacy ECDSA wallets continue to work
- **Quantum resistance**: ML-DSA-65 protects against future quantum computer attacks
- **Client-side security**: All cryptographic signing happens in the browser using `@noble/post-quantum`
- **Zero-fee migration**: Users can migrate from legacy wallets to PQC wallets without fees

### How it works

1. **Create a PQC wallet** - Generates both ECDSA and ML-DSA-65 key pairs
2. **Sign transactions** - Every transaction is signed with both algorithms in the browser
3. **Verify on-chain** - The network verifies both signatures for maximum security
4. **Block signing** - Nodes sign mined blocks with their PQC key pair

---

## Quick Start

### Mining

Connect your SHA256 ASIC miner to:
```
stratum+tcp://bricscoin26.org:3333
```

### API

```bash
# Get network stats
curl https://bricscoin26.org/api/network/stats

# Create a PQC wallet
curl -X POST https://bricscoin26.org/api/pqc/wallet/create \
  -H "Content-Type: application/json" \
  -d '{"name": "my-wallet"}'

# Run security audit
curl https://bricscoin26.org/api/security/audit
```

### Run Your Own Node

```bash
git clone https://codeberg.org/Bricscoin_26/Bricscoin.git
cd Bricscoin
docker compose -f docker-compose.prod.yml up -d
```

---

## Architecture

```
BricsCoin/
├── backend/
│   ├── server.py           # FastAPI API server
│   ├── pqc_crypto.py       # Post-Quantum Cryptography module
│   ├── stratum_server.py   # Mining stratum protocol
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/          # React pages (Dashboard, Explorer, PQC Wallet, etc.)
│   │   ├── lib/            # API client, crypto utilities, PQC signing
│   │   └── components/     # UI components (Shadcn/UI)
│   └── package.json
├── docker-compose.prod.yml # Production Docker setup
├── WHITEPAPER.md           # Technical whitepaper
├── SECURITY_AUDIT.md       # Security audit report
└── README.md
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/network/stats` | GET | Network statistics |
| `/api/blocks` | GET | List blocks |
| `/api/transactions` | GET | List transactions |
| `/api/richlist` | GET | Top wallet holders |
| `/api/pqc/wallet/create` | POST | Create PQC wallet |
| `/api/pqc/stats` | GET | PQC network statistics |
| `/api/pqc/node/keys` | GET | Node PQC public keys |
| `/api/pqc/migrate` | POST | Migrate legacy to PQC (no fee) |
| `/api/security/audit` | GET | Run live security audit |
| `/api/tokenomics` | GET | Tokenomics info |

---

## Links

- **Website**: [bricscoin26.org](https://bricscoin26.org)
- **Repository**: [codeberg.org/Bricscoin_26/Bricscoin](https://codeberg.org/Bricscoin_26/Bricscoin)

---

## License

MIT License - See [LICENSE](LICENSE) for details.
