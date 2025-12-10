#!/usr/bin/env python3
"""
Approve the pending mentor
"""

import requests
import json

BASE_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def main():
    print("🔧 Approving Pending Mentor")
    print("=" * 40)
    
    # Get admin token
    admin_response = requests.post(
        f"{BASE_URL}/admin/login",
        json={"email": "admin@signalmaster.com", "password": "Admin@123"},
        timeout=10
    )
    
    if admin_response.status_code != 200:
        print("❌ Admin login failed")
        return
    
    admin_token = admin_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Get mentors (it returns a list directly)
    mentors_response = requests.get(f"{BASE_URL}/admin/mentors", headers=headers)
    if mentors_response.status_code != 200:
        print(f"❌ Failed to get mentors: {mentors_response.text}")
        return
    
    mentors = mentors_response.json()  # This is a list
    print(f"Found {len(mentors)} mentors")
    
    # Find our test mentor
    test_mentor = None
    for mentor in mentors:
        if mentor.get("email") == "legacymentor0001@placeholder.com":
            test_mentor = mentor
            break
    
    if not test_mentor:
        print("❌ Test mentor not found")
        return
    
    print(f"Found mentor: {test_mentor.get('email')}")
    print(f"Status: {test_mentor.get('status')}")
    print(f"ID: {test_mentor.get('_id')}")
    
    # Try to approve the mentor
    mentor_id = test_mentor.get('_id')
    
    # Try different approval endpoints
    endpoints_to_try = [
        f"/admin/mentors/{mentor_id}/approve",
        f"/admin/mentors/{mentor_id}/activate"
    ]
    
    for endpoint in endpoints_to_try:
        print(f"\n🔧 Trying: {endpoint}")
        approve_response = requests.post(f"{BASE_URL}{endpoint}", headers=headers)
        print(f"Status: {approve_response.status_code}")
        print(f"Response: {approve_response.text}")
        
        if approve_response.status_code == 200:
            print("✅ Approval successful!")
            break
    else:
        print("❌ All approval attempts failed")
        print("Let me try a PUT request to update status directly...")
        
        # Try updating status directly
        update_response = requests.put(
            f"{BASE_URL}/admin/mentors/{mentor_id}",
            json={"status": "active"},
            headers=headers
        )
        print(f"Update Status: {update_response.status_code}")
        print(f"Update Response: {update_response.text}")
    
    # Test mentor login
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
        data = login_response.json()
        print(f"User Type: {data.get('user_type')}")
        print(f"Mentor ID: {data.get('mentor', {}).get('mentor_id')}")
    else:
        print("❌ Mentor login still failing")

if __name__ == "__main__":
    main()