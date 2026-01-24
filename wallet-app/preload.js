const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getWallets: () => ipcRenderer.invoke('get-wallets'),
  saveWallets: (wallets) => ipcRenderer.invoke('save-wallets', wallets),
  exportWallet: (wallet, filePath) => ipcRenderer.invoke('export-wallet', wallet, filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform
});
