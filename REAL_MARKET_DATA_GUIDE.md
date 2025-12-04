# Real-Time Market Data Integration

## Overview
The EA Trading app now integrates with real market data APIs to provide accurate, live trading signals.

## Data Sources

### 1. **Finnhub** (Forex & Stocks)
- **Free Tier**: 60 API calls per minute
- **Coverage**: Forex pairs, US Stocks, Indices
- **Sign up**: https://finnhub.io/register
- **After signup**: Get your free API key from dashboard

### 2. **CoinGecko** (Cryptocurrency)
- **Free Tier**: 50 calls per minute (no API key required)
- **Coverage**: BTC, ETH, XRP, LTC, ADA, DOT, and more
- **No signup needed** - Works out of the box!

## Setup Instructions

### Get Your Finnhub API Key

1. Visit: https://finnhub.io/register
2. Create a free account (Email + Password)
3. Verify your email
4. Go to dashboard: https://finnhub.io/dashboard
5. Copy your **API Key** (starts with "c...")

### Configure the App

1. Edit `/app/backend/.env` file
2. Replace `FINNHUB_API_KEY=demo` with your actual key:
   ```
   FINNHUB_API_KEY=your_actual_key_here
   ```
3. Restart backend: `sudo supervisorctl restart backend`

## Supported Symbols

### Forex (via Finnhub)
- EUR/USD, GBP/USD, USD/JPY
- AUD/USD, USD/CAD, USD/CHF
- NZD/USD, EUR/GBP

### Cryptocurrency (via CoinGecko)
- BTC/USD (Bitcoin)
- ETH/USD (Ethereum)
- XRP/USD (Ripple)
- LTC/USD (Litecoin)
- ADA/USD (Cardano)
- DOT/USD (Polkadot)

### Metals/Commodities (via Finnhub)
- XAU/USD (Gold)
- XAG/USD (Silver)
- WTI/USD (Oil)

### Stocks (via Finnhub)
- AAPL, GOOGL, MSFT, TSLA
- AMZN, META, NVDA

## How It Works

### Data Flow
1. App requests quote for a symbol (e.g., EUR/USD)
2. Backend tries to fetch **real-time data** from Finnhub/CoinGecko
3. If successful, real data is used (marked with `source: 'real'`)
4. If API fails or rate limit hit, falls back to **simulated data** (marked with `source: 'simulated'`)

### Caching
- Real data is cached for 15 seconds to avoid hitting rate limits
- This ensures smooth operation while staying within free tier limits

### API Endpoints

**Get Quotes (Real-time):**
```
GET /api/quotes
GET /api/quotes?category=forex
GET /api/quotes?category=crypto
```

**Get Trading Signal:**
```
GET /api/signals/EUR/USD?indicator=RSI&timeframe=1H
```

Response includes:
```json
{
  "symbol": "EUR/USD",
  "signal": "BUY",
  "indicator": "RSI",
  "indicator_value": 32.5,
  "current_price": 1.0845,
  "source": "real",
  "timestamp": "2025-01-31T..."
}
```

## Rate Limits

### Finnhub (Free)
- **60 calls/minute** = 1 call per second
- **300 calls/day** total
- Recommendation: Fetch quotes every 15-30 seconds

### CoinGecko (Free)
- **50 calls/minute** = 1 call per 1.2 seconds
- No daily limit
- Recommendation: Fetch crypto prices every 15 seconds

## Current Usage
With 24 symbols across all categories:
- Fetching all quotes every 15 seconds = 96 calls/hour
- Well within free tier limits!

## Testing

### Check if Real Data is Working

1. Login to the app
2. Add a new EA with any symbol
3. Start the EA
4. Check the logs: `tail -f /var/log/supervisor/backend.out.log`
5. Look for "source: real" in responses

### Verify with curl

Test Forex (Finnhub):
```bash
curl "http://localhost:8001/api/signals/EUR%2FUSD?indicator=RSI"
```

Test Crypto (CoinGecko):
```bash
curl "http://localhost:8001/api/signals/BTC%2FUSD?indicator=MACD"
```

## Upgrading to Paid Plans

### When to upgrade?
- Need real-time data (< 1 second delay)
- More than 60 calls/minute
- Need historical data beyond 1 day
- Enterprise-level reliability

### Paid Options
- **Finnhub Pro**: $89/month (unlimited calls, real-time)
- **Polygon.io**: $199/month (stocks, forex, crypto)
- **Oanda**: Free practice account (forex only, real-time)

## Troubleshooting

**"All data showing 'simulated'":**
- Check if FINNHUB_API_KEY is set correctly in .env
- Verify API key is active at finnhub.io
- Check backend logs for API errors

**"Rate limit exceeded":**
- Increase fetch interval to 30+ seconds
- Upgrade to paid plan
- Reduce number of active EAs

**"Symbol not found":**
- Verify symbol format (EUR/USD, BTC/USD)
- Check if symbol is supported by the API
- Some symbols may only work with paid plans

## Support

- Finnhub Docs: https://finnhub.io/docs/api
- CoinGecko API: https://www.coingecko.com/en/api
- Issues: Contact support or check app logs

---

**Status**: ✅ Integration Complete
**Demo Mode**: Works with `FINNHUB_API_KEY=demo` (limited data)
**Production**: Add your real API key for full access
