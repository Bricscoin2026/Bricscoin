// BricsCoin Core - Blockchain Engine
// Gestisce blockchain locale, validazione, mining e P2P

const crypto = require('crypto');
const EventEmitter = require('events');

// Costanti BricsCoin (come Bitcoin)
const CONSTANTS = {
  MAX_SUPPLY: 21000000,
  INITIAL_REWARD: 50,
  HALVING_INTERVAL: 210000,
  DIFFICULTY_ADJUSTMENT_INTERVAL: 2016,
  TARGET_BLOCK_TIME: 600, // 10 minuti in secondi
  INITIAL_DIFFICULTY: 4,
  VERSION: '1.0.0'
};

// Funzione SHA256
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Calcola ricompensa blocco
function getBlockReward(blockHeight) {
  const halvings = Math.floor(blockHeight / CONSTANTS.HALVING_INTERVAL);
  if (halvings >= 64) return 0;
  return CONSTANTS.INITIAL_REWARD / Math.pow(2, halvings);
}

// Verifica difficoltà
function checkDifficulty(hash, difficulty) {
  const target = '0'.repeat(difficulty);
  return hash.startsWith(target);
}

// Genera wallet
function generateWallet() {
  const EC = require('elliptic').ec;
  const ec = new EC('secp256k1');
  const bip39 = require('bip39');
  
  // Genera seed phrase
  const mnemonic = bip39.generateMnemonic(128); // 12 parole
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  
  // Deriva chiavi
  const privateKeyHex = sha256(seed.toString('hex'));
  const keyPair = ec.keyFromPrivate(privateKeyHex);
  const publicKey = keyPair.getPublic('hex');
  
  // Genera indirizzo
  const addressHash = sha256(publicKey);
  const address = 'BRICS' + addressHash.substring(0, 40);
  
  return {
    address,
    publicKey,
    privateKey: privateKeyHex,
    seedPhrase: mnemonic
  };
}

// Importa wallet da seed
function importWalletFromSeed(mnemonic) {
  const EC = require('elliptic').ec;
  const ec = new EC('secp256k1');
  const bip39 = require('bip39');
  
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid seed phrase');
  }
  
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const privateKeyHex = sha256(seed.toString('hex'));
  const keyPair = ec.keyFromPrivate(privateKeyHex);
  const publicKey = keyPair.getPublic('hex');
  const addressHash = sha256(publicKey);
  const address = 'BRICS' + addressHash.substring(0, 40);
  
  return {
    address,
    publicKey,
    privateKey: privateKeyHex,
    seedPhrase: mnemonic
  };
}

// Firma transazione
function signTransaction(privateKey, txData) {
  const EC = require('elliptic').ec;
  const ec = new EC('secp256k1');
  const keyPair = ec.keyFromPrivate(privateKey);
  const hash = sha256(JSON.stringify(txData));
  const signature = keyPair.sign(hash);
  return signature.toDER('hex');
}

// Verifica firma
function verifySignature(publicKey, txData, signature) {
  try {
    const EC = require('elliptic').ec;
    const ec = new EC('secp256k1');
    const key = ec.keyFromPublic(publicKey, 'hex');
    const hash = sha256(JSON.stringify(txData));
    return key.verify(hash, signature);
  } catch (e) {
    return false;
  }
}

