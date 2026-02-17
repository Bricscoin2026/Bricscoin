# Deploy PQC su Produzione - Guida

## Prerequisiti
- Accesso SSH al server: `ssh root@5.161.254.163`
- Il server ha Docker in esecuzione

## Opzione A: Script Automatico (Raccomandato)

```bash
# Dal tuo Mac, copia lo script sul server:
scp deploy-pqc.sh root@5.161.254.163:/root/

# Connettiti al server:
ssh root@5.161.254.163

# Esegui lo script:
bash /root/deploy-pqc.sh
```

Lo script:
1. Fa backup dei file attuali
2. Installa `dilithium-py` (ML-DSA-65)
3. Copia `pqc_crypto.py`
4. Installa cron job pulizia disco
5. Testa che PQC funzioni
6. NON tocca MongoDB/blockchain

## Opzione B: Deploy Manuale

### 1. Installa dipendenze
```bash
pip3 install dilithium-py
```

### 2. Copia i file
I file da copiare dal preview al server:
- `pqc_crypto.py` → `/root/bricscoin/backend/`
- `server.py` (aggiornato) → `/root/bricscoin/backend/`
- Frontend pages → `/root/bricscoin/frontend/src/pages/`

### 3. Riavvia
```bash
docker-compose restart  # o il comando che usi
```

### 4. Verifica
```bash
curl http://localhost:PORT/api/pqc/stats
curl http://localhost:PORT/api/pqc/node/keys
```

## File Modificati
| File | Cosa cambia |
|------|------------|
| `backend/pqc_crypto.py` | NUOVO - Modulo crittografia PQC |
| `backend/server.py` | Aggiunto: import PQC, endpoint PQC, block signing, node keys |
| `backend/stratum_server.py` | Aggiunto: PQC block signing per blocchi Stratum |
| `frontend/src/pages/PQCWallet.jsx` | NUOVO - Pagina wallet quantum-safe |
| `frontend/src/pages/WalletMigration.jsx` | NUOVO - Migrazione legacy → PQC |
| `frontend/src/lib/pqc-crypto.js` | NUOVO - Firma ML-DSA-65 nel browser |
| `frontend/src/lib/api.js` | Aggiunto: funzioni API PQC |
| `frontend/src/App.js` | Aggiunto: route /pqc-wallet e /migrate |
| `frontend/src/components/Layout.jsx` | Aggiunto: link PQC Wallet e Migrazione |
| `frontend/src/pages/BlockDetail.jsx` | Aggiunto: sezione firma PQC |
| `frontend/src/pages/TransactionDetail.jsx` | Aggiunto: badge "Firmato Localmente" |

## IMPORTANTE
- La blockchain NON viene toccata
- MongoDB NON viene modificato (solo nuove collection aggiunte)
- I wallet legacy continuano a funzionare normalmente
- I nuovi blocchi avranno automaticamente la firma PQC
