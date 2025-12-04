# CLIENT TESTING CREDENTIALS DOCUMENTATION
## Signal Master Trading App - Complete Login Credentials

**Generated:** 2025-11-08  
**Database:** test_database  
**Environment:** Production

---

## 🔐 IMPORTANT SECURITY NOTES

1. **All passwords are securely hashed** in the database and cannot be retrieved in plaintext
2. **Temporary passwords** can be generated using the password reset functionality
3. **Recent temporary passwords** are available in backend logs (see section below)
4. For production handover, client should reset all passwords immediately

---

## 1. ADMIN ACCOUNTS

### Admin #1 - System Administrator
- **Email:** `admin@signalmaster.com`
- **Name:** System Admin
- **Role:** super_admin
- **Status:** Active
- **Database ID:** `690533e9652c5afa2fa62735`
- **Last Login:** 2025-11-08 10:05:33
- **Password:** `Admin@123` (Known password - verify with client)
- **Access Level:** Full system access (users, mentors, licenses, payments)

**Admin Capabilities:**
- Manage all users and mentors
- Generate and manage license keys
- View payment transactions
- Activate/deactivate accounts
- Reset passwords for all users
- View system statistics and activity logs

---

## 2. MENTOR ACCOUNTS

### Mentor #1 - MENTOR0001 (ACTIVE)
- **Email:** `legacymentor0001@placeholder.com`
- **Name:** Legacy Mentor MENTOR0001
- **Mentor ID:** MENTOR0001
- **System Name:** Sniper
- **Status:** Active ✅
- **Database ID:** `69066263206685e2c87e981b`
- **Password:** `Mentor@123` (Known password - manually reset)
- **Last Login:** 2025-11-08 10:05:35
- **Phone:** +0000000000
- **Social Media:** @mentor0001
- **Max Users:** 50
- **Max Licenses:** 100
- **Current Users:** 2 (collenbelly7@icloud.com, respondscooby@gmail.com)
- **Total Licenses:** 0
- **Used Licenses:** 0
- **Available Licenses:** 0

**Mentor Capabilities:**
- View dashboard with user statistics
- Manage users under their mentor ID
- Activate/deactivate their users
- Reset passwords for their users
- Generate license keys (up to 100)
- Customize branding (system name, background image/color)

---

### Mentor #2 - MENTOR0003 (INACTIVE)
- **Email:** `legacymentor0003@placeholder.com`
- **Name:** Legacy Mentor MENTOR0003
- **Mentor ID:** MENTOR0003
- **Status:** Inactive ❌
- **Database ID:** `69067f423dc0dd1b62f44e05`
- **Password:** [HASHED - Requires Reset]
- **Last Login:** Never
- **Phone:** +0000000000
- **Social Media:** @mentor0003
- **Current Users:** 0
- **Note:** Account is deactivated, cannot login

---

### Mentor #3 - MENTOR0006 (ACTIVE)
- **Email:** `respondscoobyy@gmail.com`
- **Name:** Respond Thabang Setausi
- **Mentor ID:** MENTOR0006
- **Status:** Active ✅
- **Database ID:** `690aed81fb1caf98d379e580`
- **Password:** [HASHED - Requires Reset]
- **Last Login:** 2025-11-08 08:28:51
- **Phone:** 0739081457
- **Social Media:** arizefx
- **License Key Used:** DJB7-TKTU-R0S8-FQ73
- **Current Users:** 0
- **Total Licenses:** 0

---

### Mentors #4-7 - DECLINED/PENDING
- **Status:** Declined ❌
- **Mentor IDs:** Not assigned (pending approval)
- **Emails:**
  - `pending@mentor.test`
  - `newmentor@test.com`
  - `freshmentor@test.com`
  - `finaltest@mentor.com`
- **Note:** These accounts were declined and cannot login

---

### Mentor #8 - MENTOR0008
- **Email:** N/A
- **Mentor ID:** MENTOR0008
- **Status:** N/A
- **Database ID:** `690dcb0897ff2af6fd884e5c`
- **Note:** Incomplete mentor record, no contact information

---

## 3. REGULAR USER ACCOUNTS

### User #1 - Belly (PAID & ACTIVE)
- **Email:** `collenbelly7@icloud.com`
- **Name:** Belly
- **License Key:** F4G2-FGZA-1DS7-4H7I
- **Mentor ID:** MENTOR0001
- **Account Status:** Active ✅
- **Payment Status:** Paid ✅
- **Payment Date:** 2025-11-07
- **Database ID:** `690c9da33de77738e3174380`
- **Last Login:** 2025-11-08 10:05:36
- **Requires Password Change:** Yes
- **Recent Temporary Password:** `diQL*sm9!Yrs` (Generated: 2025-11-08 10:05:35)
- **Previous Temp Passwords:**
  - `IGEW56H^iXav` (2025-11-08 10:04:48)
  - `uc^d3PaikI7v` (2025-11-08 09:39:49)

