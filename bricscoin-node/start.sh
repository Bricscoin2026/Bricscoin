#!/bin/bash
# BricsCoin Node Startup Script

echo "=========================================="
echo "   BricsCoin Node Starting..."
echo "=========================================="
echo ""
echo "Node ID: ${NODE_ID:-auto-generated}"
echo "Node URL: ${NODE_URL:-not set}"
echo "Seed Nodes: ${SEED_NODES:-https://bricscoin26.org}"
echo ""

# Wait for MongoDB
echo "Waiting for MongoDB..."
sleep 5

# Start the node
echo "Starting BricsCoin node..."
exec uvicorn server:app --host 0.0.0.0 --port 8001 --log-level info
