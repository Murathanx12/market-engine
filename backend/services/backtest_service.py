"""
Walk-Forward Backtest Engine Service
Validates the model by simulating predictions at historical dates
using ONLY data available at that point in time (no lookahead bias).
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BacktestService:
    """
    Walk-forward backtest from a configurable start year to present.
    Tests whether the model would have detected known crashes.
    """

    CRASH_EVENTS = {
        "Dot-com Crash":    ("2000-03-01", "2002-10-01"),
        "2008 GFC":         ("2007-10-01", "2009-03-01"),
        "2011 Debt Crisis": ("2011-07-01", "2011-10-01"),
        "2018 Q4":          ("2018-10-01", "2018-12-01"),
        "COVID-19":         ("2020-02-01", "2020-03-23"),
        "2022 Bear Market": ("2022-01-01", "2022-10-01"),
    }

    def run_walk_forward(
        self,
        start_year: int = 2005,
        step_months: int = 3,
        horizon_months: int = 6,
        n_sims: int = 500,
    ) -> dict:
        """
        Walk-forward validation from start_year to present.
        At each step, uses ONLY data available at that date.
        Returns predictions vs actuals with error metrics.
        """
        logger.info(f"Starting walk-forward backtest from {start_year}")

        # Fetch full S&P 500 history with buffer for lookback
        spy = yf.Ticker('^GSPC')
        full_hist = spy.history(start=f"{start_year - 3}-01-01")

        if full_hist is None or len(full_hist) < 500:
            raise ValueError("Insufficient historical data for backtest")

        results = []
        errors = []

        start_date = pd.Timestamp(f"{start_year}-01-01")
        end_date = pd.Timestamp.now() - pd.DateOffset(months=horizon_months)
        current_date = start_date
        step = pd.DateOffset(months=step_months)

        while current_date < end_date:
            try:
                # Use ONLY data available at current_date (no lookahead)
                available_data = full_hist[full_hist.index <= current_date]

                if len(available_data) < 252:
                    current_date += step
                    continue

                # Calculate mu and sigma from available data only
                log_returns = np.log(
                    available_data['Close'] / available_data['Close'].shift(1)
                ).dropna()

                mu = float(log_returns.tail(252).mean() * 252)
                sigma = float(log_returns.tail(252).std() * np.sqrt(252))

                # Cap extremes
                mu = np.clip(mu, -0.30, 0.40)
                sigma = np.clip(sigma, 0.05, 0.80)

                # Simulate forward using correct GBM
                S0 = float(available_data['Close'].iloc[-1])
                forecast_days = horizon_months * 21
                dt = 1 / 252

                corrected_drift = (mu - 0.5 * sigma ** 2) * dt
                vol_term = sigma * np.sqrt(dt)

                paths = np.zeros((n_sims, forecast_days))
                paths[:, 0] = S0
                for t in range(1, forecast_days):
                    Z = np.random.standard_normal(n_sims)
                    paths[:, t] = paths[:, t - 1] * np.exp(corrected_drift + vol_term * Z)

                final_prices = paths[:, -1]
                predicted_median = float(np.median(final_prices))
                predicted_p5 = float(np.percentile(final_prices, 5))
                predicted_p95 = float(np.percentile(final_prices, 95))

                # Get actual outcome
                target_date = current_date + pd.DateOffset(months=horizon_months)
                actual_data = full_hist[full_hist.index >= target_date]

                if len(actual_data) == 0:
                    current_date += step
                    continue

                actual_price = float(actual_data['Close'].iloc[0])

                # Calculate errors
                mape = abs(predicted_median - actual_price) / actual_price * 100
                within_90_ci = predicted_p5 <= actual_price <= predicted_p95

                # Check if crash occurred in the horizon
                horizon_data = full_hist[
                    (full_hist.index >= current_date) &
                    (full_hist.index <= target_date)
                ]
                if len(horizon_data) > 0:
                    min_price = float(horizon_data['Close'].min())
                    actual_drawdown = (min_price - S0) / S0
                    crash_occurred = actual_drawdown < -0.20
                else:
                    crash_occurred = False

                # Model's crash probability
                crash_prob = float(np.mean(np.min(paths, axis=1) < S0 * 0.8))

                results.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "target_date": target_date.strftime("%Y-%m-%d"),
                    "start_price": round(S0, 2),
                    "predicted_median": round(predicted_median, 2),
                    "predicted_p5": round(predicted_p5, 2),
                    "predicted_p95": round(predicted_p95, 2),
                    "actual_price": round(actual_price, 2),
                    "mape": round(mape, 2),
                    "within_90_ci": within_90_ci,
                    "crash_occurred": crash_occurred,
                    "crash_prob_predicted": round(crash_prob, 3),
                    "mu_used": round(mu, 4),
                    "sigma_used": round(sigma, 4),
                })
                errors.append(mape)

            except Exception as e:
                logger.warning(f"Backtest step failed at {current_date}: {e}")

            current_date += step

        if not results:
            raise ValueError("No backtest results generated")

        # Aggregate metrics
        overall_mape = float(np.mean(errors))
        coverage_rate = float(np.mean([r['within_90_ci'] for r in results]))
        crash_results = [r for r in results if r['crash_occurred']]
        crash_recall = (
            float(np.mean([r['crash_prob_predicted'] > 0.15 for r in crash_results]))
            if crash_results else 0.0
        )

        return {
            "status": "success",
            "summary": {
                "start_year": start_year,
                "total_predictions": len(results),
                "overall_mape": round(overall_mape, 2),
                "coverage_rate_90ci": round(coverage_rate * 100, 1),
                "crash_recall": round(crash_recall * 100, 1),
                "horizon_months": horizon_months,
            },
            "crash_events_detected": self._check_crash_detection(results),
            "predictions": results,
        }

    def _check_crash_detection(self, results: list) -> dict:
        """Check if model would have flagged known crashes."""
        detections = {}
        for event_name, (start, end) in self.CRASH_EVENTS.items():
            pre_crash_window_start = (
                pd.Timestamp(start) - pd.DateOffset(months=6)
            ).strftime("%Y-%m-%d")
            pre_crash_results = [
                r for r in results
                if pre_crash_window_start <= r['date'] <= start
            ]
            if pre_crash_results:
                max_crash_prob = max(r['crash_prob_predicted'] for r in pre_crash_results)
                detections[event_name] = {
                    "detected": max_crash_prob > 0.20,
                    "max_crash_prob": round(max_crash_prob, 3),
                    "threshold": 0.20,
                }
            else:
                detections[event_name] = {
                    "detected": False,
                    "max_crash_prob": 0.0,
                    "threshold": 0.20,
                    "note": "No predictions in pre-crash window"
                }
        return detections


# Singleton
backtest_service = BacktestService()
