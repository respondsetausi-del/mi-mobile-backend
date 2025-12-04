"""
Create a test user account
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from auth import get_password_hash
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def create_test_user():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔧 Creating test user account...")
    
    # Check if test user already exists
    test_email = "testuser@signalmaster.com"
    existing_user = await db.users.find_one({"email": test_email})
    
    if existing_user:
        print(f"ℹ️  Test user already exists: {test_email}")
        print(f"   Password: Test@123")
        client.close()
        return
    
    # Get an available license key
    available_license = await db.licenses.find_one({"used": False})
    if not available_license:
        print("❌ No available license keys found!")
        client.close()
        return
    
    license_key = available_license["key"]
    
    # Create test user
    user_doc = {
        "email": test_email,
        "password_hash": get_password_hash("Test@123"),
        "name": "Test User",
        "mentor_id": "MENTOR001",
        "license_key": license_key,
        "status": "active",
        "created_at": datetime.utcnow(),
        "last_login": None
    }
    
    result = await db.users.insert_one(user_doc)
    print(f"✅ Created test user: {test_email}")
    print(f"   Password: Test@123")
    print(f"   Name: Test User")
    print(f"   Mentor ID: MENTOR001")
    print(f"   License Key: {license_key}")
    print(f"   User ID: {result.inserted_id}")
    
    # Mark license as used
    await db.licenses.update_one(
        {"key": license_key},
        {"$set": {"used": True, "used_by": str(result.inserted_id), "used_at": datetime.utcnow()}}
    )
    
    print("\n✅ Test user creation complete!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())
