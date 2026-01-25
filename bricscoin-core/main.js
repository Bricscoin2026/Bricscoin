// BricsCoin Core - Main Process
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const Store = require('electron-store');
const { Blockchain, generateWallet, importWalletFromSeed, CONSTANTS } = require('./src/blockchain');

// Configurazione
const store = new Store();
let mainWindow;
let blockchain;
let db;
let miningInterval = null;
let isMining = false;

// Percorso dati
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'bricscoin.db');

// Crea finestra principale
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icons', 'icon.png'),
    titleBarStyle: 'default',
    title: 'BricsCoin Core'
  });

  mainWindow.loadFile('index.html');
  
  // Menu
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Nuovo Wallet', click: () => mainWindow.webContents.send('menu-action', 'new-wallet') },
        { label: 'Importa Wallet', click: () => mainWindow.webContents.send('menu-action', 'import-wallet') },
        { type: 'separator' },
        { label: 'Esci', role: 'quit' }
      ]
    },
    {
      label: 'Blockchain',
      submenu: [
        { label: 'Sincronizza', click: () => syncBlockchain() },
        { label: 'Info Rete', click: () => mainWindow.webContents.send('menu-action', 'network-info') },
        { type: 'separator' },
        { label: 'Esporta Blockchain', click: () => mainWindow.webContents.send('menu-action', 'export-chain') }
      ]
    },
    {
      label: 'Mining',
      submenu: [
        { label: 'Avvia Mining', click: () => mainWindow.webContents.send('menu-action', 'start-mining') },
        { label: 'Ferma Mining', click: () => mainWindow.webContents.send('menu-action', 'stop-mining') }
      ]
    },
    {
      label: 'Aiuto',
      submenu: [
        { label: 'Documentazione', click: () => shell.openExternal('https://bricscoin26.org/node') },
        { label: 'Sito Web', click: () => shell.openExternal('https://bricscoin26.org') },
        { type: 'separator' },
        { label: 'Info', click: () => mainWindow.webContents.send('menu-action', 'about') }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Inizializza blockchain
async function initBlockchain() {
  console.log('Initializing blockchain...');
  console.log('Database path:', dbPath);
  
  db = new Database(dbPath);
  blockchain = new Blockchain(db);
  
  // Eventi blockchain
  blockchain.on('block', (block) => {
    if (mainWindow) {
      mainWindow.webContents.send('new-block', block);
    }
  });
  
  blockchain.on('transaction', (tx) => {
    if (mainWindow) {
      mainWindow.webContents.send('new-transaction', tx);
    }
  });
  
  blockchain.on('sync-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('sync-progress', progress);
    }
  });
  
  blockchain.on('sync-complete', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('sync-complete', data);
    }
  });
  
  await blockchain.initialize();
  
  // Auto-sync all'avvio
  setTimeout(() => syncBlockchain(), 3000);
}

// Sincronizza blockchain
async function syncBlockchain() {
  if (mainWindow) {
    mainWindow.webContents.send('sync-started');
  }
  await blockchain.syncWithNetwork();
  if (mainWindow) {
    mainWindow.webContents.send('sync-complete', { height: blockchain.getHeight() });
  }
}

// IPC Handlers

// Ottieni statistiche
ipcMain.handle('get-stats', async () => {
  return blockchain.getStats();
});

