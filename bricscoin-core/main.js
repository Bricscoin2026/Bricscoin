const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const SERVER = 'https://bricscoin26.org';
let win, walletsPath, mining = false;

const sha256 = d => crypto.createHash('sha256').update(d).digest('hex');

const makeWallet = () => {
  const priv = crypto.randomBytes(32).toString('hex');
  const pub = sha256(priv);
  const addr = 'BRICS' + sha256(pub).substring(0, 40);
  const words = 'apple banana cherry dog elephant fish grape hat ice jam kite lamp moon nest orange pear quilt rose star tree'.split(' ');
  const seed = Array(12).fill(0).map(() => words[Math.floor(Math.random() * words.length)]).join(' ');
  return { address: addr, privateKey: priv, seedPhrase: seed };
};

const getWallets = () => {
  try { return JSON.parse(fs.readFileSync(walletsPath, 'utf8')); } 
  catch { return []; }
};

const saveWallets = w => fs.writeFileSync(walletsPath, JSON.stringify(w));

app.whenReady().then(() => {
  walletsPath = path.join(app.getPath('userData'), 'wallets.json');
  
  win = new BrowserWindow({
    width: 1100, height: 750,
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
