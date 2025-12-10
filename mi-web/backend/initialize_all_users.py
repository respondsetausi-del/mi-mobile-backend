"""
Complete database initialization with Admin, Test Users, and Mentors
Run this once to populate the database on Render
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from auth import get_password_hash
from license_manager import LicenseManager
import sys

# MongoDB connection string
MONGO_URL = "mongodb+srv://trade-alerts-39:d4nh31clqs2c73d2jk30@customer-apps-pri.v60dia.mongodb.net/?appName=mi-indicator-live&maxPoolSize=5&retryWrites=true&timeoutMS=10000&w=majority"
DB_NAME = "mi_mobile_indicator"

async def initialize_database():
    print("🚀 Starting complete database initialization...")
    print(f"📊 Connecting to: {DB_NAME}\n")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Test connection
        await db.command('ping')
        print("✅ Successfully connected to MongoDB Atlas\n")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return
    
    # ========================================
    # 1. CREATE ADMIN ACCOUNT
    # ========================================
    print("👤 Creating Admin Account...")
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
        print(f"✅ Created Admin Account")
        print(f"   Email: {admin_email}")
        print(f"   Password: Admin@123")
        print(f"   Admin ID: {result.inserted_id}\n")
    else:
        print(f"ℹ️  Admin already exists: {admin_email}\n")
    
    # ========================================
    # 2. GENERATE LICENSE KEYS
    # ========================================
    print("🔑 Generating License Keys...")
    existing_licenses = await db.licenses.count_documents({})
    
    if existing_licenses < 20:
        keys_to_generate = 20 - existing_licenses
        print(f"   Generating {keys_to_generate} new license keys...")
        keys = LicenseManager.generate_multiple_keys(keys_to_generate)
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
        print(f"✅ Generated {keys_to_generate} license keys")
        print(f"   First 3 keys:")
        for i, key in enumerate(keys[:3], 1):
            print(f"   {i}. {key}")
        print()
    else:
        print(f"ℹ️  {existing_licenses} license keys already exist\n")
    
    # Get available license keys for user creation
    available_licenses = await db.licenses.find({"used": False}).limit(10).to_list(length=10)
    if len(available_licenses) < 5:
        print("⚠️  Warning: Not enough available license keys!")
        return
    
    # ========================================
    # 3. CREATE MENTORS
    # ========================================
    print("👨‍🏫 Creating Mentor Accounts...")
    
    mentors_data = [
        {
            "email": "mentor1@signalmaster.com",
            "password": "Mentor@123",
            "name": "John Mentor",
            "mentor_id": "MENTOR001",
            "company_name": "Signal Masters Pro",
            "phone": "+1234567890",
            "max_users": 50,
            "status": "active"
        },
        {
            "email": "mentor2@signalmaster.com",
            "password": "Mentor@123",
            "name": "Sarah Mentor",
            "mentor_id": "MENTOR002",
            "company_name": "Forex Experts",
            "phone": "+1987654321",
            "max_users": 30,
            "status": "active"
        }
    ]
    
    for mentor_data in mentors_data:
        existing_mentor = await db.mentors.find_one({"email": mentor_data["email"]})
        
        if not existing_mentor:
            mentor_doc = {
                "email": mentor_data["email"],
                "password_hash": get_password_hash(mentor_data["password"]),
                "name": mentor_data["name"],
                "mentor_id": mentor_data["mentor_id"],
                "company_name": mentor_data["company_name"],
                "phone": mentor_data["phone"],
                "status": mentor_data["status"],
                "max_users": mentor_data["max_users"],
                "current_users": 0,
                "branding": {
                    "logo_url": "",
                    "primary_color": "#00D9FF",
                    "company_name": mentor_data["company_name"]
                },
                "brokers": [],
                "created_at": datetime.utcnow(),
                "approved_at": datetime.utcnow(),
                "last_login": None
            }
            result = await db.mentors.insert_one(mentor_doc)
            print(f"✅ Created Mentor: {mentor_data['name']}")
            print(f"   Email: {mentor_data['email']}")
            print(f"   Password: {mentor_data['password']}")
            print(f"   Mentor ID: {mentor_data['mentor_id']}\n")
        else:
            print(f"ℹ️  Mentor already exists: {mentor_data['email']}\n")
    
    # ========================================
    # 4. CREATE TEST USERS
    # ========================================
    print("👥 Creating Test User Accounts...")
    
    # User 1: Paid and Active (ready to use)
    user1_email = "testuser@signalmaster.com"
    existing_user1 = await db.users.find_one({"email": user1_email})
    
    if not existing_user1:
        user1_doc = {
            "email": user1_email,
            "password_hash": get_password_hash("Test@123"),
            "name": "Test User",
            "mentor_id": "MENTOR001",
            "license_key": available_licenses[0]["key"],
            "status": "active",
            "payment_status": "paid",
            "created_at": datetime.utcnow(),
            "approved_at": datetime.utcnow(),
            "last_login": None
        }
        result = await db.users.insert_one(user1_doc)
        
        # Mark license as used
        await db.licenses.update_one(
            {"key": available_licenses[0]["key"]},
            {"$set": {"used": True, "used_by": str(result.inserted_id), "used_at": datetime.utcnow()}}
        )
        
        print(f"✅ Created Test User #1 (PAID & ACTIVE)")
        print(f"   Email: {user1_email}")
        print(f"   Password: Test@123")
        print(f"   Status: Active, Paid")
        print(f"   License Key: {available_licenses[0]['key']}\n")
    else:
        print(f"ℹ️  Test User #1 already exists: {user1_email}\n")
    
    # User 2: Pending Payment
    user2_email = "testuser2@signalmaster.com"
    existing_user2 = await db.users.find_one({"email": user2_email})
    
    if not existing_user2:
        user2_doc = {
            "email": user2_email,
            "password_hash": get_password_hash("Test@123"),
            "name": "Test User 2",
            "mentor_id": "MENTOR001",
            "license_key": available_licenses[1]["key"],
            "status": "pending",
            "payment_status": "unpaid",
            "created_at": datetime.utcnow(),
            "last_login": None
        }
        result = await db.users.insert_one(user2_doc)
        
        # Mark license as used
        await db.licenses.update_one(
            {"key": available_licenses[1]["key"]},
            {"$set": {"used": True, "used_by": str(result.inserted_id), "used_at": datetime.utcnow()}}
        )
        
        print(f"✅ Created Test User #2 (UNPAID)")
        print(f"   Email: {user2_email}")
        print(f"   Password: Test@123")
        print(f"   Status: Pending, Unpaid")
        print(f"   License Key: {available_licenses[1]['key']}\n")
    else:
        print(f"ℹ️  Test User #2 already exists: {user2_email}\n")
    
    # User 3: Paid but Pending Approval
    user3_email = "testuser3@signalmaster.com"
    existing_user3 = await db.users.find_one({"email": user3_email})
    
    if not existing_user3:
        user3_doc = {
            "email": user3_email,
            "password_hash": get_password_hash("Test@123"),
            "name": "Test User 3",
            "mentor_id": "MENTOR002",
            "license_key": available_licenses[2]["key"],
            "status": "pending",
            "payment_status": "paid",
            "created_at": datetime.utcnow(),
            "last_login": None
        }
        result = await db.users.insert_one(user3_doc)
        
        # Mark license as used
        await db.licenses.update_one(
            {"key": available_licenses[2]["key"]},
            {"$set": {"used": True, "used_by": str(result.inserted_id), "used_at": datetime.utcnow()}}
        )
        
        print(f"✅ Created Test User #3 (PAID, PENDING APPROVAL)")
        print(f"   Email: {user3_email}")
        print(f"   Password: Test@123")
        print(f"   Status: Pending Approval, Paid")
        print(f"   License Key: {available_licenses[2]['key']}\n")
    else:
        print(f"ℹ️  Test User #3 already exists: {user3_email}\n")
    
    # ========================================
    # 5. CREATE INDEXES
    # ========================================
    print("📊 Creating Database Indexes...")
    try:
        await db.users.create_index("email", unique=True)
        await db.admins.create_index("email", unique=True)
        await db.mentors.create_index("email", unique=True)
        await db.mentors.create_index("mentor_id", unique=True)
        await db.licenses.create_index("key", unique=True)
        await db.eas.create_index("user_id")
        await db.user_activity.create_index("user_id")
        await db.user_activity.create_index("timestamp")
        print("✅ Database indexes created\n")
    except Exception as e:
        print(f"⚠️  Some indexes may already exist: {e}\n")
    
    # ========================================
    # SUMMARY
    # ========================================
    print("=" * 60)
    print("✅ DATABASE INITIALIZATION COMPLETE!")
    print("=" * 60)
    print("\n📋 LOGIN CREDENTIALS:\n")
    
    print("👤 ADMIN LOGIN:")
    print("   Email: admin@signalmaster.com")
    print("   Password: Admin@123")
    print("   Access: Full admin dashboard\n")
    
    print("👨‍🏫 MENTOR LOGINS:")
    print("   Mentor 1:")
    print("     Email: mentor1@signalmaster.com")
    print("     Password: Mentor@123")
    print("     ID: MENTOR001")
    print("   Mentor 2:")
    print("     Email: mentor2@signalmaster.com")
    print("     Password: Mentor@123")
    print("     ID: MENTOR002\n")
    
    print("👥 TEST USER LOGINS:")
    print("   User 1 (Active & Paid):")
    print("     Email: testuser@signalmaster.com")
    print("     Password: Test@123")
    print("   User 2 (Unpaid):")
    print("     Email: testuser2@signalmaster.com")
    print("     Password: Test@123")
    print("   User 3 (Paid, Pending Approval):")
    print("     Email: testuser3@signalmaster.com")
    print("     Password: Test@123\n")
    
    print("=" * 60)
    print("⚠️  IMPORTANT: Change all passwords after first login!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    try:
        asyncio.run(initialize_database())
    except KeyboardInterrupt:
        print("\n\n⚠️  Initialization cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error during initialization: {e}")
        sys.exit(1)
