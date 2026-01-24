# BricsCoin - Product Requirements Document

## Server Live (Hetzner)
| Servizio | URL |
|----------|-----|
| **Frontend** | http://5.161.254.163:3000 |
| **API** | http://5.161.254.163:8001/api |
| **Stratum** | stratum+tcp://5.161.254.163:3333 |

## ✅ Funzionalità Complete

### Blockchain
- [x] Proof of Work SHA256
- [x] Supply max: 21,000,000 BRICS
- [x] Halving ogni 210,000 blocchi (~4 anni)
- [x] Difficoltà 4 (come Bitcoin genesis)
- [x] Target: 10 min/blocco

### Wallet
- [x] Seed phrase 12 parole (BIP39)
- [x] Importa da seed phrase
- [x] Importa da chiave privata
- [x] Invio/Ricezione BRICS
- [x] QR code
- [x] Esportazione JSON

### Mining
- [x] **Mining browser FUNZIONA** (~500-600 H/s)
- [x] Web Worker per background mining
- [x] Server Stratum porta 3333
- [x] Supporto NerdMiner (connesso)

### Downloads
- [x] Linux AppImage (100 MB)
- [x] Windows ZIP (103 MB)
- [x] macOS Source (580 KB)

### UI/UX
- [x] **Sfondo Matrix verde**
- [x] **Logo moneta rotonda** (senza sfondo bianco)
- [x] **Multilingue**: IT, EN, ES, FR, DE, ZH, JA, RU, TR
- [x] Selettore lingua nel header

## 🔧 Configurazione NerdMiner

```
Pool: 5.161.254.163
Port: 3333
User: TUO_INDIRIZZO_BRICS.nerdminer
Pass: x
```

## Changelog
- 2026-01-24 23:08: Mining browser FUNZIONA! 576 H/s
- 2026-01-24 23:05: Web Worker puro JS per SHA256
- 2026-01-24 23:00: Sistema multilingue 9 lingue
- 2026-01-24 22:45: Fix Stratum per NerdMiner
- 2026-01-24 22:30: Seed phrase, importa wallet

## Known Issues
- Block submission API ritorna 400 (da verificare)
- GitHub account sospeso
