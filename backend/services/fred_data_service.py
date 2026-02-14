"""
FRED Data Service with Validation
Fixes the CPI hallucination bug and other data integrity issues
"""

import pandas as pd
import numpy as np
from fredapi import Fred
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class FREDDataService:
    """
    Fetches and validates macroeconomic data from FRED.
    
    CRITICAL: All index values are converted to meaningful metrics.
    Example: CPI index (320) → CPI YoY% (3.2%)
    """
    
    def __init__(self, api_key: str):
        self.fred = Fred(api_key=api_key)
        
        # Validation thresholds (based on historical ranges)
        self.thresholds = {
            'CPI_YOY': (-5.0, 20.0),      # CPI YoY % change
            'UNRATE': (2.0, 25.0),        # Unemployment rate %
            'GDP_GROWTH': (-15.0, 15.0),  # GDP growth rate %
            'YIELD_10Y': (0.0, 20.0),     # 10-year yield %
            'YIELD_2Y': (0.0, 20.0),      # 2-year yield %
        }
    
    def get_macro_indicators(self) -> Dict:
        """
        Fetch all macro indicators with proper validation.
        
        Returns:
            Dict with validated indicators or None if data unavailable
        """
        try:
            indicators = {}
            
            # CPI - CRITICAL FIX
            cpi_data = self._get_cpi_yoy()
            if cpi_data:
                indicators['cpi'] = cpi_data
            
            # Unemployment Rate
            unrate_data = self._get_unemployment()
            if unrate_data:
                indicators['unemployment'] = unrate_data
            
            # GDP Growth
            gdp_data = self._get_gdp_growth()
            if gdp_data:
                indicators['gdp_growth'] = gdp_data
            
            # Yield Curve
            yield_data = self._get_yield_curve()
            if yield_data:
                indicators['yield_curve'] = yield_data
            
            # Fed Funds Rate
            fed_funds = self._get_fed_funds_rate()
            if fed_funds:
                indicators['fed_funds_rate'] = fed_funds
            
            logger.info(f"Successfully fetched {len(indicators)} macro indicators")
            return indicators
            
        except Exception as e:
            logger.error(f"Error fetching macro indicators: {e}")
            return self._get_default_indicators()
    
    def _get_cpi_yoy(self) -> Optional[Dict]:
        """
        Fetch CPI and calculate Year-over-Year percentage change.
        
        FIXES THE HALLUCINATION BUG.
        """
        try:
            # Fetch CPI index values
            cpi_series = self.fred.get_series('CPIAUCSL', 
                                             observation_start=datetime.now() - timedelta(days=400))
            
            if cpi_series is None or len(cpi_series) < 13:
                logger.warning("Insufficient CPI data")
                return None
            
            # Get current and year-ago values
            current_cpi = cpi_series.iloc[-1]
            year_ago_cpi = cpi_series.iloc[-13]  # 13 months ago (to get 12-month change)
            
            # Calculate YoY percentage change
            cpi_yoy = ((current_cpi / year_ago_cpi) - 1) * 100
            
            # Validate
            is_valid, message = self._validate_value('CPI_YOY', cpi_yoy)
            
            if not is_valid:
                logger.error(f"CPI validation failed: {message}")
                return None
            
            return {
                'value': round(cpi_yoy, 2),
                'raw_index': round(current_cpi, 2),
                'unit': '%',
                'label': 'CPI Year-over-Year',
                'date': cpi_series.index[-1].strftime('%Y-%m-%d'),
                'interpretation': self._interpret_cpi(cpi_yoy)
            }
            
        except Exception as e:
            logger.error(f"Error calculating CPI YoY: {e}")
            return None
    
    def _get_unemployment(self) -> Optional[Dict]:
        """Fetch unemployment rate (already in percentage form)"""
        try:
            unrate_series = self.fred.get_series('UNRATE', 
                                                 observation_start=datetime.now() - timedelta(days=60))
            
            if unrate_series is None or len(unrate_series) == 0:
                return None
            
            current_rate = unrate_series.iloc[-1]
            
            # Validate
            is_valid, message = self._validate_value('UNRATE', current_rate)
            
            if not is_valid:
                logger.error(f"Unemployment rate validation failed: {message}")
                return None
            
            # Calculate trend (vs 3 months ago)
            if len(unrate_series) >= 4:
                three_months_ago = unrate_series.iloc[-4]
                trend = current_rate - three_months_ago
            else:
                trend = 0
            
            return {
                'value': round(current_rate, 1),
                'trend': round(trend, 2),
                'unit': '%',
                'label': 'Unemployment Rate',
                'date': unrate_series.index[-1].strftime('%Y-%m-%d'),
                'interpretation': self._interpret_unemployment(current_rate, trend)
            }
            
        except Exception as e:
            logger.error(f"Error fetching unemployment: {e}")
            return None
    
    def _get_gdp_growth(self) -> Optional[Dict]:
        """Fetch GDP growth rate (quarterly, annualized)"""
        try:
            # GDP series is quarterly
            gdp_series = self.fred.get_series('A191RL1Q225SBEA',  # Real GDP % change
                                             observation_start=datetime.now() - timedelta(days=400))
            
            if gdp_series is None or len(gdp_series) == 0:
                return None
            
            current_growth = gdp_series.iloc[-1]
            
            # Validate
            is_valid, message = self._validate_value('GDP_GROWTH', current_growth)
            
            if not is_valid:
                logger.error(f"GDP growth validation failed: {message}")
                return None
            
            return {
                'value': round(current_growth, 2),
                'unit': '%',
                'label': 'GDP Growth (Annualized)',
                'date': gdp_series.index[-1].strftime('%Y-%m-%d'),
                'interpretation': self._interpret_gdp(current_growth)
            }
            
        except Exception as e:
            logger.error(f"Error fetching GDP growth: {e}")
            return None
    
    def _get_yield_curve(self) -> Optional[Dict]:
        """Fetch yield curve and calculate spread"""
        try:
            # Fetch 10-year and 2-year yields
            yield_10y = self.fred.get_series('DGS10', 
                                            observation_start=datetime.now() - timedelta(days=60))
            yield_2y = self.fred.get_series('DGS2',
                                           observation_start=datetime.now() - timedelta(days=60))
            
            if yield_10y is None or yield_2y is None:
                return None
            
            # Get most recent non-null values
            current_10y = yield_10y.dropna().iloc[-1]
            current_2y = yield_2y.dropna().iloc[-1]
            
            # Calculate spread
            spread = current_10y - current_2y
            
            # Validate
            is_valid_10y, _ = self._validate_value('YIELD_10Y', current_10y)
            is_valid_2y, _ = self._validate_value('YIELD_2Y', current_2y)
            
            if not (is_valid_10y and is_valid_2y):
                logger.error("Yield curve validation failed")
                return None
            
            return {
                'yield_10y': round(current_10y, 2),
                'yield_2y': round(current_2y, 2),
                'spread': round(spread, 2),
                'unit': '%',
                'label': 'Yield Curve (10Y - 2Y)',
                'date': yield_10y.index[-1].strftime('%Y-%m-%d'),
                'interpretation': self._interpret_yield_curve(spread),
                'inverted': spread < 0
            }
            
        except Exception as e:
            logger.error(f"Error fetching yield curve: {e}")
            return None
    
    def _get_fed_funds_rate(self) -> Optional[Dict]:
        """Fetch Federal Funds Rate"""
        try:
            fed_funds = self.fred.get_series('FEDFUNDS',
                                            observation_start=datetime.now() - timedelta(days=60))
            
            if fed_funds is None or len(fed_funds) == 0:
                return None
            
            current_rate = fed_funds.iloc[-1]
            
            return {
                'value': round(current_rate, 2),
                'unit': '%',
                'label': 'Federal Funds Rate',
                'date': fed_funds.index[-1].strftime('%Y-%m-%d')
            }
            
        except Exception as e:
            logger.error(f"Error fetching fed funds rate: {e}")
            return None
    
    def _validate_value(self, indicator_type: str, value: float) -> Tuple[bool, str]:
        """Validate indicator value against historical thresholds"""
        if indicator_type not in self.thresholds:
            return True, "No threshold defined"
        
        low, high = self.thresholds[indicator_type]
        
        if not (low <= value <= high):
            return False, f"Value {value} outside valid range [{low}, {high}]"
        
        return True, "Valid"
    
    def _interpret_cpi(self, cpi_yoy: float) -> str:
        """Provide interpretation of CPI value"""
        if cpi_yoy < 2:
            return "Low inflation"
        elif cpi_yoy < 3:
            return "Target inflation"
        elif cpi_yoy < 5:
            return "Elevated inflation"
        else:
            return "High inflation"
    
    def _interpret_unemployment(self, rate: float, trend: float) -> str:
        """Provide interpretation of unemployment"""
        if rate < 4:
            status = "Very low"
        elif rate < 5.5:
            status = "Low"
        elif rate < 7:
            status = "Moderate"
        else:
            status = "High"
        
        if trend > 0.3:
            trend_text = "rising quickly"
        elif trend > 0:
            trend_text = "rising"
        elif trend < -0.3:
            trend_text = "falling quickly"
        elif trend < 0:
            trend_text = "falling"
        else:
            trend_text = "stable"
        
        return f"{status}, {trend_text}"
    
    def _interpret_gdp(self, growth: float) -> str:
        """Provide interpretation of GDP growth"""
        if growth < -2:
            return "Deep recession"
        elif growth < 0:
            return "Recession"
        elif growth < 2:
            return "Slow growth"
        elif growth < 3:
            return "Moderate growth"
        else:
            return "Strong growth"
    
    def _interpret_yield_curve(self, spread: float) -> str:
        """Provide interpretation of yield curve"""
        if spread < -0.5:
            return "Deeply inverted - recession warning"
        elif spread < 0:
            return "Inverted - recession risk"
        elif spread < 0.5:
            return "Flat - uncertain outlook"
        elif spread < 1.5:
            return "Normal curve"
        else:
            return "Steep curve - growth expected"
    
    def _get_default_indicators(self) -> Dict:
        """Return safe default indicators when FRED is unavailable"""
        logger.warning("Using default macro indicators")
        return {
            'cpi': {'value': 3.0, 'unit': '%', 'label': 'CPI (default)', 'interpretation': 'Data unavailable'},
            'unemployment': {'value': 4.0, 'unit': '%', 'label': 'Unemployment (default)', 'interpretation': 'Data unavailable'},
            'gdp_growth': {'value': 2.0, 'unit': '%', 'label': 'GDP Growth (default)', 'interpretation': 'Data unavailable'},
            'yield_curve': {
                'yield_10y': 4.0,
                'yield_2y': 4.5,
                'spread': -0.5,
                'unit': '%',
                'label': 'Yield Curve (default)',
                'interpretation': 'Data unavailable',
                'inverted': True
            },
            'fed_funds_rate': {'value': 5.0, 'unit': '%', 'label': 'Fed Funds (default)'},
            'note': 'Default data - FRED API unavailable'
        }