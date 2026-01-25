const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bc', {
  stats: () => ipcRenderer.invoke('stats'),
  blocks: () => ipcRenderer.invoke('blocks'),
  wallets: () => ipcRenderer.invoke('wallets'),
  newwallet: n => ipcRenderer.invoke('newwallet', n),
  send: (f, t, a) => ipcRenderer.invoke('send', f, t, a),
  mine: a => ipcRenderer.invoke('mine', a),
  stopmine: () => ipcRenderer.invoke('stopmine'),
  on: (ch, cb) => ipcRenderer.on(ch, (e, d) => cb(d))
});
