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

### 3. Set Environment Variables in Render
In the Render dashboard, add these environment variables:

```
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
```

### 4. Deploy
- Click "Create Web Service"
- Wait for deployment (5-10 minutes)
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
