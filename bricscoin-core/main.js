const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ec: EC } = require('elliptic');

// Initialize elliptic curve for ECDSA signing
const ec = new EC('secp256k1');

// Server configuration - can be changed by user
let SERVER = 'https://bricscoin26.org';
let win, walletsPath, configPath;

const sha256 = d => crypto.createHash('sha256').update(d).digest('hex');

// P2P Node Configuration
let knownPeers = [];
let nodeId = null;
let syncInterval = null;

// BIP39-like word list (subset)
const WORDS = ['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act','action','actor','actress','actual','adapt','add','addict','address','adjust','admit','adult','advance','advice','aerobic','affair','afford','afraid','again','age','agent','agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert','alien','all','alley','allow','almost','alone','alpha','already','also','alter','always','amateur','amazing','among','amount','amused','analyst','anchor','ancient','anger','angle','angry','animal','ankle','announce','annual','another','answer','antenna','antique','anxiety','any','apart','apology','appear','apple','approve','april','arch','arctic','area','arena','argue','arm','armed','armor','army','around','arrange','arrest','arrive','arrow','art','artefact','artist','artwork','ask','aspect','assault','asset','assist','assume','asthma','athlete','atom','attack','attend','attitude','attract','auction','audit','august','aunt','author','auto','autumn','average','avocado','avoid','awake','aware','away','awesome','awful','awkward','axis','baby','bachelor','bacon','badge','bag','balance','balcony','ball','bamboo','banana','banner','bar','barely','bargain','barrel','base','basic','basket','battle','beach','bean','beauty','because','become','beef','before','begin','behave','behind','believe','below','belt','bench','benefit','best','betray','better','between','beyond','bicycle','bid','bike','bind','biology','bird','birth','bitter','black','blade','blame','blanket','blast','bleak','bless','blind','blood','blossom','blouse','blue','blur','blush','board','boat','body','boil','bomb','bone','bonus','book','boost','border','boring','borrow','boss','bottom','bounce','box','boy','bracket','brain','brand','brass','brave','bread','breeze','brick','bridge','brief','bright','bring','brisk','broccoli','broken','bronze','broom','brother','brown','brush','bubble','buddy','budget','buffalo','build','bulb','bulk','bullet','bundle','bunker','burden','burger','burst','bus','business','busy','butter','buyer','buzz','cabbage','cabin','cable','cactus','cage','cake','call','calm','camera','camp','can','canal','cancel','candy','cannon','canoe','canvas','canyon','capable','capital','captain','car','carbon','card','cargo','carpet','carry','cart','case','cash','casino','castle','casual'];

// Generate wallet from seed phrase using proper ECDSA
const makeWallet = (seedPhrase = null) => {
  let seed;
  if (seedPhrase) {
    seed = sha256(seedPhrase.toLowerCase().trim());
  } else {
    const words = [];
    for (let i = 0; i < 12; i++) words.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
    seedPhrase = words.join(' ');
    seed = sha256(seedPhrase);
  }
  
  // Generate ECDSA key pair
  const keyPair = ec.keyFromPrivate(sha256(seed + 'privkey'));
  const privateKey = keyPair.getPrivate('hex');
  const publicKey = keyPair.getPublic('hex').slice(2); // Remove '04' prefix
  
  // Generate address from public key hash
  const addressHash = sha256(publicKey);
  const address = 'BRICS' + addressHash.substring(0, 40);
  
  return { 
    address, 
    privateKey, 
    publicKey,
    seedPhrase 
  };
};

// Sign transaction data using ECDSA
const signTransaction = (privateKey, txData) => {
  const keyPair = ec.keyFromPrivate(privateKey);
  const msgHash = sha256(txData);
  const signature = keyPair.sign(msgHash);
  return signature.toDER('hex');
};

// Load/save wallets
const getWallets = () => {
  try { return JSON.parse(fs.readFileSync(walletsPath, 'utf8')); } 
  catch { return []; }
};
const saveWallets = w => fs.writeFileSync(walletsPath, JSON.stringify(w, null, 2));

// Load/save config
const getConfig = () => {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } 
  catch { return { server: SERVER, peers: [], nodeId: sha256(Date.now().toString()).slice(0, 16) }; }
};
const saveConfig = c => fs.writeFileSync(configPath, JSON.stringify(c, null, 2));

// P2P Functions
const discoverPeers = async () => {
  try {
    const res = await fetch(SERVER + '/api/p2p/peers');
    if (res.ok) {
      const data = await res.json();
      knownPeers = data.peers || [];
      return knownPeers;
    }
  } catch (e) {
    console.log('Peer discovery failed:', e.message);
  }
  return [];
};

