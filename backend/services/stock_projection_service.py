"""
Per-Ticker Stock Projection Service
Fixes: Identical percentages across all stocks
"""

import numpy as np
import yfinance as yf
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class StockProjectionService:
    
    @staticmethod
    def get_ticker_stats(ticker: str, period: str = '1y') -> tuple:
        """
        Calculate TICKER-SPECIFIC mu and sigma.
        Returns: (annual_return, annual_volatility, current_price)
        """
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period)
            
            if hist.empty or len(hist) < 20:
                raise ValueError(f"Insufficient data for {ticker}")
            
            # Log returns
            log_returns = np.log(hist['Close'] / hist['Close'].shift(1)).dropna()
            
            # Annualize
            mu = log_returns.mean() * 252
            sigma = log_returns.std() * np.sqrt(252)
            current = float(hist['Close'].iloc[-1])
            
            # Sanity bounds
            mu = np.clip(mu, -0.50, 0.50)  # -50% to +50% annual
            sigma = np.clip(sigma, 0.10, 1.20)  # 10% to 120% vol

            # Bayesian shrinkage toward market prior
            # Prevents outlier tickers from producing extreme projections
            MARKET_MU = 0.08   # S&P 500 long-run average ~8% annual
            SHRINKAGE = 0.3    # 30% pull toward market mean
            mu = mu * (1 - SHRINKAGE) + MARKET_MU * SHRINKAGE

            logger.info(f"{ticker}: mu={mu:.3f} (shrunk), sigma={sigma:.3f}, price=${current:.2f}")
            
            return (mu, sigma, current)
            
        except Exception as e:
            logger.error(f"Error getting stats for {ticker}: {e}")
            # Conservative defaults
            return (0.08, 0.25, 100.0)
    
    @staticmethod
    def simulate_gbm(S0: float, mu: float, sigma: float, days: int, n_sims: int = 1000) -> np.ndarray:
        """
        Geometric Brownian Motion - FIXES arithmetic return bug.
        Returns: array of shape (n_sims, days)
        """
        dt = 1/252
        n_steps = days
        
        # GBM formula
        drift = (mu - 0.5 * sigma**2) * dt
        diffusion = sigma * np.sqrt(dt)
        
        # Random shocks
        rand = np.random.normal(size=(n_sims, n_steps))
        
        # Log returns
        log_returns = drift + diffusion * rand
        
        # Cumulative log returns
        log_price_paths = np.cumsum(log_returns, axis=1)
        
        # Convert to prices
        paths = S0 * np.exp(log_price_paths)
        
        return paths
    
    @staticmethod
    def project_ticker(ticker: str) -> dict:
        """
        Project single ticker with realistic returns.
        """
        try:
            # Get ticker-specific stats
            mu, sigma, current_price = StockProjectionService.get_ticker_stats(ticker)
            
            # Project at different horizons
            horizons = {
                '30d': 30,
                '180d': 180,
                '365d': 365,
                '1825d': 1825  # 5 years
            }
            
            # Horizon-dependent caps — short horizons get tighter limits
            HORIZON_CAPS = {
                '30d':   1.5,   # max 50% in 1 month
                '180d':  2.0,   # max 100% in 6 months
                '365d':  2.5,   # max 150% in 1 year
                '1825d': 4.0,   # max 300% in 5 years
            }

            projections = {}

            for name, days in horizons.items():
                paths = StockProjectionService.simulate_gbm(
                    S0=current_price,
                    mu=mu,
                    sigma=sigma,
                    days=days,
                    n_sims=2000
                )

                # Median projection (more robust than mean)
                median_price = np.median(paths[:, -1])

                # Apply horizon-specific cap
                cap_multiplier = HORIZON_CAPS.get(name, 3.0)
                max_price = current_price * cap_multiplier
                median_price = min(median_price, max_price)

                projections[name] = round(float(median_price), 2)
            
            return {
                "status": "success",
                "ticker": ticker,
                "current_price": round(current_price, 2),
                "projections": projections,
                "volatility": round(sigma, 2),
                "expected_return": round(mu, 2)
            }
            
        except Exception as e:
            logger.error(f"Projection error for {ticker}: {e}", exc_info=True)
            return {
                "status": "error",
                "ticker": ticker,
                "message": str(e)
            }

# Global instance
stock_projection_service = StockProjectionService()