"""
BricsCoin Ring Signature Engine
================================
Implements Linkable Spontaneous Anonymous Group (LSAG) ring signatures
on secp256k1. Hides the real sender among a set of decoy public keys.

Key Image (I = x * Hp(P)) prevents double-spending while preserving anonymity.
Uses SHA-256 throughout for quantum-resistance at the hash level.
"""

import hashlib
import os
import secrets
from typing import List, Tuple
from ecdsa import SECP256k1, SigningKey, VerifyingKey, ellipticcurve
from ecdsa.ellipticcurve import PointJacobi

CURVE = SECP256k1
ORDER = CURVE.order
G = CURVE.generator


def _int_to_bytes(n: int) -> bytes:
    return n.to_bytes(32, 'big')


def _hash_to_scalar(*args) -> int:
    """Hash arbitrary data to a scalar in the curve order."""
    h = hashlib.sha256()
    for a in args:
        if isinstance(a, int):
            h.update(a.to_bytes(32, 'big'))
        elif isinstance(a, bytes):
            h.update(a)
        elif isinstance(a, str):
            h.update(a.encode())
        elif hasattr(a, 'x') and hasattr(a, 'y'):
            h.update(int(a.x()).to_bytes(32, 'big'))
            h.update(int(a.y()).to_bytes(32, 'big'))
    return int.from_bytes(h.digest(), 'big') % ORDER


