/**
 * BricsCoin Client-Side Cryptography
 * 
 * SECURITY: Private keys NEVER leave the browser.
 * All signing is done locally.
 */

import { ec as EC } from 'elliptic';
import { sha256 } from 'js-sha256';

// Use secp256k1 curve (same as Bitcoin)
const ec = new EC('secp256k1');

/**
 * Sign a transaction locally (private key never sent to server)
 * @param {string} privateKeyHex - The private key in hex format
 * @param {string} transactionData - The data to sign
 * @returns {string} - The signature in hex format
 */
export function signTransaction(privateKeyHex, transactionData) {
  try {
    const key = ec.keyFromPrivate(privateKeyHex, 'hex');
    const msgHash = sha256(transactionData);
    const signature = key.sign(msgHash);
    
    // Convert to DER format and then to hex
    return signature.toDER('hex');
  } catch (error) {
    console.error('Signing error:', error);
    throw new Error('Failed to sign transaction');
  }
}

/**
 * Get public key from private key
 * @param {string} privateKeyHex - The private key in hex format
 * @returns {string} - The public key in hex format (uncompressed, 128 chars)
 */
export function getPublicKey(privateKeyHex) {
  try {
    const key = ec.keyFromPrivate(privateKeyHex, 'hex');
    // Get uncompressed public key (remove '04' prefix for 128 char format)
    const pubKey = key.getPublic('hex');
    // Remove the '04' prefix if present (uncompressed format marker)
    return pubKey.startsWith('04') ? pubKey.slice(2) : pubKey;
  } catch (error) {
    console.error('Public key derivation error:', error);
    throw new Error('Failed to derive public key');
  }
}

/**
 * Verify that a private key matches an address
 * @param {string} privateKeyHex - The private key in hex format
 * @param {string} address - The BRICS address to verify
 * @returns {boolean} - True if the private key matches the address
 */
export function verifyKeyMatchesAddress(privateKeyHex, address) {
  try {
    const publicKey = getPublicKey(privateKeyHex);
    const addressHash = sha256(publicKey);
    const expectedAddress = 'BRICS' + addressHash.slice(0, 40);
    return expectedAddress === address;
  } catch (error) {
    return false;
  }
}

/**
 * Create the transaction data string for signing
 * @param {string} senderAddress - Sender's BRICS address
 * @param {string} recipientAddress - Recipient's BRICS address
 * @param {number} amount - Amount to send
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - The transaction data string
 */
export function createTransactionData(senderAddress, recipientAddress, amount, timestamp) {
  return `${senderAddress}${recipientAddress}${amount}${timestamp}`;
}

/**
 * Prepare a secure transaction for submission
 * @param {object} wallet - Wallet object with address and private_key
 * @param {string} recipientAddress - Recipient's BRICS address
 * @param {number} amount - Amount to send
 * @returns {object} - Transaction ready for secure submission (no private key!)
 */
export function prepareSecureTransaction(wallet, recipientAddress, amount) {
  const timestamp = new Date().toISOString();
  const transactionData = createTransactionData(
    wallet.address,
    recipientAddress,
    amount,
    timestamp
  );
  
  // Sign locally - private key never leaves browser
  const signature = signTransaction(wallet.private_key, transactionData);
  const publicKey = getPublicKey(wallet.private_key);
  
  // Return transaction WITHOUT private key
  return {
    sender_address: wallet.address,
    recipient_address: recipientAddress,
    amount: amount,
    timestamp: timestamp,
    signature: signature,
    public_key: publicKey
  };
}

/**
 * Validate address format
 * @param {string} address - The address to validate
 * @returns {boolean} - True if valid BRICS address
 */
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') return false;
  if (!address.startsWith('BRICS')) return false;
  if (address.length !== 45) return false; // BRICS + 40 hex chars
  const hexPart = address.slice(5);
  return /^[a-fA-F0-9]{40}$/.test(hexPart);
}

/**
 * Validate private key format
 * @param {string} privateKey - The private key to validate
 * @returns {boolean} - True if valid private key
 */
export function isValidPrivateKey(privateKey) {
  if (!privateKey || typeof privateKey !== 'string') return false;
  if (privateKey.length !== 64) return false;
  return /^[a-fA-F0-9]{64}$/.test(privateKey);
}

export default {
  signTransaction,
  getPublicKey,
  verifyKeyMatchesAddress,
  createTransactionData,
  prepareSecureTransaction,
  isValidAddress,
  isValidPrivateKey
};
