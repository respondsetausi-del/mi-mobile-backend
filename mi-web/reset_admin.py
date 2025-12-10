#!/usr/bin/env python3
"""
Reset admin password script
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import sys
sys.path.append('/app/backend')
from auth import get_password_hash
from datetime import datetime

ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

async def reset_admin_password():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    admin_email = "admin@signalmaster.com"
    new_password = "Admin@123"
    
    print(f"🔧 Resetting admin password for: {admin_email}")
    
    # Check if admin exists
    existing_admin = await db.admins.find_one({"email": admin_email})
    
    if existing_admin:
        print(f"✅ Found existing admin: {admin_email}")
        
        # Update password
        new_password_hash = get_password_hash(new_password)
        result = await db.admins.update_one(
            {"email": admin_email},
            {"$set": {
                "password_hash": new_password_hash,
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.modified_count > 0:
            print(f"✅ Password updated successfully!")
            print(f"   Email: {admin_email}")
            print(f"   Password: {new_password}")
        else:
            print("❌ Failed to update password")
    else:
        print(f"❌ Admin not found: {admin_email}")
        
        # Create new admin
        admin_doc = {
            "email": admin_email,
            "password_hash": get_password_hash(new_password),
            "name": "System Admin",
            "role": "super_admin",
            "permissions": ["view_users", "manage_users", "view_activity", "manage_licenses"],
            "created_at": datetime.utcnow(),
            "last_login": None
        }
        result = await db.admins.insert_one(admin_doc)
        print(f"✅ Created new admin: {admin_email}")
        print(f"   Password: {new_password}")
        print(f"   Admin ID: {result.inserted_id}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(reset_admin_password())