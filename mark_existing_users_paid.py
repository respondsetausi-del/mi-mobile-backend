#!/usr/bin/env python3
"""
Script to mark all existing users as paid.
Run this once to grandfather existing users.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import asyncio
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def mark_users_paid():
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Update all users to have payment_status = 'paid'
    result = await db.users.update_many(
        {},  # All users
        {
            "$set": {
                "payment_status": "paid",
                "payment_date": datetime.utcnow()
            }
        }
    )
    
    print(f"✅ Marked {result.modified_count} existing users as paid")
    
    # Count users
    total_users = await db.users.count_documents({})
    paid_users = await db.users.count_documents({"payment_status": "paid"})
    
    print(f"📊 Total users: {total_users}")
    print(f"💳 Paid users: {paid_users}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(mark_users_paid())
