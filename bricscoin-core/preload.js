const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getStats: () => ipcRenderer.invoke('get-stats'),
  getBlocks: () => ipcRenderer.invoke('get-blocks'),
  createWallet: (name) => ipcRenderer.invoke('create-wallet', name),
  getWallets: () => ipcRenderer.invoke('get-wallets'),
  sendTx: (from, to, amount) => ipcRenderer.invoke('send-tx', from, to, amount),
  startMining: (address) => ipcRenderer.invoke('start-mining', address),
  stopMining: () => ipcRenderer.invoke('stop-mining'),
  
  onMiningInfo: (cb) => ipcRenderer.on('mining-info', (e, d) => cb(d)),
  onMiningProgress: (cb) => ipcRenderer.on('mining-progress', (e, d) => cb(d)),
  onBlockFound: (cb) => ipcRenderer.on('block-found', (e, d) => cb(d))
});
