# BricsCoin - Product Requirements Document

## Original Problem Statement
Creare una criptovaluta Bitcoin-like chiamata "BricsCoin" con:
- Blockchain Proof of Work con SHA256
- Difficulty adjustment dinamico (~10 min target)
- Supporto ASIC miners via Stratum protocol
- Web wallet e desktop wallet
- Explorer e dashboard

## User Persona
- Crypto enthusiast con hardware mining (Bitaxe, NerdMiner, NerdQaxe)
- Vuole una coin privata per esperimenti/community

## Current Architecture
```
/root/Bricscoin/
├── backend/
│   ├── server.py          # FastAPI API + blockchain logic
│   ├── stratum_server.py  # Stratum v1 per ASIC miners
│   └── .env
├── frontend/
│   └── src/pages/
│       ├── Mining.jsx     # Stats mining con hashrate reale
│       ├── Wallet.jsx     # Web wallet
│       └── ...
└── docker-compose.yml
```

## What's Been Implemented

### 2026-02-06 (Sessione Corrente)
- ✅ **Stratum Pool Address su Network Page**: 
  - Aggiunta card "Official Mining Pool" con indirizzo `stratum+tcp://stratum.bricscoin26.org:3333`
  - Pulsante copia, info algoritmo (SHA256), porta (3333), protocollo (Stratum v1)
  - File modificato: `/app/frontend/src/pages/Network.jsx`

### 2026-02-05
- ✅ **Rete P2P Decentralizzata (3 nodi)**:
  - Nodo principale: 5.161.254.163 (bricscoin26.org)
  - Nodo 2: 167.235.133.118
  - Nodo 3: 46.225.104.63
  - Package standalone: `/app/bricscoin-node/`

### 2026-02-02
- ✅ **P0 CRITICAL - Blockchain Bloccata RISOLTA**: 
  - Fix `MAX_TARGET = 2^256 - 1` per accettare share/blocchi
  - 900+ blocchi prodotti, difficoltà auto-adjustment funzionante
- ✅ **Endpoint `/api/miners/stats`**: Creato nuovo endpoint per statistiche miners
  - Mostra minatori attivi, shares 24h, blocchi trovati
  - Basato su collezione `miner_shares` (più affidabile)
- ✅ **Hashrate Display Corretto**: Cambiato moltiplicatore da `2^32` a `2^41`
  - Ora mostra ~8-9 TH/s invece di 21 GH/s
- ✅ **HTTPS Cloudflare**: Configurato redirect HTTP → HTTPS
- ✅ **Documenti Aggiornati**: 
  - SECURITY_AUDIT.md, README.md, WHITEPAPER.md
  - GitHub → Codeberg (https://codeberg.org/Bricscoin_26/Bricscoin)
  - Transaction Fees: 0.05 BRICS (burned)
  - Data: February 2026
- ✅ **Server Stability**:
  - Restart policy `unless-stopped` per frontend
  - 2GB swap aggiunto
- ✅ **P0 CRITICAL - Transazioni "Signature verification failed" RISOLTO**:
  - Fix 1: `verify()` → `verify_digest()` per hash pre-calcolato
  - Fix 2: `sigdecode=sigdecode_der` per formato firma DER
  - Fix 3: Amount formatting (`1` vs `1.0`) allineato frontend/backend

### 2026-01-31
- ✅ **Real Hashrate Tracking**: Hashrate calcolato dalle shares
- ✅ **Difficulty Clamping**: Blocco limitato a max 10 min nel calcolo
- ✅ **HTTPS**: Abilitato su bricscoin26.org via Nginx + Certbot
- ✅ **Share Difficulty**: Default 512, accetta suggerimenti miner

### Previous
- ✅ Stratum server v6.2 Bitcoin-compatible
- ✅ Personalized jobs per miner (reward address corretto)
- ✅ Web wallet con generazione seed phrase
- ✅ Block explorer
- ✅ Desktop wallet downloads
- ✅ Security Audit 27/27 test passed

## Prioritized Backlog

### P0 - Critical
- (none currently - all resolved)

### P1 - High Priority  
- [ ] Warning "SAVE SEED PHRASE" on wallet creation (UI prominente)
- [ ] Hashrate display verification (confermare ~9 TH/s vs ~1437 TH/s)
- [ ] Server-side wallet backup (encrypted in DB)

### P2 - Medium Priority
- [ ] Conteggio blocchi Explorer (off-by-one error)
- [ ] Active miners count più accurato (estendere finestra 5 → 15/30 min)
- [ ] Fix logger error in stratum_server.py (linea 345)
- [ ] Frontend production build (attualmente dev mode)

### P3 - Future
- [ ] Automated P2P block sync (no manual mongoimport)
- [ ] Mobile wallet iOS/Android
- [ ] Exchange listings
- [ ] Community mining pools page
- [ ] Stratum v2 / P2Pool

## Technical Notes

### Signature Verification (CRITICAL)
```python
# Backend MUST:
# 1. Hash tx_data with SHA256
# 2. Use verify_digest (not verify)
# 3. Use sigdecode_der for DER format
# 4. Format amount same as frontend (int if whole number)

tx_hash = hashlib.sha256(tx_data.encode()).digest()
public_key.verify_digest(signature, tx_hash, sigdecode=sigdecode_der)
```

### Amount Formatting Fix
```python
# Frontend sends "1", backend was creating "1.0"
# Fix: Convert to int if whole number
amount_str = str(int(amount)) if amount == int(amount) else str(amount)
```

### Hashrate Calculation Formula
```python
# Using 2^41 multiplier for TH/s miners
HASHRATE_MULTIPLIER = 2 ** 41
hashrate = (difficulty * HASHRATE_MULTIPLIER) / block_time
```

### Key Endpoints
- `GET /api/network/stats` - Network stats with hashrate
- `GET /api/miners/stats` - Active miners statistics
- `GET /api/blocks` - Block list
- `POST /api/transactions/secure` - Send signed transaction
- Stratum: `stratum+tcp://bricscoin26.org:3333`

### Database Collections
- `blocks` - Blockchain blocks
- `transactions` - All transactions
- `miner_shares` - Share submissions
- `miners` - Connected miners info

## Server Info
- Hetzner VPS CPX11: 5.161.254.163 (2GB RAM + 2GB Swap)
- Domain: bricscoin26.org
- Git: https://codeberg.org/Bricscoin_26/Bricscoin
- SSL: Cloudflare (Full)

## Files Modified This Session
- `/app/backend/server.py` - verify_signature fix, amount formatting
- `/app/backend/stratum_server.py` - MAX_TARGET fix
- `/app/SECURITY_AUDIT.md` - Codeberg links
- `/app/README.md` - Codeberg links, fees
- `/app/WHITEPAPER.md` - Codeberg links, Genesis block info
