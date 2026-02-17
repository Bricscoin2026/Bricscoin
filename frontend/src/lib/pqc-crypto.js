/**
 * BricsCoin Post-Quantum Client-Side Cryptography
 * 
 * SECURITY: ALL private keys and signing happen ONLY in the browser.
 * Uses hybrid ECDSA (secp256k1) + ML-DSA-65 (FIPS 204) signatures.
 * 
 * ECDSA: SHA-256 hash + raw r||s signature (128 hex chars)
 * ML-DSA-65: @noble/post-quantum (NIST FIPS 204 standard)
 */

import { ec as EC } from 'elliptic';
import { sha256 } from 'js-sha256';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';

const ec = new EC('secp256k1');

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sign with ECDSA (secp256k1) using SHA-256 hash, output raw r||s hex.
 * Compatible with Python ecdsa library's verify_digest(sig, sha256(msg))
 */
function ecdsaSign(privateKeyHex, messageStr) {
  const key = ec.keyFromPrivate(privateKeyHex, 'hex');
  // Hash message with SHA-256 (same as backend)
  const msgHash = sha256(messageStr);
  const signature = key.sign(msgHash);
  // Output raw r||s format (64 bytes = 128 hex chars) for python-ecdsa compatibility
  const r = signature.r.toString(16).padStart(64, '0');
  const s = signature.s.toString(16).padStart(64, '0');
  return r + s;
}

/**
 * Sign with ML-DSA-65 (FIPS 204) - quantum-resistant
 */
function mlDsaSign(secretKeyHex, messageStr) {
  const sk = hexToBytes(secretKeyHex);
  const msg = new TextEncoder().encode(messageStr);
  const sig = ml_dsa65.sign(msg, sk);
  return bytesToHex(sig);
}

/**
 * Verify ML-DSA-65 signature locally (optional client-side check)
 */
export function mlDsaVerify(publicKeyHex, messageStr, signatureHex) {
  try {
    const pk = hexToBytes(publicKeyHex);
    const msg = new TextEncoder().encode(messageStr);
    const sig = hexToBytes(signatureHex);
    return ml_dsa65.verify(sig, msg, pk);
  } catch {
    return false;
  }
}

/**
 * Create a hybrid PQC signature (ECDSA + ML-DSA-65)
 * Both signatures are created client-side. Private keys NEVER leave the browser.
 */
export function hybridSign(wallet, message) {
  const ecdsaSig = ecdsaSign(wallet.ecdsa_private_key, message);
  const mlDsaSig = mlDsaSign(wallet.dilithium_secret_key, message);

  return {
    ecdsa_signature: ecdsaSig,
    dilithium_signature: mlDsaSig,
    scheme: 'ecdsa_secp256k1+ml-dsa-65'
  };
}

/**
 * Prepare a PQC transaction for secure submission.
 * Signs with BOTH ECDSA and ML-DSA-65 locally.
 * Private keys NEVER leave the browser.
 */
export function preparePQCTransaction(wallet, recipientAddress, amount) {
  const timestamp = new Date().toISOString();
  const txData = `${wallet.address}${recipientAddress}${amount}${timestamp}`;

  const signatures = hybridSign(wallet, txData);

  return {
    sender_address: wallet.address,
    recipient_address: recipientAddress,
    amount: amount,
    timestamp: timestamp,
    ecdsa_signature: signatures.ecdsa_signature,
    dilithium_signature: signatures.dilithium_signature,
    ecdsa_public_key: wallet.ecdsa_public_key,
    dilithium_public_key: wallet.dilithium_public_key
  };
}

/**
 * Validate PQC address format
 */
export function isValidPQCAddress(address) {
  if (!address || typeof address !== 'string') return false;
  if (!address.startsWith('BRICSPQ')) return false;
  if (address.length !== 45) return false;
  const hexPart = address.slice(7);
  return /^[a-fA-F0-9]{38}$/.test(hexPart);
}

export default {
  hybridSign,
  preparePQCTransaction,
  mlDsaVerify,
  isValidPQCAddress
};
