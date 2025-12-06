#!/usr/bin/env python3
"""
Backend API Testing Suite for MI Mobile Indicator
Focus: Stripe Payment Gateway Fix Verification
"""

import requests
import json
import sys
import os
from datetime import datetime

# Configuration
BACKEND_URL = "https://mi-mobile-forex.preview.emergentagent.com/api"

class AuthenticationTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, details):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
        
    def test_user_login(self, email, password, expected_success=True):
        """Test user login endpoint"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={"email": email, "password": password},
                timeout=10
            )
            
            if expected_success:
                if response.status_code == 200:
                    data = response.json()
                    if "access_token" in data:
                        self.log_result(
                            f"User Login: {email}",
                            True,
                            f"Login successful. User type: {data.get('user_type', 'N/A')}, Status: {data.get('status', 'N/A')}, Payment: {data.get('payment_status', 'N/A')}"
                        )
                        return data.get("access_token")
                    else:
                        self.log_result(
                            f"User Login: {email}",
                            False,
                            f"Login response missing access_token: {data}"
                        )
                else:
                    self.log_result(
                        f"User Login: {email}",
                        False,
                        f"HTTP {response.status_code}: {response.text}"
                    )
            else:
                # Expected to fail
                if response.status_code != 200:
                    self.log_result(
                        f"User Login: {email} (Expected Failure)",
                        True,
                        f"Correctly failed with HTTP {response.status_code}: {response.text}"
                    )
                else:
                    self.log_result(
                        f"User Login: {email} (Expected Failure)",
                        False,
                        f"Login unexpectedly succeeded: {response.json()}"
                    )
                    
        except Exception as e:
            self.log_result(
                f"User Login: {email}",
                False,
                f"Exception: {str(e)}"
            )
        return None
        
    def test_admin_login(self, email, password):
        """Test admin login endpoint"""
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/login",
                json={"email": email, "password": password},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.admin_token = data["access_token"]
                    self.log_result(
                        f"Admin Login: {email}",
                        True,
                        f"Login successful. User type: {data.get('user_type', 'N/A')}"
                    )
                    return data["access_token"]
                else:
                    self.log_result(
                        f"Admin Login: {email}",
                        False,
                        f"Login response missing access_token: {data}"
                    )
            else:
                self.log_result(
                    f"Admin Login: {email}",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_result(
                f"Admin Login: {email}",
                False,
                f"Exception: {str(e)}"
            )
        return None
        
    def test_mentor_login(self, email, password):
        """Test mentor login endpoint"""
        try:
            response = self.session.post(
                f"{BASE_URL}/mentor/login",
                json={"email": email, "password": password},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.log_result(
                        f"Mentor Login: {email}",
                        True,
                        f"Login successful. User type: {data.get('user_type', 'N/A')}, Mentor ID: {data.get('mentor', {}).get('mentor_id', 'N/A')}"
                    )
                    return data["access_token"]
                else:
                    self.log_result(
                        f"Mentor Login: {email}",
                        False,
                        f"Login response missing access_token: {data}"
                    )
            else:
                self.log_result(
                    f"Mentor Login: {email}",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_result(
                f"Mentor Login: {email}",
                False,
                f"Exception: {str(e)}"
            )
        return None
        
    def test_password_reset_with_license(self, email, license_key, new_password):
        """Test password reset using license key"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/reset-password-license-only",
                json={
                    "email": email,
                    "license_key": license_key,
                    "new_password": new_password
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result(
                        f"Password Reset: {email}",
                        True,
                        f"Password reset successful. Can now login with new password."
                    )
                    return True
                else:
                    self.log_result(
                        f"Password Reset: {email}",
                        False,
                        f"Password reset failed: {data.get('message', 'Unknown error')}"
                    )
            else:
                self.log_result(
                    f"Password Reset: {email}",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_result(
                f"Password Reset: {email}",
                False,
                f"Exception: {str(e)}"
            )
        return False
        
    def create_test_user(self, email, password, name, license_key, mentor_id):
        """Create a test user"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json={
                    "email": email,
                    "password": password,
                    "name": name,
                    "license_key": license_key,
                    "mentor_id": mentor_id
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    f"Create Test User: {email}",
                    True,
                    f"User created successfully. Status: {data.get('status', 'N/A')}"
                )
                return True
            else:
                self.log_result(
                    f"Create Test User: {email}",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_result(
                f"Create Test User: {email}",
                False,
                f"Exception: {str(e)}"
            )
        return False
        
    def get_admin_users(self):
        """Get all users via admin endpoint"""
        if not self.admin_token:
            self.log_result(
                "Get Admin Users",
                False,
                "No admin token available"
            )
            return []
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(
                f"{BASE_URL}/admin/users",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                users = data.get("users", [])
                self.log_result(
                    "Get Admin Users",
                    True,
                    f"Retrieved {len(users)} users from database"
                )
                return users
            else:
                self.log_result(
                    "Get Admin Users",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_result(
                "Get Admin Users",
                False,
                f"Exception: {str(e)}"
            )
        return []
        
    def get_admin_mentors(self):
        """Get all mentors via admin endpoint"""
        if not self.admin_token:
            self.log_result(
                "Get Admin Mentors",
                False,
                "No admin token available"
            )
            return []
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(
                f"{BASE_URL}/admin/mentors",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                mentors = data.get("mentors", [])
                self.log_result(
                    "Get Admin Mentors",
                    True,
                    f"Retrieved {len(mentors)} mentors from database"
                )
                return mentors
            else:
                self.log_result(
                    "Get Admin Mentors",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_result(
                "Get Admin Mentors",
                False,
                f"Exception: {str(e)}"
            )
        return []
        
    def admin_reset_user_password(self, user_id):
        """Reset user password via admin endpoint"""
        if not self.admin_token:
            return None
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.post(
                f"{BASE_URL}/admin/users/{user_id}/reset-password",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                temp_password = data.get("temporary_password")
                self.log_result(
                    f"Admin Reset Password: {user_id}",
                    True,
                    f"Temporary password generated: {temp_password}"
                )
                return temp_password
            else:
                self.log_result(
                    f"Admin Reset Password: {user_id}",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_result(
                f"Admin Reset Password: {user_id}",
                False,
                f"Exception: {str(e)}"
            )
        return None
        
    def admin_reset_mentor_password(self, mentor_id):
        """Reset mentor password via admin endpoint"""
        if not self.admin_token:
            return None
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.post(
                f"{BASE_URL}/admin/mentors/{mentor_id}/reset-password",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                temp_password = data.get("temporary_password")
                self.log_result(
                    f"Admin Reset Mentor Password: {mentor_id}",
                    True,
                    f"Temporary password generated: {temp_password}"
                )
                return temp_password
            else:
                self.log_result(
                    f"Admin Reset Mentor Password: {mentor_id}",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_result(
                f"Admin Reset Mentor Password: {mentor_id}",
                False,
                f"Exception: {str(e)}"
            )
        return None
        
    def run_comprehensive_auth_tests(self):
        """Run all authentication tests as requested in review"""
        print("=" * 80)
        print("COMPREHENSIVE AUTHENTICATION TESTING")
        print("=" * 80)
        print()
        
        # Test 1: Try admin login first to get admin access
        print("🔐 STEP 1: Testing Admin Login")
        print("-" * 40)
        admin_token = self.test_admin_login("admin@signalmaster.com", "Admin@123")
        
        # Test 2: Test user login with provided credentials
        print("🔐 STEP 2: Testing User Login Credentials")
        print("-" * 40)
        self.test_user_login("user@test.com", "Test@123")
        self.test_user_login("admin@signalmaster.com", "Admin@123")  # Try admin creds on user endpoint
        
        # Test 3: Test mentor login
        print("🔐 STEP 3: Testing Mentor Login")
        print("-" * 40)
        self.test_mentor_login("legacymentor0001@placeholder.com", "Mentor@123")
        
        # Test 4: Database investigation if we have admin access
        if admin_token:
            print("🔍 STEP 4: Database Investigation")
            print("-" * 40)
            
            # Get all users
            users = self.get_admin_users()
            if users:
                print(f"Found {len(users)} users in database:")
                for user in users[:10]:  # Show first 10 users
                    print(f"  - Email: {user.get('email', 'N/A')}")
                    print(f"    Status: {user.get('status', 'N/A')}")
                    print(f"    Payment: {user.get('payment_status', 'N/A')}")
                    print(f"    Mentor ID: {user.get('mentor_id', 'N/A')}")
                    print(f"    Has password_hash: {bool(user.get('password_hash'))}")
                    print()
            
            # Get all mentors
            mentors = self.get_admin_mentors()
            if mentors:
                print(f"Found {len(mentors)} mentors in database:")
                for mentor in mentors[:5]:  # Show first 5 mentors
                    print(f"  - Email: {mentor.get('email', 'N/A')}")
                    print(f"    Mentor ID: {mentor.get('mentor_id', 'N/A')}")
                    print(f"    Status: {mentor.get('status', 'N/A')}")
                    print(f"    Has password_hash: {bool(mentor.get('password_hash'))}")
                    print()
        
        # Test 5: Try password reset for known users
        print("🔑 STEP 5: Testing Password Reset")
        print("-" * 40)
        
        # Try to reset passwords for users we found
        if admin_token and users:
            # Find a test user to reset password for
            test_user = None
            for user in users:
                if user.get('email') and '@' in user.get('email', ''):
                    test_user = user
                    break
                    
            if test_user:
                temp_password = self.admin_reset_user_password(test_user['_id'])
                if temp_password:
                    # Test login with temporary password
                    self.test_user_login(test_user['email'], temp_password)
        
        # Test 6: Try to create a fresh test user (if we can find a license key)
        print("👤 STEP 6: Testing Fresh User Creation")
        print("-" * 40)
        
        # Try to create a test user with a simple license key
        test_license_keys = ["TEST-KEY-2024", "DEMO-LICENSE", "TEST-1234-5678"]
        for license_key in test_license_keys:
            if self.create_test_user(
                "test_auth_user@test.com",
                "TestPassword123!",
                "Test Auth User",
                license_key,
                "MENTOR0001"
            ):
                # Try to login with the new user
                self.test_user_login("test_auth_user@test.com", "TestPassword123!")
                break
        
        # Summary
        print("=" * 80)
        print("AUTHENTICATION TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        # Show failed tests
        failed_results = [r for r in self.test_results if not r['success']]
        if failed_results:
            print("FAILED TESTS:")
            for result in failed_results:
                print(f"❌ {result['test']}: {result['details']}")
        
        # Show working credentials
        working_creds = [r for r in self.test_results if r['success'] and 'Login:' in r['test']]
        if working_creds:
            print("\nWORKING CREDENTIALS:")
            for result in working_creds:
                print(f"✅ {result['test']}")
        
        return {
            'total': total_tests,
            'passed': passed_tests,
            'failed': failed_tests,
            'success_rate': passed_tests/total_tests*100 if total_tests > 0 else 0,
            'results': self.test_results
        }

def main():
    """Main function to run authentication tests"""
    tester = AuthenticationTester()
    
    try:
        results = tester.run_comprehensive_auth_tests()
        
        # Save results to file
        with open('/app/auth_test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\nTest results saved to: /app/auth_test_results.json")
        
        # Exit with appropriate code
        if results['failed'] > 0:
            print("\n⚠️  AUTHENTICATION ISSUES DETECTED - Some tests failed")
            sys.exit(1)
        else:
            print("\n✅ ALL AUTHENTICATION TESTS PASSED")
            sys.exit(0)
            
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()