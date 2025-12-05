<<<<<<< HEAD
# Deploy MI Mobile Indicator Backend to Render

## Prerequisites
- Render account (https://render.com)
- MongoDB Atlas account with database set up
- All API keys ready (Stripe, Twelve Data, SMTP, etc.)

## Deployment Steps

### 1. Create New Web Service
- Go to Render Dashboard
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Select the `backend` branch

### 2. Configure Build Settings
- **Name:** mi-mobile-indicator-backend
- **Environment:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
=======
# Deploy MI Mobile Indicator Backend to Render.com

## Quick Deploy Steps

### 1. Create MongoDB Atlas Database (Free Tier)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a free account
3. Create a new cluster (M0 Free tier)
4. Create a database user with username and password
5. Get your connection string: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/mi_mobile_indicator`

### 2. Deploy to Render.com
1. Go to https://render.com and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub account (or use manual deploy)
4. Select "Build and deploy from a Git repository"
5. Configure:
   - **Name**: mi-mobile-indicator-backend
   - **Region**: Choose closest to your users
   - **Branch**: main
   - **Root Directory**: backend
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
>>>>>>> 8cd9fb2 (Initial commit: MI Mobile Indicator Backend (secrets removed))

### 3. Set Environment Variables in Render
In the Render dashboard, add these environment variables:

```
<<<<<<< HEAD
MONGO_URL=<your-mongodb-atlas-connection-string>
DB_NAME=mi_mobile_indicator
JWT_SECRET_KEY=<generate-a-secure-random-key>
STRIPE_API_KEY=<your-stripe-secret-key>
TWELVE_DATA_API_KEY=<your-twelve-data-api-key>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email-address>
SMTP_PASSWORD=<your-email-app-password>
SENDER_EMAIL=<your-sender-email>
MARKETAUX_API_KEY=<your-marketaux-api-key>
=======
MONGO_URL=mongodb+srv://<your-username>:<your-password>@cluster0.xxxxx.mongodb.net/
DB_NAME=mi_mobile_indicator
JWT_SECRET_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
STRIPE_API_KEY=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
TWELVE_DATA_API_KEY=fade197d6af1440ba7cb285ebeed3306
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mimobileindicator@gmail.com
SMTP_PASSWORD=MImobileindicor@1
SENDER_EMAIL=mimobileindicator@gmail.com
MARKETAUX_API_KEY=OEFGTIfdJUTFSiamPg4kaY4VXtuViV3gBULDwzLW
>>>>>>> 8cd9fb2 (Initial commit: MI Mobile Indicator Backend (secrets removed))
```

### 4. Deploy
- Click "Create Web Service"
- Wait for deployment (5-10 minutes)
<<<<<<< HEAD
- Your backend will be available at: `https://your-service-name.onrender.com`

### 5. Update Frontend
Update the frontend `app.json` file with your new Render URL:
```json
"EXPO_PUBLIC_BACKEND_URL": "https://your-service-name.onrender.com"
```

## Notes
- Free tier services sleep after 15 minutes of inactivity
- Upgrade to paid plan for 24/7 uptime
- Keep-alive service is included in the codebase

=======
- You'll get a permanent URL like: `https://mi-mobile-indicator-backend.onrender.com`

### 5. Update Mobile App
Update `/app/frontend/app.json` with your new Render URL:
```json
"extra": {
  "EXPO_PUBLIC_BACKEND_URL": "https://mi-mobile-indicator-backend.onrender.com",
  "backendUrl": "https://mi-mobile-indicator-backend.onrender.com"
}
```

### 6. Rebuild APK
```bash
cd /app/frontend
npx eas build --platform android --profile preview --non-interactive
```

## Your Production URL
After deployment, your backend will be available at:
`https://mi-mobile-indicator-backend.onrender.com`

This URL is permanent and won't change!
>>>>>>> 8cd9fb2 (Initial commit: MI Mobile Indicator Backend (secrets removed))
