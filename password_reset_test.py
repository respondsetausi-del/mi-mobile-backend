#!/usr/bin/env python3
"""
PASSWORD RESET TEST - Reset passwords for users who cannot login
"""

import requests
import json
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def test_admin_login():
    """Test admin login"""
    try:
        response = requests.post(
            f"{BACKEND_URL}/admin/login",
            json={"email": "admin@signalmaster.com", "password": "Admin@123"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Admin Login Successful!")
            return data.get('access_token')
        else:
            print(f"❌ Admin Login Failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Exception during admin login: {str(e)}")
        return None

def reset_user_password(admin_token, user_id, email):
    """Reset user password via admin"""
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        reset_url = f"{BACKEND_URL}/admin/users/{user_id}/reset-password"
        
        print(f"🔄 Resetting password for {email}...")
        response = requests.post(reset_url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            temp_password = data.get('temporary_password')
            print(f"✅ Password Reset Successful!")
            print(f"🔑 New Temporary Password: {temp_password}")
            return temp_password
        else:
            print(f"❌ Password Reset Failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Exception during password reset: {str(e)}")
        return None

def test_login_with_new_password(email, password):
    """Test login with new password"""
    try:
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": email, "password": password},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login Successful with new password!")
            print(f"🔄 Requires Password Change: {data.get('requires_password_change', False)}")
            return True, data
        else:
            print(f"❌ Login Failed: {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ Exception during login: {str(e)}")
        return False, None

def main():
    """Main execution"""
    print("🔧 PASSWORD RESET TEST FOR LOGIN ISSUE")
    print(f"⏰ Started: {datetime.now()}")
    
    # Users from the review request
    users = [
        {"email": "collenbelly7@icloud.com", "user_id": "690c9da33de77738e3174380", "name": "Collen"},
        {"email": "respondscooby@gmail.com", "user_id": "690e6f0e16db68148c977571", "name": "Scooby"}
    ]
    
    # Get admin token
    admin_token = test_admin_login()
    if not admin_token:
        print("❌ Cannot proceed without admin token")
        return
    
    # Reset passwords for both users
    for user in users:
        print(f"\n{'='*60}")
        print(f"🔧 RESETTING PASSWORD FOR {user['name']} ({user['email']})")
        print(f"{'='*60}")
        
        # Reset password
        new_password = reset_user_password(admin_token, user['user_id'], user['email'])
        
        if new_password:
            # Test login with new password
            print(f"\n🔍 Testing login with new password...")
            success, login_data = test_login_with_new_password(user['email'], new_password)
            
            if success:
                print(f"🎉 {user['name']} can now login successfully!")
                user['new_password'] = new_password
                user['login_success'] = True
            else:
                print(f"❌ {user['name']} still cannot login")
                user['login_success'] = False
        else:
            user['login_success'] = False
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 PASSWORD RESET SUMMARY")
    print(f"{'='*60}")
    
    for user in users:
        status = "✅ SUCCESS" if user.get('login_success') else "❌ FAILED"
        print(f"{user['name']} ({user['email']}): {status}")
        if user.get('new_password'):
            print(f"   🔑 New Password: {user['new_password']}")
    
    print(f"\n⏰ Completed: {datetime.now()}")

if __name__ == "__main__":
    main()