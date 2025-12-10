"""
Script to extract all login credentials from database for client testing documentation
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

async def extract_all_credentials():
    """Extract all login credentials from database"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("=" * 80)
    print("LOGIN CREDENTIALS EXTRACTION FOR CLIENT TESTING")
    print("=" * 80)
    print()
    
    # ==================== ADMIN ACCOUNTS ====================
    print("=" * 80)
    print("1. ADMIN ACCOUNTS")
    print("=" * 80)
    
    admins = await db.admins.find({}).to_list(length=None)
    
    if admins:
        for idx, admin in enumerate(admins, 1):
            print(f"\nAdmin #{idx}:")
            print(f"  Email: {admin.get('email', 'N/A')}")
            print(f"  Name: {admin.get('name', 'N/A')}")
            print(f"  Role: {admin.get('role', 'admin')}")
            print(f"  Status: Active")
            print(f"  Password: [HASHED - Password Reset Required]")
            print(f"  Database ID: {str(admin.get('_id'))}")
            print(f"  Last Login: {admin.get('last_login', 'Never')}")
            print(f"  Note: Use 'Forgot Password' feature or admin reset to set new password")
    else:
        print("  No admin accounts found")
    
    print()
    
    # ==================== MENTOR ACCOUNTS ====================
    print("=" * 80)
    print("2. MENTOR ACCOUNTS")
    print("=" * 80)
    
    mentors = await db.mentors.find({}).to_list(length=None)
    
    if mentors:
        for idx, mentor in enumerate(mentors, 1):
            print(f"\nMentor #{idx}:")
            print(f"  Email: {mentor.get('email', 'N/A')}")
            print(f"  Name: {mentor.get('name', 'N/A')}")
            print(f"  Mentor ID: {mentor.get('mentor_id', 'NOT ASSIGNED (Pending Approval)')}")
            print(f"  Company Name: {mentor.get('company_name', 'N/A')}")
            print(f"  System Name: {mentor.get('system_name', 'N/A')}")
            print(f"  Status: {mentor.get('status', 'N/A')}")
            print(f"  Phone: {mentor.get('phone', 'N/A')}")
            print(f"  Social Media: {mentor.get('social_media', 'N/A')}")
            print(f"  License Key: {mentor.get('license_key', 'N/A')}")
            print(f"  Password: [HASHED - Password Reset Required]")
            print(f"  Database ID: {str(mentor.get('_id'))}")
            print(f"  Max Users: {mentor.get('max_users', 50)}")
            print(f"  Max Licenses: {mentor.get('max_licenses', 100)}")
            print(f"  Created At: {mentor.get('created_at', 'N/A')}")
            print(f"  Last Login: {mentor.get('last_login', 'Never')}")
            
            # Count users under this mentor
            if mentor.get('mentor_id'):
                user_count = await db.users.count_documents({"mentor_id": mentor.get('mentor_id')})
                print(f"  Total Users: {user_count}")
                
                # Count licenses
                total_licenses = await db.licenses.count_documents({"mentor_id": mentor.get('mentor_id')})
                used_licenses = await db.licenses.count_documents({"mentor_id": mentor.get('mentor_id'), "used": True})
                print(f"  Total Licenses: {total_licenses}")
                print(f"  Used Licenses: {used_licenses}")
                print(f"  Available Licenses: {total_licenses - used_licenses}")
            
            print(f"  Note: Use 'Forgot Password' feature or admin reset to set new password")
    else:
        print("  No mentor accounts found")
    
    print()
    
    # ==================== REGULAR USER ACCOUNTS ====================
    print("=" * 80)
    print("3. REGULAR USER ACCOUNTS")
    print("=" * 80)
    
    users = await db.users.find({}).to_list(length=None)
    
    if users:
        for idx, user in enumerate(users, 1):
            print(f"\nUser #{idx}:")
            print(f"  Email: {user.get('email', 'N/A')}")
            print(f"  Name: {user.get('name', 'N/A')}")
            print(f"  License Key: {user.get('license_key', 'N/A')}")
            print(f"  Mentor ID: {user.get('mentor_id', 'N/A')}")
            print(f"  Account Status: {user.get('status', 'N/A')}")
            print(f"  Payment Status: {user.get('payment_status', 'unpaid')}")
            print(f"  Payment Date: {user.get('payment_date', 'N/A')}")
            print(f"  Password: [HASHED - Password Reset Required]")
            print(f"  Requires Password Change: {user.get('requires_password_change', False)}")
            print(f"  Database ID: {str(user.get('_id'))}")
            print(f"  Created At: {user.get('created_at', 'N/A')}")
            print(f"  Last Login: {user.get('last_login', 'Never')}")
            
            # Check if this is a test account (common test patterns)
            email = user.get('email', '').lower()
            is_test = any(pattern in email for pattern in ['test', 'demo', 'sample', '@test.com', '@example.com'])
            if is_test:
                print(f"  ⚠️  IDENTIFIED AS TEST ACCOUNT")
            
            print(f"  Note: Use 'Forgot Password' feature or admin/mentor reset to set new password")
    else:
        print("  No user accounts found")
    
    print()
    
    # ==================== TEST ACCOUNTS SUMMARY ====================
    print("=" * 80)
    print("4. TEST ACCOUNTS SUMMARY")
    print("=" * 80)
    
    test_users = [u for u in users if any(pattern in u.get('email', '').lower() for pattern in ['test', 'demo', 'sample', '@test.com', '@example.com'])]
    
    if test_users:
        print(f"\nFound {len(test_users)} test account(s):")
        for idx, user in enumerate(test_users, 1):
            print(f"\n  Test Account #{idx}:")
            print(f"    Email: {user.get('email')}")
            print(f"    Name: {user.get('name')}")
            print(f"    Status: {user.get('status')}")
            print(f"    Payment Status: {user.get('payment_status', 'unpaid')}")
            print(f"    License Key: {user.get('license_key')}")
            print(f"    Password: [HASHED - Use password reset]")
    else:
        print("\n  No test accounts identified based on email patterns")
    
    print()
    
    # ==================== PASSWORD RESET INSTRUCTIONS ====================
    print("=" * 80)
    print("5. PASSWORD RESET INSTRUCTIONS")
    print("=" * 80)
    print()
    print("All passwords in the database are securely hashed and cannot be retrieved.")
    print("To access any account, use one of the following methods:")
    print()
    print("METHOD 1: User/Mentor Self-Service Password Reset")
    print("  - Navigate to login page")
    print("  - Click 'Forgot Password'")
    print("  - Enter email address")
    print("  - Temporary password will be sent to email (if email service configured)")
    print("  - Check backend logs for temporary password if email fails")
    print()
    print("METHOD 2: Admin Password Reset (for users)")
    print("  - Admin logs in to admin dashboard")
    print("  - Navigate to user management")
    print("  - Click 'Reset Password' for the user")
    print("  - Temporary password will be displayed and sent to user")
    print()
    print("METHOD 3: Mentor Password Reset (for their users)")
    print("  - Mentor logs in to mentor dashboard")
    print("  - Navigate to user management")
    print("  - Click 'Reset Password' for their user")
    print("  - Temporary password will be displayed and sent to user")
    print()
    print("METHOD 4: Direct Database Password Reset (for testing)")
    print("  - Use the backend API endpoint: POST /api/admin/users/{user_id}/reset-password")
    print("  - Requires admin authentication token")
    print("  - Returns temporary password in response")
    print()
    
    # ==================== STATISTICS ====================
    print("=" * 80)
    print("6. ACCOUNT STATISTICS")
    print("=" * 80)
    print()
    print(f"Total Admin Accounts: {len(admins)}")
    print(f"Total Mentor Accounts: {len(mentors)}")
    print(f"  - Active Mentors: {len([m for m in mentors if m.get('status') == 'active'])}")
    print(f"  - Pending Mentors: {len([m for m in mentors if m.get('status') == 'pending'])}")
    print(f"  - Inactive Mentors: {len([m for m in mentors if m.get('status') == 'inactive'])}")
    print(f"Total User Accounts: {len(users)}")
    print(f"  - Active Users: {len([u for u in users if u.get('status') == 'active'])}")
    print(f"  - Pending Users: {len([u for u in users if u.get('status') == 'pending'])}")
    print(f"  - Inactive Users: {len([u for u in users if u.get('status') == 'inactive'])}")
    print(f"  - Paid Users: {len([u for u in users if u.get('payment_status') == 'paid'])}")
    print(f"  - Unpaid Users: {len([u for u in users if u.get('payment_status') != 'paid'])}")
    print(f"Total Test Accounts: {len(test_users)}")
    print()
    
    # ==================== LICENSE KEYS SUMMARY ====================
    print("=" * 80)
    print("7. LICENSE KEYS SUMMARY")
    print("=" * 80)
    
    all_licenses = await db.licenses.find({}).to_list(length=None)
    print(f"\nTotal License Keys: {len(all_licenses)}")
    print(f"  - Used: {len([l for l in all_licenses if l.get('used')])}")
    print(f"  - Available: {len([l for l in all_licenses if not l.get('used')])}")
    
    # Show some available license keys for testing
    available_licenses = [l for l in all_licenses if not l.get('used')]
    if available_licenses:
        print(f"\nSample Available License Keys (for new test accounts):")
        for idx, lic in enumerate(available_licenses[:5], 1):
            print(f"  {idx}. {lic.get('key')} (Mentor: {lic.get('mentor_id', 'N/A')})")
    
    print()
    print("=" * 80)
    print("END OF CREDENTIALS EXTRACTION")
    print("=" * 80)
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(extract_all_credentials())
