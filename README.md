# 🪙 BricsCoin - Blockchain Decentralizzata SHA256

[![GitHub](https://img.shields.io/badge/GitHub-Bricscoin2026-blue)](https://github.com/Bricscoin2026/Bricscoin)
[![Download Wallet](https://img.shields.io/badge/Download-Wallet-gold)](https://github.com/Bricscoin2026/Bricscoin/releases)

**BricsCoin è una criptovaluta DECENTRALIZZATA.** Chiunque può eseguire un nodo e partecipare alla rete!

## 📥 Download Wallet

Scarica il wallet per il tuo sistema operativo:

| Piattaforma | Download | Tipo |
|-------------|----------|------|
| **Windows** | [BricsCoin-Wallet-Setup.exe](https://github.com/Bricscoin2026/Bricscoin/releases/latest) | Installer |
| **Windows** | [BricsCoin-Wallet-Portable.exe](https://github.com/Bricscoin2026/Bricscoin/releases/latest) | Portable |
| **macOS** | [BricsCoin-Wallet.dmg](https://github.com/Bricscoin2026/Bricscoin/releases/latest) | DMG |
| **Linux** | [BricsCoin-Wallet.AppImage](https://github.com/Bricscoin2026/Bricscoin/releases/latest) | AppImage |
| **Linux** | [BricsCoin-Wallet.deb](https://github.com/Bricscoin2026/Bricscoin/releases/latest) | Debian/Ubuntu |
| **Android/iOS** | [Web Wallet](http://5.161.254.163:3000/wallet) | PWA (installa da browser) |

### Installazione Mobile (Android/iOS)

1. Apri **http://5.161.254.163:3000/wallet** nel browser
2. Clicca "Aggiungi alla schermata Home" / "Install App"
3. Usa il wallet come un'app nativa!

## 🌐 Come Funziona la Decentralizzazione

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Seed Node     │◄───►│    Tuo Nodo     │◄───►│   Altri Nodi    │
│  5.161.254.163  │     │  (tuo server)   │     │   (nel mondo)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   [MongoDB]               [MongoDB]               [MongoDB]
   (copia locale)          (copia locale)          (copia locale)
```

**Ogni nodo:**
- Ha la propria copia della blockchain
- Valida i blocchi indipendentemente
- Può minare blocchi
- Si sincronizza con gli altri nodi

## 🚀 Esegui il Tuo Nodo

### Requisiti
- Server/VPS con Docker (Ubuntu 22.04 consigliato)
- 2GB RAM minimo
- IP pubblico (per ricevere connessioni P2P)

### Installazione Rapida

```bash
# 1. Installa Docker
curl -fsSL https://get.docker.com | sh

# 2. Clona il repository
git clone https://github.com/Bricscoin2026/Bricscoin.git
cd Bricscoin

# 3. Configura il tuo nodo
export NODE_ID="mio-nodo-$(hostname)"
export NODE_URL="http://TUO_IP_PUBBLICO:8001"

# 4. Avvia il nodo (si connette automaticamente alla rete)
docker compose -f docker-compose.node.yml up -d

# 5. Verifica la sincronizzazione
curl http://localhost:8001/api/p2p/node/info
```

### Con Mining Stratum (per ASIC)

```bash
docker compose -f docker-compose.node.yml --profile with-mining up -d
```

## ⛏️ Mining

### Opzione 1: Mining con ASIC (Bitaxe, NerdMiner, Antminer)

Connettiti a qualsiasi nodo della rete:

**Seed Node Principale:**
```
Pool: stratum+tcp://5.161.254.163:3333
User: TUO_INDIRIZZO_BRICS.worker1
Pass: x
```

**O al tuo nodo locale:**
```
Pool: stratum+tcp://localhost:3333
User: TUO_INDIRIZZO_BRICS.worker1
Pass: x
```

### Opzione 2: Mining da Browser

Vai su http://5.161.254.163:3000/mining (o il tuo nodo locale)

### Opzione 3: Script Python

```python
import hashlib
import requests

# Connettiti a qualsiasi nodo della rete
NODE_URL = "http://5.161.254.163:8001"  # o il tuo nodo
MINER_ADDRESS = "BRICStuoindirizzo..."

def mine():
    template = requests.get(f"{NODE_URL}/api/mining/template").json()
    block_data = template['block_data']
    difficulty = template['difficulty']
    target = '0' * difficulty
    
    nonce = 0
    while True:
        hash = hashlib.sha256(f"{block_data}{nonce}".encode()).hexdigest()
        if hash.startswith(target):
            print(f"Blocco trovato! Nonce: {nonce}")
            requests.post(f"{NODE_URL}/api/mining/submit", json={
                "block_data": block_data,
                "nonce": nonce,
                "hash": hash,
                "miner_address": MINER_ADDRESS
            })
            break
        nonce += 1

mine()
```

## 📡 API P2P

### Registra il tuo nodo nella rete
```bash
curl -X POST http://5.161.254.163:8001/api/p2p/register \
  -H "Content-Type: application/json" \
  -d '{"node_id": "mio-nodo", "url": "http://MIO_IP:8001"}'
```

### Vedi i peer connessi
```bash
curl http://5.161.254.163:8001/api/p2p/peers
```

### Sincronizza la blockchain
```bash
curl -X POST http://localhost:8001/api/p2p/sync
```

### Info del tuo nodo
```bash
curl http://localhost:8001/api/p2p/node/info
```

## 📊 Specifiche Tecniche

| Parametro | Valore |
|-----------|--------|
| Algoritmo | SHA256 (compatibile ASIC) |
| Supply Massima | 21,000,000 BRICS |
| Block Time | ~10 minuti |
| Ricompensa Iniziale | 50 BRICS |
| Halving | Ogni 210,000 blocchi |
| Difficulty Adjustment | Ogni 2,016 blocchi |
| Consensus | Proof of Work |
| Firma | ECDSA secp256k1 |

## 🌍 Nodi della Rete

### Seed Node Ufficiale
- **URL:** http://5.161.254.163:8001
- **Stratum:** stratum+tcp://5.161.254.163:3333
- **Web UI:** http://5.161.254.163:3000

### Come Aggiungere il Tuo Nodo
1. Esegui il tuo nodo con le istruzioni sopra
2. Il tuo nodo si registra automaticamente con il seed
3. Apri una Issue su GitHub per essere aggiunto alla lista ufficiale

## 🔒 Sicurezza

- **Decentralizzato:** Nessun punto centrale di fallimento
- **Open Source:** Codice completamente trasparente
- **SHA256:** Stesso algoritmo di Bitcoin, testato da 15+ anni
- **ECDSA:** Firme crittografiche sicure

## 📜 Licenza

MIT License - Libero di usare, modificare e distribuire!

---

**Made by [Bricscoin2026](https://github.com/Bricscoin2026)**

⛏️ **Buon Mining!** 🪙