// Classe Blockchain
class Blockchain extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
    this.mempool = new Map(); // Transazioni in attesa
    this.peers = new Set(); // Nodi connessi
    this.isSyncing = false;
    this.currentDifficulty = CONSTANTS.INITIAL_DIFFICULTY;
  }
  
  // Inizializza database
  async initialize() {
    // Crea tabelle se non esistono
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blocks (
        height INTEGER PRIMARY KEY,
        hash TEXT UNIQUE NOT NULL,
        previous_hash TEXT,
        timestamp TEXT NOT NULL,
        nonce INTEGER NOT NULL,
        difficulty INTEGER NOT NULL,
        miner TEXT,
        reward REAL,
        tx_count INTEGER DEFAULT 0,
        data TEXT
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        block_height INTEGER,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        amount REAL NOT NULL,
        timestamp TEXT NOT NULL,
        signature TEXT,
        confirmed INTEGER DEFAULT 0,
        FOREIGN KEY (block_height) REFERENCES blocks(height)
      );
      
      CREATE TABLE IF NOT EXISTS peers (
        url TEXT PRIMARY KEY,
        last_seen TEXT,
        is_active INTEGER DEFAULT 1
      );
      
      CREATE TABLE IF NOT EXISTS wallets (
        address TEXT PRIMARY KEY,
        public_key TEXT NOT NULL,
        private_key_encrypted TEXT,
        seed_phrase_encrypted TEXT,
        name TEXT,
        created_at TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_tx_sender ON transactions(sender);
      CREATE INDEX IF NOT EXISTS idx_tx_recipient ON transactions(recipient);
      CREATE INDEX IF NOT EXISTS idx_tx_block ON transactions(block_height);
    `);
    
    // Verifica se esiste genesis block
    const genesis = this.db.prepare('SELECT * FROM blocks WHERE height = 0').get();
    if (!genesis) {
      await this.createGenesisBlock();
    }
    
    // Carica difficoltà corrente
    this.currentDifficulty = this.calculateDifficulty();
    
    // Carica peers salvati
    const savedPeers = this.db.prepare('SELECT url FROM peers WHERE is_active = 1').all();
    savedPeers.forEach(p => this.peers.add(p.url));
    
    // Aggiungi seed nodes
    const seedNodes = [
      'http://5.161.254.163:8001',
      'https://bricscoin26.org'
    ];
    seedNodes.forEach(url => this.peers.add(url));
    
    console.log(`Blockchain initialized. Height: ${this.getHeight()}, Difficulty: ${this.currentDifficulty}`);
  }
  
  // Crea blocco genesis
  async createGenesisBlock() {
    const genesisBlock = {
      height: 0,
      hash: sha256('BricsCoin Genesis Block 2026'),
      previous_hash: '0'.repeat(64),
      timestamp: new Date('2026-01-01T00:00:00Z').toISOString(),
      nonce: 0,
      difficulty: CONSTANTS.INITIAL_DIFFICULTY,
      miner: 'GENESIS',
      reward: 0,
      tx_count: 0,
      data: JSON.stringify({ message: 'BricsCoin Genesis Block - January 2026' })
    };
    
    this.db.prepare(`
      INSERT INTO blocks (height, hash, previous_hash, timestamp, nonce, difficulty, miner, reward, tx_count, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      genesisBlock.height,
      genesisBlock.hash,
      genesisBlock.previous_hash,
      genesisBlock.timestamp,
      genesisBlock.nonce,
      genesisBlock.difficulty,
      genesisBlock.miner,
      genesisBlock.reward,
      genesisBlock.tx_count,
      genesisBlock.data
    );
    
    console.log('Genesis block created');
    this.emit('block', genesisBlock);
  }
  
  // Ottieni altezza blockchain
  getHeight() {
    const result = this.db.prepare('SELECT MAX(height) as height FROM blocks').get();
    return result?.height || 0;
  }
  
  // Ottieni ultimo blocco
  getLatestBlock() {
    return this.db.prepare('SELECT * FROM blocks ORDER BY height DESC LIMIT 1').get();
  }
  
  // Ottieni blocco per altezza
  getBlock(height) {
    return this.db.prepare('SELECT * FROM blocks WHERE height = ?').get(height);
  }
  
  // Ottieni blocco per hash
  getBlockByHash(hash) {
    return this.db.prepare('SELECT * FROM blocks WHERE hash = ?').get(hash);
  }
  
  // Calcola difficoltà
  calculateDifficulty() {
    const height = this.getHeight();
    
    if (height < CONSTANTS.DIFFICULTY_ADJUSTMENT_INTERVAL) {
      return CONSTANTS.INITIAL_DIFFICULTY;
    }
    
    if (height % CONSTANTS.DIFFICULTY_ADJUSTMENT_INTERVAL !== 0) {
      return this.currentDifficulty;
    }
    
    // Calcola tempo medio degli ultimi 2016 blocchi
    const startBlock = this.getBlock(height - CONSTANTS.DIFFICULTY_ADJUSTMENT_INTERVAL);
    const endBlock = this.getLatestBlock();
    
    const expectedTime = CONSTANTS.TARGET_BLOCK_TIME * CONSTANTS.DIFFICULTY_ADJUSTMENT_INTERVAL;
    const actualTime = (new Date(endBlock.timestamp) - new Date(startBlock.timestamp)) / 1000;
    
    let newDifficulty = this.currentDifficulty;
    
    if (actualTime < expectedTime / 2) {
      newDifficulty = Math.min(this.currentDifficulty + 1, 32);
    } else if (actualTime > expectedTime * 2) {
      newDifficulty = Math.max(this.currentDifficulty - 1, 1);
    }
    
    return newDifficulty;
  }
  
  // Verifica blocco
  validateBlock(block, previousBlock) {
    // Verifica hash precedente
    if (block.previous_hash !== previousBlock.hash) {
      return { valid: false, error: 'Invalid previous hash' };
    }
    
    // Verifica altezza
    if (block.height !== previousBlock.height + 1) {
      return { valid: false, error: 'Invalid block height' };
    }
    
    // Verifica difficoltà
    if (!checkDifficulty(block.hash, block.difficulty)) {
      return { valid: false, error: 'Hash does not meet difficulty' };
    }
    
    // Verifica ricompensa
    const expectedReward = getBlockReward(block.height);
    if (block.reward > expectedReward) {
      return { valid: false, error: 'Invalid block reward' };
    }
    
    return { valid: true };
  }
  
  // Aggiungi blocco alla chain
  addBlock(block) {
    const previousBlock = this.getLatestBlock();
    
    // Valida blocco
    const validation = this.validateBlock(block, previousBlock);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Inserisci blocco
    this.db.prepare(`
      INSERT INTO blocks (height, hash, previous_hash, timestamp, nonce, difficulty, miner, reward, tx_count, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      block.height,
      block.hash,
      block.previous_hash,
      block.timestamp,
      block.nonce,
      block.difficulty,
      block.miner,
      block.reward,
      block.tx_count || 0,
      block.data || '{}'
    );
    
    // Conferma transazioni nel blocco
    if (block.transactions && block.transactions.length > 0) {
      const confirmStmt = this.db.prepare(`
        UPDATE transactions SET confirmed = 1, block_height = ? WHERE id = ?
      `);
      
      block.transactions.forEach(tx => {
        confirmStmt.run(block.height, tx.id);
        this.mempool.delete(tx.id);
      });
    }
    
    // Aggiorna difficoltà
    this.currentDifficulty = this.calculateDifficulty();
    
    console.log(`Block #${block.height} added. Hash: ${block.hash.substring(0, 16)}...`);
    this.emit('block', block);
    
    return block;
  }
  
  // Crea transazione
  createTransaction(sender, recipient, amount, privateKey) {
    const txData = {
      sender,
      recipient,
      amount,
      timestamp: new Date().toISOString()
    };
    
    const signature = signTransaction(privateKey, txData);
    
    const tx = {
      id: sha256(JSON.stringify(txData) + Date.now()),
      ...txData,
      signature,
      confirmed: 0
    };
    
    // Aggiungi a mempool
    this.mempool.set(tx.id, tx);
    
    // Salva nel database
    this.db.prepare(`
      INSERT INTO transactions (id, sender, recipient, amount, timestamp, signature, confirmed)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(tx.id, tx.sender, tx.recipient, tx.amount, tx.timestamp, tx.signature);
    
    this.emit('transaction', tx);
    return tx;
  }
  
  // Ottieni saldo indirizzo
  getBalance(address) {
    // Transazioni ricevute confermate
    const received = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
      WHERE recipient = ? AND confirmed = 1
    `).get(address);
    
    // Transazioni inviate confermate
    const sent = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
      WHERE sender = ? AND confirmed = 1
    `).get(address);
    
    // Ricompense mining
    const mined = this.db.prepare(`
      SELECT COALESCE(SUM(reward), 0) as total FROM blocks WHERE miner = ?
    `).get(address);
    
    return (received?.total || 0) - (sent?.total || 0) + (mined?.total || 0);
  }
  
  // Ottieni transazioni indirizzo
  getTransactions(address) {
    return this.db.prepare(`
      SELECT * FROM transactions 
      WHERE sender = ? OR recipient = ?
      ORDER BY timestamp DESC
    `).all(address, address);
  }
  
  // Mining
  async mineBlock(minerAddress, onProgress) {
    const previousBlock = this.getLatestBlock();
    const height = previousBlock.height + 1;
    const difficulty = this.currentDifficulty;
    const reward = getBlockReward(height);
    
    // Prendi transazioni dalla mempool
    const transactions = Array.from(this.mempool.values()).slice(0, 100);
    
    const blockData = {
      height,
      previous_hash: previousBlock.hash,
      timestamp: new Date().toISOString(),
      transactions,
      miner: minerAddress,
      reward,
      difficulty
    };
    
    let nonce = 0;
    let hash = '';
    const target = '0'.repeat(difficulty);
    
    console.log(`Mining block #${height} with difficulty ${difficulty}...`);
    
    while (true) {
      const data = JSON.stringify(blockData) + nonce;
      hash = sha256(data);
      
      if (hash.startsWith(target)) {
        break;
      }
      
      nonce++;
      
      if (nonce % 10000 === 0 && onProgress) {
        onProgress({ nonce, hash, hashrate: 0 });
      }
    }
    
    const newBlock = {
      ...blockData,
      nonce,
      hash,
      tx_count: transactions.length,
      data: JSON.stringify({ transactions: transactions.map(t => t.id) })
    };
    
    return this.addBlock(newBlock);
  }
  
  // Sincronizza con peer
  async syncWithPeer(peerUrl) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    
    try {
      console.log(`Syncing with ${peerUrl}...`);
      
      // Fetch chain info
      const response = await fetch(`${peerUrl}/api/chain`);
      const data = await response.json();
      
      if (!data.chain || data.chain.length === 0) {
        console.log('Peer has empty chain');
        return;
      }
      
      const ourHeight = this.getHeight();
      const theirHeight = data.chain.length - 1;
      
      if (theirHeight <= ourHeight) {
        console.log('We are up to date');
        return;
      }
      
      console.log(`Downloading ${theirHeight - ourHeight} blocks...`);
      
      // Download blocchi mancanti
      for (let i = ourHeight + 1; i <= theirHeight; i++) {
        const block = data.chain[i];
        if (block) {
          try {
            this.addBlock(block);
            this.emit('sync-progress', { current: i, total: theirHeight });
          } catch (e) {
            console.error(`Error adding block ${i}:`, e.message);
            break;
          }
        }
      }
      
      console.log(`Sync complete. Height: ${this.getHeight()}`);
      this.emit('sync-complete', { height: this.getHeight() });
      
    } catch (error) {
      console.error(`Sync error with ${peerUrl}:`, error.message);
    } finally {
      this.isSyncing = false;
    }
  }
  
  // Sincronizza con tutti i peer
  async syncWithNetwork() {
    for (const peer of this.peers) {
      await this.syncWithPeer(peer);
    }
  }
  
  // Aggiungi peer
  addPeer(url) {
    this.peers.add(url);
    this.db.prepare(`
      INSERT OR REPLACE INTO peers (url, last_seen, is_active) VALUES (?, ?, 1)
    `).run(url, new Date().toISOString());
  }
  
  // Ottieni statistiche
  getStats() {
    const height = this.getHeight();
    const latestBlock = this.getLatestBlock();
    
    // Calcola supply in circolazione
    const circulatingSupply = this.db.prepare(`
      SELECT COALESCE(SUM(reward), 0) as total FROM blocks
    `).get();
    
    // Conta transazioni
    const txCount = this.db.prepare(`SELECT COUNT(*) as count FROM transactions`).get();
    
    return {
      height,
      difficulty: this.currentDifficulty,
      latestBlockHash: latestBlock?.hash,
      latestBlockTime: latestBlock?.timestamp,
      circulatingSupply: circulatingSupply?.total || 0,
      maxSupply: CONSTANTS.MAX_SUPPLY,
      currentReward: getBlockReward(height + 1),
      nextHalving: Math.ceil((height + 1) / CONSTANTS.HALVING_INTERVAL) * CONSTANTS.HALVING_INTERVAL,
      totalTransactions: txCount?.count || 0,
      mempoolSize: this.mempool.size,
      connectedPeers: this.peers.size
    };
  }
  
  // Esporta chain per altri nodi
  exportChain(fromHeight = 0, limit = 500) {
    return this.db.prepare(`
      SELECT * FROM blocks WHERE height >= ? ORDER BY height LIMIT ?
    `).all(fromHeight, limit);
  }
}

module.exports = {
  Blockchain,
  CONSTANTS,
  sha256,
  getBlockReward,
  checkDifficulty,
  generateWallet,
  importWalletFromSeed,
  signTransaction,
  verifySignature
};