def _hash_to_point(data: bytes):
    """
    Hash data to a point on secp256k1.
    Uses try-and-increment: hash data with counter until we get a valid x-coordinate.
    """
    for i in range(256):
        h = hashlib.sha256(data + i.to_bytes(1, 'big')).digest()
        x = int.from_bytes(h, 'big') % CURVE.curve.p()
        # Try to find y for this x on the curve: y^2 = x^3 + 7 (mod p)
        p = CURVE.curve.p()
        y_sq = (pow(x, 3, p) + 7) % p
        # Tonelli-Shanks for sqrt mod p
        y = pow(y_sq, (p + 1) // 4, p)
        if (y * y) % p == y_sq:
            try:
                point = ellipticcurve.PointJacobi(CURVE.curve, x, y, 1)
                # Verify point is on curve by multiplying by order
                check = ORDER * point
                if check == ellipticcurve.INFINITY:
                    return point
            except Exception:
                continue
    raise ValueError("Failed to hash to point")


def _point_to_bytes(point) -> bytes:
    """Serialize an EC point to bytes."""
    if point == ellipticcurve.INFINITY:
        return b'\x00' * 64
    return int(point.x()).to_bytes(32, 'big') + int(point.y()).to_bytes(32, 'big')


def _bytes_to_point(data: bytes):
    """Deserialize bytes to an EC point."""
    if data == b'\x00' * 64:
        return ellipticcurve.INFINITY
    x = int.from_bytes(data[:32], 'big')
    y = int.from_bytes(data[32:], 'big')
    return ellipticcurve.PointJacobi(CURVE.curve, x, y, 1)


def generate_key_image(private_key_hex: str, public_key_hex: str) -> str:
    """
    Generate key image: I = x * Hp(P)
    The key image is unique per private key but doesn't reveal which key was used.
    Used for double-spend prevention in ring signatures.
    """
    x = int(private_key_hex, 16)
    pk_bytes = bytes.fromhex(public_key_hex)
    hp = _hash_to_point(pk_bytes)
    key_image = x * hp
    return _point_to_bytes(key_image).hex()


def ring_sign(
    message: str,
    private_key_hex: str,
    public_keys_hex: List[str],
    real_index: int,
    tx_nonce: str = None,
) -> dict:
    """
    Create a Linkable SAG (LSAG) ring signature.

    Args:
        message: The message to sign
        private_key_hex: Signer's private key (hex)
        public_keys_hex: List of all ring member public keys (hex, 128 chars each)
        real_index: Index of the real signer in the ring
        tx_nonce: Per-transaction nonce (hex). If None, generated randomly.
                  Used to derive unique key_image per transaction (account model).

    Returns:
        Ring signature dict with c0, s values, key_image, tx_nonce, and ring public keys
    """
    n = len(public_keys_hex)
    if n < 2:
        raise ValueError("Ring must have at least 2 members")
    if real_index < 0 or real_index >= n:
        raise ValueError("Invalid real_index")

    # Generate or use tx_nonce for per-TX unique key images
    if tx_nonce is None:
        tx_nonce = secrets.token_hex(32)
    nonce_bytes = bytes.fromhex(tx_nonce)

    # Parse keys
    x = int(private_key_hex, 16)  # real signer's private key
    ring_points = []
    for pk_hex in public_keys_hex:
        pk_bytes = bytes.fromhex(pk_hex)
        vk = VerifyingKey.from_string(pk_bytes, curve=SECP256k1)
        ring_points.append(vk.pubkey.point)

    # Key image: I = x * Hp(P || nonce) — unique per TX via nonce
    real_pk_bytes = bytes.fromhex(public_keys_hex[real_index])
    hp = _hash_to_point(real_pk_bytes + nonce_bytes)
    key_image = x * hp

    # Message hash
    msg_hash = hashlib.sha256(message.encode()).digest()

    # Start signature
    alpha = secrets.randbelow(ORDER - 1) + 1

    # Compute L_pi = alpha * G and R_pi = alpha * Hp(P_pi || nonce)
    L = alpha * G
    R = alpha * hp

    # Initialize c and s arrays
    c = [0] * n
    s = [0] * n

    # Hash to get c_{pi+1}
    c[(real_index + 1) % n] = _hash_to_scalar(
        msg_hash, L, R, key_image
    )

    # Fill in fake responses
    for offset in range(1, n):
        i = (real_index + offset) % n
        s[i] = secrets.randbelow(ORDER - 1) + 1

        # L_i = s_i * G + c_i * P_i
        L_i = s[i] * G + c[i] * ring_points[i]
        # R_i = s_i * Hp(P_i || nonce) + c_i * I
        hp_i = _hash_to_point(bytes.fromhex(public_keys_hex[i]) + nonce_bytes)
        R_i = s[i] * hp_i + c[i] * key_image

        c[(i + 1) % n] = _hash_to_scalar(
            msg_hash, L_i, R_i, key_image
        )

    # Close the ring: s_pi = alpha - c_pi * x (mod ORDER)
    s[real_index] = (alpha - c[real_index] * x) % ORDER

    return {
        "c0": hex(c[0]),
        "s": [hex(si) for si in s],
        "key_image": _point_to_bytes(key_image).hex(),
        "tx_nonce": tx_nonce,
        "ring_size": n,
        "public_keys": public_keys_hex,
        "message_hash": msg_hash.hex(),
    }


def ring_verify(signature: dict, message: str) -> dict:
    """
    Verify a Linkable SAG ring signature.
    Supports both nonce-based (per-TX unique) and legacy (no-nonce) key images.

    Returns verification result with details.
    """
    try:
        c0 = int(signature["c0"], 16)
        s_values = [int(si, 16) for si in signature["s"]]
        key_image = _bytes_to_point(bytes.fromhex(signature["key_image"]))
        public_keys_hex = signature["public_keys"]
        n = len(public_keys_hex)
        tx_nonce = signature.get("tx_nonce")
        nonce_bytes = bytes.fromhex(tx_nonce) if tx_nonce else b""

        if n != signature["ring_size"] or n != len(s_values):
            return {"valid": False, "error": "Ring size mismatch"}

        # Parse ring public keys
        ring_points = []
        for pk_hex in public_keys_hex:
            pk_bytes = bytes.fromhex(pk_hex)
            vk = VerifyingKey.from_string(pk_bytes, curve=SECP256k1)
            ring_points.append(vk.pubkey.point)

        msg_hash = hashlib.sha256(message.encode()).digest()

        # Verify the ring
        c = [0] * n
        c[0] = c0

        for i in range(n):
            # L_i = s_i * G + c_i * P_i
            L_i = s_values[i] * G + c[i] * ring_points[i]
            # R_i = s_i * Hp(P_i || nonce) + c_i * I
            hp_i = _hash_to_point(bytes.fromhex(public_keys_hex[i]) + nonce_bytes)
            R_i = s_values[i] * hp_i + c[i] * key_image

            c[(i + 1) % n] = _hash_to_scalar(
                msg_hash, L_i, R_i, key_image
            )

        # Ring closes if c[0] matches c0
        if c[0] != c0:
            return {"valid": False, "error": "Ring signature verification failed"}

        return {
            "valid": True,
            "ring_size": n,
            "key_image": signature["key_image"],
            "protocol": "LSAG (Linkable SAG)",
            "curve": "secp256k1",
            "sender_hidden": True,
            "nonce_used": bool(tx_nonce),
        }

    except Exception as e:
        return {"valid": False, "error": str(e)}


def get_decoy_keys(db_wallets: List[dict], exclude_address: str, count: int = 5) -> List[str]:
    """
    Select decoy public keys from existing wallets for ring construction.
    Returns list of public key hex strings.
    """
    decoys = []
    for w in db_wallets:
        if w.get("address") != exclude_address and w.get("public_key"):
            decoys.append(w["public_key"])
            if len(decoys) >= count:
                break
    return decoys
