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
    """Get TRC-20 token balance for an address via TronGrid API"""
    url = f"https://api.trongrid.io/v1/accounts/{address}/tokens"
    headers = {"TRON-PRO-API-KEY": TRONGRID_API_KEY}

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            for token in data.get("data", []):
                if token.get("tokenId") == contract or token.get("tokenAbbr") == "USDT":
                    balance = float(token.get("balance", 0)) / (10 ** USDT_DECIMALS)
                    return balance
    return 0.0

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

# ============ BACKGROUND TASK ============
async def deposit_monitor_loop():
    """Background loop to check for new deposits"""
    logger.info("USDT deposit monitor started")
    while True:
        try:
            await check_usdt_deposits()
        except Exception as e:
            logger.error(f"Deposit monitor error: {e}")
        await asyncio.sleep(30)  # Check every 30 seconds
