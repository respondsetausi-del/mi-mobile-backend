"""
Migration script to convert EA user_id from ObjectId to string format
Run this once to fix existing data
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

async def migrate_ea_user_ids():
    """Convert all EA user_id fields from ObjectId to string"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.signalmaster
    
    print("=" * 60)
    print("Starting EA user_id migration")
    print("=" * 60)
    
    # Find all EAs
    eas = await db.eas.find({}).to_list(length=10000)
    print(f"\nFound {len(eas)} EAs to check")
    
    updated_count = 0
    
    for ea in eas:
        user_id = ea.get("user_id")
        
        # Check if user_id is ObjectId type
        if isinstance(user_id, ObjectId):
            user_id_str = str(user_id)
            print(f"\n📝 Converting EA {ea['_id']}: {user_id} → {user_id_str}")
            
            # Update to string
            await db.eas.update_one(
                {"_id": ea["_id"]},
                {"$set": {"user_id": user_id_str}}
            )
            
            updated_count += 1
            print(f"✅ Updated EA '{ea.get('name', 'Unknown')}'")
        elif isinstance(user_id, str):
            print(f"✓ EA {ea.get('name', 'Unknown')} already has string user_id")
        else:
            print(f"⚠️  EA {ea.get('name', 'Unknown')} has unexpected user_id type: {type(user_id)}")
    
    print("\n" + "=" * 60)
    print(f"Migration complete!")
    print(f"Total EAs checked: {len(eas)}")
    print(f"EAs updated: {updated_count}")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_ea_user_ids())
