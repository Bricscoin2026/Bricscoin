// BricsCoin Core - Preload Script
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bricscoin', {
  // Stats
  getStats: () => ipcRenderer.invoke('get-stats'),
  getNetworkStats: () => ipcRenderer.invoke('get-network-stats'),
  
  // Blocks
  getBlocks: (limit, offset) => ipcRenderer.invoke('get-blocks', { limit, offset }),
  getBlock: (height) => ipcRenderer.invoke('get-block', height),
  
  // Wallet
  createWallet: (name) => ipcRenderer.invoke('create-wallet', name),
  importWallet: (seedPhrase, name) => ipcRenderer.invoke('import-wallet', { seedPhrase, name }),
  getWallets: () => ipcRenderer.invoke('get-wallets'),
  getWallet: (address) => ipcRenderer.invoke('get-wallet', address),
  getBalance: (address) => ipcRenderer.invoke('get-balance', address),
  sendTransaction: (fromAddress, toAddress, amount) => 
    ipcRenderer.invoke('send-transaction', { fromAddress, toAddress, amount }),
  
  // Mining
  startMining: (minerAddress) => ipcRenderer.invoke('start-mining', minerAddress),
  stopMining: () => ipcRenderer.invoke('stop-mining'),
  
  // Sync
  syncBlockchain: () => ipcRenderer.invoke('sync-blockchain'),
  
  // Events
  on: (channel, callback) => {
    const validChannels = [
      'new-block', 'sync-started', 'sync-progress', 'sync-complete', 'sync-error',
      'mining-started', 'mining-stopped', 'mining-progress', 'block-mined', 'mining-error',
      'menu-action'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Info
  version: '1.0.0',
  platform: process.platform
});
