"""
Condition Evaluator for Custom Indicators
Evaluates mentor's indicator conditions against market data
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ConditionEvaluator:
    """Evaluates trading conditions for custom indicators"""
    
    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> Optional[float]:
        """Calculate RSI indicator"""
        if len(prices) < period + 1:
            return None
        
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
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    @staticmethod
    def calculate_sma(prices: List[float], period: int) -> Optional[float]:
        """Calculate Simple Moving Average"""
        if len(prices) < period:
            return None
        return sum(prices[-period:]) / period
    
    @staticmethod
    def calculate_ema(prices: List[float], period: int) -> Optional[float]:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return None
        
        multiplier = 2 / (period + 1)
        ema = sum(prices[:period]) / period
        
        for price in prices[period:]:
            ema = (price - ema) * multiplier + ema
        
        return ema
    
    @staticmethod
    def calculate_macd(prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Optional[Dict]:
        """Calculate MACD indicator"""
        if len(prices) < slow:
            return None
        
        ema_fast = ConditionEvaluator.calculate_ema(prices, fast)
        ema_slow = ConditionEvaluator.calculate_ema(prices, slow)
        
        if ema_fast is None or ema_slow is None:
            return None
        
        macd_line = ema_fast - ema_slow
        
        # For simplicity, using SMA for signal line
        # In production, should use EMA of MACD line
        signal_line = macd_line  # Simplified
        
        return {
            "macd": macd_line,
            "signal": signal_line,
            "histogram": macd_line - signal_line
        }
    
    @staticmethod
    def calculate_bollinger_bands(prices: List[float], period: int = 20, std_dev: float = 2.0) -> Optional[Dict]:
        """Calculate Bollinger Bands"""
        if len(prices) < period:
            return None
        
        sma = ConditionEvaluator.calculate_sma(prices, period)
        if sma is None:
            return None
        
        recent_prices = prices[-period:]
        variance = sum((p - sma) ** 2 for p in recent_prices) / period
        std = variance ** 0.5
        
        return {
            "upper": sma + (std_dev * std),
            "middle": sma,
            "lower": sma - (std_dev * std)
        }
    
    @staticmethod
    def calculate_stochastic(highs: List[float], lows: List[float], closes: List[float], 
                            period: int = 14) -> Optional[Dict]:
        """Calculate Stochastic Oscillator"""
        if len(closes) < period:
            return None
        
        recent_highs = highs[-period:]
        recent_lows = lows[-period:]
        current_close = closes[-1]
        
        highest_high = max(recent_highs)
        lowest_low = min(recent_lows)
        
        if highest_high == lowest_low:
            return {"k": 50, "d": 50}
        
        k = 100 * ((current_close - lowest_low) / (highest_high - lowest_low))
        d = k  # Simplified, should be SMA of K
        
        return {"k": k, "d": d}
    
    @staticmethod
    def evaluate_condition(condition: Dict, indicator_values: Dict, current_price: float) -> bool:
        """
        Evaluate a single condition
        
        Condition format:
        {
            "indicator": "RSI",
            "operator": ">",  # >, <, >=, <=, ==, crosses_above, crosses_below
            "value": 70,
            "params": {"period": 14}
        }
        """
        try:
            indicator_type = condition.get("indicator")
            operator = condition.get("operator")
            threshold = condition.get("value")
            
            if indicator_type not in indicator_values:
                logger.warning(f"Indicator {indicator_type} not found in values")
                return False
            
            indicator_value = indicator_values[indicator_type]
            
            # Handle different operators
            if operator == ">":
                return indicator_value > threshold
            elif operator == "<":
                return indicator_value < threshold
            elif operator == ">=":
                return indicator_value >= threshold
            elif operator == "<=":
                return indicator_value <= threshold
            elif operator == "==":
                return abs(indicator_value - threshold) < 0.01
            elif operator == "crosses_above":
                # Simplified: just check if currently above
                return indicator_value > threshold
            elif operator == "crosses_below":
                # Simplified: just check if currently below
                return indicator_value < threshold
            else:
                logger.warning(f"Unknown operator: {operator}")
                return False
                
        except Exception as e:
            logger.error(f"Error evaluating condition: {e}")
            return False
    
    @staticmethod
    def evaluate_conditions(conditions: List[Dict], indicator_values: Dict, 
                          current_price: float, logic: str = "AND") -> bool:
        """
        Evaluate multiple conditions with AND/OR logic
        """
        if not conditions:
            return False
        
        results = []
        for condition in conditions:
            result = ConditionEvaluator.evaluate_condition(condition, indicator_values, current_price)
            results.append(result)
        
        if logic.upper() == "AND":
            return all(results)
        elif logic.upper() == "OR":
            return any(results)
        else:
            return all(results)  # Default to AND
    
    @staticmethod
    def calculate_all_indicators(prices: List[float], highs: List[float], 
                                lows: List[float], indicator_configs: List[Dict]) -> Dict:
        """
        Calculate all indicators specified in configs
        Returns dict of indicator_name: value
        """
        indicator_values = {}
        
        for config in indicator_configs:
            indicator_type = config.get("type")
            params = config.get("params", {})
            
            try:
                if indicator_type == "RSI":
                    period = params.get("period", 14)
                    rsi = ConditionEvaluator.calculate_rsi(prices, period)
                    if rsi is not None:
                        indicator_values["RSI"] = rsi
                
                elif indicator_type == "SMA":
                    period = params.get("period", 20)
                    sma = ConditionEvaluator.calculate_sma(prices, period)
                    if sma is not None:
                        indicator_values["SMA"] = sma
                
                elif indicator_type == "EMA":
                    period = params.get("period", 20)
                    ema = ConditionEvaluator.calculate_ema(prices, period)
                    if ema is not None:
                        indicator_values["EMA"] = ema
                
                elif indicator_type == "MACD":
                    macd_data = ConditionEvaluator.calculate_macd(prices)
                    if macd_data:
                        indicator_values["MACD"] = macd_data["macd"]
                        indicator_values["MACD_SIGNAL"] = macd_data["signal"]
                        indicator_values["MACD_HISTOGRAM"] = macd_data["histogram"]
                
                elif indicator_type == "BOLLINGER":
                    period = params.get("period", 20)
                    std_dev = params.get("std_dev", 2.0)
                    bb = ConditionEvaluator.calculate_bollinger_bands(prices, period, std_dev)
                    if bb:
                        indicator_values["BB_UPPER"] = bb["upper"]
                        indicator_values["BB_MIDDLE"] = bb["middle"]
                        indicator_values["BB_LOWER"] = bb["lower"]
                
                elif indicator_type == "STOCHASTIC":
                    period = params.get("period", 14)
                    stoch = ConditionEvaluator.calculate_stochastic(highs, lows, prices, period)
                    if stoch:
                        indicator_values["STOCH_K"] = stoch["k"]
                        indicator_values["STOCH_D"] = stoch["d"]
                        
            except Exception as e:
                logger.error(f"Error calculating {indicator_type}: {e}")
                continue
        
        return indicator_values
    
    @staticmethod
    def evaluate_indicator(indicator: Dict, market_data: Dict) -> Optional[str]:
        """
        Main evaluation function
        Returns "BUY", "SELL", or None
        """
        try:
            # Extract market data
            prices = market_data.get("close_prices", [])
            highs = market_data.get("high_prices", [])
            lows = market_data.get("low_prices", [])
            current_price = prices[-1] if prices else 0
            
            if not prices or len(prices) < 20:
                logger.warning("Insufficient market data for evaluation")
                return None
            
            # Calculate all indicators
            indicator_configs = indicator.get("indicators", [])
            indicator_values = ConditionEvaluator.calculate_all_indicators(
                prices, highs, lows, indicator_configs
            )
            
            logger.info(f"Calculated indicator values: {indicator_values}")
            
            # Evaluate BUY conditions
            buy_conditions = indicator.get("buy_conditions", [])
            buy_logic = indicator.get("buy_logic", "AND")
            
            if buy_conditions:
                buy_signal = ConditionEvaluator.evaluate_conditions(
                    buy_conditions, indicator_values, current_price, buy_logic
                )
                if buy_signal:
                    logger.info(f"✅ BUY signal generated for {indicator['name']}")
                    return "BUY"
            
            # Evaluate SELL conditions
            sell_conditions = indicator.get("sell_conditions", [])
            sell_logic = indicator.get("sell_logic", "AND")
            
            if sell_conditions:
                sell_signal = ConditionEvaluator.evaluate_conditions(
                    sell_conditions, indicator_values, current_price, sell_logic
                )
                if sell_signal:
                    logger.info(f"✅ SELL signal generated for {indicator['name']}")
                    return "SELL"
            
            return None
            
        except Exception as e:
            logger.error(f"Error evaluating indicator: {e}")
            return None
