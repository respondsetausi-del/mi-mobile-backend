"""
Real-time market data integration using free APIs
- Finnhub: Forex, Stocks
- CoinGecko: Cryptocurrency
"""
import httpx
import asyncio
from datetime import datetime
from typing import Dict, Optional
import os

# Free API Keys (sign up at respective sites)
FINNHUB_API_KEY = os.getenv('FINNHUB_API_KEY', 'demo')  # Get free key at finnhub.io
COINGECKO_API_URL = 'https://api.coingecko.com/api/v3'
FINNHUB_API_URL = 'https://finnhub.io/api/v1'

class RealMarketData:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
        self.cache = {}  # Simple cache to avoid hitting rate limits
        self.cache_duration = 15  # 15 seconds cache
        
    async def get_forex_price(self, symbol: str) -> Optional[Dict]:
        """Get real Forex price from Finnhub"""
        try:
            # Convert EUR/USD to OANDA:EUR_USD format
            finnhub_symbol = f"OANDA:{symbol.replace('/', '_')}"
            
            url = f"{FINNHUB_API_URL}/quote"
            params = {
                'symbol': finnhub_symbol,
                'token': FINNHUB_API_KEY
            }
            
            response = await self.client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get('c'):  # Current price
                    return {
                        'symbol': symbol,
                        'price': float(data['c']),
                        'bid': float(data['c']) - 0.0001,  # Approximate spread
                        'ask': float(data['c']) + 0.0001,
                        'high': float(data.get('h', data['c'])),
                        'low': float(data.get('l', data['c'])),
                        'change': float(data.get('d', 0)),
                        'change_percent': float(data.get('dp', 0)),
                        'timestamp': datetime.now().isoformat()
                    }
        except Exception as e:
            print(f"Error fetching Forex data for {symbol}: {e}")
            return None
    
    async def get_crypto_price(self, symbol: str) -> Optional[Dict]:
        """Get real Crypto price from CoinGecko"""
        try:
            # Map symbols to CoinGecko IDs
            crypto_map = {
                'BTC/USD': 'bitcoin',
                'ETH/USD': 'ethereum',
                'XRP/USD': 'ripple',
                'LTC/USD': 'litecoin',
                'ADA/USD': 'cardano',
                'DOT/USD': 'polkadot',
            }
            
            coin_id = crypto_map.get(symbol)
            if not coin_id:
                return None
            
            url = f"{COINGECKO_API_URL}/simple/price"
            params = {
                'ids': coin_id,
                'vs_currencies': 'usd',
                'include_24hr_change': 'true',
                'include_24hr_vol': 'true'
            }
            
            response = await self.client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                if coin_id in data:
                    price_data = data[coin_id]
                    price = price_data['usd']
                    
                    return {
                        'symbol': symbol,
                        'price': float(price),
                        'bid': float(price) * 0.999,  # Approximate spread
                        'ask': float(price) * 1.001,
                        'high': float(price) * 1.02,  # Approximate
                        'low': float(price) * 0.98,
                        'change': float(price_data.get('usd_24h_change', 0)),
                        'change_percent': float(price_data.get('usd_24h_change', 0)),
                        'timestamp': datetime.now().isoformat()
                    }
        except Exception as e:
            print(f"Error fetching Crypto data for {symbol}: {e}")
            return None
    
    async def get_stock_price(self, symbol: str) -> Optional[Dict]:
        """Get real Stock price from Finnhub"""
        try:
            url = f"{FINNHUB_API_URL}/quote"
            params = {
                'symbol': symbol,
                'token': FINNHUB_API_KEY
            }
            
            response = await self.client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get('c'):  # Current price
                    return {
                        'symbol': symbol,
                        'price': float(data['c']),
                        'bid': float(data['c']) - 0.01,
                        'ask': float(data['c']) + 0.01,
                        'high': float(data.get('h', data['c'])),
                        'low': float(data.get('l', data['c'])),
                        'change': float(data.get('d', 0)),
                        'change_percent': float(data.get('dp', 0)),
                        'timestamp': datetime.now().isoformat()
                    }
        except Exception as e:
            print(f"Error fetching Stock data for {symbol}: {e}")
            return None
    
    async def get_commodity_price(self, symbol: str) -> Optional[Dict]:
        """Get commodity prices (Gold, Silver, Oil)"""
        try:
            # Finnhub commodities format
            commodity_map = {
                'XAU/USD': 'OANDA:XAU_USD',  # Gold
                'XAG/USD': 'OANDA:XAG_USD',  # Silver
                'WTI/USD': 'OANDA:WTICO_USD',  # Oil
            }
            
            finnhub_symbol = commodity_map.get(symbol)
            if not finnhub_symbol:
                return None
            
            url = f"{FINNHUB_API_URL}/quote"
            params = {
                'symbol': finnhub_symbol,
                'token': FINNHUB_API_KEY
            }
            
            response = await self.client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get('c'):
                    return {
                        'symbol': symbol,
                        'price': float(data['c']),
                        'bid': float(data['c']) - 0.01,
                        'ask': float(data['c']) + 0.01,
                        'high': float(data.get('h', data['c'])),
                        'low': float(data.get('l', data['c'])),
                        'change': float(data.get('d', 0)),
                        'change_percent': float(data.get('dp', 0)),
                        'timestamp': datetime.now().isoformat()
                    }
        except Exception as e:
            print(f"Error fetching Commodity data for {symbol}: {e}")
            return None
    
    async def get_price(self, symbol: str, category: str) -> Optional[Dict]:
        """Get price for any symbol based on category"""
        # Check cache first
        cache_key = f"{symbol}_{category}"
        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if (datetime.now() - cached_time).seconds < self.cache_duration:
                return cached_data
        
        # Fetch fresh data
        data = None
        if category == 'forex':
            data = await self.get_forex_price(symbol)
        elif category == 'crypto':
            data = await self.get_crypto_price(symbol)
        elif category == 'stock':
            data = await self.get_stock_price(symbol)
        elif category == 'metal' or category == 'commodity':
            data = await self.get_commodity_price(symbol)
        
        # Update cache
        if data:
            self.cache[cache_key] = (data, datetime.now())
        
        return data
    
    async def get_historical_data(self, symbol: str, category: str, timeframe: str = '1H') -> list:
        """Get historical candle data for technical indicators"""
        # For now, we'll use current price to generate recent history
        # In production, you'd fetch actual historical data
        current_data = await self.get_price(symbol, category)
        if not current_data:
            return []
        
        # Generate mock recent history based on current price
        import random
        base_price = current_data['price']
        history = []
        
        for i in range(100, 0, -1):
            variation = random.uniform(-0.01, 0.01)
            price = base_price * (1 + variation)
            history.append({
                'timestamp': datetime.now().isoformat(),
                'open': price * 0.999,
                'high': price * 1.002,
                'low': price * 0.998,
                'close': price,
                'volume': random.randint(1000, 10000)
            })
        
        return history
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

# Global instance
real_market_data = RealMarketData()
