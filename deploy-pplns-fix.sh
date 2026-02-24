#!/bin/bash
# Deploy PPLNS stratum fix to the PPLNS server
# Usage: bash deploy-pplns-fix.sh
#
# CRITICAL FIX: double_sha256 (was single SHA-256, blocks were rejected)

PPLNS_HOST="157.180.123.105"
PPLNS_USER="root"
REMOTE_DIR="/root/bricscoin-pplns"

echo "=== Deploying PPLNS Stratum Fix ==="
echo "Target: $PPLNS_USER@$PPLNS_HOST"

# Copy the fixed stratum file
echo "[1/4] Copying fixed p2pool_stratum.py..."
scp p2pool-pplns-node/p2pool_stratum.py "$PPLNS_USER@$PPLNS_HOST:$REMOTE_DIR/p2pool_stratum.py"

# Copy requirements
echo "[2/4] Copying requirements..."
scp p2pool-pplns-node/requirements.txt "$PPLNS_USER@$PPLNS_HOST:$REMOTE_DIR/requirements.txt"

# Install deps and restart on remote
echo "[3/4] Installing dependencies on remote..."
ssh "$PPLNS_USER@$PPLNS_HOST" "cd $REMOTE_DIR && pip3 install -r requirements.txt"

echo "[4/4] Restarting PPLNS stratum service..."
ssh "$PPLNS_USER@$PPLNS_HOST" "cd $REMOTE_DIR && docker compose restart pplns-stratum 2>/dev/null || supervisorctl restart pplns-stratum 2>/dev/null || (pkill -f p2pool_stratum && sleep 2 && cd $REMOTE_DIR && nohup python3 p2pool_stratum.py > /var/log/pplns-stratum.log 2>&1 &)"

echo ""
echo "=== Deployment Complete ==="
echo "Verify: ssh $PPLNS_USER@$PPLNS_HOST 'curl -s http://localhost:8080/status'"
