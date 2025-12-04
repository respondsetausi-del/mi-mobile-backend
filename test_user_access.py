#!/usr/bin/env python3
"""Test if users with unpaid status are properly blocked"""

import requests

BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

# Test users
test_users = [
    {"email": "collenbelly7@icloud.com", "name": "Belly"},
    {"email": "respondscoobyyy@gmail.com", "name": "respond"}
]

print("="*80)
print("TESTING USER ACCESS FOR UNPAID USERS")
print("="*80)

for user in test_users:
    email = user["email"]
    print(f"\n\nTesting user: {email}")
    print("-"*80)
    
    # We need to reset password first to test login
    # Login as admin first
    admin_response = requests.post(
        f"{BACKEND_URL}/admin/login",
        json={"email": "admin@signalmaster.com", "password": "Admin@123"},
        timeout=10
    )
    
    if admin_response.status_code != 200:
        print(f"❌ Admin login failed")
        continue
    
    admin_token = admin_response.json()["access_token"]
    
    # Get user ID
    users_response = requests.get(
        f"{BACKEND_URL}/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10
    )
    
    users = users_response.json()["users"]
    user_data = next((u for u in users if u["email"] == email), None)
    
    if not user_data:
        print(f"❌ User not found")
        continue
    
    user_id = user_data["_id"]
    status = user_data.get("status")
    payment_status = user_data.get("payment_status")
    
    print(f"User ID: {user_id}")
    print(f"Status: {status}")
    print(f"Payment Status: {payment_status}")
    
    # Reset password
    reset_response = requests.post(
        f"{BACKEND_URL}/admin/users/{user_id}/reset-password",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10
    )
    
    if reset_response.status_code != 200:
        print(f"❌ Password reset failed")
        continue
    
    temp_password = reset_response.json()["temporary_password"]
    print(f"Temporary password: {temp_password}")
    
    # Try to login
    login_response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={"email": email, "password": temp_password},
        timeout=10
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        continue
    
    user_token = login_response.json()["access_token"]
    print(f"✅ Login successful")
    
    # Try to access protected route
    profile_response = requests.get(
        f"{BACKEND_URL}/user/profile",
        headers={"Authorization": f"Bearer {user_token}"},
        timeout=10
    )
    
    print(f"\nAccessing /user/profile:")
    print(f"Status Code: {profile_response.status_code}")
    
    if profile_response.status_code == 200:
        print(f"✅ USER HAS ACCESS (This is the problem!)")
        print(f"Response: {profile_response.json()}")
    elif profile_response.status_code == 403:
        print(f"✅ USER PROPERLY BLOCKED")
        print(f"Response: {profile_response.text}")
    else:
        print(f"⚠️  Unexpected response")
        print(f"Response: {profile_response.text}")

print("\n" + "="*80)
print("TEST COMPLETE")
print("="*80)
