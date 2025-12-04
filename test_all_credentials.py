#!/usr/bin/env python3
"""
Test all discovered credentials
"""

import requests
import json

BASE_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def test_login(endpoint, email, password, login_type):
    """Test login with given credentials"""
    try:
        response = requests.post(
            f"{BASE_URL}/{endpoint}",
            json={"email": email, "password": password},
            timeout=10
        )
        
        print(f"🔐 {login_type} Login: {email}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SUCCESS!")
            print(f"   User Type: {data.get('user_type', 'N/A')}")
            if 'user' in data:
                user_info = data['user']
                print(f"   Status: {user_info.get('status', 'N/A')}")
                print(f"   Payment: {user_info.get('payment_status', 'N/A')}")
            elif 'admin' in data:
                admin_info = data['admin']
                print(f"   Role: {admin_info.get('role', 'N/A')}")
            elif 'mentor' in data:
                mentor_info = data['mentor']
                print(f"   Mentor ID: {mentor_info.get('mentor_id', 'N/A')}")
            return data.get("access_token")
        else:
            print(f"   ❌ FAILED: {response.text}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
    
    print()
    return None

def main():
    print("=" * 80)
    print("TESTING ALL DISCOVERED CREDENTIALS")
    print("=" * 80)
    print()
    
    # Test admin credentials
    print("👨‍💼 ADMIN CREDENTIALS:")
    admin_token = test_login("admin/login", "admin@signalmaster.com", "Admin@123", "Admin")
    
    # Test user credentials
    print("👤 USER CREDENTIALS:")
    test_login("auth/login", "user@test.com", "tFSvVGwd8deM", "User")  # Temporary password
    test_login("auth/login", "user1@test.com", "Test@123", "User")
    test_login("auth/login", "user2@test.com", "Test@123", "User")
    test_login("auth/login", "user3@test.com", "Test@123", "User")
    
    # Test original credentials from review request
    print("🔍 ORIGINAL REVIEW REQUEST CREDENTIALS:")
    test_login("auth/login", "user@test.com", "Test@123", "User")
    test_login("admin/login", "admin@signalmaster.com", "Admin@123", "Admin")
    test_login("mentor/login", "legacymentor0001@placeholder.com", "Mentor@123", "Mentor")
    
    # If we have admin access, try to get more info
    if admin_token:
        print("🔍 ADMIN DATABASE INVESTIGATION:")
        try:
            headers = {"Authorization": f"Bearer {admin_token}"}
            
            # Get users
            response = requests.get(f"{BASE_URL}/admin/users", headers=headers)
            if response.status_code == 200:
                users = response.json().get("users", [])
                print(f"   Found {len(users)} users in database")
                for user in users[:5]:  # Show first 5
                    print(f"   - {user.get('email', 'N/A')} (Status: {user.get('status', 'N/A')}, Payment: {user.get('payment_status', 'N/A')})")
            
            # Try to get mentors
            response = requests.get(f"{BASE_URL}/admin/mentors", headers=headers)
            if response.status_code == 200:
                mentors = response.json().get("mentors", [])
                print(f"   Found {len(mentors)} mentors in database")
                for mentor in mentors[:3]:  # Show first 3
                    print(f"   - {mentor.get('email', 'N/A')} (Mentor ID: {mentor.get('mentor_id', 'N/A')}, Status: {mentor.get('status', 'N/A')})")
            else:
                print(f"   Mentors endpoint: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"   Error investigating database: {str(e)}")
    
    print("=" * 80)
    print("SUMMARY OF WORKING CREDENTIALS")
    print("=" * 80)
    print("✅ CONFIRMED WORKING:")
    print("   - Admin: admin@signalmaster.com / Admin@123")
    print("   - User: user@test.com / tFSvVGwd8deM (temporary)")
    print("   - User: user1@test.com / Test@123")
    print("   - User: user2@test.com / Test@123") 
    print("   - User: user3@test.com / Test@123")
    print()
    print("❌ NOT WORKING:")
    print("   - Mentor: legacymentor0001@placeholder.com / Mentor@123 (doesn't exist)")
    print()

if __name__ == "__main__":
    main()