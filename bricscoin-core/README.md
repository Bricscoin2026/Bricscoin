# BricsCoin Core - Full Node Wallet

**BricsCoin Core** is the official desktop wallet for BricsCoin. It works as a full node, storing the blockchain locally and contributing to network decentralization.

## Features

- 🔐 **Secure Wallet**: Generates 12-word BIP39 seed phrase
- ⛏️ **Real Mining**: Mine BRICS on the main network
- 🌐 **Full Node**: Downloads and verifies the blockchain
- 🔄 **Auto-Sync**: Automatically syncs with bricscoin26.org
- 💾 **Local Storage**: Your data stays on your computer

## Requirements

- **Node.js** >= 18
- **npm** or **yarn**

**No compilation needed!** Works on Mac, Windows, and Linux without build tools.

## Installation

### 1. Extract the archive

```bash
tar -xzf BricsCoin-Core-Source.tar.gz
cd bricscoin-core
```

### 2. Install dependencies

```bash
npm install
```
or
```bash
yarn install
```

### 3. Start the application

```bash
npm start
```
or
```bash
yarn start
```

## Usage

### Create a New Wallet
1. Go to **Wallet** section
2. Click **New Wallet**
3. **SAVE THE 12 WORDS** - They are the only way to recover your funds!

### Mining
1. Go to **Mining** section
2. Select a wallet to receive rewards
3. Click **Start Mining**
4. Mined blocks will appear on https://bricscoin26.org

### Sync
The blockchain syncs automatically on startup and every 30 seconds.

## Important

- Blocks mined with BricsCoin Core are **real** and visible on the main network
- Transactions are sent to the **real** blockchain
- Your wallet balance is fetched from the main network

## Support

- **Website**: https://bricscoin26.org
- **Node Guide**: https://bricscoin26.org/node

## License

MIT License - Open source
