import random
import time
from datetime import datetime, timedelta
from typing import List, Dict
import math

class MarketDataSimulator:
    """Simulate realistic market data for various asset classes"""
    
    # Base prices for different symbols
    SYMBOL_BASE_PRICES = {
        # Forex
        "EUR/USD": 1.0850,
        "GBP/USD": 1.2650,
        "USD/JPY": 149.50,
        "AUD/USD": 0.6450,
        "USD/CAD": 1.3550,
        "NZD/USD": 0.5850,
        "USD/CHF": 0.8950,
        "EUR/GBP": 0.8580,
        
        # Crypto
        "BTC/USD": 45000.00,
        "ETH/USD": 2400.00,
        "BNB/USD": 310.00,
        "XRP/USD": 0.5200,
        "ADA/USD": 0.3800,
        "SOL/USD": 98.00,
        
        # Metals
        "XAU/USD": 2050.00,  # Gold
        "XAG/USD": 24.50,     # Silver
        "XPT/USD": 920.00,    # Platinum
        "XPD/USD": 1050.00,   # Palladium
        
        # Indices
        "US30": 38500.00,      # Dow Jones
        "SPX500": 4950.00,     # S&P 500
        "NAS100": 17200.00,    # Nasdaq
        "UK100": 7650.00,      # FTSE 100
        "GER40": 17100.00,     # DAX
        "JPN225": 33500.00,    # Nikkei
    }
    
    # Volatility factors for different asset classes
    VOLATILITY = {
        "forex": 0.0005,
        "crypto": 0.02,
        "metals": 0.008,
        "indices": 0.01,
    }
    
    def __init__(self):
        self.price_history = {}  # Store price history for indicators
        self.last_update = {}
        self._initialize_history()
    
    def _initialize_history(self):
        """Initialize price history with realistic data"""
        for symbol, base_price in self.SYMBOL_BASE_PRICES.items():
            category = self._get_category(symbol)
            volatility = self.VOLATILITY[category]
            
            # Generate 200 historical candles
            history = []
            current_price = base_price
            
            for i in range(200):
                # Add trend and randomness
                trend = math.sin(i / 20) * volatility * 2
                noise = random.uniform(-volatility, volatility)
                change = (trend + noise) * current_price
                current_price += change
                
                # Generate OHLC
                open_price = current_price
                high_price = open_price * (1 + abs(random.uniform(0, volatility)))
                low_price = open_price * (1 - abs(random.uniform(0, volatility)))
                close_price = random.uniform(low_price, high_price)
                
                history.append({
                    "open": round(open_price, 5),
                    "high": round(high_price, 5),
                    "low": round(low_price, 5),
                    "close": round(close_price, 5),
                    "volume": random.randint(1000, 100000)
                })
                
                current_price = close_price
            
            self.price_history[symbol] = history
            self.last_update[symbol] = time.time()
    
    def _get_category(self, symbol: str) -> str:
        """Determine asset category"""
        if symbol.startswith("XAU") or symbol.startswith("XAG") or symbol.startswith("XPT") or symbol.startswith("XPD"):
            return "metals"
        elif symbol in ["BTC/USD", "ETH/USD", "BNB/USD", "XRP/USD", "ADA/USD", "SOL/USD"]:
            return "crypto"
        elif symbol in ["US30", "SPX500", "NAS100", "UK100", "GER40", "JPN225"]:
            return "indices"
        else:
            return "forex"
    
    def get_current_price(self, symbol: str) -> Dict:
        """Get current price data for symbol"""
        if symbol not in self.price_history:
            return None
        
        # Update price if enough time has passed (simulate real-time)
        current_time = time.time()
        if current_time - self.last_update[symbol] > 1:  # Update every second
            self._update_price(symbol)
            self.last_update[symbol] = current_time
        
        latest = self.price_history[symbol][-1]
        category = self._get_category(symbol)
        
        return {
            "symbol": symbol,
            "category": category,
            "bid": latest["close"] * 0.9999,
            "ask": latest["close"] * 1.0001,
            "open": latest["open"],
            "high": latest["high"],
            "low": latest["low"],
            "close": latest["close"],
            "volume": latest["volume"],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _update_price(self, symbol: str):
        """Update price with new candle"""
        history = self.price_history[symbol]
        last_candle = history[-1]
        category = self._get_category(symbol)
        volatility = self.VOLATILITY[category]
        
        # Generate new candle based on last close
        current_price = last_candle["close"]
        change_percent = random.uniform(-volatility, volatility)
        new_price = current_price * (1 + change_percent)
        
        open_price = current_price
        high_price = max(open_price, new_price) * (1 + abs(random.uniform(0, volatility / 2)))
        low_price = min(open_price, new_price) * (1 - abs(random.uniform(0, volatility / 2)))
        close_price = new_price
        
        new_candle = {
            "open": round(open_price, 5),
            "high": round(high_price, 5),
            "low": round(low_price, 5),
            "close": round(close_price, 5),
            "volume": random.randint(1000, 100000)
        }
        
        # Keep last 200 candles
        history.append(new_candle)
        if len(history) > 200:
            history.pop(0)
    
    def get_price_history(self, symbol: str, count: int = 100) -> List[Dict]:
        """Get historical price data"""
        if symbol not in self.price_history:
            return []
        
        return self.price_history[symbol][-count:]
    
    def get_all_symbols(self) -> Dict[str, List[str]]:
        """Get all available symbols grouped by category"""
        symbols = {
            "forex": [],
            "crypto": [],
            "metals": [],
            "indices": []
        }
        
        for symbol in self.SYMBOL_BASE_PRICES.keys():
            category = self._get_category(symbol)
            symbols[category].append(symbol)
        
        return symbols

# Global market simulator instance
market_simulator = MarketDataSimulator()