**User Access:**
- Full access to trading signals
- Can view market data and quotes
- Access to mentor's branded portal (Sniper system)
- Can manage EA configurations
- Can change password after first login

---

### User #2 - Scooby (PAID & ACTIVE)
- **Email:** `respondscooby@gmail.com`
- **Name:** Scooby
- **License Key:** TEST-KEY-17625536
- **Mentor ID:** MENTOR0001
- **Account Status:** Active ✅
- **Payment Status:** Paid ✅
- **Payment Date:** N/A
- **Database ID:** `690e6f0e16db68148c977571`
- **Last Login:** 2025-11-08 09:39:48
- **Requires Password Change:** Yes
- **Recent Temporary Password:** `DhIFJ#qvvbwu` (Generated: 2025-11-08 09:39:47)
- **Previous Temp Password:** `rvnBpNGkXpYE` (2025-11-08 09:39:16)

**User Access:**
- Full access to trading signals
- Can view market data and quotes
- Access to mentor's branded portal (Sniper system)
- Can manage EA configurations
- Can change password after first login

---

## 4. TEST ACCOUNTS

**Status:** No dedicated test accounts identified in database

**Note:** Both current users (collenbelly7@icloud.com and respondscooby@gmail.com) appear to be real client accounts based on:
- Real email addresses (icloud.com, gmail.com)
- Paid status
- Active usage patterns
- Associated with MENTOR0001

---

## 5. AVAILABLE LICENSE KEYS FOR TESTING

**Total License Keys:** 71
- **Used:** 35
- **Available:** 36

### Sample Available License Keys (for creating new test accounts):

1. `RGTY-Q1YA-9DH9-A6N1` (No mentor assigned)
2. `RFOG-I2NC-2Z7O-BQ2A` (No mentor assigned)
3. `3LWU-CP8F-MQYB-K3NN` (MENTOR0005)
4. `OK3E-VYLF-C4XV-X524` (MENTOR0005)
5. `FEDD-JLSF-ZP7E-ZJF4` (MENTOR0005)

**Note:** Admin can generate additional license keys as needed via:
- Admin Dashboard → License Management → Generate Keys
- API: `POST /api/admin/licenses/generate?count=X`

---

## 6. PASSWORD RESET METHODS

### Method 1: Self-Service Password Reset (Users/Mentors)
1. Navigate to login page
2. Click "Forgot Password"
3. Enter email address
4. Temporary password sent to email (if email service configured)
5. Check backend logs if email fails

**API Endpoints:**
- User: `POST /api/auth/forgot-password`
- Mentor: `POST /api/mentor/forgot-password`

---

### Method 2: Admin Password Reset (For Users)
1. Admin logs into dashboard (`admin@signalmaster.com`)
2. Navigate to User Management
3. Select user and click "Reset Password"
4. Temporary password displayed and sent to user

**API Endpoint:** `POST /api/admin/users/{user_id}/reset-password`

**Example Response:**
```json
{
  "message": "Temporary password generated successfully",
  "temporary_password": "DhIFJ#qvvbwu",
  "user_email": "user@example.com"
}
```

---

### Method 3: Mentor Password Reset (For Their Users)
1. Mentor logs into dashboard
2. Navigate to User Management
3. Select their user and click "Reset Password"
4. Temporary password displayed and sent to user

**API Endpoint:** `POST /api/mentor/users/{user_id}/reset-password`

---

### Method 4: License Key Password Reset
Users can reset password using email + license key combination:

**API Endpoint:** `POST /api/auth/reset-password-license-only`

**Request Body:**
```json
{
  "email": "user@example.com",
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "new_password": "NewPassword123!"
}
```

---

## 7. SYSTEM STATISTICS

### Account Summary
- **Total Admin Accounts:** 1
- **Total Mentor Accounts:** 8
  - Active: 2
  - Pending: 0
  - Inactive: 1
  - Declined: 5
- **Total User Accounts:** 2
  - Active: 2
  - Pending: 0
  - Inactive: 0
  - Paid: 2
  - Unpaid: 0

### License Summary
- **Total License Keys:** 71
- **Used:** 35
- **Available:** 36

---

## 8. QUICK START TESTING GUIDE

### Test Admin Access
```bash
# Login as admin
POST /api/admin/login
{
  "email": "admin@signalmaster.com",
  "password": "Admin@123"
}

# Expected: JWT token with user_type: "admin"
```

### Test Mentor Access
```bash
# Login as MENTOR0001
POST /api/mentor/login
{
  "email": "legacymentor0001@placeholder.com",
  "password": "Mentor@123"
}

# Expected: JWT token with user_type: "mentor"
```

### Test User Access
```bash
# Login as user (use recent temporary password)
POST /api/auth/login
{
  "email": "collenbelly7@icloud.com",
  "password": "diQL*sm9!Yrs"
}

# Expected: JWT token with user_type: "user", requires_password_change: true
```

---

