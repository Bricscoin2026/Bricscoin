// BricsCoin Core - Preload Script
const { contextBridge, ipcRenderer } = require('electron');

// Esponi API sicure al renderer
contextBridge.exposeInMainWorld('bricscoin', {
  // Statistiche
  getStats: () => ipcRenderer.invoke('get-stats'),
  
  // Blocchi
  getBlocks: (params) => ipcRenderer.invoke('get-blocks', params),
  getBlock: (height) => ipcRenderer.invoke('get-block', height),
  
  // Wallet
  createWallet: (name) => ipcRenderer.invoke('create-wallet', name),
  importWallet: (data) => ipcRenderer.invoke('import-wallet', data),
  getWallets: () => ipcRenderer.invoke('get-wallets'),
  getWallet: (address) => ipcRenderer.invoke('get-wallet', address),
  getBalance: (address) => ipcRenderer.invoke('get-balance', address),
  
  // Transazioni
  sendTransaction: (data) => ipcRenderer.invoke('send-transaction', data),
  getMempool: () => ipcRenderer.invoke('get-mempool'),
  
  // Mining
  startMining: (address) => ipcRenderer.invoke('start-mining', address),
  stopMining: () => ipcRenderer.invoke('stop-mining'),
  
  // Network
  sync: () => ipcRenderer.invoke('sync'),
  addPeer: (url) => ipcRenderer.invoke('add-peer', url),
  getPeers: () => ipcRenderer.invoke('get-peers'),
  
  // Eventi
  onNewBlock: (callback) => ipcRenderer.on('new-block', (_, data) => callback(data)),
  onNewTransaction: (callback) => ipcRenderer.on('new-transaction', (_, data) => callback(data)),
  onMiningStarted: (callback) => ipcRenderer.on('mining-started', () => callback()),
  onMiningStopped: (callback) => ipcRenderer.on('mining-stopped', () => callback()),
  onMiningProgress: (callback) => ipcRenderer.on('mining-progress', (_, data) => callback(data)),
  onBlockMined: (callback) => ipcRenderer.on('block-mined', (_, data) => callback(data)),
  onSyncStarted: (callback) => ipcRenderer.on('sync-started', () => callback()),
  onSyncProgress: (callback) => ipcRenderer.on('sync-progress', (_, data) => callback(data)),
  onSyncComplete: (callback) => ipcRenderer.on('sync-complete', (_, data) => callback(data)),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_, action) => callback(action)),
  
  // Info
  version: '1.0.0',
  platform: process.platform
});
