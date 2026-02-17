"""
Net Liquidity Tracker Service
Formula: Net Liquidity = WALCL - (TGA + RRP)

- WALCL (Fed total assets): liquidity injection
- WTREGEN (Treasury General Account): drains liquidity when rising
- RRPONTSYD (Overnight reverse repos): drains liquidity when rising

Interpretation:
- Rising Net Liquidity = more money in system = BULLISH
- Falling Net Liquidity = money being drained = BEARISH (crash risk)
"""

import os
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class NetLiquidityService:

    FRED_SERIES = {
        "walcl": "WALCL",       # Fed Balance Sheet (millions USD, weekly)
        "tga": "WTREGEN",       # Treasury General Account (millions USD)
        "rrp": "RRPONTSYD",     # Reverse Repo (billions USD — must convert)
    }

    def __init__(self, fred_api_key: str = None):
        self.fred_api_key = fred_api_key or os.getenv('FRED_API_KEY')
        self._cache = {}
        self._cache_ttl = 86400  # 24 hours (WALCL updates weekly)

    def get_net_liquidity(self) -> dict:
        """Returns current and historical Net Liquidity data."""
        if self._is_cache_valid():
            return self._cache["data"]

        try:
            result = self._fetch_and_calculate()
            self._cache["data"] = result
            self._cache["updated_at"] = datetime.now()
            return result
        except Exception as e:
            logger.error(f"Net liquidity fetch failed: {e}")
            return self._default_response()

    def _fetch_and_calculate(self) -> dict:
        from fredapi import Fred
        fred = Fred(api_key=self.fred_api_key)

        end_date = datetime.now()
        start_date = end_date - timedelta(days=365 * 3)

        walcl = fred.get_series("WALCL", start_date, end_date)
        tga = fred.get_series("WTREGEN", start_date, end_date)
        rrp = fred.get_series("RRPONTSYD", start_date, end_date)

        # Align to weekly frequency (WALCL is weekly, others daily)
        df = pd.DataFrame({
            "walcl": walcl,
            "tga": tga,
            "rrp": rrp * 1000,  # Convert billions to millions
        }).dropna(how='all').resample('W').last().dropna()

        if len(df) < 4:
            return self._default_response()

        # Net Liquidity = WALCL - (TGA + RRP)
        df["net_liquidity"] = df["walcl"] - (df["tga"] + df["rrp"])

        # Normalize to trillions for display
        df_t = df / 1_000_000

        # WoW change
        df_t["net_liq_change_wow"] = df_t["net_liquidity"].diff()
        df_t["net_liq_change_pct"] = df_t["net_liquidity"].pct_change() * 100

        current = df_t.iloc[-1]

        # Market signal
        wow_change = float(current.get("net_liq_change_wow", 0))
        if pd.isna(wow_change):
            wow_change = 0.0
        signal = "BULLISH" if wow_change > 0.05 else "BEARISH" if wow_change < -0.05 else "NEUTRAL"

        # Historical data for chart (last 52 weeks)
        history = []
        for date, row in df_t.tail(52).iterrows():
            history.append({
                "date": date.strftime("%Y-%m-%d"),
                "walcl": round(float(row["walcl"]), 3),
                "tga": round(float(row["tga"]), 3),
                "rrp": round(float(row["rrp"]), 3),
                "net_liquidity": round(float(row["net_liquidity"]), 3),
                "wow_change": round(float(row.get("net_liq_change_wow", 0) if not pd.isna(row.get("net_liq_change_wow", 0)) else 0), 4),
            })

        return {
            "current": {
                "walcl": round(float(current["walcl"]), 3),
                "tga": round(float(current["tga"]), 3),
                "rrp": round(float(current["rrp"]), 3),
                "net_liquidity": round(float(current["net_liquidity"]), 3),
                "wow_change": round(wow_change, 4),
                "wow_change_pct": round(float(current.get("net_liq_change_pct", 0) if not pd.isna(current.get("net_liq_change_pct", 0)) else 0), 2),
                "signal": signal,
            },
            "formula": "Net_Liq = WALCL - (TGA + RRP)",
            "unit": "Trillions USD",
            "history": history,
            "last_updated": datetime.now().isoformat(),
        }

    def _is_cache_valid(self) -> bool:
        if "data" not in self._cache:
            return False
        age = (datetime.now() - self._cache.get("updated_at", datetime.min)).total_seconds()
        return age < self._cache_ttl

    def _default_response(self) -> dict:
        return {
            "current": {
                "walcl": 7.08,
                "tga": 0.71,
                "rrp": 0.09,
                "net_liquidity": 6.28,
                "wow_change": 0.0,
                "wow_change_pct": 0.0,
                "signal": "UNKNOWN",
            },
            "formula": "Net_Liq = WALCL - (TGA + RRP)",
            "unit": "Trillions USD",
            "history": [],
            "error": "Using fallback values — FRED data unavailable",
            "last_updated": datetime.now().isoformat(),
        }


# Singleton
net_liquidity_service = NetLiquidityService()
