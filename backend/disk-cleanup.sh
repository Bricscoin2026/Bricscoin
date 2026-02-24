#!/bin/bash
# BricsCoin Server Disk Cleanup Script
# Prevents disk space from filling up (has crashed 2x before)
# Run via cron: 0 3 * * 0 /app/backend/disk-cleanup.sh >> /var/log/bricscoin-cleanup.log 2>&1

echo "=== BricsCoin Disk Cleanup - $(date) ==="

# Docker cleanup (remove unused images, containers, volumes)
if command -v docker &> /dev/null; then
    echo "Cleaning Docker..."
    docker system prune -af --volumes 2>/dev/null || true
fi

# Systemd journal cleanup
if command -v journalctl &> /dev/null; then
    echo "Cleaning journals..."
    journalctl --vacuum-size=100M 2>/dev/null || true
fi

# Clean old log files (older than 14 days)
echo "Cleaning old logs..."
find /var/log -name "*.log.*" -mtime +14 -delete 2>/dev/null || true
find /var/log -name "*.gz" -mtime +14 -delete 2>/dev/null || true
find /tmp -type f -mtime +7 -delete 2>/dev/null || true

# Clean pip cache
pip cache purge 2>/dev/null || true

# Clean yarn cache
yarn cache clean 2>/dev/null || true

# Report disk usage
echo "Current disk usage:"
df -h / | tail -1
echo "=== Cleanup complete ==="
