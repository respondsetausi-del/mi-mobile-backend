"""
Initialize database with default admin and license keys
Run this script once to set up the initial database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from auth import get_password_hash
from datetime import datetime
from license_manager import LicenseManager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def init_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔧 Initializing database...")
    
    # Create default admin if not exists
    admin_email = "admin@signalmaster.com"
    existing_admin = await db.admins.find_one({"email": admin_email})
    
    if not existing_admin:
        admin_doc = {
            "email": admin_email,
            "password_hash": get_password_hash("Admin@123"),
            "name": "System Admin",
            "role": "super_admin",
            "permissions": ["view_users", "manage_users", "view_activity", "manage_licenses"],
            "created_at": datetime.utcnow(),
            "last_login": None
        }
        result = await db.admins.insert_one(admin_doc)
        print(f"✅ Created default admin: {admin_email}")
        print(f"   Password: Admin@123")
        print(f"   Admin ID: {result.inserted_id}")
    else:
        print(f"ℹ️  Admin already exists: {admin_email}")
    
    # Generate 10 license keys if none exist
    existing_licenses = await db.licenses.count_documents({})
    if existing_licenses == 0:
        print("\n🔑 Generating 10 initial license keys...")
        keys = LicenseManager.generate_multiple_keys(10)
        licenses = [
            {
                "key": key,
                "used": False,
                "created_at": datetime.utcnow(),
                "created_by": "system"
            }
            for key in keys
        ]
        await db.licenses.insert_many(licenses)
        print("✅ Generated licenses:")
        for i, key in enumerate(keys, 1):
            print(f"   {i}. {key}")
    else:
        print(f"\nℹ️  {existing_licenses} license keys already exist")
    
    # Create indexes for better performance
    print("\n📊 Creating database indexes...")
    await db.users.create_index("email", unique=True)
    await db.licenses.create_index("key", unique=True)
    await db.eas.create_index("user_id")
    await db.user_activity.create_index("user_id")
    await db.user_activity.create_index("timestamp")
    print("✅ Indexes created")
    
    print("\n✅ Database initialization complete!")
    print("\n📋 Summary:")
    print(f"   - Admin Email: {admin_email}")
    print(f"   - Admin Password: Admin@123")
    print(f"   - License Keys Generated: {len(keys) if existing_licenses == 0 else existing_licenses}")
    print(f"\n⚠️  IMPORTANT: Change the admin password after first login!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_database())
