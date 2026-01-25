# BricsCoin - Product Requirements Document

## Original Problem Statement
Create a Bitcoin-like cryptocurrency named "BricsCoin" with full security for production launch.

## Security Audit Status: ✅ PASSED (v2.0)

### Security Features Implemented (January 25, 2026)

#### 1. Client-Side Transaction Signing ✅
- Private keys NEVER sent to server
- All signing done locally in browser using `elliptic` library
- Server only receives pre-signed transactions
- Signature verification on server side

#### 2. CORS Restrictions ✅
- Only `https://bricscoin26.org` and `https://www.bricscoin26.org` allowed
- Removed wildcard `*` CORS

#### 3. Rate Limiting ✅
- `/transactions/secure`: 10 requests/minute
- `/wallet/create`: 5 requests/minute
- `/wallet/import/*`: 5 requests/minute
- `/transactions` (GET): 60 requests/minute
- Legacy endpoint `/transactions` (POST): 5 requests/minute (deprecated)

#### 4. Input Validation ✅
- Address format validation (BRICS + 40 hex chars)
- Amount validation (positive, max supply, 8 decimal places)
- Signature format validation
- Public key format validation (128 hex chars)
- Transaction ID format validation (UUID)

#### 5. Security Headers ✅
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000
- Content-Security-Policy: default-src 'self'
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()

#### 6. IP Blocking & Blacklisting ✅
- Automatic IP blacklisting after 10 failed attempts
- 1 hour blacklist duration
- Security logging for all suspicious activity

#### 7. Replay Attack Prevention ✅
- Timestamp validation (max 5 minutes old)
- Duplicate signature detection
- Unique transaction IDs

#### 8. Address-Public Key Verification ✅
- Server verifies public key matches sender address
- Prevents unauthorized transactions

#### 9. Security Logging ✅
- Separate security logger for audit trail
- Logs all failed attempts, blacklist events, suspicious activity

#### 10. Production Mode ✅
- API docs disabled in production
- Enhanced error handling

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Backend API | Python (FastAPI) |
| Stratum Server | Python (asyncio) |
| Database | MongoDB |
| Frontend | React + TailwindCSS |
| Desktop Wallet | Electron |
| Cryptography | ECDSA (secp256k1) |
| Client Signing | elliptic, js-sha256 |
| Rate Limiting | slowapi |
| Deployment | Docker + Hetzner |

---

## API Endpoints (Secure)

### Transaction (NEW - Secure)
```
POST /api/transactions/secure
Body: {
  "sender_address": "BRICS...",
  "recipient_address": "BRICS...",
  "amount": 100.0,
  "timestamp": "2026-01-25T12:00:00Z",
  "signature": "...",  // Signed client-side
  "public_key": "..."
}
```

### Transaction (DEPRECATED - Insecure)
```
POST /api/transactions
⚠️ DEPRECATED - Sends private key over network
```

---

## Mining Configuration
- **Stratum**: `stratum+tcp://5.161.254.163:3333`
- **Difficulty**: 5 (5 leading hex zeros)
- **Block Reward**: 50 BRICS
- **Halving**: Every 210,000 blocks

---

## Network Status
- **Live URL**: https://bricscoin26.org
- **Blocks**: 200+
- **Miners**: Bitaxe, NerdMiner compatible
- **Supply**: ~11,000 BRICS mined

---

## Known Limitations (Future Work)

1. **TLS for Stratum** - Mining traffic is unencrypted (TCP)
2. **True P2P** - Currently centralized on single node
3. **Professional Audit** - Self-audited, not third-party

---

## Changelog

### v2.0.0 (2026-01-25) - Security Release
- ✅ Client-side transaction signing
- ✅ CORS restrictions
- ✅ Rate limiting
- ✅ Input validation with Pydantic
- ✅ Security headers middleware
- ✅ IP blacklisting
- ✅ Replay attack prevention
- ✅ Security logging
- ✅ Deprecated insecure endpoints

### v1.x (Previous)
- Initial blockchain implementation
- Web wallet
- Hardware mining support
- Desktop wallet (BricsCoin Core)
