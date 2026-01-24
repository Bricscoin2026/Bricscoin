// BricsCoin Mining Web Worker
// This runs in background even when user switches tabs

let isRunning = false;
let hashCount = 0;
let startTime = 0;

// SHA256 implementation for Web Worker
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Main mining loop
async function mineLoop(blockData, target, batchSize = 1000) {
  let nonce = 0;
  
  while (isRunning) {
    for (let i = 0; i < batchSize && isRunning; i++) {
      const testData = blockData + nonce;
      const hash = await sha256(testData);
      
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
        return { found: true, nonce, hash };
      }
      
      nonce++;
      
      // Send progress update every 100 hashes
      if (hashCount % 100 === 0) {
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
    
    // Small yield to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return { found: false, nonce, hashCount };
}

// Handle messages from main thread
self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'START':
      if (!isRunning) {
        isRunning = true;
        hashCount = 0;
        startTime = Date.now();
        
        self.postMessage({ type: 'STARTED' });
        
        const result = await mineLoop(data.blockData, data.target);
        
        if (!result.found) {
          self.postMessage({ 
            type: 'STOPPED',
            hashCount,
            finalNonce: result.nonce
          });
        }
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
      await new Promise(resolve => setTimeout(resolve, 100));
      isRunning = true;
      hashCount = 0;
      startTime = Date.now();
      
      const newResult = await mineLoop(data.blockData, data.target);
      
      if (!newResult.found) {
        self.postMessage({ 
          type: 'STOPPED',
          hashCount,
          finalNonce: newResult.nonce
        });
      }
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
