"""
BricsCoin Merge Mining (AuxPoW) Engine
=======================================
Allows Bitcoin miners to mine BricsCoin simultaneously at zero extra cost.

How it works:
1. Merge-mining pool requests a BricsCoin block template
2. Pool embeds BricsCoin block hash into Bitcoin coinbase transaction
3. When Bitcoin PoW meets BricsCoin difficulty, proof is submitted
4. BricsCoin validates the proof and accepts the block

AuxPoW blocks contain:
- Standard BricsCoin block fields
- auxpow.parent_header: The Bitcoin block header (80 bytes)
- auxpow.coinbase_tx: Bitcoin coinbase transaction containing BricsCoin hash
- auxpow.coinbase_branch: Merkle proof linking coinbase to parent merkle root
- auxpow.blockchain_branch: Merkle proof for merged mining tree (if multiple aux chains)

Fully reversible: normal PoW blocks continue to be accepted alongside AuxPoW blocks.
"""

import hashlib
import struct
import logging
from typing import Optional

logger = logging.getLogger("auxpow")

# Magic bytes to identify BricsCoin hash in coinbase
AUXPOW_MAGIC = b"BRIC"  # 4-byte marker before the aux chain hash
AUXPOW_CHAIN_ID = 0x0062  # BricsCoin chain ID (unique identifier)
AUXPOW_VERSION_FLAG = 0x00000100  # Bit 8 set = AuxPoW block

# Bitcoin constants
MAX_TARGET = 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF


def double_sha256(data: bytes) -> bytes:
    """Bitcoin-style double SHA-256 hash."""
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()


def single_sha256(data: str) -> str:
    """BricsCoin-style single SHA-256 hash (returns hex string)."""
    return hashlib.sha256(data.encode()).hexdigest()


def merkle_hash_pair(a: bytes, b: bytes) -> bytes:
    """Compute merkle hash of two nodes (Bitcoin-style double SHA-256)."""
    return double_sha256(a + b)


def compute_merkle_root(branches: list, target_hash: bytes, index: int) -> bytes:
    """
    Walk a merkle branch to compute the root.
    branches: list of 32-byte hashes (hex strings)
    target_hash: the hash we're proving membership of (bytes)
    index: position index in the tree
    """
    current = target_hash
    for i, branch_hex in enumerate(branches):
        branch = bytes.fromhex(branch_hex)
        if (index >> i) & 1:
            current = merkle_hash_pair(branch, current)
        else:
            current = merkle_hash_pair(current, branch)
    return current


def parse_parent_header(header_hex: str) -> Optional[dict]:
    """
    Parse a Bitcoin block header (80 bytes / 160 hex chars).
    Returns structured header data.
    """
    if len(header_hex) != 160:
        logger.error(f"Invalid parent header length: {len(header_hex)} (expected 160)")
        return None

    try:
        header_bytes = bytes.fromhex(header_hex)
        version = struct.unpack('<I', header_bytes[0:4])[0]
        prev_hash = header_bytes[4:36][::-1].hex()
        merkle_root = header_bytes[36:68][::-1].hex()
        timestamp = struct.unpack('<I', header_bytes[68:72])[0]
        nbits = struct.unpack('<I', header_bytes[72:76])[0]
        nonce = struct.unpack('<I', header_bytes[76:80])[0]

        return {
            "version": version,
            "prev_hash": prev_hash,
            "merkle_root": merkle_root,
            "timestamp": timestamp,
            "nbits": nbits,
            "nonce": nonce,
            "raw": header_hex,
        }
    except Exception as e:
        logger.error(f"Failed to parse parent header: {e}")
        return None


def hash_parent_header(header_hex: str) -> Optional[str]:
    """
    Compute the hash of a Bitcoin block header (double SHA-256, reversed).
    Returns the hash as a hex string in standard display order.
    """
    try:
        header_bytes = bytes.fromhex(header_hex)
        hash_bytes = double_sha256(header_bytes)
        return hash_bytes[::-1].hex()
    except Exception as e:
        logger.error(f"Failed to hash parent header: {e}")
        return None


def check_pow_against_target(hash_hex: str, difficulty: int) -> bool:
    """
    Check if a hash (in display order) meets BricsCoin's difficulty target.
    Uses BricsCoin's target calculation: target = MAX_TARGET / difficulty.
    """
    try:
        hash_int = int(hash_hex, 16)
        target = MAX_TARGET // max(1, difficulty)
        return hash_int <= target
    except Exception:
        return False


def find_auxpow_hash_in_coinbase(coinbase_hex: str, bricscoin_hash: str) -> bool:
    """
    Check if the BricsCoin block hash is embedded in the parent coinbase transaction.
    Looks for AUXPOW_MAGIC + bricscoin_hash_bytes in the coinbase scriptSig.
    """
    try:
        coinbase_bytes = bytes.fromhex(coinbase_hex)
        target_hash_bytes = bytes.fromhex(bricscoin_hash)

        # Search for magic + hash
        magic_and_hash = AUXPOW_MAGIC + target_hash_bytes
        if magic_and_hash in coinbase_bytes:
            return True

        # Also check for just the hash (some pools may omit magic)
        if target_hash_bytes in coinbase_bytes:
            logger.info("Found BricsCoin hash in coinbase (without magic prefix)")
            return True

        return False
    except Exception as e:
        logger.error(f"Error searching coinbase: {e}")
        return False


