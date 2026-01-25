# BricsCoin - Product Requirements Document

## 🌐 Sito Live
| Servizio | URL |
|----------|-----|
| **Sito Web** | https://bricscoin26.org |
| **API** | https://bricscoin26.org/api |
| **Stratum Mining** | stratum+tcp://bricscoin26.org:3333 |
| **Backup IP** | http://5.161.254.163:3000 |

## ✅ Funzionalità Complete

### Blockchain (Bitcoin-like)
- [x] Proof of Work SHA256
- [x] Supply max: 21,000,000 BRICS
- [x] Halving ogni 210,000 blocchi (~4 anni)
- [x] Difficoltà: 4 (regolazione ogni 2016 blocchi)
- [x] Target: 10 min/blocco
- [x] Genesis block creato

### Wallet
- [x] Seed phrase 12 parole (BIP39)
- [x] Importa da seed phrase
- [x] Importa da chiave privata
- [x] Invio/Ricezione BRICS
- [x] QR code per indirizzi
- [x] Esportazione JSON

### Mining
- [x] Mining browser: ~27 KH/s
- [x] Web Worker (mining in background)
- [x] Server Stratum porta 3333
- [x] Supporto NerdMiner/Bitaxe

### Downloads
- [x] Linux AppImage (100 MB)
- [x] Windows ZIP (103 MB)
- [x] macOS Source (580 KB)

### UI/UX
- [x] Sfondo Matrix verde
- [x] Logo moneta rotonda (no sfondo bianco)
- [x] Multilingue: IT, EN, ES, FR, DE, ZH, JA, RU, TR
- [x] Selettore lingua nel header
- [x] HTTPS con Cloudflare

### Dominio
- [x] bricscoin26.org configurato
- [x] DNS Cloudflare
- [x] SSL Flexible
- [x] Nginx reverse proxy

## 🔧 Configurazione NerdMiner
```
Pool: bricscoin26.org
Port: 3333
User: TUO_INDIRIZZO_BRICS.nerdminer
Pass: x
```

## Server Hetzner
- IP: 5.161.254.163
- Nginx: porta 80 -> frontend:3000, API:8001
- Docker containers: frontend, api, stratum, mongodb

## Known Issues
- Block submission API error (da investigare)
- GitHub account sospeso

## Changelog
- 2026-01-25 00:00: Dominio bricscoin26.org configurato
- 2026-01-24 23:08: Mining 27 KH/s funzionante
- 2026-01-24 23:00: Multilingue 9 lingue
- 2026-01-24 22:30: Seed phrase wallet
