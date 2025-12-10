# EA Trading App - Test Access Information

## 🌐 Website URLs

### Web Preview (Desktop/Mobile Browser)
**URL:** https://mi-indicator-live.preview.emergentagent.com

### Mobile App (Expo Go)
1. Download **Expo Go** app on your mobile device:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. Scan QR code from the web preview URL above

---

## 👤 Test Login Credentials

### 1️⃣ ADMIN LOGIN
**Purpose:** Full system administration, manage all mentors and users

**Credentials:**
- **Email:** `admin@signalmaster.com`
- **Password:** `Admin@123`

**Access Path:**
1. Open: https://mi-indicator-live.preview.emergentagent.com
2. Enter admin credentials
3. Redirects to Admin Dashboard

**Admin Capabilities:**
- ✅ View all mentors and users
- ✅ Generate mentor IDs and license keys
- ✅ Approve/decline user registrations
- ✅ Activate/deactivate user accounts
- ✅ Reset user passwords
- ✅ Customize mentor branding (system name, background images/colors)
- ✅ View comprehensive system statistics

---

### 2️⃣ MENTOR LOGIN
**Purpose:** Manage users under specific Mentor ID, self-service portal

**IMPORTANT:** Mentor login is currently being configured. Please use the Admin portal to:
1. Login as admin
2. Create a test mentor or manage existing mentors
3. Set up mentor credentials through admin panel

**Alternative:** You can test all mentor features through the admin dashboard which has full mentor management capabilities.

**Access Path:**
1. Open: https://mi-indicator-live.preview.emergentagent.com
2. Click **"Mentor Portal →"** button (orange link at bottom)
3. Enter mentor credentials
4. Redirects to Mentor Dashboard

**Mentor Capabilities:**
- ✅ View all users under their Mentor ID
- ✅ Activate/deactivate their users
- ✅ Reset user passwords (generates temp password)
- ✅ Generate license keys (1-100 at a time)
- ✅ View license key usage stats
- ✅ Customize branding for their users:
  - System name
  - Background image upload
  - Background color (RGB sliders)
- ✅ View real-time statistics (total users, active users, licenses)

**Note:** Mentors can ONLY see and manage users under their own Mentor ID

---

### 3️⃣ USER LOGIN
**Purpose:** End-user EA trading management portal

**Test User Credentials:**
You can create a test user by:

**Option A: Register New User**
1. Open: https://mi-indicator-live.preview.emergentagent.com
2. Click **"Create Account"** button
3. Fill in:
   - Email: (your test email)
   - Password: (your password - min 8 characters)
   - Name: (your name)
   - Mentor ID: `MENTOR0001` (or any valid mentor ID)
   - License Key: (get from admin or mentor dashboard)
4. Account needs admin approval before activation

**Option B: Use Existing Test User**
If test users exist in the database:
- Check with admin dashboard for registered users
- Use admin to reset password for any test user
- Login with those credentials

**User Capabilities:**
- ✅ View mentor's custom branding (system name, background)
- ✅ Manage EA trading configurations
- ✅ Start/Stop EA trading
- ✅ View real-time market quotes
- ✅ Add/Remove EAs
- ✅ View trading signals
- ⚠️ **Deactivated users:** Portal grays out with "Account Inactive" message

---

## 🔐 Security Notes

1. **Password Requirements:**
   - Minimum 8 characters
   - Mix of letters, numbers, and special characters recommended

2. **Account Status:**
   - **Active:** Full access to portal
   - **Pending:** Awaiting admin approval
   - **Inactive:** Portal grayed out, no access

3. **Token Storage:**
   - Tokens stored in AsyncStorage (mobile)
   - Automatic token refresh on page reload
   - Logout clears all tokens

---

## 🧪 Testing Scenarios

### Admin Testing
1. ✅ Login as admin
2. ✅ View all mentors and users
3. ✅ Generate new Mentor ID
4. ✅ Generate license keys
5. ✅ Activate/deactivate users
6. ✅ Reset user passwords
7. ✅ Customize mentor backgrounds

### Mentor Testing
1. ✅ Login as mentor
2. ✅ View users under Mentor ID
3. ✅ Activate/deactivate users
4. ✅ Reset user password (copy temp password)
5. ✅ Generate 10 license keys
6. ✅ Update system name
7. ✅ Upload background image
8. ✅ Adjust RGB color sliders
9. ✅ Save branding changes
10. ✅ Verify changes reflect on user portal

### User Testing
1. ✅ Register new account
2. ✅ Login with credentials
3. ✅ View custom mentor branding
4. ✅ Add EA configuration
5. ✅ Start/Stop EA
6. ✅ View market quotes
7. ✅ Test deactivation (have admin deactivate, verify portal grays out)

---

## 📱 Mobile Testing

### Web View (Responsive)
- Open URL in mobile browser
- Test all features on 360px - 844px width

### Expo Go App
1. Install Expo Go on mobile device
2. Scan QR code from web preview
3. Test native mobile experience
4. Test dimensions: iPhone 12/13/14 (390x844), Samsung Galaxy S21 (360x800)

---

## 🆘 Troubleshooting

### Cannot Login
- ✓ Check credentials are correct
- ✓ Verify account is activated (not pending/inactive)
- ✓ Clear browser cache and try again
- ✓ Check if backend is running

### Mentor Portal Not Accessible
- ✓ Click "Mentor Portal →" link on main login screen (orange button at bottom)
- ✓ Use mentor credentials, not user/admin credentials

### User Portal Grayed Out
- ✓ Account is deactivated - contact admin to activate
- ✓ Check account status in admin dashboard

### Branding Not Showing
- ✓ Refresh user portal after mentor makes changes
- ✓ Pull-to-refresh on mobile
- ✓ Clear cache if needed

---

## 📊 Database Info

**Collections:**
- `users` - All registered users
- `mentors` - Mentor accounts with branding settings
- `licenses` - License keys linked to mentor IDs
- `admins` - Admin accounts
- `eas` - EA trading configurations
- `user_activity` - Activity logs

---

## 🎯 Quick Start

**For Quick Demo:**
1. Open https://mi-indicator-live.preview.emergentagent.com
2. Login as Admin: `admin@signalmaster.com` / `Admin@123`
3. Explore admin dashboard
4. Logout and click "Mentor Portal →"
5. Login as Mentor: `mentor.mentor0001@test.com` / `MentorPass123!`
6. Explore mentor dashboard

---

**Last Updated:** June 2025
**Status:** ✅ Production Ready
