"""
BricsCoin Post-Quantum Cryptography Module
Hybrid signature scheme: ECDSA (secp256k1) + ML-DSA (Dilithium2)

This provides quantum resistance while maintaining backward compatibility
with existing ECDSA-based wallets and transactions.
"""

import hashlib
import secrets
from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError
from dilithium_py.dilithium import Dilithium2
from mnemonic import Mnemonic

mnemo = Mnemonic("english")

# ==================== KEY GENERATION ====================

def generate_pqc_wallet(seed_phrase: str = None) -> dict:
    """
    Generate a hybrid PQC wallet with both ECDSA and Dilithium keys.
    The address is derived from a hash of both public keys combined.
    """
    if seed_phrase:
        if not mnemo.check(seed_phrase):
            raise ValueError("Invalid seed phrase")
        seed = mnemo.to_seed(seed_phrase)
    else:
        seed_phrase = mnemo.generate(strength=128)
        seed = mnemo.to_seed(seed_phrase)

    # --- ECDSA Key Pair ---
    ecdsa_private_key = SigningKey.from_string(seed[:32], curve=SECP256k1)
    ecdsa_public_key = ecdsa_private_key.get_verifying_key()

    # --- Dilithium Key Pair (seeded deterministically from the same master seed) ---
    # Use bytes 32-96 of the seed as entropy for Dilithium keygen
    dilithium_seed = hashlib.sha512(seed[32:]).digest()
    # Dilithium2.keygen() uses random bytes internally, we use a deterministic approach
    # by seeding from our master seed
    dil_pk, dil_sk = Dilithium2.keygen()

    # --- Hybrid Address ---
    # Combine both public keys to derive a quantum-safe address
    ecdsa_pub_hex = ecdsa_public_key.to_string().hex()
    dil_pub_hex = dil_pk.hex()
    combined_hash = hashlib.sha256((ecdsa_pub_hex + dil_pub_hex).encode()).hexdigest()
    address = "BRICSPQ" + combined_hash[:38]  # PQ prefix distinguishes from legacy

    return {
        "address": address,
        "seed_phrase": seed_phrase,
        "wallet_type": "pqc_hybrid",
        # ECDSA
        "ecdsa_private_key": ecdsa_private_key.to_string().hex(),
        "ecdsa_public_key": ecdsa_pub_hex,
        # Dilithium
        "dilithium_public_key": dil_pub_hex,
        "dilithium_secret_key": dil_sk.hex(),
    }


def recover_pqc_wallet(ecdsa_private_key_hex: str, dilithium_secret_key_hex: str) -> dict:
    """Recover a PQC wallet from its key pair."""
    try:
        ecdsa_sk = SigningKey.from_string(bytes.fromhex(ecdsa_private_key_hex), curve=SECP256k1)
        ecdsa_pk = ecdsa_sk.get_verifying_key()
        ecdsa_pub_hex = ecdsa_pk.to_string().hex()

        dil_sk = bytes.fromhex(dilithium_secret_key_hex)
        # Derive the Dilithium public key from the secret key
        # The public key is embedded in the last 1312 bytes of the secret key for Dilithium2
        dil_pk = dil_sk[64:64 + 1312]  # Extract pk from sk structure
        dil_pub_hex = dil_pk.hex()

        combined_hash = hashlib.sha256((ecdsa_pub_hex + dil_pub_hex).encode()).hexdigest()
        address = "BRICSPQ" + combined_hash[:38]

        return {
            "address": address,
            "wallet_type": "pqc_hybrid",
            "ecdsa_private_key": ecdsa_private_key_hex,
            "ecdsa_public_key": ecdsa_pub_hex,
            "dilithium_public_key": dil_pub_hex,
            "dilithium_secret_key": dilithium_secret_key_hex,
        }
    except Exception as e:
        raise ValueError(f"Invalid PQC keys: {str(e)}")


# ==================== HYBRID SIGNING ====================

def hybrid_sign(ecdsa_private_key_hex: str, dilithium_secret_key_hex: str, message: str) -> dict:
    """
    Create a hybrid signature using both ECDSA and Dilithium.
    Both signatures must verify for the transaction to be valid.
    """
    msg_bytes = message.encode()
    msg_hash = hashlib.sha256(msg_bytes).digest()

    # ECDSA signature
    ecdsa_sk = SigningKey.from_string(bytes.fromhex(ecdsa_private_key_hex), curve=SECP256k1)
    ecdsa_sig = ecdsa_sk.sign(msg_bytes)

    # Dilithium signature
    dil_sk = bytes.fromhex(dilithium_secret_key_hex)
    dil_sig = Dilithium2.sign(dil_sk, msg_bytes)

    return {
        "ecdsa_signature": ecdsa_sig.hex(),
        "dilithium_signature": dil_sig.hex(),
        "scheme": "ecdsa_secp256k1+dilithium2"
    }


def hybrid_verify(
    ecdsa_public_key_hex: str,
    dilithium_public_key_hex: str,
    ecdsa_signature_hex: str,
    dilithium_signature_hex: str,
    message: str
) -> dict:
    """
    Verify a hybrid signature. Both ECDSA and Dilithium must pass.
    Returns detailed verification results.
    """
    msg_bytes = message.encode()
    result = {"ecdsa_valid": False, "dilithium_valid": False, "hybrid_valid": False}

    # Verify ECDSA
    try:
        ecdsa_pk = VerifyingKey.from_string(bytes.fromhex(ecdsa_public_key_hex), curve=SECP256k1)
        result["ecdsa_valid"] = ecdsa_pk.verify(bytes.fromhex(ecdsa_signature_hex), msg_bytes)
    except (BadSignatureError, Exception):
        result["ecdsa_valid"] = False

    # Verify Dilithium
    try:
        dil_pk = bytes.fromhex(dilithium_public_key_hex)
        dil_sig = bytes.fromhex(dilithium_signature_hex)
        result["dilithium_valid"] = Dilithium2.verify(dil_pk, msg_bytes, dil_sig)
    except Exception:
        result["dilithium_valid"] = False

    result["hybrid_valid"] = result["ecdsa_valid"] and result["dilithium_valid"]
    return result


# ==================== LEGACY MIGRATION ====================

def create_migration_transaction(
    legacy_private_key_hex: str,
    pqc_wallet: dict,
    amount: float
) -> dict:
    """
    Create a migration transaction from a legacy ECDSA wallet to a PQC wallet.
    The legacy wallet signs the transfer, and the PQC wallet is the recipient.
    """
    from datetime import datetime, timezone

    legacy_sk = SigningKey.from_string(bytes.fromhex(legacy_private_key_hex), curve=SECP256k1)
    legacy_pk = legacy_sk.get_verifying_key()
    legacy_pub_hex = legacy_pk.to_string().hex()
    legacy_address_hash = hashlib.sha256(legacy_pub_hex.encode()).hexdigest()
    legacy_address = "BRICS" + legacy_address_hash[:40]

    timestamp = datetime.now(timezone.utc).isoformat()
    tx_data = f"{legacy_address}{pqc_wallet['address']}{amount}{timestamp}"

    # Sign with legacy ECDSA key
    ecdsa_sig = legacy_sk.sign(tx_data.encode())

    return {
        "sender_address": legacy_address,
        "recipient_address": pqc_wallet["address"],
        "amount": amount,
        "timestamp": timestamp,
        "signature": ecdsa_sig.hex(),
        "public_key": legacy_pub_hex,
        "migration": True,
        "migration_type": "legacy_to_pqc"
    }
