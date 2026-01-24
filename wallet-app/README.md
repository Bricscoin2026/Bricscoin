# BricsCoin Wallet

Desktop wallet application for BricsCoin cryptocurrency.

## Downloads

Download the wallet for your operating system:

| Platform | Download |
|----------|----------|
| **Windows** | [BricsCoin-Wallet-Setup.exe](../../releases/latest) |
| **macOS** | [BricsCoin-Wallet.dmg](../../releases/latest) |
| **Linux** | [BricsCoin-Wallet.AppImage](../../releases/latest) |

## Features

- 💼 Create multiple wallets
- 📤 Send BRICS to any address
- 📥 Receive with QR code
- 📊 Transaction history
- 🔐 Private keys stored locally
- 🌐 Connect to BricsCoin network

## Building from Source

### Prerequisites
- Node.js 18+
- npm or yarn

### Build

```bash
cd wallet-app

# Install dependencies
npm install

# Run in development
npm start

# Build for all platforms
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Security

⚠️ **Important**: Your private keys are stored locally on your device. 
- Never share your private key
- Always backup your wallet
- We cannot recover lost keys

## Connect to Network

The wallet connects to the BricsCoin mainnet:
- API: http://5.161.254.163:8001

## License

MIT License
