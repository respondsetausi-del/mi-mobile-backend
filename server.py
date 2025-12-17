from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Body, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import random
from market_simulator import market_simulator
from real_market_data import real_market_data
from indicators import TechnicalIndicators, SignalGenerator
import httpx
import asyncio
from auth import (
    UserRegister, UserLogin, AdminLogin, Token,
    verify_password, get_password_hash, create_access_token, verify_token
)
from license_manager import LicenseManager
from models import User, Admin, UserActivity
import string
import secrets
import stripe
from email_service import email_service
from technical_analysis_service import get_technical_analysis_service

# Signal models
class ManualSignal(BaseModel):
    symbol: str
    signal_type: str  # "BUY" or "SELL"
    indicator: str
    candle_pattern: str
    timeframe: str
    notes: Optional[str] = None
    target_users: Optional[List[str]] = None  # List of user IDs, None means all users
    duration_seconds: int = 30  # Default 30 seconds

# Broker Affiliate models
class BrokerAffiliate(BaseModel):
    broker_name: str
    broker_image: str  # Base64 encoded image or URL
    affiliate_link: str
    description: Optional[str] = None

# Change Password model
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Market News model
class MarketNews(BaseModel):
    title: str
    event_time: str  # Time of the event (e.g., "14:30 UTC")
    currency: str  # Currency pair affected (e.g., "USD", "EUR")
    impact: str  # "High", "Medium", "Low"
    signal: Optional[str] = None  # "BUY" or "SELL" recommendation

# Manual News Event model (all fields optional except title)
class ManualNewsEvent(BaseModel):
    title: str  # Required
    event_time: Optional[str] = None  # Optional
    currency: Optional[str] = None  # Optional
    impact: Optional[str] = None  # Optional
    description: Optional[str] = None  # Optional
    signal: Optional[str] = None  # Optional: "BUY" or "SELL"

# Custom Indicator models
class IndicatorConfig(BaseModel):
    """Configuration for a single technical indicator"""
    indicator_type: str  # "RSI", "MACD", "MA", "EMA", "BOLLINGER", "STOCHASTIC"
    period: Optional[int] = None  # Period for calculation
    threshold_upper: Optional[float] = None  # Upper threshold (e.g., RSI > 70)
    threshold_lower: Optional[float] = None  # Lower threshold (e.g., RSI < 30)
    ma_type: Optional[str] = None  # "SMA", "EMA" for Moving Averages
    fast_period: Optional[int] = None  # For MACD
    slow_period: Optional[int] = None  # For MACD
    signal_period: Optional[int] = None  # For MACD signal line

class TradingCondition(BaseModel):
    """Buy or Sell condition"""
    condition_type: str  # "ABOVE", "BELOW", "CROSS_ABOVE", "CROSS_BELOW", "BETWEEN"
    indicator_ref: str  # Reference to indicator (e.g., "RSI", "MACD")
    value: Optional[float] = None  # Threshold value
    value_upper: Optional[float] = None  # For BETWEEN condition
    value_lower: Optional[float] = None  # For BETWEEN condition

class CustomIndicator(BaseModel):
    name: str  # Indicator name (e.g., "RSI Strategy", "MA Crossover")
    description: Optional[str] = None  # Optional description
    symbol: str  # Trading symbol to monitor (e.g., "EUR/USD", "EURUSD")
    timeframe: str  # Timeframe (e.g., "1H", "4H", "1D")
    indicators: List[IndicatorConfig]  # List of technical indicators to use
    buy_conditions: List[TradingCondition]  # Conditions for BUY signal
    sell_conditions: List[TradingCondition]  # Conditions for SELL signal
    
class IndicatorSignalUpdate(BaseModel):
    indicator_id: str
    signal: str  # "BUY", "SELL", or "NONE"
    
class UserIndicatorSelection(BaseModel):
    indicator_id: str

class IndicatorSubscriptionCreate(BaseModel):
    indicator_id: str
    symbol: str
    timeframe: str

class ManualOverrideSignal(BaseModel):
    indicator_id: str
    signal: str  # "BUY" or "SELL"


# Helper functions for mentor operations
def generate_license_key():
    """Generate a license key using LicenseManager"""
    return LicenseManager.generate_license_key()

def generate_random_string(length):
    """Generate a random string for temporary passwords"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for i in range(length))

def hash_password(password):
    """Hash a password using the auth module"""
    return get_password_hash(password)

ROOT_DIR = Path(__file__).parent
# Load .env file but don't override environment variables from Kubernetes
load_dotenv(ROOT_DIR / '.env', override=False)

# MongoDB connection - use .get() with fallback for development
mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.getenv('DB_NAME', 'mi_mobile_indicator')

print(f"🔍 Connecting to MongoDB: {mongo_url[:20]}...")
print(f"🔍 Database: {db_name}")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper function to serialize MongoDB documents
def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# Security
security = HTTPBearer()

# Dependency to get current user from JWT token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get current user for protected routes.
    IMPORTANT: Only allows users who have:
    1. Active account status (not deactivated)
    2. Paid status (payment_status = "paid")
    
    This ensures only paying customers can access app features.
    """
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    user_type = payload.get("type", "user")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    # Fetch user from database
    if user_type == "admin":
        user = await db.admins.find_one({"_id": ObjectId(user_id)})
    else:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # For regular users (not admins), enforce payment requirement
    if user_type != "admin":
        account_status = user.get("status")
        payment_status = user.get("payment_status", "unpaid")
        
        # Block deactivated accounts (admin explicitly deactivated them)
        if account_status == "inactive":
            raise HTTPException(status_code=403, detail="Account is deactivated. Please contact admin.")
        
        # Block unpaid accounts (must complete payment first)
        # This is the PRIMARY access control - payment_status must be "paid"
        if payment_status != "paid":
            raise HTTPException(
                status_code=403, 
                detail="Payment required. Please complete payment to access the app.",
                headers={"X-Payment-Required": "true"}
            )
        
        # If user has paid (payment_status="paid"), they get access
        # regardless of status field (unless explicitly deactivated above)
        # This allows existing users marked as paid to access the app
    
    return serialize_doc(user)

