#!/usr/bin/env python3
"""Test if PAID user has proper access"""

import requests

BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

email = "respondscooby@gmail.com"

print("="*80)
print(f"TESTING PAID USER ACCESS: {email}")
print("="*80)

# Login as admin first to reset password
admin_response = requests.post(
    f"{BACKEND_URL}/admin/login",
    json={"email": "admin@signalmaster.com", "password": "Admin@123"},
    timeout=10
)

if admin_response.status_code != 200:
    print(f"❌ Admin login failed")
    exit(1)

admin_token = admin_response.json()["access_token"]

# Get user details
users_response = requests.get(
    f"{BACKEND_URL}/admin/users",
    headers={"Authorization": f"Bearer {admin_token}"},
    timeout=10
)

users = users_response.json()["users"]
user_data = next((u for u in users if u["email"] == email), None)

if not user_data:
    print(f"❌ User not found")
    exit(1)

user_id = user_data["_id"]
status = user_data.get("status")
payment_status = user_data.get("payment_status")
payment_date = user_data.get("payment_date")

print(f"\nUser Details:")
print(f"  Email: {email}")
print(f"  User ID: {user_id}")
print(f"  Status: {status}")
print(f"  Payment Status: {payment_status}")
print(f"  Payment Date: {payment_date}")

# Reset password to test login
reset_response = requests.post(
    f"{BACKEND_URL}/admin/users/{user_id}/reset-password",
    headers={"Authorization": f"Bearer {admin_token}"},
    timeout=10
)

if reset_response.status_code != 200:
    print(f"❌ Password reset failed")
    exit(1)

temp_password = reset_response.json()["temporary_password"]
print(f"\nTemporary password: {temp_password}")

# Try to login
print(f"\nAttempting login...")
login_response = requests.post(
    f"{BACKEND_URL}/auth/login",
    json={"email": email, "password": temp_password},
    timeout=10
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(f"Response: {login_response.text}")
    exit(1)

login_data = login_response.json()
user_token = login_data["access_token"]
requires_payment = login_data.get("requires_payment")

print(f"✅ Login successful")
print(f"  Requires Payment: {requires_payment}")

# Try to access protected routes
print(f"\n{'='*80}")
print("TESTING PROTECTED ROUTE ACCESS")
print(f"{'='*80}")

routes = [
    "/user/profile",
    "/user/payment-status",
    "/user/mentor-info"
]

for route in routes:
    print(f"\nTesting: {route}")
    response = requests.get(
        f"{BACKEND_URL}{route}",
        headers={"Authorization": f"Bearer {user_token}"},
        timeout=10
    )
    
    print(f"  Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print(f"  ✅ ACCESS GRANTED")
        print(f"  Response: {response.json()}")
    elif response.status_code == 403:
        print(f"  ❌ ACCESS DENIED (This is the problem!)")
        print(f"  Response: {response.text}")
    else:
        print(f"  ⚠️  Unexpected response")
        print(f"  Response: {response.text}")

print(f"\n{'='*80}")
print("TEST COMPLETE")
print(f"{'='*80}")
