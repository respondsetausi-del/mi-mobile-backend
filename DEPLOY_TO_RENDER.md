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

### 3. Set Environment Variables in Render
In the Render dashboard, add these environment variables:

```
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
```

### 4. Deploy
- Click "Create Web Service"
- Wait for deployment (5-10 minutes)
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

