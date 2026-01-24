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
- [x] Difficoltà dinamica ogni 2016 blocchi
- [x] Target: 10 min/blocco

### Wallet
- [x] Seed phrase 12 parole (BIP39)
- [x] Importa da seed phrase
- [x] Importa da chiave privata
- [x] Invio/Ricezione BRICS
- [x] QR code
- [x] Esportazione JSON

### Mining
- [x] Mining browser (PC funziona)
- [x] Server Stratum porta 3333
- [x] Supporto NerdMiner (connesso!)
- [x] Difficoltà share: 0.001

### Downloads
- [x] Linux AppImage (100 MB)
- [x] Windows ZIP (103 MB)
- [x] macOS Source (580 KB)

### UI
- [x] Sfondo Matrix verde
- [x] Logo BricsCoin 2026

## 🔧 Configurazione NerdMiner

```
Pool: 5.161.254.163
Port: 3333
User: TUO_INDIRIZZO_BRICS.nerdminer
Pass: x
```

## ⚠️ Note Importanti

1. **Il NerdMiner si connette** ma la difficoltà del blocco (4 zeri iniziali) è alta
2. **La blockchain ha 1 blocco** - serve minare per creare nuovi blocchi
3. **Mining PC funziona** perché usa calcolo diretto senza Stratum

## Changelog
- 2026-01-24 22:45: Fix Stratum per NerdMiner, robusto contro dati binari
- 2026-01-24 22:30: Seed phrase, importa wallet, downloads
- 2026-01-24 21:30: Sfondo Matrix, logo BricsCoin 2026
