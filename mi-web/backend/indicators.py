import numpy as np
from typing import List, Dict, Tuple

class TechnicalIndicators:
    """Calculate technical indicators for trading signals"""
    
    @staticmethod
    def calculate_sma(prices: List[float], period: int) -> float:
        """Simple Moving Average"""
        if len(prices) < period:
            return prices[-1] if prices else 0
        return sum(prices[-period:]) / period
    
    @staticmethod
    def calculate_ema(prices: List[float], period: int) -> float:
        """Exponential Moving Average"""
        if len(prices) < period:
            return prices[-1] if prices else 0
        
        multiplier = 2 / (period + 1)
        ema = sum(prices[:period]) / period
        
        for price in prices[period:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        
        return ema
    
    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> float:
        """Relative Strength Index"""
        if len(prices) < period + 1:
            return 50.0
        
        gains = []
        losses = []
        
        for i in range(1, len(prices)):
            change = prices[i] - prices[i-1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    @staticmethod
    def calculate_macd(prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, float]:
        """MACD (Moving Average Convergence Divergence)"""
        if len(prices) < slow:
            return {"macd": 0, "signal": 0, "histogram": 0}
        
        ema_fast = TechnicalIndicators.calculate_ema(prices, fast)
        ema_slow = TechnicalIndicators.calculate_ema(prices, slow)
        macd_line = ema_fast - ema_slow
        
        # Calculate signal line (EMA of MACD)
        # For simplicity, using last 9 values
        signal_line = macd_line * 0.9  # Simplified
        histogram = macd_line - signal_line
        
        return {
            "macd": round(macd_line, 5),
            "signal": round(signal_line, 5),
            "histogram": round(histogram, 5)
        }
    
    @staticmethod
    def calculate_bollinger_bands(prices: List[float], period: int = 20, std_dev: float = 2.0) -> Dict[str, float]:
        """Bollinger Bands"""
        if len(prices) < period:
            price = prices[-1] if prices else 0
            return {"upper": price, "middle": price, "lower": price}
        
        sma = TechnicalIndicators.calculate_sma(prices, period)
        recent_prices = prices[-period:]
        variance = sum((x - sma) ** 2 for x in recent_prices) / period
        std = variance ** 0.5
        
        upper = sma + (std_dev * std)
        lower = sma - (std_dev * std)
        
        return {
            "upper": round(upper, 5),
            "middle": round(sma, 5),
            "lower": round(lower, 5)
        }
    
    @staticmethod
    def calculate_stochastic(highs: List[float], lows: List[float], closes: List[float], 
                            period: int = 14, k_smooth: int = 3) -> Dict[str, float]:
        """Stochastic Oscillator"""
        if len(closes) < period:
            return {"k": 50.0, "d": 50.0}
        
        recent_high = max(highs[-period:])
        recent_low = min(lows[-period:])
        current_close = closes[-1]
        
        if recent_high == recent_low:
            k = 50.0
        else:
            k = ((current_close - recent_low) / (recent_high - recent_low)) * 100
        
        # Simplified D line (moving average of K)
        d = k * 0.8  # Simplified
        
        return {"k": round(k, 2), "d": round(d, 2)}

class SignalGenerator:
    """Generate BUY/SELL signals based on indicators"""
    
    @staticmethod
    def generate_signal(indicator_type: str, indicator_data: Dict, settings: Dict, 
                       current_price: float, prices: List[float]) -> str:
        """Generate trading signal based on indicator"""
        
        if indicator_type == "MA_CROSSOVER":
            fast_period = settings.get("fast_period", 10)
            slow_period = settings.get("slow_period", 20)
            
            if len(prices) < slow_period:
                return "NEUTRAL"
            
            fast_ma = TechnicalIndicators.calculate_sma(prices, fast_period)
            slow_ma = TechnicalIndicators.calculate_sma(prices, slow_period)
            
            if fast_ma > slow_ma:
                return "BUY"
            elif fast_ma < slow_ma:
                return "SELL"
            return "NEUTRAL"
        
        elif indicator_type == "RSI":
            rsi_value = indicator_data.get("value", 50)
            oversold = settings.get("oversold", 30)
            overbought = settings.get("overbought", 70)
            
            if rsi_value < oversold:
                return "BUY"
            elif rsi_value > overbought:
                return "SELL"
            return "NEUTRAL"
        
        elif indicator_type == "MACD":
            macd = indicator_data.get("macd", 0)
            signal = indicator_data.get("signal", 0)
            
            if macd > signal:
                return "BUY"
            elif macd < signal:
                return "SELL"
            return "NEUTRAL"
        
        elif indicator_type == "BOLLINGER_BANDS":
            upper = indicator_data.get("upper", 0)
            lower = indicator_data.get("lower", 0)
            
            if current_price <= lower:
                return "BUY"
            elif current_price >= upper:
                return "SELL"
            return "NEUTRAL"
        
        elif indicator_type == "STOCHASTIC":
            k = indicator_data.get("k", 50)
            oversold = settings.get("oversold", 20)
            overbought = settings.get("overbought", 80)
            
            if k < oversold:
                return "BUY"
            elif k > overbought:
                return "SELL"
            return "NEUTRAL"
        
        return "NEUTRAL"
