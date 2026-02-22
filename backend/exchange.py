"""
BricsCoin Exchange - CEX Trading Engine
BRICS/USDT trading pair with order book matching
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import hashlib
import secrets
import jwt
import bcrypt
import uuid
import asyncio
import logging

logger = logging.getLogger("exchange")

router = APIRouter(prefix="/api/exchange", tags=["exchange"])

# ============ DB ============
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "test_database")
JWT_SECRET = os.environ.get("EXCHANGE_JWT_SECRET", secrets.token_hex(32))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ============ CONSTANTS ============
INITIAL_PRICE = 0.0086
MAKER_FEE = 0.001  # 0.1%
TAKER_FEE = 0.002  # 0.2%
MIN_ORDER_BRICS = 1.0
MIN_ORDER_USDT = 0.01

# ============ MODELS ============
class RegisterModel(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: str
    password: str = Field(min_length=6)

class LoginModel(BaseModel):
    email: str
    password: str

class OrderModel(BaseModel):
    side: str  # "buy" or "sell"
    order_type: str  # "limit" or "market"
    price: Optional[float] = None
    amount: float

class WithdrawModel(BaseModel):
    currency: str  # "brics" or "usdt"
    amount: float
    address: str

# ============ AUTH HELPERS ============
def create_token(user_id: str, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.exchange_users.find_one(
            {"user_id": payload["user_id"]},
            {"_id": 0}
        )
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

# ============ AUTH ROUTES ============
@router.post("/register")
async def register(data: RegisterModel):
    existing = await db.exchange_users.find_one({"$or": [
        {"email": data.email.lower()},
        {"username": data.username.lower()}
    ]})
    if existing:
        raise HTTPException(400, "Email or username already exists")

    user_id = str(uuid.uuid4())
    password_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()

    user = {
        "user_id": user_id,
        "username": data.username.lower(),
        "email": data.email.lower(),
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.exchange_users.insert_one(user)

    wallet = {
        "user_id": user_id,
        "brics_available": 0.0,
        "brics_locked": 0.0,
        "usdt_available": 0.0,
        "usdt_locked": 0.0,
    }
    await db.exchange_wallets.insert_one(wallet)

    token = create_token(user_id, data.username)
    return {"token": token, "user_id": user_id, "username": data.username}

@router.post("/login")
async def login(data: LoginModel):
    user = await db.exchange_users.find_one(
        {"email": data.email.lower()},
        {"_id": 0}
    )
    if not user:
        raise HTTPException(401, "Invalid credentials")
    if not bcrypt.checkpw(data.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Invalid credentials")

    token = create_token(user["user_id"], user["username"])
    return {"token": token, "user_id": user["user_id"], "username": user["username"]}

# ============ WALLET ROUTES ============
@router.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    wallet = await db.exchange_wallets.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    return wallet

@router.get("/wallet/deposits")
async def get_deposits(user: dict = Depends(get_current_user)):
    deposits = await db.exchange_deposits.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return deposits

@router.get("/wallet/withdrawals")
async def get_withdrawals(user: dict = Depends(get_current_user)):
    withdrawals = await db.exchange_withdrawals.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return withdrawals

# ============ MARKET DATA (PUBLIC) ============
@router.get("/ticker")
async def get_ticker():
    last_trade = await db.exchange_trades.find_one(
        {}, {"_id": 0}, sort=[("timestamp", -1)]
    )
    last_price = last_trade["price"] if last_trade else INITIAL_PRICE

    now = datetime.now(timezone.utc)
    h24_ago = (now - timedelta(hours=24)).isoformat()

    trades_24h = await db.exchange_trades.find(
        {"timestamp": {"$gte": h24_ago}},
        {"_id": 0, "price": 1, "amount": 1}
    ).to_list(10000)

    volume_24h = sum(t["amount"] for t in trades_24h)
    volume_usdt_24h = sum(t["amount"] * t["price"] for t in trades_24h)
    high_24h = max((t["price"] for t in trades_24h), default=last_price)
    low_24h = min((t["price"] for t in trades_24h), default=last_price)

    prices = [t["price"] for t in trades_24h]
    open_price = prices[0] if prices else last_price
    change_24h = ((last_price - open_price) / open_price * 100) if open_price > 0 else 0

    return {
        "pair": "BRICS/USDT",
        "last_price": last_price,
        "high_24h": high_24h,
        "low_24h": low_24h,
        "volume_24h": round(volume_24h, 2),
        "volume_brics_24h": round(volume_usdt_24h, 2),
        "change_24h": round(change_24h, 2),
        "open_price": open_price
    }

@router.get("/orderbook")
async def get_orderbook():
    bids_raw = await db.exchange_orders.find(
        {"side": "buy", "status": "open", "order_type": "limit"},
        {"_id": 0, "price": 1, "amount": 1, "filled": 1}
    ).sort("price", -1).limit(25).to_list(25)

    asks_raw = await db.exchange_orders.find(
        {"side": "sell", "status": "open", "order_type": "limit"},
        {"_id": 0, "price": 1, "amount": 1, "filled": 1}
    ).sort("price", 1).limit(25).to_list(25)

    # Aggregate by price level
    def aggregate(orders):
        levels = {}
        for o in orders:
            p = o["price"]
            remaining = o["amount"] - o.get("filled", 0)
            if p in levels:
                levels[p] += remaining
            else:
                levels[p] = remaining
        return [[p, round(q, 8)] for p, q in levels.items()]

    bids = aggregate(bids_raw)
    asks = aggregate(asks_raw)

    return {"bids": bids, "asks": asks}

@router.get("/trades")
async def get_recent_trades(limit: int = 50):
    trades = await db.exchange_trades.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return trades

@router.get("/candles")
async def get_candles(interval: str = "1h", limit: int = 100):
    intervals = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400}
    seconds = intervals.get(interval, 3600)

    trades = await db.exchange_trades.find(
        {}, {"_id": 0, "price": 1, "amount": 1, "timestamp": 1}
    ).sort("timestamp", -1).limit(10000).to_list(10000)

    if not trades:
        # Return seed candles if no trades
        now = datetime.now(timezone.utc)
        candles = []
        for i in range(limit):
            t = now - timedelta(seconds=seconds * (limit - i))
            candles.append({
                "time": int(t.timestamp()),
                "open": INITIAL_PRICE,
                "high": INITIAL_PRICE,
                "low": INITIAL_PRICE,
                "close": INITIAL_PRICE,
                "volume": 0
            })
        return candles

    trades.reverse()

    candles = {}
    for t in trades:
        ts = datetime.fromisoformat(t["timestamp"].replace("Z", "+00:00"))
        bucket = int(ts.timestamp()) // seconds * seconds
        if bucket not in candles:
            candles[bucket] = {
                "time": bucket,
                "open": t["price"],
                "high": t["price"],
                "low": t["price"],
                "close": t["price"],
                "volume": t["amount"]
            }
        else:
            c = candles[bucket]
            c["high"] = max(c["high"], t["price"])
            c["low"] = min(c["low"], t["price"])
            c["close"] = t["price"]
            c["volume"] += t["amount"]

    result = sorted(candles.values(), key=lambda x: x["time"])
    return result[-limit:]

# ============ ORDER ROUTES ============
@router.post("/order")
async def place_order(data: OrderModel, user: dict = Depends(get_current_user)):
    if data.side not in ("buy", "sell"):
        raise HTTPException(400, "Side must be 'buy' or 'sell'")
    if data.order_type not in ("limit", "market"):
        raise HTTPException(400, "Type must be 'limit' or 'market'")
    if data.order_type == "limit" and (not data.price or data.price <= 0):
        raise HTTPException(400, "Limit order requires positive price")
    if data.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    if data.amount < MIN_ORDER_BRICS:
        raise HTTPException(400, f"Minimum order: {MIN_ORDER_BRICS} BRICS")

    wallet = await db.exchange_wallets.find_one({"user_id": user["user_id"]})
    if not wallet:
        raise HTTPException(404, "Wallet not found")

    # Check balance and lock funds
    if data.side == "buy":
        price = data.price if data.order_type == "limit" else await _get_best_ask_price(data.amount)
        if price is None:
            raise HTTPException(400, "No sell orders available")
        cost = data.amount * price
        if wallet["usdt_available"] < cost:
            raise HTTPException(400, f"Insufficient USDT. Need {cost:.4f}, have {wallet['usdt_available']:.4f}")
        await db.exchange_wallets.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"usdt_available": -cost, "usdt_locked": cost}}
        )
    else:  # sell
        if wallet["brics_available"] < data.amount:
            raise HTTPException(400, f"Insufficient BRICS. Need {data.amount:.8f}, have {wallet['brics_available']:.8f}")
        await db.exchange_wallets.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"brics_available": -data.amount, "brics_locked": data.amount}}
        )

    order_id = str(uuid.uuid4())
    order = {
        "order_id": order_id,
        "user_id": user["user_id"],
        "username": user["username"],
        "side": data.side,
        "order_type": data.order_type,
        "price": data.price if data.order_type == "limit" else 0,
        "amount": data.amount,
        "filled": 0.0,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.exchange_orders.insert_one(order)

    # Try to match
    fills = await match_order(order)

    order_out = await db.exchange_orders.find_one(
        {"order_id": order_id}, {"_id": 0}
    )

    return {"order": order_out, "fills": fills}

@router.get("/orders/open")
async def get_open_orders(user: dict = Depends(get_current_user)):
    orders = await db.exchange_orders.find(
        {"user_id": user["user_id"], "status": "open"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return orders

@router.get("/orders/history")
async def get_order_history(user: dict = Depends(get_current_user)):
    orders = await db.exchange_orders.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
    return orders

@router.delete("/order/{order_id}")
async def cancel_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.exchange_orders.find_one(
        {"order_id": order_id, "user_id": user["user_id"], "status": "open"}
    )
    if not order:
        raise HTTPException(404, "Order not found or already closed")

    remaining = order["amount"] - order.get("filled", 0)

    # Unlock funds
    if order["side"] == "buy":
        unlock_usdt = remaining * order["price"]
        await db.exchange_wallets.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"usdt_available": unlock_usdt, "usdt_locked": -unlock_usdt}}
        )
    else:
        await db.exchange_wallets.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"brics_available": remaining, "brics_locked": -remaining}}
        )

    await db.exchange_orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": "cancelled"}}
    )
    return {"message": "Order cancelled", "order_id": order_id}

# ============ MATCHING ENGINE ============
async def _get_best_ask_price(amount: float) -> Optional[float]:
    best_ask = await db.exchange_orders.find_one(
        {"side": "sell", "status": "open", "order_type": "limit"},
        {"_id": 0, "price": 1},
        sort=[("price", 1)]
    )
    return best_ask["price"] if best_ask else INITIAL_PRICE

async def match_order(order: dict) -> list:
    fills = []

    if order["side"] == "buy":
        # Match against sell orders (lowest price first)
        opposing = await db.exchange_orders.find(
            {"side": "sell", "status": "open", "order_type": "limit",
             "user_id": {"$ne": order["user_id"]}},
            {"_id": 0}
        ).sort("price", 1).to_list(100)

        if order["order_type"] == "limit":
            opposing = [o for o in opposing if o["price"] <= order["price"]]

    else:
        # Match against buy orders (highest price first)
        opposing = await db.exchange_orders.find(
            {"side": "buy", "status": "open", "order_type": "limit",
             "user_id": {"$ne": order["user_id"]}},
            {"_id": 0}
        ).sort("price", -1).to_list(100)

        if order["order_type"] == "limit":
            opposing = [o for o in opposing if o["price"] >= order["price"]]

    remaining = order["amount"] - order.get("filled", 0)

    for opp in opposing:
        if remaining <= 0:
            break

        opp_remaining = opp["amount"] - opp.get("filled", 0)
        if opp_remaining <= 0:
            continue

        fill_amount = min(remaining, opp_remaining)
        fill_price = opp["price"]  # Maker price

        # Execute trade
        trade = await execute_trade(order, opp, fill_amount, fill_price)
        fills.append(trade)
        remaining -= fill_amount

    # Update order status
    filled_total = order.get("filled", 0) + sum(f["amount"] for f in fills)
    new_status = "filled" if filled_total >= order["amount"] else ("open" if filled_total == 0 else "partial")

    await db.exchange_orders.update_one(
        {"order_id": order["order_id"]},
        {"$set": {"filled": filled_total, "status": new_status}}
    )

    # If market order not fully filled, cancel remainder and unlock funds
    if order["order_type"] == "market" and new_status != "filled":
        unfilled = order["amount"] - filled_total
        if order["side"] == "buy":
            price = order.get("price") or INITIAL_PRICE
            unlock = unfilled * price
            await db.exchange_wallets.update_one(
                {"user_id": order["user_id"]},
                {"$inc": {"usdt_available": unlock, "usdt_locked": -unlock}}
            )
        else:
            await db.exchange_wallets.update_one(
                {"user_id": order["user_id"]},
                {"$inc": {"brics_available": unfilled, "brics_locked": -unfilled}}
            )
        await db.exchange_orders.update_one(
            {"order_id": order["order_id"]},
            {"$set": {"status": "cancelled" if filled_total == 0 else "filled"}}
        )

    return fills

async def execute_trade(taker_order: dict, maker_order: dict, amount: float, price: float) -> dict:
    trade_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    buyer_id = taker_order["user_id"] if taker_order["side"] == "buy" else maker_order["user_id"]
    seller_id = taker_order["user_id"] if taker_order["side"] == "sell" else maker_order["user_id"]

    cost = amount * price
    taker_fee = cost * TAKER_FEE
    maker_fee = cost * MAKER_FEE

    # Buyer: locked USDT -> gets BRICS
    await db.exchange_wallets.update_one(
        {"user_id": buyer_id},
        {"$inc": {
            "usdt_locked": -cost,
            "brics_available": amount - (amount * TAKER_FEE if buyer_id == taker_order["user_id"] else amount * MAKER_FEE)
        }}
    )

    # Seller: locked BRICS -> gets USDT
    await db.exchange_wallets.update_one(
        {"user_id": seller_id},
        {"$inc": {
            "brics_locked": -amount,
            "usdt_available": cost - (taker_fee if seller_id == taker_order["user_id"] else maker_fee)
        }}
    )

    # Update maker order
    new_filled = maker_order.get("filled", 0) + amount
    new_status = "filled" if new_filled >= maker_order["amount"] else "partial"
    await db.exchange_orders.update_one(
        {"order_id": maker_order["order_id"]},
        {"$set": {"filled": new_filled, "status": new_status}}
    )

    # If maker fully filled and is a buy order, unlock remaining USDT is not needed since all matched
    trade = {
        "trade_id": trade_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "price": price,
        "amount": amount,
        "cost": round(cost, 8),
        "taker_fee": round(taker_fee, 8),
        "maker_fee": round(maker_fee, 8),
        "side": taker_order["side"],
        "timestamp": timestamp
    }
    await db.exchange_trades.insert_one(trade)

    return {k: v for k, v in trade.items() if k != "_id"}

# ============ ADMIN: DEPOSIT CREDIT (temporary until blockchain integration) ============
@router.post("/admin/credit")
async def admin_credit(request: Request):
    data = await request.json()
    admin_key = data.get("admin_key")
    if admin_key != os.environ.get("EXCHANGE_ADMIN_KEY", "bricscoin-admin-2026"):
        raise HTTPException(403, "Unauthorized")

    user = await db.exchange_users.find_one(
        {"username": data["username"].lower()},
        {"_id": 0}
    )
    if not user:
        raise HTTPException(404, "User not found")

    currency = data["currency"]  # "brics" or "usdt"
    amount = float(data["amount"])

    if currency == "brics":
        await db.exchange_wallets.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"brics_available": amount}}
        )
    elif currency == "usdt":
        await db.exchange_wallets.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"usdt_available": amount}}
        )
    else:
        raise HTTPException(400, "Invalid currency")

    deposit = {
        "deposit_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "currency": currency,
        "amount": amount,
        "status": "completed",
        "method": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.exchange_deposits.insert_one(deposit)

    return {"message": f"Credited {amount} {currency.upper()} to {data['username']}"}

# ============ DB INDEXES ============
async def create_exchange_indexes():
    try:
        await db.exchange_users.create_index("email", unique=True)
        await db.exchange_users.create_index("username", unique=True)
        await db.exchange_users.create_index("user_id", unique=True)
        await db.exchange_wallets.create_index("user_id", unique=True)
        await db.exchange_orders.create_index([("side", 1), ("status", 1), ("price", 1)])
        await db.exchange_orders.create_index("user_id")
        await db.exchange_orders.create_index("order_id", unique=True)
        await db.exchange_trades.create_index("timestamp")
        await db.exchange_trades.create_index("trade_id", unique=True)
        logger.info("Exchange DB indexes created")
    except Exception as e:
        logger.error(f"Index creation error: {e}")
