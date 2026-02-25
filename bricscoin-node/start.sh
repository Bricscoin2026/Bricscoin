#!/bin/bash
# BricsCoin Node Startup Script

echo "=========================================="
echo "   BRICScoin Full Node Starting..."
echo "=========================================="
echo ""
echo "Node ID: ${NODE_ID:-auto-generated}"
echo "Seed Node: ${SEED_NODE:-https://bricscoin26.org}"
echo "Port: ${NODE_PORT:-8333}"
echo ""

# Wait for MongoDB
echo "Waiting for MongoDB..."
sleep 5

# Start the node
echo "Starting BRICScoin node..."
exec python node.py
