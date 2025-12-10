#!/usr/bin/env python3
"""
Direct Testing for ADD TO SIGNALS BUTTON
Creates test user directly and tests select-indicator endpoint
"""

import requests
import json
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import asyncio
import os
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

# Configuration
BASE_URL = "https://mi-indicator-live.preview.emergentagent.com/api"
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
TEST_USER_EMAIL = "john@mimobile.com"
INDICATOR_IDS = [
    "6926a0de98c076c16ab1ddf4",  # RSI Scalper Pro
    "6926a0de98c076c16ab1ddf5"   # Gold Breakout System
]

class DirectTester:
    def __init__(self):
        self.client = None
        self.db = None
        self.test_results = []
        self.user_token = None
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
    
    async def setup_database_connection(self):
        """Setup MongoDB connection"""
        try:
            self.client = AsyncIOMotorClient(MONGO_URL)
            self.db = self.client[DB_NAME]
            
            # Test connection
            await self.db.command("ping")
            self.log_test("Database Connection", True, f"Connected to MongoDB: {DB_NAME}")
            return True
            
        except Exception as e:
            self.log_test("Database Connection", False, f"Failed to connect: {str(e)}")
            return False
    
    async def check_existing_user(self):
        """Check if john@mimobile.com exists in database"""
        try:
            user = await self.db.users.find_one({"email": TEST_USER_EMAIL})
            
            if user:
                user_info = {
                    "id": str(user["_id"]),
                    "email": user.get("email"),
                    "name": user.get("name"),
                    "mentor_id": user.get("mentor_id"),
                    "status": user.get("status"),
                    "payment_status": user.get("payment_status")
                }
                self.log_test("Check Existing User", True, f"User exists: {json.dumps(user_info, indent=2)}")
                return True
            else:
                self.log_test("Check Existing User", False, f"User {TEST_USER_EMAIL} not found in database")
                return False
                
        except Exception as e:
            self.log_test("Check Existing User", False, f"Database error: {str(e)}")
            return False
    
    async def create_test_user(self):
        """Create test user john@mimobile.com if not exists"""
        try:
            # Check if user already exists
            existing_user = await self.db.users.find_one({"email": TEST_USER_EMAIL})
            if existing_user:
                self.log_test("Create Test User", True, f"User {TEST_USER_EMAIL} already exists")
                return True
            
            # Import password hashing from auth module
            sys.path.append('/app/backend')
            from auth import get_password_hash
            
            # Create user document
            user_doc = {
                "email": TEST_USER_EMAIL,
                "password_hash": get_password_hash("Test@123"),
                "name": "John Test User",
                "mentor_id": "MENTOR0001",
                "license_key": "TEST-KEY-1234",
                "status": "active",
                "payment_status": "paid",
                "created_at": datetime.utcnow(),
                "last_login": None
            }
            
            result = await self.db.users.insert_one(user_doc)
            user_id = str(result.inserted_id)
            
            self.log_test("Create Test User", True, f"Created user {TEST_USER_EMAIL} with ID: {user_id}")
            return True
            
        except Exception as e:
            self.log_test("Create Test User", False, f"Failed to create user: {str(e)}")
            return False
    
    async def check_indicators_exist(self):
        """Check if the required indicators exist in database"""
        try:
            indicators = []
            for indicator_id in INDICATOR_IDS:
                indicator = await self.db.custom_indicators.find_one({"_id": ObjectId(indicator_id)})
                if indicator:
                    indicators.append({
                        "id": indicator_id,
                        "name": indicator.get("name"),
                        "mentor_id": indicator.get("mentor_id"),
                        "is_running": indicator.get("is_running"),
                        "current_signal": indicator.get("current_signal")
                    })
            
            if len(indicators) == 2:
                self.log_test("Check Indicators Exist", True, f"Found both indicators: {json.dumps(indicators, indent=2)}")
                return True
            else:
                self.log_test("Check Indicators Exist", False, f"Expected 2 indicators, found {len(indicators)}")
                return False
                
        except Exception as e:
            self.log_test("Check Indicators Exist", False, f"Database error: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test user login to get JWT token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_USER_EMAIL,
                "password": "Test@123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.user_token = data.get("access_token")
                user_info = data.get("user", {})
                
                self.log_test("User Login", True, f"Login successful. User: {user_info.get('name')}, Status: {user_info.get('status')}, Payment: {user_info.get('payment_status')}")
                return True
            else:
                self.log_test("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            return False
    
    def test_get_mentor_indicators(self):
        """Test GET /api/user/mentor-indicators"""
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            response = requests.get(f"{BASE_URL}/user/mentor-indicators", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                indicators = data.get("indicators", [])
                selected_id = data.get("selected_indicator_id")
                
                indicator_details = []
                for indicator in indicators:
                    indicator_details.append(f"ID: {indicator.get('id')}, Name: {indicator.get('name')}, Signal: {indicator.get('current_signal')}")
                
                self.log_test("Get Mentor Indicators", True, f"Found {len(indicators)} indicators. Selected: {selected_id}. Details: {'; '.join(indicator_details)}")
                return True
            else:
                self.log_test("Get Mentor Indicators", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Mentor Indicators", False, f"Exception: {str(e)}")
            return False
    
    def test_select_indicator(self, indicator_id, indicator_name):
        """Test POST /api/user/select-indicator"""
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            response = requests.post(f"{BASE_URL}/user/select-indicator", 
                                   headers=headers,
                                   json={"indicator_id": indicator_id})
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(f"Select {indicator_name}", True, f"Successfully selected indicator {indicator_id}. Response: {json.dumps(data, indent=2)}")
                return True
            else:
                self.log_test(f"Select {indicator_name}", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test(f"Select {indicator_name}", False, f"Exception: {str(e)}")
            return False
    
    async def verify_database_update(self, expected_indicator_id):
        """Verify that selected_indicator_id was updated in database"""
        try:
            user = await self.db.users.find_one({"email": TEST_USER_EMAIL})
            
            if user:
                selected_id = user.get("selected_indicator_id")
                if selected_id == expected_indicator_id:
                    self.log_test("Database Update Verification", True, f"Database correctly updated. selected_indicator_id: {selected_id}")
                    return True
                else:
                    self.log_test("Database Update Verification", False, f"Expected {expected_indicator_id}, found {selected_id}")
                    return False
            else:
                self.log_test("Database Update Verification", False, "User not found in database")
                return False
                
        except Exception as e:
            self.log_test("Database Update Verification", False, f"Database error: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run all tests"""
        print("🚨 CRITICAL TESTING: ADD TO SIGNALS BUTTON - Direct Database Testing")
        print("=" * 80)
        print(f"Test User: {TEST_USER_EMAIL}")
        print(f"Backend URL: {BASE_URL}")
        print(f"Database: {DB_NAME}")
        print()
        
        # Step 1: Setup database connection
        if not await self.setup_database_connection():
            return False
        
        # Step 2: Check if user exists
        await self.check_existing_user()
        
        # Step 3: Create test user if needed
        await self.create_test_user()
        
        # Step 4: Check if indicators exist
        if not await self.check_indicators_exist():
            print("❌ CRITICAL: Required indicators not found in database")
            return False
        
        # Step 5: Test user login
        if not self.test_user_login():
            print("❌ CRITICAL: User login failed")
            return False
        
        # Step 6: Test get mentor indicators
        if not self.test_get_mentor_indicators():
            print("❌ CRITICAL: Cannot get mentor indicators")
            return False
        
        # Step 7: Test select first indicator
        success1 = self.test_select_indicator(INDICATOR_IDS[0], "RSI Scalper Pro")
        if success1:
            await self.verify_database_update(INDICATOR_IDS[0])
        
        # Step 8: Test select second indicator
        success2 = self.test_select_indicator(INDICATOR_IDS[1], "Gold Breakout System")
        if success2:
            await self.verify_database_update(INDICATOR_IDS[1])
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        # Critical endpoint status
        select_indicator_working = any(t["success"] and "Select" in t["test"] for t in self.test_results)
        print(f"🎯 POST /api/user/select-indicator: {'✅ WORKING' if select_indicator_working else '❌ FAILING'}")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"   - {test['test']}: {test['details']}")
            print()
        
        return failed_tests == 0

async def main():
    """Main test execution"""
    tester = DirectTester()
    
    try:
        success = await tester.run_all_tests()
        all_passed = tester.print_summary()
        
        if all_passed:
            print("🎉 ALL TESTS PASSED! ADD TO SIGNALS BUTTON backend endpoint is working correctly.")
            sys.exit(0)
        else:
            print("⚠️  SOME TESTS FAILED! Please check the failed tests above.")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {str(e)}")
        sys.exit(1)
    finally:
        if tester.client:
            tester.client.close()

if __name__ == "__main__":
    asyncio.run(main())