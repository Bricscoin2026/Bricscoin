const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bc', {
  // Core functions
  stats: () => ipcRenderer.invoke('stats'),
  blocks: () => ipcRenderer.invoke('blocks'),
  wallets: () => ipcRenderer.invoke('wallets'),
  newwallet: n => ipcRenderer.invoke('newwallet', n),
  importwallet: (n, s) => ipcRenderer.invoke('importwallet', n, s),
  deletewallet: a => ipcRenderer.invoke('deletewallet', a),
  copy: t => ipcRenderer.invoke('copy', t),
  send: (f, t, a) => ipcRenderer.invoke('send', f, t, a),
  transactions: a => ipcRenderer.invoke('transactions', a),

  // P2P functions
  getPeers: () => ipcRenderer.invoke('getpeers'),
  syncStatus: () => ipcRenderer.invoke('syncstatus'),
  getNodeId: () => ipcRenderer.invoke('getnodeid'),
  setServer: url => ipcRenderer.invoke('setserver', url),
  getServer: () => ipcRenderer.invoke('getserver'),

  // PQC Quantum-Safe functions
  pqcCreate: name => ipcRenderer.invoke('pqc:create', name),
  pqcImport: data => ipcRenderer.invoke('pqc:import', data),
  pqcImportFile: json => ipcRenderer.invoke('pqc:importfile', json),
  pqcRecoverSeed: (seed, name) => ipcRenderer.invoke('pqc:recoverseed', seed, name),
  pqcWallets: () => ipcRenderer.invoke('pqc:wallets'),
  pqcDelete: addr => ipcRenderer.invoke('pqc:delete', addr),
  pqcSend: (from, to, amt) => ipcRenderer.invoke('pqc:send', from, to, amt),
  pqcStats: () => ipcRenderer.invoke('pqc:stats'),
  pqcBackup: addr => ipcRenderer.invoke('pqc:backup', addr)
});
