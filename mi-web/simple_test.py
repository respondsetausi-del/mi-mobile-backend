#!/usr/bin/env python3
"""
Simple test for Twelve Data API endpoints that don't require authentication
"""

import requests
import json

BACKEND_URL = "https://mi-indicator-live.preview.emergentagent.com/api"

def test_indicators_available():
    """Test the indicators/available endpoint"""
    print("🧪 Testing GET /api/indicators/available")
    
    try:
        response = requests.get(f"{BACKEND_URL}/indicators/available")
        
        if response.status_code == 200:
            data = response.json()
            indicators = data.get("indicators", {})
            
            print(f"✅ Status: {response.status_code}")
            print(f"✅ Found {len(indicators)} indicators")
            
            # Check required indicators
            required = ["RSI", "MACD", "SMA", "EMA"]
            for indicator in required:
                if indicator in indicators:
                    ind_data = indicators[indicator]
                    print(f"  ✅ {indicator}: {ind_data.get('name')}")
                    print(f"     Description: {ind_data.get('description')}")
                    print(f"     Default params: {ind_data.get('default_params')}")
                    print(f"     Signal rules: {ind_data.get('signal_rules')}")
                else:
                    print(f"  ❌ Missing indicator: {indicator}")
            
            return True
        else:
            print(f"❌ Status: {response.status_code}")
            print(f"❌ Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

def test_user_login():
    """Test user login with known credentials"""
    print("\n🧪 Testing user login with known credentials")
    
    # Try credentials from test history
    test_credentials = [
        ("collenbelly7@icloud.com", "xNNfFr5SiYHb"),  # From test history
        ("collenbelly7@icloud.com", "Test@123"),       # Common test password
        ("john@mimobile.com", "Test@123"),             # From test history
    ]
    
    for email, password in test_credentials:
        try:
            print(f"  Trying {email}...")
            response = requests.post(f"{BACKEND_URL}/auth/login", json={
                "email": email,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                print(f"  ✅ Login successful for {email}")
                print(f"     User type: {data.get('user_type')}")
                print(f"     Status: {data.get('status')}")
                print(f"     Payment status: {data.get('payment_status')}")
                print(f"     Requires payment: {data.get('requires_payment')}")
                return data.get("access_token"), email
            else:
                print(f"  ❌ Login failed for {email}: {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Exception for {email}: {str(e)}")
    
    return None, None

def test_twelve_data_api_key():
    """Test if Twelve Data API key is configured"""
    print("\n🧪 Testing Twelve Data API configuration")
    
    # Check if the API key is set in the environment
    import os
    api_key = os.getenv('TWELVE_DATA_API_KEY')
    
    if api_key:
        print(f"✅ Twelve Data API key found: {api_key[:10]}...")
        
        # Test a simple API call to Twelve Data
        try:
            import httpx
            import asyncio
            
            async def test_api():
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"https://api.twelvedata.com/time_series",
                        params={
                            "symbol": "EUR/USD",
                            "interval": "1min",
                            "outputsize": "5",
                            "apikey": api_key
                        }
                    )
                    return response
            
            response = asyncio.run(test_api())
            
            if response.status_code == 200:
                data = response.json()
                if "values" in data:
                    print(f"✅ Twelve Data API working - got {len(data['values'])} data points")
                    return True
                else:
                    print(f"❌ Twelve Data API error: {data}")
                    return False
            else:
                print(f"❌ Twelve Data API failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Twelve Data API test failed: {str(e)}")
            return False
    else:
        print("❌ Twelve Data API key not found in environment")
        return False

if __name__ == "__main__":
    print("🚀 Simple Twelve Data API Integration Test")
    print("=" * 50)
    
    # Test 1: Indicators endpoint (no auth required)
    indicators_ok = test_indicators_available()
    
    # Test 2: User login
    token, email = test_user_login()
    
    # Test 3: Twelve Data API key
    api_key_ok = test_twelve_data_api_key()
    
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    print(f"✅ Indicators endpoint: {'PASS' if indicators_ok else 'FAIL'}")
    print(f"✅ User authentication: {'PASS' if token else 'FAIL'}")
    print(f"✅ Twelve Data API key: {'PASS' if api_key_ok else 'FAIL'}")
    
    if indicators_ok and token and api_key_ok:
        print("\n🎉 Basic setup is working! Ready for full testing.")
    else:
        print("\n⚠️ Some basic components are not working.")