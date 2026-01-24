#!/bin/bash
# BricsCoin - Hetzner/VPS Setup Script
# Run as root: sudo bash setup-hetzner.sh

set -e

echo "🪙 BricsCoin Server Setup"
echo "========================="

# Update system
echo "📦 Updating system..."
apt update && apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose
echo "📦 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    apt install -y docker-compose-plugin
fi

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3333/tcp  # Stratum mining
ufw allow 8001/tcp  # API
ufw --force enable

# Create bricscoin user
echo "👤 Creating bricscoin user..."
if ! id "bricscoin" &>/dev/null; then
    useradd -m -s /bin/bash bricscoin
    usermod -aG docker bricscoin
fi

# Clone repository (if not exists)
echo "📂 Setting up BricsCoin..."
cd /home/bricscoin
if [ ! -d "Bricscoin" ]; then
    sudo -u bricscoin git clone https://github.com/Bricscoin2026/Bricscoin.git
fi
cd Bricscoin

# Create .env file
echo "⚙️ Creating configuration..."
if [ ! -f ".env" ]; then
    PUBLIC_IP=$(curl -s ifconfig.me)
    cat > .env << EOF
NODE_ID=mainnet-$(hostname)
NODE_URL=http://${PUBLIC_IP}:8001
SEED_NODES=
MONGO_URL=mongodb://mongo:27017
DB_NAME=bricscoin
STRATUM_PORT=3333
REACT_APP_BACKEND_URL=http://${PUBLIC_IP}:8001
EOF
    chown bricscoin:bricscoin .env
fi

# Start services
echo "🚀 Starting BricsCoin services..."
sudo -u bricscoin docker compose -f docker-compose.prod.yml up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "✅ BricsCoin Server Setup Complete!"
echo "===================================="
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "🌐 Access Points:"
PUBLIC_IP=$(curl -s ifconfig.me)
echo "   Web UI:  http://${PUBLIC_IP}:3000"
echo "   API:     http://${PUBLIC_IP}:8001/api"
echo "   Stratum: stratum+tcp://${PUBLIC_IP}:3333"
echo ""
echo "⛏️ To mine with ASIC:"
echo "   Pool URL: stratum+tcp://${PUBLIC_IP}:3333"
echo "   Worker:   YOUR_BRICS_ADDRESS.worker1"
echo "   Password: x"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "   Restart:      docker compose -f docker-compose.prod.yml restart"
echo "   Stop:         docker compose -f docker-compose.prod.yml down"
echo ""
