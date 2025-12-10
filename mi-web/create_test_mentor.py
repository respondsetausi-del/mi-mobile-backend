#!/usr/bin/env python3
"""
Create a test mentor account
"""

import requests
import json

BASE_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def create_mentor():
    """Create a test mentor using the registration endpoint"""
    print("🔧 Creating test mentor...")
    
    # Use one of the available license keys from init_db.py output
    license_keys = [
        "KRR8-OFX6-QEC4-QVVU",
        "MB9C-MH0E-36CX-3XND", 
        "JMF0-82FG-0U5F-2Z2H",
        "DK9Q-RNRQ-LVJN-TVJX",
        "LDCD-0L61-YVG9-2KL4"
    ]
    
    mentor_data = {
        "name": "Legacy Mentor Test",
        "email": "legacymentor0001@placeholder.com",
        "phone": "+1234567890",
        "social_media": "@legacymentor",
        "license_key": license_keys[0],  # Try first license key
        "password": "Mentor@123",
        "company_name": "Legacy Trading Co"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/mentor/register",
            json=mentor_data,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Mentor registration successful!")
            print("⚠️  Mentor needs admin approval before login")
            return True
        else:
            print("❌ Mentor registration failed")
            # Try with different license key
            for i, license_key in enumerate(license_keys[1:], 1):
                print(f"\n🔄 Trying with license key {i+1}: {license_key}")
                mentor_data["license_key"] = license_key
                
                response = requests.post(
                    f"{BASE_URL}/mentor/register",
                    json=mentor_data,
                    timeout=10
                )
                
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    print("✅ Mentor registration successful!")
                    return True
                else:
                    print(f"❌ Failed: {response.text}")
            
    except Exception as e:
        print(f"Error: {str(e)}")
    
    return False

def approve_mentor_as_admin():
    """Approve the mentor using admin credentials"""
    print("\n🔧 Approving mentor as admin...")
    
    # First login as admin
    try:
        admin_response = requests.post(
            f"{BASE_URL}/admin/login",
            json={"email": "admin@signalmaster.com", "password": "Admin@123"},
            timeout=10
        )
        
        if admin_response.status_code != 200:
            print("❌ Admin login failed")
            return False
            
        admin_token = admin_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get mentors list
        mentors_response = requests.get(f"{BASE_URL}/admin/mentors", headers=headers)
        if mentors_response.status_code != 200:
            print(f"❌ Failed to get mentors: {mentors_response.text}")
            return False
            
        mentors = mentors_response.json().get("mentors", [])
        print(f"Found {len(mentors)} mentors")
        
        # Find our test mentor
        test_mentor = None
        for mentor in mentors:
            if mentor.get("email") == "legacymentor0001@placeholder.com":
                test_mentor = mentor
                break
        
        if not test_mentor:
            print("❌ Test mentor not found in database")
            return False
            
        print(f"Found mentor: {test_mentor.get('email')} (Status: {test_mentor.get('status')})")
        
        # Approve the mentor
        mentor_id = test_mentor.get("_id")
        approve_response = requests.post(
            f"{BASE_URL}/admin/mentors/{mentor_id}/approve",
            headers=headers,
            timeout=10
        )
        
        print(f"Approval status: {approve_response.status_code}")
        print(f"Approval response: {approve_response.text}")
        
        if approve_response.status_code == 200:
            print("✅ Mentor approved successfully!")
            return True
        else:
            print("❌ Mentor approval failed")
            
    except Exception as e:
        print(f"Error approving mentor: {str(e)}")
    
    return False

def test_mentor_login():
    """Test mentor login"""
    print("\n🔐 Testing mentor login...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/mentor/login",
            json={"email": "legacymentor0001@placeholder.com", "password": "Mentor@123"},
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Mentor login successful!")
            print(f"User Type: {data.get('user_type')}")
            print(f"Mentor ID: {data.get('mentor', {}).get('mentor_id')}")
            return True
        else:
            print("❌ Mentor login failed")
            
    except Exception as e:
        print(f"Error: {str(e)}")
    
    return False

def main():
    print("=" * 60)
    print("CREATING TEST MENTOR ACCOUNT")
    print("=" * 60)
    
    # Step 1: Create mentor
    if create_mentor():
        # Step 2: Approve mentor
        if approve_mentor_as_admin():
            # Step 3: Test login
            test_mentor_login()
        else:
            print("⚠️  Mentor created but approval failed. Try manual approval.")
    else:
        print("❌ Failed to create mentor")

if __name__ == "__main__":
    main()