const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const MAIN_NODE = 'https://bricscoin26.org';
let mainWindow;
let isMining = false;
let walletsFile;

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function loadWalletsFromFile() {
  try {
    if (fs.existsSync(walletsFile)) {
      return JSON.parse(fs.readFileSync(walletsFile, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading wallets:', e);
  }
  return [];
}

function saveWalletsToFile(wallets) {
  try {
    fs.writeFileSync(walletsFile, JSON.stringify(wallets, null, 2));
    console.log('Wallets saved to:', walletsFile);
  } catch (e) {
    console.error('Error saving wallets:', e);
  }
}

function generateWallet() {
  const privateKey = crypto.randomBytes(32).toString('hex');
  const publicKey = sha256(privateKey);
  const address = 'BRICS' + sha256(publicKey).substring(0, 40);
  const words = ['apple','banana','cherry','dragon','eagle','flower','garden','honey','island','jungle','knight','lemon','mountain','night','ocean','planet','queen','river','sunset','tiger','umbrella','valley','winter','yellow'];
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
    }
  });
  mainWindow.loadFile('index.html');
  
  // Open DevTools to see errors
  // mainWindow.webContents.openDevTools();
}

// Get stats
ipcMain.handle('get-stats', async () => {
  try {
    const res = await fetch(`${MAIN_NODE}/api/network/stats`);
    return await res.json();
  } catch (e) { return null; }
});

// Get blocks
ipcMain.handle('get-blocks', async () => {
  try {
    const res = await fetch(`${MAIN_NODE}/api/blocks?limit=10`);
    const data = await res.json();
    return data.blocks || [];
  } catch (e) { return []; }
});

// Create wallet
ipcMain.handle('create-wallet', async (event, name) => {
  console.log('=== CREATE WALLET CALLED ===');
  console.log('Name:', name);
  
  const wallet = generateWallet();
  wallet.name = name || 'My Wallet';
  wallet.createdAt = new Date().toISOString();
  wallet.balance = 0;
  
  console.log('Generated wallet:', wallet.address);
  
  const wallets = loadWalletsFromFile();
  wallets.push(wallet);
  saveWalletsToFile(wallets);
  
  console.log('Total wallets now:', wallets.length);
  return wallet;
});

// Get wallets
ipcMain.handle('get-wallets', async () => {
  const wallets = loadWalletsFromFile();
  
  for (const w of wallets) {
    try {
      const res = await fetch(`${MAIN_NODE}/api/wallet/${w.address}/balance`);
      const data = await res.json();
      w.balance = data.balance || 0;
    } catch (e) { w.balance = 0; }
  }
  
  return wallets;
});

// Send tx
ipcMain.handle('send-tx', async (event, from, to, amount) => {
  const wallets = loadWalletsFromFile();
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
  
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
  return await res.json();
});

// Mining
ipcMain.handle('start-mining', async (event, address) => {
  if (isMining) return;
  isMining = true;
  mine(address);
});

ipcMain.handle('stop-mining', async () => { isMining = false; });

async function mine(address) {
  while (isMining) {
    try {
      const res = await fetch(`${MAIN_NODE}/api/mining/template`);
      if (!res.ok) { await new Promise(r => setTimeout(r, 5000)); continue; }
      const t = await res.json();
      
      mainWindow.webContents.send('mining-info', { block: t.index, diff: t.difficulty });
      
      const target = '0'.repeat(t.difficulty);
      let nonce = 0;
      const start = Date.now();
      
      while (isMining) {
        const hash = sha256(JSON.stringify({ index: t.index, previous_hash: t.previous_hash, timestamp: t.timestamp, transactions: t.transactions || [], miner: address, nonce }));
        
        if (hash.startsWith(target)) {
          await fetch(`${MAIN_NODE}/api/mining/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: t.index, previous_hash: t.previous_hash, timestamp: t.timestamp, transactions: t.transactions || [], miner: address, nonce, hash, difficulty: t.difficulty, proof: nonce })
          });
          mainWindow.webContents.send('block-found', { block: t.index });
          break;
        }
        
        nonce++;
        if (nonce % 10000 === 0) {
          mainWindow.webContents.send('mining-progress', { hashrate: Math.round(nonce / ((Date.now() - start) / 1000)), nonce });
          await new Promise(r => setTimeout(r, 1));
        }
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

app.whenReady().then(() => {
  // Set wallets file path
  walletsFile = path.join(app.getPath('userData'), 'wallets.json');
  console.log('Wallets file:', walletsFile);
  
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
