#!/usr/bin/env python3
"""
PASSWORD CHANGE FLOW TEST - Test users can change their temporary passwords
"""

import requests
import json
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def test_login_and_change_password(email, temp_password, new_password):
    """Test login with temp password and change to new password"""
    print(f"\n{'='*60}")
    print(f"🔄 TESTING PASSWORD CHANGE FLOW FOR {email}")
    print(f"{'='*60}")
    
    # Step 1: Login with temporary password
    try:
        print(f"🔍 Step 1: Login with temporary password...")
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": email, "password": temp_password},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            requires_change = data.get('requires_password_change', False)
            
            print(f"✅ Login successful!")
            print(f"🔄 Requires Password Change: {requires_change}")
            
            if not requires_change:
                print(f"⚠️ Warning: requires_password_change flag is False")
            
            # Step 2: Change password
            if token:
                print(f"\n🔍 Step 2: Changing password...")
                headers = {"Authorization": f"Bearer {token}"}
                change_data = {
                    "current_password": temp_password,
                    "new_password": new_password
                }
                
                change_response = requests.post(
                    f"{BACKEND_URL}/auth/change-password",
                    json=change_data,
                    headers=headers,
                    timeout=30
                )
                
                if change_response.status_code == 200:
                    print(f"✅ Password change successful!")
                    
                    # Step 3: Login with new password
                    print(f"\n🔍 Step 3: Login with new password...")
                    new_login_response = requests.post(
                        f"{BACKEND_URL}/auth/login",
                        json={"email": email, "password": new_password},
                        timeout=30
                    )
                    
                    if new_login_response.status_code == 200:
                        new_data = new_login_response.json()
                        new_requires_change = new_data.get('requires_password_change', False)
                        
                        print(f"✅ Login with new password successful!")
                        print(f"🔄 Requires Password Change: {new_requires_change}")
                        
                        if new_requires_change:
                            print(f"⚠️ Warning: Still requires password change after update")
                        
                        # Step 4: Test protected route access
                        print(f"\n🔍 Step 4: Testing protected route access...")
                        new_token = new_data.get('access_token')
                        if new_token:
                            profile_response = requests.get(
                                f"{BACKEND_URL}/user/profile",
                                headers={"Authorization": f"Bearer {new_token}"},
                                timeout=30
                            )
                            
                            if profile_response.status_code == 200:
                                profile_data = profile_response.json()
                                print(f"✅ Protected route access successful!")
                                print(f"📧 Email: {profile_data.get('email')}")
                                print(f"👤 Name: {profile_data.get('name')}")
                                print(f"💳 Payment Status: {profile_data.get('payment_status')}")
                                return True
                            else:
                                print(f"❌ Protected route access failed: {profile_response.status_code}")
                                return False
                        else:
                            print(f"❌ No token received after password change")
                            return False
                    else:
                        print(f"❌ Login with new password failed: {new_login_response.status_code}")
                        return False
                else:
                    print(f"❌ Password change failed: {change_response.status_code}")
                    try:
                        error_data = change_response.json()
                        print(f"   Error: {error_data.get('detail', 'Unknown error')}")
                    except:
                        print(f"   Response: {change_response.text}")
                    return False
            else:
                print(f"❌ No token received from login")
                return False
        else:
            print(f"❌ Login with temporary password failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Exception during password change flow: {str(e)}")
        return False

def main():
    """Main execution"""
    print("🔄 PASSWORD CHANGE FLOW TEST")
    print(f"⏰ Started: {datetime.now()}")
    
    # Users with their temporary passwords from previous test
    users = [
        {
            "email": "collenbelly7@icloud.com",
            "temp_password": "IW%D&qaJ9qZd",
            "new_password": "NewPassword123!",
            "name": "Collen"
        },
        {
            "email": "respondscooby@gmail.com", 
            "temp_password": "pe@I*ZTa&V9!",
            "new_password": "MySecurePass456@",
            "name": "Scooby"
        }
    ]
    
    results = []
    
    # Test password change flow for each user
    for user in users:
        success = test_login_and_change_password(
            user['email'], 
            user['temp_password'], 
            user['new_password']
        )
        results.append((user['name'], user['email'], success, user['new_password']))
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 PASSWORD CHANGE FLOW SUMMARY")
    print(f"{'='*60}")
    
    all_successful = True
    for name, email, success, new_password in results:
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"{name} ({email}): {status}")
        if success:
            print(f"   🔑 Final Password: {new_password}")
        if not success:
            all_successful = False
    
    if all_successful:
        print(f"\n🎉 ALL USERS CAN NOW LOGIN AND CHANGE PASSWORDS!")
        print(f"✅ Login issue has been resolved")
    else:
        print(f"\n⚠️ Some users still have issues with password change flow")
    
    print(f"\n⏰ Completed: {datetime.now()}")

if __name__ == "__main__":
    main()