// Ottieni blocchi
ipcMain.handle('get-blocks', async (event, { limit = 10, offset = 0 }) => {
  const blocks = db.prepare(`
    SELECT * FROM blocks ORDER BY height DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  return blocks;
});

// Ottieni blocco
ipcMain.handle('get-block', async (event, height) => {
  return blockchain.getBlock(height);
});

// Crea wallet
ipcMain.handle('create-wallet', async (event, name) => {
  const wallet = generateWallet();
  
  db.prepare(`
    INSERT INTO wallets (address, public_key, private_key_encrypted, seed_phrase_encrypted, name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    wallet.address,
    wallet.publicKey,
    wallet.privateKey, // TODO: Encrypt
    wallet.seedPhrase, // TODO: Encrypt
    name || 'My Wallet',
    new Date().toISOString()
  );
  
  return wallet;
});

// Importa wallet
ipcMain.handle('import-wallet', async (event, { seedPhrase, name }) => {
  const wallet = importWalletFromSeed(seedPhrase);
  
  // Controlla se esiste già
  const existing = db.prepare('SELECT * FROM wallets WHERE address = ?').get(wallet.address);
  if (existing) {
    throw new Error('Wallet already exists');
  }
  
  db.prepare(`
    INSERT INTO wallets (address, public_key, private_key_encrypted, seed_phrase_encrypted, name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    wallet.address,
    wallet.publicKey,
    wallet.privateKey,
    wallet.seedPhrase,
    name || 'Imported Wallet',
    new Date().toISOString()
  );
  
  return wallet;
});

// Lista wallet
ipcMain.handle('get-wallets', async () => {
  const wallets = db.prepare('SELECT address, name, created_at, seed_phrase_encrypted FROM wallets').all();
  
  // Aggiungi saldi dal network
  const walletsWithBalance = [];
  for (const w of wallets) {
    const balance = await blockchain.getBalance(w.address);
    walletsWithBalance.push({
      ...w,
      balance,
      seed_phrase: w.seed_phrase_encrypted // Per mostrare nell'UI
    });
  }
  return walletsWithBalance;
});

// Ottieni wallet completo
ipcMain.handle('get-wallet', async (event, address) => {
  const wallet = db.prepare('SELECT * FROM wallets WHERE address = ?').get(address);
  if (wallet) {
    wallet.balance = await blockchain.getBalance(address);
    wallet.seed_phrase = wallet.seed_phrase_encrypted;
  }
  return wallet;
});

// Ottieni saldo
ipcMain.handle('get-balance', async (event, address) => {
  return await blockchain.getBalance(address);
});

// Invia transazione
ipcMain.handle('send-transaction', async (event, { fromAddress, toAddress, amount }) => {
  const wallet = db.prepare('SELECT * FROM wallets WHERE address = ?').get(fromAddress);
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  
  const balance = await blockchain.getBalance(fromAddress);
  if (balance < amount) {
    throw new Error('Insufficient balance');
  }
  
  // Invia al network principale
  const result = await blockchain.sendTransaction(
    wallet.private_key_encrypted,
    fromAddress,
    toAddress,
    amount
  );
  
  return result;
});

// Broadcast transazione ai peer
async function broadcastTransaction(tx) {
  for (const peer of blockchain.peers) {
    try {
      await fetch(`${peer}/api/transactions/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
    } catch (e) {
      console.error(`Failed to broadcast to ${peer}:`, e.message);
    }
  }
}

// Avvia mining
ipcMain.handle('start-mining', async (event, minerAddress) => {
  if (isMining) return { success: false, message: 'Already mining' };
  
  isMining = true;
  mainWindow.webContents.send('mining-started');
  
  const mine = async () => {
    if (!isMining) return;
    
    try {
      const block = await blockchain.mineBlock(minerAddress, (progress) => {
        mainWindow.webContents.send('mining-progress', progress);
      });
      
      mainWindow.webContents.send('block-mined', block);
      
      // Broadcast blocco
      broadcastBlock(block);
      
    } catch (e) {
      console.error('Mining error:', e.message);
    }
    
    if (isMining) {
      setTimeout(mine, 100);
    }
  };
  
  mine();
  return { success: true };
});

// Ferma mining
ipcMain.handle('stop-mining', async () => {
  isMining = false;
  mainWindow.webContents.send('mining-stopped');
  return { success: true };
});

// Broadcast blocco ai peer
async function broadcastBlock(block) {
  for (const peer of blockchain.peers) {
    try {
      await fetch(`${peer}/api/blocks/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block)
      });
    } catch (e) {
      console.error(`Failed to broadcast block to ${peer}:`, e.message);
    }
  }
}

// Sincronizza
ipcMain.handle('sync', async () => {
  await syncBlockchain();
  return blockchain.getStats();
});

// Aggiungi peer
ipcMain.handle('add-peer', async (event, url) => {
  blockchain.addPeer(url);
  return { success: true };
});

// Ottieni peer
ipcMain.handle('get-peers', async () => {
  return Array.from(blockchain.peers);
});

// Ottieni transazioni mempool
ipcMain.handle('get-mempool', async () => {
  return Array.from(blockchain.mempool.values());
});

// App events
app.whenReady().then(async () => {
  await initBlockchain();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});
