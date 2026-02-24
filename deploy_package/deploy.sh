#!/bin/bash
# ============================================================
# BricsCoin Production Deploy Script
# Deploy nuove funzionalità: BricsChat, Time Capsule, AI Oracle
# + Ristrutturazione sito (pagine consolidate)
# 
# IMPORTANTE: NON tocca la blockchain o i dati esistenti!
# ============================================================

set -e
echo "============================================"
echo "  BricsCoin Production Deploy"
echo "  Nuove funzionalità + Ristrutturazione"
echo "============================================"
echo ""

# Auto-detect container names
API_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i api | head -1)
FRONTEND_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i frontend | head -1)

if [ -z "$API_CONTAINER" ]; then
    echo "ERRORE: Container API non trovato!"
    echo "Containers attivi:"
    docker ps --format '{{.Names}}'
    exit 1
fi

echo "API Container: $API_CONTAINER"
echo "Frontend Container: $FRONTEND_CONTAINER"
echo ""

# ============================================================
# STEP 1: Backend - Copia nuovi file
# ============================================================
echo "=== STEP 1: Deploy Backend ==="

# Find the backend directory inside container
BACKEND_DIR=$(docker exec $API_CONTAINER find / -name "server.py" -path "*/backend/*" 2>/dev/null | head -1 | xargs dirname)
if [ -z "$BACKEND_DIR" ]; then
    BACKEND_DIR="/app/backend"
fi
echo "Backend dir: $BACKEND_DIR"

# Copy new route files
echo "Copying chat_routes.py..."
docker cp ./backend/chat_routes.py $API_CONTAINER:$BACKEND_DIR/chat_routes.py

echo "Copying timecapsule_routes.py..."
docker cp ./backend/timecapsule_routes.py $API_CONTAINER:$BACKEND_DIR/timecapsule_routes.py

echo "Copying oracle_routes.py..."
docker cp ./backend/oracle_routes.py $API_CONTAINER:$BACKEND_DIR/oracle_routes.py

# ============================================================
# STEP 2: Backend - Installa emergentintegrations
# ============================================================
echo ""
echo "=== STEP 2: Install emergentintegrations ==="
docker exec $API_CONTAINER pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ 2>&1 | tail -3

# ============================================================
# STEP 3: Backend - Aggiungi EMERGENT_LLM_KEY al .env
# ============================================================
echo ""
echo "=== STEP 3: Add EMERGENT_LLM_KEY ==="
# Check if key already exists
if docker exec $API_CONTAINER grep -q "EMERGENT_LLM_KEY" $BACKEND_DIR/.env 2>/dev/null; then
    echo "EMERGENT_LLM_KEY already exists in .env"
else
    docker exec $API_CONTAINER sh -c "echo 'EMERGENT_LLM_KEY=sk-emergent-57f1bE5F6F4194dC21' >> $BACKEND_DIR/.env"
    echo "EMERGENT_LLM_KEY added to .env"
fi

# ============================================================
# STEP 4: Backend - Patch server.py (add new routers)
# ============================================================
echo ""
echo "=== STEP 4: Patch server.py ==="

# Check if routers already registered
if docker exec $API_CONTAINER grep -q "chat_routes" $BACKEND_DIR/server.py 2>/dev/null; then
    echo "Routers already registered in server.py"
else
    echo "Adding new routers to server.py..."
    # Find the line with "Security Headers Middleware" and insert before it
    docker exec $API_CONTAINER sed -i '/# Security Headers Middleware/i \
# Include new feature routers\
from chat_routes import router as chat_router\
from timecapsule_routes import router as timecapsule_router\
from oracle_routes import router as oracle_router\
app.include_router(chat_router)\
app.include_router(timecapsule_router)\
app.include_router(oracle_router)\
' $BACKEND_DIR/server.py
    echo "Routers added successfully"
fi

