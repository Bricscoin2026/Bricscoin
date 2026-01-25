# BricsCoin - Product Requirements Document

## 🌐 Sito Live
| Servizio | URL |
|----------|-----|
| **Sito Web** | https://bricscoin26.org |
| **Run a Node** | https://bricscoin26.org/node |
| **Downloads** | https://bricscoin26.org/downloads |
| **Mining** | https://bricscoin26.org/mining |
| **API** | https://bricscoin26.org/api |
| **NerdMiner/Stratum** | 5.161.254.163:3333 (usa IP!) |

## ✅ Funzionalità Complete

### Blockchain (Bitcoin-like)
- [x] Proof of Work SHA256
- [x] Supply max: 21,000,000 BRICS
- [x] Halving ogni 210,000 blocchi (~4 anni)
- [x] Difficoltà: 4 (regolazione ogni 2016 blocchi)
- [x] Target: 10 min/blocco

### Wallet
- [x] Seed phrase 12 parole (BIP39)
- [x] Importa da seed/chiave privata
- [x] Invio/Ricezione BRICS
- [x] QR code

### Mining
- [x] Mining browser ~27 KH/s
- [x] Web Worker (background)
- [x] Server Stratum porta 3333

### Downloads
- [x] Linux AppImage (100 MB)
- [x] Windows ZIP (103 MB)
- [x] macOS Source (580 KB)
- [x] Source Code ZIP (680 KB)

### Decentralizzazione
- [x] Pagina "Run a Node" con guida completa
- [x] docker-compose.node.yml per nuovi nodi
- [x] Sincronizzazione P2P automatica
- [x] Download codice sorgente

### UI/UX
- [x] Sfondo Matrix verde
- [x] Logo moneta rotonda
- [x] Multilingue: IT, EN, ES, FR, DE, ZH, JA, RU, TR
- [x] HTTPS con Cloudflare

## 🔧 Per Eseguire un Nuovo Nodo
```bash
git clone https://github.com/Bricscoin2026/Bricscoin.git
cd Bricscoin
docker compose -f docker-compose.node.yml up -d
```

## Known Issues
- GitHub account sospeso (Bricscoin2026)
- NerdMiner: usare IP 5.161.254.163:3333 (Cloudflare non supporta porta 3333)

## Changelog
- 2026-01-25 00:20: Pagina "Run a Node" con guida decentralizzazione
- 2026-01-25 00:00: Dominio bricscoin26.org configurato
- 2026-01-24 23:08: Mining 27 KH/s funzionante
- 2026-01-24 23:00: Multilingue 9 lingue
