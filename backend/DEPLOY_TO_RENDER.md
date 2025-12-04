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
JWT_SECRET_KEY=<your-jwt-secret-key>
STRIPE_API_KEY=<your-stripe-secret-key>
TWELVE_DATA_API_KEY=<your-twelve-data-api-key>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASSWORD=<your-email-password>
SENDER_EMAIL=<your-sender-email>
MARKETAUX_API_KEY=<your-marketaux-api-key>
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
