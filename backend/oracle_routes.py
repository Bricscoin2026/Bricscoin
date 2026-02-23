"""
AI Blockchain Oracle - GPT-5.2 powered network analysis and predictions.
Analyzes blockchain health metrics and provides AI-driven insights.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import json
import uuid
import logging

router = APIRouter(prefix="/api/oracle", tags=["AI Oracle"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# Constants
MAX_SUPPLY = 21_000_000
HALVING_INTERVAL = 210_000
TARGET_BLOCK_TIME = 600
INITIAL_REWARD = 50


def get_mining_reward(block_height: int) -> float:
    halvings = block_height // HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return INITIAL_REWARD / (2 ** halvings)


async def gather_network_data():
    """Gather all blockchain metrics for AI analysis"""
    blocks_count = await db.blocks.count_documents({})
    tx_count = await db.transactions.count_documents({})
    pending_count = await db.transactions.count_documents({"confirmed": False})
    pqc_wallets_count = await db.pqc_wallets.count_documents({})

    last_block = await db.blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    last_blocks = await db.blocks.find(
        {}, {"_id": 0, "timestamp": 1, "index": 1, "difficulty": 1, "miner": 1}
    ).sort("index", -1).limit(50).to_list(50)

    # Calculate average block time from last 50 blocks
    avg_block_time = TARGET_BLOCK_TIME
    if len(last_blocks) >= 2:
        last_blocks_sorted = sorted(last_blocks, key=lambda x: x.get("index", 0))
        try:
            first_t = datetime.fromisoformat(last_blocks_sorted[0]["timestamp"].replace("Z", "+00:00"))
            last_t = datetime.fromisoformat(last_blocks_sorted[-1]["timestamp"].replace("Z", "+00:00"))
            total_seconds = (last_t - first_t).total_seconds()
            if total_seconds > 0:
                avg_block_time = total_seconds / (len(last_blocks_sorted) - 1)
        except (ValueError, KeyError):
            pass

    # Unique miners in last 50 blocks & active miners in last 10
    unique_miners = len(set(b.get("miner", "") for b in last_blocks if b.get("miner")))
    active_miners = len(set(b.get("miner", "") for b in last_blocks[:10] if b.get("miner")))

    # Current difficulty
    current_difficulty = last_block.get("difficulty", 1000000) if last_block else 1000000

    # Halving info
    current_reward = get_mining_reward(blocks_count)
    halvings_done = blocks_count // HALVING_INTERVAL
    next_halving = (halvings_done + 1) * HALVING_INTERVAL
    blocks_to_halving = next_halving - blocks_count
    estimated_halving_days = (blocks_to_halving * avg_block_time) / 86400

    # Supply info
    circulating = 1_000_000  # premine
    for i in range(1, blocks_count):
        circulating += get_mining_reward(i)
    circulating = min(circulating, MAX_SUPPLY)

    # Hashrate estimate using actual block time (not target)
    effective_block_time = avg_block_time if avg_block_time > 0 else TARGET_BLOCK_TIME
    hashrate = (current_difficulty * (2 ** 32)) / effective_block_time

    # Chat messages & time capsules
    chat_count = await db.chat_messages.count_documents({})
    capsule_count = await db.time_capsules.count_documents({})

    return {
        "total_blocks": blocks_count,
        "total_transactions": tx_count,
        "pending_transactions": pending_count,
        "current_difficulty": current_difficulty,
        "avg_block_time_seconds": round(avg_block_time, 1),
        "target_block_time_seconds": TARGET_BLOCK_TIME,
        "hashrate_estimated_h_s": hashrate,
        "unique_miners_recent": unique_miners,
        "current_block_reward": current_reward,
        "next_halving_block": next_halving,
        "blocks_to_halving": blocks_to_halving,
        "estimated_halving_days": round(estimated_halving_days, 1),
        "circulating_supply": round(circulating, 8),
        "max_supply": MAX_SUPPLY,
        "pqc_wallets_count": pqc_wallets_count,
        "pqc_chat_messages": chat_count,
        "time_capsules": capsule_count,
        "last_block_time": last_block.get("timestamp") if last_block else None,
    }


class OracleQuestion(BaseModel):
    question: str
    session_id: Optional[str] = None


@router.get("/analysis")
async def get_analysis():
    """Get AI-powered analysis of the current network health"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI Oracle not configured")

    # Check cache (analysis valid for 5 minutes)
    cached = await db.oracle_cache.find_one(
        {"type": "analysis"}, {"_id": 0}, sort=[("created_at", -1)]
    )
    if cached:
        try:
            cached_time = datetime.fromisoformat(cached["created_at"].replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - cached_time).total_seconds() < 300:
                return cached["data"]
        except (ValueError, KeyError):
            pass

    data = await gather_network_data()

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"oracle-analysis-{uuid.uuid4().hex[:8]}",
        system_message="""You are the BricsCoin AI Oracle, an advanced AI system that analyzes the BricsCoin blockchain network.
BricsCoin is a SHA-256 Proof-of-Work cryptocurrency with Post-Quantum Cryptography (PQC) hybrid signatures (ECDSA + ML-DSA-65).
It has a max supply of 21M, halving every 210,000 blocks, and unique features like PQC-encrypted on-chain messaging (BricsChat) and Decentralized Time Capsules.

Provide analysis in a structured JSON format with these fields:
- health_score (0-100)
- health_status ("Excellent", "Good", "Fair", "Needs Attention", "Critical")
- network_summary (2-3 sentences about the overall network state)
- mining_analysis (analysis of mining/hashrate/difficulty)
- security_analysis (PQC adoption, network security assessment)
- halving_prediction (when the next halving will occur and its impact)
- recommendations (array of 3-5 actionable recommendations)
- fun_fact (an interesting observation about the network data)

Respond ONLY with valid JSON, no markdown."""
    ).with_model("openai", "gpt-5.2")

    user_msg = UserMessage(text=f"Analyze this BricsCoin network data:\n{json.dumps(data, indent=2)}")

    try:
        response = await chat.send_message(user_msg)
        # Parse the JSON response
        try:
            analysis = json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                analysis = json.loads(json_str)
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
                analysis = json.loads(json_str)
            else:
                analysis = {"raw_analysis": response, "health_score": 50, "health_status": "Unknown"}

        result = {
            "analysis": analysis,
            "network_data": data,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "GPT-5.2",
            "powered_by": "AI Blockchain Oracle",
        }

        # Cache the result
        await db.oracle_cache.insert_one({
            "type": "analysis",
            "data": result,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return result

    except Exception as e:
        logger.error(f"Oracle analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Oracle error: {str(e)}")


@router.post("/ask")
async def ask_oracle(question: OracleQuestion):
    """Ask the AI Oracle a question about the BricsCoin network"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI Oracle not configured")

    if len(question.question) > 500:
        raise HTTPException(status_code=400, detail="Question too long (max 500 chars)")

    data = await gather_network_data()
    session_id = question.session_id or f"oracle-ask-{uuid.uuid4().hex[:8]}"

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=f"""You are the BricsCoin AI Oracle. You analyze blockchain data and answer questions about the BricsCoin network.
BricsCoin is a SHA-256 PoW cryptocurrency with Post-Quantum Cryptography (PQC) via hybrid ECDSA + ML-DSA-65 signatures.
Max supply: 21M BRICS. Halving: every 210,000 blocks. Block time target: 10 minutes.
Unique features: PQC-encrypted on-chain chat (BricsChat), Decentralized Time Capsules, AI Oracle.

Current network data:
{json.dumps(data, indent=2)}

Answer concisely and helpfully. If the question is not about BricsCoin/blockchain, politely redirect."""
    ).with_model("openai", "gpt-5.2")

    user_msg = UserMessage(text=question.question)

    try:
        response = await chat.send_message(user_msg)

        # Save Q&A to DB
        qa_doc = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "question": question.question,
            "answer": response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.oracle_qa.insert_one(qa_doc)

        return {
            "question": question.question,
            "answer": response,
            "session_id": session_id,
            "timestamp": qa_doc["timestamp"],
            "model": "GPT-5.2",
        }

    except Exception as e:
        logger.error(f"Oracle ask error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Oracle error: {str(e)}")


@router.get("/history")
async def get_oracle_history(limit: int = 20):
    """Get recent Oracle Q&A history"""
    history = await db.oracle_qa.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(min(limit, 100)).to_list(min(limit, 100))
    return {"history": history, "count": len(history)}


@router.get("/predict")
async def get_predictions():
    """Get AI-powered predictions about the network"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI Oracle not configured")

    # Check cache (predictions valid for 15 minutes)
    cached = await db.oracle_cache.find_one(
        {"type": "predictions"}, {"_id": 0}, sort=[("created_at", -1)]
    )
    if cached:
        try:
            cached_time = datetime.fromisoformat(cached["created_at"].replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - cached_time).total_seconds() < 900:
                return cached["data"]
        except (ValueError, KeyError):
            pass

    data = await gather_network_data()

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"oracle-predict-{uuid.uuid4().hex[:8]}",
        system_message="""You are the BricsCoin AI Oracle prediction engine.
Based on historical blockchain data, generate predictions in JSON format:
- difficulty_trend ("increasing", "decreasing", "stable") with confidence (0-100)
- hashrate_forecast (short description of expected hashrate trend)
- next_halving_impact (analysis of the upcoming halving's effect)
- network_growth (prediction about network growth: users, transactions, PQC adoption)
- risk_factors (array of potential risks to watch)
- opportunities (array of opportunities for the network)
- overall_outlook ("bullish", "neutral", "bearish") with reasoning

Respond ONLY with valid JSON, no markdown."""
    ).with_model("openai", "gpt-5.2")

    user_msg = UserMessage(text=f"Generate predictions based on this BricsCoin network data:\n{json.dumps(data, indent=2)}")

    try:
        response = await chat.send_message(user_msg)
        try:
            predictions = json.loads(response)
        except json.JSONDecodeError:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                predictions = json.loads(json_str)
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
                predictions = json.loads(json_str)
            else:
                predictions = {"raw_predictions": response}

        result = {
            "predictions": predictions,
            "network_data": data,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "GPT-5.2",
        }

        await db.oracle_cache.insert_one({
            "type": "predictions",
            "data": result,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return result

    except Exception as e:
        logger.error(f"Oracle predictions error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Oracle error: {str(e)}")
