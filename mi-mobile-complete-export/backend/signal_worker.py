"""
Background Worker for Automatic Signal Generation
Runs periodically to check indicator conditions and generate signals
"""
import asyncio
import logging
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

from condition_evaluator import ConditionEvaluator
from market_data import get_mock_market_data

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client[os.getenv('DB_NAME', 'signalmaster')]


async def fetch_market_data(symbol: str, timeframe: str, bars: int = 100) -> dict:
    """
    Fetch market data for a symbol
    In production, this should call real market data APIs
    For now, using mock data
    """
    try:
        # Mock data generation
        mock_data = get_mock_market_data(symbol)
        
        # Generate historical prices (mock)
        base_price = mock_data.get("close", 1.1000)
        
        close_prices = []
        high_prices = []
        low_prices = []
        
        for i in range(bars):
            # Generate some variation
            variation = (i % 10 - 5) / 100
            price = base_price * (1 + variation)
            close_prices.append(price)
            high_prices.append(price * 1.002)
            low_prices.append(price * 0.998)
        
        return {
            "symbol": symbol,
            "close_prices": close_prices,
            "high_prices": high_prices,
            "low_prices": low_prices,
            "current_price": close_prices[-1]
        }
        
    except Exception as e:
        logger.error(f"Error fetching market data for {symbol}: {e}")
        return None


async def should_generate_signal(subscription: dict) -> bool:
    """
    Check if enough time has passed since last signal (cooldown period)
    """
    last_signal_time = subscription.get("last_signal_time")
    
    if not last_signal_time:
        return True
    
    # 15 minute cooldown
    cooldown_minutes = 15
    time_since_last = datetime.utcnow() - last_signal_time
    
    return time_since_last > timedelta(minutes=cooldown_minutes)


async def create_signal_for_subscription(subscription: dict, signal_type: str, indicator: dict):
    """
    Create a signal document and user_signals reference
    """
    try:
        expiry_time = datetime.utcnow() + timedelta(hours=24)
        
        signal_doc = {
            "symbol": subscription["user_selected_symbol"],
            "signal_type": signal_type,
            "indicator": indicator["name"],
            "candle_pattern": None,
            "timeframe": subscription["user_selected_timeframe"],
            "notes": f"Auto-generated from {indicator['name']} conditions",
            "sender_type": "indicator_auto",
            "sender_id": subscription["mentor_id"],
            "indicator_id": subscription["indicator_id"],
            "subscription_id": str(subscription["_id"]),
            "created_at": datetime.utcnow(),
            "expires_at": expiry_time,
            "duration_seconds": 86400,
            "status": "active"
        }
        
        result = await db.signals.insert_one(signal_doc)
        signal_id = str(result.inserted_id)
        
        # Create user_signals reference
        await db.user_signals.insert_one({
            "signal_id": signal_id,
            "user_id": subscription["user_id"],
            "read": False,
            "created_at": datetime.utcnow()
        })
        
        # Update subscription stats
        await db.user_indicator_subscriptions.update_one(
            {"_id": subscription["_id"]},
            {
                "$set": {
                    "last_signal_time": datetime.utcnow(),
                    "last_signal_type": signal_type
                },
                "$inc": {"total_signals_received": 1}
            }
        )
        
        logger.info(f"✅ Created {signal_type} signal for user {subscription['user_id']} on {subscription['user_selected_symbol']}")
        
        # Send push notification
        await send_push_notification(subscription["user_id"], indicator["name"], signal_type, subscription["user_selected_symbol"])
        
        return signal_id
        
    except Exception as e:
        logger.error(f"Error creating signal: {e}")
        return None


async def send_push_notification(user_id: str, indicator_name: str, signal_type: str, symbol: str):
    """
    Send push notification to user
    """
    try:
        # Get user's push tokens
        tokens = await db.push_tokens.find({"user_id": user_id}).to_list(100)
        
        if not tokens:
            logger.info(f"No push tokens found for user {user_id}")
            return
        
        # In production, integrate with Expo push notification service
        # For now, just log
        logger.info(f"📱 Would send push: {indicator_name} - {signal_type} on {symbol} to user {user_id}")
        
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")


async def process_subscription(subscription: dict):
    """
    Process a single subscription:
    1. Fetch market data for user's selected symbol
    2. Get indicator configuration
    3. Evaluate conditions
    4. Generate signal if conditions met
    """
    try:
        subscription_id = str(subscription["_id"])
        indicator_id = subscription["indicator_id"]
        symbol = subscription["user_selected_symbol"]
        timeframe = subscription["user_selected_timeframe"]
        
        logger.info(f"🔍 Processing subscription {subscription_id} for {symbol}")
        
        # Check cooldown
        if not await should_generate_signal(subscription):
            logger.info(f"⏳ Cooldown active for subscription {subscription_id}, skipping")
            return
        
        # Get indicator configuration
        indicator = await db.custom_indicators.find_one({
            "_id": ObjectId(indicator_id),
            "status": "active",
            "is_running": True
        })
        
        if not indicator:
            logger.warning(f"Indicator {indicator_id} not found or not running")
            return
        
        # Fetch market data
        market_data = await fetch_market_data(symbol, timeframe)
        
        if not market_data:
            logger.warning(f"Could not fetch market data for {symbol}")
            return
        
        # Evaluate indicator conditions
        signal = ConditionEvaluator.evaluate_indicator(indicator, market_data)
        
        if signal:
            logger.info(f"✅ {signal} signal detected for {symbol} using {indicator['name']}")
            await create_signal_for_subscription(subscription, signal, indicator)
        else:
            logger.info(f"ℹ️ No signal generated for {symbol} using {indicator['name']}")
            
    except Exception as e:
        logger.error(f"Error processing subscription: {e}")


async def run_worker_cycle():
    """
    Run one complete cycle of the worker:
    1. Get all active subscriptions
    2. Process each subscription
    3. Generate signals as needed
    """
    try:
        logger.info("=" * 60)
        logger.info("🚀 Starting signal worker cycle")
        logger.info("=" * 60)
        
        # Get all active subscriptions
        subscriptions = await db.user_indicator_subscriptions.find({
            "status": "active"
        }).to_list(length=1000)
        
        logger.info(f"Found {len(subscriptions)} active subscriptions to process")
        
        if not subscriptions:
            logger.info("No active subscriptions, skipping cycle")
            return
        
        # Process each subscription
        for subscription in subscriptions:
            await process_subscription(subscription)
            # Small delay between subscriptions
            await asyncio.sleep(0.5)
        
        logger.info(f"✅ Worker cycle complete, processed {len(subscriptions)} subscriptions")
        
    except Exception as e:
        logger.error(f"Error in worker cycle: {e}")


async def run_worker(interval_minutes: int = 5):
    """
    Run the worker continuously with specified interval
    """
    logger.info(f"🚀 Signal Worker started (interval: {interval_minutes} minutes)")
    
    while True:
        try:
            await run_worker_cycle()
            
            # Wait for next cycle
            logger.info(f"💤 Sleeping for {interval_minutes} minutes...")
            await asyncio.sleep(interval_minutes * 60)
            
        except Exception as e:
            logger.error(f"Worker error: {e}")
            await asyncio.sleep(60)  # Wait 1 minute on error


if __name__ == "__main__":
    # Run the worker
    asyncio.run(run_worker(interval_minutes=5))
