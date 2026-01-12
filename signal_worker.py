"""
Background Worker for Automatic Signal Generation
Runs periodically to check indicator conditions and generate signals
Each timeframe has its own monitoring interval:
- 1min  -> check every 1 minute
- 5min  -> check every 5 minutes
- 15min -> check every 10 minutes
- 30min -> check every 20 minutes
- 1h    -> check every 45 minutes
- 4h    -> check every 60 minutes
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

# Timeframe monitoring intervals (in minutes)
TIMEFRAME_INTERVALS = {
    "1min": 1,      # Check every 1 minute
    "1m": 1,
    "5min": 5,      # Check every 5 minutes
    "5m": 5,
    "15min": 10,    # Check every 10 minutes
    "15m": 10,
    "30min": 20,    # Check every 20 minutes
    "30m": 20,
    "1h": 45,       # Check every 45 minutes
    "1H": 45,
    "H1": 45,
    "4h": 60,       # Check every 60 minutes
    "4H": 60,
    "H4": 60,
    "1d": 240,      # Check every 4 hours
    "1D": 240,
    "D1": 240,
}

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


def get_check_interval(timeframe: str) -> int:
    """
    Get the monitoring interval in minutes for a given timeframe
    """
    return TIMEFRAME_INTERVALS.get(timeframe, 5)  # Default to 5 minutes


async def should_check_timeframe(subscription: dict) -> bool:
    """
    Check if it's time to monitor this subscription based on its timeframe
    """
    timeframe = subscription.get("user_selected_timeframe", "15min")
    last_check_time = subscription.get("last_check_time")
    
    if not last_check_time:
        return True
    
    interval_minutes = get_check_interval(timeframe)
    time_since_last = datetime.utcnow() - last_check_time
    
    return time_since_last >= timedelta(minutes=interval_minutes)


async def should_generate_signal(subscription: dict) -> bool:
    """
    Check if enough time has passed since last signal (cooldown period)
    Cooldown is based on the timeframe's monitoring interval
    """
    last_signal_time = subscription.get("last_signal_time")
    
    if not last_signal_time:
        return True
    
    # Cooldown is 2x the monitoring interval for the timeframe
    timeframe = subscription.get("user_selected_timeframe", "15min")
    cooldown_minutes = get_check_interval(timeframe) * 2
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
    Send push notification to user via Expo Push Notification Service
    """
    try:
        import httpx
        
        # Get user's push tokens
        tokens = await db.push_tokens.find({"user_id": user_id}).to_list(100)
        
        if not tokens:
            logger.info(f"No push tokens found for user {user_id}")
            return
        
        # Prepare notification messages
        emoji = "📈" if signal_type == "BUY" else "📉"
        messages = []
        
        for token_doc in tokens:
            push_token = token_doc.get("token")
            if push_token and push_token.startswith("ExponentPushToken"):
                messages.append({
                    "to": push_token,
                    "sound": "default",
                    "title": f"{emoji} {signal_type} Signal - {symbol}",
                    "body": f"{indicator_name} detected a {signal_type} opportunity on {symbol}",
                    "data": {
                        "signal": signal_type,
                        "symbol": symbol,
                        "indicator": indicator_name,
                        "type": "signal"
                    },
                    "priority": "high",
                    "channelId": "signals"
                })
        
        if not messages:
            logger.info(f"No valid push tokens for user {user_id}")
            return
        
        # Send via Expo Push API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://exp.host/--/api/v2/push/send',
                json=messages,
                headers={
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                logger.info(f"📱 Push notification sent: {signal_type} on {symbol} to user {user_id}")
            else:
                logger.error(f"Push notification failed: {response.status_code}")
        
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")


async def process_subscription(subscription: dict):
    """
    Process a single subscription:
    1. Check if it's time to monitor based on timeframe interval
    2. Fetch market data for user's selected symbol
    3. Get indicator configuration
    4. Evaluate conditions
    5. Generate signal if conditions met
    """
    try:
        subscription_id = str(subscription["_id"])
        indicator_id = subscription["indicator_id"]
        symbol = subscription["user_selected_symbol"]
        timeframe = subscription["user_selected_timeframe"]
        interval = get_check_interval(timeframe)
        
        # Check if it's time to monitor this timeframe
        if not await should_check_timeframe(subscription):
            logger.debug(f"⏰ Not yet time to check {timeframe} for {symbol} (interval: {interval}min)")
            return
        
        logger.info(f"🔍 Processing {timeframe} subscription {subscription_id} for {symbol} (interval: {interval}min)")
        
        # Update last check time
        await db.user_indicator_subscriptions.update_one(
            {"_id": subscription["_id"]},
            {"$set": {"last_check_time": datetime.utcnow()}}
        )
        
        # Check cooldown for signal generation
        if not await should_generate_signal(subscription):
            logger.info(f"⏳ Signal cooldown active for subscription {subscription_id}, skipping signal generation")
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


async def run_worker(base_interval_seconds: int = 60):
    """
    Run the worker continuously with 1-minute base interval.
    Each subscription is checked based on its timeframe's interval.
    
    Timeframe intervals:
    - 1min  -> every 1 minute
    - 5min  -> every 5 minutes
    - 15min -> every 10 minutes
    - 30min -> every 20 minutes
    - 1h    -> every 45 minutes
    - 4h    -> every 60 minutes
    """
    logger.info("🚀 Signal Worker started with timeframe-based intervals")
    logger.info("📊 Monitoring intervals:")
    for tf, interval in sorted(TIMEFRAME_INTERVALS.items(), key=lambda x: x[1]):
        logger.info(f"   {tf}: every {interval} minutes")
    
    while True:
        try:
            await run_worker_cycle()
            
            # Base interval of 1 minute - individual timeframes checked based on their intervals
            logger.info(f"💤 Base cycle sleeping for {base_interval_seconds} seconds...")
            await asyncio.sleep(base_interval_seconds)
            
        except Exception as e:
            logger.error(f"Worker error: {e}")
            await asyncio.sleep(60)  # Wait 1 minute on error


if __name__ == "__main__":
    # Run the worker with 1 minute base interval
    asyncio.run(run_worker(base_interval_seconds=60))