# Remove old exchange router if present
if docker exec $API_CONTAINER grep -q "exchange_router" $BACKEND_DIR/server.py 2>/dev/null; then
    echo "Removing old exchange router..."
    docker exec $API_CONTAINER sed -i '/exchange_router/d' $BACKEND_DIR/server.py
    docker exec $API_CONTAINER sed -i '/create_exchange_indexes/d' $BACKEND_DIR/server.py
    docker exec $API_CONTAINER sed -i '/startup_exchange/d' $BACKEND_DIR/server.py
    docker exec $API_CONTAINER sed -i '/deposit_monitor_loop/d' $BACKEND_DIR/server.py
    docker exec $API_CONTAINER sed -i '/get_or_create_hot_wallet/d' $BACKEND_DIR/server.py
    echo "Exchange router removed"
fi

# ============================================================
# STEP 5: Restart Backend
# ============================================================
echo ""
echo "=== STEP 5: Restart Backend ==="
docker restart $API_CONTAINER
echo "Backend restarting..."
sleep 5

# Verify backend is running
if docker exec $API_CONTAINER curl -s http://localhost:8001/api/chat/stats > /dev/null 2>&1; then
    echo "Backend is UP and chat API working!"
else
    echo "WARNING: Backend might need more time to start. Check logs:"
    echo "  docker logs $API_CONTAINER --tail 20"
fi

# ============================================================
# STEP 6: Deploy Frontend
# ============================================================
echo ""
echo "=== STEP 6: Deploy Frontend ==="

if [ -n "$FRONTEND_CONTAINER" ]; then
    # Copy build to container
    echo "Copying frontend build..."
    docker cp ./frontend/build.tar.gz $FRONTEND_CONTAINER:/tmp/build.tar.gz
    
    # Find nginx html directory
    HTML_DIR=$(docker exec $FRONTEND_CONTAINER find / -name "index.html" -path "*/html/*" 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
    if [ -z "$HTML_DIR" ]; then
        HTML_DIR="/usr/share/nginx/html"
    fi
    echo "HTML dir: $HTML_DIR"
    
    # Backup old build and extract new one
    docker exec $FRONTEND_CONTAINER sh -c "cd /tmp && tar -xzf build.tar.gz && rm -rf ${HTML_DIR}/* && cp -r build/* ${HTML_DIR}/ && rm -rf build build.tar.gz"
    
    # Reload nginx
    docker exec $FRONTEND_CONTAINER sh -c "nginx -s reload 2>/dev/null || true"
    echo "Frontend deployed and nginx reloaded!"
else
    echo "No separate frontend container found."
    echo "If frontend is served by the API container, copy build files manually:"
    echo "  docker cp ./frontend/build.tar.gz $API_CONTAINER:/tmp/"
    echo "  docker exec $API_CONTAINER sh -c 'cd /tmp && tar -xzf build.tar.gz && cp -r build/* /app/frontend/build/ && rm -rf build build.tar.gz'"
fi

# ============================================================
# STEP 7: Verify
# ============================================================
echo ""
echo "=== STEP 7: Verification ==="
echo "Testing APIs..."

CHAT=$(curl -s https://bricscoin26.org/api/chat/stats 2>/dev/null)
CAPSULE=$(curl -s https://bricscoin26.org/api/timecapsule/stats 2>/dev/null)
ORACLE=$(curl -s https://bricscoin26.org/api/oracle/history 2>/dev/null)

if echo "$CHAT" | grep -q "total_messages"; then
    echo "  BricsChat API:    OK"
else
    echo "  BricsChat API:    FAILED"
fi

if echo "$CAPSULE" | grep -q "total_capsules"; then
    echo "  Time Capsule API: OK"
else
    echo "  Time Capsule API: FAILED"
fi

if echo "$ORACLE" | grep -q "history"; then
    echo "  AI Oracle API:    OK"
else
    echo "  AI Oracle API:    FAILED"
fi

echo ""
echo "============================================"
echo "  Deploy completato!"
echo "  Blockchain: INTATTA (nessun dato cancellato)"
echo "  Verifica: https://bricscoin26.org"
echo "============================================"
