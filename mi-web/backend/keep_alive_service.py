#!/usr/bin/env python3
"""
Keep-Alive Service
Pings the backend every 3 minutes to prevent it from going to sleep
"""

import requests
import time
import logging
from datetime import datetime

# Configuration
BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com"
PING_INTERVAL = 180  # 3 minutes (in seconds)
HEALTH_ENDPOINT = f"{BACKEND_URL}/api/health"
LOGIN_ENDPOINT = f"{BACKEND_URL}/api/auth/login"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/keep_alive.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def ping_backend():
    """Ping the backend to keep it awake"""
    try:
        # Try health endpoint first
        response = requests.get(HEALTH_ENDPOINT, timeout=10)
        
        if response.status_code in [200, 404, 405]:
            logger.info(f"✅ Backend is ALIVE (Health: {response.status_code})")
            return True
        else:
            # Try login endpoint as backup
            response = requests.post(
                LOGIN_ENDPOINT,
                json={"email": "test@test.com", "password": "dummy"},
                timeout=10
            )
            logger.info(f"✅ Backend is ALIVE (Login: {response.status_code})")
            return True
            
    except requests.exceptions.Timeout:
        logger.warning(f"⚠️ Backend timeout - might be sleeping, waking it up...")
        return False
    except requests.exceptions.ConnectionError:
        logger.error(f"❌ Backend connection error - cannot reach backend")
        return False
    except Exception as e:
        logger.error(f"❌ Error pinging backend: {str(e)}")
        return False

def main():
    """Main keep-alive loop"""
    logger.info("=" * 60)
    logger.info("🚀 KEEP-ALIVE SERVICE STARTED")
    logger.info(f"Backend URL: {BACKEND_URL}")
    logger.info(f"Ping Interval: {PING_INTERVAL} seconds ({PING_INTERVAL/60} minutes)")
    logger.info("=" * 60)
    
    ping_count = 0
    success_count = 0
    fail_count = 0
    
    while True:
        try:
            ping_count += 1
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            logger.info(f"\n[Ping #{ping_count}] {current_time}")
            logger.info(f"Pinging backend...")
            
            success = ping_backend()
            
            if success:
                success_count += 1
                logger.info(f"✅ Success! (Total: {success_count}/{ping_count})")
            else:
                fail_count += 1
                logger.warning(f"⚠️ Failed! (Total failures: {fail_count}/{ping_count})")
                # Try again after 30 seconds if failed
                logger.info("Retrying in 30 seconds...")
                time.sleep(30)
                ping_backend()
            
            # Statistics
            uptime_rate = (success_count / ping_count * 100) if ping_count > 0 else 0
            logger.info(f"📊 Statistics: Success={success_count}, Fail={fail_count}, Uptime={uptime_rate:.1f}%")
            
            # Wait for next ping
            logger.info(f"⏰ Next ping in {PING_INTERVAL} seconds...")
            time.sleep(PING_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("\n🛑 Keep-Alive Service stopped by user")
            break
        except Exception as e:
            logger.error(f"❌ Unexpected error: {str(e)}")
            logger.info("Continuing in 60 seconds...")
            time.sleep(60)

if __name__ == "__main__":
    main()
