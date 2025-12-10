# MI MOBILE INDICATOR - Complete File Map

## 📋 **PROJECT OVERVIEW**
- **App Name:** MI Mobile Indicator Fixed
- **Package:** com.mimobile.indicator.fixed
- **Platform:** React Native (Expo SDK 54)
- **Backend:** FastAPI + MongoDB
- **Current Backend URL:** https://forex-mentor-9.preview.emergentagent.com

---

## 🗂️ **DIRECTORY STRUCTURE**

```
/app/frontend/
├── app/                          # Main application screens (Expo Router)
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── _layout.tsx          # Tab bar configuration
│   │   ├── index.tsx            # Home screen (EA management)
│   │   ├── signals.tsx          # Trading signals screen
│   │   ├── news.tsx             # News events screen
│   │   └── brokers.tsx          # Broker affiliates screen
│   │
│   ├── _layout.tsx              # Root layout with splash screen ✅ BLACK BG
│   ├── index.tsx                # Login screen (entry point) ✅ BLACK BG
│   ├── register.tsx             # User registration
│   ├── mentor-login.tsx         # Mentor login portal
│   ├── mentor-register.tsx      # Mentor registration
│   ├── mentor-dashboard.tsx     # Mentor management dashboard
│   ├── admin.tsx                # Admin dashboard
│   ├── payment.tsx              # Stripe payment screen
│   ├── payment-verification.tsx # Payment verification
│   ├── change-password.tsx      # Change password screen
│   ├── waiting-approval.tsx     # Waiting for approval screen
│   └── legal/[document].tsx     # Legal documents (Privacy/Terms)
│
├── components/                   # Reusable UI components
│   ├── AccountStatusGuard.tsx   # Payment/status guard wrapper
│   ├── AddEAModal.tsx           # Add EA modal form
│   ├── RemoveEAModal.tsx        # Remove EA confirmation
│   ├── SymbolsModal.tsx         # Trading symbols selector
│   ├── BrokersModal.tsx         # Broker management modal
│   ├── ConfirmModal.tsx         # Generic confirmation modal
│   ├── UserMenu.tsx             # User menu dropdown
│   └── FloatingBubble.tsx       # Floating action button
│
├── contexts/                     # React contexts
│   └── AuthContext.tsx          # Authentication context provider
│
├── store/                        # State management (Zustand)
│   └── eaStore.ts               # EA state management
│
├── services/                     # Service layer
│   ├── backgroundService.ts     # Background notifications
│   └── mockApi.ts               # Mock API for testing
│
├── hooks/                        # Custom React hooks
│   ├── useNotifications.ts      # Push notifications hook
│   └── useSignalQueue.ts        # Signal queue management
│
├── app.json                     # Expo configuration ✅ UPDATED URLs
├── eas.json                     # EAS Build configuration
├── package.json                 # Dependencies
├── .env                         # Environment variables
├── metro.config.js              # Metro bundler config
├── tsconfig.json                # TypeScript config
└── eslint.config.js             # ESLint config
```

---

## 🔑 **KEY FILES EXPLAINED**

### **Configuration Files**

#### 1. **app.json** ✅ RECENTLY UPDATED
```json
Lines 46 & 51: Backend URLs updated to:
"EXPO_PUBLIC_BACKEND_URL": "https://forex-mentor-9.preview.emergentagent.com"
```
- Expo project configuration
- App name, version, permissions
- **CRITICAL:** Backend URL hardcoded here for APK builds

#### 2. **.env**
```
EXPO_PUBLIC_BACKEND_URL=https://forex-mentor-9.preview.emergentagent.com
EXPO_PACKAGER_HOSTNAME=https://forex-mentor-9.preview.emergentagent.com
EXPO_PACKAGER_PROXY_URL=https://mi-indicator-live.preview.emergentagent.com
```
- Environment-specific URLs
- Used for development/web builds

#### 3. **eas.json**
- EAS Build configuration for Android/iOS
- Defines build profiles: development, preview, production
- Preview profile creates APK files

#### 4. **package.json**
- Dependencies: React Native 0.81.5, Expo 54, React 19
- Key libraries: expo-router, zustand, axios, @stripe/stripe-react-native
- Scripts: start, android, ios, web

---

### **Core Application Files**

