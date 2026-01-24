// BricsCoin Mining Web Worker
// This runs in background even when user switches tabs

let isRunning = false;
let hashCount = 0;
let startTime = 0;

// Pure JavaScript SHA256 implementation (no crypto.subtle needed)
function sha256(message) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words = [];
  const asciiBitLength = message.length * 8;

  let hash = sha256.h = sha256.h || [];
  let k = sha256.k = sha256.k || [];
  let primeCounter = k.length;

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 2; i++) {
        if (primeCounter < 8) {
          hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        }
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
      for (let factor = candidate * candidate; factor < 257; factor += candidate) {
        isComposite[factor] = true;
      }
    }
  }

  message += '\x80';
  while ((message.length % 64) - 56) message += '\x00';
  
  for (let i = 0; i < message.length; i++) {
    const j = message.charCodeAt(i);
    if (j >> 8) return;
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];

      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
          w[i - 16]
          + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
          + w[i - 7]
          + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
        ) | 0);

      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }
  
  // Reset for next call
  sha256.h = undefined;
  sha256.k = undefined;
  
  return result;
}

// Main mining loop
function mineLoop(blockData, target, batchSize) {
  batchSize = batchSize || 1000;
  let nonce = 0;
  
  function processBatch() {
    if (!isRunning) {
      self.postMessage({ 
        type: 'STOPPED',
        hashCount
      });
      return;
    }
    
    for (let i = 0; i < batchSize && isRunning; i++) {
      const testData = blockData + nonce;
      const hash = sha256(testData);
      
      hashCount++;
      
      // Check if hash meets target
      if (hash.startsWith(target)) {
        // Found valid block!
        self.postMessage({
          type: 'BLOCK_FOUND',
          nonce,
          hash,
          hashCount
        });
        return;
      }
      
      nonce++;
      
      // Send progress update every 500 hashes
      if (hashCount % 500 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const hashrate = elapsed > 0 ? Math.round(hashCount / elapsed) : 0;
        
        self.postMessage({
          type: 'PROGRESS',
          nonce,
          hash,
          hashCount,
          hashrate
        });
      }
    }
    
    // Continue with next batch (yield to prevent blocking)
    if (isRunning) {
      setTimeout(processBatch, 0);
    }
  }
  
  processBatch();
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'START':
      if (!isRunning) {
        isRunning = true;
        hashCount = 0;
        startTime = Date.now();
        
        self.postMessage({ type: 'STARTED' });
        mineLoop(data.blockData, data.target);
      }
      break;
      
    case 'STOP':
      isRunning = false;
      self.postMessage({ 
        type: 'STOPPED',
        hashCount
      });
      break;
      
    case 'NEW_JOB':
      // Restart with new block data
      isRunning = false;
      setTimeout(function() {
        isRunning = true;
        hashCount = 0;
        startTime = Date.now();
        mineLoop(data.blockData, data.target);
      }, 100);
      break;
      
    case 'GET_STATUS':
      const elapsed = startTime > 0 ? (Date.now() - startTime) / 1000 : 0;
      const hashrate = elapsed > 0 ? Math.round(hashCount / elapsed) : 0;
      
      self.postMessage({
        type: 'STATUS',
        isRunning,
        hashCount,
        hashrate
      });
      break;
  }
};