## 9. BACKEND LOGS - RECENT TEMPORARY PASSWORDS

**Location:** `/var/log/supervisor/backend.err.log`

**Recent Password Resets (Last 24 hours):**

| Timestamp | Email | Temporary Password | Reset By |
|-----------|-------|-------------------|----------|
| 2025-11-08 10:05:35 | collenbelly7@icloud.com | `diQL*sm9!Yrs` | Mentor (MENTOR0001) |
| 2025-11-08 10:04:48 | collenbelly7@icloud.com | `IGEW56H^iXav` | Admin |
| 2025-11-08 09:39:49 | collenbelly7@icloud.com | `uc^d3PaikI7v` | Mentor |
| 2025-11-08 09:39:47 | respondscooby@gmail.com | `DhIFJ#qvvbwu` | Admin |
| 2025-11-08 09:39:16 | respondscooby@gmail.com | `rvnBpNGkXpYE` | Admin |

**Command to check logs:**
```bash
tail -n 100 /var/log/supervisor/backend.err.log | grep "🔑"
```

---

## 10. API ENDPOINTS REFERENCE

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/admin/login` - Admin login
- `POST /api/mentor/login` - Mentor login
- `POST /api/auth/forgot-password` - User password reset
- `POST /api/mentor/forgot-password` - Mentor password reset
- `POST /api/auth/change-password` - Change password (authenticated)

### Admin Endpoints (Requires admin token)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/mentors` - List all mentors
- `GET /api/admin/licenses` - List all license keys
- `POST /api/admin/licenses/generate?count=X` - Generate license keys
- `POST /api/admin/users/{user_id}/activate` - Activate user
- `POST /api/admin/users/{user_id}/deactivate` - Deactivate user
- `POST /api/admin/users/{user_id}/reset-password` - Reset user password
- `DELETE /api/admin/users/{user_id}` - Delete user
- `POST /api/admin/mentors/{mentor_db_id}/approve` - Approve mentor
- `POST /api/admin/mentors/{mentor_db_id}/deactivate` - Deactivate mentor
- `DELETE /api/admin/mentors/{mentor_db_id}` - Delete mentor

### Mentor Endpoints (Requires mentor token)
- `GET /api/mentor/dashboard` - Mentor dashboard stats
- `GET /api/mentor/users` - List mentor's users
- `GET /api/mentor/licenses` - List mentor's licenses
- `POST /api/mentor/licenses/generate` - Generate licenses
- `POST /api/mentor/users/{user_id}/activate` - Activate user
- `POST /api/mentor/users/{user_id}/deactivate` - Deactivate user
- `POST /api/mentor/users/{user_id}/reset-password` - Reset user password
- `PUT /api/mentor/branding/system-name` - Update system name
- `PUT /api/mentor/branding/background` - Update background

### User Endpoints (Requires user token)
- `GET /api/user/profile` - Get user profile
- `GET /api/user/mentor-info` - Get mentor branding info
- `GET /api/user/payment-status` - Get payment status

---

## 11. PRODUCTION HANDOVER CHECKLIST

### Security Actions Required:
- [ ] Reset admin password (`admin@signalmaster.com`)
- [ ] Reset all mentor passwords
- [ ] Reset all user passwords
- [ ] Review and revoke unused license keys
- [ ] Configure email service (SMTP credentials in backend/.env)
- [ ] Update Stripe API keys for production
- [ ] Review and update CORS settings
- [ ] Enable rate limiting for API endpoints
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for MongoDB

### Client Training Required:
- [ ] Admin dashboard navigation
- [ ] User management (activate/deactivate)
- [ ] Mentor management (approve/decline)
- [ ] License key generation and distribution
- [ ] Password reset procedures
- [ ] Payment transaction monitoring
- [ ] System statistics interpretation

---

## 12. SUPPORT CONTACTS

**For Technical Issues:**
- Backend logs: `/var/log/supervisor/backend.err.log`
- Frontend logs: `/var/log/supervisor/expo.out.log`
- Database: MongoDB at `mongodb://localhost:27017`

**Environment Variables:**
- Backend: `/app/backend/.env`
- Frontend: `/app/frontend/.env`

---

## 13. KNOWN WORKING CREDENTIALS SUMMARY

### ✅ CONFIRMED WORKING ACCOUNTS:

**Admin:**
- Email: `admin@signalmaster.com`
- Password: `Admin@123`
- Status: Active, Full Access

**Mentor:**
- Email: `legacymentor0001@placeholder.com`
- Password: `Mentor@123`
- Status: Active, 2 users assigned

**Users:**
- Email: `collenbelly7@icloud.com`
- Password: `diQL*sm9!Yrs` (temporary, requires change)
- Status: Active, Paid

- Email: `respondscooby@gmail.com`
- Password: `DhIFJ#qvvbwu` (temporary, requires change)
- Status: Active, Paid

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-08  
**Generated By:** Testing Agent - Credentials Extraction Script
