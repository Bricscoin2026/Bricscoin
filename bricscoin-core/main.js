const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const crypto = require('crypto');

const store = new Store();
const MAIN_NODE = 'https://bricscoin26.org';

let mainWindow;
let isMining = false;

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generateWallet() {
  const privateKey = crypto.randomBytes(32).toString('hex');
  const publicKey = sha256(privateKey);
  const address = 'BRICS' + sha256(publicKey).substring(0, 40);
  const words = ['apple', 'banana', 'cherry', 'dragon', 'eagle', 'flower', 'garden', 'honey', 'island', 'jungle', 'knight', 'lemon', 'mountain', 'night', 'ocean', 'planet', 'queen', 'river', 'sunset', 'tiger', 'umbrella', 'valley', 'winter', 'yellow'];
  const seedPhrase = Array(12).fill(0).map(() => words[Math.floor(Math.random() * words.length)]).join(' ');
  return { address, privateKey, publicKey, seedPhrase };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'BricsCoin Core'
  });
  mainWindow.loadFile('index.html');
}

// IPC: Get stats
ipcMain.handle('get-stats', async () => {
  try {
    const res = await fetch(`${MAIN_NODE}/api/network/stats`);
    return await res.json();
  } catch (e) {
    return null;
  }
});

// IPC: Get blocks
ipcMain.handle('get-blocks', async () => {
  try {
    const res = await fetch(`${MAIN_NODE}/api/blocks?limit=10`);
    const data = await res.json();
    return data.blocks || [];
  } catch (e) {
    return [];
  }
});

// IPC: Create wallet
ipcMain.handle('create-wallet', async (event, name) => {
  console.log('Creating wallet with name:', name);
  try {
    const wallet = generateWallet();
    wallet.name = name || 'My Wallet';
    wallet.createdAt = new Date().toISOString();
    wallet.balance = 0;
    
    const wallets = store.get('wallets', []);
    wallets.push(wallet);
    store.set('wallets', wallets);
    
    console.log('Wallet created:', wallet.address);
    return wallet;
  } catch (e) {
    console.error('Error creating wallet:', e);
    throw e;
  }
});

// IPC: Get wallets
ipcMain.handle('get-wallets', async () => {
  const wallets = store.get('wallets', []);
  
  // Fetch balances
  for (const w of wallets) {
    try {
      const res = await fetch(`${MAIN_NODE}/api/wallet/${w.address}/balance`);
      const data = await res.json();
      w.balance = data.balance || 0;
    } catch (e) {
      w.balance = 0;
    }
  }
  
  return wallets;
});

// IPC: Send transaction
ipcMain.handle('send-tx', async (event, from, to, amount) => {
  const wallets = store.get('wallets', []);
  const wallet = wallets.find(w => w.address === from);
  if (!wallet) throw new Error('Wallet not found');
  
  const res = await fetch(`${MAIN_NODE}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender_address: from,
      sender_private_key: wallet.privateKey,
      recipient_address: to,
      amount: parseFloat(amount)
    })
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed');
  }
  return await res.json();
});

// IPC: Start mining
ipcMain.handle('start-mining', async (event, address) => {
  if (isMining) return;
  isMining = true;
  mine(address);
});

// IPC: Stop mining
ipcMain.handle('stop-mining', async () => {
  isMining = false;
});

async function mine(address) {
  while (isMining) {
    try {
      const res = await fetch(`${MAIN_NODE}/api/mining/template`);
      if (!res.ok) { await sleep(5000); continue; }
      const template = await res.json();
      
      mainWindow.webContents.send('mining-info', { block: template.index, difficulty: template.difficulty });
      
      const target = '0'.repeat(template.difficulty);
      let nonce = 0;
      const start = Date.now();
      
      while (isMining) {
        const data = JSON.stringify({
          index: template.index,
          previous_hash: template.previous_hash,
          timestamp: template.timestamp,
          transactions: template.transactions || [],
          miner: address,
          nonce
        });
        
        const hash = sha256(data);
        
        if (hash.startsWith(target)) {
          const submitRes = await fetch(`${MAIN_NODE}/api/mining/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              index: template.index,
              previous_hash: template.previous_hash,
              timestamp: template.timestamp,
              transactions: template.transactions || [],
              miner: address,
              nonce, hash,
              difficulty: template.difficulty,
              proof: nonce
            })
          });
          
          if (submitRes.ok) {
            mainWindow.webContents.send('block-found', { block: template.index, reward: 50 });
          }
          break;
        }
        
        nonce++;
        if (nonce % 10000 === 0) {
          const elapsed = (Date.now() - start) / 1000;
          mainWindow.webContents.send('mining-progress', { hashrate: Math.round(nonce/elapsed), nonce });
          await sleep(1);
        }
      }
    } catch (e) {
      console.error('Mining error:', e);
      await sleep(5000);
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
