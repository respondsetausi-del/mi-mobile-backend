# MI Mobile Indicator Backend

FastAPI backend for the MI Mobile Indicator forex trading application.

## Features
- JWT Authentication (Admin/Mentor/User roles)
- MongoDB database integration
- Real-time market data (Twelve Data API)
- Technical analysis and signal generation
- Stripe payment integration
- Email notifications (Mailgun)
- License key management
- Keep-alive service for 24/7 uptime

## Deployment
See [DEPLOY_TO_RENDER.md](./DEPLOY_TO_RENDER.md) for deployment instructions.

## Environment Variables Required
- MONGO_URL
- JWT_SECRET_KEY
- STRIPE_API_KEY
- TWELVE_DATA_API_KEY
- SMTP credentials
- MARKETAUX_API_KEY

## Local Development
```bash
pip install -r requirements.txt
uvicorn server:app --reload
```
