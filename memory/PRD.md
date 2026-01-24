# BricsCoin - Product Requirements Document

## Project Overview
BricsCoin è una criptovaluta decentralizzata simile a Bitcoin, con:
- Proof of Work (SHA256)
- Supply massima: 21,000,000 BRICS
- Halving ogni 210,000 blocchi (~4 anni)
- Target: 10 minuti per blocco
- Supporto mining ASIC (NerdMiner, Bitaxe, etc.)

## Server Live
| Servizio | URL |
|----------|-----|
| Frontend | http://5.161.254.163:3000 |
| API | http://5.161.254.163:8001/api |
| Stratum Mining | stratum+tcp://5.161.254.163:3333 |

## ✅ Funzionalità Completate

### Blockchain Core
- [x] Proof of Work con SHA256
- [x] Difficoltà dinamica (ogni 2016 blocchi)
- [x] Halving ogni 210,000 blocchi
- [x] Genesis block automatico
- [x] P2P node synchronization

### Wallet
- [x] Creazione wallet con seed phrase (12 parole BIP39)
- [x] Importazione wallet da seed phrase
- [x] Importazione wallet da chiave privata
- [x] Invio e ricezione BRICS
- [x] QR code per indirizzi
- [x] Cronologia transazioni
- [x] Esportazione wallet JSON

### Mining
- [x] Mining dal browser (Web Mining)
- [x] Server Stratum per ASIC miners
- [x] Supporto NerdMiner, Bitaxe, Antminer

### Frontend
- [x] Dashboard con statistiche
- [x] Explorer blocchi e transazioni
- [x] Sfondo Matrix (verde cascata)
- [x] Logo BricsCoin 2026
- [x] Pagina Downloads wallet
- [x] Interfaccia in italiano

### Downloads Disponibili
- BricsCoin-Wallet-Linux.AppImage (100MB)
- BricsCoin-Wallet-Windows.zip (103MB)
- BricsCoin-Wallet-Mac-Source.zip (580KB)

## 🔧 Configurazione NerdMiner

```
Pool: 5.161.254.163
Port: 3333
User: TUO_INDIRIZZO_BRICS.nerdminer
Pass: x
```

Esempio URL completo: `stratum+tcp://5.161.254.163:3333`

## 🔴 Problemi Noti
- GitHub account sospeso (Bricscoin2026)
- Mac wallet richiede build manuale
- Windows wallet è un .zip, non installer .exe

## 📋 Backlog
- [ ] Riattivare GitHub per releases automatiche
- [ ] Build .dmg per Mac
- [ ] Build .exe installer per Windows
- [ ] Landing page promozionale
- [ ] Multilingue completo

## Changelog
- **2026-01-24 22:30**: Seed phrase 12 parole, importa wallet, downloads funzionanti
- **2026-01-24 21:30**: Sfondo Matrix, pagina downloads
- **2026-01-24 16:00**: Deploy iniziale su Hetzner
