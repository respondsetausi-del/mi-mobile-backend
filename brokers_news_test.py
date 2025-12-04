#!/usr/bin/env python3
"""
Backend Testing Script for Brokers and News Endpoints
Tests the MI Mobile Indicator backend API endpoints to identify why brokers and news are empty.
"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Configuration
BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "mi_mobile_indicator"

class BackendTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.mongo_client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.mongo_client[DB_NAME]
        self.auth_token = None
        self.admin_token = None
        self.user_id = None
        
    async def close(self):
        await self.client.aclose()
        self.mongo_client.close()
    
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
    
    async def test_user_login(self):
        """Test user authentication with existing user"""
        self.log("🔐 Testing User Authentication...")
        
        # First, let's find an existing active, paid user
        users = await self.db.users.find({
            "status": "active", 
            "payment_status": "paid"
        }).limit(5).to_list(length=5)
        
        if not users:
            self.log("❌ No active, paid users found in database")
            return False
            
        # Try to login with the first user (we'll need to reset their password)
        test_user = users[0]
        user_email = test_user.get("email")
        self.log(f"📧 Found test user: {user_email}")
        
        # Reset password for testing (admin function)
        reset_success = await self.admin_login_and_reset_password(str(test_user["_id"]))
        
        if not reset_success:
            self.log("❌ Failed to reset password, cannot proceed with user login")
            return False
        
        # Now try to login with the temporary password
        login_data = {
            "email": user_email,
            "password": self.temp_password
        }
        
        try:
            response = await self.client.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                result = response.json()
                self.auth_token = result.get("access_token")
                self.user_id = result.get("user_id")
                self.log(f"✅ User login successful: {user_email}")
                self.log(f"   User ID: {self.user_id}")
                self.log(f"   Payment Status: {result.get('payment_status')}")
                self.log(f"   Status: {result.get('status')}")
                return True
            else:
                self.log(f"❌ User login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ User login error: {str(e)}")
            return False
    
    async def admin_login_and_reset_password(self, user_id):
        """Login as admin and reset user password for testing"""
        self.log("🔑 Admin login to reset user password...")
        
        # Admin login
        admin_data = {
            "email": "admin@signalmaster.com",
            "password": "Admin@123"
        }
        
        try:
            response = await self.client.post(f"{BACKEND_URL}/admin/login", json=admin_data)
            if response.status_code == 200:
                result = response.json()
                self.admin_token = result.get("access_token")
                self.log("✅ Admin login successful")
                
                # Reset user password
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                reset_response = await self.client.post(
                    f"{BACKEND_URL}/admin/users/{user_id}/reset-password",
                    headers=headers
                )
                
                if reset_response.status_code == 200:
                    reset_result = reset_response.json()
                    self.temp_password = reset_result.get("temporary_password")
                    self.log(f"✅ Password reset successful: {self.temp_password}")
                    return True
                else:
                    self.log(f"❌ Password reset failed: {reset_response.status_code}")
                    return False
                    
            else:
                self.log(f"❌ Admin login failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login error: {str(e)}")
            return False
    
    async def test_brokers_endpoint(self):
        """Test GET /api/user/brokers endpoint"""
        self.log("\n🏢 Testing Brokers Endpoint...")
        
        if not self.auth_token:
            self.log("❌ No auth token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = await self.client.get(f"{BACKEND_URL}/user/brokers", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                brokers = result.get("brokers", [])
                unseen_count = result.get("unseen_count", 0)
                
                self.log(f"✅ Brokers endpoint successful")
                self.log(f"   Total brokers: {len(brokers)}")
                self.log(f"   Unseen count: {unseen_count}")
                
                if brokers:
                    for i, broker in enumerate(brokers[:3]):  # Show first 3
                        self.log(f"   Broker {i+1}: {broker.get('broker_name')} - Seen: {broker.get('seen')}")
                else:
                    self.log("   ⚠️ No brokers returned - this explains why mobile app shows empty")
                
                return len(brokers) > 0
            else:
                self.log(f"❌ Brokers endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Brokers endpoint error: {str(e)}")
            return False
    
    async def test_news_endpoint(self):
        """Test GET /api/user/news endpoint"""
        self.log("\n📰 Testing News Endpoint...")
        
        if not self.auth_token:
            self.log("❌ No auth token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = await self.client.get(f"{BACKEND_URL}/user/news", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                news_items = result.get("news", [])
                
                self.log(f"✅ News endpoint successful")
                self.log(f"   Total news items: {len(news_items)}")
                
                if news_items:
                    for i, news in enumerate(news_items[:3]):  # Show first 3
                        self.log(f"   News {i+1}: {news.get('title')} - Impact: {news.get('impact')}")
                else:
                    self.log("   ⚠️ No news returned - this explains why mobile app shows empty")
                
                return len(news_items) > 0
            else:
                self.log(f"❌ News endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ News endpoint error: {str(e)}")
            return False
    
    async def inspect_database_collections(self):
        """Inspect database collections for brokers and news data"""
        self.log("\n🔍 Inspecting Database Collections...")
        
        try:
            # Check brokers collection
            brokers_count = await self.db.brokers.count_documents({"status": "active"})
            self.log(f"📊 Active brokers in database: {brokers_count}")
            
            if brokers_count > 0:
                brokers = await self.db.brokers.find({"status": "active"}).limit(3).to_list(length=3)
                for i, broker in enumerate(brokers):
                    self.log(f"   Broker {i+1}: {broker.get('broker_name')} (Added by: {broker.get('added_by_type')})")
            
            # Check broker_notifications collection
            if self.user_id:
                notifications_count = await self.db.broker_notifications.count_documents({"user_id": self.user_id})
                self.log(f"📊 Broker notifications for user: {notifications_count}")
            
            # Check manual_news collection
            news_count = await self.db.manual_news.count_documents({"status": "active"})
            self.log(f"📊 Active manual news in database: {news_count}")
            
            if news_count > 0:
                news_items = await self.db.manual_news.find({"status": "active"}).limit(3).to_list(length=3)
                for i, news in enumerate(news_items):
                    self.log(f"   News {i+1}: {news.get('title')} (Sender: {news.get('sender_type')})")
            
            # Check if user has mentor_id
            if self.user_id:
                user = await self.db.users.find_one({"_id": ObjectId(self.user_id)})
                if user:
                    mentor_id = user.get("mentor_id")
                    self.log(f"📊 User mentor_id: {mentor_id}")
                    
                    if mentor_id:
                        # Check mentor-specific news
                        mentor_news_count = await self.db.manual_news.count_documents({
                            "sender_type": "mentor",
                            "mentor_id": mentor_id,
                            "status": "active"
                        })
                        self.log(f"📊 Mentor-specific news for {mentor_id}: {mentor_news_count}")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Database inspection error: {str(e)}")
            return False
    
    async def test_admin_brokers_endpoint(self):
        """Test admin brokers endpoint to see all brokers"""
        self.log("\n🔧 Testing Admin Brokers Endpoint...")
        
        if not self.admin_token:
            self.log("❌ No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = await self.client.get(f"{BACKEND_URL}/admin/brokers", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                brokers = result.get("brokers", [])
                
                self.log(f"✅ Admin brokers endpoint successful")
                self.log(f"   Total brokers (admin view): {len(brokers)}")
                
                if brokers:
                    for i, broker in enumerate(brokers[:5]):  # Show first 5
                        self.log(f"   Broker {i+1}: {broker.get('broker_name')} - Added by: {broker.get('added_by_type')}")
                
                return len(brokers) > 0
            else:
                self.log(f"❌ Admin brokers endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin brokers endpoint error: {str(e)}")
            return False
    
    async def create_test_broker_if_needed(self):
        """Create a test broker if none exist"""
        self.log("\n🏗️ Creating Test Broker...")
        
        if not self.admin_token:
            self.log("❌ No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        broker_data = {
            "broker_name": "Test Broker for Mobile App",
            "broker_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "affiliate_link": "https://testbroker.com/signup?ref=test123",
            "description": "Test broker created for mobile app testing"
        }
        
        try:
            response = await self.client.post(f"{BACKEND_URL}/admin/brokers", json=broker_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Test broker created successfully")
                self.log(f"   Broker ID: {result.get('broker_id')}")
                self.log(f"   Notified users: {result.get('notified_users')}")
                return True
            else:
                self.log(f"❌ Failed to create test broker: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating test broker: {str(e)}")
            return False
    
    async def create_test_news_if_needed(self):
        """Create test news if none exist"""
        self.log("\n📝 Creating Test News...")
        
        if not self.admin_token:
            self.log("❌ No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        news_data = {
            "title": "Test News Event for Mobile App",
            "event_time": "15:30 UTC",
            "currency": "USD",
            "impact": "High",
            "description": "Test news event created for mobile app testing",
            "signal": "BUY"
        }
        
        try:
            response = await self.client.post(f"{BACKEND_URL}/admin/send-manual-news", json=news_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Test news created successfully")
                self.log(f"   News ID: {result.get('news_id')}")
                self.log(f"   Recipients: {result.get('recipient_count')}")
                return True
            else:
                self.log(f"❌ Failed to create test news: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating test news: {str(e)}")
            return False
    
    async def run_comprehensive_test(self):
        """Run comprehensive test suite"""
        self.log("🚀 Starting Comprehensive Brokers and News Testing")
        self.log("=" * 60)
        
        results = {}
        
        # Step 1: User Authentication
        results['user_auth'] = await self.test_user_login()
        
        # Step 2: Database Inspection
        results['db_inspection'] = await self.inspect_database_collections()
        
        # Step 3: Test Brokers Endpoint
        results['brokers_endpoint'] = await self.test_brokers_endpoint()
        
        # Step 4: Test News Endpoint  
        results['news_endpoint'] = await self.test_news_endpoint()
        
        # Step 5: Admin Brokers View
        results['admin_brokers'] = await self.test_admin_brokers_endpoint()
        
        # Step 6: Create test data if needed
        if not results['brokers_endpoint']:
            self.log("\n🔧 No brokers found - creating test broker...")
            results['create_broker'] = await self.create_test_broker_if_needed()
            
            # Re-test brokers endpoint after creation
            if results['create_broker']:
                self.log("\n🔄 Re-testing brokers endpoint after creation...")
                results['brokers_retest'] = await self.test_brokers_endpoint()
        
        if not results['news_endpoint']:
            self.log("\n🔧 No news found - creating test news...")
            results['create_news'] = await self.create_test_news_if_needed()
            
            # Re-test news endpoint after creation
            if results['create_news']:
                self.log("\n🔄 Re-testing news endpoint after creation...")
                results['news_retest'] = await self.test_news_endpoint()
        
        # Summary
        self.log("\n" + "=" * 60)
        self.log("📋 TEST SUMMARY")
        self.log("=" * 60)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
        
        # Conclusions
        self.log("\n🎯 CONCLUSIONS:")
        
        if not results.get('brokers_endpoint', False):
            if not results.get('admin_brokers', False):
                self.log("❌ BROKERS ISSUE: No brokers exist in the system")
            else:
                self.log("❌ BROKERS ISSUE: Brokers exist but user is not receiving notifications")
        else:
            self.log("✅ BROKERS: Working correctly")
            
        if not results.get('news_endpoint', False):
            self.log("❌ NEWS ISSUE: No news events available for user")
        else:
            self.log("✅ NEWS: Working correctly")
        
        return results

async def main():
    """Main test execution"""
    tester = BackendTester()
    
    try:
        results = await tester.run_comprehensive_test()
        return results
    finally:
        await tester.close()

if __name__ == "__main__":
    asyncio.run(main())