const registerWithNetwork = async () => {
  const config = getConfig();
  nodeId = config.nodeId;
  
  try {
    await fetch(SERVER + '/api/p2p/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: nodeId,
        url: '', // Desktop wallets don't expose URLs
        version: '2.1.0'
      })
    });
  } catch (e) {
    console.log('Network registration failed:', e.message);
  }
};

const syncWithNetwork = async () => {
  try {
    // Get chain info from main server
    const infoRes = await fetch(SERVER + '/api/p2p/chain/info');
    if (infoRes.ok) {
      const info = await infoRes.json();
      return { synced: true, height: info.height, difficulty: info.difficulty };
    }
  } catch (e) {
    console.log('Sync failed:', e.message);
  }
  return { synced: false };
};

app.whenReady().then(() => {
  walletsPath = path.join(app.getPath('userData'), 'wallets.json');
  configPath = path.join(app.getPath('userData'), 'config.json');
  
  // Initialize config
  const config = getConfig();
  SERVER = config.server || SERVER;
  nodeId = config.nodeId;
  saveConfig(config);
  
  win = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: { 
      preload: path.join(__dirname, 'preload.js'), 
      contextIsolation: true 
    }
  });
  win.loadFile('index.html');
  
  // Start P2P sync
  registerWithNetwork();
  discoverPeers();
  
  // Periodic sync every 30 seconds
  syncInterval = setInterval(() => {
    syncWithNetwork();
    discoverPeers();
  }, 30000);
});

// IPC Handlers
ipcMain.handle('stats', async () => {
  try { 
    const res = await fetch(SERVER + '/api/network/stats');
    return await res.json(); 
  } catch { return null; }
});

ipcMain.handle('blocks', async () => {
  try { 
    const res = await fetch(SERVER + '/api/blocks?limit=10');
    const data = await res.json();
    return data.blocks || []; 
  } catch { return []; }
});

ipcMain.handle('wallets', async () => {
  const list = getWallets();
  for (const w of list) {
    try { 
      const res = await fetch(SERVER + '/api/wallet/' + w.address + '/balance');
      const data = await res.json();
      w.balance = data.balance || 0; 
    } catch { w.balance = 0; }
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

ipcMain.handle('importwallet', (e, name, seedPhrase) => {
  const w = makeWallet(seedPhrase.trim().toLowerCase());
  w.name = name || 'Imported Wallet';
  const list = getWallets();
  if (list.find(x => x.address === w.address)) throw new Error('Wallet already exists');
  list.push(w);
  saveWallets(list);
  return w;
});

ipcMain.handle('deletewallet', (e, address) => {
  const list = getWallets();
  const idx = list.findIndex(x => x.address === address);
  if (idx === -1) throw new Error('Wallet not found');
  list.splice(idx, 1);
  saveWallets(list);
  return true;
});

ipcMain.handle('copy', (e, text) => {
  clipboard.writeText(text);
  return true;
});

// SECURE transaction - sign locally, never send private key
ipcMain.handle('send', async (e, from, to, amt) => {
  const list = getWallets();
  const w = list.find(x => x.address === from);
  if (!w) throw new Error('Wallet not found');
  
  // Create transaction data
  const timestamp = new Date().toISOString();
  const txData = `${from}${to}${Number(amt)}${timestamp}`;
  
  // Sign transaction locally - private key NEVER leaves this device!
  const signature = signTransaction(w.privateKey, txData);
  
  // Send signed transaction to server
  const res = await fetch(SERVER + '/api/transactions/secure', {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      sender_address: from, 
      recipient_address: to, 
      amount: Number(amt),
      timestamp: timestamp,
      signature: signature,
      public_key: w.publicKey
    })
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Transaction failed');
  }
  
  return true;
});

ipcMain.handle('transactions', async (e, address) => {
  try {
    const res = await fetch(SERVER + '/api/transactions/address/' + address);
    if (!res.ok) return [];
    const data = await res.json();
    return data.transactions || [];
  } catch { return []; }
});

// P2P IPC Handlers
ipcMain.handle('getpeers', async () => {
  await discoverPeers();
  return knownPeers;
});

ipcMain.handle('syncstatus', async () => {
  return await syncWithNetwork();
});

ipcMain.handle('getnodeid', () => {
  return nodeId;
});

ipcMain.handle('setserver', (e, url) => {
  SERVER = url;
  const config = getConfig();
  config.server = url;
  saveConfig(config);
  return true;
});

ipcMain.handle('getserver', () => {
  return SERVER;
});

app.on('window-all-closed', () => {
  if (syncInterval) clearInterval(syncInterval);
  app.quit();
});
