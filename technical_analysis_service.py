"""
Technical Analysis Service for Real-Time Forex Data
Integrates with Twelve Data API and calculates technical indicators
"""

import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from twelvedata import TDClient
import pandas as pd
import numpy as np


class TechnicalAnalysisService:
    """
    Service for fetching forex data and calculating technical indicators
    """
    
    def __init__(self):
        self.api_key = os.environ.get('TWELVE_DATA_API_KEY')
        if not self.api_key:
            raise ValueError("TWELVE_DATA_API_KEY not found in environment variables")
        
        self.client = TDClient(apikey=self.api_key)
        # Cache for data to avoid excessive API calls
        self.data_cache: Dict[str, Dict] = {}
        self.cache_duration = 60  # seconds
    
    def _get_cached_data(self, cache_key: str) -> Optional[Dict]:
        """Get cached data if it exists and is not expired"""
        if cache_key in self.data_cache:
            cached = self.data_cache[cache_key]
            if datetime.now() < cached['expires_at']:
                return cached['data']
        return None
    
    def _set_cached_data(self, cache_key: str, data: Dict):
        """Store data in cache with expiration"""
        self.data_cache[cache_key] = {
            'data': data,
            'expires_at': datetime.now() + timedelta(seconds=self.cache_duration)
        }
    
    def fetch_time_series(self, symbol: str, interval: str = '1min', outputsize: int = 100) -> pd.DataFrame:
        """
        Fetch time series data from Twelve Data API
        
        Args:
            symbol: Trading pair (e.g., 'EUR/USD')
            interval: Time interval (1min, 5min, 15min, 30min, 1h, 4h, 1d)
            outputsize: Number of data points to fetch
            
        Returns:
            DataFrame with OHLCV data
        """
        cache_key = f"{symbol}_{interval}"
        
        # Check cache first
        cached_data = self._get_cached_data(cache_key)
        if cached_data is not None:
            print(f"✅ Using cached data for {symbol} {interval}")
            return pd.DataFrame(cached_data)
        
        try:
            print(f"📤 Fetching data from Twelve Data: {symbol} {interval}")
            
            # Fetch data from Twelve Data
            ts = self.client.time_series(
                symbol=symbol,
                interval=interval,
                outputsize=outputsize,
                timezone="UTC"
            )
            
            # Get the data as DataFrame
            df = ts.as_pandas()
            
            if df is None or df.empty:
                raise ValueError(f"No data received for {symbol}")
            
            # Convert index to datetime if it's not already
            if not isinstance(df.index, pd.DatetimeIndex):
                df.index = pd.to_datetime(df.index)
            
            # Sort by datetime (oldest first)
            df = df.sort_index()
            
            # Cache the data
            self._set_cached_data(cache_key, df.to_dict('records'))
            
            print(f"✅ Fetched {len(df)} data points for {symbol}")
            return df
            
        except Exception as e:
            print(f"❌ Error fetching data for {symbol}: {str(e)}")
            raise
    
    def calculate_rsi(self, df: pd.DataFrame, period: int = 14) -> float:
        """
        Calculate RSI (Relative Strength Index)
        
        Args:
            df: DataFrame with 'close' column
            period: RSI period (default 14)
            
        Returns:
            Current RSI value
        """
        if len(df) < period + 1:
            raise ValueError(f"Not enough data points for RSI calculation. Need at least {period + 1}, got {len(df)}")
        
        # Calculate price changes
        delta = df['close'].diff()
        
        # Separate gains and losses
        gains = delta.where(delta > 0, 0.0)
        losses = -delta.where(delta < 0, 0.0)
        
        # Calculate average gains and losses
        avg_gain = gains.rolling(window=period).mean()
        avg_loss = losses.rolling(window=period).mean()
        
        # Calculate RS and RSI
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        # Return the most recent RSI value
        current_rsi = rsi.iloc[-1]
        return current_rsi
    
    def calculate_macd(self, df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[float, float, float]:
        """
        Calculate MACD (Moving Average Convergence Divergence)
        
        Args:
            df: DataFrame with 'close' column
            fast: Fast EMA period (default 12)
            slow: Slow EMA period (default 26)
            signal: Signal line period (default 9)
            
        Returns:
            Tuple of (macd_line, signal_line, histogram)
        """
        if len(df) < slow + signal:
            raise ValueError(f"Not enough data points for MACD calculation")
        
        # Calculate EMAs
        ema_fast = df['close'].ewm(span=fast, adjust=False).mean()
        ema_slow = df['close'].ewm(span=slow, adjust=False).mean()
        
        # Calculate MACD line
        macd_line = ema_fast - ema_slow
        
        # Calculate signal line
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        
        # Calculate histogram
        histogram = macd_line - signal_line
        
        return (
            macd_line.iloc[-1],
            signal_line.iloc[-1],
            histogram.iloc[-1]
        )
    
    def calculate_sma(self, df: pd.DataFrame, period: int = 20) -> float:
        """
        Calculate SMA (Simple Moving Average)
        
        Args:
            df: DataFrame with 'close' column
            period: SMA period (default 20)
            
        Returns:
            Current SMA value
        """
        if len(df) < period:
            raise ValueError(f"Not enough data points for SMA calculation")
        
        sma = df['close'].rolling(window=period).mean()
        return sma.iloc[-1]
    
    def calculate_ema(self, df: pd.DataFrame, period: int = 20) -> float:
        """
        Calculate EMA (Exponential Moving Average)
        
        Args:
            df: DataFrame with 'close' column
            period: EMA period (default 20)
            
        Returns:
            Current EMA value
        """
        if len(df) < period:
            raise ValueError(f"Not enough data points for EMA calculation")
        
        ema = df['close'].ewm(span=period, adjust=False).mean()
        return ema.iloc[-1]
    
    def generate_signal_rsi(self, rsi: float, oversold: float = 30, overbought: float = 70) -> str:
        """
        Generate trading signal based on RSI
        
        Args:
            rsi: RSI value
            oversold: Oversold threshold (default 30)
            overbought: Overbought threshold (default 70)
            
        Returns:
            'BUY', 'SELL', or 'NEUTRAL'
        """
        if rsi < oversold:
            return 'BUY'
        elif rsi > overbought:
            return 'SELL'
        else:
            return 'NEUTRAL'
    
    def generate_signal_macd(self, macd_line: float, signal_line: float, histogram: float) -> str:
        """
        Generate trading signal based on MACD
        
        Args:
            macd_line: MACD line value
            signal_line: Signal line value
            histogram: Histogram value
            
        Returns:
            'BUY', 'SELL', or 'NEUTRAL'
        """
        # Bullish crossover: MACD crosses above signal line
        if histogram > 0 and macd_line > signal_line:
            return 'BUY'
        # Bearish crossover: MACD crosses below signal line
        elif histogram < 0 and macd_line < signal_line:
            return 'SELL'
        else:
            return 'NEUTRAL'
    
    def generate_signal_ma(self, current_price: float, ma_value: float) -> str:
        """
        Generate trading signal based on Moving Average
        
        Args:
            current_price: Current closing price
            ma_value: Moving average value
            
        Returns:
            'BUY', 'SELL', or 'NEUTRAL'
        """
        # Price above MA = bullish
        if current_price > ma_value:
            return 'BUY'
        # Price below MA = bearish
        elif current_price < ma_value:
            return 'SELL'
        else:
            return 'NEUTRAL'
    
    def calculate_indicator_and_signal(
        self,
        symbol: str,
        indicator_type: str,
        timeframe: str = '15min',
        indicator_params: Optional[Dict] = None
    ) -> Dict:
        """
        Calculate indicator and generate signal for a given symbol
        
        Args:
            symbol: Trading pair (e.g., 'EUR/USD')
            indicator_type: Type of indicator ('RSI', 'MACD', 'SMA', 'EMA')
            timeframe: Time interval
            indicator_params: Optional parameters for the indicator
            
        Returns:
            Dict with indicator values and signal
        """
        try:
            # Default parameters
            params = indicator_params or {}
            
            # Fetch time series data
            df = self.fetch_time_series(symbol, interval=timeframe, outputsize=100)
            
            if df.empty:
                raise ValueError(f"No data available for {symbol}")
            
            current_price = float(df['close'].iloc[-1])
            
            result = {
                'symbol': symbol,
                'indicator_type': indicator_type,
                'timeframe': timeframe,
                'current_price': current_price,
                'timestamp': datetime.now().isoformat()
            }
            
            # Calculate based on indicator type
            if indicator_type.upper() == 'RSI':
                period = params.get('period', 14)
                oversold = params.get('oversold', 30)
                overbought = params.get('overbought', 70)
                
                rsi = self.calculate_rsi(df, period)
                signal = self.generate_signal_rsi(rsi, oversold, overbought)
                
                result.update({
                    'rsi': rsi,
                    'period': period,
                    'signal': signal
                })
                
            elif indicator_type.upper() == 'MACD':
                fast = params.get('fast', 12)
                slow = params.get('slow', 26)
                signal_period = params.get('signal', 9)
                
                macd_line, signal_line, histogram = self.calculate_macd(df, fast, slow, signal_period)
                signal = self.generate_signal_macd(macd_line, signal_line, histogram)
                
                result.update({
                    'macd_line': macd_line,
                    'signal_line': signal_line,
                    'histogram': histogram,
                    'signal': signal
                })
                
            elif indicator_type.upper() == 'SMA':
                period = params.get('period', 20)
                sma = self.calculate_sma(df, period)
                signal = self.generate_signal_ma(current_price, sma)
                
                result.update({
                    'sma': sma,
                    'period': period,
                    'signal': signal
                })
                
            elif indicator_type.upper() == 'EMA':
                period = params.get('period', 20)
                ema = self.calculate_ema(df, period)
                signal = self.generate_signal_ma(current_price, ema)
                
                result.update({
                    'ema': ema,
                    'period': period,
                    'signal': signal
                })
            
            else:
                raise ValueError(f"Unsupported indicator type: {indicator_type}")
            
            print(f"✅ {symbol} {indicator_type} signal: {result['signal']}")
            return result
            
        except Exception as e:
            print(f"❌ Error calculating indicator for {symbol}: {str(e)}")
            raise


# Singleton instance
_service_instance = None

def get_technical_analysis_service() -> TechnicalAnalysisService:
    """Get or create the singleton technical analysis service"""
    global _service_instance
    if _service_instance is None:
        _service_instance = TechnicalAnalysisService()
    return _service_instance
