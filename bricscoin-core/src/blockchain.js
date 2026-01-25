// BricsCoin Core - Blockchain Engine
// Gestisce sincronizzazione con network principale, mining reale, e wallet

const crypto = require('crypto');
const EventEmitter = require('events');

// Costanti BricsCoin (identiche al server)
const CONSTANTS = {
  MAX_SUPPLY: 21000000,
  INITIAL_REWARD: 50,
  HALVING_INTERVAL: 210000,
  DIFFICULTY_ADJUSTMENT_INTERVAL: 2016,
  TARGET_BLOCK_TIME: 600,
  INITIAL_DIFFICULTY: 4,
  PREMINE_AMOUNT: 1000000,
  VERSION: '1.0.0',
  // Server principale
  MAIN_NODE: 'https://bricscoin26.org'
};

// SHA256
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
  
  const mnemonic = bip39.generateMnemonic(128);
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const privateKeyHex = sha256(seed.toString('hex'));
  const keyPair = ec.keyFromPrivate(privateKeyHex);
  const publicKey = keyPair.getPublic('hex');
  const addressHash = sha256(publicKey);
  const address = 'BRICS' + addressHash.substring(0, 40);
  
  return { address, publicKey, privateKey: privateKeyHex, seedPhrase: mnemonic };
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
  
  return { address, publicKey, privateKey: privateKeyHex, seedPhrase: mnemonic };
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

