#!/usr/bin/env python3
"""
Keep-Alive Service and Backend Health Check Testing
Tests the critical keep-alive functionality and authentication system
"""

import requests
import json
import time
import sys
import subprocess
from datetime import datetime

# Configuration
BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"
TIMEOUT = 10

class KeepAliveServiceTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.admin_token = None
        self.user_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, response_time=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "response_time": response_time,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        print(f"    {message}")
        print()
        
    def test_health_endpoint(self):
        """Priority 1: Test GET /api/health endpoint"""
        print("🔍 Testing Health Endpoint (Priority 1 - CRITICAL)")
        print("=" * 60)
        
        try:
            start_time = time.time()
            response = self.session.get(f"{BACKEND_URL}/health")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ["status", "message", "timestamp", "database"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "Health Endpoint Response Structure",
                        False,
                        f"Missing required fields: {missing_fields}. Got: {list(data.keys())}",
                        response_time
                    )
                else:
                    # Check response time requirement (< 100ms)
                    if response_time < 0.1:
                        self.log_result(
                            "Health Endpoint Performance",
                            True,
                            f"Response time {response_time:.3f}s < 100ms requirement. Status: {data.get('status')}",
                            response_time
                        )
                    else:
                        self.log_result(
                            "Health Endpoint Performance",
                            False,
                            f"Response time {response_time:.3f}s exceeds 100ms requirement",
                            response_time
                        )
                    
                    self.log_result(
                        "Health Endpoint Structure",
                        True,
                        f"All required fields present: {data}",
                        response_time
                    )
            else:
                self.log_result(
                    "Health Endpoint Status",
                    False,
                    f"Expected 200, got {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_result(
                "Health Endpoint Connection",
                False,
                f"Connection failed: {str(e)}"
            )
    
    def test_admin_authentication(self):
        """Priority 2: Test admin authentication"""
        print("🔐 Testing Admin Authentication (Priority 2 - CRITICAL)")
        print("=" * 60)
        
        try:
            start_time = time.time()
            response = self.session.post(
                f"{BACKEND_URL}/admin/login",
                json={
                    "email": "admin@signalmaster.com",
                    "password": "Admin@123"
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and data.get("user_type") == "admin":
                    self.admin_token = data["access_token"]
                    self.log_result(
                        "Admin Login Success",
                        True,
                        f"Admin login successful. Token received, user_type: {data.get('user_type')}",
                        response_time
                    )
                else:
                    self.log_result(
                        "Admin Login Response",
                        False,
                        f"Invalid response structure: {data}",
                        response_time
                    )
            else:
                self.log_result(
                    "Admin Login Failed",
                    False,
                    f"Status {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_result(
                "Admin Login Connection",
                False,
                f"Connection failed: {str(e)}"
            )
    
    def test_user_authentication(self):
        """Priority 2: Test user authentication with existing paid user"""
        print("👤 Testing User Authentication (Priority 2 - CRITICAL)")
        print("=" * 60)
        
        # First, get a list of users to find a paid one
        if not self.admin_token:
            self.log_result(
                "User Auth Setup",
                False,
                "Admin token required to find paid users"
            )
            return
            
        try:
            # Get users list
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{BACKEND_URL}/admin/users", headers=headers)
            
            if response.status_code == 200:
                users_data = response.json()
                users = users_data.get("users", [])
                
                # Find a paid, active user
                paid_user = None
                for user in users:
                    if (user.get("payment_status") == "paid" and 
                        user.get("status") == "active"):
                        paid_user = user
                        break
                
                if paid_user:
                    # Try to reset password for this user to get a known password
                    user_id = paid_user["_id"]
                    reset_response = self.session.post(
                        f"{BACKEND_URL}/admin/users/{user_id}/reset-password",
                        headers=headers
                    )
                    
                    if reset_response.status_code == 200:
                        reset_data = reset_response.json()
                        temp_password = reset_data.get("temporary_password")
                        user_email = paid_user.get("email")
                        
                        # Now try to login with the temporary password
                        start_time = time.time()
                        login_response = self.session.post(
                            f"{BACKEND_URL}/auth/login",
                            json={
                                "email": user_email,
                                "password": temp_password
                            }
                        )
                        response_time = time.time() - start_time
                        
                        if login_response.status_code == 200:
                            login_data = login_response.json()
                            if "access_token" in login_data and login_data.get("user_type") == "user":
                                self.user_token = login_data["access_token"]
                                self.log_result(
                                    "User Login Success",
                                    True,
                                    f"User login successful for {user_email}. Payment status: {login_data.get('payment_status')}",
                                    response_time
                                )
                            else:
                                self.log_result(
                                    "User Login Response",
                                    False,
                                    f"Invalid response structure: {login_data}",
                                    response_time
                                )
                        else:
                            self.log_result(
                                "User Login Failed",
                                False,
                                f"Status {login_response.status_code}: {login_response.text}",
                                response_time
                            )
                    else:
                        self.log_result(
                            "User Password Reset",
                            False,
                            f"Could not reset user password: {reset_response.status_code}"
                        )
                else:
                    self.log_result(
                        "Find Paid User",
                        False,
                        f"No paid, active users found in {len(users)} total users"
                    )
            else:
                self.log_result(
                    "Get Users List",
                    False,
                    f"Could not get users list: {response.status_code}"
                )
                
        except Exception as e:
            self.log_result(
                "User Authentication",
                False,
                f"Error during user authentication test: {str(e)}"
            )
    
    def test_keep_alive_service(self):
        """Priority 3: Test keep-alive service status"""
        print("🔄 Testing Keep-Alive Service Status (Priority 3 - HIGH)")
        print("=" * 60)
        
        try:
            # Check if keep_alive.sh process is running
            result = subprocess.run(
                ["ps", "aux"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if "keep_alive.sh" in result.stdout:
                self.log_result(
                    "Keep-Alive Process Running",
                    True,
                    "keep_alive.sh process found in process list"
                )
            else:
                self.log_result(
                    "Keep-Alive Process Running",
                    False,
                    "keep_alive.sh process not found in process list"
                )
            
            # Check keep-alive logs
            try:
                with open("/app/keep_alive.log", "r") as f:
                    log_lines = f.readlines()
                    recent_lines = log_lines[-20:] if len(log_lines) >= 20 else log_lines
                    
                    if recent_lines:
                        # Look for successful pings in recent logs
                        successful_pings = [line for line in recent_lines if "200" in line and "health" in line]
                        
                        if successful_pings:
                            self.log_result(
                                "Keep-Alive Logs Success",
                                True,
                                f"Found {len(successful_pings)} successful health pings in recent logs"
                            )
                            
                            # Show sample of recent logs
                            print("    Recent keep-alive log entries:")
                            for line in recent_lines[-5:]:
                                print(f"      {line.strip()}")
                            print()
                        else:
                            self.log_result(
                                "Keep-Alive Logs Success",
                                False,
                                f"No successful health pings found in recent {len(recent_lines)} log lines"
                            )
                    else:
                        self.log_result(
                            "Keep-Alive Logs Exist",
                            False,
                            "Keep-alive log file is empty"
                        )
                        
            except FileNotFoundError:
                self.log_result(
                    "Keep-Alive Logs Exist",
                    False,
                    "Keep-alive log file not found at /app/keep_alive.log"
                )
            except Exception as e:
                self.log_result(
                    "Keep-Alive Logs Read",
                    False,
                    f"Error reading keep-alive logs: {str(e)}"
                )
                
        except Exception as e:
            self.log_result(
                "Keep-Alive Service Check",
                False,
                f"Error checking keep-alive service: {str(e)}"
            )
    
    def test_core_endpoints(self):
        """Priority 4: Test other core endpoints"""
        print("🌐 Testing Core Endpoints (Priority 4 - MEDIUM)")
        print("=" * 60)
        
        # Test quotes endpoint (should work without auth)
        try:
            start_time = time.time()
            response = self.session.get(f"{BACKEND_URL}/quotes")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result(
                        "Quotes Endpoint",
                        True,
                        f"Quotes endpoint returned {len(data)} market quotes",
                        response_time
                    )
                else:
                    self.log_result(
                        "Quotes Endpoint Data",
                        False,
                        f"Quotes endpoint returned invalid data: {data}",
                        response_time
                    )
            else:
                self.log_result(
                    "Quotes Endpoint",
                    False,
                    f"Status {response.status_code}: {response.text}",
                    response_time
                )
        except Exception as e:
            self.log_result(
                "Quotes Endpoint",
                False,
                f"Error testing quotes endpoint: {str(e)}"
            )
        
        # Test protected endpoint with user token
        if self.user_token:
            try:
                headers = {"Authorization": f"Bearer {self.user_token}"}
                start_time = time.time()
                response = self.session.get(f"{BACKEND_URL}/user/profile", headers=headers)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    self.log_result(
                        "Protected Endpoint Access",
                        True,
                        "User can access protected /user/profile endpoint",
                        response_time
                    )
                else:
                    self.log_result(
                        "Protected Endpoint Access",
                        False,
                        f"User cannot access protected endpoint: {response.status_code}",
                        response_time
                    )
            except Exception as e:
                self.log_result(
                    "Protected Endpoint Access",
                    False,
                    f"Error testing protected endpoint: {str(e)}"
                )
        else:
            self.log_result(
                "Protected Endpoint Access",
                False,
                "No user token available to test protected endpoints"
            )
    
    def check_backend_logs_for_health_checks(self):
        """Check backend logs for health check entries"""
        print("📋 Checking Backend Logs for Health Checks")
        print("=" * 60)
        
        try:
            # Check supervisor backend logs
            result = subprocess.run(
                ["tail", "-n", "100", "/var/log/supervisor/backend.out.log"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                log_content = result.stdout
                health_check_lines = [line for line in log_content.split('\n') if 'GET /api/health' in line]
                
                if health_check_lines:
                    self.log_result(
                        "Backend Logs Health Checks",
                        True,
                        f"Found {len(health_check_lines)} health check entries in backend logs"
                    )
                    
                    # Show recent health check entries
                    print("    Recent health check log entries:")
                    for line in health_check_lines[-3:]:
                        print(f"      {line.strip()}")
                    print()
                else:
                    self.log_result(
                        "Backend Logs Health Checks",
                        False,
                        "No health check entries found in backend logs"
                    )
            else:
                self.log_result(
                    "Backend Logs Access",
                    False,
                    f"Could not access backend logs: {result.stderr}"
                )
                
        except Exception as e:
            self.log_result(
                "Backend Logs Check",
                False,
                f"Error checking backend logs: {str(e)}"
            )
    
    def run_all_tests(self):
        """Run all tests in priority order"""
        print("🚀 Starting Keep-Alive Service and Backend Health Check Testing")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print("=" * 80)
        print()
        
        # Priority 1: Health Endpoint (CRITICAL)
        self.test_health_endpoint()
        
        # Priority 2: Authentication Still Works (CRITICAL)
        self.test_admin_authentication()
        self.test_user_authentication()
        
        # Priority 3: Keep-Alive Service Status (HIGH)
        self.test_keep_alive_service()
        self.check_backend_logs_for_health_checks()
        
        # Priority 4: Other Core Endpoints (MEDIUM)
        self.test_core_endpoints()
        
        # Summary
        return self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r["status"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if "✅ PASS" in result["status"]:
                print(f"  - {result['test']}: {result['message']}")
        
        print("=" * 80)
        print(f"Test completed at: {datetime.now().isoformat()}")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = KeepAliveServiceTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)