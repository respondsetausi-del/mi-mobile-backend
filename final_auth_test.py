#!/usr/bin/env python3
"""
Final comprehensive authentication test with all working credentials
"""

import requests
import json

BASE_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def test_login(endpoint, email, password, login_type, expected_success=True):
    """Test login with given credentials"""
    try:
        response = requests.post(
            f"{BASE_URL}/{endpoint}",
            json={"email": email, "password": password},
            timeout=10
        )
        
        success = response.status_code == 200 if expected_success else response.status_code != 200
        status = "✅ PASS" if success else "❌ FAIL"
        
        print(f"{status}: {login_type} Login - {email}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   User Type: {data.get('user_type', 'N/A')}")
            if 'user' in data:
                user_info = data['user']
                print(f"   Status: {user_info.get('status', 'N/A')}")
                print(f"   Payment: {user_info.get('payment_status', 'N/A')}")
                print(f"   Requires Payment: {data.get('requires_payment', 'N/A')}")
            elif 'admin' in data:
                admin_info = data['admin']
                print(f"   Role: {admin_info.get('role', 'N/A')}")
            elif 'mentor' in data:
                mentor_info = data['mentor']
                print(f"   Mentor ID: {mentor_info.get('mentor_id', 'N/A')}")
            return data.get("access_token"), True
        else:
            print(f"   Status: {response.status_code}")
            print(f"   Error: {response.text}")
            return None, success
            
    except Exception as e:
        print(f"❌ FAIL: {login_type} Login - {email}")
        print(f"   Exception: {str(e)}")
        return None, False
    
    print()

def test_protected_endpoint(token, endpoint, description):
    """Test a protected endpoint with token"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/{endpoint}", headers=headers, timeout=10)
        
        success = response.status_code == 200
        status = "✅ PASS" if success else "❌ FAIL"
        
        print(f"{status}: {description}")
        if not success:
            print(f"   Status: {response.status_code}")
            print(f"   Error: {response.text}")
        
        return success
        
    except Exception as e:
        print(f"❌ FAIL: {description}")
        print(f"   Exception: {str(e)}")
        return False

def main():
    print("=" * 80)
    print("FINAL COMPREHENSIVE AUTHENTICATION TESTING")
    print("=" * 80)
    print()
    
    results = {
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0,
        "working_credentials": [],
        "failed_credentials": []
    }
    
    # Test all authentication endpoints
    test_cases = [
        # Admin Login
        ("admin/login", "admin@signalmaster.com", "Admin@123", "Admin", True),
        
        # User Logins
        ("auth/login", "user@test.com", "tFSvVGwd8deM", "User (temp password)", True),
        ("auth/login", "user1@test.com", "Test@123", "User1", True),
        ("auth/login", "user2@test.com", "Test@123", "User2", True),
        ("auth/login", "user3@test.com", "Test@123", "User3", True),
        
        # Mentor Login
        ("mentor/login", "legacymentor0001@placeholder.com", "Mentor@123", "Mentor", True),
        
        # Test original failing credentials
        ("auth/login", "user@test.com", "Test@123", "User (original password)", False),
    ]
    
    tokens = {}
    
    print("🔐 AUTHENTICATION TESTS:")
    print("-" * 50)
    
    for endpoint, email, password, login_type, expected_success in test_cases:
        results["total_tests"] += 1
        token, success = test_login(endpoint, email, password, login_type, expected_success)
        
        if success:
            results["passed_tests"] += 1
            if token:
                results["working_credentials"].append(f"{login_type}: {email} / {password}")
                tokens[login_type.lower().split()[0]] = token
        else:
            results["failed_tests"] += 1
            results["failed_credentials"].append(f"{login_type}: {email} / {password}")
    
    # Test protected endpoints
    print("\n🔒 PROTECTED ENDPOINT TESTS:")
    print("-" * 50)
    
    protected_tests = [
        ("admin", "admin/users", "Admin - Get Users"),
        ("admin", "admin/stats", "Admin - Get Stats"),
        ("user", "user/profile", "User - Get Profile"),
        ("user", "user/mentor-info", "User - Get Mentor Info"),
        ("mentor", "mentor/dashboard", "Mentor - Get Dashboard"),
        ("mentor", "mentor/users", "Mentor - Get Users"),
    ]
    
    for token_type, endpoint, description in protected_tests:
        results["total_tests"] += 1
        if token_type in tokens:
            success = test_protected_endpoint(tokens[token_type], endpoint, description)
            if success:
                results["passed_tests"] += 1
            else:
                results["failed_tests"] += 1
        else:
            print(f"❌ FAIL: {description} (No token available)")
            results["failed_tests"] += 1
    
    # Summary
    print("\n" + "=" * 80)
    print("FINAL AUTHENTICATION TEST SUMMARY")
    print("=" * 80)
    
    success_rate = (results["passed_tests"] / results["total_tests"] * 100) if results["total_tests"] > 0 else 0
    
    print(f"Total Tests: {results['total_tests']}")
    print(f"Passed: {results['passed_tests']} ✅")
    print(f"Failed: {results['failed_tests']} ❌")
    print(f"Success Rate: {success_rate:.1f}%")
    
    print("\n✅ WORKING CREDENTIALS:")
    for cred in results["working_credentials"]:
        print(f"   - {cred}")
    
    if results["failed_credentials"]:
        print("\n❌ FAILED CREDENTIALS:")
        for cred in results["failed_credentials"]:
            print(f"   - {cred}")
    
    print("\n" + "=" * 80)
    print("AUTHENTICATION SYSTEM STATUS")
    print("=" * 80)
    
    if results["failed_tests"] == 0:
        print("🎉 ALL AUTHENTICATION TESTS PASSED!")
        print("✅ Authentication system is fully operational")
    elif success_rate >= 80:
        print("⚠️  AUTHENTICATION SYSTEM MOSTLY WORKING")
        print("✅ Core functionality operational with minor issues")
    else:
        print("❌ AUTHENTICATION SYSTEM HAS CRITICAL ISSUES")
        print("🚨 Multiple authentication failures detected")
    
    # Provide working credentials for user
    print("\n📋 WORKING LOGIN CREDENTIALS FOR USER:")
    print("=" * 50)
    print("👨‍💼 ADMIN ACCESS:")
    print("   Email: admin@signalmaster.com")
    print("   Password: Admin@123")
    print()
    print("👤 USER ACCESS:")
    print("   Email: user@test.com")
    print("   Password: tFSvVGwd8deM (temporary - requires password change)")
    print("   OR")
    print("   Email: user1@test.com")
    print("   Password: Test@123")
    print()
    print("👥 MENTOR ACCESS:")
    print("   Email: legacymentor0001@placeholder.com")
    print("   Password: Mentor@123")
    print()
    
    return results

if __name__ == "__main__":
    results = main()
    
    # Save results
    with open('/app/final_auth_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"📄 Detailed results saved to: /app/final_auth_test_results.json")
    
    # Exit with appropriate code
    if results["failed_tests"] == 0:
        exit(0)
    else:
        exit(1)