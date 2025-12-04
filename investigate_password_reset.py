#!/usr/bin/env python3
"""
URGENT INVESTIGATION: Password reset failure for respondscooby@gmail.com
"""

import requests
import json

BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@signalmaster.com"
ADMIN_PASSWORD = "Admin@123"
USER_EMAIL = "respondscooby@gmail.com"
USER_LICENSE_KEY = "J60O-13V9-8HX7-4ZWL"

def print_section(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

# Step 1: Admin login
print_section("STEP 1: Admin Login")
admin_resp = requests.post(f"{BACKEND_URL}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
if admin_resp.status_code == 200:
    admin_token = admin_resp.json()["access_token"]
    print(f"✅ Admin login successful")
else:
    print(f"❌ Admin login failed: {admin_resp.status_code}")
    exit(1)

# Step 2: Check user in database
print_section("STEP 2: Check User in Database")
headers = {"Authorization": f"Bearer {admin_token}"}
users_resp = requests.get(f"{BACKEND_URL}/admin/users", headers=headers)
if users_resp.status_code == 200:
    users = users_resp.json().get("users", [])
    user = None
    for u in users:
        if u.get("email", "").lower() == USER_EMAIL.lower():
            user = u
            break
    
    if user:
        print(f"✅ User found in database")
        print(f"\n    USER DETAILS:")
        print(f"    - ID: {user.get('_id')}")
        print(f"    - Email: {user.get('email')}")
        print(f"    - Name: {user.get('name')}")
        print(f"    - License Key: {user.get('license_key')}")
        print(f"    - Status: {user.get('status')}")
        print(f"    - Payment Status: {user.get('payment_status')}")
        print(f"    - Mentor ID: {user.get('mentor_id')}")
        
        db_license = user.get('license_key', '')
        print(f"\n    LICENSE KEY COMPARISON:")
        print(f"    - User provided: '{USER_LICENSE_KEY}'")
        print(f"    - Database value: '{db_license}'")
        print(f"    - Match (exact): {db_license == USER_LICENSE_KEY}")
        print(f"    - Match (uppercase): {db_license.upper() == USER_LICENSE_KEY.upper()}")
    else:
        print(f"❌ User NOT found in users collection")
        user = None
else:
    print(f"❌ Failed to get users: {users_resp.status_code}")
    user = None

# Step 3: Check mentors collection
print_section("STEP 3: Check Mentors Collection")
mentors_resp = requests.get(f"{BACKEND_URL}/admin/mentors", headers=headers)
if mentors_resp.status_code == 200:
    mentors = mentors_resp.json()
    mentor = None
    for m in mentors:
        email = m.get("email")
        if email and email.lower() == USER_EMAIL.lower():
            mentor = m
            break
    
    if mentor:
        print(f"✅ User found in MENTORS collection")
        print(f"\n    MENTOR DETAILS:")
        print(f"    - ID: {mentor.get('_id')}")
        print(f"    - Email: {mentor.get('email')}")
        print(f"    - Name: {mentor.get('name')}")
        print(f"    - License Key: {mentor.get('license_key')}")
        print(f"    - Mentor ID: {mentor.get('mentor_id')}")
        print(f"    - Status: {mentor.get('status')}")
    else:
        print(f"❌ User NOT found in mentors collection")
        mentor = None
else:
    print(f"❌ Failed to get mentors: {mentors_resp.status_code}")
    mentor = None

# Step 4: Test password reset with exact credentials
print_section("STEP 4: Test Password Reset - Exact Credentials")
reset_resp = requests.post(
    f"{BACKEND_URL}/auth/reset-password-license-only",
    json={
        "email": USER_EMAIL,
        "license_key": USER_LICENSE_KEY,
        "new_password": "TestPassword123!"
    }
)
print(f"Status Code: {reset_resp.status_code}")
print(f"Response: {reset_resp.text}")

# Step 5: Test with lowercase license key
print_section("STEP 5: Test Password Reset - Lowercase License Key")
reset_resp2 = requests.post(
    f"{BACKEND_URL}/auth/reset-password-license-only",
    json={
        "email": USER_EMAIL,
        "license_key": USER_LICENSE_KEY.lower(),
        "new_password": "TestPassword123!"
    }
)
print(f"Status Code: {reset_resp2.status_code}")
print(f"Response: {reset_resp2.text}")

# Step 6: Test with uppercase email
print_section("STEP 6: Test Password Reset - Uppercase Email")
reset_resp3 = requests.post(
    f"{BACKEND_URL}/auth/reset-password-license-only",
    json={
        "email": USER_EMAIL.upper(),
        "license_key": USER_LICENSE_KEY,
        "new_password": "TestPassword123!"
    }
)
print(f"Status Code: {reset_resp3.status_code}")
print(f"Response: {reset_resp3.text}")

# ROOT CAUSE ANALYSIS
print_section("ROOT CAUSE ANALYSIS")
if user:
    db_license = user.get('license_key', '')
    if db_license == USER_LICENSE_KEY:
        print("✅ User exists and license key matches EXACTLY")
        print("   The endpoint SHOULD work - investigating backend logic...")
    elif db_license.upper() == USER_LICENSE_KEY.upper():
        print("⚠️  User exists but license key case doesn't match")
        print(f"   Database: '{db_license}'")
        print(f"   User provided: '{USER_LICENSE_KEY}'")
        print("   Backend converts to uppercase, so this should still work")
    else:
        print("❌ User exists but license key DOES NOT MATCH")
        print(f"   Database: '{db_license}'")
        print(f"   User provided: '{USER_LICENSE_KEY}'")
        print("   THIS IS WHY THE PASSWORD RESET IS FAILING!")
        print(f"\n   SOLUTION: User should use license key: '{db_license}'")
elif mentor:
    db_license = mentor.get('license_key', '')
    print("⚠️  Email found in MENTORS collection, not USERS")
    if db_license != USER_LICENSE_KEY:
        print(f"   License key doesn't match: DB='{db_license}' vs Provided='{USER_LICENSE_KEY}'")
        print(f"\n   SOLUTION: User should use license key: '{db_license}'")
else:
    print("❌ Email not found in either users or mentors collection")
    print("   User may have been deleted or email is incorrect")

print("\n" + "="*80)
print("  INVESTIGATION COMPLETE")
print("="*80 + "\n")
