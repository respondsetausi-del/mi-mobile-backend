from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime

class User(BaseModel):
    email: EmailStr
    name: str
    mentor_id: str
    license_key: str
    status: str = "active"  # active, inactive, suspended
    created_at: datetime
    last_login: Optional[datetime] = None

class Admin(BaseModel):
    email: EmailStr
    name: str
    role: str = "admin"  # admin, super_admin
    permissions: list = ["view_users", "manage_users", "view_activity"]
    created_at: datetime
    last_login: Optional[datetime] = None

class UserActivity(BaseModel):
    user_id: str
    action: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime
    ip_address: Optional[str] = None
