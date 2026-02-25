# ================================================================
# BRICScoin Node — Integrated Wallet
# ================================================================
# Local wallet that works with the node's own copy of the blockchain.
# No central server needed — fully independent.
# ================================================================

import hashlib
import json
import os
import time
import logging
from typing import Optional
from datetime import datetime, timezone

from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError, util
from mnemonic import Mnemonic

log = logging.getLogger("bricscoin.wallet")
mnemo = Mnemonic("english")

WALLET_FILE = os.environ.get("WALLET_FILE", "wallet.dat")
TRANSACTION_FEE = 0.000005


def sha256_hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


# ==================== KEY MANAGEMENT ====================

def generate_wallet(seed_phrase: str = None) -> dict:
    """Generate a new wallet or recover from seed phrase."""
    if seed_phrase:
        if not mnemo.check(seed_phrase):
            raise ValueError("Invalid seed phrase")
        seed = mnemo.to_seed(seed_phrase)
    else:
        seed_phrase = mnemo.generate(strength=128)  # 12 words
        seed = mnemo.to_seed(seed_phrase)

    private_key_bytes = seed[:32]
    private_key = SigningKey.from_string(private_key_bytes, curve=SECP256k1)
    public_key = private_key.get_verifying_key()

    pub_hex = public_key.to_string().hex()
    address = "BRICS" + sha256_hash(pub_hex)[:40]

    return {
        "address": address,
        "public_key": pub_hex,
        "private_key": private_key.to_string().hex(),
        "seed_phrase": seed_phrase,
    }


def recover_from_private_key(private_key_hex: str) -> dict:
    """Recover wallet from a private key hex string."""
    private_key = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
    public_key = private_key.get_verifying_key()
    pub_hex = public_key.to_string().hex()
    address = "BRICS" + sha256_hash(pub_hex)[:40]
    return {
        "address": address,
        "public_key": pub_hex,
        "private_key": private_key_hex,
    }


def address_from_pubkey(public_key_hex: str) -> str:
    return "BRICS" + sha256_hash(public_key_hex)[:40]


# ==================== SIGNING ====================

def js_number_str(n):
    """Format number like JavaScript (no trailing .0 for integers)."""
    if isinstance(n, float) and n == int(n):
        return str(int(n))
    return str(n)


def build_tx_data(sender: str, recipient: str, amount, timestamp: str) -> str:
    """Build the canonical transaction data string (must match main server)."""
    return f"{sender}{recipient}{js_number_str(amount)}{timestamp}"


def sign_transaction(private_key_hex: str, tx_data: str) -> str:
    """Sign transaction data with ECDSA (SHA-256 digest)."""
    private_key = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
    msg_hash = hashlib.sha256(tx_data.encode()).digest()
    sig = private_key.sign_digest(msg_hash)
    return sig.hex()


def verify_signature(public_key_hex: str, signature_hex: str, tx_data: str) -> bool:
    """Verify an ECDSA signature."""
    try:
        public_key = VerifyingKey.from_string(bytes.fromhex(public_key_hex), curve=SECP256k1)
        msg_hash = hashlib.sha256(tx_data.encode()).digest()
        sig_bytes = bytes.fromhex(signature_hex)
        if len(sig_bytes) > 64 and sig_bytes[0] == 0x30:
            return public_key.verify_digest(sig_bytes, msg_hash, sigdecode=util.sigdecode_der)
        return public_key.verify_digest(sig_bytes, msg_hash)
    except (BadSignatureError, Exception):
        return False


# ==================== WALLET FILE ====================

def save_wallet_to_file(wallet_data: dict, filepath: str = None):
    """Save wallet to disk (plaintext — user should encrypt their disk)."""
    path = filepath or WALLET_FILE
    safe = {
        "address": wallet_data["address"],
        "public_key": wallet_data["public_key"],
        "private_key": wallet_data["private_key"],
        "seed_phrase": wallet_data.get("seed_phrase", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with open(path, "w") as f:
        json.dump(safe, f, indent=2)
    log.info(f"Wallet saved to {path}")


def load_wallet_from_file(filepath: str = None) -> Optional[dict]:
    """Load wallet from disk."""
    path = filepath or WALLET_FILE
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return json.load(f)


# ==================== TRANSACTION CREATION ====================

def create_transaction(private_key_hex: str, sender: str, recipient: str, amount: float) -> dict:
    """Create a signed transaction ready for broadcast."""
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if not recipient.startswith("BRICS") or len(recipient) < 40:
        raise ValueError("Invalid recipient address")

    timestamp = datetime.now(timezone.utc).isoformat()
    tx_data = build_tx_data(sender, recipient, amount, timestamp)
    signature = sign_transaction(private_key_hex, tx_data)

    # Recover public key for verification
    wallet = recover_from_private_key(private_key_hex)

    tx = {
        "id": sha256_hash(f"{sender}{recipient}{amount}{timestamp}{signature}"),
        "sender": sender,
        "recipient": recipient,
        "amount": amount,
        "fee": TRANSACTION_FEE,
        "timestamp": timestamp,
        "signature": signature,
        "public_key": wallet["public_key"],
        "confirmed": False,
        "type": "transfer",
    }
    return tx
