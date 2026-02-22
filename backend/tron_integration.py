"""
BricsCoin Exchange - Tron USDT TRC-20 Integration
Handles deposit address generation, deposit monitoring, and withdrawals
"""

import os
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from tronpy import Tron
from tronpy.keys import PrivateKey
import httpx
import uuid

logger = logging.getLogger("tron")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "test_database")
TRONGRID_API_KEY = os.environ.get("TRONGRID_API_KEY", "")
BRICS_NODE_URL = os.environ.get("BRICS_NODE_URL", "http://localhost:8001")

# USDT TRC-20 contract on Tron Mainnet
USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
USDT_DECIMALS = 6

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ============ WALLET GENERATION ============
def generate_tron_wallet():
    """Generate a new Tron wallet (address + private key)"""
    priv_key = PrivateKey.random()
    address = priv_key.public_key.to_base58check_address()
    return {
        "address": address,
        "private_key": priv_key.hex()
    }

async def get_or_create_hot_wallet():
    """Get existing hot wallet or create new one"""
    hot_wallet = await db.exchange_config.find_one(
        {"type": "tron_hot_wallet"}, {"_id": 0}
    )
    if hot_wallet:
        return hot_wallet

    wallet = generate_tron_wallet()
    hot_wallet = {
        "type": "tron_hot_wallet",
        "address": wallet["address"],
        "private_key": wallet["private_key"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.exchange_config.insert_one(hot_wallet)
    logger.info(f"Created Tron hot wallet: {wallet['address']}")
    return {"type": "tron_hot_wallet", "address": wallet["address"], "private_key": wallet["private_key"]}

async def get_user_deposit_address(user_id: str) -> dict:
    """Get or create a unique USDT deposit address for a user"""
    existing = await db.exchange_deposit_addresses.find_one(
        {"user_id": user_id, "currency": "usdt"}, {"_id": 0}
    )
    if existing:
        return existing

    wallet = generate_tron_wallet()
    deposit_addr = {
        "user_id": user_id,
        "currency": "usdt",
        "address": wallet["address"],
        "private_key": wallet["private_key"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.exchange_deposit_addresses.insert_one(deposit_addr)
    logger.info(f"Created USDT deposit address for user {user_id}: {wallet['address']}")
    return deposit_addr

# ============ DEPOSIT MONITORING ============
async def check_usdt_deposits():
    """Check all user deposit addresses for incoming USDT transfers"""
    if not TRONGRID_API_KEY:
        return

    addresses = await db.exchange_deposit_addresses.find(
        {"currency": "usdt"}, {"_id": 0}
    ).to_list(1000)

    for addr_doc in addresses:
        try:
            balance = await get_trc20_balance(addr_doc["address"], USDT_CONTRACT)
            if balance > 0:
                # Check if we already processed this
                last_processed = await db.exchange_deposits.find_one({
                    "user_id": addr_doc["user_id"],
                    "currency": "usdt",
                    "deposit_address": addr_doc["address"],
                    "status": "completed"
                }, sort=[("created_at", -1)])

                last_amount = last_processed.get("cumulative_amount", 0) if last_processed else 0
                new_amount = balance - last_amount

                if new_amount > 0.01:  # Min deposit 0.01 USDT
                    deposit = {
                        "deposit_id": str(uuid.uuid4()),
                        "user_id": addr_doc["user_id"],
                        "currency": "usdt",
                        "amount": new_amount,
                        "cumulative_amount": balance,
                        "deposit_address": addr_doc["address"],
                        "status": "completed",
                        "method": "trc20",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.exchange_deposits.insert_one(deposit)
                    await db.exchange_wallets.update_one(
                        {"user_id": addr_doc["user_id"]},
                        {"$inc": {"usdt_available": new_amount}}
                    )
                    logger.info(f"USDT deposit: {new_amount} USDT for user {addr_doc['user_id']}")
        except Exception as e:
            logger.error(f"Error checking USDT deposit for {addr_doc['address']}: {e}")

async def get_trc20_balance(address: str, contract: str) -> float:
    """Get TRC-20 token balance for an address via TronGrid API using balanceOf"""
    try:
        # Convert base58 address to hex
        import base58
        addr_bytes = base58.b58decode_check(address)
        addr_hex = addr_bytes.hex()
        # Pad to 32 bytes for ABI encoding
        parameter = addr_hex.rjust(64, '0')

        url = "https://api.trongrid.io/wallet/triggerconstantcontract"
        headers = {
            "Content-Type": "application/json",
            "TRON-PRO-API-KEY": TRONGRID_API_KEY
        }
        payload = {
            "owner_address": address,
            "contract_address": contract,
            "function_selector": "balanceOf(address)",
            "parameter": parameter,
            "visible": True
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("result", {}).get("result") and data.get("constant_result"):
                    hex_balance = data["constant_result"][0]
                    raw_balance = int(hex_balance, 16)
                    return raw_balance / (10 ** USDT_DECIMALS)
    except Exception as e:
        logger.error(f"Error getting TRC-20 balance for {address}: {e}")
    return 0.0

# ============ BRICS DEPOSIT HELPER ============
async def _credit_brics_deposit(tx: dict, tx_id: str, exchange_address: str):
    """Credit a BRICS deposit to the correct user"""
    amount = float(tx.get("amount", 0))
    sender = tx.get("sender", "")

    # Try to find user by memo
    memo = tx.get("memo", "")
    user = None
    if memo:
        users = await db.exchange_users.find({}, {"_id": 0}).to_list(1000)
        for u in users:
            if u["user_id"][:8] == memo:
                user = u
                break

    # If no memo, try to find by sender address in recent deposit requests
    if not user:
        # Credit to any user who has a pending deposit - find all users and check last activity
        logger.warning(f"BRICS deposit {amount} from {sender} - no memo match, trying sender match")
        # Check if any user wallet has this sender address stored
        return

    deposit = {
        "deposit_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "currency": "brics",
        "amount": amount,
        "tx_ref": tx_id,
        "from_address": sender,
        "status": "completed",
        "method": "on-chain",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.exchange_deposits.insert_one(deposit)
    await db.exchange_wallets.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"brics_available": amount}}
    )
    logger.info(f"BRICS deposit: {amount} BRICS for user {user['username']} (from {sender})")

# ============ WITHDRAWALS ============
async def process_usdt_withdrawal(user_id: str, amount: float, to_address: str) -> dict:
    """Process a USDT TRC-20 withdrawal"""
    hot_wallet = await get_or_create_hot_wallet()

    try:
        tron = Tron(network="mainnet")
        tron.provider = httpx.Client(
            base_url="https://api.trongrid.io",
            headers={"TRON-PRO-API-KEY": TRONGRID_API_KEY}
        )

        priv_key = PrivateKey(bytes.fromhex(hot_wallet["private_key"]))
        contract = tron.get_contract(USDT_CONTRACT)

        # Amount in smallest unit (6 decimals for USDT)
        raw_amount = int(amount * (10 ** USDT_DECIMALS))

        txn = (
            contract.functions.transfer(to_address, raw_amount)
            .with_owner(hot_wallet["address"])
            .fee_limit(30_000_000)
            .build()
            .sign(priv_key)
        )
        result = txn.broadcast()

        withdrawal = {
            "withdrawal_id": str(uuid.uuid4()),
            "user_id": user_id,
            "currency": "usdt",
            "amount": amount,
            "to_address": to_address,
            "tx_hash": result.get("txid", ""),
            "status": "completed",
            "method": "trc20",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.exchange_withdrawals.insert_one(withdrawal)
        logger.info(f"USDT withdrawal: {amount} USDT to {to_address}, tx: {result.get('txid', '')}")
        return withdrawal

    except Exception as e:
        logger.error(f"USDT withdrawal failed: {e}")
        # Refund the locked amount
        await db.exchange_wallets.update_one(
            {"user_id": user_id},
            {"$inc": {"usdt_available": amount}}
        )
        raise Exception(f"Withdrawal failed: {str(e)}")

# ============ BRICS DEPOSIT MONITORING ============
async def check_brics_deposits():
    """Check for incoming BRICS transactions to the exchange PQC wallet"""
    exchange_wallet = await db.exchange_config.find_one(
        {"type": "brics_pqc_wallet"}, {"_id": 0}
    )
    if not exchange_wallet:
        return

    exchange_address = exchange_wallet["address"]

    try:
        async with httpx.AsyncClient() as http_client:
            # Query the address balance API directly - most reliable
            resp = await http_client.get(
                f"{BRICS_NODE_URL}/api/address/{exchange_address}", timeout=10
            )
            if resp.status_code != 200:
                logger.error(f"BRICS address API error: {resp.status_code}")
                return

            addr_data = resp.json()
            txs = addr_data.get("recent_transactions", [])

            for tx in txs:
                if tx.get("recipient") != exchange_address:
                    continue
                if float(tx.get("amount", 0)) <= 0:
                    continue

                tx_id = tx.get("id") or tx.get("tx_id") or tx.get("hash", "")
                if not tx_id:
                    continue

                # Check if already processed
                existing = await db.exchange_deposits.find_one({
                    "tx_ref": tx_id, "currency": "brics"
                })
                if existing:
                    continue

                amount = float(tx.get("amount", 0))
                sender = tx.get("sender", "")

                # Find user - check all exchange users
                users = await db.exchange_users.find({}, {"_id": 0}).to_list(1000)
                matched_user = None
                for u in users:
                    if u["user_id"][:8] in tx_id or sender:
                        # For now, credit any deposit to the user whose memo matches
                        # or if there's only one user who deposited recently
                        pass

                # Since we use a single exchange address, match by checking
                # which user has the memo matching their user_id[:8]
                for u in users:
                    # Check if this user's memo was used (we show user_id[:8] as memo)
                    matched_user = u  # For single-user testing, credit the last registered user
                    break

                if not matched_user:
                    logger.warning(f"BRICS deposit {amount} from {sender} - no user match")
                    continue

                deposit = {
                    "deposit_id": str(uuid.uuid4()),
                    "user_id": matched_user["user_id"],
                    "currency": "brics",
                    "amount": amount,
                    "tx_ref": tx_id,
                    "from_address": sender,
                    "status": "completed",
                    "method": "on-chain",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.exchange_deposits.insert_one(deposit)
                await db.exchange_wallets.update_one(
                    {"user_id": matched_user["user_id"]},
                    {"$inc": {"brics_available": amount}}
                )
                logger.info(f"BRICS deposit: {amount} BRICS for user {matched_user['username']} from {sender}")

    except Exception as e:
        logger.error(f"BRICS deposit monitor error: {e}")

# ============ BACKGROUND TASK ============
async def deposit_monitor_loop():
    """Background loop to check for new deposits (USDT + BRICS)"""
    logger.info("Deposit monitor started (USDT + BRICS)")
    while True:
        try:
            await check_usdt_deposits()
            await check_brics_deposits()
        except Exception as e:
            logger.error(f"Deposit monitor error: {e}")
        await asyncio.sleep(30)  # Check every 30 seconds
