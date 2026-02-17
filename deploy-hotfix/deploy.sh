#!/bin/bash
# =============================================================================
# BricsCoin HOTFIX: PQC Transaction "Pending" Fix
# 
# Questo script:
# 1. Fa backup del server.py attuale
# 2. Copia il server.py aggiornato (con confirmed: True per PQC tx)
# 3. Corregge le transazioni PQC gia bloccate in "Pending" nel database
# 4. Ricostruisce e riavvia il container Docker
#
# USO: wget <url> && tar xzf bricscoin-hotfix.tar.gz && cd deploy-hotfix && bash deploy.sh
# =============================================================================

set -e

echo "========================================"
echo "  BricsCoin HOTFIX - PQC Transaction Fix"
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
    exit 1
fi

echo "Directory progetto: $BRICS_DIR"
echo ""

# ==================== STEP 1: BACKUP ====================
echo "[1/4] Backup del server.py attuale..."
BACKUP_DIR="/root/bricscoin-backup-hotfix-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$BRICS_DIR/backend/server.py" "$BACKUP_DIR/" 2>/dev/null || true
echo "  Backup salvato in: $BACKUP_DIR"

# ==================== STEP 2: COPY FIXED SERVER.PY ====================
echo ""
echo "[2/4] Copia server.py aggiornato..."
cp server.py "$BRICS_DIR/backend/server.py"
echo "  server.py aggiornato con fix PQC transactions"

# ==================== STEP 3: FIX STUCK PENDING PQC TRANSACTIONS ====================
echo ""
echo "[3/4] Correzione transazioni PQC bloccate in Pending..."

# Find the running mongo container
MONGO_CONTAINER=$(docker ps --filter name=mongo --format "{{.Names}}" | head -1)

if [ -n "$MONGO_CONTAINER" ]; then
    echo "  Container MongoDB: $MONGO_CONTAINER"
    
    # Count stuck PQC transactions
    STUCK_COUNT=$(docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "
        db = db.getSiblingDB('bricscoin');
        db.transactions.countDocuments({
            'signature_scheme': 'ecdsa_secp256k1+ml-dsa-65',
            'confirmed': false
        });
    " 2>/dev/null || echo "0")
    
    echo "  Transazioni PQC bloccate trovate: $STUCK_COUNT"
    
    if [ "$STUCK_COUNT" != "0" ]; then
        # Fix them - set confirmed: true
        docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "
            db = db.getSiblingDB('bricscoin');
            result = db.transactions.updateMany(
                { 'signature_scheme': 'ecdsa_secp256k1+ml-dsa-65', 'confirmed': false },
                { \$set: { 'confirmed': true } }
            );
            print('Transazioni corrette: ' + result.modifiedCount);
        " 2>/dev/null || echo "  ATTENZIONE: Impossibile correggere via mongosh. Prova manualmente."
    else
        echo "  Nessuna transazione PQC bloccata da correggere."
    fi
    
    # Also fix migration transactions stuck as pending
    MIGRATION_COUNT=$(docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "
        db = db.getSiblingDB('bricscoin');
        db.transactions.countDocuments({
            'migration': true,
            'confirmed': false
        });
    " 2>/dev/null || echo "0")
    
    if [ "$MIGRATION_COUNT" != "0" ]; then
        docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "
            db = db.getSiblingDB('bricscoin');
            result = db.transactions.updateMany(
                { 'migration': true, 'confirmed': false },
                { \$set: { 'confirmed': true } }
            );
            print('Transazioni migrazione corrette: ' + result.modifiedCount);
        " 2>/dev/null || echo "  ATTENZIONE: Impossibile correggere migrazioni."
    fi
else
    echo "  ATTENZIONE: Container MongoDB non trovato. Le transazioni bloccate dovranno essere corrette manualmente."
fi

# ==================== STEP 4: REBUILD DOCKER ====================
echo ""
echo "[4/4] Ricostruzione e riavvio container API..."
cd "$BRICS_DIR"

# Rebuild only the API container
docker-compose -f docker-compose.prod.yml build bricscoin-api 2>&1 | tail -5
docker-compose -f docker-compose.prod.yml up -d bricscoin-api 2>&1 | tail -3

# Wait for it to start
echo "  Attendo avvio del server..."
sleep 10

# Test the API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/blockchain/status 2>/dev/null || echo "000")

echo ""
echo "========================================"
if [ "$API_STATUS" = "200" ]; then
    echo "  HOTFIX APPLICATO CON SUCCESSO!"
    echo ""
    echo "  API Status: $API_STATUS (OK)"
    echo "  Fix: Transazioni PQC ora istantaneamente confermate"
    echo "  Backup: $BACKUP_DIR"
    echo ""
    echo "  VERIFICA: Invia una transazione da un wallet PQC"
    echo "  e controlla che appaia come 'Confirmed' nell'explorer."
else
    echo "  ATTENZIONE: API non risponde (status: $API_STATUS)"
    echo "  Controlla i log: docker logs bricscoin-api --tail 50"
    echo "  Backup disponibile in: $BACKUP_DIR"
fi
echo "========================================"
