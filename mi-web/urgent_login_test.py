#!/usr/bin/env python3
"""
URGENT LOGIN DEBUGGING TEST
Testing user login functionality to identify why users cannot login
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def print_test_header(test_name):
    print(f"\n{'='*60}")
    print(f"🔍 {test_name}")
    print(f"{'='*60}")

def print_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")

def test_user_login(email, password, test_name):
    """Test user login with specific credentials"""
    print_test_header(f"Testing Login: {test_name}")
    
    try:
        # Test login endpoint
        login_url = f"{BACKEND_URL}/auth/login"
        login_data = {
            "email": email,
            "password": password
        }
        
        print(f"🔗 POST {login_url}")
        print(f"📧 Email: {email}")
        print(f"🔑 Password: {password}")
        
        response = requests.post(login_url, json=login_data, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login Successful!")
            print(f"🎫 Access Token: {data.get('access_token', 'N/A')[:50]}...")
            print(f"👤 User Type: {data.get('user_type', 'N/A')}")
            print(f"💳 Payment Status: {data.get('payment_status', 'N/A')}")
            print(f"📊 Account Status: {data.get('status', 'N/A')}")
            print(f"💰 Requires Payment: {data.get('requires_payment', 'N/A')}")
            print(f"🔄 Requires Password Change: {data.get('requires_password_change', 'N/A')}")
            
            # Test protected route access
            if data.get('access_token'):
                test_protected_route_access(data['access_token'], email)
            
            return True, data
        else:
            try:
                error_data = response.json()
                print(f"❌ Login Failed: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"❌ Login Failed: HTTP {response.status_code}")
                print(f"📄 Response Text: {response.text}")
            
            return False, None
            
    except Exception as e:
        print(f"❌ Exception during login: {str(e)}")
        return False, None

def test_protected_route_access(token, email):
    """Test access to protected routes with token"""
    print_test_header(f"Testing Protected Route Access for {email}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test user profile endpoint
    try:
        profile_url = f"{BACKEND_URL}/user/profile"
        print(f"🔗 GET {profile_url}")
        
        response = requests.get(profile_url, headers=headers, timeout=30)
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Profile Access Successful!")
            print(f"📧 Email: {data.get('email', 'N/A')}")
            print(f"👤 Name: {data.get('name', 'N/A')}")
            print(f"💳 Payment Status: {data.get('payment_status', 'N/A')}")
            print(f"📊 Account Status: {data.get('status', 'N/A')}")
            return True
        else:
            try:
                error_data = response.json()
                print(f"❌ Profile Access Failed: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"❌ Profile Access Failed: HTTP {response.status_code}")
                print(f"📄 Response Text: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception during profile access: {str(e)}")
        return False

def test_admin_login():
    """Test admin login to verify system is working"""
    print_test_header("Testing Admin Login (System Verification)")
    
    try:
        login_url = f"{BACKEND_URL}/admin/login"
        login_data = {
            "email": "admin@signalmaster.com",
            "password": "Admin@123"
        }
        
        print(f"🔗 POST {login_url}")
        print(f"📧 Email: admin@signalmaster.com")
        
        response = requests.post(login_url, json=login_data, timeout=30)
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Admin Login Successful!")
            print(f"👤 User Type: {data.get('user_type', 'N/A')}")
            return True, data.get('access_token')
        else:
            try:
                error_data = response.json()
                print(f"❌ Admin Login Failed: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"❌ Admin Login Failed: HTTP {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"❌ Exception during admin login: {str(e)}")
        return False, None

def check_user_in_database(admin_token, email):
    """Check if user exists in database and their status"""
    print_test_header(f"Database Check for {email}")
    
    if not admin_token:
        print("❌ No admin token available for database check")
        return
    
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        users_url = f"{BACKEND_URL}/admin/users"
        
        print(f"🔗 GET {users_url}")
        response = requests.get(users_url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            users = data.get('users', [])
            
            # Find the specific user
            target_user = None
            for user in users:
                if user.get('email', '').lower() == email.lower():
                    target_user = user
                    break
            
            if target_user:
                print(f"✅ User Found in Database!")
                print(f"📧 Email: {target_user.get('email', 'N/A')}")
                print(f"👤 Name: {target_user.get('name', 'N/A')}")
                print(f"🆔 User ID: {target_user.get('_id', 'N/A')}")
                print(f"📊 Status: {target_user.get('status', 'N/A')}")
                print(f"💳 Payment Status: {target_user.get('payment_status', 'N/A')}")
                print(f"🏷️ Mentor ID: {target_user.get('mentor_id', 'N/A')}")
                print(f"🔑 License Key: {target_user.get('license_key', 'N/A')}")
                print(f"🔄 Requires Password Change: {target_user.get('requires_password_change', 'N/A')}")
                
                # Check if password hash exists
                if target_user.get('password_hash'):
                    print(f"🔐 Password Hash: EXISTS (length: {len(target_user['password_hash'])})")
                else:
                    print(f"🔐 Password Hash: MISSING ❌")
                
                return target_user
            else:
                print(f"❌ User NOT Found in Database!")
                print(f"📊 Total Users in Database: {len(users)}")
                return None
        else:
            print(f"❌ Failed to get users: HTTP {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Exception during database check: {str(e)}")
        return None

def test_password_change_flow(token, email, current_password):
    """Test password change functionality"""
    print_test_header(f"Testing Password Change Flow for {email}")
    
    if not token:
        print("❌ No token available for password change test")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        change_url = f"{BACKEND_URL}/auth/change-password"
        
        new_password = "NewPassword123!"
        change_data = {
            "current_password": current_password,
            "new_password": new_password
        }
        
        print(f"🔗 POST {change_url}")
        print(f"🔑 Current Password: {current_password}")
        print(f"🔑 New Password: {new_password}")
        
        response = requests.post(change_url, json=change_data, headers=headers, timeout=30)
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ Password Change Successful!")
            
            # Test login with new password
            print(f"\n🔄 Testing Login with New Password...")
            success, _ = test_user_login(email, new_password, "After Password Change")
            return success
        else:
            try:
                error_data = response.json()
                print(f"❌ Password Change Failed: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"❌ Password Change Failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Exception during password change: {str(e)}")
        return False

def main():
    """Main test execution"""
    print("🚨 URGENT LOGIN DEBUGGING - USER CANNOT LOGIN ISSUE")
    print(f"⏰ Test Started: {datetime.now()}")
    print(f"🌐 Backend URL: {BACKEND_URL}")
    
    # Test credentials from the review request
    test_users = [
        ("collenbelly7@icloud.com", "diQL*sm9!Yrs", "User 1 - Collen"),
        ("respondscooby@gmail.com", "DhIFJ#qvvbwu", "User 2 - Responds")
    ]
    
    results = []
    
    # First, test admin login to verify system is working
    admin_success, admin_token = test_admin_login()
    
    # Test each user
    for email, password, name in test_users:
        print(f"\n{'🔍'*20} TESTING {name} {'🔍'*20}")
        
        # Check user in database first
        user_data = check_user_in_database(admin_token, email) if admin_token else None
        
        # Test login
        login_success, login_data = test_user_login(email, password, name)
        
        if login_success and login_data:
            # Test password change flow if login successful
            token = login_data.get('access_token')
            requires_change = login_data.get('requires_password_change', False)
            
            if requires_change:
                print(f"\n🔄 User requires password change - testing flow...")
                password_change_success = test_password_change_flow(token, email, password)
                results.append((name, login_success, password_change_success))
            else:
                results.append((name, login_success, True))
        else:
            results.append((name, login_success, False))
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 URGENT LOGIN TEST SUMMARY")
    print(f"{'='*60}")
    
    for name, login_success, flow_success in results:
        login_status = "✅ SUCCESS" if login_success else "❌ FAILED"
        flow_status = "✅ COMPLETE" if flow_success else "❌ INCOMPLETE"
        print(f"{name}: Login {login_status}, Flow {flow_success}")
    
    # Overall assessment
    all_successful = all(login_success for _, login_success, _ in results)
    
    if all_successful:
        print(f"\n🎉 ALL USERS CAN LOGIN SUCCESSFULLY!")
        print(f"✅ No login issues found - system is working correctly")
    else:
        print(f"\n🚨 LOGIN ISSUES DETECTED!")
        print(f"❌ Some users cannot login - investigation required")
        
        # Common issues to check
        print(f"\n🔍 COMMON ISSUES TO INVESTIGATE:")
        print(f"1. Password hash algorithm mismatch")
        print(f"2. Incorrect password comparison logic")
        print(f"3. Missing authentication headers")
        print(f"4. Token generation issues")
        print(f"5. Database connection problems")
        print(f"6. Payment status blocking access")
        print(f"7. Account status issues")
    
    print(f"\n⏰ Test Completed: {datetime.now()}")

if __name__ == "__main__":
    main()