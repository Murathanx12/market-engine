"""
Unified Market State Service - Single Source of Truth
Prevents regime contradictions across pages
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class UnifiedMarketState:
    def __init__(self):
        self.cache = None
        self.cache_time = None
        self.cache_ttl = timedelta(hours=1)  # Refresh every hour
    
    def get_market_state(self) -> dict:
        """
        Get current market state (cached for 1 hour).
        Returns unified regime, confidence, volatility.
        """
        # Check cache
        now = datetime.now()
        if self.cache and self.cache_time and (now - self.cache_time) < self.cache_ttl:
            logger.info(f"Returning cached market state (age: {(now - self.cache_time).seconds}s)")
            return self.cache
        
        # Compute fresh
        try:
            state = self._compute_state()
            self.cache = state
            self.cache_time = now
            return state
        except Exception as e:
            logger.error(f"Error computing market state: {e}", exc_info=True)
            # Return safe default
            return {
                'regime': 'VOLATILE',
                'confidence': 0.50,
                'volatility': 0.20,
                'vix': 18.0,
                'last_updated': datetime.now().isoformat()
            }
    
    def _compute_state(self) -> dict:
        """Compute market state from S&P 500 data."""
        # Fetch S&P 500 INDEX (^GSPC), not SPY ETF
        ticker = yf.Ticker("^GSPC")
        hist = ticker.history(period="3mo")
        
        if hist.empty or len(hist) < 20:
            raise ValueError("Insufficient S&P 500 data")
        
        # Calculate log returns
        returns = np.log(hist['Close'] / hist['Close'].shift(1)).dropna()
        
        # Annualized metrics
        mean_return = returns.mean() * 252
        volatility = returns.std() * np.sqrt(252)
        
        # Regime classification
        if volatility > 0.25:
            regime = 'VOLATILE'
            confidence = min(0.95, volatility / 0.35)
        elif mean_return > 0.05:
            regime = 'BULL'
            confidence = min(0.95, abs(mean_return) / 0.15)
        elif mean_return < -0.05:
            regime = 'BEAR'
            confidence = min(0.95, abs(mean_return) / 0.15)
        else:
            regime = 'VOLATILE'
            confidence = 0.50
        
        # VIX (optional, fallback to estimate)
        try:
            vix_ticker = yf.Ticker("^VIX")
            vix_hist = vix_ticker.history(period="1d")
            vix = float(vix_hist['Close'].iloc[-1]) if not vix_hist.empty else 18.0
        except:
            vix = 18.0
        
        return {
            'regime': regime,
            'confidence': round(confidence, 3),
            'volatility': round(volatility, 3),
            'mean_return': round(mean_return, 3),
            'vix': round(vix, 2),
            'last_updated': datetime.now().isoformat()
        }

# Global instance
unified_market_state = UnifiedMarketState()