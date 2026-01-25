const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bc', {
  stats: () => ipcRenderer.invoke('stats'),
  blocks: () => ipcRenderer.invoke('blocks'),
  wallets: () => ipcRenderer.invoke('wallets'),
  newwallet: n => ipcRenderer.invoke('newwallet', n),
  importwallet: (n, s) => ipcRenderer.invoke('importwallet', n, s),
  deletewallet: a => ipcRenderer.invoke('deletewallet', a),
  copy: t => ipcRenderer.invoke('copy', t),
  send: (f, t, a) => ipcRenderer.invoke('send', f, t, a),
  transactions: a => ipcRenderer.invoke('transactions', a)
});
