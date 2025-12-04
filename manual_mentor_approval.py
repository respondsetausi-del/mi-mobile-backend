#!/usr/bin/env python3
"""
Manually approve mentor and test login
"""

import requests
import json

BASE_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def get_admin_token():
    """Get admin token"""
    response = requests.post(
        f"{BASE_URL}/admin/login",
        json={"email": "admin@signalmaster.com", "password": "Admin@123"},
        timeout=10
    )
    
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def main():
    print("🔧 Manual Mentor Approval and Testing")
    print("=" * 50)
    
    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Failed to get admin token")
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Get mentors
    print("📋 Getting mentors list...")
    response = requests.get(f"{BASE_URL}/admin/mentors", headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Response type: {type(data)}")
        print(f"Response keys: {data.keys() if isinstance(data, dict) else 'Not a dict'}")
        
        if isinstance(data, dict) and "mentors" in data:
            mentors = data["mentors"]
            print(f"Found {len(mentors)} mentors:")
            
            for i, mentor in enumerate(mentors):
                print(f"  {i+1}. Email: {mentor.get('email', 'N/A')}")
                print(f"     Status: {mentor.get('status', 'N/A')}")
                print(f"     ID: {mentor.get('_id', 'N/A')}")
                print()
                
                # If this is our test mentor, try to approve it
                if mentor.get('email') == 'legacymentor0001@placeholder.com':
                    mentor_id = mentor.get('_id')
                    print(f"🔧 Approving mentor {mentor_id}...")
                    
                    # Try different approval endpoints
                    endpoints_to_try = [
                        f"/admin/mentors/{mentor_id}/approve",
                        f"/admin/mentors/{mentor_id}/activate"
                    ]
                    
                    for endpoint in endpoints_to_try:
                        print(f"   Trying: {endpoint}")
                        approve_response = requests.post(f"{BASE_URL}{endpoint}", headers=headers)
                        print(f"   Status: {approve_response.status_code}")
                        print(f"   Response: {approve_response.text}")
                        
                        if approve_response.status_code == 200:
                            print("   ✅ Approval successful!")
                            break
                    else:
                        print("   ❌ All approval attempts failed")
        else:
            print(f"Unexpected response format: {data}")
    else:
        print(f"Failed to get mentors: {response.text}")
    
    # Test mentor login regardless
    print("\n🔐 Testing mentor login...")
    login_response = requests.post(
        f"{BASE_URL}/mentor/login",
        json={"email": "legacymentor0001@placeholder.com", "password": "Mentor@123"},
        timeout=10
    )
    
    print(f"Login Status: {login_response.status_code}")
    print(f"Login Response: {login_response.text}")
    
    if login_response.status_code == 200:
        print("✅ Mentor login successful!")
    else:
        print("❌ Mentor login failed")

if __name__ == "__main__":
    main()