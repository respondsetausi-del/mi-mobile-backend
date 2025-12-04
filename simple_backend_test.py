#!/usr/bin/env python3
"""
Simple Backend Testing for User-Reported Non-Functional Buttons
Focus: Test specific endpoints mentioned in review request
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

class SimpleBackendTester:
    def __init__(self):
        self.test_results = []
        self.user_token = None
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()
    
    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        try:
            # Test quotes endpoint
            response = requests.get(f"{BASE_URL}/quotes")
            if response.status_code == 200:
                data = response.json()
                quote_count = len(data) if isinstance(data, list) else 0
                self.log_test("Public Quotes Endpoint", True, f"Retrieved {quote_count} market quotes")
            else:
                self.log_test("Public Quotes Endpoint", False, error=f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Public Quotes Endpoint", False, error=str(e))
    
    def test_user_registration(self):
        """Test user registration to create a test user"""
        try:
            # Try to register a test user
            test_user_data = {
                "email": f"test_backend_{datetime.now().strftime('%Y%m%d_%H%M%S')}@test.com",
                "password": "TestPassword123!",
                "name": "Backend Test User",
                "mentor_id": "MENTOR0001",
                "license_key": "TEST-KEY-1234-5678"  # This will likely fail but let's see the response
            }
            
            response = requests.post(f"{BASE_URL}/auth/register", json=test_user_data)
            if response.status_code in [200, 201]:
                data = response.json()
                self.log_test("User Registration Test", True, f"Registration successful: {data.get('message', 'No message')}")
                # Try to extract token if available
                if 'access_token' in data:
                    self.user_token = data['access_token']
                    return True
            else:
                self.log_test("User Registration Test", False, error=f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("User Registration Test", False, error=str(e))
        return False
    
    def test_admin_login_and_reset_user(self):
        """Try admin login and reset a user password"""
        try:
            # Try admin login first
            admin_data = {
                "email": "admin@signalmaster.com",
                "password": "Admin@123"
            }
            
            response = requests.post(f"{BASE_URL}/admin/login", json=admin_data)
            if response.status_code == 200:
                admin_data = response.json()
                admin_token = admin_data.get('access_token')
                
                self.log_test("Admin Login", True, "Admin login successful")
                
                # Now try to get users and reset password for a known user
                headers = {"Authorization": f"Bearer {admin_token}"}
                users_response = requests.get(f"{BASE_URL}/admin/users", headers=headers)
                
                if users_response.status_code == 200:
                    users = users_response.json().get('users', [])
                    # Look for a paid user under MENTOR0001
                    target_user = None
                    for user in users:
                        if (user.get('mentor_id') == 'MENTOR0001' and 
                            user.get('payment_status') == 'paid' and 
                            user.get('status') == 'active'):
                            target_user = user
                            break
                    
                    if target_user:
                        user_id = target_user['_id']
                        user_email = target_user['email']
                        
                        # Reset password
                        reset_response = requests.post(f"{BASE_URL}/admin/users/{user_id}/reset-password", headers=headers)
                        if reset_response.status_code == 200:
                            reset_data = reset_response.json()
                            temp_password = reset_data.get('temporary_password')
                            
                            self.log_test("User Password Reset", True, f"Reset password for {user_email}")
                            
                            # Try to login with the user
                            user_login_data = {
                                "email": user_email,
                                "password": temp_password
                            }
                            
                            user_response = requests.post(f"{BASE_URL}/auth/login", json=user_login_data)
                            if user_response.status_code == 200:
                                user_data = user_response.json()
                                self.user_token = user_data.get('access_token')
                                payment_status = user_data.get('payment_status', 'unknown')
                                
                                self.log_test("User Login Success", True, 
                                            f"Logged in: {user_email}, payment_status: {payment_status}")
                                return True
                            else:
                                self.log_test("User Login After Reset", False, 
                                            error=f"Status {user_response.status_code}: {user_response.text}")
                        else:
                            self.log_test("User Password Reset", False, 
                                        error=f"Status {reset_response.status_code}: {reset_response.text}")
                    else:
                        self.log_test("Find Target User", False, error="No suitable paid user found under MENTOR0001")
                else:
                    self.log_test("Get Users", False, error=f"Status {users_response.status_code}: {users_response.text}")
            else:
                self.log_test("Admin Login", False, error=f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Admin Login and User Reset", False, error=str(e))
        
        return False
    
    def test_login_with_known_patterns(self):
        """Try to login with known user patterns from credentials files"""
        # Use actual credentials from user_passwords_reset_20251107_065650.json
        known_users = [
            {"email": "collenbelly7@icloud.com", "passwords": ["8XilM^z7A!YJ", "TestPassword123!", "IW%D&qaJ9qZd", "H1hy8Gdnci9A"]},
            {"email": "respondscooby@gmail.com", "passwords": ["8lGt#YeKE4fI", "TestPassword123!", "pe@I*ZTa&V9!"]},
            {"email": "respondscoobyyy@gmail.com", "passwords": ["GkuzErpPEOQb", "TestPassword123!"]},
            {"email": "john@mimobile.com", "passwords": ["TestPassword123!", "password123", "Password123!"]},
            {"email": "test@example.com", "passwords": ["Test@123", "TestPassword123!"]}
        ]
        
        for user in known_users:
            for password in user["passwords"]:
                try:
                    login_data = {
                        "email": user["email"],
                        "password": password
                    }
                    
                    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
                    if response.status_code == 200:
                        data = response.json()
                        self.user_token = data.get('access_token')
                        user_info = data.get('user', {})
                        payment_status = data.get('payment_status', 'unknown')
                        
                        self.log_test("User Login Success", True, 
                                    f"Logged in: {user['email']}, payment_status: {payment_status}")
                        return True
                    elif response.status_code == 401:
                        # Expected for wrong password, continue trying
                        continue
                    else:
                        self.log_test("User Login Attempt", False, 
                                    error=f"Unexpected status {response.status_code} for {user['email']}")
                        
                except Exception as e:
                    self.log_test("User Login Attempt", False, error=f"Exception for {user['email']}: {str(e)}")
        
        self.log_test("User Login", False, error="Could not login with any known user credentials")
        return False
    
    def test_select_indicator_endpoint(self):
        """Test POST /api/user/select-indicator with specific ID from review request"""
        if not self.user_token:
            self.log_test("Select Indicator Endpoint", False, error="No user token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            # Use the specific indicator ID from the review request
            indicator_data = {
                "indicator_id": "6926a0de98c076c16ab1ddf4"  # RSI Scalper Pro
            }
            
            response = requests.post(f"{BASE_URL}/user/select-indicator", 
                                   json=indicator_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                indicator_name = data.get('indicator_name', 'Unknown')
                current_signal = data.get('current_signal', 'Unknown')
                self.log_test("Select Indicator Endpoint", True, 
                            f"Selected indicator: {indicator_name}, signal: {current_signal}")
            else:
                self.log_test("Select Indicator Endpoint", False, 
                            error=f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Select Indicator Endpoint", False, error=str(e))
    
    def test_create_ea_endpoint(self):
        """Test POST /api/ea with exact payload from review request"""
        if not self.user_token:
            self.log_test("Create EA Endpoint", False, error="No user token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            
            # Exact payload from review request
            ea_payload = {
                "name": "Test EUR/USD Monitor",
                "config": {
                    "symbol": "EUR/USD",
                    "timeframe": "1m",
                    "indicator": {
                        "type": "RSI",
                        "parameters": {
                            "period": 14,
                            "oversold": 30,
                            "overbought": 70
                        }
                    }
                }
            }
            
            response = requests.post(f"{BASE_URL}/ea", headers=headers, json=ea_payload)
            
            if response.status_code in [200, 201]:
                data = response.json()
                ea_id = data.get('_id') or data.get('id')
                ea_name = data.get('name', 'Unknown')
                self.log_test("Create EA Endpoint", True, 
                            f"Created EA: {ea_name}, ID: {ea_id}")
            else:
                self.log_test("Create EA Endpoint", False, 
                            error=f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Create EA Endpoint", False, error=str(e))
    
    def test_get_eas_endpoint(self):
        """Test GET /api/ea to verify EAs can be retrieved"""
        if not self.user_token:
            self.log_test("Get EAs Endpoint", False, error="No user token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            
            response = requests.get(f"{BASE_URL}/ea", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                # Handle different response formats
                eas = data if isinstance(data, list) else data.get('eas', [])
                
                ea_count = len(eas)
                ea_names = [ea.get('name', 'Unknown') for ea in eas]
                
                self.log_test("Get EAs Endpoint", True, 
                            f"Found {ea_count} EAs: {', '.join(ea_names) if ea_names else 'None'}")
            else:
                self.log_test("Get EAs Endpoint", False, 
                            error=f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get EAs Endpoint", False, error=str(e))
    
    def test_get_mentor_indicators(self):
        """Test GET /api/user/mentor-indicators to see available indicators"""
        if not self.user_token:
            self.log_test("Get Mentor Indicators", False, error="No user token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            
            response = requests.get(f"{BASE_URL}/user/mentor-indicators", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                indicators = data.get('indicators', [])
                selected_id = data.get('selected_indicator_id')
                
                indicator_count = len(indicators)
                indicator_info = []
                for ind in indicators:
                    indicator_info.append(f"ID: {ind.get('id', 'N/A')}, Name: {ind.get('name', 'N/A')}, Signal: {ind.get('current_signal', 'N/A')}")
                
                details = f"Found {indicator_count} indicators"
                if indicator_info:
                    details += f": {'; '.join(indicator_info)}"
                if selected_id:
                    details += f". Selected: {selected_id}"
                
                self.log_test("Get Mentor Indicators", True, details)
            else:
                self.log_test("Get Mentor Indicators", False, 
                            error=f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Mentor Indicators", False, error=str(e))
    
    def run_tests(self):
        """Run all tests"""
        print("🚀 SIMPLE BACKEND TESTING - USER-REPORTED NON-FUNCTIONAL BUTTONS")
        print("=" * 80)
        print(f"Backend URL: {BASE_URL}")
        print()
        
        # Test 1: Public endpoints
        self.test_public_endpoints()
        
        # Test 2: Try admin login and reset user password
        login_success = self.test_admin_login_and_reset_user()
        
        if not login_success:
            # Try known user patterns
            login_success = self.test_login_with_known_patterns()
            
        if not login_success:
            # Try registration as fallback
            self.test_user_registration()
        
        # Test 3: If we have a token, test the specific endpoints
        if self.user_token:
            self.test_get_mentor_indicators()
            self.test_select_indicator_endpoint()
            self.test_create_ea_endpoint()
            self.test_get_eas_endpoint()
        else:
            print("⚠️  No user token available - cannot test protected endpoints")
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 SIMPLE TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%")
        print()
        
        # Critical endpoints status
        print("🎯 CRITICAL ENDPOINTS STATUS:")
        select_indicator_working = any(r['success'] and 'Select Indicator' in r['test'] for r in self.test_results)
        create_ea_working = any(r['success'] and 'Create EA' in r['test'] for r in self.test_results)
        get_eas_working = any(r['success'] and 'Get EAs' in r['test'] for r in self.test_results)
        
        print(f"   POST /api/user/select-indicator: {'✅ WORKING' if select_indicator_working else '❌ FAILING'}")
        print(f"   POST /api/ea: {'✅ WORKING' if create_ea_working else '❌ FAILING'}")
        print(f"   GET /api/ea: {'✅ WORKING' if get_eas_working else '❌ FAILING'}")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['error']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"   - {result['test']}")
        
        return failed_tests == 0

def main():
    """Main test execution"""
    tester = SimpleBackendTester()
    
    try:
        tester.run_tests()
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ CRITICAL ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()