#!/usr/bin/env python3
"""
Simple Backend Testing Script for Brokers and News Endpoints
Tests the MI Mobile Indicator backend API endpoints to identify why brokers and news are empty.
"""

import asyncio
import httpx
import json
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Configuration
BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "mi_mobile_indicator"

class SimpleTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.mongo_client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.mongo_client[DB_NAME]
        
    async def close(self):
        await self.client.aclose()
        self.mongo_client.close()
    
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
    
    async def test_admin_login(self):
        """Test admin login"""
        self.log("🔐 Testing Admin Login...")
        
        admin_data = {
            "email": "admin@test.com",
            "password": "Test@123"
        }
        
        try:
            response = await self.client.post(f"{BACKEND_URL}/admin/login", json=admin_data)
            if response.status_code == 200:
                result = response.json()
                self.admin_token = result.get("access_token")
                self.log("✅ Admin login successful")
                return True
            else:
                self.log(f"❌ Admin login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log(f"❌ Admin login error: {str(e)}")
            return False
    
    async def test_user_login_with_known_credentials(self):
        """Test user login with known credentials from test_result.md"""
        self.log("🔐 Testing User Login with Known Credentials...")
        
        # Use test user with known credentials
        if hasattr(self, 'admin_token') and self.admin_token:
            # Find the user in database
            user = await self.db.users.find_one({"email": "user@test.com"})
            if user:
                user_id = str(user["_id"])
                self.log(f"📧 Found user: user@test.com (ID: {user_id})")
                
                # Reset password
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                reset_response = await self.client.post(
                    f"{BACKEND_URL}/admin/users/{user_id}/reset-password",
                    headers=headers
                )
                
                if reset_response.status_code == 200:
                    reset_result = reset_response.json()
                    temp_password = reset_result.get("temporary_password")
                    self.log(f"✅ Password reset successful: {temp_password}")
                    
                    # Now try to login
                    login_data = {
                        "email": "user@test.com",
                        "password": temp_password
                    }
                    
                    response = await self.client.post(f"{BACKEND_URL}/auth/login", json=login_data)
                    if response.status_code == 200:
                        result = response.json()
                        self.user_token = result.get("access_token")
                        self.user_id = result.get("user_id")
                        self.log(f"✅ User login successful")
                        self.log(f"   User ID: {self.user_id}")
                        self.log(f"   Payment Status: {result.get('payment_status')}")
                        self.log(f"   Status: {result.get('status')}")
                        return True
                    else:
                        self.log(f"❌ User login failed: {response.status_code} - {response.text}")
                        return False
                else:
                    self.log(f"❌ Password reset failed: {reset_response.status_code}")
                    return False
            else:
                self.log("❌ User collenbelly7@icloud.com not found in database")
                return False
        else:
            self.log("❌ No admin token available for password reset")
            return False
    
    async def inspect_database(self):
        """Inspect database collections"""
        self.log("\n🔍 Inspecting Database Collections...")
        
        try:
            # Check brokers collection
            brokers_count = await self.db.brokers.count_documents({})
            active_brokers_count = await self.db.brokers.count_documents({"status": "active"})
            self.log(f"📊 Total brokers in database: {brokers_count}")
            self.log(f"📊 Active brokers in database: {active_brokers_count}")
            
            if active_brokers_count > 0:
                brokers = await self.db.brokers.find({"status": "active"}).limit(5).to_list(length=5)
                for i, broker in enumerate(brokers):
                    self.log(f"   Broker {i+1}: {broker.get('broker_name')} (Added by: {broker.get('added_by_type')})")
            
            # Check broker_notifications collection
            notifications_count = await self.db.broker_notifications.count_documents({})
            self.log(f"📊 Total broker notifications: {notifications_count}")
            
            if hasattr(self, 'user_id') and self.user_id:
                user_notifications_count = await self.db.broker_notifications.count_documents({"user_id": self.user_id})
                self.log(f"📊 Broker notifications for current user: {user_notifications_count}")
            
            # Check manual_news collection
            news_count = await self.db.manual_news.count_documents({})
            active_news_count = await self.db.manual_news.count_documents({"status": "active"})
            self.log(f"📊 Total manual news in database: {news_count}")
            self.log(f"📊 Active manual news in database: {active_news_count}")
            
            if active_news_count > 0:
                news_items = await self.db.manual_news.find({"status": "active"}).limit(5).to_list(length=5)
                for i, news in enumerate(news_items):
                    self.log(f"   News {i+1}: {news.get('title')} (Sender: {news.get('sender_type')})")
            
            # Check users collection for paid users
            paid_users_count = await self.db.users.count_documents({"payment_status": "paid", "status": "active"})
            self.log(f"📊 Active, paid users: {paid_users_count}")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Database inspection error: {str(e)}")
            return False
    
    async def test_brokers_endpoint(self):
        """Test GET /api/user/brokers endpoint"""
        self.log("\n🏢 Testing Brokers Endpoint...")
        
        if not hasattr(self, 'user_token') or not self.user_token:
            self.log("❌ No user token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
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
        
        if not hasattr(self, 'user_token') or not self.user_token:
            self.log("❌ No user token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
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
    
    async def test_admin_brokers_endpoint(self):
        """Test admin brokers endpoint"""
        self.log("\n🔧 Testing Admin Brokers Endpoint...")
        
        if not hasattr(self, 'admin_token') or not self.admin_token:
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
    
    async def create_test_broker(self):
        """Create a test broker"""
        self.log("\n🏗️ Creating Test Broker...")
        
        if not hasattr(self, 'admin_token') or not self.admin_token:
            self.log("❌ No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        broker_data = {
            "broker_name": "Test Broker for Mobile App Debug",
            "broker_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "affiliate_link": "https://testbroker.com/signup?ref=debug123",
            "description": "Test broker created for debugging mobile app empty brokers issue"
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
    
    async def create_test_news(self):
        """Create test news"""
        self.log("\n📝 Creating Test News...")
        
        if not hasattr(self, 'admin_token') or not self.admin_token:
            self.log("❌ No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        news_data = {
            "title": "Test News Event for Mobile App Debug",
            "event_time": "16:30 UTC",
            "currency": "USD",
            "impact": "High",
            "description": "Test news event created for debugging mobile app empty news issue",
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
    
    async def run_test(self):
        """Run the test suite"""
        self.log("🚀 Starting Brokers and News Debug Testing")
        self.log("=" * 60)
        
        results = {}
        
        # Step 1: Admin login
        results['admin_login'] = await self.test_admin_login()
        
        # Step 2: User login
        results['user_login'] = await self.test_user_login_with_known_credentials()
        
        # Step 3: Database inspection
        results['db_inspection'] = await self.inspect_database()
        
        # Step 4: Test endpoints
        results['brokers_endpoint'] = await self.test_brokers_endpoint()
        results['news_endpoint'] = await self.test_news_endpoint()
        results['admin_brokers'] = await self.test_admin_brokers_endpoint()
        
        # Step 5: Create test data if needed
        if not results.get('brokers_endpoint', False):
            self.log("\n🔧 No brokers found for user - creating test broker...")
            results['create_broker'] = await self.create_test_broker()
            
            if results['create_broker']:
                self.log("\n🔄 Re-testing brokers endpoint after creation...")
                results['brokers_retest'] = await self.test_brokers_endpoint()
        
        if not results.get('news_endpoint', False):
            self.log("\n🔧 No news found for user - creating test news...")
            results['create_news'] = await self.create_test_news()
            
            if results['create_news']:
                self.log("\n🔄 Re-testing news endpoint after creation...")
                results['news_retest'] = await self.test_news_endpoint()
        
        # Summary
        self.log("\n" + "=" * 60)
        self.log("📋 TEST RESULTS SUMMARY")
        self.log("=" * 60)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
        
        # Root cause analysis
        self.log("\n🎯 ROOT CAUSE ANALYSIS:")
        
        if not results.get('brokers_endpoint', False):
            if results.get('admin_brokers', False):
                self.log("❌ BROKERS ISSUE: Brokers exist in system but user is not receiving notifications")
                self.log("   Possible causes:")
                self.log("   - User not in broker_notifications table")
                self.log("   - Notification system not working when brokers are created")
                self.log("   - User payment/status filtering issue")
            else:
                self.log("❌ BROKERS ISSUE: No brokers exist in the system at all")
                self.log("   Solution: Admin needs to create brokers via admin panel")
        else:
            self.log("✅ BROKERS: Working correctly")
            
        if not results.get('news_endpoint', False):
            self.log("❌ NEWS ISSUE: No news events available for user")
            self.log("   Possible causes:")
            self.log("   - No manual news created by admin/mentor")
            self.log("   - External news API not working (FMP API)")
            self.log("   - News filtering by mentor_id issue")
        else:
            self.log("✅ NEWS: Working correctly")
        
        return results

async def main():
    """Main test execution"""
    tester = SimpleTester()
    
    try:
        results = await tester.run_test()
        return results
    finally:
        await tester.close()

if __name__ == "__main__":
    asyncio.run(main())