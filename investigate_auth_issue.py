#!/usr/bin/env python3
"""
Investigate Authentication Issues
Try different approaches to understand the root cause
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def test_license_key_reset():
    """Try password reset with license key to see if users exist"""
    print("🔍 Testing License Key Password Reset...")
    
    # Try different combinations
    test_cases = [
        {"email": "user@test.com", "license_key": "TEST-KEY", "new_password": "NewPassword123!"},
        {"email": "admin@signalmaster.com", "license_key": "ADMIN-KEY", "new_password": "NewPassword123!"},
        {"email": "legacymentor0001@placeholder.com", "license_key": "MENTOR-KEY", "new_password": "NewPassword123!"},
    ]
    
    for case in test_cases:
        try:
            response = requests.post(
                f"{BASE_URL}/auth/reset-password-license-only",
                json=case,
                timeout=10
            )
            
            print(f"Email: {case['email']}")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            print("-" * 40)
            
        except Exception as e:
            print(f"Error testing {case['email']}: {str(e)}")

def test_simple_password_reset():
    """Try simple password reset"""
    print("🔍 Testing Simple Password Reset...")
    
    emails = ["user@test.com", "admin@signalmaster.com", "legacymentor0001@placeholder.com"]
    
    for email in emails:
        try:
            response = requests.post(
                f"{BASE_URL}/auth/forgot-password",
                json={"email": email},
                timeout=10
            )
            
            print(f"Email: {email}")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            print("-" * 40)
            
        except Exception as e:
            print(f"Error testing {email}: {str(e)}")

def test_mentor_forgot_password():
    """Try mentor forgot password"""
    print("🔍 Testing Mentor Forgot Password...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/mentor/forgot-password",
            json={"email": "legacymentor0001@placeholder.com"},
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"Error: {str(e)}")

def test_backend_health():
    """Test if backend is responding"""
    print("🔍 Testing Backend Health...")
    
    try:
        # Try a simple endpoint that doesn't require auth
        response = requests.get(f"{BASE_URL}/quotes", timeout=10)
        print(f"Quotes endpoint - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Quotes count: {len(data) if isinstance(data, list) else 'N/A'}")
        else:
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"Backend health check failed: {str(e)}")

def main():
    print("=" * 60)
    print("AUTHENTICATION ISSUE INVESTIGATION")
    print("=" * 60)
    
    test_backend_health()
    print()
    
    test_simple_password_reset()
    print()
    
    test_license_key_reset()
    print()
    
    test_mentor_forgot_password()
    print()

if __name__ == "__main__":
    main()