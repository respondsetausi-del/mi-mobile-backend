#!/usr/bin/env python3
"""
Test login with temporary password
"""

import requests
import json

BASE_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def test_login_with_temp_password():
    """Test login with temporary password"""
    print("🔐 Testing login with temporary password...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "user@test.com", "password": "tFSvVGwd8deM"},
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ LOGIN SUCCESSFUL!")
            print(f"User Type: {data.get('user_type')}")
            print(f"Status: {data.get('status')}")
            print(f"Payment Status: {data.get('payment_status')}")
            print(f"Requires Payment: {data.get('requires_payment')}")
            print(f"Requires Password Change: {data.get('requires_password_change')}")
            
            # Test accessing a protected endpoint
            token = data.get("access_token")
            if token:
                print("\n🔒 Testing protected endpoint access...")
                headers = {"Authorization": f"Bearer {token}"}
                profile_response = requests.get(f"{BASE_URL}/user/profile", headers=headers)
                print(f"Profile endpoint status: {profile_response.status_code}")
                if profile_response.status_code == 200:
                    print("✅ Protected endpoint access successful!")
                else:
                    print(f"❌ Protected endpoint failed: {profile_response.text}")
        else:
            print("❌ LOGIN FAILED!")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_login_with_temp_password()