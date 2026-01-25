const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const crypto = require('crypto');

const store = new Store();
const MAIN_NODE = 'https://bricscoin26.org';

let mainWindow;
let isMining = false;
let miningAborted = false;

// SHA256 hash
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Generate wallet (simplified - no external dependencies)
function generateWallet() {
  const privateKey = crypto.randomBytes(32).toString('hex');
  const publicKey = sha256(privateKey);
  const address = 'BRICS' + sha256(publicKey).substring(0, 40);
  
  // Generate 12 random words as seed phrase
  const words = [];
  const wordList = ['apple', 'banana', 'cherry', 'dragon', 'eagle', 'flower', 'garden', 'honey', 'island', 'jungle', 'knight', 'lemon', 'mountain', 'night', 'ocean', 'planet', 'queen', 'river', 'sunset', 'tiger', 'umbrella', 'valley', 'winter', 'yellow'];
  for (let i = 0; i < 12; i++) {
    words.push(wordList[Math.floor(Math.random() * wordList.length)]);
  }
  
  return {
    address,
    privateKey,
    publicKey,
    seedPhrase: words.join(' ')
  };
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

// ==================== IPC HANDLERS ====================

// Get network stats from real server
ipcMain.handle('get-network-stats', async () => {
  try {
    const response = await fetch(`${MAIN_NODE}/api/network/stats`);
    return await response.json();
  } catch (e) {
    console.error('Error fetching stats:', e);
    return null;
  }
});

// Get blocks from real server
ipcMain.handle('get-blocks', async (event, limit = 10) => {
  try {
    const response = await fetch(`${MAIN_NODE}/api/blocks?limit=${limit}`);
    const data = await response.json();
    return data.blocks || [];
  } catch (e) {
    console.error('Error fetching blocks:', e);
    return [];
  }
});

// Get balance from real server
ipcMain.handle('get-balance', async (event, address) => {
  try {
    const response = await fetch(`${MAIN_NODE}/api/wallet/${address}/balance`);
    const data = await response.json();
    return data.balance || 0;
  } catch (e) {
    console.error('Error fetching balance:', e);
    return 0;
  }
});

// Create wallet (stored locally)
ipcMain.handle('create-wallet', async (event, name) => {
  const wallet = generateWallet();
  wallet.name = name || 'My Wallet';
  wallet.createdAt = new Date().toISOString();
  
  const wallets = store.get('wallets', []);
  wallets.push(wallet);
  store.set('wallets', wallets);
  
  return wallet;
});

// Get wallets (from local storage)
ipcMain.handle('get-wallets', async () => {
  const wallets = store.get('wallets', []);
  
  // Fetch real balances
  for (const wallet of wallets) {
    try {
      const response = await fetch(`${MAIN_NODE}/api/wallet/${wallet.address}/balance`);
      const data = await response.json();
      wallet.balance = data.balance || 0;
    } catch (e) {
      wallet.balance = 0;
    }
  }
  
  return wallets;
});

// Send transaction to real server
ipcMain.handle('send-transaction', async (event, { fromAddress, toAddress, amount }) => {
  const wallets = store.get('wallets', []);
  const wallet = wallets.find(w => w.address === fromAddress);
  
  if (!wallet) throw new Error('Wallet not found');
  
  try {
    const response = await fetch(`${MAIN_NODE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_address: fromAddress,
        sender_private_key: wallet.privateKey,
        recipient_address: toAddress,
        amount: parseFloat(amount)
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Transaction failed');
    }
    
    return await response.json();
  } catch (e) {
    throw new Error(e.message);
  }
});

// Start mining on real server
ipcMain.handle('start-mining', async (event, minerAddress) => {
  if (isMining) return { success: false, message: 'Already mining' };
  
  isMining = true;
  miningAborted = false;
  mainWindow.webContents.send('mining-status', { status: 'started' });
  
  mineLoop(minerAddress);
  
  return { success: true };
});

// Mining loop
async function mineLoop(minerAddress) {
  while (isMining && !miningAborted) {
    try {
      // Get template from real server
      const templateRes = await fetch(`${MAIN_NODE}/api/mining/template`);
      if (!templateRes.ok) {
        await sleep(5000);
        continue;
      }
      const template = await templateRes.json();
      
      mainWindow.webContents.send('mining-status', { 
        status: 'mining', 
        block: template.index,
        difficulty: template.difficulty
      });
      
      const target = '0'.repeat(template.difficulty);
      let nonce = 0;
      let found = false;
      let startTime = Date.now();
      
      // Mine
      while (!found && !miningAborted && isMining) {
        const blockData = {
          index: template.index,
          previous_hash: template.previous_hash,
          timestamp: template.timestamp,
          transactions: template.transactions || [],
          miner: minerAddress,
          nonce: nonce
        };
        
        const hash = sha256(JSON.stringify(blockData));
        
        if (hash.startsWith(target)) {
          found = true;
          
          // Submit to real server
          mainWindow.webContents.send('mining-status', { status: 'submitting' });
          
          const submitRes = await fetch(`${MAIN_NODE}/api/mining/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              index: template.index,
              previous_hash: template.previous_hash,
              timestamp: template.timestamp,
              transactions: template.transactions || [],
              miner: minerAddress,
              nonce: nonce,
              hash: hash,
              difficulty: template.difficulty,
              proof: nonce
            })
          });
          
          if (submitRes.ok) {
            const result = await submitRes.json();
            mainWindow.webContents.send('block-found', {
              block: template.index,
              hash: hash,
              reward: template.reward || 50
            });
          }
        }
        
        nonce++;
        
        // Send progress every 10000 hashes
        if (nonce % 10000 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const hashrate = Math.round(nonce / elapsed);
          mainWindow.webContents.send('mining-progress', {
            nonce,
            hashrate,
            hash: hash.substring(0, 16)
          });
          
          // Yield to not block
          await sleep(1);
        }
      }
      
    } catch (e) {
      console.error('Mining error:', e);
      await sleep(5000);
    }
  }
  
  mainWindow.webContents.send('mining-status', { status: 'stopped' });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Stop mining
ipcMain.handle('stop-mining', async () => {
  isMining = false;
  miningAborted = true;
  return { success: true };
});

// App lifecycle
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
