import random
import string
from datetime import datetime
from typing import List, Optional

class LicenseManager:
    """Manages license key generation and validation"""
    
    @staticmethod
    def generate_license_key() -> str:
        """Generate a license key in format XXXX-XXXX-XXXX-XXXX"""
        segments = []
        for _ in range(4):
            segment = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            segments.append(segment)
        return '-'.join(segments)
    
    @staticmethod
    def generate_multiple_keys(count: int) -> List[str]:
        """Generate multiple unique license keys"""
        keys = set()
        while len(keys) < count:
            keys.add(LicenseManager.generate_license_key())
        return list(keys)
    
    @staticmethod
    def validate_format(license_key: str) -> bool:
        """Validate license key format (XXXX-XXXX-XXXX-XXXX)"""
        parts = license_key.split('-')
        if len(parts) != 4:
            return False
        for part in parts:
            if len(part) != 4 or not part.isalnum():
                return False
        return True
    
    @staticmethod
    async def is_license_available(db, license_key: str) -> bool:
        """Check if license key is not already used"""
        existing = await db.users.find_one({"license_key": license_key})
        return existing is None
    
    @staticmethod
    async def is_license_valid(db, license_key: str) -> bool:
        """Check if license key exists in valid licenses and not used"""
        # First check format
        if not LicenseManager.validate_format(license_key):
            return False
        
        # Check if exists in valid licenses
        license_doc = await db.licenses.find_one({"key": license_key})
        if not license_doc:
            return False
        
        # Check if already used
        if license_doc.get('used', False):
            return False
        
        return True
