"""
URGENT: Delete User Button Functionality Test
Testing as requested in review
"""

import requests
import json
from datetime import datetime

# Backend URL
BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@signalmaster.com"
ADMIN_PASSWORD = "Admin@123"

def print_header(text):
    print(f"\n{'='*80}")
    print(f"{text}")
    print(f"{'='*80}")

def print_step(step_num, description):
    print(f"\n--- Step {step_num}: {description} ---")

def print_result(success, message, details=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {message}")
    if details:
        print(f"    {details}")

print_header("URGENT: DELETE USER BUTTON FUNCTIONALITY TEST")
print(f"Timestamp: {datetime.now().isoformat()}")
print(f"Backend URL: {BACKEND_URL}")

admin_token = None
target_user_id = None
target_user_email = "respondscooby@gmail.com"

try:
    # Step 1: Admin Login
    print_step(1, "Admin Login")
    print(f"Logging in as: {ADMIN_EMAIL}")
    
    login_response = requests.post(
        f"{BACKEND_URL}/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10
    )
    
    print(f"Response Status: {login_response.status_code}")
    print(f"Response Body: {login_response.text[:200]}")
    
    if login_response.status_code == 200:
        admin_token = login_response.json().get("access_token")
        print_result(True, "Admin login successful", f"Token: {admin_token[:30]}...")
    else:
        print_result(False, "Admin login failed", f"Status: {login_response.status_code}")
        exit(1)
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Step 2: Get Users List
    print_step(2, "Get Users List")
    
    users_response = requests.get(
        f"{BACKEND_URL}/admin/users",
        headers=headers,
        timeout=10
    )
    
    print(f"Response Status: {users_response.status_code}")
    
    if users_response.status_code == 200:
        users_data = users_response.json()
        users = users_data.get("users", [])
        print_result(True, f"Retrieved {len(users)} users")
        
        # Find respondscooby@gmail.com
        target_user = None
        for user in users:
            if user.get("email") == target_user_email:
                target_user = user
                target_user_id = user.get("_id")
                break
        
        if target_user:
            print_result(True, f"Found user: {target_user_email}")
            print(f"    User ID: {target_user_id}")
            print(f"    Name: {target_user.get('name')}")
            print(f"    Status: {target_user.get('status')}")
            print(f"    Payment Status: {target_user.get('payment_status')}")
            print(f"    Mentor ID: {target_user.get('mentor_id')}")
        else:
            print_result(False, f"User {target_user_email} not found")
            print(f"    Available users (first 5): {[u.get('email') for u in users[:5]]}")
    else:
        print_result(False, "Failed to get users list", f"Status: {users_response.status_code}")
        exit(1)
    
    # Step 3: Test Delete User Endpoint
    print_step(3, "Test Delete User Endpoint")
    
    if not target_user_id:
        print_result(False, "Cannot test delete - target user not found")
        print("Skipping to Step 6 - Create test user and delete")
    else:
        print(f"⚠️  WARNING: About to attempt DELETE on user: {target_user_email}")
        print(f"    User ID: {target_user_id}")
        print(f"    Endpoint: DELETE {BACKEND_URL}/admin/users/{target_user_id}")
        
        delete_response = requests.delete(
            f"{BACKEND_URL}/admin/users/{target_user_id}",
            headers=headers,
            timeout=10
        )
        
        print(f"\n🔍 CRITICAL CHECK - Delete Response:")
        print(f"    HTTP Status Code: {delete_response.status_code}")
        print(f"    Response Headers: {dict(delete_response.headers)}")
        print(f"    Response Body: {delete_response.text}")
        
        if delete_response.status_code == 200:
            try:
                response_data = delete_response.json()
                print_result(True, "Delete endpoint returned 200 OK")
                print(f"    Response: {json.dumps(response_data, indent=6)}")
                
                # Verify deletion
                print("\n    Verifying deletion...")
                verify_response = requests.get(
                    f"{BACKEND_URL}/admin/users",
                    headers=headers,
                    timeout=10
                )
                
                if verify_response.status_code == 200:
                    verify_users = verify_response.json().get("users", [])
                    still_exists = any(u.get("_id") == target_user_id for u in verify_users)
                    
                    if not still_exists:
                        print_result(True, "User successfully deleted from database")
                    else:
                        print_result(False, "User still exists in database after delete!")
            except Exception as e:
                print_result(False, f"Error parsing response: {str(e)}")
        elif delete_response.status_code == 404:
            print_result(False, "Delete failed - User not found (404)")
            print(f"    Error: {delete_response.text}")
        elif delete_response.status_code == 403:
            print_result(False, "Delete failed - Forbidden (403)")
            print(f"    Error: {delete_response.text}")
        elif delete_response.status_code == 401:
            print_result(False, "Delete failed - Unauthorized (401)")
            print(f"    Error: {delete_response.text}")
        elif delete_response.status_code == 500:
            print_result(False, "Delete failed - Internal Server Error (500)")
            print(f"    Error: {delete_response.text}")
        else:
            print_result(False, f"Delete failed with unexpected status: {delete_response.status_code}")
            print(f"    Error: {delete_response.text}")
    
    # Step 4: Check Backend Logs
    print_step(4, "Check Backend Logs")
    print("Checking backend logs for delete operation errors...")
    
    import subprocess
    try:
        result = subprocess.run(
            ["tail", "-n", "30", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.stdout:
            print("Backend Error Logs (last 30 lines):")
            print(result.stdout)
        else:
            print_result(True, "No error logs found")
    except Exception as e:
        print(f"Could not read logs: {str(e)}")
    
    # Step 5: Verify Endpoint Exists
    print_step(5, "Verify Endpoint Exists")
    
    try:
        with open("/app/backend/server.py", "r") as f:
            content = f.read()
            
            if '@api_router.delete("/admin/users/{user_id}")' in content:
                print_result(True, "DELETE /api/admin/users/{user_id} endpoint is registered")
                
                if 'async def delete_user(user_id: str' in content:
                    print_result(True, "delete_user function exists")
                    
                    # Check if endpoint path is correct
                    if 'await db.users.delete_one({"_id": ObjectId(user_id)})' in content:
                        print_result(True, "Endpoint has database delete logic")
                    else:
                        print_result(False, "Database delete logic not found")
            else:
                print_result(False, "DELETE endpoint not registered in code")
    except Exception as e:
        print_result(False, f"Error checking code: {str(e)}")
    
    # Step 6: Create Test User and Delete
    print_step(6, "Create Test User and Delete")
    
    test_user_id = None
    test_user_email = "delete_test_user_@test.com"
    
    try:
        # Generate license
        print("  6.1: Generating license key...")
        license_response = requests.post(
            f"{BACKEND_URL}/admin/licenses/generate",
            headers=headers,
            params={"count": 1},
            timeout=10
        )
        
        if license_response.status_code == 200:
            license_key = license_response.json().get("keys", [])[0]
            print_result(True, f"License generated: {license_key}")
            
            # Register test user
            print("  6.2: Registering test user...")
            register_response = requests.post(
                f"{BACKEND_URL}/auth/register",
                json={
                    "email": test_user_email,
                    "password": "TestPass@123",
                    "name": "Delete Test User",
                    "license_key": license_key,
                    "mentor_id": "MENTOR0001"
                },
                timeout=10
            )
            
            if register_response.status_code == 200:
                test_user_id = register_response.json().get("user_id")
                print_result(True, f"Test user created: {test_user_id}")
                
                # Try to delete test user
                print("  6.3: Deleting test user...")
                test_delete_response = requests.delete(
                    f"{BACKEND_URL}/admin/users/{test_user_id}",
                    headers=headers,
                    timeout=10
                )
                
                print(f"\n🔍 Test User Delete Response:")
                print(f"    HTTP Status Code: {test_delete_response.status_code}")
                print(f"    Response Body: {test_delete_response.text}")
                
                if test_delete_response.status_code == 200:
                    print_result(True, "Test user deleted successfully")
                    test_user_id = None  # Mark as deleted
                else:
                    print_result(False, f"Test user delete failed: {test_delete_response.status_code}")
                    print(f"    Error: {test_delete_response.text}")
            else:
                print_result(False, f"Test user registration failed: {register_response.status_code}")
        else:
            print_result(False, f"License generation failed: {license_response.status_code}")
    except Exception as e:
        print_result(False, f"Error in test user creation/deletion: {str(e)}")
    finally:
        # Cleanup
        if test_user_id:
            print("\n  Cleanup: Attempting to delete test user...")
            try:
                cleanup_response = requests.delete(
                    f"{BACKEND_URL}/admin/users/{test_user_id}",
                    headers=headers,
                    timeout=10
                )
                if cleanup_response.status_code == 200:
                    print_result(True, "Cleanup successful")
            except:
                pass

except requests.exceptions.Timeout:
    print_result(False, "Request timeout", "Request took longer than 10 seconds")
except requests.exceptions.ConnectionError as e:
    print_result(False, "Connection error", f"Could not connect to backend: {str(e)}")
except Exception as e:
    print_result(False, "Unexpected error", f"{str(e)}")
    import traceback
    traceback.print_exc()

print_header("TEST COMPLETE")
print(f"End Time: {datetime.now().isoformat()}")