// Classe Blockchain
class Blockchain extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
    this.currentDifficulty = CONSTANTS.INITIAL_DIFFICULTY;
    this.isSyncing = false;
    this.isConnected = false;
    this.mainNode = CONSTANTS.MAIN_NODE;
    this.miningAborted = false;
  }
  
  // Inizializza database e sincronizza
  async initialize() {
    this.initDatabase();
    
    // Sincronizza con il network principale
    await this.syncWithMainNetwork();
    
    // Imposta sincronizzazione periodica (ogni 30 secondi)
    setInterval(() => this.syncWithMainNetwork(), 30000);
  }
  
  // Crea tabelle database
  initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blocks (
        height INTEGER PRIMARY KEY,
        hash TEXT NOT NULL,
        previous_hash TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        nonce INTEGER NOT NULL,
        difficulty INTEGER NOT NULL,
        miner TEXT NOT NULL,
        reward REAL NOT NULL,
        proof INTEGER,
        tx_count INTEGER DEFAULT 0,
        data TEXT
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        amount REAL NOT NULL,
        timestamp TEXT NOT NULL,
        signature TEXT,
        confirmed INTEGER DEFAULT 0,
        block_height INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS wallets (
        address TEXT PRIMARY KEY,
        public_key TEXT NOT NULL,
        private_key_encrypted TEXT NOT NULL,
        seed_phrase_encrypted TEXT,
        name TEXT,
        created_at TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_tx_sender ON transactions(sender);
      CREATE INDEX IF NOT EXISTS idx_tx_recipient ON transactions(recipient);
    `);
    
    console.log('Database initialized');
  }
  
  // Sincronizza con il network principale
  async syncWithMainNetwork() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    
    try {
      console.log('Syncing with main network...');
      this.emit('sync-started');
      
      // Ottieni info chain dal server
      const infoResponse = await fetch(`${this.mainNode}/api/p2p/chain/info`);
      if (!infoResponse.ok) {
        throw new Error('Failed to get chain info');
      }
      const info = await infoResponse.json();
      
      const ourHeight = this.getHeight();
      const theirHeight = info.height - 1; // height è il count, non l'indice
      
      console.log(`Local height: ${ourHeight}, Network height: ${theirHeight}`);
      
      // Aggiorna difficoltà dal network
      this.currentDifficulty = info.difficulty || CONSTANTS.INITIAL_DIFFICULTY;
      
      if (theirHeight <= ourHeight) {
        console.log('Already synced with network');
        this.isConnected = true;
        this.emit('sync-complete', { height: ourHeight, synced: true });
        return;
      }
      
      // Scarica blocchi mancanti
      let fromHeight = ourHeight + 1;
      
      while (fromHeight <= theirHeight) {
        const blocksResponse = await fetch(
          `${this.mainNode}/api/p2p/chain/blocks?from_height=${fromHeight}&limit=50`
        );
        
        if (!blocksResponse.ok) {
          throw new Error('Failed to get blocks');
        }
        
        const data = await blocksResponse.json();
        
        if (!data.blocks || data.blocks.length === 0) break;
        
        for (const block of data.blocks) {
          try {
            this.addBlockFromNetwork(block);
            this.emit('sync-progress', { 
              current: block.index, 
              total: theirHeight,
              percent: Math.round((block.index / theirHeight) * 100)
            });
          } catch (e) {
            console.error(`Error adding block ${block.index}:`, e.message);
          }
        }
        
        fromHeight += data.blocks.length;
      }
      
      this.isConnected = true;
      console.log(`Sync complete. Height: ${this.getHeight()}`);
      this.emit('sync-complete', { height: this.getHeight(), synced: true });
      
    } catch (error) {
      console.error('Sync error:', error.message);
      this.isConnected = false;
      this.emit('sync-error', { error: error.message });
    } finally {
      this.isSyncing = false;
    }
  }
  
  // Aggiungi blocco dal network (senza validazione completa, ci fidiamo del server)
  addBlockFromNetwork(block) {
    const existing = this.db.prepare('SELECT hash FROM blocks WHERE height = ?').get(block.index);
    if (existing) {
      return; // Già presente
    }
    
    this.db.prepare(`
      INSERT INTO blocks (height, hash, previous_hash, timestamp, nonce, difficulty, miner, reward, proof, tx_count, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      block.index,
      block.hash,
      block.previous_hash,
      block.timestamp,
      block.nonce || block.proof || 0,
      block.difficulty || CONSTANTS.INITIAL_DIFFICULTY,
      block.miner || 'NETWORK',
      block.reward || getBlockReward(block.index),
      block.proof || block.nonce || 0,
      block.transactions?.length || 0,
      JSON.stringify(block.transactions || [])
    );
    
    this.emit('block', block);
  }
  
  // Ottieni altezza
  getHeight() {
    const result = this.db.prepare('SELECT MAX(height) as height FROM blocks').get();
    return result?.height ?? -1;
  }
  
  // Ottieni ultimo blocco
  getLatestBlock() {
    return this.db.prepare('SELECT * FROM blocks ORDER BY height DESC LIMIT 1').get();
  }
  
  // Ottieni blocco
  getBlock(height) {
    return this.db.prepare('SELECT * FROM blocks WHERE height = ?').get(height);
  }
  
  // Mining REALE - invia blocco al server
  async mineBlock(minerAddress, onProgress) {
    if (!this.isConnected) {
      await this.syncWithMainNetwork();
    }
    
    this.miningAborted = false;
    
    try {
      // Ottieni template dal server
      const templateResponse = await fetch(`${this.mainNode}/api/mining/template`);
      if (!templateResponse.ok) {
        throw new Error('Failed to get mining template');
      }
      const template = await templateResponse.json();
      
      console.log(`Mining block #${template.index} with difficulty ${template.difficulty}...`);
      
      const target = '0'.repeat(template.difficulty);
      let nonce = 0;
      let hash = '';
      let startTime = Date.now();
      let hashCount = 0;
      
      // Mining loop
      while (!this.miningAborted) {
        const blockData = {
          index: template.index,
          previous_hash: template.previous_hash,
          timestamp: template.timestamp,
          transactions: template.transactions,
          miner: minerAddress,
          nonce: nonce
        };
        
        hash = sha256(JSON.stringify(blockData));
        hashCount++;
        
        if (hash.startsWith(target)) {
          // Trovato! Invia al server
          console.log(`Block found! Nonce: ${nonce}, Hash: ${hash}`);
          
          const submitResponse = await fetch(`${this.mainNode}/api/mining/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              index: template.index,
              previous_hash: template.previous_hash,
              timestamp: template.timestamp,
              transactions: template.transactions,
              miner: minerAddress,
              nonce: nonce,
              hash: hash,
              difficulty: template.difficulty,
              proof: nonce
            })
          });
          
          const result = await submitResponse.json();
          
          if (submitResponse.ok && result.success) {
            console.log(`Block #${template.index} accepted by network!`);
            
            // Aggiorna blockchain locale
            await this.syncWithMainNetwork();
            
            return {
              success: true,
              block: result.block,
              reward: template.reward
            };
          } else {
            console.log('Block rejected:', result.detail || result.error || 'Unknown error');
            // Riprova con nuovo template
            return this.mineBlock(minerAddress, onProgress);
          }
        }
        
        nonce++;
        
        // Progress callback ogni 5000 hash
        if (nonce % 5000 === 0 && onProgress) {
          const elapsed = (Date.now() - startTime) / 1000;
          const hashrate = Math.round(hashCount / elapsed);
          onProgress({ 
            nonce, 
            hash: hash.substring(0, 16) + '...', 
            hashrate,
            target: target
          });
        }
        
        // Yield per non bloccare il thread
        if (nonce % 10000 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
      
      return { success: false, aborted: true };
      
    } catch (error) {
      console.error('Mining error:', error.message);
      throw error;
    }
  }
  
  // Ferma mining
  stopMining() {
    this.miningAborted = true;
  }
  
  // Ottieni saldo (dal server per dati reali)
  async getBalance(address) {
    try {
      const response = await fetch(`${this.mainNode}/api/wallet/${address}/balance`);
      if (response.ok) {
        const data = await response.json();
        return data.balance;
      }
    } catch (e) {
      console.error('Error fetching balance:', e);
    }
    
    // Fallback: calcolo locale
    const received = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE recipient = ? AND confirmed = 1
    `).get(address);
    
    const sent = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE sender = ? AND confirmed = 1
    `).get(address);
    
    const mined = this.db.prepare(`
      SELECT COALESCE(SUM(reward), 0) as total FROM blocks WHERE miner = ?
    `).get(address);
    
    return (received?.total || 0) - (sent?.total || 0) + (mined?.total || 0);
  }
  
  // Invia transazione al network
  async sendTransaction(senderPrivateKey, senderAddress, recipientAddress, amount) {
    const txData = {
      sender: senderAddress,
      recipient: recipientAddress,
      amount: parseFloat(amount),
      timestamp: new Date().toISOString()
    };
    
    const signature = signTransaction(senderPrivateKey, txData);
    
    const response = await fetch(`${this.mainNode}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_address: senderAddress,
        sender_private_key: senderPrivateKey,
        recipient_address: recipientAddress,
        amount: parseFloat(amount)
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Transaction failed');
    }
    
    return await response.json();
  }
  
  // Ottieni statistiche dal network
  async getNetworkStats() {
    try {
      const response = await fetch(`${this.mainNode}/api/network/stats`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
    
    // Fallback locale
    return {
      total_supply: CONSTANTS.MAX_SUPPLY,
      circulating_supply: CONSTANTS.PREMINE_AMOUNT + (this.getHeight() + 1) * 50,
      total_blocks: this.getHeight() + 1,
      current_difficulty: this.currentDifficulty
    };
  }
  
  // Statistiche locali
  getStats() {
    const height = this.getHeight();
    const latestBlock = this.getLatestBlock();
    
    return {
      height,
      difficulty: this.currentDifficulty,
      latestBlockHash: latestBlock?.hash,
      latestBlockTime: latestBlock?.timestamp,
      isConnected: this.isConnected,
      isSyncing: this.isSyncing,
      mainNode: this.mainNode
    };
  }
}

module.exports = {
  Blockchain,
  CONSTANTS,
  generateWallet,
  importWalletFromSeed,
  signTransaction,
  sha256,
  getBlockReward,
  checkDifficulty
};
