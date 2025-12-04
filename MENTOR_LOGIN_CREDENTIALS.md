# 🔐 MENTOR LOGIN CREDENTIALS

## ✅ WORKING MENTOR LOGINS

### 🌐 Access URL
**https://mi-indicator-live.preview.emergentagent.com**

### 📍 How to Access Mentor Portal
1. Open the main website
2. Click **"Mentor Portal →"** button (orange link at bottom of login page)
3. Enter mentor credentials below

---

## 👥 MENTOR ACCOUNTS

### Mentor 1
```
Email:    mentor1@test.com
Password: Test1234
Mentor ID: MENTOR0001
Company:  Alpha Trading Co
```

### Mentor 2  
```
Email:    mentor2@test.com
Password: Test5678
Mentor ID: MENTOR0002
Company:  Beta Investments
```

---

## 🎯 What Mentors Can Do

### User Management
- ✅ View all users under their Mentor ID
- ✅ Activate pending users
- ✅ Deactivate active users  
- ✅ Reset user passwords (generates secure temporary password)
- ✅ View user details (email, license key, status, registration date)

### License Management
- ✅ Generate 1-100 license keys at once
- ✅ View all licenses with used/available status
- ✅ Track license usage statistics
- ✅ Automatic limit enforcement (max 100 licenses per mentor)

### Branding Customization
- ✅ Set custom system name (displayed on user portals)
- ✅ Upload custom background images
- ✅ Set background color with RGB sliders
- ✅ Live preview of color changes
- ✅ Remove/reset custom branding

### Dashboard Features
- ✅ Real-time statistics (total users, active, pending, inactive)
- ✅ License usage metrics
- ✅ Expandable user cards with full details
- ✅ Pull-to-refresh data updates
- ✅ Logout functionality

---

## 🧪 Testing Scenarios

### Test User Management
1. Login as mentor1@test.com
2. View users under MENTOR0001
3. Test activate/deactivate user
4. Reset a user password
5. Copy temporary password from alert
6. Logout and login as that user with temp password

### Test License Generation
1. Click "Generate Keys" button
2. Enter number (try 5, 10, 25)
3. Verify licenses appear in list
4. Check used/available counts

### Test Branding
1. Click "Branding" button in quick actions
2. Update system name (e.g., "Alpha Pro Trading v2.0")
3. Upload a background image
4. Adjust RGB sliders for color overlay
5. Click "Save All Changes"
6. Login as a user under this mentor
7. Verify custom branding appears on user portal

### Test Security
1. Try to login with wrong password - should fail
2. Login successfully
3. Logout
4. Try to access dashboard without login - should redirect

---

## 📱 Mobile Testing

### Web Browser (Mobile)
- Open URL on mobile browser
- Click "Mentor Portal →"
- Login with mentor credentials
- Test all features on small screen

### Expo Go App  
- Install Expo Go on your device
- Scan QR code from web preview
- Navigate to mentor login
- Test native mobile experience

---

## 🔒 Security Features

### Authentication
- ✅ JWT token-based authentication
- ✅ Secure password hashing (bcrypt)
- ✅ Token stored in AsyncStorage
- ✅ Auto-logout on invalid token

### Authorization
- ✅ Mentors can ONLY see their own users
- ✅ Cannot access other mentors' data
- ✅ Proper role-based access control
- ✅ Protected API endpoints

### Data Isolation
- ✅ Each mentor has separate user pool
- ✅ License keys linked to specific mentor
- ✅ Branding settings per mentor
- ✅ No cross-mentor data leakage

---

## ⚠️ Important Notes

1. **Database:** Backend uses `test_database` collection
2. **Mentor IDs:** MENTOR0001 and MENTOR0002 are active
3. **Password Reset:** Generates 12-character secure passwords
4. **License Limits:** Each mentor can have max 100 licenses
5. **User Limits:** Each mentor can have max 50 users
6. **Branding:** Changes reflect immediately on user portals

---

## 🆘 Troubleshooting

### Cannot Login
- ✓ Check you're on "Mentor Portal" not main login
- ✓ Verify email and password are exact (case-sensitive)
- ✓ Clear browser cache and try again

### Dashboard Not Loading  
- ✓ Check internet connection
- ✓ Verify token is valid (try logout and login again)
- ✓ Pull-to-refresh to reload data

### Users Not Showing
- ✓ Ensure users are registered with your Mentor ID
- ✓ Check user status (pending/active/inactive)
- ✓ Refresh dashboard

### Branding Not Applying
- ✓ Click "Save All Changes" after modifications
- ✓ User must logout and login to see new branding
- ✓ Clear app cache if needed

---

**Last Updated:** November 2025
**Status:** ✅ Fully Functional & Tested
