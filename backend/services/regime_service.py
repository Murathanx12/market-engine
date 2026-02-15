"""Regime detection service using 3-state HMM on S&P 500 returns."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import logging
from typing import Dict, Any

import numpy as np
import pandas as pd

try:
    from hmmlearn.hmm import GaussianHMM
except Exception:  # pragma: no cover - graceful fallback if dependency missing
    GaussianHMM = None

logger = logging.getLogger(__name__)


@dataclass
class RegimeSnapshot:
    regime: str
    confidence: float
    volatility: float
    mean_return: float
    vix: float
    probabilities: Dict[str, float]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "regime": self.regime,
            "confidence": round(self.confidence, 3),
            "volatility": round(self.volatility, 3),
            "mean_return": round(self.mean_return, 3),
            "vix": round(self.vix, 2),
            "probabilities": {k: round(v, 3) for k, v in self.probabilities.items()},
            "last_updated": datetime.now().isoformat(),
        }


class RegimeService:
    """Computes bull/neutral/bear regime from returns + volatility features."""

    STATE_LABELS = ("bear", "neutral", "bull")

    def compute(self, history: pd.DataFrame, vix: float) -> RegimeSnapshot:
        closes = history["Close"].dropna()
        returns = np.log(closes / closes.shift(1)).dropna()

        if len(returns) < 80:
            raise ValueError("Insufficient history for regime detection")

        mean_return = float(returns.mean() * 252)
        volatility = float(returns.std(ddof=1) * np.sqrt(252))

        if GaussianHMM is None:
            logger.warning("hmmlearn unavailable, using heuristic regime fallback")
            return self._fallback_snapshot(mean_return, volatility, vix)

        rolling_vol = returns.rolling(21).std().bfill()
        X = np.column_stack([returns.values, rolling_vol.values])

        model = GaussianHMM(
            n_components=3,
            covariance_type="full",
            n_iter=250,
            random_state=42,
        )
        model.fit(X)

        posteriors = model.predict_proba(X)
        last_probs = posteriors[-1]

        state_means = model.means_[:, 0]
        order = np.argsort(state_means)  # bear < neutral < bull
        mapped = {
            self.STATE_LABELS[idx]: float(last_probs[state])
            for idx, state in enumerate(order)
        }

        regime = max(mapped, key=mapped.get).upper()
        confidence = float(mapped[regime.lower()])

        return RegimeSnapshot(
            regime=regime,
            confidence=confidence,
            volatility=volatility,
            mean_return=mean_return,
            vix=vix,
            probabilities=mapped,
        )

    def _fallback_snapshot(self, mean_return: float, volatility: float, vix: float) -> RegimeSnapshot:
        if mean_return > 0.07 and volatility < 0.22:
            regime = "BULL"
            probs = {"bull": 0.65, "neutral": 0.25, "bear": 0.10}
        elif mean_return < -0.07 or volatility > 0.30:
            regime = "BEAR"
            probs = {"bull": 0.10, "neutral": 0.25, "bear": 0.65}
        else:
            regime = "NEUTRAL"
            probs = {"bull": 0.2, "neutral": 0.6, "bear": 0.2}

        return RegimeSnapshot(
            regime=regime,
            confidence=max(probs.values()),
            volatility=volatility,
            mean_return=mean_return,
            vix=vix,
            probabilities=probs,
        )


regime_service = RegimeService()
