// BricsCoin Core - Blockchain Engine
// Usa nedb-promises (no compilazione nativa richiesta)

const crypto = require('crypto');
const EventEmitter = require('events');
const Datastore = require('nedb-promises');
const path = require('path');
const { app } = require('electron');

// Costanti BricsCoin
const CONSTANTS = {
  MAX_SUPPLY: 21000000,
  INITIAL_REWARD: 50,
  HALVING_INTERVAL: 210000,
  DIFFICULTY_ADJUSTMENT_INTERVAL: 2016,
  TARGET_BLOCK_TIME: 600,
  INITIAL_DIFFICULTY: 4,
  PREMINE_AMOUNT: 1000000,
  VERSION: '1.0.0',
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

// Classe Blockchain
class Blockchain extends EventEmitter {
  constructor(userDataPath) {
    super();
    this.userDataPath = userDataPath;
    this.currentDifficulty = CONSTANTS.INITIAL_DIFFICULTY;
    this.isSyncing = false;
    this.isConnected = false;
    this.mainNode = CONSTANTS.MAIN_NODE;
    this.miningAborted = false;
    
    // Database NeDB
    this.blocksDb = Datastore.create(path.join(userDataPath, 'blocks.db'));
    this.walletsDb = Datastore.create(path.join(userDataPath, 'wallets.db'));
    this.txDb = Datastore.create(path.join(userDataPath, 'transactions.db'));
  }
  
  async initialize() {
    console.log('Initializing blockchain...');
    
    // Crea indici
    await this.blocksDb.ensureIndex({ fieldName: 'height', unique: true });
    await this.walletsDb.ensureIndex({ fieldName: 'address', unique: true });
    await this.txDb.ensureIndex({ fieldName: 'id', unique: true });
    
    // Sincronizza con il network
    await this.syncWithMainNetwork();
    
    // Auto-sync ogni 30 secondi
    setInterval(() => this.syncWithMainNetwork(), 30000);
  }
  
  async syncWithMainNetwork() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    
    try {
      console.log('Syncing with main network...');
      this.emit('sync-started');
      
      const infoResponse = await fetch(`${this.mainNode}/api/p2p/chain/info`);
      if (!infoResponse.ok) throw new Error('Failed to get chain info');
      const info = await infoResponse.json();
      
      const ourHeight = await this.getHeight();
      const theirHeight = info.height - 1;
      
      console.log(`Local: ${ourHeight}, Network: ${theirHeight}`);
      this.currentDifficulty = info.difficulty || CONSTANTS.INITIAL_DIFFICULTY;
      
      if (theirHeight <= ourHeight) {
        console.log('Already synced');
        this.isConnected = true;
        this.emit('sync-complete', { height: ourHeight, synced: true });
        return;
      }
      
      let fromHeight = ourHeight + 1;
      while (fromHeight <= theirHeight) {
        const blocksResponse = await fetch(
          `${this.mainNode}/api/p2p/chain/blocks?from_height=${fromHeight}&limit=50`
        );
        if (!blocksResponse.ok) throw new Error('Failed to get blocks');
        
        const data = await blocksResponse.json();
        if (!data.blocks || data.blocks.length === 0) break;
        
        for (const block of data.blocks) {
          await this.addBlockFromNetwork(block);
          this.emit('sync-progress', { 
            current: block.index, 
            total: theirHeight,
            percent: Math.round((block.index / theirHeight) * 100)
          });
        }
        fromHeight += data.blocks.length;
      }
      
      this.isConnected = true;
      const finalHeight = await this.getHeight();
      console.log(`Sync complete. Height: ${finalHeight}`);
      this.emit('sync-complete', { height: finalHeight, synced: true });
      
    } catch (error) {
      console.error('Sync error:', error.message);
      this.isConnected = false;
      this.emit('sync-error', { error: error.message });
    } finally {
      this.isSyncing = false;
    }
  }
  
  async addBlockFromNetwork(block) {
    const existing = await this.blocksDb.findOne({ height: block.index });
    if (existing) return;
    
    await this.blocksDb.insert({
      height: block.index,
      hash: block.hash,
      previous_hash: block.previous_hash,
      timestamp: block.timestamp,
      nonce: block.nonce || block.proof || 0,
      difficulty: block.difficulty || CONSTANTS.INITIAL_DIFFICULTY,
      miner: block.miner || 'NETWORK',
      reward: block.reward || getBlockReward(block.index),
      transactions: block.transactions || []
    });
    
    this.emit('block', block);
  }
  
  async getHeight() {
    const latest = await this.blocksDb.find({}).sort({ height: -1 }).limit(1);
    return latest.length > 0 ? latest[0].height : -1;
  }
  
  async getLatestBlock() {
    const blocks = await this.blocksDb.find({}).sort({ height: -1 }).limit(1);
    return blocks[0] || null;
  }
  
  async getBlock(height) {
    return await this.blocksDb.findOne({ height: parseInt(height) });
  }
  
  async getBlocks(limit = 10, skip = 0) {
    return await this.blocksDb.find({}).sort({ height: -1 }).skip(skip).limit(limit);
  }
  
  // Mining REALE
  async mineBlock(minerAddress, onProgress) {
    if (!this.isConnected) {
      await this.syncWithMainNetwork();
    }
    
    this.miningAborted = false;
    
    try {
      const templateResponse = await fetch(`${this.mainNode}/api/mining/template`);
      if (!templateResponse.ok) throw new Error('Failed to get mining template');
      const template = await templateResponse.json();
      
      console.log(`Mining block #${template.index} with difficulty ${template.difficulty}...`);
      
      const target = '0'.repeat(template.difficulty);
      let nonce = 0;
      let hash = '';
      let startTime = Date.now();
      let hashCount = 0;
      
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
            console.log(`Block #${template.index} accepted!`);
            await this.syncWithMainNetwork();
            return { success: true, block: result.block, reward: template.reward };
          } else {
            console.log('Block rejected:', result.detail || 'Unknown error');
            return this.mineBlock(minerAddress, onProgress);
          }
        }
        
        nonce++;
        
        if (nonce % 5000 === 0 && onProgress) {
          const elapsed = (Date.now() - startTime) / 1000;
          const hashrate = Math.round(hashCount / elapsed);
          onProgress({ nonce, hash: hash.substring(0, 16) + '...', hashrate, target });
        }
        
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
  
  stopMining() {
    this.miningAborted = true;
  }
  
  // Wallet
  async createWallet(name) {
    const wallet = generateWallet();
    await this.walletsDb.insert({
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      seedPhrase: wallet.seedPhrase,
      name: name || 'My Wallet',
      createdAt: new Date().toISOString()
    });
    return wallet;
  }
  
  async importWallet(seedPhrase, name) {
    const wallet = importWalletFromSeed(seedPhrase);
    const existing = await this.walletsDb.findOne({ address: wallet.address });
    if (existing) throw new Error('Wallet already exists');
    
    await this.walletsDb.insert({
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      seedPhrase: wallet.seedPhrase,
      name: name || 'Imported Wallet',
      createdAt: new Date().toISOString()
    });
    return wallet;
  }
  
  async getWallets() {
    return await this.walletsDb.find({});
  }
  
  async getWallet(address) {
    return await this.walletsDb.findOne({ address });
  }
  
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
    return 0;
  }
  
  async sendTransaction(privateKey, senderAddress, recipientAddress, amount) {
    const response = await fetch(`${this.mainNode}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_address: senderAddress,
        sender_private_key: privateKey,
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
  
  async getNetworkStats() {
    try {
      const response = await fetch(`${this.mainNode}/api/network/stats`);
      if (response.ok) return await response.json();
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
    return {
      total_supply: CONSTANTS.MAX_SUPPLY,
      circulating_supply: CONSTANTS.PREMINE_AMOUNT,
      total_blocks: 0,
      current_difficulty: this.currentDifficulty
    };
  }
  
  getStats() {
    return {
      difficulty: this.currentDifficulty,
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
  sha256,
  getBlockReward
};
