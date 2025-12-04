#!/usr/bin/env python3
"""
Direct Admin Tool - Generate Mentor IDs and License Keys
Run this script directly on the backend to bypass frontend issues
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import secrets
import string
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

client = AsyncIOMotorClient(MONGO_URL)
db = client[os.getenv('DB_NAME', 'signalmaster')]

def generate_license_key():
    """Generate a random license key"""
    chars = string.ascii_uppercase + string.digits
    key = ''.join(secrets.choice(chars) for _ in range(16))
    return f"{key[:4]}-{key[4:8]}-{key[8:12]}-{key[12:16]}"

async def generate_mentor_ids(count=5):
    """Generate mentor IDs"""
    print("\n=== GENERATING MENTOR IDs ===\n")
    
    # Get current count
    existing_count = await db.mentors.count_documents({})
    print(f"Existing mentors: {existing_count}")
    
    created_ids = []
    for i in range(count):
        mentor_id = f"MENTOR{str(existing_count + i + 1).zfill(4)}"
        
        # Check if exists
        existing = await db.mentors.find_one({"mentor_id": mentor_id})
        if existing:
            print(f"⚠️  {mentor_id} already exists - skipping")
            continue
        
        # Create mentor doc
        mentor_doc = {
            "mentor_id": mentor_id,
            "created_at": datetime.utcnow(),
            "created_by": "admin_script",
            "active": True,
            "copied": False,
            "total_referrals": 0
        }
        
        await db.mentors.insert_one(mentor_doc)
        created_ids.append(mentor_id)
        print(f"✅ Created: {mentor_id}")
    
    print(f"\n✅ Total created: {len(created_ids)}")
    return created_ids

async def generate_license_keys(count=10):
    """Generate license keys"""
    print("\n=== GENERATING LICENSE KEYS ===\n")
    
    created_keys = []
    for i in range(count):
        key = generate_license_key()
        
        # Check if exists
        existing = await db.licenses.find_one({"key": key})
        if existing:
            print(f"⚠️  {key} already exists - regenerating")
            i -= 1
            continue
        
        # Create license doc
        license_doc = {
            "key": key,
            "created_at": datetime.utcnow(),
            "used": False,
            "used_by": None,
            "used_at": None
        }
        
        await db.licenses.insert_one(license_doc)
        created_keys.append(key)
        print(f"✅ Created: {key}")
    
    print(f"\n✅ Total created: {len(created_keys)}")
    return created_keys

async def show_all_mentors():
    """Show all mentor IDs"""
    print("\n=== ALL MENTOR IDs ===\n")
    mentors = await db.mentors.find().sort("created_at", -1).to_list(100)
    
    for mentor in mentors:
        print(f"👤 {mentor['mentor_id']:<15} | Created: {mentor['created_at']}")
    
    print(f"\nTotal: {len(mentors)} mentors")

async def show_all_licenses():
    """Show all license keys"""
    print("\n=== ALL LICENSE KEYS ===\n")
    licenses = await db.licenses.find().sort("created_at", -1).to_list(100)
    
    for lic in licenses:
        status = "🔴 USED" if lic.get('used') else "🟢 Available"
        print(f"{status} | {lic['key']}")
    
    print(f"\nTotal: {len(licenses)} licenses")

async def main():
    """Main function"""
    print("=" * 60)
    print("DIRECT ADMIN TOOL - Mentor IDs & License Keys Generator")
    print("=" * 60)
    
    # Generate 5 mentor IDs
    await generate_mentor_ids(5)
    
    # Generate 10 license keys
    await generate_license_keys(10)
    
    # Show all
    await show_all_mentors()
    await show_all_licenses()
    
    print("\n" + "=" * 60)
    print("✅ COMPLETE - All IDs generated and saved to database!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
