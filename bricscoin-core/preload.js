const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bricscoin', {
  // Network
  getNetworkStats: () => ipcRenderer.invoke('get-network-stats'),
  getBlocks: (limit) => ipcRenderer.invoke('get-blocks', limit),
  getBalance: (address) => ipcRenderer.invoke('get-balance', address),
  
  // Wallet
  createWallet: (name) => ipcRenderer.invoke('create-wallet', name),
  getWallets: () => ipcRenderer.invoke('get-wallets'),
  sendTransaction: (from, to, amount) => ipcRenderer.invoke('send-transaction', { fromAddress: from, toAddress: to, amount }),
  
  // Mining
  startMining: (address) => ipcRenderer.invoke('start-mining', address),
  stopMining: () => ipcRenderer.invoke('stop-mining'),
  
  // Events
  onMiningStatus: (callback) => ipcRenderer.on('mining-status', (e, data) => callback(data)),
  onMiningProgress: (callback) => ipcRenderer.on('mining-progress', (e, data) => callback(data)),
  onBlockFound: (callback) => ipcRenderer.on('block-found', (e, data) => callback(data))
});
