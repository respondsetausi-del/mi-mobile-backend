# MI Mobile Indicator - Complete Source Code

## Project Structure

```
mi-mobile-complete/
├── frontend/          # Expo React Native mobile app
│   ├── app/          # Screens and routes
│   ├── components/   # Reusable components
│   ├── contexts/     # React contexts
│   ├── services/     # API services
│   ├── store/        # State management
│   ├── package.json  # Dependencies
│   ├── app.json      # Expo configuration
│   └── eas.json      # EAS Build configuration
└── backend/          # FastAPI Python backend
    ├── server.py     # Main API server
    ├── auth.py       # Authentication
    ├── models.py     # Data models
    └── requirements.txt  # Python dependencies
```

## Setup Instructions

### 1. Frontend Setup (Mobile App)

```bash
cd frontend
npm install  # or yarn install
```

**Edit Configuration:**
- Open `app.json` and update `extra.EXPO_PUBLIC_BACKEND_URL` with your backend URL
- Open `.env` and configure environment variables

**Run Development:**
```bash
npx expo start
```

**Build APK:**
```bash
# Login to Expo
npx eas login

# Configure build
npx eas build:configure

# Build for Android
npx eas build --platform android --profile preview
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

**Edit Configuration:**
- Create `.env` file with your MongoDB URL and API keys
- Update `MONGO_URL`, `JWT_SECRET_KEY`, etc.

**Run Development:**
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**Deploy Backend:**
- Railway: Push to GitHub and deploy via Railway dashboard
- Render: Connect GitHub repo and deploy
- Heroku: `heroku create && git push heroku main`

## Making Changes

### Change Login Page Background Color:

Edit `frontend/app/index.tsx` (main login page):
```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',  // Change this color
  },
  // ... other styles
});
```

### Change App Theme:

Edit colors in:
- `frontend/app/(tabs)/_layout.tsx` - Tab bar colors
- `frontend/app/(tabs)/index.tsx` - Home screen
- All other screens in `frontend/app/`

### Add New Features:

1. Add new screen: Create file in `frontend/app/your-screen.tsx`
2. Add navigation: Update `frontend/app/(tabs)/_layout.tsx`
3. Add backend API: Edit `backend/server.py`

## Building Final APK

After making your changes:

```bash
cd frontend

# Build production APK
npx eas build --platform android --profile production

# Or build locally (requires Android SDK)
npx eas build --platform android --profile preview --local
```

## Environment Variables Needed

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

### Backend (.env)
```
MONGO_URL=mongodb+srv://your-connection-string
DB_NAME=mi_mobile_indicator
JWT_SECRET_KEY=your-secret-key
STRIPE_API_KEY=your-stripe-key
TWELVE_DATA_API_KEY=your-twelve-data-key
```

## Test Credentials

- **Admin:** admin@signalmaster.com / Admin@123
- **User:** testuser@apk.com / TestAPK@123

## Important Notes

1. **Backend URL:** Update in `frontend/app.json` under `extra.EXPO_PUBLIC_BACKEND_URL`
2. **APK Signing:** Configure in EAS dashboard for production builds
3. **Icons & Splash:** Edit in `frontend/app.json`
4. **App Name:** Change in `frontend/app.json`

## Support

For questions or issues, refer to:
- Expo Docs: https://docs.expo.dev
- React Native Docs: https://reactnative.dev
- FastAPI Docs: https://fastapi.tiangolo.com
