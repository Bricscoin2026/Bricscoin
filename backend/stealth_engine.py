"""
BricsCoin Stealth Address Engine
=================================
Implements Diffie-Hellman Stealth Address Protocol on secp256k1.
Hides the real receiver by generating one-time addresses.

Protocol:
1. Recipient publishes stealth meta-address: (scan_pubkey S, spend_pubkey B)
2. Sender generates ephemeral keypair (r, R=rG), computes one-time address:
   P = Hs(rS)G + B
3. Sender publishes R alongside the transaction
4. Recipient scans: checks P == Hs(sR)G + B (where s is scan private key)
5. Recipient spends with key: Hs(sR) + b (where b is spend private key)

SHA-256 used for key derivation (quantum-resistant at hash level).
"""

import hashlib
import secrets
from typing import Tuple, Optional
from ecdsa import SECP256k1, SigningKey, VerifyingKey, ellipticcurve

CURVE = SECP256k1
ORDER = CURVE.order
G = CURVE.generator


def _hash_to_scalar(data: bytes) -> int:
    """Hash data to a scalar mod curve order."""
    h = hashlib.sha256(data).digest()
    return int.from_bytes(h, 'big') % ORDER


def _point_to_bytes(point) -> bytes:
    """Serialize EC point to 64 bytes."""
    return int(point.x()).to_bytes(32, 'big') + int(point.y()).to_bytes(32, 'big')


def _bytes_to_point(data: bytes):
    """Deserialize 64 bytes to EC point."""
    x = int.from_bytes(data[:32], 'big')
    y = int.from_bytes(data[32:], 'big')
    return ellipticcurve.PointJacobi(CURVE.curve, x, y, 1)


def generate_stealth_meta_address() -> dict:
    """
    Generate a stealth meta-address for a recipient.

    Returns:
        scan_private_key, scan_public_key,
        spend_private_key, spend_public_key
    """
    # Scan keypair
    scan_sk = SigningKey.generate(curve=SECP256k1)
    scan_pk = scan_sk.get_verifying_key()

    # Spend keypair
    spend_sk = SigningKey.generate(curve=SECP256k1)
    spend_pk = spend_sk.get_verifying_key()

    return {
        "scan_private_key": scan_sk.to_string().hex(),
        "scan_public_key": scan_pk.to_string().hex(),
        "spend_private_key": spend_sk.to_string().hex(),
        "spend_public_key": spend_pk.to_string().hex(),
        "stealth_meta_address": f"BRICSTEALTH{scan_pk.to_string().hex()[:32]}{spend_pk.to_string().hex()[:32]}",
    }


def generate_stealth_address(scan_pubkey_hex: str, spend_pubkey_hex: str) -> dict:
    """
    Generate a one-time stealth address for the recipient.
    Called by the SENDER.

    Args:
        scan_pubkey_hex: Recipient's scan public key (hex)
        spend_pubkey_hex: Recipient's spend public key (hex)

    Returns:
        stealth_address: The one-time address
        ephemeral_pubkey: R = rG (published with the transaction)
        ephemeral_private_key: r (kept by sender for reference)
    """
    # Parse recipient's public keys
    scan_pk = VerifyingKey.from_string(bytes.fromhex(scan_pubkey_hex), curve=SECP256k1)
    spend_pk = VerifyingKey.from_string(bytes.fromhex(spend_pubkey_hex), curve=SECP256k1)

    S = scan_pk.pubkey.point
    B = spend_pk.pubkey.point

    # Generate ephemeral keypair
    r = secrets.randbelow(ORDER - 1) + 1
    R = r * G  # Ephemeral public key

    # Compute shared secret: rS
    shared_secret = r * S
    shared_bytes = _point_to_bytes(shared_secret)

    # Derive scalar: Hs(rS)
    hs = _hash_to_scalar(b'BRICS_STEALTH_V1' + shared_bytes)

    # One-time address: P = Hs(rS)*G + B
    P = hs * G + B

    # Derive BRICS address from P
    p_bytes = _point_to_bytes(P)
    addr_hash = hashlib.sha256(p_bytes).hexdigest()
    stealth_address = "BRICSX" + addr_hash[:39]  # BRICSX prefix for stealth

    return {
        "stealth_address": stealth_address,
        "stealth_pubkey": p_bytes.hex(),
        "ephemeral_pubkey": _point_to_bytes(R).hex(),
        "ephemeral_private_key": hex(r)[2:].zfill(64),
    }


def scan_for_stealth_payments(
    scan_private_key_hex: str,
    spend_pubkey_hex: str,
    ephemeral_pubkeys: list
) -> list:
    """
    Scan transactions to find stealth payments addressed to us.
    Called by the RECIPIENT.

    For each ephemeral pubkey R in transactions:
    1. Compute shared secret: sR (s = scan private key)
    2. Derive one-time pubkey: P' = Hs(sR)*G + B
    3. Check if P' matches the transaction's destination

    Args:
        scan_private_key_hex: Recipient's scan private key
        spend_pubkey_hex: Recipient's spend public key
        ephemeral_pubkeys: List of {tx_id, ephemeral_pubkey, stealth_address, ...}

    Returns:
        List of matched payments with spending keys
    """
    s = int(scan_private_key_hex, 16)
    spend_pk = VerifyingKey.from_string(bytes.fromhex(spend_pubkey_hex), curve=SECP256k1)
    B = spend_pk.pubkey.point

    matched = []
    for tx_info in ephemeral_pubkeys:
        try:
            R = _bytes_to_point(bytes.fromhex(tx_info["ephemeral_pubkey"]))

            # Shared secret: sR
            shared_secret = s * R
            shared_bytes = _point_to_bytes(shared_secret)

            # Hs(sR)
            hs = _hash_to_scalar(b'BRICS_STEALTH_V1' + shared_bytes)

            # Expected one-time pubkey: P' = Hs(sR)*G + B
            P_prime = hs * G + B
            p_bytes = _point_to_bytes(P_prime)
            addr_hash = hashlib.sha256(p_bytes).hexdigest()
            expected_address = "BRICSX" + addr_hash[:39]

            if expected_address == tx_info.get("stealth_address"):
                matched.append({
                    "tx_id": tx_info.get("tx_id"),
                    "stealth_address": expected_address,
                    "stealth_pubkey": p_bytes.hex(),
                    "detected": True,
                })
        except Exception:
            continue

    return matched


def derive_stealth_spending_key(
    scan_private_key_hex: str,
    spend_private_key_hex: str,
    ephemeral_pubkey_hex: str
) -> str:
    """
    Derive the private key for spending from a stealth address.
    spending_key = Hs(sR) + b (mod ORDER)

    Args:
        scan_private_key_hex: Recipient's scan private key
        spend_private_key_hex: Recipient's spend private key
        ephemeral_pubkey_hex: The ephemeral pubkey from the transaction

    Returns:
        The spending private key hex
    """
    s = int(scan_private_key_hex, 16)
    b = int(spend_private_key_hex, 16)
    R = _bytes_to_point(bytes.fromhex(ephemeral_pubkey_hex))

    # Shared secret: sR
    shared_secret = s * R
    shared_bytes = _point_to_bytes(shared_secret)

    # Hs(sR)
    hs = _hash_to_scalar(b'BRICS_STEALTH_V1' + shared_bytes)

    # Spending key: Hs(sR) + b (mod ORDER)
    spending_key = (hs + b) % ORDER

    return hex(spending_key)[2:].zfill(64)
