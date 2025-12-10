"""
Create additional test users and data for testing
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

async def create_test_data():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔧 Creating additional test data...\n")
    
    # Create multiple test users
    test_users = [
        {
            "email": "user1@test.com",
            "password": "Test@123",
            "name": "John Doe",
            "mentor_id": "MENTOR001"
        },
        {
            "email": "user2@test.com",
            "password": "Test@123",
            "name": "Jane Smith",
            "mentor_id": "MENTOR002"
        },
        {
            "email": "user3@test.com",
            "password": "Test@123",
            "name": "Bob Johnson",
            "mentor_id": "MENTOR001"
        }
    ]
    
    print("📝 Creating test users:")
    for user_data in test_users:
        existing = await db.users.find_one({"email": user_data["email"]})
        if existing:
            print(f"   ⚠️  User {user_data['email']} already exists")
            continue
        
        # Get available license
        license = await db.licenses.find_one({"used": False})
        if not license:
            print(f"   ❌ No available licenses for {user_data['email']}")
            continue
        
        user_doc = {
            "email": user_data["email"],
            "password_hash": get_password_hash(user_data["password"]),
            "name": user_data["name"],
            "mentor_id": user_data["mentor_id"],
            "license_key": license["key"],
            "status": "active",
            "created_at": datetime.utcnow(),
            "last_login": None
        }
        
        result = await db.users.insert_one(user_doc)
        await db.licenses.update_one(
            {"key": license["key"]},
            {"$set": {"used": True, "used_by": str(result.inserted_id), "used_at": datetime.utcnow()}}
        )
        
        print(f"   ✅ Created: {user_data['email']} (Mentor: {user_data['mentor_id']}, License: {license['key']})")
    
    # Generate additional licenses if needed
    available_licenses = await db.licenses.count_documents({"used": False})
    if available_licenses < 5:
        print(f"\n🔑 Generating 10 more license keys...")
        keys = LicenseManager.generate_multiple_keys(10)
        licenses = [
            {
                "key": key,
                "used": False,
                "created_at": datetime.utcnow(),
                "created_by": "test_script"
            }
            for key in keys
        ]
        await db.licenses.insert_many(licenses)
        print(f"   ✅ Generated 10 new license keys")
    
    print("\n" + "="*60)
    print("📊 TEST CREDENTIALS SUMMARY")
    print("="*60)
    
    # Print all test users
    print("\n👤 TEST USER ACCOUNTS:")
    all_users = await db.users.find().to_list(100)
    for i, user in enumerate(all_users, 1):
        print(f"\n{i}. {user['name']}")
        print(f"   Email: {user['email']}")
        print(f"   Password: Test@123")
        print(f"   Mentor ID: {user.get('mentor_id', 'N/A')}")
        print(f"   License Key: {user.get('license_key', 'N/A')}")
        print(f"   Status: {user.get('status', 'N/A')}")
    
    # Print admin accounts
    print("\n\n👨‍💼 ADMIN ACCOUNTS:")
    all_admins = await db.admins.find().to_list(100)
    for i, admin in enumerate(all_admins, 1):
        print(f"\n{i}. {admin['name']}")
        print(f"   Email: {admin['email']}")
        print(f"   Password: Admin@123")
        print(f"   Role: {admin.get('role', 'admin')}")
    
    # Print available licenses
    print("\n\n🔑 AVAILABLE LICENSE KEYS (for new registrations):")
    available = await db.licenses.find({"used": False}).limit(10).to_list(10)
    for i, lic in enumerate(available, 1):
        print(f"   {i}. {lic['key']}")
    
    # Print mentor IDs
    print("\n\n👥 MENTOR IDs (for registration):")
    mentors = set()
    async for user in db.users.find():
        if user.get('mentor_id'):
            mentors.add(user['mentor_id'])
    for mentor in sorted(mentors):
        print(f"   - {mentor}")
    
    print("\n" + "="*60)
    print("✅ Test data setup complete!")
    print("="*60 + "\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_data())
