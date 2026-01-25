const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const SERVER = 'https://bricscoin26.org';
let win, walletsPath, mining = false;

const sha256 = d => crypto.createHash('sha256').update(d).digest('hex');

// BIP39-like word list (simplified)
const WORD_LIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
  'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
  'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
  'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
  'animal', 'ankle', 'announce', 'annual', 'answer', 'antenna', 'antique', 'anxiety',
  'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch',
  'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army'
];

const makeWallet = (seedPhrase = null) => {
  let seed;
  if (seedPhrase) {
    // Import from seed phrase
    seed = sha256(seedPhrase);
  } else {
    // Generate new seed phrase
    const words = [];
    for (let i = 0; i < 12; i++) {
      words.push(WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]);
    }
    seedPhrase = words.join(' ');
    seed = sha256(seedPhrase);
  }
  
  const priv = sha256(seed + 'privkey');
  const pub = sha256(priv);
  const addr = 'BRICS' + sha256(pub).substring(0, 40);
  
  return { address: addr, privateKey: priv, seedPhrase: seedPhrase };
};

const getWallets = () => {
  try { return JSON.parse(fs.readFileSync(walletsPath, 'utf8')); } 
  catch { return []; }
};

const saveWallets = w => fs.writeFileSync(walletsPath, JSON.stringify(w));

app.whenReady().then(() => {
  walletsPath = path.join(app.getPath('userData'), 'wallets.json');
  
  win = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  win.loadFile('index.html');
});

ipcMain.handle('stats', async () => {
  try { return await (await fetch(SERVER + '/api/network/stats')).json(); } 
  catch { return null; }
});

ipcMain.handle('blocks', async () => {
  try { return (await (await fetch(SERVER + '/api/blocks?limit=10')).json()).blocks || []; } 
  catch { return []; }
});

ipcMain.handle('wallets', async () => {
  const list = getWallets();
  for (const w of list) {
    try { w.balance = (await (await fetch(SERVER + '/api/wallet/' + w.address + '/balance')).json()).balance || 0; }
    catch { w.balance = 0; }
  }
  return list;
});

ipcMain.handle('newwallet', (e, name) => {
  const w = makeWallet();
  w.name = name || 'Wallet';
  const list = getWallets();
  list.push(w);
  saveWallets(list);
  return w;
});

// Import wallet from seed phrase
ipcMain.handle('importwallet', (e, name, seedPhrase) => {
  const w = makeWallet(seedPhrase.trim().toLowerCase());
  w.name = name || 'Imported Wallet';
  const list = getWallets();
  
  // Check if wallet already exists
  if (list.find(x => x.address === w.address)) {
    throw new Error('Wallet already exists');
  }
  
  list.push(w);
  saveWallets(list);
  return w;
});

// Delete wallet
ipcMain.handle('deletewallet', (e, address) => {
  const list = getWallets();
  const idx = list.findIndex(x => x.address === address);
  if (idx === -1) throw new Error('Wallet not found');
  list.splice(idx, 1);
  saveWallets(list);
  return true;
});

// Copy to clipboard
ipcMain.handle('copy', (e, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('send', async (e, from, to, amt) => {
  const list = getWallets();
  const w = list.find(x => x.address === from);
  if (!w) throw new Error('No wallet');
  const r = await fetch(SERVER + '/api/transactions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender_address: from, sender_private_key: w.privateKey, recipient_address: to, amount: Number(amt) })
  });
  if (!r.ok) throw new Error((await r.json()).detail || 'Failed');
  return true;
});

// Get transactions for a wallet
ipcMain.handle('transactions', async (e, address) => {
  try {
    const r = await fetch(SERVER + '/api/wallet/' + address + '/transactions');
    if (!r.ok) return [];
    const data = await r.json();
    return data.transactions || [];
  } catch { return []; }
});

ipcMain.handle('mine', async (e, addr) => {
  if (mining) return;
  mining = true;
  
  while (mining) {
    try {
      const t = await (await fetch(SERVER + '/api/mining/template')).json();
      win.webContents.send('minfo', { block: t.index, diff: t.difficulty });
      
      let n = 0, start = Date.now();
      while (mining) {
        const h = sha256(JSON.stringify({ index: t.index, previous_hash: t.previous_hash, timestamp: t.timestamp, transactions: t.transactions || [], miner: addr, nonce: n }));
        if (h.startsWith('0'.repeat(t.difficulty))) {
          await fetch(SERVER + '/api/mining/submit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: t.index, previous_hash: t.previous_hash, timestamp: t.timestamp, transactions: t.transactions || [], miner: addr, nonce: n, hash: h, difficulty: t.difficulty, proof: n })
          });
          win.webContents.send('found', { block: t.index });
          break;
        }
        n++;
        if (n % 5000 === 0) {
          win.webContents.send('mprog', { hr: Math.round(n / ((Date.now() - start) / 1000)), n });
          await new Promise(r => setImmediate(r));
        }
      }
    } catch { await new Promise(r => setTimeout(r, 3000)); }
  }
});

ipcMain.handle('stopmine', () => { mining = false; });

app.on('window-all-closed', () => app.quit());
