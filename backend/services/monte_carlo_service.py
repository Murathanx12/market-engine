"""
Monte Carlo Simulation with Geometric Brownian Motion
FIXES the +96,991% projection bug
"""

import numpy as np
import pandas as pd
from typing import Dict, List
import logging

from engine import CONFIG

logger = logging.getLogger(__name__)


class MonteCarloService:
    """
    Monte Carlo simulation using Geometric Brownian Motion.
    
    Key improvements over arithmetic returns:
    1. Uses log returns (geometric)
    2. Includes mean reversion
    3. Applies fundamental sanity caps
    """
    
    def __init__(self):
        # Sanity caps shared with core engine config
        self.MAX_VOLATILITY = CONFIG['max_annual_vol']
        self.MAX_5Y_CAGR = 0.35       # guardrail for 5Y CAGR
        # Convert total 5Y cap to an annualized drift guardrail.
        self.MAX_ANNUAL_RETURN = (1 + CONFIG['max_5y_return']) ** (1 / 5) - 1
    
    def run_simulation(
        self,
        current_price: float,
        historical_data: pd.DataFrame,
        years: int = 5,
        simulations: int = 10000,
        regime: str = "VOLATILE"
    ) -> Dict:
        """
        Run Monte Carlo simulation with proper geometric returns.
        
        Args:
            current_price: Current stock price
            historical_data: Historical price data (DataFrame with 'Close')
            years: Projection horizon in years
            simulations: Number of Monte Carlo paths
            regime: Current market regime (affects drift)
            
        Returns:
            Dict with projection statistics
        """
        try:
            # Calculate historical parameters
            returns = np.log(historical_data['Close'] / historical_data['Close'].shift(1)).dropna()
            
            # Base parameters from historical data
            historical_drift = returns.mean() * 252  # Annualized
            historical_volatility = returns.std() * np.sqrt(252)  # Annualized
            
            # Apply regime adjustment
            drift = self._adjust_drift_for_regime(historical_drift, regime)
            volatility = min(historical_volatility, self.MAX_VOLATILITY)
            
            # Apply sanity caps
            drift = np.clip(drift, -0.5, self.MAX_ANNUAL_RETURN)
            
            logger.info(f"Simulation params - Drift: {drift:.2%}, Vol: {volatility:.2%}, Regime: {regime}")
            
            # Run simulation
            trading_days = int(years * 252)
            dt = 1 / 252  # Daily time step
            
            # Initialize price matrix
            prices = np.zeros((simulations, trading_days + 1))
            prices[:, 0] = current_price
            
            # Generate random shocks
            Z = np.random.standard_normal((simulations, trading_days))
            
            # Geometric Brownian Motion with mean reversion
            for t in range(1, trading_days + 1):
                # Mean reversion component
                reversion_strength = 0.05  # 5% reversion per year
                log_mean = np.log(current_price)
                log_current = np.log(prices[:, t-1])
                reversion_term = reversion_strength * (log_mean - log_current)
                
                # GBM formula: dS/S = (μ + reversion) dt + σ√dt Z
                drift_with_reversion = drift + reversion_term
                
                prices[:, t] = prices[:, t-1] * np.exp(
                    (drift_with_reversion - 0.5 * volatility**2) * dt + 
                    volatility * np.sqrt(dt) * Z[:, t-1]
                )
            
            # Extract final prices
            final_prices = prices[:, -1]
            
            # Apply fundamental cap
            final_prices = self._apply_fundamental_cap(current_price, final_prices, years)
            
            # Calculate statistics
            statistics = self._calculate_statistics(current_price, final_prices, years)
            
            # Add paths for visualization (sample 100 paths)
            sample_indices = np.random.choice(simulations, size=min(100, simulations), replace=False)
            statistics['sample_paths'] = prices[sample_indices, ::21].tolist()  # Monthly points
            
            return statistics
            
        except Exception as e:
            logger.error(f"Monte Carlo simulation failed: {e}")
            return self._get_default_projection(current_price, years)
    
    def _adjust_drift_for_regime(self, historical_drift: float, regime: str) -> float:
        """Adjust expected return based on market regime"""
        regime_multipliers = {
            "BULL": 1.2,      # 20% boost
            "BEAR": 0.6,      # 40% reduction
            "VOLATILE": 0.9   # 10% reduction
        }
        
        multiplier = regime_multipliers.get(regime, 1.0)
        return historical_drift * multiplier
    
    def _apply_fundamental_cap(
        self, 
        current_price: float, 
        final_prices: np.ndarray, 
        years: int
    ) -> np.ndarray:
        """
        Apply fundamental sanity cap to prevent absurd projections.
        
        Cap: No more than MAX_5Y_CAGR compounded annually
        """
        max_final_price = current_price * ((1 + self.MAX_5Y_CAGR) ** years)
        
        # Count how many projections exceed the cap
        exceeded = np.sum(final_prices > max_final_price)
        if exceeded > 0:
            logger.warning(f"{exceeded} simulations exceeded fundamental cap - capping at {max_final_price:.2f}")
            final_prices = np.minimum(final_prices, max_final_price)
        
        return final_prices
    
    def _calculate_statistics(
        self,
        current_price: float,
        final_prices: np.ndarray,
        years: int
    ) -> Dict:
        """Calculate projection statistics from simulation results"""

        percentiles = {
            'p5': np.percentile(final_prices, 5),
            'p25': np.percentile(final_prices, 25),
            'p50': np.percentile(final_prices, 50),
            'p75': np.percentile(final_prices, 75),
            'p95': np.percentile(final_prices, 95),
        }

        returns = (final_prices / current_price - 1) * 100
        median_cagr = ((percentiles['p50'] / current_price) ** (1 / years) - 1) * 100

        max_allowed_total_return_pct = CONFIG['max_5y_return'] * 100
        observed_total_return_pct = ((percentiles['p95'] / current_price) - 1) * 100
        anomaly_flag = observed_total_return_pct > max_allowed_total_return_pct

        return {
            'current_price': round(current_price, 2),
            'projections': {
                'pessimistic': round(percentiles['p5'], 2),
                'conservative': round(percentiles['p25'], 2),
                'base_case': round(percentiles['p50'], 2),
                'optimistic': round(percentiles['p75'], 2),
                'bull_case': round(percentiles['p95'], 2),
            },
            'expected_return': {
                'mean': round(returns.mean(), 2),
                'median': round(np.median(returns), 2),
                'std_dev': round(returns.std(), 2),
            },
            'cagr': round(median_cagr, 2),
            'years': years,
            'probability_of_gain': round((np.sum(final_prices > current_price) / len(final_prices)) * 100, 1),
            'probability_of_loss': round((np.sum(final_prices < current_price) / len(final_prices)) * 100, 1),
            'anomaly_flag': bool(anomaly_flag),
            'max_total_return_cap_pct': round(max_allowed_total_return_pct, 1),
        }

    def _get_default_projection(self, current_price: float, years: int) -> Dict:
        """Return conservative default projection if simulation fails"""
        # Assume 7% annual return (historical S&P 500 average)
        base_projection = current_price * ((1.07) ** years)
        
        return {
            'current_price': round(current_price, 2),
            'projections': {
                'pessimistic': round(current_price * 0.8, 2),
                'conservative': round(current_price * 1.1, 2),
                'base_case': round(base_projection, 2),
                'optimistic': round(base_projection * 1.2, 2),
                'bull_case': round(base_projection * 1.5, 2),
            },
            'expected_return': {
                'mean': 35.0,
                'median': 35.0,
                'std_dev': 20.0,
            },
            'cagr': 7.0,
            'years': years,
            'probability_of_gain': 65.0,
            'probability_of_loss': 35.0,
            'note': 'Default projection - simulation failed',
            'anomaly_flag': False,
            'max_total_return_cap_pct': round(CONFIG['max_5y_return'] * 100, 1),
        }


# Global instance
monte_carlo_service = MonteCarloService()