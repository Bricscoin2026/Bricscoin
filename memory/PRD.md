# BricsCoin - Product Requirements Document

## Overview
BricsCoin è una criptovaluta decentralizzata basata su SHA256 Proof-of-Work, simile a Bitcoin.

## Original Problem Statement
Creare una blockchain simile al Bitcoin chiamata BricsCoin con:
- Sistema PoW SHA256
- 21,000,000 di monete massime
- Mining aperto a tutti nel mondo
- Mining con ASIC (Bitaxe, NerdMiner, Antminer)

## User Choices
- Dashboard completa con wallet, mining, transazioni, explorer
- API pubblica + mining nel browser
- Difficoltà dinamica come Bitcoin
- Wallet avanzato con storico e QR code
- Halving come Bitcoin

## Technical Architecture
- **Backend**: FastAPI (Python)
- **Frontend**: React + Tailwind CSS
- **Database**: MongoDB
- **Mining Protocol**: Stratum v1 (per ASIC)

## Core Requirements (Static)
| Requirement | Status |
|-------------|--------|
| SHA256 PoW | ✅ Implementato |
| 21M Max Supply | ✅ Implementato |
| Halving ogni 210k blocchi | ✅ Implementato |
| Difficoltà dinamica | ✅ Implementato |
| Wallet ECDSA | ✅ Implementato |
| Browser Mining | ✅ Implementato |
| Stratum Server | ✅ Implementato |
| P2P Network | ✅ Implementato |

## What's Been Implemented (Jan 2026)

### Backend
- [x] Blockchain core con SHA256
- [x] Sistema wallet ECDSA (secp256k1)
- [x] API REST completa
- [x] Mining endpoint
- [x] Stratum server per ASIC
- [x] P2P peer sync

### Frontend
- [x] Dashboard con statistiche
- [x] Explorer blocchi/transazioni
- [x] Wallet con QR code
- [x] Mining interface
- [x] Network stats

### DevOps
- [x] Dockerfile per API
- [x] Dockerfile per Stratum
- [x] docker-compose.prod.yml
- [x] Setup script Hetzner
- [x] README completo

## Prioritized Backlog

### P0 (Critical) - Done ✅
- Mining funzionante
- Wallet creation
- Block explorer

### P1 (High) - Done ✅
- Stratum protocol per ASIC
- P2P network sync
- Docker setup

### P2 (Medium) - Future
- [ ] SSL/HTTPS setup
- [ ] Mining pool statistics
- [ ] Hashrate charts
- [ ] Mobile responsive improvements
- [ ] Telegram bot notifications

### P3 (Low) - Future
- [ ] Multi-language support
- [ ] Advanced block explorer
- [ ] Mining calculator
- [ ] Community forum

## Next Tasks
1. Deploy su Hetzner server
2. Pubblicare su GitHub (Jabo86/bricscoin)
3. Test mining con Bitaxe reale
4. Setup dominio personalizzato
5. Configurare SSL certificate

## GitHub Repository
- Owner: Jabo86
- Repo: bricscoin
- URL: https://github.com/Jabo86/bricscoin