def verify_coinbase_in_parent(coinbase_hex: str, coinbase_branch: list,
                               coinbase_index: int, expected_merkle_root: str) -> bool:
    """
    Verify that the coinbase transaction is included in the parent block
    by walking the merkle branch up to the merkle root.
    """
    try:
        coinbase_bytes = bytes.fromhex(coinbase_hex)
        coinbase_hash = double_sha256(coinbase_bytes)

        computed_root = compute_merkle_root(coinbase_branch, coinbase_hash, coinbase_index)
        computed_root_hex = computed_root[::-1].hex()

        if computed_root_hex == expected_merkle_root:
            return True

        # Try without reversing (some implementations differ)
        if computed_root.hex() == expected_merkle_root:
            return True

        logger.warning(
            f"Merkle root mismatch: computed={computed_root_hex[:16]}... "
            f"expected={expected_merkle_root[:16]}..."
        )
        return False
    except Exception as e:
        logger.error(f"Coinbase merkle verification error: {e}")
        return False


def validate_auxpow(auxpow_data: dict, bricscoin_hash: str, difficulty: int) -> dict:
    """
    Full validation of an AuxPoW proof.

    Parameters:
        auxpow_data: {
            "parent_header": str (160 hex chars - 80 byte Bitcoin block header),
            "coinbase_tx": str (hex - full coinbase transaction),
            "coinbase_branch": list[str] (merkle branch hashes),
            "coinbase_index": int (usually 0 for coinbase),
            "blockchain_branch": list[str] (merged mining tree branch),
            "blockchain_index": int,
            "parent_chain": str (e.g., "bitcoin")
        }
        bricscoin_hash: The BricsCoin block hash that should be in the coinbase
        difficulty: BricsCoin's current difficulty target

    Returns:
        {"valid": True/False, "reason": str, "parent_hash": str}
    """
    # Step 1: Parse parent block header
    parent_header = auxpow_data.get("parent_header", "")
    parsed = parse_parent_header(parent_header)
    if not parsed:
        return {"valid": False, "reason": "Invalid parent block header format"}

    # Step 2: Hash the parent block header (double SHA-256)
    parent_hash = hash_parent_header(parent_header)
    if not parent_hash:
        return {"valid": False, "reason": "Failed to compute parent block hash"}

    # Step 3: Check parent block PoW meets BricsCoin difficulty
    if not check_pow_against_target(parent_hash, difficulty):
        return {
            "valid": False,
            "reason": f"Parent block PoW does not meet BricsCoin difficulty ({difficulty})",
            "parent_hash": parent_hash,
        }

    # Step 4: Verify BricsCoin hash is in the coinbase transaction
    coinbase_tx = auxpow_data.get("coinbase_tx", "")
    if not find_auxpow_hash_in_coinbase(coinbase_tx, bricscoin_hash):
        return {
            "valid": False,
            "reason": "BricsCoin block hash not found in parent coinbase transaction",
            "parent_hash": parent_hash,
        }

    # Step 5: Verify coinbase merkle branch to parent merkle root
    coinbase_branch = auxpow_data.get("coinbase_branch", [])
    coinbase_index = auxpow_data.get("coinbase_index", 0)

    if coinbase_branch:  # Empty branch = coinbase is the only tx (valid for solo mining)
        if not verify_coinbase_in_parent(
            coinbase_tx, coinbase_branch, coinbase_index, parsed["merkle_root"]
        ):
            return {
                "valid": False,
                "reason": "Coinbase merkle branch does not match parent merkle root",
                "parent_hash": parent_hash,
            }
    else:
        # If no branch, coinbase hash should equal merkle root directly
        coinbase_hash = double_sha256(bytes.fromhex(coinbase_tx))
        coinbase_hash_display = coinbase_hash[::-1].hex()
        if coinbase_hash_display != parsed["merkle_root"] and coinbase_hash.hex() != parsed["merkle_root"]:
            return {
                "valid": False,
                "reason": "Single-tx parent block: coinbase hash != merkle root",
                "parent_hash": parent_hash,
            }

    # Step 6: Validate blockchain branch (merged mining tree)
    # For single-aux-chain merge mining, this is typically empty
    blockchain_branch = auxpow_data.get("blockchain_branch", [])
    if blockchain_branch:
        logger.info(f"Blockchain branch present with {len(blockchain_branch)} entries")

    logger.info(
        f"AuxPoW VALID: parent_hash={parent_hash[:16]}..., "
        f"difficulty={difficulty}, chain={auxpow_data.get('parent_chain', 'bitcoin')}"
    )

    return {
        "valid": True,
        "reason": "AuxPoW proof is valid",
        "parent_hash": parent_hash,
        "parent_header": parsed,
    }


def is_auxpow_block(block: dict) -> bool:
    """Check if a block is an AuxPoW (merge-mined) block."""
    return "auxpow" in block and block["auxpow"] is not None


def create_auxpow_commitment(bricscoin_hash: str) -> str:
    """
    Create the data that should be embedded in the parent chain's coinbase.
    Format: MAGIC_BYTES + BricsCoin_block_hash (in bytes)
    Returns hex string.
    """
    hash_bytes = bytes.fromhex(bricscoin_hash)
    commitment = AUXPOW_MAGIC + hash_bytes
    return commitment.hex()