# Dependency for payment endpoints - allows pending users to pay
async def get_current_user_for_payment(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user for payment endpoints - allows pending status"""
    token = credentials.credentials
    payload = verify_token(token)
    user_id = payload.get("sub")
    user_type = payload.get("type", "user")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Fetch user from database
    if user_type == "admin":
        user = await db.admins.find_one({"_id": ObjectId(user_id)})
    else:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Allow pending users to access payment (they need to pay to proceed)
    # Only block if truly deactivated/inactive
    if user_type != "admin" and user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact admin.")
    
    return serialize_doc(user)

# Push Notification Helper Function
async def send_push_notifications_batch(messages: List[dict]):
    """
    Send push notifications in batch using Expo Push Notification Service
    
    Args:
        messages: List of notification messages in format:
            [{
                "to": "ExponentPushToken[xxx]",
                "sound": "default",
                "title": "Notification Title",
                "body": "Notification body text",
                "data": {"key": "value"}
            }]
    """
    if not messages:
        return
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://exp.host/--/api/v2/push/send',
                json=messages,
                headers={
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Push notifications sent successfully: {len(messages)} messages")
                
                # Log any errors from Expo
                if 'data' in result:
                    for idx, item in enumerate(result['data']):
                        if item.get('status') == 'error':
                            logger.error(f"Push notification error for message {idx}: {item.get('message')}")
            else:
                logger.error(f"❌ Push notification failed: {response.status_code} - {response.text}")
                
    except Exception as e:
        logger.error(f"❌ Error sending push notifications: {str(e)}")



# Dependency to get current admin
async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    # Check if user is from admins collection (has 'role' field)
    if 'role' not in user:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# Dependency to get current mentor
async def get_current_mentor(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    user_type = payload.get("type")
    
    if user_type != "mentor":
        raise HTTPException(status_code=403, detail="Mentor access required")
    
    # Fetch mentor from database
    mentor = await db.mentors.find_one({"_id": ObjectId(user_id)})
    
    if not mentor:
        raise HTTPException(status_code=401, detail="Mentor not found")
    
    if mentor.get("status") != "active":
        raise HTTPException(status_code=403, detail="Mentor account is not active")
    
    return serialize_doc(mentor)

# Optional auth - returns None if no token provided
async def get_current_user_optional(authorization: Optional[str] = Header(None)):
    if not authorization:
        return None
    try:
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        if payload:
            user_id = payload.get("sub")
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            return serialize_doc(user) if user else None
    except:
        return None
    return None

# Define Models
class IndicatorSettings(BaseModel):
    type: str  # MA_CROSSOVER, RSI, MACD, BOLLINGER_BANDS, STOCHASTIC
    parameters: Dict  # Custom parameters for each indicator

class EAConfig(BaseModel):
    symbol: str
    timeframe: str  # 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w
    indicator: IndicatorSettings

class EACreate(BaseModel):
    name: str
    config: EAConfig

class EAUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[EAConfig] = None
    status: Optional[str] = None

class Quote(BaseModel):
    symbol: str
    category: str
    bid: float
    ask: float
    change: float
    timestamp: str

class PushToken(BaseModel):
    token: str

# ==================== HEALTH CHECK ENDPOINT ====================

@api_router.get("/health")
async def health_check():
    """
    Lightweight health check endpoint for keep-alive service.
    Returns server status and uptime info.
    """
    return {
        "status": "healthy",
        "message": "Backend is alive and running",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected"
    }

@api_router.post("/initialize-database", response_model=dict)
async def initialize_database():
    """
    Initialize database with default admin, mentors, and test users.
    This endpoint should only be called once during initial setup.
    """
    try:
        result = {"status": "success", "created": [], "existing": []}
        
        # 1. CREATE ADMIN
        admin_email = "admin@signalmaster.com"
        existing_admin = await db.admins.find_one({"email": admin_email})
        
        if not existing_admin:
            admin_doc = {
                "email": admin_email,
                "password_hash": get_password_hash("Admin@123"),
                "name": "System Admin",
                "role": "super_admin",
                "permissions": ["view_users", "manage_users", "view_activity", "manage_licenses"],
                "created_at": datetime.utcnow(),
                "last_login": None
            }
            await db.admins.insert_one(admin_doc)
            result["created"].append("Admin: admin@signalmaster.com")
        else:
            result["existing"].append("Admin: admin@signalmaster.com")
        
        # 2. GENERATE LICENSE KEYS
        existing_licenses = await db.licenses.count_documents({})
        if existing_licenses < 20:
            keys_to_generate = 20 - existing_licenses
            keys = LicenseManager.generate_multiple_keys(keys_to_generate)
            licenses = [
                {
                    "key": key,
                    "used": False,
                    "created_at": datetime.utcnow(),
                    "created_by": "system"
                }
                for key in keys
            ]
            await db.licenses.insert_many(licenses)
            result["created"].append(f"{keys_to_generate} license keys")
        else:
            result["existing"].append(f"{existing_licenses} license keys")
        
        # Get available licenses
        available_licenses = await db.licenses.find({"used": False}).limit(10).to_list(length=10)
        
        # 3. CREATE MENTORS
        mentors_data = [
            {
                "email": "mentor1@signalmaster.com",
                "name": "John Mentor",
                "mentor_id": "MENTOR001",
                "company_name": "Signal Masters Pro",
                "max_users": 50
            },
            {
                "email": "mentor2@signalmaster.com",
                "name": "Sarah Mentor",
                "mentor_id": "MENTOR002",
                "company_name": "Forex Experts",
                "max_users": 30
            }
        ]
        
        for mentor_data in mentors_data:
            existing_mentor = await db.mentors.find_one({"email": mentor_data["email"]})
            if not existing_mentor:
                mentor_doc = {
                    "email": mentor_data["email"],
                    "password_hash": get_password_hash("Mentor@123"),
                    "name": mentor_data["name"],
                    "mentor_id": mentor_data["mentor_id"],
                    "company_name": mentor_data["company_name"],
                    "phone": "+1234567890",
                    "status": "active",
                    "max_users": mentor_data["max_users"],
                    "current_users": 0,
                    "branding": {
                        "logo_url": "",
                        "primary_color": "#00D9FF",
                        "company_name": mentor_data["company_name"]
                    },
                    "brokers": [],
                    "created_at": datetime.utcnow(),
                    "approved_at": datetime.utcnow(),
                    "last_login": None
                }
                await db.mentors.insert_one(mentor_doc)
                result["created"].append(f"Mentor: {mentor_data['email']}")
            else:
                result["existing"].append(f"Mentor: {mentor_data['email']}")
        
        # 4. CREATE TEST USERS
        if len(available_licenses) >= 3:
            test_users = [
                {
                    "email": "testuser@signalmaster.com",
                    "name": "Test User",
                    "mentor_id": "MENTOR001",
                    "status": "active",
                    "payment_status": "paid",
                    "approved": True
                },
                {
                    "email": "testuser2@signalmaster.com",
                    "name": "Test User 2",
                    "mentor_id": "MENTOR001",
                    "status": "pending",
                    "payment_status": "unpaid",
                    "approved": False
                },
                {
                    "email": "testuser3@signalmaster.com",
                    "name": "Test User 3",
                    "mentor_id": "MENTOR002",
                    "status": "pending",
                    "payment_status": "paid",
                    "approved": False
                }
            ]
            
            for idx, user_data in enumerate(test_users):
                if idx >= len(available_licenses):
                    break
                    
                existing_user = await db.users.find_one({"email": user_data["email"]})
                if not existing_user:
                    user_doc = {
                        "email": user_data["email"],
                        "password_hash": get_password_hash("Test@123"),
                        "name": user_data["name"],
                        "mentor_id": user_data["mentor_id"],
                        "license_key": available_licenses[idx]["key"],
                        "status": user_data["status"],
                        "payment_status": user_data["payment_status"],
                        "created_at": datetime.utcnow(),
                        "last_login": None
                    }
                    if user_data["approved"]:
                        user_doc["approved_at"] = datetime.utcnow()
                    
                    user_result = await db.users.insert_one(user_doc)
                    
                    # Mark license as used
                    await db.licenses.update_one(
                        {"key": available_licenses[idx]["key"]},
                        {"$set": {"used": True, "used_by": str(user_result.inserted_id), "used_at": datetime.utcnow()}}
                    )
                    result["created"].append(f"User: {user_data['email']}")
                else:
                    result["existing"].append(f"User: {user_data['email']}")
        
        # 5. CREATE INDEXES
        try:
            await db.users.create_index("email", unique=True)
            await db.admins.create_index("email", unique=True)
            await db.mentors.create_index("email", unique=True)
            await db.mentors.create_index("mentor_id", unique=True)
            await db.licenses.create_index("key", unique=True)
            result["created"].append("Database indexes")
        except:
            result["existing"].append("Database indexes")
        
        result["credentials"] = {
            "admin": {"email": "admin@signalmaster.com", "password": "Admin@123"},
            "mentors": [
                {"email": "mentor1@signalmaster.com", "password": "Mentor@123", "id": "MENTOR001"},
                {"email": "mentor2@signalmaster.com", "password": "Mentor@123", "id": "MENTOR002"}
            ],
            "users": [
                {"email": "testuser@signalmaster.com", "password": "Test@123", "status": "active_paid"},
                {"email": "testuser2@signalmaster.com", "password": "Test@123", "status": "unpaid"},
                {"email": "testuser3@signalmaster.com", "password": "Test@123", "status": "paid_pending_approval"}
            ]
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")


# ==================== AUTHENTICATION ROUTES ====================

@api_router.post("/auth/register", response_model=dict)
async def register_user(user_data: UserRegister):
    """Register a new user"""
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate license key
    is_valid = await LicenseManager.is_license_valid(db, user_data.license_key)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or already used license key")
    
    # Ensure mentor ID exists in mentors collection (create if doesn't exist)
    if user_data.mentor_id:
        existing_mentor = await db.mentors.find_one({"mentor_id": user_data.mentor_id})
        if not existing_mentor:
            # Create mentor record if it doesn't exist
            mentor_doc = {
                "mentor_id": user_data.mentor_id,
                "created_at": datetime.utcnow(),
                "created_by": "user_signup",
                "active": True,
                "copied": False,
                "copied_at": None,
                "total_referrals": 0
            }
            await db.mentors.insert_one(mentor_doc)
    
    # Create user with pending status (requires admin approval)
    hashed_password = get_password_hash(user_data.password)
    user_doc = {
        "email": user_data.email,
        "password_hash": hashed_password,
        "name": user_data.name,
        "mentor_id": user_data.mentor_id,
        "license_key": user_data.license_key,
        "status": "pending",  # Changed from "active" to "pending"
        "payment_status": "unpaid",  # New users must pay
        "created_at": datetime.utcnow(),
        "last_login": None
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Mark license as used and store user reference
    await db.licenses.update_one(
        {"key": user_data.license_key},
        {"$set": {"used": True, "used_by": user_id, "used_at": datetime.utcnow(), "user_email": user_data.email}}
    )
    
    # Increment mentor referral count
    if user_data.mentor_id:
        await db.mentors.update_one(
            {"mentor_id": user_data.mentor_id},
            {"$inc": {"total_referrals": 1}}
        )
    
    # Log activity
    await db.user_activity.insert_one({
        "user_id": user_id,
        "action": "user_registered",
        "details": {"email": user_data.email, "name": user_data.name, "mentor_id": user_data.mentor_id, "license_key": user_data.license_key},
        "timestamp": datetime.utcnow()
    })
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id, "type": "user"})
    
    return {
        "message": "Registration successful. Please complete payment to proceed.",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "status": "pending",
        "payment_required": True,  # Flag to indicate payment is needed
        "payment_status": "unpaid",
        "user": {
            "email": user_data.email,
            "name": user_data.name,
            "mentor_id": user_data.mentor_id
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login_user(login_data: UserLogin):
    """Login user"""
    logger.info(f"🔐 Login attempt for: {login_data.email}")
    user = await db.users.find_one({"email": login_data.email})
    
    if not user:
        logger.warning(f"❌ User not found: {login_data.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    logger.info(f"✅ User found: {user.get('email')} | Role: {user.get('role')}")
    logger.info(f"   Has password_hash: {bool(user.get('password_hash'))}")
    
    password_valid = verify_password(login_data.password, user["password_hash"])
    logger.info(f"   Password verification: {password_valid}")
    
    if not password_valid:
        logger.warning(f"❌ Invalid password for: {login_data.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check account status
    status = user.get("status")
    payment_status = user.get("payment_status", "unpaid")
    
    # Block only if deactivated by admin
    if status == "inactive":
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")
    
    # Allow pending users to login IF they have paid (automatic activation should have happened)
    # If pending but unpaid, they need to complete payment
    if status == "pending" and payment_status == "unpaid":
        # Allow login but frontend will redirect to payment
        pass
    elif status not in ["active", "pending"]:
        raise HTTPException(status_code=403, detail="Account is not active")
    
    user_id = str(user["_id"])
    
    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Log activity
    await db.user_activity.insert_one({
        "user_id": user_id,
        "action": "user_login",
        "details": {"email": login_data.email},
        "timestamp": datetime.utcnow()
    })
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id, "type": "user"})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": "user",
        "user_id": user_id,
        "user": {
            "email": user["email"],
            "name": user.get("name", user["email"].split("@")[0]),  # Default to email prefix if no name
            "mentor_id": user.get("mentor_id"),
            "status": user.get("status"),
            "payment_status": user.get("payment_status", "unpaid")
        },
        "payment_status": payment_status,  # Include payment status in response
        "status": status,  # Include account status
        "requires_payment": payment_status != "paid",  # Flag for frontend routing
        "requires_password_change": user.get("requires_password_change", False)
    }


@api_router.post("/auth/forgot-password")
async def forgot_password(email: str = Body(..., embed=True)):
    """
    User-facing password reset endpoint.
    Generates temporary password and emails it to the user.
    """
    try:
        # Find user by email
        user = await db.users.find_one({"email": email.lower()})
        
        if not user:
            # Don't reveal if email exists or not for security
            logger.info(f"Password reset attempted for non-existent email: {email}")
            # Still return success to prevent email enumeration
            return {
                "message": "If an account exists with this email, a temporary password has been sent."
            }
        
        # Generate temporary password
        temp_password = generate_random_string(12)
        password_hash = get_password_hash(temp_password)
        
        # Update user with new password and set requires_password_change flag
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_hash": password_hash,
                    "requires_password_change": True,
                    "password_reset_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"✅ Password reset for user: {email}")
        logger.info(f"🔑 TEMPORARY PASSWORD FOR {email}: {temp_password}")
        
        # Send email with temporary password
        email_sent = await email_service.send_password_reset_email(
            to_email=email,
            user_name=user.get("name", "User"),
            temporary_password=temp_password
        )
        
        if email_sent:
            logger.info(f"✅ Password reset email sent to: {email}")
        else:
            logger.warning(f"⚠️ Email service unavailable, but password was reset for: {email}")
            logger.warning(f"📧 MANUAL ACTION REQUIRED: Send this password to {email}: {temp_password}")
        
        # Log activity
        await db.user_activity.insert_one({
            "user_id": str(user["_id"]),
            "action": "password_reset_requested",
            "details": {"email": email, "email_sent": email_sent},
            "timestamp": datetime.utcnow()
        })
        
        return {
            "message": "If an account exists with this email, a temporary password has been sent.",
            "email_sent": email_sent
        }
        
    except Exception as e:
        logger.error(f"Error in mentor forgot password: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process password reset")


@api_router.post("/auth/reset-password-with-license")
async def reset_password_with_license_key(email: str = Body(...), license_key: str = Body(...)):
    """
    Reset password using email and license key.
    This allows users to reset their password if they have their license key.
    """
    try:
        # Find user with matching email and license key
        user = await db.users.find_one({
            "email": email.lower(),
            "license_key": license_key.upper()  # License keys are typically uppercase
        })
        
        if not user:
            # Don't reveal if user exists for security
            logger.info(f"Password reset attempted with invalid email/license: {email}")
            # Still return success to prevent enumeration
            return {
                "message": "If the email and license key match an account, a temporary password has been generated.",
                "success": False
            }
        
        # Generate temporary password
        temp_password = generate_random_string(12)
        password_hash = get_password_hash(temp_password)
        
        # Update user password
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_hash": password_hash,
                    "requires_password_change": True,
                    "password_reset_at": datetime.utcnow(),
                    "password_reset_method": "license_key"
                }
            }
        )
        
        logger.info(f"✅ Password reset via license key for user: {email}")
        logger.info(f"🔑 TEMPORARY PASSWORD FOR {email}: {temp_password}")
        
        # Send email with temporary password
        email_sent = await email_service.send_password_reset_email(
            to_email=email,
            user_name=user.get("name", "User"),
            temporary_password=temp_password
        )
        
        if email_sent:
            logger.info(f"✅ Password reset email sent to: {email}")
        else:
            logger.warning(f"⚠️ Email service unavailable, but password was reset for: {email}")
            logger.warning(f"📧 MANUAL ACTION REQUIRED: Send this password to {email}: {temp_password}")
        
        # Log activity
        await db.user_activity.insert_one({
            "user_id": str(user["_id"]),
            "action": "password_reset_via_license_key",
            "details": {
                "email": email,
                "license_key": license_key,
                "email_sent": email_sent
            },
            "timestamp": datetime.utcnow()
        })
        
        return {
            "message": "Password reset successfully! A temporary password has been generated.",
            "success": True,
            "temporary_password": temp_password,
            "email_sent": email_sent,
            "user_email": email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in license key password reset: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process password reset")


@api_router.post("/auth/reset-password-with-license-direct")
async def reset_password_with_license_direct(
    email: str = Body(...),
    license_key: str = Body(...),
    new_password: str = Body(...)
):
    """
    Reset password directly with email, license key, and new password.
    User provides their new password directly - no temporary password needed.
    """
    try:
        # Validate new password
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
        # Find user with matching email and license key
        user = await db.users.find_one({
            "email": email.lower(),
            "license_key": license_key.upper()
        })
        
        if not user:
            # Don't reveal if user exists for security
            logger.info(f"Password reset attempted with invalid email/license: {email}")
            return {
                "message": "If the email and license key match an account, your password has been reset.",
                "success": False
            }
        
        # Hash the new password
        password_hash = get_password_hash(new_password)
        
        # Update user password
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_hash": password_hash,
                    "requires_password_change": False,
                    "password_reset_at": datetime.utcnow(),
                    "password_reset_method": "license_key_direct"
                }
            }
        )
        
        logger.info(f"✅ Password reset directly via license key for user: {email}")
        logger.info(f"🔑 User can now login with their new password: {email}")
        
        # Log activity
        await db.user_activity.insert_one({
            "user_id": str(user["_id"]),
            "action": "password_reset_direct_via_license_key",
            "details": {
                "email": email,
                "license_key": license_key
            },
            "timestamp": datetime.utcnow()
        })
        
        return {
            "message": "Password reset successfully! You can now login with your new password.",
            "success": True,
            "user_email": email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in direct license key password reset: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process password reset")


@api_router.post("/auth/reset-password-license-only")
async def reset_password_license_only(
    email: str = Body(...),
    license_key: str = Body(...),
    new_password: str = Body(...)
):
    """
    Reset password using email + license key + new password.
    Email identifies the user, license key authorizes the reset.
    Works for both users and mentors.
    Returns JWT token for auto-login.
    """
    try:
        # Validate inputs are not empty
        if not email or not email.strip():
            raise HTTPException(status_code=422, detail="Email is required")
        
        if not license_key or not license_key.strip():
            raise HTTPException(status_code=422, detail="License key is required")
        
        if not new_password or not new_password.strip():
            raise HTTPException(status_code=422, detail="New password is required")
        
        # Trim whitespace and validate password length
        email = email.strip()
        license_key = license_key.strip()
        new_password = new_password.strip()
        
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
        # Try to find user first with BOTH email and license key
        user = await db.users.find_one({
            "email": email.lower(),
            "license_key": license_key.upper()
        })
        user_type = "user"
        
        # If not found in users, try mentors
        if not user:
            user = await db.mentors.find_one({
                "email": email.lower(),
                "license_key": license_key.upper()
            })
            user_type = "mentor"
        
        # If still not found, return error
        if not user:
            logger.info(f"Password reset attempted with invalid email/license: {email}")
            raise HTTPException(status_code=404, detail="Invalid email or license key combination")
        
        # Hash the new password
        password_hash = get_password_hash(new_password)
        
        # Update password in the appropriate collection
        collection = db.users if user_type == "user" else db.mentors
        await collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_hash": password_hash,
                    "requires_password_change": False,
                    "password_reset_at": datetime.utcnow(),
                    "password_reset_method": "email_license_key"
                }
            }
        )
        
        logger.info(f"✅ Password reset via email+license for {user_type}: {user.get('email', 'N/A')}")
        
        # Log activity
        activity_collection = db.user_activity if user_type == "user" else db.mentor_activity
        await activity_collection.insert_one({
            "user_id": str(user["_id"]),
            "action": "password_reset_via_email_license_key",
            "details": {
                "email": email,
                "license_key": license_key,
                "user_type": user_type
            },
            "timestamp": datetime.utcnow()
        })
        
        # Generate JWT token for auto-login
        access_token = create_access_token(
            data={
                "sub": str(user["_id"]),
                "type": user_type
            }
        )
        
        # Prepare user data for response
        user_data = {
            "user_id": str(user["_id"]),
            "email": user.get("email", ""),
            "name": user.get("name", ""),
            "user_type": user_type,
            "status": user.get("status", "active"),
            "payment_status": user.get("payment_status", "paid"),
            "mentor_id": user.get("mentor_id", "")
        }
        
        return {
            "message": "Password reset successful! You are now logged in.",
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data,
            "requires_payment": user.get("payment_status") != "paid",
            "requires_password_change": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in license-only password reset: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process password reset")


@api_router.post("/mentor/forgot-password")
async def mentor_forgot_password(email: str = Body(..., embed=True)):
    """
    Mentor password reset endpoint.
    Generates temporary password and emails it to the mentor.
    """
    try:
        # Find mentor by email
        mentor = await db.mentors.find_one({"email": email.lower()})
        
        if not mentor:
            # Don't reveal if email exists or not for security
            logger.info(f"Password reset attempted for non-existent mentor email: {email}")
            # Still return success to prevent email enumeration
            return {
                "message": "If a mentor account exists with this email, a temporary password has been sent."
            }
        
        # Generate temporary password
        temp_password = generate_random_string(12)
        password_hash = get_password_hash(temp_password)
        
        # Update mentor with new password
        await db.mentors.update_one(
            {"_id": mentor["_id"]},
            {
                "$set": {
                    "password_hash": password_hash,
                    "password_reset_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"✅ Password reset for mentor: {email}")
        
        # Send email with temporary password
        email_sent = await email_service.send_password_reset_email(
            to_email=email,
            user_name=mentor.get("name", "Mentor"),
            temporary_password=temp_password,
            is_mentor=True
        )
        
        if email_sent:
            logger.info(f"✅ Password reset email sent to mentor: {email}")
        else:
            logger.warning(f"⚠️ Email service unavailable, but password was reset for mentor: {email}")
        
        # Log activity
        await db.mentor_activity.insert_one({
            "mentor_id": str(mentor["_id"]),
            "action": "password_reset_requested",
            "details": {"email": email, "email_sent": email_sent},
            "timestamp": datetime.utcnow()
        })
        
        return {
            "message": "If a mentor account exists with this email, a temporary password has been sent.",
            "email_sent": email_sent,
            "temp_password": temp_password if not email_sent else None  # Include temp password if email fails
        }
        
    except Exception as e:
        logger.error(f"Error in mentor forgot password: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process password reset")



@api_router.post("/auth/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user = Depends(get_current_user_for_payment)
):
    """Change user password - allows users who haven't paid yet"""
    user_id_str = current_user["_id"]
    current_password = request.current_password
    new_password = request.new_password
    
    # Get user from database (convert string ID to ObjectId)
    user = await db.users.find_one({"_id": ObjectId(user_id_str)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    
    # Hash new password
    new_password_hash = get_password_hash(new_password)
    
    # Update password and remove requires_password_change flag
    result = await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": new_password_hash,
                "requires_password_change": False,
                "password_changed_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count > 0:
        # Log activity
        await db.user_activity.insert_one({
            "user_id": user_id_str,
            "action": "password_changed",
            "details": {"email": user.get("email")},
            "timestamp": datetime.utcnow()
        })
        
        return {"message": "Password changed successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to change password")

@api_router.get("/user/profile")
async def get_user_profile(current_user = Depends(get_current_user_for_payment)):
    """Get current user profile - allows checking status for all authenticated users"""
    # current_user is already the full user document from get_current_user_for_payment
    # Return all relevant fields including payment_status
    
    return {
        "email": current_user.get("email"),
        "name": current_user.get("name"),
        "mentor_id": current_user.get("mentor_id"),
        "license_key": current_user.get("license_key"),
        "status": current_user.get("status"),
        "payment_status": current_user.get("payment_status", "unpaid"),
        "created_at": current_user.get("created_at")
    }

@api_router.get("/user/mentor-info")
async def get_user_mentor_info(current_user = Depends(get_current_user)):
    """Get mentor information for current user"""
    user_id = current_user["_id"]
    
    # Convert to ObjectId if it's a string
    if isinstance(user_id, str):
        from bson import ObjectId
        user_id = ObjectId(user_id)
    
    # Get user
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    mentor_id = user.get("mentor_id")
    if not mentor_id:
        return {"system_name": "Signal Master", "background_image": None, "background_color": None}
    
    # Get mentor info
    mentor = await db.mentors.find_one({"mentor_id": mentor_id})
    if mentor:
        return {
            "mentor_id": mentor_id,
            "system_name": mentor.get("system_name") or "Signal Master",
            "background_image": mentor.get("background_image", None),
            "background_color": mentor.get("background_color", None)
        }
    
    return {"mentor_id": mentor_id, "system_name": "Signal Master", "background_image": None, "background_color": None}

@api_router.post("/admin/login", response_model=dict)
async def login_admin(login_data: AdminLogin):
    """Login admin"""
    admin = await db.admins.find_one({"email": login_data.email})
    if not admin or not verify_password(login_data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    admin_id = str(admin["_id"])
    
    # Update last login
    await db.admins.update_one(
        {"_id": admin["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create access token
    access_token = create_access_token(data={"sub": admin_id, "type": "admin"})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": "admin",
        "user_id": admin_id,
        "admin": {
            "email": admin["email"],
            "name": admin["name"],
            "role": admin.get("role", "admin")
        }
    }

@api_router.post("/mentor/register", response_model=dict)
async def register_mentor(
    name: str = Body(...),
    email: str = Body(...),
    phone: str = Body(...),
    social_media: str = Body(...),
    license_key: str = Body(...),
    password: str = Body(...),
    company_name: str = Body(None)  # Optional field
):
    """Register a new mentor (requires admin approval and valid license key)"""
    # Check if mentor already exists
    existing = await db.mentors.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate license key exists and is not used
    license_doc = await db.licenses.find_one({
        "key": license_key,
        "used": False
    })
    
    if not license_doc:
        raise HTTPException(
            status_code=400, 
            detail="Invalid or already used license key. Please contact admin for a license key."
        )
    
    # Create mentor with pending status
    mentor_data = {
        "name": name,
        "email": email,
        "phone": phone,
        "social_media": social_media,
        "password_hash": get_password_hash(password),
        "password_plain": password,  # Temporary storage for email
        "license_key": license_key,
        "status": "pending",  # Requires admin approval
        "max_users": 50,
        "max_licenses": 100,
        "created_at": datetime.now()
    }
    
    # Only add company_name if provided
    if company_name:
        mentor_data["company_name"] = company_name
    
    result = await db.mentors.insert_one(mentor_data)
    
    # Mark license key as used by mentor
    await db.licenses.update_one(
        {"_id": license_doc["_id"]},
        {"$set": {
            "used": True,
            "used_by": email,
            "used_by_type": "mentor",
            "used_at": datetime.now()
        }}
    )
    
    return {
        "message": "Registration successful! Please wait for admin approval. You will receive an email with your login credentials once approved.",
        "status": "pending"
    }

@api_router.post("/mentor/login", response_model=dict)
async def login_mentor(login_data: AdminLogin):
    """Login mentor"""
    logger.info(f"🔐 Mentor login attempt: {login_data.email}")
    mentor = await db.mentors.find_one({"email": login_data.email})
    
    if not mentor:
        logger.warning(f"❌ Mentor not found: {login_data.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    logger.info(f"✅ Mentor found!")
    logger.info(f"   Mentor ID: {mentor.get('mentor_id')}")
    logger.info(f"   Email: {mentor.get('email')}")
    logger.info(f"   Status: {mentor.get('status')}")
    logger.info(f"   _id: {mentor.get('_id')}")
    logger.info(f"   Keys in mentor doc: {list(mentor.keys())}")
    logger.info(f"   Has password_hash key: {'password_hash' in mentor}")
    logger.info(f"   mentor.get('password_hash'): {mentor.get('password_hash')}")
    logger.info(f"   bool(mentor.get('password_hash')): {bool(mentor.get('password_hash'))}")
    if mentor.get("password_hash"):
        logger.info(f"   Password hash starts with: {mentor.get('password_hash')[:10]}")
    
    # Check if mentor is approved
    if mentor.get("status") != "active":
        if mentor.get("status") == "pending":
            raise HTTPException(
                status_code=403, 
                detail="Your account is pending admin approval. Please wait for approval."
            )
        elif mentor.get("status") == "declined":
            raise HTTPException(
                status_code=403, 
                detail="Your account registration was declined. Please contact support."
            )
        else:
            raise HTTPException(status_code=403, detail="Account is not active.")
    
    # Check if mentor has password_hash
    if not mentor.get("password_hash"):
        logger.error(f"❌ Mentor missing password_hash field!")
        raise HTTPException(
            status_code=401, 
            detail="Account not activated. Please contact admin to set up your password."
        )
    
    if not verify_password(login_data.password, mentor["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if mentor is active
    if mentor.get("status") != "active":
        raise HTTPException(
            status_code=403, 
            detail=f"Your mentor account is {mentor.get('status', 'inactive')}. Please contact admin."
        )
    
    mentor_id_str = str(mentor["_id"])
    
    # Update last login
    await db.mentors.update_one(
        {"_id": mentor["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create access token with mentor role
    access_token = create_access_token(
        data={
            "sub": mentor_id_str, 
            "type": "mentor",
            "mentor_id": mentor.get("mentor_id")
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": "mentor",
        "user_id": mentor_id_str,
        "mentor": {
            "email": mentor["email"],
            "mentor_id": mentor.get("mentor_id"),
            "company_name": mentor.get("company_name"),
            "system_name": mentor.get("system_name"),
            "status": mentor.get("status")
        }
    }

@api_router.get("/auth/me")
async def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current logged in user info"""
    return {"user": current_user}

# ==================== MENTOR ROUTES ====================

@api_router.get("/mentor/dashboard")
async def get_mentor_dashboard(current_mentor = Depends(get_current_mentor)):
    """Get mentor dashboard statistics"""
    mentor_id = current_mentor.get("mentor_id")
    
    # Get users under this mentor
    users = await db.users.find({"mentor_id": mentor_id}).to_list(length=None)
    
    # Get licenses for this mentor
    licenses = await db.licenses.find({"mentor_id": mentor_id}).to_list(length=None)
    
    stats = {
        "total_users": len(users),
        "active_users": len([u for u in users if u.get("status") == "active"]),
        "pending_users": len([u for u in users if u.get("status") == "pending"]),
        "inactive_users": len([u for u in users if u.get("status") == "inactive"]),
        "total_licenses": len(licenses),
        "used_licenses": len([l for l in licenses if l.get("used")]),
        "available_licenses": len([l for l in licenses if not l.get("used")]),
        "mentor": {
            "mentor_id": mentor_id,
            "company_name": current_mentor.get("company_name"),
            "system_name": current_mentor.get("system_name"),
            "background_image": current_mentor.get("background_image"),
            "background_color": current_mentor.get("background_color"),
            "max_users": current_mentor.get("max_users", 50),
            "max_licenses": current_mentor.get("max_licenses", 100)
        }
    }
    
    return stats

@api_router.get("/mentor/users")
async def get_mentor_users(current_mentor = Depends(get_current_mentor)):
    """Get all users under this mentor"""
    mentor_id = current_mentor.get("mentor_id")
    
    users = await db.users.find({"mentor_id": mentor_id}).to_list(length=None)
    
    return {"users": [serialize_doc(user) for user in users]}

@api_router.post("/mentor/users/{user_id}/activate")
async def mentor_activate_user(user_id: str, current_mentor = Depends(get_current_mentor)):
    """Activate a user (mentor only for their users) - Grants full access regardless of payment status"""
    mentor_id = current_mentor.get("mentor_id")
    
    # Verify user belongs to this mentor
    user = await db.users.find_one({"_id": ObjectId(user_id), "mentor_id": mentor_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found or not under your mentor ID")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "status": "active",
                "payment_status": "paid",  # Mentor activation grants paid status
                "approved_at": datetime.utcnow(),
                "approved_by": str(current_mentor["_id"]),
                "approval_method": "mentor"
            }
        }
    )
    
    if result.modified_count > 0:
        logger.info(f"✅ Mentor {current_mentor['email']} activated user {user_id} - Status: active, Payment: paid")
        return {"message": "User activated successfully and granted full access"}
    else:
        raise HTTPException(status_code=400, detail="Failed to activate user")

@api_router.post("/mentor/users/{user_id}/deactivate")
async def mentor_deactivate_user(user_id: str, current_mentor = Depends(get_current_mentor)):
    """Deactivate a user (mentor only for their users)"""
    mentor_id = current_mentor.get("mentor_id")
    
    # Verify user belongs to this mentor
    user = await db.users.find_one({"_id": ObjectId(user_id), "mentor_id": mentor_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found or not under your mentor ID")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "inactive"}}
    )
    
    if result.modified_count > 0:
        return {"message": "User deactivated successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to deactivate user")

@api_router.post("/mentor/users/{user_id}/reset-password")
async def mentor_reset_user_password(user_id: str, current_mentor = Depends(get_current_mentor)):
    """
    Reset user password (mentor only for their users).
    Sends email notification to user with temporary password.
    """
    mentor_id = current_mentor.get("mentor_id")
    
    # Verify user belongs to this mentor
    user = await db.users.find_one({"_id": ObjectId(user_id), "mentor_id": mentor_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found or not under your mentor ID")
    
    # Generate temporary password
    temp_password = generate_random_string(12)
    password_hash = hash_password(temp_password)
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "password_hash": password_hash,
            "requires_password_change": True,
            "password_reset_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count > 0:
        # Send email notification to user
        user_email = user.get("email")
        user_name = user.get("name", "User")
        
        logger.info(f"✅ Mentor {mentor_id} reset password for user: {user_email}")
        logger.info(f"🔑 TEMPORARY PASSWORD FOR {user_email}: {temp_password}")
        
        email_sent = await email_service.send_password_reset_email(
            to_email=user_email,
            user_name=user_name,
            temporary_password=temp_password,
            is_mentor=False
        )
        
        if email_sent:
            logger.info(f"✅ Password reset email sent to user: {user_email} by mentor: {mentor_id}")
        else:
            logger.warning(f"⚠️ Email service unavailable, but password reset for: {user_email}")
            logger.warning(f"📧 MANUAL ACTION REQUIRED: Send this password to {user_email}: {temp_password}")
        
        # Log activity
        await db.user_activity.insert_one({
            "user_id": user_id,
            "mentor_id": mentor_id,
            "action": "password_reset_by_mentor",
            "details": {
                "user_email": user_email,
                "mentor_id": mentor_id,
                "email_sent": email_sent
            },
            "timestamp": datetime.utcnow()
        })
        
        return {
            "message": "Password reset successfully",
            "temporary_password": temp_password,
            "email_sent": email_sent,
            "user_email": user_email
        }
    else:
        raise HTTPException(status_code=400, detail="Failed to reset password")

@api_router.post("/mentor/licenses/generate")
async def mentor_generate_licenses(
    count: int = Body(..., embed=True),
    current_mentor = Depends(get_current_mentor)
):
    """Generate license keys (mentor for their own use)"""
    mentor_id = current_mentor.get("mentor_id")
    
    if count < 1 or count > 100:
        raise HTTPException(status_code=400, detail="Count must be between 1 and 100")
    
    # Check if mentor has reached max licenses
    current_licenses_count = await db.licenses.count_documents({"mentor_id": mentor_id})
    max_licenses = current_mentor.get("max_licenses", 100)
    
    if current_licenses_count + count > max_licenses:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot generate {count} licenses. Would exceed your limit of {max_licenses}"
        )
    
    license_keys = []
    for _ in range(count):
        license_key = generate_license_key()
        license_keys.append({
            "key": license_key,
            "mentor_id": mentor_id,
            "used": False,
            "used_by": None,
            "created_at": datetime.utcnow(),
            "copied": False,
            "copied_at": None
        })
    
    await db.licenses.insert_many(license_keys)
    
    return {
        "message": f"Generated {count} license keys",
        "license_keys": [lk["key"] for lk in license_keys]
    }

@api_router.get("/mentor/licenses")
async def get_mentor_licenses(current_mentor = Depends(get_current_mentor)):
    """Get all license keys for this mentor"""
    mentor_id = current_mentor.get("mentor_id")
    
    licenses = await db.licenses.find({"mentor_id": mentor_id}).to_list(length=None)
    
    return {"licenses": [serialize_doc(license) for license in licenses]}

@api_router.put("/mentor/branding/system-name")
async def update_mentor_system_name(
    system_name: str = Body(..., embed=True),
    current_mentor = Depends(get_current_mentor)
):
    """Update mentor's system name"""
    mentor_id = current_mentor.get("_id")
    
    result = await db.mentors.update_one(
        {"_id": ObjectId(mentor_id)},
        {"$set": {"system_name": system_name}}
    )
    
    if result.modified_count > 0:
        return {"message": "System name updated successfully", "system_name": system_name}
    else:
        raise HTTPException(status_code=400, detail="Failed to update system name")

@api_router.put("/mentor/branding/background")
async def update_mentor_background(
    background_image: Optional[str] = Body(None),
    background_color: Optional[str] = Body(None),
    current_mentor = Depends(get_current_mentor)
):
    """Update mentor's background image and color"""
    mentor_id = current_mentor.get("_id")
    
    update_fields = {}
    
    if background_image is not None:
        update_fields["background_image"] = background_image
        update_fields["background_image_updated_at"] = datetime.utcnow()
    
    if background_color is not None:
        update_fields["background_color"] = background_color
        update_fields["background_color_updated_at"] = datetime.utcnow()
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No background settings provided")
    
    result = await db.mentors.update_one(
        {"_id": ObjectId(mentor_id)},
        {"$set": update_fields}
    )
    
    if result.matched_count > 0:
        return {
            "message": "Background settings updated successfully",
            "background_image": update_fields.get("background_image"),
            "background_color": update_fields.get("background_color")
        }
    else:
        raise HTTPException(status_code=404, detail="Mentor not found")

@api_router.put("/mentor/branding")
async def update_mentor_branding_all(
    company_name: Optional[str] = Body(None),
    system_name: Optional[str] = Body(None),
    logo_url: Optional[str] = Body(None),
    background_image: Optional[str] = Body(None),
    primary_color: Optional[str] = Body(None),
    rgb_overlay: Optional[dict] = Body(None),
    current_mentor = Depends(get_current_mentor)
):
    """Update all mentor branding settings at once"""
    mentor_id = current_mentor.get("_id")
    
    update_fields = {}
    branding_fields = {}
    
    # Top-level fields
    if company_name is not None:
        update_fields["company_name"] = company_name
    
    # Branding nested fields
    if system_name is not None:
        branding_fields["system_name"] = system_name
    if logo_url is not None:
        branding_fields["logo_url"] = logo_url
    if background_image is not None:
        branding_fields["background_image"] = background_image
    if primary_color is not None:
        branding_fields["primary_color"] = primary_color
    if rgb_overlay is not None:
        branding_fields["rgb_overlay"] = rgb_overlay
    
    # Update branding object
    if branding_fields:
        for key, value in branding_fields.items():
            update_fields[f"branding.{key}"] = value
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No branding settings provided")
    
    update_fields["updated_at"] = datetime.utcnow()
    
    result = await db.mentors.update_one(
        {"_id": ObjectId(mentor_id)},
        {"$set": update_fields}
    )
    
    if result.matched_count > 0:
        return {
            "message": "Branding updated successfully",
            "updated_fields": list(update_fields.keys())
        }
    else:
        raise HTTPException(status_code=404, detail="Mentor not found")

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users")
async def get_all_users(current_admin = Depends(get_current_admin)):
    """Get all users (admin only)"""
    users = await db.users.find().to_list(1000)
    return {"users": [serialize_doc(user) for user in users]}

@api_router.get("/admin/users/{user_id}")
async def get_user_by_id(user_id: str, current_admin = Depends(get_current_admin)):
    """Get specific user details (admin only)"""
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return serialize_doc(user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/admin/users/{user_id}")
async def update_user_by_admin(
    user_id: str, 
    update_data: dict,
    current_admin = Depends(get_current_admin)
):
    """Update user status or details (admin only)"""
    try:
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {**update_data, "updated_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/admin/users/{user_id}/eas")
async def get_user_eas(user_id: str, current_admin = Depends(get_current_admin)):
    """Get all EAs for a specific user (admin only)"""
    eas = await db.eas.find({"user_id": user_id}).to_list(1000)
    return [serialize_doc(ea) for ea in eas]

@api_router.get("/admin/activity")
async def get_activity_logs(
    limit: int = 100,
    current_admin = Depends(get_current_admin)
):
    """Get user activity logs (admin only)"""
    activities = await db.user_activity.find().sort("timestamp", -1).limit(limit).to_list(limit)
    return [serialize_doc(activity) for activity in activities]

@api_router.get("/admin/stats")
async def get_admin_stats(current_admin = Depends(get_current_admin)):
    """Get dashboard statistics (admin only)"""
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": "active"})
    pending_users = await db.users.count_documents({"status": "pending"})
    total_eas = await db.eas.count_documents({})
    total_licenses = await db.licenses.count_documents({})
    used_licenses = await db.licenses.count_documents({"used": True})
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "pending_users": pending_users,
        "inactive_users": total_users - active_users - pending_users,
        "total_eas": total_eas,
        "total_licenses": total_licenses,
        "used_licenses": used_licenses,
        "available_licenses": total_licenses - used_licenses
    }

@api_router.post("/admin/licenses/generate")
async def generate_licenses(
    count: int = Body(..., embed=True),
    current_admin = Depends(get_current_admin)
):
    """Generate new license keys (admin only)"""
    try:
        if count <= 0 or count > 1000:
            raise HTTPException(status_code=400, detail="Count must be between 1 and 1000")
        
        keys = LicenseManager.generate_multiple_keys(count)
        licenses = [
            {
                "key": key,
                "used": False,
                "created_at": datetime.utcnow(),
                "created_by": str(current_admin["_id"])
            }
            for key in keys
        ]
        # FIXED: Changed from db.license_keys to db.licenses to match the collection used everywhere else
        await db.licenses.insert_many(licenses)
        return {"message": f"Generated {count} license keys", "keys": keys}
    
    except Exception as e:
        print(f"Error generating license keys: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate license keys: {str(e)}")

@api_router.get("/admin/licenses")
async def get_all_licenses(current_admin = Depends(get_current_admin)):
    """Get all license keys (admin only)"""
    licenses = await db.licenses.find().sort("created_at", -1).to_list(1000)
    formatted_licenses = []
    for license in licenses:
        license_data = serialize_doc(license)
        # Add status field for compatibility
        if 'status' not in license_data:
            license_data['status'] = 'used' if license_data.get('used') else 'unused'
        formatted_licenses.append(license_data)
    return {"licenses": formatted_licenses}

@api_router.delete("/admin/licenses/{license_key}")
async def delete_license(license_key: str, current_admin = Depends(get_current_admin)):
    """Delete a license key (admin only)"""
    result = await db.licenses.delete_one({"key": license_key})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="License key not found")
    return {"message": "License deleted successfully"}

# Duplicate delete_user endpoint removed - see line 1039 for the complete implementation

@api_router.post("/admin/users/{user_id}/activate")
async def activate_user(user_id: str, current_admin = Depends(get_current_admin)):
    """Activate a user (admin only)"""
    try:
        # Get user first for email
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": "active", "updated_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Send approval email
        user_email = user.get('email', '')
        user_name = user.get('name', 'User')
        await email_service.send_approval_email(user_email, user_name)
        
        return {"message": "User activated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/admin/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, current_admin = Depends(get_current_admin)):
    """Deactivate a user (admin only)"""
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count > 0:
        return {"message": "User deactivated successfully"}
    else:
        raise HTTPException(status_code=404, detail="User not found")

@api_router.post("/admin/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, current_admin = Depends(get_current_admin)):
    """Generate temporary password for user (admin only)"""
    # Get user
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate secure temporary password (12 characters: letters, digits, special chars)
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
    
    # Hash the temporary password
    hashed_password = get_password_hash(temp_password)
    
    # Update user password and set flag for password change
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "password_hash": hashed_password,
                "requires_password_change": True,
                "password_reset_at": datetime.utcnow(),
                "password_reset_by": "admin"
            }
        }
    )
    
    if result.modified_count > 0:
        user_email = user.get('email', '')
        user_name = user.get('name', 'User')
        
        logger.info(f"✅ Admin reset password for user: {user_email}")
        logger.info(f"🔑 TEMPORARY PASSWORD FOR {user_email}: {temp_password}")
        
        # Log activity
        await db.user_activity.insert_one({
            "user_id": user_id,
            "action": "password_reset_by_admin",
            "details": {"email": user_email, "admin_id": str(current_admin["_id"])},
            "timestamp": datetime.utcnow()
        })
        
        # Send password reset email
        email_sent = await email_service.send_password_reset_email(user_email, user_name, temp_password, is_mentor=False)
        
        if not email_sent:
            logger.warning(f"📧 MANUAL ACTION REQUIRED: Send this password to {user_email}: {temp_password}")
        
        return {
            "message": "Temporary password generated successfully",
            "temporary_password": temp_password,
            "user_email": user.get("email")
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to reset password")

@api_router.post("/admin/mentors/{mentor_id}/reset-password")
async def reset_mentor_password(mentor_id: str, current_admin = Depends(get_current_admin)):
    """Generate temporary password for mentor (admin only)"""
    # Get mentor
    mentor = await db.mentors.find_one({"_id": ObjectId(mentor_id)})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    # Generate secure temporary password (12 characters: letters, digits, special chars)
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
    
    # Hash the temporary password
    hashed_password = get_password_hash(temp_password)
    
    # Update mentor password and set flag for password change
    result = await db.mentors.update_one(
        {"_id": ObjectId(mentor_id)},
        {
            "$set": {
                "password_hash": hashed_password,
                "requires_password_change": True,
                "password_reset_at": datetime.utcnow(),
                "password_reset_by": "admin"
            }
        }
    )
    
    if result.modified_count > 0:
        mentor_email = mentor.get('email', '')
        mentor_name = mentor.get('name', 'Mentor')
        
        logger.info(f"✅ Admin reset password for mentor: {mentor_email}")
        logger.info(f"🔑 TEMPORARY PASSWORD FOR {mentor_email}: {temp_password}")
        
        # Log activity
        await db.mentor_activity.insert_one({
            "mentor_id": mentor_id,
            "action": "password_reset_by_admin",
            "details": {"email": mentor_email, "admin_id": str(current_admin["_id"])},
            "timestamp": datetime.utcnow()
        })
        
        # Send password reset email (mentors use same email service)
        email_sent = await email_service.send_password_reset_email(mentor_email, mentor_name, temp_password, is_mentor=True)
        
        if not email_sent:
            logger.warning(f"📧 MANUAL ACTION REQUIRED: Send this password to mentor {mentor_email}: {temp_password}")
        
        return {
            "message": "Temporary password generated successfully for mentor",
            "temporary_password": temp_password,
            "mentor_email": mentor.get("email")
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to reset mentor password")

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_admin = Depends(get_current_admin)):
    """Delete a user permanently (admin only)"""
    try:
        # Get user info before deletion for logging
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete user
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count > 0:
            # Log the deletion
            await db.user_activity.insert_one({
                "user_id": user_id,
                "action": "user_deleted_by_admin",
                "details": {
                    "email": user.get("email"),
                    "name": user.get("name"),
                    "admin_id": str(current_admin["_id"])
                },
                "timestamp": datetime.utcnow()
            })
            
            # Also delete related data (EAs, payment transactions)
            await db.eas.delete_many({"user_id": user_id})
            await db.payment_transactions.delete_many({"user_id": user_id})
            
            return {"message": "User deleted successfully", "deleted_email": user.get("email")}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

@api_router.get("/admin/mentors")
async def get_mentors(current_admin = Depends(get_current_admin)):
    """Get all mentors (including pending)"""
    mentors = await db.mentors.find({}).to_list(length=None)
    
    result = []
    for mentor in mentors:
        # Count users for this mentor (only if mentor has mentor_id)
        user_count = 0
        if mentor.get("mentor_id"):
            user_count = await db.users.count_documents({"mentor_id": mentor.get("mentor_id")})
        
        # Get license keys for this mentor (only if mentor has mentor_id)
        licenses = []
        if mentor.get("mentor_id"):
            licenses = await db.licenses.find({"mentor_id": mentor.get("mentor_id")}).to_list(length=None)
        
        result.append({
            "_id": str(mentor.get("_id")),
            "name": mentor.get("name"),
            "email": mentor.get("email"),
            "phone": mentor.get("phone"),
            "social_media": mentor.get("social_media"),
            "license_key": mentor.get("license_key"),
            "mentor_id": mentor.get("mentor_id"),
            "company_name": mentor.get("company_name"),
            "status": mentor.get("status", "active"),
            "user_count": user_count,
            "created_at": mentor.get("created_at"),
            "licenses": [serialize_doc(lic) for lic in licenses]
        })
    
    return result

@api_router.post("/admin/mentor-access-keys/generate")
async def generate_mentor_access_keys(
    request_data: dict = Body(...),
    current_admin = Depends(get_current_admin)
):
    """Generate mentor access keys (admin only)"""
    count = request_data.get("count", 1)
    
    # Validate count
    if not isinstance(count, int) or count < 1 or count > 50:
        raise HTTPException(status_code=400, detail="Count must be between 1 and 50")
    
    keys = []
    
    for _ in range(count):
        # Generate unique access key
        access_key = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(16))
        access_key_formatted = f"MAK-{access_key[:4]}-{access_key[4:8]}-{access_key[8:12]}-{access_key[12:16]}"
        
        key_data = {
            "key": access_key_formatted,
            "used": False,
            "created_at": datetime.now(),
            "created_by": "admin"
        }
        
        await db.mentor_access_keys.insert_one(key_data)
        keys.append(access_key_formatted)
    
    return {
        "message": f"Generated {count} mentor access key(s)",
        "keys": keys
    }

@api_router.get("/admin/mentor-access-keys")
async def get_mentor_access_keys(current_admin = Depends(get_current_admin)):
    """Get all mentor access keys (admin only)"""
    keys = await db.mentor_access_keys.find({}).sort("created_at", -1).to_list(length=None)
    return [serialize_doc(key) for key in keys]

@api_router.post("/admin/mentors/{mentor_db_id}/approve")
async def approve_mentor(mentor_db_id: str, current_admin = Depends(get_current_admin)):
    """Approve a pending mentor and generate mentor ID"""
    from bson import ObjectId
    
    # Find pending mentor
    mentor = await db.mentors.find_one({"_id": ObjectId(mentor_db_id)})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    if mentor.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Mentor is not pending approval")
    
    # Generate unique mentor ID
    mentor_count = await db.mentors.count_documents({})
    mentor_id = f"MENTOR{str(mentor_count + 1).zfill(4)}"
    
    # Update mentor status and assign ID
    await db.mentors.update_one(
        {"_id": ObjectId(mentor_db_id)},
        {"$set": {
            "status": "active",
            "mentor_id": mentor_id,
            "approved_at": datetime.now()
        }}
    )
    
    # Send mentor approval email with credentials
    mentor_email = mentor.get("email")
    company_name = mentor.get("company_name", "")
    temp_password = mentor.get("password_plain")  # Password from registration
    email_service.send_mentor_approval_email(mentor_email, mentor_id, company_name, temp_password)
    
    # Prepare approval info
    approval_info = {
        "message": "Mentor approved successfully",
        "mentor_id": mentor_id,
        "email": mentor.get("email"),
        "name": mentor.get("name"),
        "company_name": company_name,
        "login_credentials": {
            "email": mentor_email,
            "password": temp_password if temp_password else "[Password set by mentor]",
            "login_url": "https://mi-indicator-live.preview.emergentagent.com/mentor-login"
        }
    }
    
    # Remove plain password from database after approval for security
    await db.mentors.update_one(
        {"_id": ObjectId(mentor_db_id)},
        {"$unset": {"password_plain": ""}}
    )
    
    return approval_info

@api_router.post("/admin/mentors/{mentor_db_id}/decline")
async def decline_mentor(mentor_db_id: str, current_admin = Depends(get_current_admin)):
    """Decline a pending mentor"""
    from bson import ObjectId
    
    # Find pending mentor
    mentor = await db.mentors.find_one({"_id": ObjectId(mentor_db_id)})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    if mentor.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Mentor is not pending approval")
    
    # Update mentor status to declined
    await db.mentors.update_one(
        {"_id": ObjectId(mentor_db_id)},
        {"$set": {
            "status": "declined",
            "declined_at": datetime.now()
        }}
    )
    
    return {
        "message": "Mentor registration declined",
        "email": mentor.get("email")
    }

@api_router.delete("/admin/mentors/{mentor_db_id}")
async def delete_mentor(mentor_db_id: str, current_admin = Depends(get_current_admin)):
    """
    Delete a mentor permanently (admin only).
    This will:
    1. Delete the mentor record from database
    2. Delete all associated license keys
    3. Delete all associated mentor access keys
    4. Log the deletion with user count
    
    Note: Users associated with this mentor_id will remain but will have an orphaned mentor_id.
    """
    from bson import ObjectId
    
    try:
        # Get mentor info before deletion
        mentor = await db.mentors.find_one({"_id": ObjectId(mentor_db_id)})
        if not mentor:
            raise HTTPException(status_code=404, detail="Mentor not found")
        
        mentor_id = mentor.get("mentor_id")
        mentor_email = mentor.get("email")
        
        # Count associated users before deletion (for logging)
        user_count = 0
        if mentor_id:
            user_count = await db.users.count_documents({"mentor_id": mentor_id})
        
        # Delete mentor record
        result = await db.mentors.delete_one({"_id": ObjectId(mentor_db_id)})
        
        if result.deleted_count > 0:
            # Delete all license keys associated with this mentor
            if mentor_id:
                deleted_licenses = await db.licenses.delete_many({"mentor_id": mentor_id})
                logger.info(f"Deleted {deleted_licenses.deleted_count} license keys for mentor {mentor_id}")
                
                # Delete all mentor access keys
                deleted_access_keys = await db.mentor_access_keys.delete_many({"mentor_id": mentor_id})
                logger.info(f"Deleted {deleted_access_keys.deleted_count} access keys for mentor {mentor_id}")
            
            # Log the deletion activity
            await db.user_activity.insert_one({
                "user_id": str(current_admin["_id"]),
                "action": "mentor_deleted_by_admin",
                "details": {
                    "mentor_db_id": mentor_db_id,
                    "mentor_id": mentor_id,
                    "email": mentor_email,
                    "user_count": user_count,
                    "admin_id": str(current_admin["_id"])
                },
                "timestamp": datetime.utcnow()
            })
            
            logger.info(f"✅ Deleted mentor {mentor_id} (email: {mentor_email}) who had {user_count} associated users")
            
            return {
                "message": "Mentor deleted successfully",
                "deleted_email": mentor_email,
                "mentor_id": mentor_id,
                "associated_users": user_count
            }
        else:
            raise HTTPException(status_code=404, detail="Mentor not found")
    except Exception as e:
        logger.error(f"Error deleting mentor: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete mentor: {str(e)}")

@api_router.post("/admin/mentors/{mentor_db_id}/deactivate")
async def deactivate_mentor(mentor_db_id: str, current_admin = Depends(get_current_admin)):
    """Deactivate a mentor (admin only)"""
    from bson import ObjectId
    
    try:
        result = await db.mentors.update_one(
            {"_id": ObjectId(mentor_db_id)},
            {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            return {"message": "Mentor deactivated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Mentor not found")
    except Exception as e:
        logger.error(f"Error deactivating mentor: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to deactivate mentor: {str(e)}")

@api_router.post("/admin/mentors/{mentor_db_id}/activate")
async def activate_mentor(mentor_db_id: str, current_admin = Depends(get_current_admin)):
    """Activate a mentor (admin only)"""
    from bson import ObjectId
    
    try:
        result = await db.mentors.update_one(
            {"_id": ObjectId(mentor_db_id)},
            {"$set": {"status": "active", "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            return {"message": "Mentor activated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Mentor not found")
    except Exception as e:
        logger.error(f"Error activating mentor: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to activate mentor: {str(e)}")

@api_router.post("/admin/mentors/create")
async def create_mentor(current_admin = Depends(get_current_admin)):
    """Create a new mentor ID for admin tracking (admin only)"""
    try:
        # Get the count of existing mentor records to generate sequential ID
        count = await db.mentor_ids.count_documents({})
        
        # Generate unique mentor ID
        max_attempts = 100
        for attempt in range(max_attempts):
            mentor_id = f"MENTOR{str(count + 1 + attempt).zfill(4)}"  # e.g., MENTOR0001, MENTOR0002
            
            # Check if this ID already exists in both collections
            existing_mentor_id = await db.mentor_ids.find_one({"mentor_id": mentor_id})
            existing_mentor = await db.mentors.find_one({"mentor_id": mentor_id})
            
            if not existing_mentor_id and not existing_mentor:
                # Found a unique ID, create it
                mentor_doc = {
                    "mentor_id": mentor_id,
                    "created_at": datetime.utcnow(),
                    "created_by": str(current_admin["_id"]),
                    "active": True,
                    "copied": False,
                    "copied_at": None,
                    "total_referrals": 0,
                    "status": "pending"  # Pending until actual mentor signs up
                }
                await db.mentor_ids.insert_one(mentor_doc)
                return {"message": "Mentor ID created successfully", "mentor_id": mentor_id}
        
        # If we couldn't generate a unique ID after 100 attempts
        raise HTTPException(status_code=500, detail="Failed to generate unique mentor ID")
    
    except Exception as e:
        print(f"Error creating mentor ID: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate mentor ID: {str(e)}")

@api_router.post("/admin/mentors/{mentor_id}/mark-copied")
async def mark_mentor_copied(mentor_id: str, current_admin = Depends(get_current_admin)):
    """Mark a mentor ID as copied (admin only)"""
    result = await db.mentors.update_one(
        {"mentor_id": mentor_id},
        {
            "$set": {
                "copied": True,
                "copied_at": datetime.utcnow(),
                "last_copied_by": str(current_admin["_id"])
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Mentor ID not found")
    
    return {"message": "Mentor ID marked as copied", "mentor_id": mentor_id}

@api_router.put("/admin/mentors/{mentor_id}/system-name")
async def update_mentor_system_name(
    mentor_id: str, 
    system_name: str = Body(..., embed=True),
    current_admin = Depends(get_current_admin)
):
    """Update system name for a mentor (admin only)"""
    # Validate system name
    if not system_name or len(system_name.strip()) == 0:
        raise HTTPException(status_code=400, detail="System name cannot be empty")
    
    if len(system_name) > 50:
        raise HTTPException(status_code=400, detail="System name must be 50 characters or less")
    
    # Update mentor system name
    result = await db.mentors.update_one(
        {"mentor_id": mentor_id},
        {
            "$set": {
                "system_name": system_name.strip(),
                "system_name_updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count > 0:
        return {"message": "System name updated successfully", "system_name": system_name.strip()}
    else:
        raise HTTPException(status_code=404, detail="Mentor not found")

@api_router.put("/admin/mentors/{mentor_id}/background-color")
async def update_mentor_background_color(
    mentor_id: str, 
    background_color: str = Body(..., embed=True),
    current_admin = Depends(get_current_admin)
):
    """Update background color for a mentor (admin only)"""
    # Validate hex color format
    import re
    if not re.match(r'^#[0-9A-Fa-f]{6}$', background_color):
        raise HTTPException(status_code=400, detail="Invalid color format. Use hex format like #0a0a0a")
    
    # Update mentor background color
    result = await db.mentors.update_one(
        {"mentor_id": mentor_id},
        {
            "$set": {
                "background_color": background_color,
                "background_color_updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count > 0:
        return {"message": "Background color updated successfully", "background_color": background_color}
    else:
        raise HTTPException(status_code=404, detail="Mentor not found")

@api_router.put("/admin/mentors/{mentor_id}/background-image")
async def update_mentor_background_image(
    mentor_id: str, 
    background_image: str = Body(..., embed=True),
    current_admin = Depends(get_current_admin)
):
    """Update background image URL for a mentor (admin only)"""
    # Validate URL format (optional - can be empty to remove image)
    if background_image and background_image.strip():
        import re
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        if not url_pattern.match(background_image.strip()):
            raise HTTPException(status_code=400, detail="Invalid URL format. Use a valid HTTP/HTTPS URL")
    
    # Update mentor background image (empty string removes it)
    result = await db.mentors.update_one(
        {"mentor_id": mentor_id},
        {
            "$set": {
                "background_image": background_image.strip() if background_image else None,
                "background_image_updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count > 0:
        return {"message": "Background image updated successfully", "background_image": background_image.strip() if background_image else None}
    else:
        raise HTTPException(status_code=404, detail="Mentor not found")

@api_router.put("/admin/mentors/{mentor_id}/background")
async def update_mentor_background(
    mentor_id: str, 
    background_image: Optional[str] = Body(None),
    background_color: Optional[str] = Body(None),
    current_admin = Depends(get_current_admin)
):
    """Update background image and/or color for a mentor (admin only)"""
    update_fields = {}
    
    # Handle background image (can be base64 or URL)
    if background_image is not None:
        # Allow base64 images or URLs or None to clear
        if background_image and background_image.strip():
            # Check if it's a base64 image
            if background_image.startswith('data:image'):
                update_fields["background_image"] = background_image
            else:
                # Validate as URL
                import re
                url_pattern = re.compile(
                    r'^https?://'  # http:// or https://
                    r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
                    r'localhost|'  # localhost...
                    r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
                    r'(?::\d+)?'  # optional port
                    r'(?:/?|[/?]\S+)$', re.IGNORECASE)
                
                if not url_pattern.match(background_image.strip()):
                    raise HTTPException(status_code=400, detail="Invalid URL format or base64 data")
                update_fields["background_image"] = background_image.strip()
        else:
            update_fields["background_image"] = None
        update_fields["background_image_updated_at"] = datetime.utcnow()
    
    # Handle background color (RGB format)
    if background_color is not None:
        # Allow rgb() format or None to clear
        if background_color and background_color.strip():
            import re
            # Validate rgb format: rgb(r, g, b)
            rgb_pattern = re.compile(r'^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$')
            match = rgb_pattern.match(background_color.strip())
            if not match:
                raise HTTPException(status_code=400, detail="Invalid color format. Use rgb(r, g, b) format")
            
            # Validate RGB values are in range 0-255
            r, g, b = int(match.group(1)), int(match.group(2)), int(match.group(3))
            if not (0 <= r <= 255 and 0 <= g <= 255 and 0 <= b <= 255):
                raise HTTPException(status_code=400, detail="RGB values must be between 0 and 255")
            
            update_fields["background_color"] = background_color.strip()
        else:
            update_fields["background_color"] = None
        update_fields["background_color_updated_at"] = datetime.utcnow()
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No background settings provided")
    
    # Update mentor background settings
    result = await db.mentors.update_one(
        {"mentor_id": mentor_id},
        {"$set": update_fields}
    )
    
    if result.matched_count > 0:
        return {
            "message": "Background settings updated successfully",
            "background_image": update_fields.get("background_image"),
            "background_color": update_fields.get("background_color")
        }
    else:
        raise HTTPException(status_code=404, detail="Mentor not found")


@api_router.get("/admin/users/pending")
async def get_pending_users(current_admin = Depends(get_current_admin)):
    """Get all pending users awaiting approval (admin only)"""
    pending_users = await db.users.find({"status": "pending"}).sort("created_at", -1).to_list(1000)
    return [serialize_doc(user) for user in pending_users]

@api_router.post("/admin/users/{user_id}/approve")
async def approve_user(user_id: str, current_admin = Depends(get_current_admin)):
    """Approve a pending user (admin only) - Grants full access regardless of payment status"""
    try:
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "status": "active",
                    "payment_status": "paid",  # Admin approval grants paid status
                    "approved_at": datetime.utcnow(),
                    "approved_by": str(current_admin["_id"]),
                    "approval_method": "admin"
                }
            }
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Log activity
        await db.user_activity.insert_one({
            "user_id": str(current_admin["_id"]),
            "action": "user_approved",
            "details": {"approved_user_id": user_id, "granted_paid_status": True},
            "timestamp": datetime.utcnow()
        })
        
        logger.info(f"✅ Admin {current_admin['email']} approved user {user_id} - Status: active, Payment: paid")
        
        return {"message": "User approved successfully and granted full access"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/admin/users/{user_id}/decline")
async def decline_user(user_id: str, current_admin = Depends(get_current_admin)):
    """Decline a pending user and delete their account (admin only)"""
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Release the license key
        if user.get("license_key"):
            await db.licenses.update_one(
                {"key": user["license_key"]},
                {"$set": {"used": False, "used_by": None, "used_at": None}}
            )
        
        # Delete user
        await db.users.delete_one({"_id": ObjectId(user_id)})
        
        # Log activity
        await db.user_activity.insert_one({
            "user_id": str(current_admin["_id"]),
            "action": "user_declined",
            "details": {"declined_user_id": user_id, "email": user.get("email")},
            "timestamp": datetime.utcnow()
        })
        
        return {"message": "User declined and removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== EA ROUTES (NOW PROTECTED) ====================
@api_router.post("/ea", response_model=dict)
async def create_ea(ea_input: EACreate, current_user = Depends(get_current_user)):
    """Create a new EA (requires authentication)"""
    user_id_str = str(current_user["_id"])
    ea_dict = {
        "user_id": user_id_str,  # Store as string for consistency
        "name": ea_input.name,
        "status": "stopped",
        "config": ea_input.config.dict(),
        "current_signal": "NEUTRAL",
        "last_price": 0.0,
        "previous_signal": "NEUTRAL",  # Track previous signal for notifications
        "notifications_enabled": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.eas.insert_one(ea_dict)
    ea_dict['_id'] = str(result.inserted_id)
    
    # Log activity
    await db.user_activity.insert_one({
        "user_id": user_id_str,
        "action": "ea_created",
        "details": {"ea_name": ea_input.name, "symbol": ea_input.config.symbol},
        "timestamp": datetime.utcnow()
    })
    
    logger.info(f"✅ Created EA '{ea_input.name}' for user {user_id_str}")
    
    return serialize_doc(ea_dict)

@api_router.get("/ea", response_model=List[dict])
async def get_all_eas(current_user = Depends(get_current_user)):
    """Get all EAs for the authenticated user"""
    user_id_str = str(current_user["_id"])
    eas = await db.eas.find({"user_id": user_id_str}).to_list(1000)
    
    # Update signals for running EAs and check for signal changes
    for ea in eas:
        if ea.get("status") == "running":
            signal_data = await calculate_signal(ea)
            current_signal = signal_data["signal"]
            previous_signal = ea.get("previous_signal", "NEUTRAL")
            
            # Check if signal changed
            if current_signal != previous_signal and current_signal != "NEUTRAL":
                # Send push notification
                await send_signal_notification(ea, current_signal, signal_data["price"])
                
                # Update previous signal
                await db.eas.update_one(
                    {"_id": ea["_id"]},
                    {"$set": {"previous_signal": current_signal}}
                )
            
            ea["current_signal"] = current_signal
            ea["last_price"] = signal_data["price"]
            ea["indicator_values"] = signal_data.get("indicator_values", {})
    
    return [serialize_doc(ea) for ea in eas]

@api_router.get("/ea/{ea_id}", response_model=dict)
async def get_ea(ea_id: str, current_user = Depends(get_current_user)):
    """Get a specific EA (requires authentication and ownership)"""
    try:
        ea = await db.eas.find_one({"_id": ObjectId(ea_id), "user_id": current_user["_id"]})
        if not ea:
            raise HTTPException(status_code=404, detail="EA not found")
        
        # Update signal if running
        if ea.get("status") == "running":
            signal_data = await calculate_signal(ea)
            ea["current_signal"] = signal_data["signal"]
            ea["last_price"] = signal_data["price"]
            ea["indicator_values"] = signal_data.get("indicator_values", {})
        
        return serialize_doc(ea)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/ea/{ea_id}", response_model=dict)
async def update_ea(ea_id: str, ea_update: EAUpdate, current_user = Depends(get_current_user)):
    """Update an EA (requires authentication and ownership)"""
    try:
        update_dict = {"updated_at": datetime.utcnow()}
        if ea_update.name is not None:
            update_dict["name"] = ea_update.name
        if ea_update.config is not None:
            update_dict["config"] = ea_update.config.dict()
        if ea_update.status is not None:
            update_dict["status"] = ea_update.status
        
        result = await db.eas.update_one(
            {"_id": ObjectId(ea_id), "user_id": current_user["_id"]},
            {"$set": update_dict}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="EA not found")
        
        ea = await db.eas.find_one({"_id": ObjectId(ea_id), "user_id": current_user["_id"]})
        return serialize_doc(ea)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/ea/{ea_id}")
async def delete_ea(ea_id: str, current_user = Depends(get_current_user)):
    """Delete an EA (requires authentication and ownership)"""
    try:
        user_id_str = str(current_user["_id"])
        logger.info(f"Attempting to delete EA {ea_id} for user {user_id_str}")
        
        result = await db.eas.delete_one({"_id": ObjectId(ea_id), "user_id": user_id_str})
        
        if result.deleted_count == 0:
            logger.warning(f"EA {ea_id} not found or doesn't belong to user {user_id_str}")
            raise HTTPException(status_code=404, detail="EA not found or doesn't belong to you")
        
        logger.info(f"✅ EA {ea_id} deleted successfully for user {user_id_str}")
        return {"message": "EA deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting EA: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/ea/{ea_id}/start")
async def start_ea(ea_id: str, current_user = Depends(get_current_user)):
    """Start an EA (requires authentication and ownership)"""
    try:
        user_id_str = str(current_user["_id"])
        result = await db.eas.update_one(
            {"_id": ObjectId(ea_id), "user_id": user_id_str},
            {"$set": {"status": "running", "updated_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="EA not found or doesn't belong to you")
        ea = await db.eas.find_one({"_id": ObjectId(ea_id), "user_id": user_id_str})
        return serialize_doc(ea)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting EA: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/ea/{ea_id}/stop")
async def stop_ea(ea_id: str, current_user = Depends(get_current_user)):
    """Stop an EA (requires authentication and ownership)"""
    try:
        user_id_str = str(current_user["_id"])
        result = await db.eas.update_one(
            {"_id": ObjectId(ea_id), "user_id": user_id_str},
            {"$set": {"status": "stopped", "updated_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="EA not found or doesn't belong to you")
        ea = await db.eas.find_one({"_id": ObjectId(ea_id), "user_id": user_id_str})
        return serialize_doc(ea)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping EA: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/indicators/available")
async def get_available_indicators():
    """Get list of available technical indicators with their default parameters"""
    try:
        indicators = {
            "RSI": {
                "name": "Relative Strength Index",
                "description": "Momentum oscillator measuring speed and magnitude of price changes",
                "default_params": {
                    "period": 14,
                    "oversold": 30,
                    "overbought": 70
                },
                "signal_rules": "RSI < 30 = BUY (Oversold), RSI > 70 = SELL (Overbought)"
            },
            "MACD": {
                "name": "Moving Average Convergence Divergence",
                "description": "Trend-following momentum indicator showing relationship between two moving averages",
                "default_params": {
                    "fast": 12,
                    "slow": 26,
                    "signal": 9
                },
                "signal_rules": "MACD crosses above signal line = BUY, MACD crosses below = SELL"
            },
            "SMA": {
                "name": "Simple Moving Average",
                "description": "Average price over a specified number of periods",
                "default_params": {
                    "period": 20
                },
                "signal_rules": "Price above SMA = BUY, Price below SMA = SELL"
            },
            "EMA": {
                "name": "Exponential Moving Average",
                "description": "Weighted moving average giving more importance to recent prices",
                "default_params": {
                    "period": 20
                },
                "signal_rules": "Price above EMA = BUY, Price below EMA = SELL"
            }
        }
        return {"indicators": indicators}
    except Exception as e:
        logger.error(f"Error getting available indicators: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ea/{ea_id}/calculate")
async def calculate_ea_signal(ea_id: str, current_user = Depends(get_current_user)):
    """Calculate indicator and signal for an EA using real-time data"""
    try:
        user_id_str = str(current_user["_id"])
        ea = await db.eas.find_one({"_id": ObjectId(ea_id), "user_id": user_id_str})
        
        if not ea:
            raise HTTPException(status_code=404, detail="EA not found or doesn't belong to you")
        
        # Get EA configuration
        config = ea.get("config", {})
        symbol = config.get("symbol", "EUR/USD")
        timeframe = config.get("timeframe", "15min")
        indicator_config = config.get("indicator", {})
        indicator_type = indicator_config.get("type", "RSI")
        indicator_params = indicator_config.get("params", {})
        
        logger.info(f"📊 Calculating {indicator_type} for {symbol} ({timeframe})")
        
        # Get technical analysis service
        ta_service = get_technical_analysis_service()
        
        # Calculate indicator and signal
        result = ta_service.calculate_indicator_and_signal(
            symbol=symbol,
            indicator_type=indicator_type,
            timeframe=timeframe,
            indicator_params=indicator_params
        )
        
        # Update EA with latest signal and price
        current_signal = result.get("signal", "NEUTRAL")
        current_price = result.get("current_price", 0)
        
        await db.eas.update_one(
            {"_id": ObjectId(ea_id)},
            {
                "$set": {
                    "current_signal": current_signal,
                    "last_price": current_price,
                    "last_calculated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"✅ {symbol} {indicator_type}: {current_signal} at {current_price}")
        
        return {
            "ea_id": str(ea["_id"]),
            "signal": current_signal,
            "price": current_price,
            "indicator_data": result,
            "timestamp": result.get("timestamp")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error calculating EA signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Push Notification Routes
@api_router.post("/push-token")
async def save_push_token(token_data: PushToken):
    try:
        # Store or update push token
        await db.push_tokens.update_one(
            {"token": token_data.token},
            {"$set": {"token": token_data.token, "updated_at": datetime.utcnow()}},
            upsert=True
        )
        return {"message": "Push token saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def send_signal_notification(ea: dict, signal: str, price: float):
    """Send push notification when signal changes"""
    try:
        # Get all push tokens
        tokens = await db.push_tokens.find().to_list(1000)
        
        if not tokens:
            return
        
        symbol = ea.get("config", {}).get("symbol", "Unknown")
        indicator = ea.get("config", {}).get("indicator", {}).get("type", "Unknown")
        
        # Prepare notification message
        title = f"🚨 {signal} Signal: {symbol}"
        body = f"{indicator} detected {signal} signal at {price:.5f}"
        
        # Send to Expo Push Notification service
        messages = []
        for token_doc in tokens:
            messages.append({
                "to": token_doc["token"],
                "sound": "default",
                "title": title,
                "body": body,
                "data": {
                    "ea_id": str(ea["_id"]),
                    "symbol": symbol,
                    "signal": signal,
                    "price": price
                },
                "priority": "high",
                "channelId": "default"
            })
        
        # Send notifications in batches
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://exp.host/--/api/v2/push/send',
                json=messages,
                timeout=10.0
            )
            logging.info(f"Notification sent: {response.status_code}")
    except Exception as e:
        logging.error(f"Error sending notification: {e}")

# Market Data Routes
@api_router.get("/symbols")
async def get_symbols():
    """Get all available trading symbols grouped by category"""
    return market_simulator.get_all_symbols()

@api_router.get("/quotes")
async def get_quotes(category: Optional[str] = None):
    """Get real-time market quotes from Finnhub & CoinGecko"""
    all_symbols = market_simulator.get_all_symbols()
    
    if category:
        all_symbols = {category: all_symbols.get(category, [])}
    
    quotes = []
    for cat, symbols in all_symbols.items():
        for symbol in symbols:
            # Try to get real market data first
            real_data = await real_market_data.get_price(symbol, cat)
            
            if real_data:
                # Use real market data
                quotes.append({
                    'symbol': symbol,
                    'category': cat,
                    'price': real_data['price'],
                    'bid': real_data['bid'],
                    'ask': real_data['ask'],
                    'change': real_data['change'],
                    'change_percent': real_data['change_percent'],
                    'source': 'real',  # Indicate real data
                    'timestamp': real_data['timestamp']
                })
            else:
                # Fallback to simulated data if real data fails
                price_data = market_simulator.get_current_price(symbol)
                if price_data:
                    history = market_simulator.get_price_history(symbol, 2)
                    change = 0
                    if len(history) >= 2:
                        change = ((price_data['bid'] - history[-2]['close']) / history[-2]['close']) * 100
                    
                    quotes.append({
                        'symbol': symbol,
                        'category': cat,
                        'price': price_data['bid'],
                        'bid': price_data['bid'],
                        'ask': price_data['ask'],
                        'change': change,
                        'change_percent': change,
                        'source': 'simulated',  # Indicate simulated data
                    })
    
    return quotes

@api_router.get("/market-data/{symbol}")
async def get_market_data(symbol: str, period: int = 100):
    """Get historical market data for a symbol"""
    history = market_simulator.get_price_history(symbol, period)
    current = market_simulator.get_current_price(symbol)
    
    if not current:
        raise HTTPException(status_code=404, detail="Symbol not found")
    
    return {
        "symbol": symbol,
        "current": current,
        "history": history
    }

# Signal Calculation Helper
async def calculate_signal(ea: dict) -> dict:
    """Calculate trading signal for an EA"""
    config = ea.get("config", {})
    symbol = config.get("symbol")
    indicator_config = config.get("indicator", {})
    
    if not symbol:
        return {"signal": "NEUTRAL", "price": 0.0}
    
    # Get market data
    history = market_simulator.get_price_history(symbol, 200)
    current = market_simulator.get_current_price(symbol)
    
    if not history or not current:
        return {"signal": "NEUTRAL", "price": 0.0}
    
    closes = [candle["close"] for candle in history]
    highs = [candle["high"] for candle in history]
    lows = [candle["low"] for candle in history]
    current_price = current["close"]
    
    indicator_type = indicator_config.get("type", "RSI")
    parameters = indicator_config.get("parameters", {})
    
    # Calculate indicator values
    indicator_values = {}
    
    if indicator_type == "MA_CROSSOVER":
        fast_period = parameters.get("fast_period", 10)
        slow_period = parameters.get("slow_period", 20)
        indicator_values = {
            "fast_ma": TechnicalIndicators.calculate_sma(closes, fast_period),
            "slow_ma": TechnicalIndicators.calculate_sma(closes, slow_period)
        }
    elif indicator_type == "RSI":
        period = parameters.get("period", 14)
        rsi_value = TechnicalIndicators.calculate_rsi(closes, period)
        indicator_values = {"value": rsi_value}
    elif indicator_type == "MACD":
        fast = parameters.get("fast", 12)
        slow = parameters.get("slow", 26)
        signal = parameters.get("signal", 9)
        indicator_values = TechnicalIndicators.calculate_macd(closes, fast, slow, signal)
    elif indicator_type == "BOLLINGER_BANDS":
        period = parameters.get("period", 20)
        std_dev = parameters.get("std_dev", 2.0)
        indicator_values = TechnicalIndicators.calculate_bollinger_bands(closes, period, std_dev)
    elif indicator_type == "STOCHASTIC":
        period = parameters.get("period", 14)
        k_smooth = parameters.get("k_smooth", 3)
        indicator_values = TechnicalIndicators.calculate_stochastic(highs, lows, closes, period, k_smooth)
    
    # Generate signal
    signal = SignalGenerator.generate_signal(
        indicator_type,
        indicator_values,
        parameters,
        current_price,
        closes
    )
    
    return {
        "signal": signal,
        "price": current_price,
        "indicator_values": indicator_values
    }

@api_router.get("/ea/{ea_id}/signal")
async def get_ea_signal(ea_id: str, current_user = Depends(get_current_user)):
    """Get current signal for an EA (requires authentication and ownership)"""
    try:
        ea = await db.eas.find_one({"_id": ObjectId(ea_id), "user_id": current_user["_id"]})
        if not ea:
            raise HTTPException(status_code=404, detail="EA not found")
        
        signal_data = await calculate_signal(ea)
        return signal_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/signals/{symbol}")
async def get_signal(symbol: str, timeframe: str = '1H', indicator: str = 'RSI'):
    """Get trading signal for a symbol using real market data"""
    # Determine category
    category = 'forex'
    if 'BTC' in symbol or 'ETH' in symbol or 'XRP' in symbol or 'LTC' in symbol or 'ADA' in symbol or 'DOT' in symbol:
        category = 'crypto'
    elif 'XAU' in symbol or 'XAG' in symbol or 'WTI' in symbol:
        category = 'metal'
    
    # Get real market data first
    real_data = await real_market_data.get_price(symbol, category)
    
    if real_data:
        # Get historical data for indicator calculation
        history = await real_market_data.get_historical_data(symbol, category, timeframe)
        current_price = real_data['price']
    else:
        # Fallback to simulated data
        history = market_simulator.get_price_history(symbol, 200)
        current = market_simulator.get_current_price(symbol)
        current_price = current['bid'] if current else 0
    
    # Calculate indicators
    closes = [h['close'] for h in history]
    
    signal = 'NEUTRAL'
    indicator_value = 0
    
    if indicator == 'RSI' and len(closes) >= 14:
        rsi_values = TechnicalIndicators.calculate_rsi(closes, period=14)
        if rsi_values:
            indicator_value = rsi_values[-1]
            signal = SignalGenerator.rsi_signal(indicator_value)
    elif indicator == 'MACD' and len(closes) >= 26:
        macd_line, signal_line, histogram = TechnicalIndicators.calculate_macd(closes)
        if macd_line and signal_line:
            indicator_value = histogram[-1] if histogram else 0
            signal = SignalGenerator.macd_signal(macd_line[-1], signal_line[-1])
    elif indicator == 'MA_CROSS' and len(closes) >= 50:
        fast_ma = TechnicalIndicators.calculate_sma(closes, period=20)
        slow_ma = TechnicalIndicators.calculate_sma(closes, period=50)
        if fast_ma and slow_ma:
            signal = SignalGenerator.ma_crossover_signal(fast_ma[-2:], slow_ma[-2:])
    elif indicator == 'BOLLINGER' and len(closes) >= 20:
        upper, middle, lower = TechnicalIndicators.calculate_bollinger_bands(closes, period=20)
        if upper and lower:
            indicator_value = current_price
            signal = SignalGenerator.bollinger_signal(current_price, upper[-1], middle[-1], lower[-1])
    
    return {
        'symbol': symbol,
        'signal': signal,
        'indicator': indicator,
        'indicator_value': round(indicator_value, 2),
        'current_price': round(current_price, 5),
        'timeframe': timeframe,
        'source': 'real' if real_data else 'simulated',
        'timestamp': datetime.utcnow().isoformat()
    }

# ============================================================================
# PAYMENT ENDPOINTS
# ============================================================================

# Pydantic models for payment
class CreateCheckoutRequest(BaseModel):
    origin_url: str = Field(..., description="Frontend origin URL for success/cancel redirects")

class PaymentStatusResponse(BaseModel):
    payment_status: str
    user_id: Optional[str] = None
    amount: Optional[float] = None
    payment_intent_id: str

# Initialize Stripe client
stripe_api_key = os.getenv("STRIPE_API_KEY")

@api_router.post("/payment/create-checkout")
async def create_payment_checkout(
    request: CreateCheckoutRequest,
    user: dict = Depends(get_current_user_for_payment)
):
    """
    Create a Stripe checkout session for redirect payment.
    User price: $35 USD
    """
    try:
        user_id = user['_id']
        user_email = user.get('email', '')
        
        # Check if user already paid
        if user.get('payment_status') == 'paid':
            raise HTTPException(status_code=400, detail="Payment already completed for this user")
        
        existing_payment = await db.payment_transactions.find_one({
            "user_id": user_id,
            "payment_status": "paid"
        })
        
        if existing_payment:
            raise HTTPException(status_code=400, detail="Payment already completed for this user")
        
        # Initialize Stripe
        stripe.api_key = stripe_api_key
        host_url = str(request.origin_url).rstrip('/')
        
        # Build success and cancel URLs
        success_url = f"{host_url}/waiting-approval?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{host_url}/payment-cancel"
        
        # Fixed price: $35 USD
        amount = 3500  # Stripe uses cents
        currency = "usd"
        
        # Create checkout session using standard Stripe SDK
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'product_data': {
                        'name': 'MI Mobile Indicator - Lifetime Access',
                        'description': 'Full access to forex trading signals and indicators',
                    },
                    'unit_amount': amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=user_email,
            metadata={
                "user_id": str(user_id),
                "user_email": user_email,
                "product": "lifetime_access"
            }
        )
        
        # Store transaction in database
        transaction_data = {
            "session_id": session.id,
            "user_id": str(user_id),
            "user_email": user_email,
            "amount": 35.00,  # Store in dollars for consistency
            "currency": currency,
            "payment_status": "pending",
            "stripe_status": "initiated",
            "metadata": {
                "user_id": str(user_id),
                "user_email": user_email,
                "product": "lifetime_access"
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.payment_transactions.insert_one(transaction_data)
        
        logger.info(f"Payment checkout created for user {user_id}: session {session.id}")
        
        return {
            "url": session.url,
            "session_id": session.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@api_router.get("/payment/status/{session_id}")
async def get_payment_status(
    session_id: str,
    user: dict = Depends(get_current_user_for_payment)
):
    """
    Get payment status for a Checkout Session and update database.
    Supports both session_id (from checkout) and payment_intent_id.
    """
    try:
        import stripe
        stripe.api_key = stripe_api_key
        
        user_id = user['_id']
        
        # Try to find transaction by session_id first (new checkout flow)
        transaction = await db.payment_transactions.find_one({
            "session_id": session_id,
            "user_id": str(user_id)
        })
        
        # If not found, try payment_intent_id (backwards compatibility)
        if not transaction:
            transaction = await db.payment_transactions.find_one({
                "payment_intent_id": session_id,
                "user_id": str(user_id)
            })
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Payment session not found")
        
        # If already marked as paid, return success
        if transaction.get('payment_status') == 'paid':
            return PaymentStatusResponse(
                payment_status="paid",
                user_id=str(user_id),
                amount=transaction.get('amount'),
                payment_intent_id=session_id
            )
        
        # Determine if this is a session_id or payment_intent_id
        is_session = session_id.startswith('cs_')
        payment_status = "pending"
        stripe_status = "pending"
        
        if is_session:
            # Get status from Stripe Checkout Session
            checkout_session = stripe.checkout.Session.retrieve(session_id)
            stripe_status = checkout_session.payment_status  # 'paid', 'unpaid', 'no_payment_required'
            
            # Map Stripe status to our payment status
            if stripe_status == "paid":
                payment_status = "paid"
            elif checkout_session.status == "expired":
                payment_status = "failed"
        else:
            # Get status from Stripe Payment Intent (backwards compatibility)
            payment_intent = stripe.PaymentIntent.retrieve(session_id)
            stripe_status = payment_intent.status
            
            if payment_intent.status == "succeeded":
                payment_status = "paid"
            elif payment_intent.status in ["canceled", "payment_failed"]:
                payment_status = "failed"
        
        # Update transaction in database
        update_data = {
            "stripe_status": stripe_status,
            "payment_status": payment_status,
            "updated_at": datetime.utcnow()
        }
        
        await db.payment_transactions.update_one(
            {"_id": transaction["_id"]},
            {"$set": update_data}
        )
        
        # If payment is complete, update user record and automatically grant access
        if payment_status == "paid":
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "payment_status": "paid",
                        "payment_date": datetime.utcnow(),
                        "status": "active"  # Automatically activate user after payment
                    }
                }
            )
            logger.info(f"✅ Payment completed for user {user_id} - Automatically activated with full access")
        
        return PaymentStatusResponse(
            payment_status=payment_status,
            user_id=str(user_id),
            amount=transaction.get('amount'),
            payment_intent_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check payment status: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events for Payment Intent updates.
    """
    try:
        import stripe
        stripe.api_key = stripe_api_key
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        # Get webhook endpoint secret from environment
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        if not webhook_secret:
            logger.error("STRIPE_WEBHOOK_SECRET not configured")
            raise HTTPException(status_code=500, detail="Webhook secret not configured")
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                body, signature, webhook_secret
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        logger.info(f"Webhook received: {event['type']}")
        
        # Handle checkout.session.completed event (when using Checkout Sessions)
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            session_id = session['id']
            payment_status_stripe = session.get('payment_status')  # 'paid' or 'unpaid'
            
            logger.info(f"Checkout session completed: {session_id}, payment_status: {payment_status_stripe}")
            
            # Find transaction by session_id
            transaction = await db.payment_transactions.find_one({
                "session_id": session_id
            })
            
            if transaction and payment_status_stripe == 'paid':
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "payment_status": "paid",
                            "stripe_status": "complete",
                            "payment_intent_id": session.get('payment_intent'),  # Store payment intent ID
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                # Update user - automatically grant access after successful payment
                user_id = transaction.get('user_id')
                if user_id:
                    await db.users.update_one(
                        {"_id": ObjectId(user_id)},
                        {
                            "$set": {
                                "payment_status": "paid",
                                "payment_date": datetime.utcnow(),
                                "status": "active"  # Automatically activate user after payment
                            }
                        }
                    )
                    logger.info(f"✅ Checkout completed - User {user_id} automatically activated with full access")
                    logger.info(f"✅ Payment successful - User {user_id} automatically activated with full access")
        
        # Also handle payment_intent.succeeded for backwards compatibility
        elif event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            payment_intent_id = payment_intent['id']
            
            logger.info(f"Payment intent succeeded: {payment_intent_id}")
            
            # Find transaction by payment_intent_id
            transaction = await db.payment_transactions.find_one({
                "payment_intent_id": payment_intent_id
            })
            
            if transaction and transaction.get('payment_status') != 'paid':
                # Update transaction
                await db.payment_transactions.update_one(
                    {"payment_intent_id": payment_intent_id},
                    {
                        "$set": {
                            "payment_status": "paid",
                            "stripe_status": "complete",
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                # Update user - automatically grant access after successful payment
                user_id = transaction.get('user_id')
                if user_id:
                    await db.users.update_one(
                        {"_id": ObjectId(user_id)},
                        {
                            "$set": {
                                "payment_status": "paid",
                                "payment_date": datetime.utcnow(),
                                "status": "active"  # Automatically activate user after payment
                            }
                        }
                    )
                    logger.info(f"✅ Payment successful - User {user_id} automatically activated with full access")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

@api_router.get("/user/payment-status")
async def get_user_payment_status(user: dict = Depends(get_current_user)):
    """
    Check if current user has completed payment.
    """
    payment_status = user.get('payment_status', 'unpaid')
    payment_date = user.get('payment_date')
    
    return {
        "payment_status": payment_status,
        "payment_date": payment_date.isoformat() if payment_date and hasattr(payment_date, 'isoformat') else str(payment_date) if payment_date else None,
        "requires_payment": payment_status != 'paid'
    }

# Health check
@api_router.get("/")


# ==================== MANUAL SIGNAL SENDING ====================

@api_router.post("/admin/send-signal")
async def admin_send_signal(signal: ManualSignal, current_admin = Depends(get_current_admin)):
    """
    Admin can send manual trading signals to all users or specific users
    """
    try:
        # Prepare signal document
        # Calculate expiry time (in seconds)
        expiry_time = datetime.utcnow() + timedelta(seconds=signal.duration_seconds)
        
        signal_doc = {
            "symbol": signal.symbol.upper(),
            "signal_type": signal.signal_type.upper(),
            "indicator": signal.indicator,
            "candle_pattern": signal.candle_pattern,
            "timeframe": signal.timeframe,
            "notes": signal.notes or "",
            "sender_type": "admin",
            "sender_id": str(current_admin["_id"]),
            "sender_email": current_admin.get("email"),
            "created_at": datetime.utcnow(),
            "expires_at": expiry_time,
            "duration_seconds": signal.duration_seconds,
            "status": "active"
        }
        
        # Insert signal
        result = await db.signals.insert_one(signal_doc)
        signal_id = str(result.inserted_id)
        
        # If target_users specified, send to specific users only
        if signal.target_users:
            for user_id in signal.target_users:
                await db.user_signals.insert_one({
                    "signal_id": signal_id,
                    "user_id": user_id,
                    "read": False,
                    "created_at": datetime.utcnow()
                })
            recipient_count = len(signal.target_users)
        else:
            # Send to all active paid users
            active_users = await db.users.find({
                "status": "active",
                "payment_status": "paid"
            }).to_list(length=1000)
            
            for user in active_users:
                await db.user_signals.insert_one({
                    "signal_id": signal_id,
                    "user_id": str(user["_id"]),
                    "read": False,
                    "created_at": datetime.utcnow()
                })
            recipient_count = len(active_users)
        
        logger.info(f"✅ Admin signal sent: {signal.signal_type} {signal.symbol} to {recipient_count} users")
        
        return {
            "message": "Signal sent successfully",
            "signal_id": signal_id,
            "recipient_count": recipient_count,
            "signal": {
                "symbol": signal_doc["symbol"],
                "signal_type": signal_doc["signal_type"],
                "indicator": signal_doc["indicator"],
                "candle_pattern": signal_doc["candle_pattern"],
                "timeframe": signal_doc["timeframe"],
                "notes": signal_doc["notes"],
                "created_at": signal_doc["created_at"].isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error sending admin signal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send signal: {str(e)}")


@api_router.post("/mentor/send-signal")
async def mentor_send_signal(signal: ManualSignal, current_mentor = Depends(get_current_mentor)):
    """
    Mentor can send manual trading signals to their users only
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        # Get mentor's users
        mentor_users = await db.users.find({
            "mentor_id": mentor_id,
            "status": "active",
            "payment_status": "paid"
        }).to_list(length=1000)
        
        if not mentor_users:
            raise HTTPException(status_code=404, detail="No active users found under your mentor ID")
        
        # Calculate expiry time (in seconds)
        expiry_time = datetime.utcnow() + timedelta(seconds=signal.duration_seconds)
        
        # Prepare signal document
        signal_doc = {
            "symbol": signal.symbol.upper(),
            "signal_type": signal.signal_type.upper(),
            "indicator": signal.indicator,
            "candle_pattern": signal.candle_pattern,
            "timeframe": signal.timeframe,
            "notes": signal.notes or "",
            "sender_type": "mentor",
            "sender_id": str(current_mentor["_id"]),
            "sender_email": current_mentor.get("email"),
            "mentor_id": mentor_id,
            "created_at": datetime.utcnow(),
            "expires_at": expiry_time,
            "duration_seconds": signal.duration_seconds,
            "status": "active"
        }
        
        # Insert signal
        result = await db.signals.insert_one(signal_doc)
        signal_id = str(result.inserted_id)
        
        # Send to mentor's users
        for user in mentor_users:
            await db.user_signals.insert_one({
                "signal_id": signal_id,
                "user_id": str(user["_id"]),
                "read": False,
                "created_at": datetime.utcnow()
            })
        
        recipient_count = len(mentor_users)
        
        logger.info(f"✅ Mentor {mentor_id} signal sent: {signal.signal_type} {signal.symbol} to {recipient_count} users")
        
        return {
            "message": "Signal sent successfully",
            "signal_id": signal_id,
            "recipient_count": recipient_count,
            "signal": {
                "symbol": signal_doc["symbol"],
                "signal_type": signal_doc["signal_type"],
                "indicator": signal_doc["indicator"],
                "candle_pattern": signal_doc["candle_pattern"],
                "timeframe": signal_doc["timeframe"],
                "notes": signal_doc["notes"],
                "created_at": signal_doc["created_at"].isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending mentor signal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send signal: {str(e)}")


# Helper function to send push notifications for manual news
async def send_manual_news_notification(news_doc: dict, user_ids: list):
    """Send push notification for manual news events to specific users"""
    try:
        if not user_ids:
            return
        
        # Get push tokens for the specified users
        tokens = await db.push_tokens.find({
            "user_id": {"$in": user_ids}
        }).to_list(1000)
        
        if not tokens:
            logging.info("No push tokens found for the specified users")
            return
        
        # Prepare notification message
        title = f"📰 {news_doc['title']}"
        
        # Build body from optional fields
        body_parts = []
        if news_doc.get('currency'):
            body_parts.append(f"Currency: {news_doc['currency']}")
        if news_doc.get('impact'):
            body_parts.append(f"Impact: {news_doc['impact']}")
        if news_doc.get('event_time'):
            body_parts.append(f"Time: {news_doc['event_time']}")
        if news_doc.get('signal'):
            body_parts.append(f"Signal: {news_doc['signal']}")
        
        body = " | ".join(body_parts) if body_parts else "New market news event"
        
        # Send to Expo Push Notification service
        messages = []
        for token_doc in tokens:
            messages.append({
                "to": token_doc["token"],
                "sound": "default",
                "title": title,
                "body": body,
                "data": {
                    "news_id": str(news_doc["_id"]),
                    "title": news_doc["title"],
                    "currency": news_doc.get("currency"),
                    "signal": news_doc.get("signal"),
                    "type": "manual_news"
                },
                "priority": "high",
                "channelId": "default"
            })
        
        # Send notifications in batches
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://exp.host/--/api/v2/push/send',
                json=messages,
                timeout=10.0
            )
            logging.info(f"Manual news notification sent to {len(messages)} users: {response.status_code}")
    except Exception as e:
        logging.error(f"Error sending manual news notification: {e}")


@api_router.post("/admin/send-manual-news")
async def admin_send_manual_news(news: ManualNewsEvent, current_admin = Depends(get_current_admin)):
    """
    Admin can send manual news events to ALL users
    """
    try:
        # Get all active, paid users
        all_users = await db.users.find({
            "status": "active",
            "payment_status": "paid"
        }).to_list(length=10000)
        
        # Get all admins
        all_admins = await db.admins.find({}).to_list(length=100)
        
        # Combine users and admins
        all_recipients = all_users + all_admins
        
        if not all_recipients:
            raise HTTPException(status_code=404, detail="No active users or admins found")
        
        # Prepare news document - only include non-None fields
        news_doc = {
            "title": news.title,
            "sender_type": "admin",
            "sender_id": str(current_admin["_id"]),
            "sender_email": current_admin.get("email"),
            "created_at": datetime.utcnow(),
            "is_manual": True,
            "status": "active"
        }
        
        # Add optional fields only if they are provided
        if news.event_time is not None:
            news_doc["event_time"] = news.event_time
        if news.currency is not None:
            news_doc["currency"] = news.currency
        if news.impact is not None:
            news_doc["impact"] = news.impact
        if news.description is not None:
            news_doc["description"] = news.description
        if news.signal is not None:
            news_doc["signal"] = news.signal.upper()
        
        # Insert news event into manual_news collection
        result = await db.manual_news.insert_one(news_doc)
        news_id = str(result.inserted_id)
        news_doc["_id"] = result.inserted_id
        
        # Send push notifications to all users and admins
        recipient_ids = [str(recipient["_id"]) for recipient in all_recipients]
        await send_manual_news_notification(news_doc, recipient_ids)
        
        recipient_count = len(all_recipients)
        
        logger.info(f"✅ Admin manual news sent: '{news.title}' to {recipient_count} recipients (users + admins)")
        
        return {
            "message": "Manual news event sent successfully",
            "news_id": news_id,
            "recipient_count": recipient_count,
            "news": {
                k: v for k, v in news_doc.items() 
                if k != "_id" and v is not None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending admin manual news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send manual news: {str(e)}")


@api_router.post("/mentor/send-manual-news")
async def mentor_send_manual_news(news: ManualNewsEvent, current_mentor = Depends(get_current_mentor)):
    """
    Mentor can send manual news events to THEIR users only
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        # Get mentor's users
        mentor_users = await db.users.find({
            "mentor_id": mentor_id,
            "status": "active",
            "payment_status": "paid"
        }).to_list(length=10000)
        
        # Get all admins
        all_admins = await db.admins.find({}).to_list(length=100)
        
        # Combine mentor's users with admins
        all_recipients = mentor_users + all_admins
        
        if not all_recipients:
            raise HTTPException(status_code=404, detail="No active users or admins found")
        
        # Prepare news document - only include non-None fields
        news_doc = {
            "title": news.title,
            "sender_type": "mentor",
            "sender_id": str(current_mentor["_id"]),
            "sender_email": current_mentor.get("email"),
            "mentor_id": mentor_id,
            "created_at": datetime.utcnow(),
            "is_manual": True,
            "status": "active"
        }
        
        # Add optional fields only if they are provided
        if news.event_time is not None:
            news_doc["event_time"] = news.event_time
        if news.currency is not None:
            news_doc["currency"] = news.currency
        if news.impact is not None:
            news_doc["impact"] = news.impact
        if news.description is not None:
            news_doc["description"] = news.description
        if news.signal is not None:
            news_doc["signal"] = news.signal.upper()
        
        # Insert news event into manual_news collection
        result = await db.manual_news.insert_one(news_doc)
        news_id = str(result.inserted_id)
        news_doc["_id"] = result.inserted_id
        
        # Send push notifications to mentor's users and admins
        recipient_ids = [str(recipient["_id"]) for recipient in all_recipients]
        await send_manual_news_notification(news_doc, recipient_ids)
        
        recipient_count = len(all_recipients)
        user_count = len(mentor_users)
        admin_count = len(all_admins)
        
        logger.info(f"✅ Mentor {mentor_id} manual news sent: '{news.title}' to {recipient_count} recipients ({user_count} users + {admin_count} admins)")
        
        return {
            "message": "Manual news event sent successfully",
            "news_id": news_id,
            "recipient_count": recipient_count,
            "news": {
                k: v for k, v in news_doc.items() 
                if k != "_id" and v is not None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending mentor manual news: {str(e)}")


# =====================================================
# CUSTOM INDICATOR ENDPOINTS
# =====================================================

@api_router.post("/mentor/create-indicator")
async def create_custom_indicator(indicator: CustomIndicator, current_mentor = Depends(get_current_mentor)):
    """
    Mentor creates a custom indicator with full configuration
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        # Convert Pydantic models to dicts
        indicators_list = [ind.dict() for ind in indicator.indicators]
        buy_conditions_list = [cond.dict() for cond in indicator.buy_conditions]
        sell_conditions_list = [cond.dict() for cond in indicator.sell_conditions]
        
        # Create indicator document
        indicator_doc = {
            "name": indicator.name,
            "description": indicator.description or "",
            "symbol": indicator.symbol,
            "timeframe": indicator.timeframe,
            "indicators": indicators_list,
            "buy_conditions": buy_conditions_list,
            "sell_conditions": sell_conditions_list,
            "mentor_id": mentor_id,
            "mentor_email": current_mentor.get("email"),
            "current_signal": "NONE",  # Default to no signal
            "is_running": False,  # Default to stopped (mentor must start it)
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_checked": None  # Track when market was last checked
        }
        
        # Insert into database
        result = await db.custom_indicators.insert_one(indicator_doc)
        indicator_id = str(result.inserted_id)
        
        logger.info(f"✅ Mentor {mentor_id} created indicator: '{indicator.name}' (ID: {indicator_id})")
        
        return {
            "message": "Indicator created successfully",
            "indicator_id": indicator_id,
            "indicator": {
                "id": indicator_id,
                "name": indicator.name,
                "description": indicator.description,
                "current_signal": "NONE",
                "status": "active"
            }
        }
        
    except Exception as e:
        logger.error(f"Error creating indicator: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create indicator: {str(e)}")


@api_router.get("/mentor/indicators")
async def get_mentor_indicators(current_mentor = Depends(get_current_mentor)):
    """
    Get all indicators created by this mentor
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        # Get all indicators for this mentor
        indicators_cursor = db.custom_indicators.find({
            "mentor_id": mentor_id,
            "status": "active"
        }).sort("created_at", -1)
        
        indicators_list = await indicators_cursor.to_list(length=100)
        
        # Format indicators
        formatted_indicators = []
        for ind in indicators_list:
            formatted_indicators.append({
                "id": str(ind["_id"]),
                "name": ind["name"],
                "description": ind.get("description", ""),
                "current_signal": ind.get("current_signal", "NONE"),
                "is_running": ind.get("is_running", False),
                "created_at": ind["created_at"].isoformat(),
                "updated_at": ind.get("updated_at", ind["created_at"]).isoformat()
            })
        
        return {"indicators": formatted_indicators}
        
    except Exception as e:
        logger.error(f"Error fetching mentor indicators: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch indicators: {str(e)}")


@api_router.post("/mentor/update-indicator-signal")
async def update_indicator_signal(signal_update: IndicatorSignalUpdate, current_mentor = Depends(get_current_mentor)):
    """
    Mentor updates the signal for an indicator (BUY/SELL/NONE)
    Automatically sends notification to ALL users under this mentor
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        indicator_id = signal_update.indicator_id
        new_signal = signal_update.signal.upper()
        
        # Validate signal
        if new_signal not in ["BUY", "SELL", "NONE"]:
            raise HTTPException(status_code=400, detail="Signal must be BUY, SELL, or NONE")
        
        # Verify indicator belongs to this mentor
        indicator = await db.custom_indicators.find_one({
            "_id": ObjectId(indicator_id),
            "mentor_id": mentor_id
        })
        
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicator not found or doesn't belong to you")
        
        # Update indicator signal
        await db.custom_indicators.update_one(
            {"_id": ObjectId(indicator_id)},
            {
                "$set": {
                    "current_signal": new_signal,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Get all users under this mentor
        mentor_users = await db.users.find({
            "mentor_id": mentor_id,
            "status": "active",
            "payment_status": "paid"
        }).to_list(length=10000)
        
        # Create signal records for each user (only for BUY/SELL, not NONE)
        if mentor_users and new_signal != "NONE":
            # Create a signal document
            expiry_time = datetime.utcnow() + timedelta(hours=24)  # 24 hour expiry for indicator signals
            
            signal_doc = {
                "symbol": indicator.get("symbol", indicator["name"]),  # Use indicator name if no symbol
                "signal_type": new_signal,
                "indicator": indicator["name"],
                "candle_pattern": None,
                "timeframe": indicator.get("timeframe", "N/A"),
                "notes": f"Mentor custom indicator signal",
                "sender_type": "mentor_indicator",
                "sender_id": mentor_id,
                "indicator_id": indicator_id,
                "created_at": datetime.utcnow(),
                "expires_at": expiry_time,
                "duration_seconds": 86400,  # 24 hours
                "status": "active"
            }
            
            # Insert signal
            result = await db.signals.insert_one(signal_doc)
            signal_id = str(result.inserted_id)
            
            # Create user_signals reference for each user
            for user in mentor_users:
                await db.user_signals.insert_one({
                    "signal_id": signal_id,
                    "user_id": str(user["_id"]),
                    "read": False,
                    "created_at": datetime.utcnow()
                })
            
            logger.info(f"✅ Created signal {signal_id} for {len(mentor_users)} users from indicator {indicator['name']}")
        
        # Send push notifications to all mentor's users
        if mentor_users and new_signal != "NONE":
            tokens = await db.push_tokens.find({
                "user_id": {"$in": [str(user["_id"]) for user in mentor_users]}
            }).to_list(1000)
            
            if tokens:
                title = f"📊 {indicator['name']}"
                body = f"Signal: {new_signal}"
                
                messages = []
                for token_doc in tokens:
                    messages.append({
                        "to": token_doc["token"],
                        "sound": "default",
                        "title": title,
                        "body": body,
                        "data": {
                            "indicator_id": indicator_id,
                            "indicator_name": indicator["name"],
                            "signal": new_signal,
                            "type": "indicator_signal"
                        },
                        "priority": "high",
                        "channelId": "default"
                    })
                
                # Send notifications
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        'https://exp.host/--/api/v2/push/send',
                        json=messages,
                        timeout=10.0
                    )
                    logger.info(f"Indicator signal notification sent to {len(messages)} users: {response.status_code}")
        
        logger.info(f"✅ Mentor {mentor_id} updated indicator '{indicator['name']}' signal to {new_signal}")
        
        return {
            "message": "Indicator signal updated successfully",
            "indicator_id": indicator_id,
            "indicator_name": indicator["name"],
            "signal": new_signal,
            "users_notified": len(mentor_users) if new_signal != "NONE" else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating indicator signal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update indicator signal: {str(e)}")


@api_router.post("/mentor/manual-override-signal")
async def manual_override_signal(override: ManualOverrideSignal, current_mentor = Depends(get_current_mentor)):
    """
    Mentor manually sends BUY/SELL signal to ALL users subscribed to this indicator
    This overrides automatic condition checking
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        indicator_id = override.indicator_id
        signal = override.signal.upper()
        
        # Validate signal
        if signal not in ["BUY", "SELL"]:
            raise HTTPException(status_code=400, detail="Signal must be BUY or SELL")
        
        # Verify indicator belongs to this mentor
        indicator = await db.custom_indicators.find_one({
            "_id": ObjectId(indicator_id),
            "mentor_id": mentor_id,
            "status": "active"
        })
        
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicator not found or doesn't belong to you")
        
        # Get ALL subscriptions for this indicator (all users, all symbols)
        subscriptions = await db.user_indicator_subscriptions.find({
            "indicator_id": indicator_id,
            "status": "active"
        }).to_list(length=1000)
        
        if not subscriptions:
            return {
                "message": "No active subscriptions for this indicator",
                "users_notified": 0
            }
        
        # Create signals for each subscription
        signals_created = 0
        user_ids = []
        
        for sub in subscriptions:
            # Create signal document
            expiry_time = datetime.utcnow() + timedelta(hours=24)
            
            signal_doc = {
                "symbol": sub["user_selected_symbol"],
                "signal_type": signal,
                "indicator": indicator["name"],
                "candle_pattern": None,
                "timeframe": sub["user_selected_timeframe"],
                "notes": f"Manual override by mentor",
                "sender_type": "mentor_manual_override",
                "sender_id": mentor_id,
                "indicator_id": indicator_id,
                "subscription_id": str(sub["_id"]),
                "created_at": datetime.utcnow(),
                "expires_at": expiry_time,
                "duration_seconds": 86400,
                "status": "active"
            }
            
            result = await db.signals.insert_one(signal_doc)
            signal_id = str(result.inserted_id)
            
            # Create user_signals reference
            await db.user_signals.insert_one({
                "signal_id": signal_id,
                "user_id": sub["user_id"],
                "read": False,
                "created_at": datetime.utcnow()
            })
            
            # Update subscription stats
            await db.user_indicator_subscriptions.update_one(
                {"_id": sub["_id"]},
                {
                    "$set": {
                        "last_signal_time": datetime.utcnow(),
                        "last_signal_type": signal
                    },
                    "$inc": {"total_signals_received": 1}
                }
            )
            
            signals_created += 1
            user_ids.append(sub["user_id"])
        
        # Send push notifications
        if user_ids:
            tokens = await db.push_tokens.find({
                "user_id": {"$in": user_ids}
            }).to_list(1000)
            
            if tokens:
                title = f"📊 {indicator['name']} - Manual Signal"
                body = f"Mentor Override: {signal}"
                
                messages = []
                for token_doc in tokens:
                    messages.append({
                        "to": token_doc["token"],
                        "sound": "default",
                        "title": title,
                        "body": body,
                        "data": {
                            "indicator_id": indicator_id,
                            "indicator_name": indicator["name"],
                            "signal": signal,
                            "type": "manual_override"
                        }
                    })
                
                # Send notifications in batches
                for i in range(0, len(messages), 100):
                    batch = messages[i:i+100]
                    await send_push_notifications_batch(batch)
        
        logger.info(f"✅ Mentor {mentor_id} sent manual override {signal} for '{indicator['name']}' to {signals_created} users")
        
        return {
            "message": f"Manual {signal} signal sent to all subscribers",
            "indicator_name": indicator["name"],
            "signal": signal,
            "users_notified": signals_created,
            "subscriptions_affected": signals_created
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending manual override: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send manual override: {str(e)}")


@api_router.post("/mentor/toggle-indicator/{indicator_id}")
async def toggle_indicator_status(indicator_id: str, current_mentor = Depends(get_current_mentor)):
    """
    Mentor toggles indicator START/STOP status
    When running=True, indicator is visible to users
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        # Verify indicator belongs to this mentor
        indicator = await db.custom_indicators.find_one({
            "_id": ObjectId(indicator_id),
            "mentor_id": mentor_id
        })
        
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicator not found or doesn't belong to you")
        
        # Toggle is_running status
        new_status = not indicator.get("is_running", False)
        
        await db.custom_indicators.update_one(
            {"_id": ObjectId(indicator_id)},
            {
                "$set": {
                    "is_running": new_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        status_text = "STARTED" if new_status else "STOPPED"
        logger.info(f"✅ Mentor {mentor_id} {status_text} indicator: '{indicator['name']}'")
        
        return {
            "message": f"Indicator {status_text.lower()} successfully",
            "indicator_id": indicator_id,
            "indicator_name": indicator["name"],
            "is_running": new_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling indicator status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to toggle indicator: {str(e)}")


@api_router.delete("/mentor/delete-indicator/{indicator_id}")
async def delete_indicator(indicator_id: str, current_mentor = Depends(get_current_mentor)):
    """
    Mentor deletes a custom indicator
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        logger.info(f"🗑️  DELETE REQUEST: Mentor {mentor_id} attempting to delete indicator {indicator_id}")
        logger.info(f"🔍 Query: _id={indicator_id} (ObjectId), mentor_id={mentor_id} (type: {type(mentor_id)})")
        
        # First check if indicator exists at all
        any_indicator = await db.custom_indicators.find_one({"_id": ObjectId(indicator_id)})
        if any_indicator:
            logger.info(f"📋 Indicator EXISTS: name='{any_indicator.get('name')}', mentor_id={any_indicator.get('mentor_id')} (type: {type(any_indicator.get('mentor_id'))})")
        else:
            logger.warning(f"❌ Indicator {indicator_id} does NOT exist in database at all")
        
        # Verify indicator belongs to this mentor
        indicator = await db.custom_indicators.find_one({
            "_id": ObjectId(indicator_id),
            "mentor_id": mentor_id
        })
        
        if not indicator:
            logger.warning(f"❌ Indicator {indicator_id} not found for mentor {mentor_id} (query returned None)")
            raise HTTPException(status_code=404, detail="Indicator not found or doesn't belong to you")
        
        logger.info(f"✅ Found indicator '{indicator['name']}', proceeding with deletion")
        
        # Soft delete - mark as inactive
        await db.custom_indicators.update_one(
            {"_id": ObjectId(indicator_id)},
            {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}}
        )
        
        # Remove this indicator from users who selected it
        await db.users.update_many(
            {"selected_indicator_id": indicator_id},
            {"$unset": {"selected_indicator_id": ""}}
        )
        
        logger.info(f"✅ Mentor {mentor_id} deleted indicator: '{indicator['name']}'")
        
        return {
            "message": "Indicator deleted successfully",
            "indicator_id": indicator_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting indicator: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete indicator: {str(e)}")


@api_router.get("/user/mentor-indicators")
async def get_user_mentor_indicators(current_user = Depends(get_current_user)):
    """
    User gets all active indicators from their mentor
    """
    try:
        user_mentor_id = current_user.get("mentor_id")
        
        print(f"\n{'='*60}")
        print(f"🔍 FETCHING INDICATORS FOR USER")
        print(f"🔍 User email: {current_user.get('email')}")
        print(f"🔍 User mentor_id: {user_mentor_id}")
        print(f"{'='*60}\n")
        
        if not user_mentor_id:
            print("⚠️  No mentor_id found for user!")
            return {"indicators": [], "selected_indicator_id": None}
        
        # Get all RUNNING indicators from user's mentor (only show started indicators)
        query = {
            "mentor_id": user_mentor_id,
            "status": "active",
            "is_running": True  # Only show indicators that mentor has started
        }
        print(f"🔍 Query: {query}")
        print(f"🔍 About to execute MongoDB find...")
        
        try:
            indicators_cursor = db.custom_indicators.find(query).sort("created_at", -1)
            print(f"🔍 Cursor created, calling to_list()...")
            
            indicators_list = await indicators_cursor.to_list(length=100)
            print(f"🔍 to_list() completed")
            
            print(f"✅ Query executed for mentor_id: {user_mentor_id}")
            print(f"✅ Found {len(indicators_list)} indicators")
            print(f"✅ Type: {type(indicators_list)}")
            
            # Debug: Let's see all indicators regardless of is_running
            print(f"🔍 Fetching all indicators for debug...")
            all_indicators = await db.custom_indicators.find({"mentor_id": user_mentor_id}).to_list(length=100)
            print(f"🐛 DEBUG: Total indicators for mentor: {len(all_indicators)}")
            for ind in all_indicators:
                print(f"🐛   - {ind.get('name')}: is_running={ind.get('is_running')}, status={ind.get('status')}")
        except Exception as cursor_error:
            print(f"❌ ERROR in cursor operations: {cursor_error}")
            raise
        logger.info(f"🔍 User mentor ID: {user_mentor_id}")
        logger.info(f"🔍 Found {len(indicators_list)} indicators for user")
        
        # Format indicators (simplified for users - no technical details)
        formatted_indicators = []
        for ind in indicators_list:
            logger.info(f"  - Indicator: {ind['name']} | is_running: {ind.get('is_running')} | status: {ind.get('status')}")
            formatted_indicators.append({
                "id": str(ind["_id"]),
                "name": ind["name"],
                "current_signal": ind.get("current_signal", "NONE"),
                "updated_at": ind.get("updated_at", ind["created_at"]).isoformat()
            })
        
        # Get user's selected indicator
        selected_indicator_id = current_user.get("selected_indicator_id")
        
        logger.info(f"✅ Returning {len(formatted_indicators)} indicators to user")
        
        response_data = {
            "indicators": formatted_indicators,
            "selected_indicator_id": selected_indicator_id
        }
        
        print(f"\n📤 RESPONSE BEING SENT TO FRONTEND:")
        print(f"   indicators count: {len(formatted_indicators)}")
        print(f"   indicators: {[ind['name'] for ind in formatted_indicators]}")
        print(f"   Full response: {response_data}\n")
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error fetching user mentor indicators: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch indicators: {str(e)}")


@api_router.post("/user/select-indicator")
async def user_select_indicator(selection: UserIndicatorSelection, current_user = Depends(get_current_user)):
    """
    User selects which indicator to follow from their mentor
    """
    try:
        user_id = str(current_user["_id"])
        user_mentor_id = current_user.get("mentor_id")
        indicator_id = selection.indicator_id
        
        # Verify indicator exists and belongs to user's mentor
        indicator = await db.custom_indicators.find_one({
            "_id": ObjectId(indicator_id),
            "mentor_id": user_mentor_id,
            "status": "active"
        })
        
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicator not found or doesn't belong to your mentor")
        
        # Update user's selected indicator
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"selected_indicator_id": indicator_id}}
        )
        
        logger.info(f"✅ User {user_id} selected indicator: '{indicator['name']}' (ID: {indicator_id})")
        
        return {
            "message": "Indicator selected successfully",
            "indicator_id": indicator_id,
            "indicator_name": indicator["name"],
            "current_signal": indicator.get("current_signal", "NONE")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error selecting indicator: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to select indicator: {str(e)}")

        raise HTTPException(status_code=500, detail=f"Failed to send manual news: {str(e)}")


@api_router.post("/user/subscribe-to-indicator")
async def subscribe_to_indicator(subscription: IndicatorSubscriptionCreate, current_user = Depends(get_current_user)):
    """
    User subscribes to a mentor's indicator with their chosen symbol and timeframe
    """
    try:
        user_id = str(current_user["_id"])
        user_mentor_id = current_user.get("mentor_id")
        indicator_id = subscription.indicator_id
        symbol = subscription.symbol.upper()
        timeframe = subscription.timeframe
        
        # Verify indicator exists and belongs to user's mentor
        indicator = await db.custom_indicators.find_one({
            "_id": ObjectId(indicator_id),
            "mentor_id": user_mentor_id,
            "status": "active",
            "is_running": True
        })
        
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicator not found or not available")
        
        # Check if user already has subscription for this indicator + symbol combo
        existing = await db.user_indicator_subscriptions.find_one({
            "user_id": user_id,
            "indicator_id": indicator_id,
            "user_selected_symbol": symbol,
            "status": "active"
        })
        
        if existing:
            raise HTTPException(status_code=400, detail=f"You are already subscribed to {indicator['name']} on {symbol}")
        
        # Create subscription
        subscription_doc = {
            "user_id": user_id,
            "user_email": current_user.get("email"),
            "mentor_id": user_mentor_id,
            "indicator_id": indicator_id,
            "indicator_name": indicator["name"],
            "user_selected_symbol": symbol,
            "user_selected_timeframe": timeframe,
            "status": "active",
            "subscribed_at": datetime.utcnow(),
            "last_signal_time": None,
            "last_signal_type": "NONE",
            "total_signals_received": 0
        }
        
        result = await db.user_indicator_subscriptions.insert_one(subscription_doc)
        subscription_id = str(result.inserted_id)
        
        logger.info(f"✅ User {user_id} subscribed to indicator '{indicator['name']}' on {symbol} @ {timeframe}")
        
        return {
            "message": "Successfully subscribed to indicator",
            "subscription_id": subscription_id,
            "indicator_name": indicator["name"],
            "symbol": symbol,
            "timeframe": timeframe
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to subscribe: {str(e)}")


@api_router.get("/user/my-indicator-subscriptions")
async def get_my_subscriptions(current_user = Depends(get_current_user)):
    """
    Get all active indicator subscriptions for the current user
    """
    try:
        user_id = str(current_user["_id"])
        
        # Get all active subscriptions
        subscriptions_cursor = db.user_indicator_subscriptions.find({
            "user_id": user_id,
            "status": "active"
        }).sort("subscribed_at", -1)
        
        subscriptions_list = await subscriptions_cursor.to_list(length=100)
        
        formatted_subscriptions = []
        for sub in subscriptions_list:
            formatted_subscriptions.append({
                "id": str(sub["_id"]),
                "indicator_id": sub["indicator_id"],
                "indicator_name": sub["indicator_name"],
                "symbol": sub["user_selected_symbol"],
                "timeframe": sub["user_selected_timeframe"],
                "subscribed_at": sub["subscribed_at"].isoformat(),
                "last_signal_time": sub["last_signal_time"].isoformat() if sub.get("last_signal_time") else None,
                "last_signal_type": sub.get("last_signal_type", "NONE"),
                "total_signals_received": sub.get("total_signals_received", 0)
            })
        
        logger.info(f"✅ Returning {len(formatted_subscriptions)} subscriptions for user {user_id}")
        
        return {"subscriptions": formatted_subscriptions}
        
    except Exception as e:
        logger.error(f"Error fetching subscriptions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscriptions: {str(e)}")


@api_router.delete("/user/unsubscribe-indicator/{subscription_id}")
async def unsubscribe_from_indicator(subscription_id: str, current_user = Depends(get_current_user)):
    """
    Unsubscribe from an indicator
    """
    try:
        user_id = str(current_user["_id"])
        
        # Verify subscription belongs to user
        subscription = await db.user_indicator_subscriptions.find_one({
            "_id": ObjectId(subscription_id),
            "user_id": user_id
        })
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Soft delete - update status to inactive
        await db.user_indicator_subscriptions.update_one(
            {"_id": ObjectId(subscription_id)},
            {
                "$set": {
                    "status": "inactive",
                    "unsubscribed_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"✅ User {user_id} unsubscribed from indicator '{subscription['indicator_name']}' on {subscription['user_selected_symbol']}")
        
        return {
            "message": "Successfully unsubscribed",
            "indicator_name": subscription["indicator_name"],
            "symbol": subscription["user_selected_symbol"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unsubscribing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to unsubscribe: {str(e)}")


@api_router.get("/user/signals")
async def get_user_signals(current_user = Depends(get_current_user)):
    """
    Get all signals for the current user (unread and recent)
    """
    try:
        user_id = str(current_user["_id"])
        
        # Get user's signal references
        user_signal_refs = await db.user_signals.find({
            "user_id": user_id
        }).sort("created_at", -1).limit(50).to_list(length=50)
        
        signals = []
        for ref in user_signal_refs:
            signal = await db.signals.find_one({"_id": ObjectId(ref["signal_id"])})
            if signal:
                signals.append({
                    **serialize_doc(signal),
                    "read": ref.get("read", False),
                    "received_at": ref.get("created_at")
                })
        
        return {
            "signals": signals,
            "unread_count": sum(1 for s in signals if not s.get("read"))
        }
        
    except Exception as e:
        logger.error(f"Error fetching user signals: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch signals: {str(e)}")


@api_router.get("/user/signals/latest")
async def get_latest_signal(current_user = Depends(get_current_user)):
    """
    Get the most recent ACTIVE (non-expired) signal for floating button display
    """
    try:
        user_id = str(current_user["_id"])
        
        # Get latest signal reference
        latest_ref = await db.user_signals.find_one(
            {"user_id": user_id},
            sort=[("created_at", -1)]
        )
        
        if not latest_ref:
            return {"signal": None}
        
        signal = await db.signals.find_one({"_id": ObjectId(latest_ref["signal_id"])})
        if signal:
            # Check if signal has expired
            if signal.get("expires_at"):
                if signal["expires_at"] < datetime.utcnow():
                    logger.info(f"Signal {latest_ref['signal_id']} expired, not displaying")
                    return {"signal": None}
            
            return {
                "signal": {
                    "id": str(signal["_id"]),
                    "signal_type": signal["signal_type"],
                    "symbol": signal.get("symbol"),
                    "indicator": signal.get("indicator", ""),
                    "candle_pattern": signal.get("candle_pattern", ""),
                    "timeframe": signal.get("timeframe", ""),
                    "notes": signal.get("notes", ""),
                    "entry_price": signal.get("entry_price"),
                    "stop_loss": signal.get("stop_loss"),
                    "take_profit": signal.get("take_profit"),
                    "message": signal.get("message", ""),
                    "sender_type": signal.get("sender_type", ""),
                    "status": signal.get("status", ""),
                    "created_at": signal["created_at"].isoformat() if signal.get("created_at") else None,
                    "expires_at": signal["expires_at"].isoformat() if signal.get("expires_at") else None
                }
            }
        
        return {"signal": None}
    except Exception as e:
        logger.error(f"Error fetching latest signal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch latest signal: {str(e)}")


# ==================== BROKER AFFILIATE LINKS ====================

@api_router.post("/admin/brokers")
async def admin_add_broker(broker: BrokerAffiliate, current_admin = Depends(get_current_admin)):
    """
    Admin adds a broker affiliate link that will be sent to all users
    """
    try:
        broker_doc = {
            "broker_name": broker.broker_name,
            "broker_image": broker.broker_image,
            "affiliate_link": broker.affiliate_link,
            "description": broker.description or "",
            "added_by_type": "admin",
            "added_by_id": str(current_admin["_id"]),
            "created_at": datetime.utcnow(),
            "status": "active"
        }
        
        result = await db.brokers.insert_one(broker_doc)
        broker_id = str(result.inserted_id)
        
        # Send notification to all active paid users
        active_users = await db.users.find({
            "status": "active",
            "payment_status": "paid"
        }).to_list(length=1000)
        
        notification_count = 0
        for user in active_users:
            await db.broker_notifications.insert_one({
                "broker_id": broker_id,
                "user_id": str(user["_id"]),
                "seen": False,
                "created_at": datetime.utcnow()
            })
            notification_count += 1
        
        logger.info(f"✅ Admin added broker: {broker.broker_name}, notified {notification_count} users")
        
        return {
            "message": "Broker added successfully",
            "broker_id": broker_id,
            "notified_users": notification_count
        }
        
    except Exception as e:
        logger.error(f"Error adding admin broker: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add broker: {str(e)}")


@api_router.get("/admin/brokers")
async def get_admin_brokers(current_admin = Depends(get_current_admin)):
    """
    Get all brokers (admin + mentor created) for admin dashboard
    Admin can see all brokers in the system
    """
    try:
        # Get all active brokers (admin and mentor)
        brokers = await db.brokers.find({
            "status": "active"
        }).sort("created_at", -1).to_list(length=100)
        
        # Enrich with creator info
        result = []
        for broker in brokers:
            broker_data = serialize_doc(broker)
            
            # Add creator type and ID
            broker_data["added_by_type"] = broker.get("added_by_type", "admin")
            broker_data["mentor_id"] = broker.get("mentor_id", None)
            
            result.append(broker_data)
        
        return {"brokers": result}
        
    except Exception as e:
        logger.error(f"Error fetching admin brokers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch brokers: {str(e)}")


@api_router.delete("/admin/brokers/{broker_id}")
async def delete_admin_broker(broker_id: str, current_admin = Depends(get_current_admin)):
    """
    Delete a broker (admin only) - completely removes it and all notifications
    """
    try:
        # Delete the broker
        broker_result = await db.brokers.delete_one({"_id": ObjectId(broker_id)})
        
        if broker_result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Broker not found")
        
        # Delete all broker notifications for this broker
        await db.broker_notifications.delete_many({"broker_id": broker_id})
        
        logger.info(f"Admin deleted broker {broker_id}")
        return {"message": "Broker deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting broker: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete broker: {str(e)}")


@api_router.post("/mentor/brokers")
async def mentor_add_broker(broker: BrokerAffiliate, current_mentor = Depends(get_current_mentor)):
    """
    Mentor adds a broker affiliate link that will be sent to their users only
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        # Get mentor's active paid users
        mentor_users = await db.users.find({
            "mentor_id": mentor_id,
            "status": "active",
            "payment_status": "paid"
        }).to_list(length=1000)
        
        if not mentor_users:
            raise HTTPException(status_code=404, detail="No active users found under your mentor ID")
        
        broker_doc = {
            "broker_name": broker.broker_name,
            "broker_image": broker.broker_image,
            "affiliate_link": broker.affiliate_link,
            "description": broker.description or "",
            "added_by_type": "mentor",
            "added_by_id": str(current_mentor["_id"]),
            "mentor_id": mentor_id,
            "created_at": datetime.utcnow(),
            "status": "active"
        }
        
        result = await db.brokers.insert_one(broker_doc)
        broker_id = str(result.inserted_id)
        
        # Send notification to mentor's users only
        notification_count = 0
        for user in mentor_users:
            await db.broker_notifications.insert_one({
                "broker_id": broker_id,
                "user_id": str(user["_id"]),
                "seen": False,
                "created_at": datetime.utcnow()
            })
            notification_count += 1
        
        logger.info(f"✅ Mentor {mentor_id} added broker: {broker.broker_name}, notified {notification_count} users")
        
        return {
            "message": "Broker added successfully",
            "broker_id": broker_id,
            "notified_users": notification_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding mentor broker: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add broker: {str(e)}")


@api_router.get("/mentor/brokers")
async def get_mentor_brokers(current_mentor = Depends(get_current_mentor)):
    """
    Get all brokers added by this mentor
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        brokers = await db.brokers.find({
            "added_by_type": "mentor",
            "mentor_id": mentor_id,
            "status": "active"
        }).sort("created_at", -1).to_list(length=100)
        
        return {"brokers": [serialize_doc(b) for b in brokers]}
        
    except Exception as e:
        logger.error(f"Error fetching mentor brokers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch brokers: {str(e)}")


@api_router.delete("/mentor/brokers/{broker_id}")
async def delete_mentor_broker(broker_id: str, current_mentor = Depends(get_current_mentor)):
    """
    Delete a broker affiliate link (mentor only can delete their own)
    Also deletes all associated notifications
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        # Check if broker exists and belongs to this mentor
        broker = await db.brokers.find_one({
            "_id": ObjectId(broker_id),
            "mentor_id": mentor_id,
            "added_by_type": "mentor"
        })
        
        if not broker:
            raise HTTPException(status_code=404, detail="Broker not found or not authorized to delete")
        
        # Delete broker
        result = await db.brokers.delete_one({"_id": ObjectId(broker_id)})
        
        # Delete associated notifications
        await db.broker_notifications.delete_many({"broker_id": broker_id})
        
        if result.deleted_count > 0:
            logger.info(f"✅ Mentor {mentor_id} deleted broker: {broker.get('broker_name')}")
            return {
                "message": "Broker deleted successfully",
                "broker_id": broker_id
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete broker")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting mentor broker: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete broker: {str(e)}")


# ==================== MARKET NEWS ====================

@api_router.post("/admin/news")
async def create_news(news: MarketNews, current_admin = Depends(get_current_admin)):
    """
    Admin creates market news/event
    """
    try:
        news_doc = {
            "title": news.title,
            "event_time": news.event_time,
            "currency": news.currency,
            "impact": news.impact,
            "signal": news.signal,
            "sender_type": "admin",
            "sender_id": str(current_admin["_id"]),
            "created_at": datetime.utcnow(),
            "status": "active"
        }
        
        result = await db.market_news.insert_one(news_doc)
        
        return {
            "message": "News created successfully",
            "news_id": str(result.inserted_id)
        }
    except Exception as e:
        logger.error(f"Error creating news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create news: {str(e)}")


@api_router.post("/mentor/news")
async def create_mentor_news(news: MarketNews, current_mentor = Depends(get_current_mentor)):
    """
    Mentor creates market news/event for their users
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        news_doc = {
            "title": news.title,
            "event_time": news.event_time,
            "currency": news.currency,
            "impact": news.impact,
            "signal": news.signal,
            "sender_type": "mentor",
            "sender_id": mentor_id,
            "created_at": datetime.utcnow(),
            "status": "active"
        }
        
        result = await db.market_news.insert_one(news_doc)
        
        return {
            "message": "News created successfully",
            "news_id": str(result.inserted_id)
        }
    except Exception as e:
        logger.error(f"Error creating news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create news: {str(e)}")



@api_router.get("/admin/news")
async def get_admin_news(current_admin = Depends(get_current_admin)):
    """
    Get ALL news for admin to view (manual + scraped + live API)
    """
    try:
        # Get manual news from database (admin/mentor sent)
        news_cursor = db.manual_news.find({}).sort("created_at", -1).limit(50)
        manual_news_list = await news_cursor.to_list(length=50)
        
        # Format manual news
        formatted_news = []
        for item in manual_news_list:
            news_item = {
                "id": str(item["_id"]),
                "title": item["title"],
                "sender_type": item.get("sender_type", "system_scraper" if item.get("source") == "forex_factory_auto" else "unknown"),
                "sender_email": item.get("sender_email", ""),
                "created_at": item["created_at"].isoformat() if item.get("created_at") else "",
                "source": item.get("source", "manual")
            }
            
            # Add optional fields if they exist
            if item.get("event_time"):
                news_item["event_time"] = item["event_time"]
            if item.get("currency"):
                news_item["currency"] = item["currency"]
            if item.get("impact"):
                news_item["impact"] = item["impact"]
            if item.get("signal"):
                news_item["signal"] = item["signal"]
            if item.get("description"):
                news_item["description"] = item["description"]
            if item.get("mentor_id"):
                news_item["mentor_id"] = item["mentor_id"]
            
            formatted_news.append(news_item)
        
        # Get live economic calendar (ForexFactory + FMP API fallback)
        try:
            live_events = await fetch_live_economic_calendar()
            if live_events:
                logger.info(f"✅ Adding {len(live_events)} live events to admin news")
                formatted_news.extend(live_events)
        except Exception as e:
            logger.warning(f"Failed to fetch live calendar for admin: {str(e)}")
        
        # Sort by created_at/event_time (most recent first)
        formatted_news.sort(key=lambda x: x.get("created_at", x.get("event_datetime", "")), reverse=True)
        
        # Limit to 100 total news items
        return {"news": formatted_news[:100]}
        
    except Exception as e:
        logger.error(f"Error fetching admin news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")



@api_router.get("/mentor/upcoming-news")
async def get_mentor_upcoming_news(current_mentor = Depends(get_current_mentor)):
    """
    Get upcoming news events for next 7 days for mentor to add signals
    Only shows FUTURE events, no old/past events
    """
    try:
        from datetime import datetime, timedelta
        
        # Fetch live economic calendar (already filtered for next 7 days, future only)
        live_events = await fetch_live_economic_calendar()
        
        # Get all news (admin + mentor's own news)
        mentor_id = current_mentor.get("mentor_id")
        news_cursor = db.market_news.find({
            "$or": [
                {"sender_type": "admin"},
                {"sender_type": "mentor", "sender_id": mentor_id}
            ],
            "status": "active"
        }).sort("created_at", -1)
        manual_news = await news_cursor.to_list(length=100)
        
        # Combine and format
        all_news = []
        now = datetime.utcnow()
        max_future_date = now + timedelta(days=7)
        
        # Add live events (already filtered for upcoming only)
        for event in live_events:
            try:
                event_dt = datetime.fromisoformat(event.get("event_datetime", ""))
                time_diff = (event_dt - now).total_seconds() / 3600  # hours
                
                all_news.append({
                    **event,
                    "is_live": True,
                    "hours_until": round(time_diff, 1)
                })
            except:
                continue
        
        # Get mentor's signals on news events
        mentor_signals = {}
        signals_cursor = db.news_signals.find({"mentor_id": mentor_id})
        signals_list = await signals_cursor.to_list(length=100)
        for sig in signals_list:
            mentor_signals[sig["event_id"]] = sig.get("signal")
        
        # Add manual news (with mentor signals if applicable)
        # Also filter to only show upcoming manual news
        for item in manual_news:
            try:
                # Parse event time
                event_time_str = item.get("event_time", "")
                # If it's a datetime string, parse it
                if "T" in event_time_str or len(event_time_str) > 10:
                    event_dt = datetime.fromisoformat(event_time_str.replace("Z", "+00:00"))
                else:
                    # If just time, assume today
                    today = datetime.utcnow().date()
                    time_obj = datetime.strptime(event_time_str, "%H:%M").time()
                    event_dt = datetime.combine(today, time_obj)
                
                # Only include future events within 7 days
                if event_dt <= now or event_dt > max_future_date:
                    continue
                    
            except:
                # If can't parse date, skip this event
                continue
            
            news_id = str(item["_id"])
            # Check if mentor has set a signal override
            signal = mentor_signals.get(news_id, item.get("signal"))
            
            all_news.append({
                "id": news_id,
                "title": item["title"],
                "event_time": item["event_time"],
                "event_datetime": item.get("event_time"),
                "currency": item["currency"],
                "impact": item["impact"],
                "signal": signal,
                "created_at": item["created_at"].isoformat(),
                "source": "mentor" if item["sender_type"] == "mentor" else "admin",
                "is_live": False
            })
        
        # Sort by time
        logger.info(f"Returning {len(all_news)} upcoming news events for mentor (7-day forecast)")
        return {"news": all_news}
        
    except Exception as e:
        logger.error(f"Error fetching upcoming news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")


@api_router.put("/mentor/news/{news_id}/signal")
async def update_news_signal(
    news_id: str,
    signal_data: dict,
    current_mentor = Depends(get_current_mentor)
):
    """
    Mentor updates signal (BUY/SELL) on a news event
    """
    try:
        mentor_id = current_mentor.get("mentor_id")
        signal = signal_data.get("signal")  # BUY or SELL or None
        
        if signal not in ["BUY", "SELL", None]:
            raise HTTPException(status_code=400, detail="Signal must be BUY, SELL, or None")
        
        # Check if this is mentor's own news in market_news collection
        try:
            # Try to update if it's mentor's own news
            result = await db.market_news.update_one(
                {
                    "_id": ObjectId(news_id),
                    "sender_type": "mentor",
                    "sender_id": mentor_id
                },
                {"$set": {"signal": signal, "updated_at": datetime.utcnow()}}
            )
            
            if result.matched_count > 0:
                # Successfully updated mentor's own news
                pass
            else:
                # Not mentor's own news, store signal in news_signals collection
                # This handles admin news, live events, or other mentor's news
                signal_doc = {
                    "event_id": news_id,
                    "mentor_id": mentor_id,
                    "signal": signal,
                    "updated_at": datetime.utcnow()
                }
                
                # Upsert the signal
                await db.news_signals.update_one(
                    {"event_id": news_id, "mentor_id": mentor_id},
                    {"$set": signal_doc},
                    upsert=True
                )
        except:
            # If ObjectId conversion fails (e.g., for live_ events), use news_signals
            signal_doc = {
                "event_id": news_id,
                "mentor_id": mentor_id,
                "signal": signal,
                "updated_at": datetime.utcnow()
            }
            
            await db.news_signals.update_one(
                {"event_id": news_id, "mentor_id": mentor_id},
                {"$set": signal_doc},
                upsert=True
            )
        
        return {"message": "Signal updated successfully", "signal": signal}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating news signal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update signal: {str(e)}")


@api_router.get("/user/news")
async def get_user_news(current_user = Depends(get_current_user)):
    """
    Get market news for the user (combines live economic calendar + manual news + mentor signals)
    ONLY SHOWS UPCOMING NEWS (not past events)
    """
    try:
        from datetime import datetime
        user_mentor_id = current_user.get("mentor_id")
        now = datetime.utcnow()
        
        # Get manual news from admin and mentor
        query = {
            "$or": [
                {"sender_type": "admin"},
                {"sender_type": "mentor", "mentor_id": user_mentor_id}
            ],
            "status": "active"
        }
        
        news_cursor = db.manual_news.find(query).sort("created_at", -1).limit(20)
        manual_news_list = await news_cursor.to_list(length=20)
        
        # Fetch live economic calendar
        live_news = await fetch_live_economic_calendar()
        
        # Get mentor's signals on live events
        mentor_signals = {}
        if user_mentor_id:
            signals_cursor = db.news_signals.find({"mentor_id": user_mentor_id})
            signals_list = await signals_cursor.to_list(length=100)
            for sig in signals_list:
                mentor_signals[sig["event_id"]] = sig.get("signal")
        
        # Combine manual news with live calendar
        formatted_news = []
        
        # Add ALL manual news (from mentor/admin) - no date filtering
        for item in manual_news_list:
            # Check if event has a datetime - include all events now (no filtering)
            event_datetime_str = item.get("event_time")
            
            news_item = {
                "id": str(item["_id"]),
                "title": item["title"],
                "created_at": item["created_at"].isoformat(),
                "source": "manual"
            }
            
            # Only add optional fields if they exist
            if item.get("event_time"):
                news_item["event_time"] = item["event_time"]
                news_item["event_datetime"] = item["event_time"]
            if item.get("currency"):
                news_item["currency"] = item["currency"]
            if item.get("impact"):
                news_item["impact"] = item["impact"]
            if item.get("signal"):
                news_item["signal"] = item["signal"]
            if item.get("description"):
                news_item["description"] = item["description"]
            
            formatted_news.append(news_item)
        
        # Add live economic calendar events with mentor signals - show ALL (past and upcoming)
        for event in live_news:
            event_id = event.get("id")
            if event_id in mentor_signals:
                event["signal"] = mentor_signals[event_id]
            formatted_news.append(event)
        
        # Sort by event datetime (most recent first)
        formatted_news.sort(key=lambda x: x.get('event_datetime', x.get('created_at', '')), reverse=True)
        
        logger.info(f"Returning {len(formatted_news[:50])} news items (manual + live API)")
        return {"news": formatted_news[:50]}
        
    except Exception as e:
        logger.error(f"Error fetching news: {str(e)}")



@api_router.get("/user/upcoming-news-alerts")
async def get_upcoming_news_alerts(current_user = Depends(get_current_user)):
    """
    Get news events happening within the next 10 minutes for bubble alerts
    """
    try:
        from datetime import datetime, timedelta
        
        user_mentor_id = current_user.get("mentor_id")
        now = datetime.utcnow()
        alert_window = now + timedelta(minutes=10)
        
        # Get live economic calendar
        live_news = await fetch_live_economic_calendar()
        
        # Get mentor's signals on live events
        mentor_signals = {}
        if user_mentor_id:
            signals_cursor = db.news_signals.find({"mentor_id": user_mentor_id})
            signals_list = await signals_cursor.to_list(length=100)
            for sig in signals_list:
                mentor_signals[sig["event_id"]] = sig.get("signal")
        
        # Filter events within 10 minutes
        upcoming_alerts = []
        for event in live_news:
            try:
                event_dt = datetime.fromisoformat(event.get("event_datetime", ""))
                
                # Check if event is within next 10 minutes
                if now <= event_dt <= alert_window:
                    event_id = event.get("id")
                    event["signal"] = mentor_signals.get(event_id)
                    event["minutes_until"] = round((event_dt - now).total_seconds() / 60, 1)
                    upcoming_alerts.append(event)
            except:
                continue
        
        return {"alerts": upcoming_alerts}
        
    except Exception as e:
        logger.error(f"Error fetching upcoming alerts: {str(e)}")
        return {"alerts": []}

        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")


async def fetch_live_economic_calendar():
    """
    Fetch live financial/market news using multiple free APIs with fallback
    Priority: ForexFactory JSON -> FMP API -> Mock Data
    Returns relevant trading news and market events for the next 7 days
    """
    try:
        import httpx
        from datetime import datetime, timedelta
        
        now = datetime.utcnow()
        max_future_date = now + timedelta(days=7)  # Maximum 1 week forecast
        
        # Try Source 1: Forex Factory Economic Calendar (Free, No Auth Required)
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                
                if response.status_code == 200:
                    ff_data = response.json()
                    formatted_events = []
                    
                    for item in ff_data[:30]:  # Limit to 30 items
                        try:
                            # ForexFactory specific parsing
                            event_date = item.get("date", "")
                            impact = item.get("impact", "Medium")
                            
                            # Skip low impact events
                            if impact == "Low":
                                continue
                            
                            formatted_events.append({
                                "id": f"ff_{item.get('title', '').replace(' ', '_')}_{event_date}",
                                "title": item.get("title", "Economic Event")[:100],
                                "event_time": event_date,
                                "event_datetime": event_date,
                                "currency": item.get("country", "USD")[:10],
                                "impact": impact,
                                "signal": None,
                                "created_at": datetime.utcnow().isoformat(),
                                "source": "forex_factory",
                                "description": f"Forecast: {item.get('forecast', 'N/A')}, Previous: {item.get('previous', 'N/A')}"
                            })
                        except Exception as e:
                            logger.error(f"Error parsing ForexFactory item: {str(e)}")
                            continue
                    
                    if formatted_events:
                        logger.info(f"✅ Fetched {len(formatted_events)} events from ForexFactory")
                        return formatted_events
        except Exception as ff_error:
            logger.warning(f"ForexFactory API failed: {str(ff_error)}")
        
        # Try Source 2: FMP API (fallback)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://financialmodelingprep.com/api/v3/stock_news",
                    params={"limit": 50, "apikey": "demo"}
                )
                
                if response.status_code == 200:
                    news_items = response.json()
                    formatted_events = []
                    
                    for item in news_items[:30]:  # Limit to 30 items
                        try:
                            # Parse published date
                            published_at = datetime.strptime(item.get("publishedDate", ""), "%Y-%m-%d %H:%M:%S")
                            
                            # Only include recent news (last 24 hours to next 7 days)
                            time_diff = (published_at - now).total_seconds() / 3600  # hours
                            if time_diff < -24 or time_diff > 168:  # -24h to +7 days
                                continue
                            
                            # Determine impact based on presence in title/description
                            title = item.get("title", "").lower()
                            impact = "Medium"
                            if any(word in title for word in ["breaking", "fed", "inflation", "gdp", "rate", "employment", "earnings", "crash", "surge"]):
                                impact = "High"
                            elif any(word in title for word in ["update", "comment", "opinion", "analysis"]):
                                impact = "Low"
                            
                            # Extract symbol if available
                            currency = item.get("symbol", "MARKET")
                            if not currency or len(currency) > 10:
                                currency = "GENERAL"
                            
                            formatted_events.append({
                                "id": f"fmp_{item.get('url', '').split('/')[-1]}",
                                "title": item.get("title", "Market News")[:100],
                                "event_time": published_at.strftime("%H:%M UTC"),
                                "event_datetime": published_at.isoformat(),
                                "currency": currency[:10],
                                "impact": impact,
                                "signal": None,
                                "created_at": datetime.utcnow().isoformat(),
                                "source": "fmp_news",
                                "description": item.get("text", "")[:200],
                                "url": item.get("url", ""),
                                "site": item.get("site", "")
                            })
                                
                        except Exception as e:
                            logger.error(f"Error parsing FMP news item: {str(e)}")
                            continue
                    
                    if formatted_events:
                        logger.info(f"✅ Fetched {len(formatted_events)} market news events from FMP")
                        return formatted_events
                else:
                    logger.warning(f"FMP API returned {response.status_code}")
        except Exception as api_error:
            logger.warning(f"FMP API failed: {str(api_error)}")
        
        # Fallback: Generate mock news events if API fails
        logger.info("Using mock news data as FMP API is unavailable")
        mock_events = []
        
        # Generate 10 mock news events for the next 7 days
        for i in range(10):
            event_time = now + timedelta(hours=i*6 + 2)  # Events every 6 hours
            
            mock_titles = [
                "Fed Interest Rate Decision Expected Today",
                "US Dollar Strengthens Against Major Currencies",
                "European Central Bank Policy Meeting",
                "Oil Prices Surge on Supply Concerns",
                "Tech Stocks Rally on Strong Earnings",
                "Gold Reaches New High Amid Market Uncertainty",
                "US Employment Report Shows Job Growth",
                "Bitcoin Trading Volume Increases Significantly",
                "EUR/USD Hits Key Support Level",
                "Asian Markets Open Higher on Economic Data"
            ]
            
            currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "GOLD", "OIL"]
            impacts = ["High", "High", "Medium", "High", "Medium", "High", "High", "Medium", "Medium", "Medium"]
            
            mock_events.append({
                "id": f"mock_news_{i}_{int(event_time.timestamp())}",
                "title": mock_titles[i],
                "event_time": event_time.strftime("%H:%M UTC"),
                "event_datetime": event_time.isoformat(),
                "currency": currencies[i],
                "impact": impacts[i],
                "signal": None,
                "created_at": datetime.utcnow().isoformat(),
                "source": "mock_calendar",
                "description": f"Mock trading event for {currencies[i]} - {mock_titles[i]}",
                "url": ""
            })
        
        logger.info(f"Generated {len(mock_events)} mock news events")
        return mock_events
        
    except Exception as e:
        logger.error(f"Error in fetch_live_economic_calendar: {str(e)}")
        return []


@api_router.get("/user/brokers")
async def get_user_brokers(current_user = Depends(get_current_user)):
    """
    Get all active brokers for this user
    Returns all brokers added by admin/mentor (public brokers)
    """
    try:
        # Fetch all active brokers from database
        all_brokers = await db.brokers.find({
            "status": {"$ne": "deleted"}  # Show all non-deleted brokers
        }).sort("created_at", -1).to_list(length=100)
        
        brokers = []
        for broker in all_brokers:
            brokers.append({
                "_id": str(broker["_id"]),
                "broker_name": broker.get("broker_name"),
                "broker_image": broker.get("broker_image"),
                "affiliate_link": broker.get("affiliate_link"),
                "description": broker.get("description"),
                "created_at": broker.get("created_at")
            })
        
        logger.info(f"✅ User {current_user['email']} fetched {len(brokers)} brokers")
        
        return {
            "brokers": brokers,
            "total": len(brokers)
        }
        
    except Exception as e:
        logger.error(f"Error fetching user brokers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch brokers: {str(e)}")


@api_router.post("/user/brokers/{notification_id}/mark-seen")
async def mark_broker_seen(notification_id: str, current_user = Depends(get_current_user)):
    """
    Mark a broker notification as seen
    """
    try:
        user_id = str(current_user["_id"])
        
        result = await db.broker_notifications.update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"seen": True, "seen_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            return {"message": "Broker notification marked as seen"}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking broker seen: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark broker seen: {str(e)}")


@api_router.post("/user/signals/{signal_id}/mark-read")
async def mark_signal_read(signal_id: str, current_user = Depends(get_current_user)):
    """
    Mark a signal as read
    """
    try:
        user_id = str(current_user["_id"])
        
        result = await db.user_signals.update_one(
            {"signal_id": signal_id, "user_id": user_id},
            {"$set": {"read": True, "read_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            return {"message": "Signal marked as read"}
        else:
            raise HTTPException(status_code=404, detail="Signal not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking signal as read: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark signal as read: {str(e)}")


async def root():
    return {"message": "EA Trading API is running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ============================================================================
# ANALYTICS & METRICS ENDPOINTS - MI MOBILE INDICATOR WEB DASHBOARD
# Added: Phase 1 - Backend Extensions
# ============================================================================

@api_router.get("/admin/analytics/overview")
async def get_analytics_overview(current_admin = Depends(get_current_admin)):
    """
    Get complete analytics overview for admin dashboard
    Returns: user stats, revenue, APK metrics, recent activity
    """
    try:
        # User Statistics
        total_users = await db.users.count_documents({"role": "user"})
        active_users = await db.users.count_documents({"role": "user", "status": "active"})
        paid_users = await db.users.count_documents({"role": "user", "payment_status": "paid"})
        pending_users = await db.users.count_documents({"role": "user", "status": "pending"})
        
        # Revenue Statistics
        revenue_pipeline = [
            {"$match": {"payment_status": "paid"}},
            {"$group": {
                "_id": None,
                "total_revenue": {"$sum": 35},  # $35 per user
                "total_paid_users": {"$sum": 1}
            }}
        ]
        revenue_result = await db.users.aggregate(revenue_pipeline).to_list(1)
        total_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0
        
        # Recent registrations (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_registrations = await db.users.count_documents({
            "role": "user",
            "created_at": {"$gte": seven_days_ago}
        })
        
        # License key statistics
        total_licenses = await db.license_keys.count_documents({})
        used_licenses = await db.license_keys.count_documents({"status": "used"})
        unused_licenses = total_licenses - used_licenses
        
        # Recent activity (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_payments = await db.users.count_documents({
            "payment_status": "paid",
            "payment_date": {"$gte": thirty_days_ago}
        })
        
        return {
            "user_stats": {
                "total": total_users,
                "active": active_users,
                "paid": paid_users,
                "pending": pending_users,
                "inactive": total_users - active_users
            },
            "revenue_stats": {
                "total_revenue": total_revenue,
                "paid_users": paid_users,
                "average_per_user": 35,
                "recent_payments_30d": recent_payments
            },
            "license_stats": {
                "total": total_licenses,
                "used": used_licenses,
                "unused": unused_licenses
            },
            "growth_stats": {
                "new_users_7d": recent_registrations,
                "conversion_rate": (paid_users / total_users * 100) if total_users > 0 else 0
            },
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        logger.error(f"Error fetching analytics overview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/analytics/users")
async def get_user_analytics(current_admin = Depends(get_current_admin)):
    """Get detailed user analytics and growth metrics"""
    try:
        # User growth over time (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Daily user registrations
        daily_pipeline = [
            {"$match": {"role": "user", "created_at": {"$gte": thirty_days_ago}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        daily_registrations = await db.users.aggregate(daily_pipeline).to_list(30)
        
        # User status distribution
        status_pipeline = [
            {"$match": {"role": "user"}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        status_distribution = await db.users.aggregate(status_pipeline).to_list(10)
        
        # Payment status distribution
        payment_pipeline = [
            {"$match": {"role": "user"}},
            {"$group": {"_id": "$payment_status", "count": {"$sum": 1}}}
        ]
        payment_distribution = await db.users.aggregate(payment_pipeline).to_list(10)
        
        return {
            "daily_registrations": [
                {"date": item["_id"], "count": item["count"]} 
                for item in daily_registrations
            ],
            "status_distribution": [
                {"status": item["_id"], "count": item["count"]} 
                for item in status_distribution
            ],
            "payment_distribution": [
                {"status": item["_id"], "count": item["count"]} 
                for item in payment_distribution
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching user analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/analytics/revenue")
async def get_revenue_analytics(current_admin = Depends(get_current_admin)):
    """Get detailed revenue analytics"""
    try:
        # Monthly revenue (last 12 months)
        one_year_ago = datetime.utcnow() - timedelta(days=365)
        
        monthly_pipeline = [
            {"$match": {"payment_status": "paid", "payment_date": {"$gte": one_year_ago}}},
            {"$group": {
                "_id": {
                    "year": {"$year": "$payment_date"},
                    "month": {"$month": "$payment_date"}
                },
                "revenue": {"$sum": 35},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]
        monthly_revenue = await db.users.aggregate(monthly_pipeline).to_list(12)
        
        # Total revenue
        total_paid = await db.users.count_documents({"payment_status": "paid"})
        total_revenue = total_paid * 35
        
        # Revenue by approval method
        approval_pipeline = [
            {"$match": {"payment_status": "paid"}},
            {"$group": {
                "_id": "$approval_method",
                "count": {"$sum": 1},
                "revenue": {"$sum": 35}
            }}
        ]
        approval_revenue = await db.users.aggregate(approval_pipeline).to_list(10)
        
        return {
            "total_revenue": total_revenue,
            "total_paid_users": total_paid,
            "monthly_revenue": [
                {
                    "year": item["_id"]["year"],
                    "month": item["_id"]["month"],
                    "revenue": item["revenue"],
                    "users": item["count"]
                }
                for item in monthly_revenue
            ],
            "revenue_by_method": [
                {
                    "method": item["_id"] or "payment",
                    "users": item["count"],
                    "revenue": item["revenue"]
                }
                for item in approval_revenue
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching revenue analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/mentor/analytics/my-users")
async def get_mentor_user_analytics(current_mentor = Depends(get_current_mentor)):
    """Get analytics for mentor's assigned users"""
    try:
        mentor_id = current_mentor.get("mentor_id")
        
        # Total assigned users
        total_users = await db.users.count_documents({"mentor_id": mentor_id})
        active_users = await db.users.count_documents({"mentor_id": mentor_id, "status": "active"})
        paid_users = await db.users.count_documents({"mentor_id": mentor_id, "payment_status": "paid"})
        
        # Revenue from mentor's users
        revenue = paid_users * 35
        
        # Recent activity
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_users = await db.users.count_documents({
            "mentor_id": mentor_id,
            "created_at": {"$gte": seven_days_ago}
        })
        
        return {
            "user_stats": {
                "total": total_users,
                "active": active_users,
                "paid": paid_users,
                "recent_7d": recent_users
            },
            "revenue_stats": {
                "total_revenue": revenue,
                "paid_users": paid_users
            }
        }
    except Exception as e:
        logger.error(f"Error fetching mentor analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# EXPORT ENDPOINTS - CSV/Excel Data Export
# ============================================================================

@api_router.get("/admin/export/users")
async def export_users(current_admin = Depends(get_current_admin)):
    """Export all users to CSV format"""
    try:
        users = await db.users.find({"role": "user"}).to_list(1000)
        
        csv_data = []
        csv_data.append("Email,Name,Status,Payment Status,Created At,License Key,Mentor ID")
        
        for user in users:
            row = [
                user.get("email", ""),
                user.get("name", ""),
                user.get("status", ""),
                user.get("payment_status", ""),
                str(user.get("created_at", "")),
                user.get("license_key", ""),
                user.get("mentor_id", "")
            ]
            csv_data.append(",".join([f'"{field}"' for field in row]))
        
        csv_content = "\n".join(csv_data)
        
        return {
            "filename": f"mi_mobile_users_{datetime.utcnow().strftime('%Y%m%d')}.csv",
            "content": csv_content,
            "total_records": len(users)
        }
    except Exception as e:
        logger.error(f"Error exporting users: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/export/licenses")
async def export_licenses(current_admin = Depends(get_current_admin)):
    """Export all license keys to CSV format"""
    try:
        licenses = await db.license_keys.find({}).to_list(1000)
        
        csv_data = []
        csv_data.append("License Key,Status,Created At,Used By,Generated By")
        
        for lic in licenses:
            row = [
                lic.get("key", ""),
                lic.get("status", ""),
                str(lic.get("created_at", "")),
                lic.get("used_by", ""),
                lic.get("generated_by", "")
            ]
            csv_data.append(",".join([f'"{field}"' for field in row]))
        
        csv_content = "\n".join(csv_data)
        
        return {
            "filename": f"mi_mobile_licenses_{datetime.utcnow().strftime('%Y%m%d')}.csv",
            "content": csv_content,
            "total_records": len(licenses)
        }
    except Exception as e:
        logger.error(f"Error exporting licenses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/export/revenue")
async def export_revenue(current_admin = Depends(get_current_admin)):
    """Export revenue data to CSV format"""
    try:
        paid_users = await db.users.find({"payment_status": "paid"}).to_list(1000)
        
        csv_data = []
        csv_data.append("Email,Name,Payment Date,Amount,Approval Method,License Key")
        
        for user in paid_users:
            row = [
                user.get("email", ""),
                user.get("name", ""),
                str(user.get("payment_date", "")),
                "35",
                user.get("approval_method", "payment"),
                user.get("license_key", "")
            ]
            csv_data.append(",".join([f'"{field}"' for field in row]))
        
        csv_content = "\n".join(csv_data)
        total_revenue = len(paid_users) * 35
        
        return {
            "filename": f"mi_mobile_revenue_{datetime.utcnow().strftime('%Y%m%d')}.csv",
            "content": csv_content,
            "total_records": len(paid_users),
            "total_revenue": total_revenue
        }
    except Exception as e:
        logger.error(f"Error exporting revenue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TRACKING ENDPOINTS - APK Usage Tracking
# ============================================================================

# Tracking data model
class AppTrackingData(BaseModel):
    event_type: str  # "app_open", "feature_usage", "session_end"
    user_id: Optional[str] = None
    data: Optional[dict] = None

@api_router.post("/tracking/app-open")
async def track_app_open(tracking_data: AppTrackingData):
    """Track when user opens the app"""
    try:
        await db.app_tracking.insert_one({
            "event_type": "app_open",
            "user_id": tracking_data.user_id,
            "timestamp": datetime.utcnow(),
            "data": tracking_data.data or {}
        })
        return {"status": "tracked"}
    except Exception as e:
        logger.error(f"Error tracking app open: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/tracking/feature-usage")
async def track_feature_usage(tracking_data: AppTrackingData):
    """Track feature usage in the app"""
    try:
        await db.app_tracking.insert_one({
            "event_type": "feature_usage",
            "user_id": tracking_data.user_id,
            "feature": tracking_data.data.get("feature"),
            "timestamp": datetime.utcnow(),
            "data": tracking_data.data or {}
        })
        return {"status": "tracked"}
    except Exception as e:
        logger.error(f"Error tracking feature usage: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/stats/apk-metrics")
async def get_apk_metrics(current_admin = Depends(get_current_admin)):
    """Get APK usage metrics"""
    try:
        # Total app opens (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        total_opens = await db.app_tracking.count_documents({
            "event_type": "app_open",
            "timestamp": {"$gte": thirty_days_ago}
        })
        
        # Unique users (DAU - Daily Active Users)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_users = await db.app_tracking.distinct("user_id", {
            "event_type": "app_open",
            "timestamp": {"$gte": today_start}
        })
        dau = len([u for u in daily_users if u])
        
        # Weekly Active Users
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        weekly_users = await db.app_tracking.distinct("user_id", {
            "event_type": "app_open",
            "timestamp": {"$gte": seven_days_ago}
        })
        wau = len([u for u in weekly_users if u])
        
        # Feature usage
        feature_usage = await db.app_tracking.aggregate([
            {"$match": {"event_type": "feature_usage", "timestamp": {"$gte": thirty_days_ago}}},
            {"$group": {"_id": "$feature", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]).to_list(10)
        
        return {
            "total_opens_30d": total_opens,
            "daily_active_users": dau,
            "weekly_active_users": wau,
            "monthly_active_users": len(weekly_users),
            "top_features": [
                {"feature": item["_id"], "usage_count": item["count"]}
                for item in feature_usage
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching APK metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/stats/users/{user_id}")
async def get_user_detailed_stats(user_id: str, current_admin = Depends(get_current_admin)):
    """Get detailed stats for a specific user"""
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # User's app opens
        user_opens = await db.app_tracking.count_documents({
            "user_id": user_id,
            "event_type": "app_open"
        })
        
        # Last seen
        last_activity = await db.app_tracking.find_one(
            {"user_id": user_id},
            sort=[("timestamp", -1)]
        )
        
        # Feature usage
        user_features = await db.app_tracking.aggregate([
            {"$match": {"user_id": user_id, "event_type": "feature_usage"}},
            {"$group": {"_id": "$feature", "count": {"$sum": 1}}}
        ]).to_list(20)
        
        return {
            "user_info": {
                "email": user.get("email"),
                "name": user.get("name"),
                "status": user.get("status"),
                "payment_status": user.get("payment_status"),
                "created_at": user.get("created_at")
            },
            "activity": {
                "total_app_opens": user_opens,
                "last_seen": last_activity.get("timestamp") if last_activity else None,
                "features_used": [
                    {"feature": item["_id"], "count": item["count"]}
                    for item in user_features
                ]
            }
        }
    except Exception as e:
        logger.error(f"Error fetching user stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# FOREX FACTORY NEWS SCRAPER - Auto-fetch news every hour
# ============================================================================

async def scrape_forex_factory_news():
    """
    Scrape economic calendar from Forex Factory
    Runs every hour to get upcoming high-impact news events
    """
    try:
        logger.info("Starting Forex Factory news scrape...")
        
        # Use the investpy or scrape ForexFactory RSS/API alternative
        # ForexFactory blocks direct scraping, so we use an alternative source
        
        # Try to get data from a forex calendar API
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Using a free economic calendar API
            today = datetime.utcnow().strftime("%Y-%m-%d")
            tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
            
            # Try multiple sources
            news_items = []
            
            # Source 1: FCS API (Free Forex Calendar Service)
            try:
                response = await client.get(
                    f"https://nfs.faireconomy.media/ff_calendar_thisweek.json",
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data:
                        # Only get high/medium impact events
                        if item.get("impact") in ["High", "Medium"]:
                            news_items.append({
                                "title": item.get("title", "Economic Event"),
                                "currency": item.get("country", "USD"),
                                "impact": item.get("impact", "Medium").lower(),
                                "event_time": item.get("date", ""),
                                "description": f"Forecast: {item.get('forecast', 'N/A')}, Previous: {item.get('previous', 'N/A')}",
                                "source": "forex_factory_auto"
                            })
            except Exception as e:
                logger.warning(f"FCS API failed: {e}")
            
            # If we got news items, save them to database
            if news_items:
                saved_count = 0
                for news in news_items[:20]:  # Limit to 20 events
                    # Check if this news already exists (by title and time)
                    existing = await db.manual_news.find_one({
                        "title": news["title"],
                        "event_time": news["event_time"],
                        "source": "forex_factory_auto"
                    })
                    
                    if not existing:
                        news["created_at"] = datetime.utcnow()
                        news["created_by"] = "system_scraper"
                        await db.manual_news.insert_one(news)
                        saved_count += 1
                
                logger.info(f"Forex Factory scrape complete: {saved_count} new events saved")
                return saved_count
            else:
                logger.info("No new high-impact news events found")
                return 0
                
    except Exception as e:
        logger.error(f"Error scraping Forex Factory: {str(e)}")
        return 0

# Background task to run the scraper every hour
async def forex_news_scheduler():
    """Run forex news scraper every hour"""
    while True:
        try:
            await scrape_forex_factory_news()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        # Wait 1 hour before next scrape
        await asyncio.sleep(3600)

# Manual trigger endpoint for admin
@api_router.post("/admin/scrape-forex-news")
async def trigger_forex_scrape(current_admin = Depends(get_current_admin)):
    """Manually trigger Forex Factory news scrape"""
    try:
        count = await scrape_forex_factory_news()
        return {"message": f"Scrape complete", "new_events": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Start the scheduler on app startup
@app.on_event("startup")
async def start_forex_scheduler():
    """Start the forex news scheduler on app startup"""
    asyncio.create_task(forex_news_scheduler())
    logger.info("Forex Factory news scheduler started - will run every hour")