#### 5. **app/_layout.tsx** ✅ RECENTLY UPDATED
- Root layout with splash screen
- **Line 60:** Splash background changed to **BLACK (#000)**
- Wraps app with AuthProvider and GestureHandlerRootView
- Shows "MI Mobile Indicator" logo for 2 seconds

#### 6. **app/index.tsx** ✅ WORKING
- Main login screen (entry point)
- **Line 287:** Container background is **BLACK (#000)**
- User/Admin login toggle
- Routes to:
  - Admin → `/admin`
  - Paid users → `/(tabs)` home
  - Unpaid users → `/payment`
  - Password change required → `/change-password`

#### 7. **app/(tabs)/index.tsx**
- Home screen with EA management
- START/STOP EA monitoring
- QUOTES toggle for market data
- ADD EA / REMOVE EA buttons
- Real-time signal display

#### 8. **app/(tabs)/signals.tsx**
- Trading signals history
- Real-time BUY/SELL/NEUTRAL signals
- Technical indicator calculations
- Signal notifications

#### 9. **app/(tabs)/news.tsx**
- Economic calendar events
- High/Medium/Low impact events
- Manual news from admin/mentor
- Push notifications for events

#### 10. **app/(tabs)/brokers.tsx**
- Broker affiliate links
- Custom mentor branding
- Open broker websites

#### 11. **app/admin.tsx**
- Admin dashboard
- User management (activate/deactivate/delete)
- Mentor management (approve/delete)
- License key generation
- Payment status visibility
- Manual news broadcasting

#### 12. **app/mentor-dashboard.tsx**
- Mentor dashboard
- User management for mentor's users
- License key generation (within quota)
- Password reset for users
- Custom branding settings
- Broker affiliate management
- Manual news to mentor's users only

#### 13. **app/payment.tsx**
- Stripe payment integration
- $500 USD fixed price
- Creates Stripe checkout session
- Redirects to Stripe payment page
- Auto-redirects to verification page

#### 14. **app/register.tsx**
- User registration form
- Requires: name, email, password, mentor ID, license key
- Validates license key against mentor
- Creates pending user account
- Redirects to payment page

---

### **State Management**

#### 15. **contexts/AuthContext.tsx**
- Global authentication state
- Login/Register/Logout functions
- Stores token in AsyncStorage
- Auto-login on app start

#### 16. **store/eaStore.ts**
- Zustand store for EA management
- EA list, selected EA, quotes
- CRUD operations for EAs
- Real-time quote polling

---

### **Components**

#### 17. **components/AccountStatusGuard.tsx**
- Wraps protected screens
- Checks payment status
- Redirects unpaid users to payment page
- Prevents access to features

#### 18. **components/ConfirmModal.tsx**
- Generic modal for confirmations
- Used instead of Alert.alert (web compatibility)
- Custom title, message, buttons

#### 19. **components/AddEAModal.tsx**
- Modal form to add new EA
- Fields: EA name, username, password, server
- Validates and creates EA

---

## ⚙️ **BACKEND FILES** (FastAPI)

```
/app/backend/
├── server.py                    # Main FastAPI application
├── auth.py                      # Authentication utilities
├── models.py                    # MongoDB models
├── technical_analysis_service.py # Real market data integration
├── market_simulator.py          # Mock market data
├── email_service.py             # Mailgun email integration
├── init_db.py                   # Database initialization
├── keep_alive.sh                # Backend keep-alive script ✅
├── requirements.txt             # Python dependencies
└── .env                         # Backend environment variables
```

---

## 🔧 **RECENT CHANGES**

### ✅ **Fixed Issues:**
1. **app.json** (Lines 46 & 51): Updated backend URL to `forex-mentor-9.preview.emergentagent.com`
2. **app/_layout.tsx** (Line 60): Changed splash screen background to BLACK (#000)

### ⚠️ **Known Issues:**
- Old APKs built with `mi-indicator-live` URL won't work
- Need to rebuild APK with new backend URL

---

## 📦 **BUILD INFORMATION**

### **Latest APK Build:**
- **URL:** https://expo.dev/artifacts/eas/vbVnQEs57PyL6TjKPNoctf.apk
- **Date:** December 4, 2025 12:00 PM
- **Status:** ❌ **WON'T WORK** (built with old URL)
- **Fix:** Need to rebuild with updated app.json

### **Build Command:**
```bash
cd /app/frontend
npx eas-cli build --platform android --profile preview
```

---

## 🌐 **URLs & ENDPOINTS**

### **Frontend URLs:**
- Web Preview: https://forex-mentor-9.preview.emergentagent.com
- Expo Go QR: Available when running `expo start`

### **Backend API Base:**
- Current: https://forex-mentor-9.preview.emergentagent.com
- Health Check: https://forex-mentor-9.preview.emergentagent.com/api/health

### **Key API Endpoints:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/admin/login` - Admin login
- `POST /api/mentor/login` - Mentor login
- `GET /api/user/profile` - User profile (requires payment)
- `POST /api/payment/create-checkout` - Create Stripe session
- `GET /api/ea` - Get all EAs
- `POST /api/ea` - Create EA
- `POST /api/ea/{id}/start` - Start EA monitoring
- `GET /api/quotes` - Get market quotes
- `GET /api/user/signals/latest` - Get latest signals

---

## 📝 **NOTES**

- **Black Theme:** Enforced throughout app (splash, login, all screens)
- **Payment Required:** All protected routes check payment status
- **Keep-Alive:** Backend has keep-alive service to prevent sleep
- **EAS Build:** Uses preview profile for APK generation
- **Expo Router:** File-based routing (app/ directory)
- **React 19 Canary:** Using experimental React 19

---

**Last Updated:** December 4, 2025
**Status:** ✅ Backend URLs fixed, ready for new APK build
