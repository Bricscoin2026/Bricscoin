#!/bin/bash
# =============================================================================
# BricsCoin HOTFIX v2: PQC Transaction "Pending" Fix
# 
# Questo script:
# 1. Fa backup del server.py attuale
# 2. Copia il server.py aggiornato (confirmed: True per PQC tx)
# 3. Corregge TUTTE le transazioni PQC bloccate in "Pending" nel database
# 4. Ricostruisce (senza cache) e riavvia il container Docker API
#
# USO: 
#   cd /root && wget <url> -O bricscoin-hotfix.tar.gz
#   tar xzf bricscoin-hotfix.tar.gz && cd deploy-hotfix && bash deploy.sh
# =============================================================================

set -e

echo "========================================"
echo "  BricsCoin HOTFIX v2 - PQC Transaction Fix"
echo "  $(date)"
echo "========================================"
echo ""

# Detect project directory
BRICS_DIR=""
for dir in /root/bricscoin /root/BricsCoin /root/bricscoin26; do
    if [ -d "$dir/backend" ]; then
        BRICS_DIR="$dir"
        break
    fi
done

if [ -z "$BRICS_DIR" ]; then
    echo "ERRORE: Directory del progetto non trovata!"
    echo "Directories cercate: /root/bricscoin, /root/BricsCoin, /root/bricscoin26"
    echo "Per favore imposta manualmente: BRICS_DIR=/percorso/del/progetto bash deploy.sh"
    exit 1
fi

echo "Directory progetto: $BRICS_DIR"
echo ""

# ==================== STEP 1: BACKUP ====================
echo "[1/5] Backup del server.py attuale..."
BACKUP_DIR="/root/bricscoin-backup-hotfix-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$BRICS_DIR/backend/server.py" "$BACKUP_DIR/" 2>/dev/null || true
echo "  Backup salvato in: $BACKUP_DIR"

# ==================== STEP 2: COPY FIXED SERVER.PY ====================
echo ""
echo "[2/5] Copia server.py aggiornato..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/server.py" "$BRICS_DIR/backend/server.py"
echo "  server.py aggiornato!"
echo "  Fix applicati:"
echo "    - PQC transactions: confirmed=True (era False)"
echo "    - Transaction ID: accetta sia UUID che SHA-256 hash"

# ==================== STEP 3: FIX DATABASE ====================
echo ""
echo "[3/5] Correzione transazioni bloccate nel database..."

MONGO_CONTAINER=$(docker ps --filter name=mongo --format "{{.Names}}" | head -1)

if [ -z "$MONGO_CONTAINER" ]; then
    MONGO_CONTAINER=$(docker ps --filter ancestor=mongo --format "{{.Names}}" | head -1)
fi

if [ -n "$MONGO_CONTAINER" ]; then
    echo "  Container MongoDB: $MONGO_CONTAINER"
    
    # Fix PQC transactions (by signature_scheme)
    echo "  Correzione transazioni PQC..."
    docker exec "$MONGO_CONTAINER" mongosh --quiet --eval '
        db = db.getSiblingDB("bricscoin");
        
        // Fix 1: PQC transactions by signature_scheme
        var r1 = db.transactions.updateMany(
            { "signature_scheme": "ecdsa_secp256k1+ml-dsa-65", "confirmed": false },
            { $set: { "confirmed": true } }
        );
        print("  Transazioni PQC corrette (per signature_scheme): " + r1.modifiedCount);
        
        // Fix 2: PQC transactions by address pattern (BRICSPQ)
        var r2 = db.transactions.updateMany(
            { "sender": /^BRICSPQ/, "confirmed": false },
            { $set: { "confirmed": true } }
        );
        print("  Transazioni PQC corrette (per indirizzo BRICSPQ): " + r2.modifiedCount);
        
        // Fix 3: Migration transactions
        var r3 = db.transactions.updateMany(
            { "migration": true, "confirmed": false },
            { $set: { "confirmed": true } }
        );
        print("  Transazioni migrazione corrette: " + r3.modifiedCount);
        
        // Show total pending count
        var pending = db.transactions.countDocuments({ "confirmed": false });
        print("  Transazioni ancora pending (legacy, normale): " + pending);
        
        var total = db.transactions.countDocuments({});
        var confirmed = db.transactions.countDocuments({ "confirmed": true });
        print("  Totale transazioni: " + total + " (confermate: " + confirmed + ")");
    ' 2>/dev/null || echo "  ATTENZIONE: Impossibile connettersi a MongoDB nel container."
else
    echo "  ATTENZIONE: Container MongoDB non trovato!"
    echo "  Prova manualmente:"
    echo "    docker exec bricscoin-db mongosh --eval 'db.getSiblingDB(\"bricscoin\").transactions.updateMany({\"signature_scheme\":\"ecdsa_secp256k1+ml-dsa-65\",\"confirmed\":false},{\$set:{\"confirmed\":true}})'"
fi

# ==================== STEP 4: REBUILD DOCKER (NO CACHE) ====================
echo ""
echo "[4/5] Ricostruzione container API (senza cache)..."
cd "$BRICS_DIR"

docker-compose -f docker-compose.prod.yml build --no-cache bricscoin-api 2>&1 | tail -10
echo ""
echo "  Riavvio container..."
docker-compose -f docker-compose.prod.yml up -d bricscoin-api 2>&1 | tail -5

# Wait for startup
echo "  Attendo avvio server (15 sec)..."
sleep 15

# ==================== STEP 5: VERIFY ====================
echo ""
echo "[5/5] Verifica..."

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/blockchain/status 2>/dev/null || echo "000")
PQC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/pqc/stats 2>/dev/null || echo "000")

echo ""
echo "========================================"
if [ "$API_STATUS" = "200" ] && [ "$PQC_STATUS" = "200" ]; then
    echo "  HOTFIX APPLICATO CON SUCCESSO!"
    echo ""
    echo "  API Status:      $API_STATUS (OK)"
    echo "  PQC Endpoint:    $PQC_STATUS (OK)"
    
    # Show PQC stats
    PQC_STATS=$(curl -s http://localhost:8001/api/pqc/stats 2>/dev/null)
    echo ""
    echo "  Stats PQC:"
    echo "  $PQC_STATS" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'    Wallet PQC: {d.get(\"total_pqc_wallets\",0)}')
    print(f'    Transazioni PQC: {d.get(\"total_pqc_transactions\",0)}')
    print(f'    Blocchi PQC: {d.get(\"total_pqc_blocks\",0)}')
except: print('    (impossibile leggere stats)')
" 2>/dev/null
    
    echo ""
    echo "  Backup: $BACKUP_DIR"
    echo ""
    echo "  VERIFICA MANUALE:"
    echo "  1. Vai su bricscoin26.org"
    echo "  2. Invia una transazione da un wallet PQC"
    echo "  3. Controlla nell'explorer che sia 'Confirmed'"
elif [ "$API_STATUS" = "200" ]; then
    echo "  HOTFIX PARZIALE"
    echo "  API OK ma endpoint PQC non risponde ($PQC_STATUS)"
    echo "  Controlla: docker logs bricscoin-api --tail 50"
else
    echo "  ATTENZIONE: API non risponde (status: $API_STATUS)"
    echo "  Controlla i log: docker logs bricscoin-api --tail 50"
    echo "  Ripristino possibile: cp $BACKUP_DIR/server.py $BRICS_DIR/backend/server.py"
fi
echo "========================================"
