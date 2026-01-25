// BricsCoin Core - Main Process
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { Blockchain, generateWallet, importWalletFromSeed, CONSTANTS } = require('./src/blockchain');

const store = new Store();
let mainWindow;
let blockchain;
let isMining = false;

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
    title: 'BricsCoin Core'
  });

  mainWindow.loadFile('index.html');
  
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Wallet', click: () => mainWindow.webContents.send('menu-action', 'new-wallet') },
        { label: 'Import Wallet', click: () => mainWindow.webContents.send('menu-action', 'import-wallet') },
        { type: 'separator' },
        { label: 'Quit', role: 'quit' }
      ]
    },
    {
      label: 'Blockchain',
      submenu: [
        { label: 'Sync Now', click: () => syncBlockchain() },
        { label: 'Network Info', click: () => mainWindow.webContents.send('menu-action', 'network-info') }
      ]
    },
    {
      label: 'Mining',
      submenu: [
        { label: 'Start Mining', click: () => mainWindow.webContents.send('menu-action', 'start-mining') },
        { label: 'Stop Mining', click: () => mainWindow.webContents.send('menu-action', 'stop-mining') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => shell.openExternal('https://bricscoin26.org/node') },
        { label: 'Website', click: () => shell.openExternal('https://bricscoin26.org') }
      ]
    }
  ];
  
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  mainWindow.on('closed', () => { mainWindow = null; });
}

async function initBlockchain() {
  const userDataPath = app.getPath('userData');
  console.log('Database path:', userDataPath);
  
  blockchain = new Blockchain(userDataPath);
  
  blockchain.on('block', (block) => {
    if (mainWindow) mainWindow.webContents.send('new-block', block);
  });
  
  blockchain.on('sync-started', () => {
    if (mainWindow) mainWindow.webContents.send('sync-started');
  });
  
  blockchain.on('sync-progress', (progress) => {
    if (mainWindow) mainWindow.webContents.send('sync-progress', progress);
  });
  
  blockchain.on('sync-complete', (data) => {
    if (mainWindow) mainWindow.webContents.send('sync-complete', data);
  });
  
  blockchain.on('sync-error', (data) => {
    if (mainWindow) mainWindow.webContents.send('sync-error', data);
  });
  
  await blockchain.initialize();
}

async function syncBlockchain() {
  if (mainWindow) mainWindow.webContents.send('sync-started');
  await blockchain.syncWithMainNetwork();
}

// IPC Handlers
ipcMain.handle('get-stats', async () => {
  const localStats = blockchain.getStats();
  const networkStats = await blockchain.getNetworkStats();
  const height = await blockchain.getHeight();
  
  return {
    ...localStats,
    ...networkStats,
    localHeight: height,
    networkHeight: networkStats.total_blocks - 1
  };
});

ipcMain.handle('get-blocks', async (event, { limit = 10, offset = 0 }) => {
  return await blockchain.getBlocks(limit, offset);
});

ipcMain.handle('get-block', async (event, height) => {
  return await blockchain.getBlock(height);
});

ipcMain.handle('create-wallet', async (event, name) => {
  return await blockchain.createWallet(name);
});

ipcMain.handle('import-wallet', async (event, { seedPhrase, name }) => {
  return await blockchain.importWallet(seedPhrase, name);
});

ipcMain.handle('get-wallets', async () => {
  const wallets = await blockchain.getWallets();
  const walletsWithBalance = [];
  
  for (const w of wallets) {
    const balance = await blockchain.getBalance(w.address);
    walletsWithBalance.push({ ...w, balance });
  }
  return walletsWithBalance;
});

ipcMain.handle('get-wallet', async (event, address) => {
  const wallet = await blockchain.getWallet(address);
  if (wallet) {
    wallet.balance = await blockchain.getBalance(address);
  }
  return wallet;
});

ipcMain.handle('get-balance', async (event, address) => {
  return await blockchain.getBalance(address);
});

ipcMain.handle('send-transaction', async (event, { fromAddress, toAddress, amount }) => {
  const wallet = await blockchain.getWallet(fromAddress);
  if (!wallet) throw new Error('Wallet not found');
  
  const balance = await blockchain.getBalance(fromAddress);
  if (balance < amount) throw new Error('Insufficient balance');
  
  return await blockchain.sendTransaction(wallet.privateKey, fromAddress, toAddress, amount);
});

ipcMain.handle('start-mining', async (event, minerAddress) => {
  if (isMining) return { success: false, message: 'Already mining' };
  
  isMining = true;
  mainWindow.webContents.send('mining-started');
  
  const mine = async () => {
    if (!isMining) return;
    
    try {
      const result = await blockchain.mineBlock(minerAddress, (progress) => {
        mainWindow.webContents.send('mining-progress', progress);
      });
      
      if (result.success) {
        mainWindow.webContents.send('block-mined', { block: result.block, reward: result.reward });
      }
    } catch (e) {
      console.error('Mining error:', e.message);
      mainWindow.webContents.send('mining-error', { error: e.message });
    }
    
    if (isMining) setTimeout(mine, 100);
  };
  
  mine();
  return { success: true };
});

ipcMain.handle('stop-mining', async () => {
  isMining = false;
  blockchain.stopMining();
  mainWindow.webContents.send('mining-stopped');
  return { success: true };
});

ipcMain.handle('sync-blockchain', async () => {
  await syncBlockchain();
  return { success: true };
});

ipcMain.handle('get-network-stats', async () => {
  return await blockchain.getNetworkStats();
});

// App lifecycle
app.whenReady().then(async () => {
  await initBlockchain();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
