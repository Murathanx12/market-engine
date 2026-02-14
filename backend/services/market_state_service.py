"""
Centralized Market State Service
Ensures ONE source of truth for market regime across all endpoints
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class MarketStateService:
    """
    Single source of truth for market regime detection.
    Uses simple volatility-based regime detection (we'll use HMM in v7).
    
    For v6: Focus on CONSISTENCY over sophistication.
    """
    
    def __init__(self):
        self.regime_map = {
            0: "BULL",
            1: "BEAR", 
            2: "VOLATILE"
        }
        self.cached_state = None
        self.last_update = None
        self.cache_duration = timedelta(hours=1)  # Refresh every hour
    
    def get_market_state(self, price_data: pd.DataFrame) -> Dict:
        """
        Determine market regime from price data.
        
        Args:
            price_data: DataFrame with 'Close' column and date index
            
        Returns:
            {
                'regime': str,
                'confidence': float,
                'volatility': float,
                'last_updated': str
            }
        """
        try:
            # Check cache first
            if self._is_cache_valid():
                logger.info("Returning cached market state")
                return self.cached_state
            
            # Calculate log returns
            returns = np.log(price_data['Close'] / price_data['Close'].shift(1)).dropna()
            
            if len(returns) < 20:
                logger.warning("Insufficient data for regime detection")
                return self._get_default_state()
            
            # Calculate metrics
            recent_returns = returns.tail(20)  # Last 20 days
            mean_return = recent_returns.mean() * 252  # Annualized
            volatility = recent_returns.std() * np.sqrt(252)  # Annualized
            
            # Simple regime logic (we'll improve in v7)
            regime = self._classify_regime(mean_return, volatility)
            confidence = self._calculate_confidence(recent_returns)
            
            # Cache the result
            self.cached_state = {
                'regime': regime,
                'confidence': round(confidence, 4),
                'volatility': round(volatility, 4),
                'mean_return': round(mean_return, 4),
                'last_updated': datetime.now().isoformat()
            }
            self.last_update = datetime.now()
            
            logger.info(f"Market state updated: {self.cached_state['regime']} "
                       f"(confidence: {self.cached_state['confidence']})")
            
            return self.cached_state
            
        except Exception as e:
            logger.error(f"Error calculating market state: {e}")
            return self._get_default_state()
    
    def _classify_regime(self, mean_return: float, volatility: float) -> str:
        """
        Classify market regime based on return and volatility.
        
        Simple rules for v6:
        - BULL: Positive returns, normal volatility
        - BEAR: Negative returns
        - VOLATILE: High volatility regardless of returns
        """
        # Thresholds (based on historical S&P 500)
        NORMAL_VOL = 0.15  # 15% annualized
        HIGH_VOL = 0.25    # 25% annualized
        
        if volatility > HIGH_VOL:
            return "VOLATILE"
        elif mean_return > 0.05:  # 5% annualized return
            return "BULL"
        elif mean_return < -0.05:
            return "BEAR"
        else:
            # Neutral zone - default to VOLATILE
            return "VOLATILE"
    
    def _calculate_confidence(self, returns: pd.Series) -> float:
        """
        Calculate confidence score for regime classification.
        Higher consistency in returns = higher confidence.
        """
        # Use coefficient of variation (CV) as confidence proxy
        # Lower CV = more consistent = higher confidence
        mean_abs = abs(returns.mean())
        std = returns.std()
        
        if mean_abs == 0:
            return 0.5
        
        cv = std / mean_abs if mean_abs > 0 else 999
        
        # Map CV to confidence (0 to 1)
        # CV < 1 → high confidence, CV > 10 → low confidence
        confidence = 1 / (1 + cv)
        return min(max(confidence, 0.1), 0.99)  # Clamp between 0.1 and 0.99
    
    def _is_cache_valid(self) -> bool:
        """Check if cached state is still valid"""
        if self.cached_state is None or self.last_update is None:
            return False
        return datetime.now() - self.last_update < self.cache_duration
    
    def _get_default_state(self) -> Dict:
        """Return safe default state when calculation fails"""
        return {
            'regime': 'VOLATILE',
            'confidence': 0.5,
            'volatility': 0.20,
            'mean_return': 0.0,
            'last_updated': datetime.now().isoformat(),
            'note': 'Default state - insufficient data'
        }
    
    def invalidate_cache(self):
        """Force recalculation on next request"""
        self.cached_state = None
        self.last_update = None


# Global instance
market_state_service = MarketStateService()