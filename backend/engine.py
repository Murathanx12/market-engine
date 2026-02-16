"""
===================================================================================
MARKET PREDICTION ENGINE v6.0 - CORE ENGINE
===================================================================================

Combines the best of V2 (Monte Carlo, backtesting, composite risk) and
V4 (institutional calibration, hard caps, sector analysis) into a single
reusable module for the FastAPI backend.

Key capabilities:
- Jump-diffusion Monte Carlo simulation (V2) with institutional anchoring (V4)
- Multi-scenario probability weighting adjusted by regime
- Composite risk indicator (9-factor z-score weighted)
- Walk-forward backtesting (2000-present)
- Dynamic crash probability by time horizon
- Stock projection with analyst target moderation and hard caps
- Portfolio analytics
===================================================================================
"""

import numpy as np
import pandas as pd
import logging
try:
    from scipy import stats as scipy_stats
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False
    scipy_stats = None
    logging.warning("scipy not available - using numpy fallback for Student-t distribution")
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ===================================================================================
# CONFIGURATION
# ===================================================================================

CONFIG = {
    # Forecast
    'forecast_years': 5,
    'simulations': 5000,         # 5k for API speed; V2 used 10k for PDF
    'trading_days': 252,

    # Realistic constraints (V4)
    'max_5y_return': 3.0,        # 300% maximum over 5 years
    'max_annual_vol': 1.2,       # 120% volatility cap
    'min_price_floor_pct': 0.02, # Minimum price = 2% of start (prevents 0)

    # Risk
    'crash_threshold': 0.20,     # 20% drawdown = crash
    'severe_threshold': 0.35,    # 35% = severe crash
    'confidence_level': 0.95,

    # Backtesting
    'validation_window': 252,    # 1 year forward
    'estimation_window': 5,      # 5 years lookback
    'transaction_cost': 0.001,   # 0.1% per trade

    # Jump-diffusion parameters (V2)
    'jump_mean': -0.18,          # Average jump size (crashes are negative)
    'jump_std': 0.09,            # Jump size volatility
    't_df': 6,                   # Student-t degrees of freedom (fat tails)
}

# Institutional benchmarks (V4)
INSTITUTIONAL_BENCHMARKS = {
    'Vanguard': 0.047,
    'Schwab': 0.059,
    'BlackRock': 0.052,
    'Morgan_Stanley': 0.08,
}

# Sector map (V4 - expanded)
SECTOR_MAP = {
    'NVDA': 'Technology', 'AMD': 'Technology', 'TSM': 'Technology', 'ORCL': 'Technology',
    'AVGO': 'Technology', 'ADBE': 'Technology', 'MRVL': 'Technology', 'MSTR': 'Technology',
    'HUBS': 'Technology', 'PRCH': 'Technology', 'COHU': 'Technology', 'OUST': 'Technology',
    'QUBT': 'Technology', 'QBTS': 'Technology', 'RGTI': 'Technology', 'MU': 'Technology',
    'KLAR': 'Technology', 'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOG': 'Technology',
    'GOOGL': 'Technology', 'META': 'Technology', 'AMZN': 'Consumer', 'TSLA': 'Consumer',
    'MRNA': 'Healthcare', 'NTLA': 'Healthcare', 'BHVN': 'Healthcare', 'BEAM': 'Healthcare',
    'KYMR': 'Healthcare', 'TGTX': 'Healthcare', 'KYTX': 'Healthcare', 'ZYME': 'Healthcare',
    'ABSI': 'Healthcare', 'IMNM': 'Healthcare', 'CRSP': 'Healthcare', 'BMRN': 'Healthcare',
    'OLMA': 'Healthcare', 'ATYR': 'Healthcare', 'APLT': 'Healthcare', 'AARD': 'Healthcare',
    'TVTX': 'Healthcare', 'ALMS': 'Healthcare', 'SRRK': 'Healthcare', 'RVMD': 'Healthcare',
    'LLY': 'Healthcare', 'DHR': 'Healthcare', 'APMX': 'Healthcare', 'TVRD': 'Healthcare',
    'CYTK': 'Healthcare', 'SLNO': 'Healthcare', 'XNCR': 'Healthcare', 'AAPG': 'Healthcare',
    'DKNG': 'Consumer', 'ELF': 'Consumer', 'TTWO': 'Consumer',
    'FSLR': 'Energy', 'SOC': 'Energy',
    'BE': 'Industrials', 'AMSC': 'Industrials', 'SLDP': 'Industrials',
    'ACVA': 'Industrials', 'QS': 'Industrials', 'LTR': 'Industrials',
    'MP': 'Materials',
    'CHYM': 'Financials', 'GLXY': 'Financials', 'DAVE': 'Financials',
    'JPM': 'Financials', 'GS': 'Financials', 'BAC': 'Financials',
    'XOM': 'Energy', 'CVX': 'Energy',
    'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare',
}


# ===================================================================================
# MONTE CARLO SIMULATION (V2 jump-diffusion + V4 scenarios)
# ===================================================================================

def simulate_paths_jump_diffusion(
    start_price: float,
    annual_return: float,
    annual_vol: float,
    days: int,
    n_sims: int,
    crash_rate: float = 0.05,
    risk_level: float = 0.0,
    scenario_params: Optional[Dict] = None,
) -> np.ndarray:
    """
    Advanced Monte Carlo with jump-diffusion process (V2) and scenario adjustments.

    Uses Student-t distributed shocks for fat tails, plus Poisson-distributed
    crash jumps. This produces more realistic tail behavior than plain GBM.

    Args:
        start_price: Starting price level
        annual_return: Expected annual drift (mu)
        annual_vol: Annual volatility (sigma)
        days: Number of trading days to simulate
        n_sims: Number of simulation paths
        crash_rate: Annual probability of a crash jump
        risk_level: Current composite risk score (z-score, higher = riskier)
        scenario_params: Dict with 'drift_adj', 'vol_mult', 'crash_mult'

    Returns:
        np.ndarray of shape (days+1, n_sims) with simulated price paths
    """
    if scenario_params is None:
        scenario_params = {}

    mu = annual_return + scenario_params.get('drift_adj', 0)
    sigma = annual_vol * scenario_params.get('vol_mult', 1.0)
    crash_mult = scenario_params.get('crash_mult', 1.0)

    # Risk-adjusted crash rate
    risk_factor = 1.0 + 0.3 * max(0, risk_level)
    adj_crash_rate = min(0.20, crash_rate * crash_mult * risk_factor)
    daily_crash_prob = adj_crash_rate / CONFIG['trading_days']

    dt = 1.0 / CONFIG['trading_days']

    # Pre-generate Student-t shocks (fat tails)
    df_param = CONFIG['t_df']
    if HAS_SCIPY:
        t_shocks = scipy_stats.t.rvs(df=df_param, size=(days, n_sims))
        # Normalize so variance = 1
        t_shocks = t_shocks / np.sqrt(df_param / (df_param - 2))
    else:
        # Fallback: use normal distribution with slightly heavier tails approximation
        t_shocks = np.random.standard_normal((days, n_sims))
        # Approximate fat tails by mixing with uniform noise
        tail_mask = np.random.random((days, n_sims)) < 0.05
        t_shocks[tail_mask] *= 2.5

    paths = np.zeros((days + 1, n_sims))
    paths[0] = start_price

    # Pre-generate jump occurrences and sizes
    jump_occurs = np.random.random((days, n_sims)) < daily_crash_prob
    jump_sizes = np.random.normal(
        CONFIG['jump_mean'], CONFIG['jump_std'], (days, n_sims)
    ) * jump_occurs

    for t in range(1, days + 1):
        drift = (mu - 0.5 * sigma**2) * dt
        diffusion = sigma * np.sqrt(dt) * t_shocks[t - 1]
        new_prices = paths[t - 1] * np.exp(drift + diffusion) * (1 + jump_sizes[t - 1])
        paths[t] = np.maximum(new_prices, start_price * CONFIG['min_price_floor_pct'])

    return paths


def run_multi_scenario_simulation(
    current_level: float,
    regime: str = 'bull',
    risk_score: float = 0.0,
    vix_level: float = 20.0,
    yield_curve: float = 0.5,
    forecast_years: int = 5,
    n_sims: int = None,
) -> Dict:
    """
    Multi-scenario Monte Carlo combining V2 jump-diffusion with V4 institutional calibration.

    Scenarios are probability-weighted and adjusted by current regime and risk indicators.

    Returns dict with paths statistics, scenario details, crash probabilities, and risk metrics.
    """
    if n_sims is None:
        n_sims = CONFIG['simulations']

    # Institutional average annual return (excluding short-term outliers)
    inst_avg = np.mean(list(INSTITUTIONAL_BENCHMARKS.values()))

    # Define scenarios (V4 structure with V2 dynamic adjustment)
    scenarios = {
        'Base Case': {
            'probability': 0.35,
            'return': inst_avg * 1.05,
            'volatility': 0.18,
            'crash_mult': 1.0,
        },
        'AI Productivity Boom': {
            'probability': 0.25,
            'return': inst_avg * 1.40,
            'volatility': 0.25,
            'crash_mult': 0.7,
        },
        'Market Correction': {
            'probability': 0.20,
            'return': inst_avg * 0.60,
            'volatility': 0.30,
            'crash_mult': 1.5,
        },
        'Recession': {
            'probability': 0.13,
            'return': inst_avg * 0.30,
            'volatility': 0.35,
            'crash_mult': 2.0,
        },
        'Geopolitical Crisis': {
            'probability': 0.07,
            'return': inst_avg * 0.10,
            'volatility': 0.40,
            'crash_mult': 2.5,
        },
    }

    # Dynamic probability adjustment (V2 logic)
    scenarios = _adjust_scenario_probabilities(
        scenarios, regime, risk_score, vix_level, yield_curve
    )

    forecast_days = forecast_years * CONFIG['trading_days']
    all_final_values = []
    all_paths_sampled = []  # Store subset for charting
    scenario_results = {}

    base_crash_freq = 0.05  # ~1 crash every 3.2 years historically

    for name, params in scenarios.items():
        s_n = max(100, int(n_sims * params['probability']))
        scenario_params = {
            'drift_adj': 0,
            'vol_mult': 1.0,
            'crash_mult': params['crash_mult'],
        }

        paths = simulate_paths_jump_diffusion(
            start_price=current_level,
            annual_return=params['return'],
            annual_vol=params['volatility'],
            days=forecast_days,
            n_sims=s_n,
            crash_rate=base_crash_freq,
            risk_level=risk_score,
            scenario_params=scenario_params,
        )

        final_vals = paths[-1]
        all_final_values.extend(final_vals.tolist())

        # Sample paths for visualization (max 20 per scenario)
        sample_idx = np.random.choice(s_n, min(20, s_n), replace=False)
        # Downsample time axis for API (monthly points)
        time_step = max(1, forecast_days // (forecast_years * 12))
        time_indices = list(range(0, forecast_days + 1, time_step))
        if time_indices[-1] != forecast_days:
            time_indices.append(forecast_days)

        for idx in sample_idx:
            all_paths_sampled.append(paths[time_indices, idx].tolist())

        scenario_results[name] = {
            'probability': round(params['probability'], 3),
            'annual_return': round(params['return'] * 100, 1),
            'volatility': round(params['volatility'] * 100, 1),
            'simulations': s_n,
            'mean_final': round(float(np.mean(final_vals)), 2),
            'median_final': round(float(np.median(final_vals)), 2),
        }

    all_final = np.array(all_final_values)

    # Time series statistics (for charting confidence bands)
    # We need to rebuild aggregate paths - run a combined simulation
    combined_paths = simulate_paths_jump_diffusion(
        start_price=current_level,
        annual_return=inst_avg,
        annual_vol=0.20,
        days=forecast_days,
        n_sims=min(2000, n_sims),
        crash_rate=base_crash_freq,
        risk_level=risk_score,
    )

    # Downsample for API response
    time_indices = list(range(0, forecast_days + 1, time_step))
    if time_indices[-1] != forecast_days:
        time_indices.append(forecast_days)

    mean_path = np.mean(combined_paths, axis=1)[time_indices]
    median_path = np.median(combined_paths, axis=1)[time_indices]
    p05 = np.percentile(combined_paths, 5, axis=1)[time_indices]
    p25 = np.percentile(combined_paths, 25, axis=1)[time_indices]
    p75 = np.percentile(combined_paths, 75, axis=1)[time_indices]
    p95 = np.percentile(combined_paths, 95, axis=1)[time_indices]

    # Convert time indices to dates
    start_date = datetime.now()
    dates = [(start_date + timedelta(days=int(t * 365 / CONFIG['trading_days']))).strftime('%Y-%m-%d')
             for t in time_indices]

    # Crash probabilities by horizon (V2)
    crash_probs = {}
    horizons = {
        '3mo': 63, '6mo': 126, '1y': 252,
        '18mo': 378, '2y': 504, '3y': 756,
        '4y': 1008, '5y': 1260,
    }
    for label, days_h in horizons.items():
        if days_h <= forecast_days:
            vals_at_horizon = combined_paths[min(days_h, combined_paths.shape[0] - 1)]
            crash_probs[label] = round(
                float(np.mean(vals_at_horizon < current_level * (1 - CONFIG['crash_threshold']))) * 100, 1
            )

    # Risk metrics
    final_returns = (all_final / current_level - 1)
    var_95 = float(np.percentile(all_final, 5))
    cvar_95 = float(np.mean(all_final[all_final <= var_95]))
    max_drawdown = float(np.min(np.min(combined_paths, axis=0) / current_level - 1))

    return {
        'current_level': current_level,
        'forecast_years': forecast_years,
        'total_simulations': len(all_final_values),
        'scenarios': scenario_results,
        'projection': {
            'dates': dates,
            'mean': [round(float(v), 2) for v in mean_path],
            'median': [round(float(v), 2) for v in median_path],
            'p05': [round(float(v), 2) for v in p05],
            'p25': [round(float(v), 2) for v in p25],
            'p75': [round(float(v), 2) for v in p75],
            'p95': [round(float(v), 2) for v in p95],
        },
        'final_stats': {
            'mean': round(float(np.mean(all_final)), 2),
            'median': round(float(np.median(all_final)), 2),
            'p05': round(float(np.percentile(all_final, 5)), 2),
            'p95': round(float(np.percentile(all_final, 95)), 2),
            'total_return_pct': round(float(np.mean(final_returns) * 100), 1),
            'annual_return_pct': round(float(((np.mean(all_final) / current_level) ** (1 / forecast_years) - 1) * 100), 1),
        },
        'crash_probabilities': crash_probs,
        'risk_metrics': {
            'var_95': round(var_95, 2),
            'cvar_95': round(cvar_95, 2),
            'cvar_95_pct': round(float((cvar_95 / current_level - 1) * 100), 1),
            'max_drawdown_pct': round(max_drawdown * 100, 1),
        },
    }


def _adjust_scenario_probabilities(
    scenarios: Dict, regime: str, risk_score: float,
    vix_level: float, yield_curve: float,
) -> Dict:
    """Dynamically adjust scenario probabilities based on market conditions (V2)."""
    s = {k: dict(v) for k, v in scenarios.items()}  # Deep copy

    # Risk score adjustments
    if risk_score > 2.0:
        s['Market Correction']['probability'] *= 1.5
        s['Geopolitical Crisis']['probability'] *= 1.3
        s['AI Productivity Boom']['probability'] *= 0.6
    elif risk_score < -0.5:
        s['AI Productivity Boom']['probability'] *= 1.3
        s['Base Case']['probability'] *= 1.2
        s['Market Correction']['probability'] *= 0.7

    # VIX adjustments
    if vix_level > 30:
        s['Geopolitical Crisis']['probability'] *= 1.4
        s['Recession']['probability'] *= 1.2
    elif vix_level < 15:
        s['AI Productivity Boom']['probability'] *= 1.1
        s['Base Case']['probability'] *= 1.1

    # Yield curve adjustments
    if yield_curve < 0:
        s['Recession']['probability'] *= 1.5
        s['AI Productivity Boom']['probability'] *= 0.8

    # Regime adjustments
    regime_lower = regime.lower()
    if regime_lower == 'bull':
        s['AI Productivity Boom']['probability'] *= 1.2
        s['Recession']['probability'] *= 0.8
    elif regime_lower == 'bear':
        s['Recession']['probability'] *= 1.3
        s['AI Productivity Boom']['probability'] *= 0.7
    elif regime_lower in ('volatile', 'crisis'):
        s['Market Correction']['probability'] *= 1.3
        s['Geopolitical Crisis']['probability'] *= 1.2

    # Renormalize
    total = sum(v['probability'] for v in s.values())
    for v in s.values():
        v['probability'] /= total

    return s


# ===================================================================================
# COMPOSITE RISK INDICATOR (V2 - 9 factor weighted z-score)
# ===================================================================================

def calculate_zscore(series: pd.Series, window: int = 252) -> pd.Series:
    """Rolling z-score."""
    mean = series.rolling(window, min_periods=60).mean()
    std = series.rolling(window, min_periods=60).std()
    return ((series - mean) / std.replace(0, np.nan)).fillna(0)


def build_composite_risk_indicator(df: pd.DataFrame) -> pd.Series:
    """
    Multi-factor composite risk score (V2).
    Combines up to 9 market indicators into a single z-score.
    Positive = elevated risk, negative = low risk.
    """
    signals = []
    weights = []

    # 1. VIX (Fear Index)
    if 'VIX' in df.columns:
        vix_z = calculate_zscore(df['VIX'], 252)
        signals.append(vix_z)
        weights.append(2.0)

    # 2. Yield Curve (inverted = recession signal)
    if 'yield_curve' in df.columns:
        curve_z = calculate_zscore(df['yield_curve'], 252)
        signals.append(-curve_z)  # Negative curve = higher risk
        weights.append(1.8)

    # 3. Credit Spread
    if 'credit_spread' in df.columns:
        spread_z = calculate_zscore(df['credit_spread'], 252)
        signals.append(spread_z)
        weights.append(1.9)

    # 4. Momentum Exhaustion
    if 'SP500' in df.columns:
        returns_60d = df['SP500'].pct_change(60)
        momentum_z = calculate_zscore(returns_60d, 252)
        exhaustion = momentum_z.apply(lambda x: max(0, abs(x) - 2.0))
        signals.append(exhaustion)
        weights.append(1.5)

    # 5. Short-term Volatility Regime
    if 'SP500' in df.columns:
        daily_ret = df['SP500'].pct_change()
        vol_20d = daily_ret.rolling(20).std() * np.sqrt(252)
        vol_z = calculate_zscore(vol_20d, 252)
        signals.append(vol_z)
        weights.append(1.3)

    # 6. Gold/Stock ratio (flight to safety)
    if 'Gold' in df.columns and 'SP500' in df.columns:
        gold_ratio = df['Gold'] / df['SP500']
        ratio_change = gold_ratio.pct_change(60)
        gold_z = calculate_zscore(ratio_change, 252)
        signals.append(gold_z)
        weights.append(1.2)

    # 7. Market breadth (small caps divergence)
    if 'Russell2000' in df.columns and 'SP500' in df.columns:
        ratio = df['Russell2000'] / df['SP500']
        div_z = calculate_zscore(ratio.pct_change(60), 252)
        signals.append(-div_z)
        weights.append(1.1)

    # 8. Put/Call ratio (if available)
    if 'put_call_ratio' in df.columns:
        pc_z = calculate_zscore(df['put_call_ratio'], 252)
        signals.append(pc_z)
        weights.append(1.0)

    # 9. Unemployment trend
    if 'unemployment' in df.columns:
        unemp_z = calculate_zscore(df['unemployment'], 252)
        signals.append(unemp_z)
        weights.append(0.8)

    if len(signals) == 0:
        return pd.Series(0, index=df.index)

    total_weight = sum(weights)
    composite = sum(s * w for s, w in zip(signals, weights)) / total_weight
    return composite.clip(-4, 4)


def detect_regime(vix: float = None, inflation: float = None,
                  unemployment: float = None, yield_curve: float = None) -> Tuple[str, float]:
    """
    Detect market regime from current macro indicators.
    Returns (regime_name, confidence).
    """
    if vix is not None and vix > 35:
        return 'crisis', 0.9
    elif vix is not None and vix > 25:
        return 'volatile', 0.8
    elif unemployment is not None and unemployment > 6:
        return 'bear', 0.7
    elif inflation is not None and inflation > 5:
        return 'bear', 0.6
    elif yield_curve is not None and yield_curve < -0.5:
        return 'bear', 0.7
    elif vix is not None and vix < 15 and (yield_curve is None or yield_curve > 0):
        return 'bull', 0.8
    else:
        return 'bull', 0.6


# ===================================================================================
# STOCK PROJECTION ENGINE (V4 institutional-grade with V2 Monte Carlo)
# ===================================================================================

def estimate_volatility(current_price: float, analyst_rating: float = 3.0) -> float:
    """
    Estimate annualized volatility from price (proxy for market cap) and analyst confidence.
    V4 granular sizing bands.
    """
    if current_price < 5:
        base_vol = 0.90
    elif current_price < 10:
        base_vol = 0.75
    elif current_price < 25:
        base_vol = 0.60
    elif current_price < 50:
        base_vol = 0.50
    elif current_price < 100:
        base_vol = 0.40
    elif current_price < 200:
        base_vol = 0.35
    else:
        base_vol = 0.28

    rating_adj = (5 - analyst_rating) * 0.04
    return min(base_vol + rating_adj, CONFIG['max_annual_vol'])


def project_stock(
    ticker: str,
    current_price: float,
    analyst_target: Optional[float] = None,
    historical_vol: Optional[float] = None,
    regime: str = 'bull',
    n_sims: int = 2000,
) -> Dict:
    """
    Project stock price across multiple horizons using Monte Carlo (V2 engine)
    with institutional constraints (V4 caps).

    Returns projections for 1M, 6M, 1Y, 5Y with confidence bands.
    """
    if current_price <= 0:
        return None

    # Estimate or use provided volatility
    vol = historical_vol if historical_vol else estimate_volatility(current_price)

    # Year 1 expected return from analyst target (V4 moderation)
    if analyst_target and analyst_target > 0:
        implied_1y = (analyst_target / current_price - 1)
        implied_1y = min(implied_1y, 1.0)  # Cap at 100%/yr
        year1_return = implied_1y * 0.70    # 30% haircut on analyst optimism
    else:
        year1_return = 0.08  # Default 8%

    # Long-term return with mean reversion (V4)
    if analyst_target and analyst_target > 0:
        lt_return = max(0.05, min(0.20, (analyst_target / current_price - 1) * 0.30))
    else:
        lt_return = 0.08

    # Regime multiplier
    regime_mult = {'bull': 1.0, 'bear': 0.6, 'volatile': 0.8, 'crisis': 0.5}.get(
        regime.lower(), 1.0
    )

    horizons = {'1M': 21, '6M': 126, '1Y': 252, '5Y': 1260}
    results = {}

    for label, days in horizons.items():
        years = days / CONFIG['trading_days']
        if years <= 1:
            mu = year1_return * regime_mult
        else:
            # Blend Y1 and long-term
            mu = (year1_return + lt_return * (years - 1)) / years * regime_mult

        paths = simulate_paths_jump_diffusion(
            start_price=current_price,
            annual_return=mu,
            annual_vol=vol,
            days=days,
            n_sims=n_sims,
            crash_rate=0.05,
        )

        final = paths[-1]

        # Hard cap at 300% (V4)
        max_price = current_price * (1 + CONFIG['max_5y_return'])
        final = np.minimum(final, max_price)

        proj_return = float(np.mean(final) / current_price - 1)

        results[label] = {
            'mean': round(float(np.mean(final)), 2),
            'median': round(float(np.median(final)), 2),
            'p05': round(float(np.percentile(final, 5)), 2),
            'p25': round(float(np.percentile(final, 25)), 2),
            'p75': round(float(np.percentile(final, 75)), 2),
            'p95': round(float(np.percentile(final, 95)), 2),
            'return_pct': round(proj_return * 100, 1),
        }

    # Sharpe ratio (V4)
    annual_return_5y = ((results['5Y']['mean'] / current_price) ** 0.2 - 1)
    sharpe = (annual_return_5y - 0.04) / vol if vol > 0 else 0

    sector = SECTOR_MAP.get(ticker, 'Other')

    return {
        'ticker': ticker,
        'current_price': current_price,
        'analyst_target': analyst_target,
        'historical_vol': round(vol * 100, 1),
        'regime': regime,
        'sector': sector,
        'sharpe': round(sharpe, 2),
        'projections': results,
    }


# ===================================================================================
# CRASH ESTIMATOR (New for V6 - roadmap section 1.2)
# ===================================================================================

def estimate_crash_timeline(
    current_level: float,
    regime: str = 'bull',
    risk_score: float = 0.0,
    vix: float = 20.0,
    yield_curve: float = 0.5,
    months_ahead: int = 60,
) -> Dict:
    """
    Estimate monthly crash probability over the next N months.
    A 'crash' is defined as a ≥20% drawdown from peak.

    Returns:
        - monthly_probabilities: list of {month, probability, cumulative}
        - peak_risk_month: month with highest marginal probability
        - contributing_factors: top risk factors
    """
    n_sims = 3000
    forecast_days = int(months_ahead * 21)  # ~21 trading days/month
    inst_avg = np.mean(list(INSTITUTIONAL_BENCHMARKS.values()))

    paths = simulate_paths_jump_diffusion(
        start_price=current_level,
        annual_return=inst_avg,
        annual_vol=0.20,
        days=forecast_days,
        n_sims=n_sims,
        crash_rate=0.05,
        risk_level=risk_score,
    )

    # Track peak and drawdown for each simulation
    monthly_crash_counts = np.zeros(months_ahead)
    crash_already_happened = np.zeros(n_sims, dtype=bool)

    for m in range(months_ahead):
        day_idx = min((m + 1) * 21, paths.shape[0] - 1)
        window = paths[:day_idx + 1]

        # Running peak for each simulation
        peaks = np.maximum.accumulate(window, axis=0)
        drawdowns = (window - peaks) / peaks

        # Check if crash (≥20% drawdown) happened by this month
        crashed_by_now = np.any(drawdowns <= -CONFIG['crash_threshold'], axis=0)

        # New crashes this month
        new_crashes = crashed_by_now & ~crash_already_happened
        monthly_crash_counts[m] = np.sum(new_crashes)
        crash_already_happened = crashed_by_now

    # Convert to probabilities
    monthly_probs = monthly_crash_counts / n_sims * 100
    cumulative_probs = np.cumsum(monthly_crash_counts) / n_sims * 100
    # Cap cumulative at 100
    cumulative_probs = np.minimum(cumulative_probs, 100.0)

    # Start date
    start = datetime.now()
    monthly_data = []
    for m in range(months_ahead):
        month_date = start + timedelta(days=30 * (m + 1))
        monthly_data.append({
            'month': m + 1,
            'date': month_date.strftime('%Y-%m'),
            'probability': round(float(monthly_probs[m]), 2),
            'cumulative': round(float(cumulative_probs[m]), 1),
        })

    # Find peak risk period
    peak_month = int(np.argmax(monthly_probs)) + 1
    peak_prob = float(monthly_probs[peak_month - 1])

    # Contributing factors
    factors = _identify_risk_factors(risk_score, vix, yield_curve, regime)

    return {
        'months_ahead': months_ahead,
        'total_simulations': n_sims,
        'crash_threshold_pct': CONFIG['crash_threshold'] * 100,
        'monthly_probabilities': monthly_data,
        'peak_risk_month': peak_month,
        'peak_risk_probability': round(peak_prob, 2),
        'total_crash_probability_1y': round(float(cumulative_probs[min(11, months_ahead - 1)]), 1),
        'total_crash_probability_5y': round(float(cumulative_probs[-1]), 1),
        'contributing_factors': factors,
        'regime': regime,
        'risk_score': round(risk_score, 2),
    }


def _identify_risk_factors(risk_score, vix, yield_curve, regime) -> List[Dict]:
    """Identify and rank current risk factors."""
    factors = []

    # VIX assessment
    if vix > 30:
        factors.append({'factor': 'Elevated VIX (Fear Index)', 'severity': 'HIGH',
                       'detail': f'VIX at {vix:.1f} indicates extreme market fear'})
    elif vix > 20:
        factors.append({'factor': 'Above-average VIX', 'severity': 'MEDIUM',
                       'detail': f'VIX at {vix:.1f} signals moderate anxiety'})

    # Yield curve
    if yield_curve < 0:
        factors.append({'factor': 'Inverted Yield Curve', 'severity': 'HIGH',
                       'detail': f'Yield spread at {yield_curve:.2f}% — historical recession predictor'})
    elif yield_curve < 0.5:
        factors.append({'factor': 'Flattening Yield Curve', 'severity': 'MEDIUM',
                       'detail': f'Yield spread at {yield_curve:.2f}% — approaching inversion zone'})

    # Regime
    if regime.lower() in ('bear', 'crisis'):
        factors.append({'factor': f'{regime.title()} Market Regime', 'severity': 'HIGH',
                       'detail': 'Macro indicators suggest defensive positioning'})
    elif regime.lower() == 'volatile':
        factors.append({'factor': 'Volatile Market Regime', 'severity': 'MEDIUM',
                       'detail': 'Elevated uncertainty in market conditions'})

    # Risk score
    if risk_score > 1.5:
        factors.append({'factor': 'High Composite Risk Score', 'severity': 'HIGH',
                       'detail': f'Multi-factor risk at {risk_score:.2f}σ above normal'})
    elif risk_score > 0.5:
        factors.append({'factor': 'Elevated Risk Score', 'severity': 'MEDIUM',
                       'detail': f'Multi-factor risk at {risk_score:.2f}σ'})

    # If nothing flagged, note the calm
    if not factors:
        factors.append({'factor': 'Low Overall Risk', 'severity': 'LOW',
                       'detail': 'No major risk indicators currently elevated'})

    # Sort by severity
    sev_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
    factors.sort(key=lambda x: sev_order.get(x['severity'], 3))

    return factors[:5]


# ===================================================================================
# BACKTESTING ENGINE (V2 walk-forward)
# ===================================================================================

def run_backtest(
    prices: pd.Series,
    start_year: int = 2000,
    step_months: int = 3,
) -> Dict:
    """
    Walk-forward backtest: at each prediction date, simulate 1-year ahead
    using only data available at that time, then compare to actual.

    Args:
        prices: S&P 500 daily prices with DatetimeIndex
        start_year: First prediction year
        step_months: Months between predictions

    Returns dict with predictions list, metrics, and summary.
    """
    if prices is None or len(prices) < 500:
        return {'error': 'Insufficient price data for backtesting'}

    backtest_start = pd.Timestamp(f'{start_year}-01-01')
    prices = prices[prices.index >= backtest_start - timedelta(days=365 * CONFIG['estimation_window'])]

    pred_dates = pd.date_range(
        start=max(prices.index[0] + timedelta(days=365 * 2), backtest_start),
        end=prices.index[-1] - timedelta(days=CONFIG['validation_window']),
        freq=f'{step_months}MS',
    )

    results = []

    for pred_date in pred_dates:
        idx = prices.index.get_indexer([pred_date], method='nearest')[0]
        if idx < 252 or idx + CONFIG['validation_window'] >= len(prices):
            continue

        # Historical window
        hist = prices.iloc[max(0, idx - CONFIG['estimation_window'] * 252):idx]
        if len(hist) < 252:
            continue

        returns = hist.pct_change().dropna()
        mu_est = (1 + returns.mean()) ** 252 - 1
        sigma_est = returns.std() * np.sqrt(252)
        start_price = float(prices.iloc[idx])

        # Simulate 1 year ahead
        paths = simulate_paths_jump_diffusion(
            start_price=start_price,
            annual_return=mu_est,
            annual_vol=sigma_est,
            days=CONFIG['validation_window'],
            n_sims=500,
            crash_rate=0.05,
        )

        pred_mean = float(np.mean(paths[-1]))
        pred_p05 = float(np.percentile(paths[-1], 5))
        pred_p95 = float(np.percentile(paths[-1], 95))

        actual_idx = min(idx + CONFIG['validation_window'], len(prices) - 1)
        actual_price = float(prices.iloc[actual_idx])

        error_pct = (pred_mean - actual_price) / actual_price * 100
        within_bounds = pred_p05 <= actual_price <= pred_p95

        results.append({
            'date': pred_date.strftime('%Y-%m-%d'),
            'start_price': round(start_price, 2),
            'actual_price': round(actual_price, 2),
            'predicted_mean': round(pred_mean, 2),
            'predicted_p05': round(pred_p05, 2),
            'predicted_p95': round(pred_p95, 2),
            'error_pct': round(error_pct, 1),
            'within_90_band': within_bounds,
            'actual_return_pct': round((actual_price / start_price - 1) * 100, 1),
            'predicted_return_pct': round((pred_mean / start_price - 1) * 100, 1),
        })

    if not results:
        return {'error': 'No valid prediction windows found'}

    df = pd.DataFrame(results)
    mape = float(np.mean(np.abs(df['error_pct'])))
    coverage = float(df['within_90_band'].mean() * 100)
    n_predictions = len(results)

    return {
        'predictions': results,
        'metrics': {
            'n_predictions': n_predictions,
            'mape': round(mape, 1),
            'coverage_90': round(coverage, 1),
            'mean_error_pct': round(float(df['error_pct'].mean()), 1),
            'rmse_pct': round(float(np.sqrt(np.mean(df['error_pct'] ** 2))), 1),
        },
        'period': f'{start_year}-present',
    }


# ===================================================================================
# NEWS SENTIMENT (lightweight - no FinBERT dependency)
# ===================================================================================

NEGATIVE_WORDS = {
    'crash', 'recession', 'decline', 'fall', 'drop', 'crisis', 'fear',
    'plunge', 'collapse', 'slump', 'downturn', 'bear', 'warning', 'risk',
    'default', 'bankruptcy', 'layoff', 'sell-off', 'selloff', 'panic',
    'volatility', 'concern', 'worry', 'threat', 'war', 'conflict', 'tariff',
    'inflation', 'debt', 'deficit', 'uncertainty', 'slowdown', 'contraction',
    'loss', 'losses', 'weak', 'weaken', 'negative', 'down', 'cut', 'cuts',
    'slash', 'miss', 'missed', 'disappoint', 'worse', 'worst', 'trouble',
    'struggle', 'struggling', 'headwind', 'pressure', 'restrict', 'restrict',
    'penalty', 'fine', 'lawsuit', 'probe', 'investigate', 'fraud', 'scandal',
    'protest', 'strike', 'shutdown', 'suspend', 'delay', 'stall', 'stalled',
    'flee', 'exit', 'outflow', 'drain', 'squeeze', 'crunch', 'bust',
    'overvalued', 'bubble', 'correction', 'tumble', 'slide', 'sink',
    'erode', 'erosion', 'shrink', 'weigh', 'drag', 'dampen', 'hurt',
    'harm', 'damage', 'disrupt', 'disruption', 'volatile', 'unstable',
    'gaslighting', 'accused', 'blame', 'clash', 'tension', 'tensions',
}

POSITIVE_WORDS = {
    'surge', 'rally', 'gain', 'rise', 'boom', 'growth', 'bull', 'record',
    'optimism', 'recovery', 'expansion', 'profit', 'beat', 'exceed',
    'upgrade', 'breakthrough', 'innovation', 'hire', 'hiring', 'stimulus',
    'rate cut', 'easing', 'rebound', 'upbeat', 'strong', 'robust',
    'up', 'high', 'higher', 'positive', 'improve', 'improved', 'improvement',
    'boost', 'boosted', 'advance', 'win', 'success', 'outperform',
    'top', 'best', 'soar', 'jump', 'leap', 'accelerate', 'momentum',
    'shine', 'shining', 'stellar', 'solid', 'resilient', 'resilience',
    'confidence', 'confident', 'exceed', 'exceeded', 'surplus', 'inflow',
    'approval', 'approve', 'approved', 'ease', 'eases', 'eased', 'relief',
    'stabilize', 'stable', 'steady', 'strengthen', 'support', 'backed',
}

# Impact categories with historical market sensitivity multipliers
IMPACT_CATEGORIES = {
    'Fed': {'keywords': ['fed', 'federal reserve', 'interest rate', 'powell', 'fomc', 'monetary policy', 'rate cut', 'rate hike'],
            'market_weight': 1.5},
    'Geopolitical': {'keywords': ['war', 'military', 'conflict', 'tariff', 'trade war', 'sanctions', 'invasion', 'nuclear'],
                     'market_weight': 1.3},
    'Earnings': {'keywords': ['earnings', 'profit', 'revenue', 'quarter', 'eps', 'guidance', 'forecast'],
                 'market_weight': 0.8},
    'Inflation': {'keywords': ['cpi', 'inflation', 'price', 'cost of living', 'deflation'],
                  'market_weight': 1.2},
    'Employment': {'keywords': ['jobs', 'unemployment', 'employment', 'nonfarm', 'labor', 'payroll'],
                   'market_weight': 1.0},
    'Technology': {'keywords': ['ai', 'artificial intelligence', 'tech', 'semiconductor', 'chip'],
                   'market_weight': 0.9},
}


def analyze_sentiment(headline: str) -> Dict:
    """
    Lightweight keyword-based sentiment analysis.
    No ML model required — fast and deterministic.

    Returns: {score: float (-1 to 1), label: str, category: str, severity: int (1-10)}
    """
    lower = headline.lower()

    neg_count = sum(1 for w in NEGATIVE_WORDS if w in lower)
    pos_count = sum(1 for w in POSITIVE_WORDS if w in lower)

    total = neg_count + pos_count
    if total == 0:
        score = 0.0
        label = 'neutral'
    else:
        score = (pos_count - neg_count) / total
        score = max(-1.0, min(1.0, score))
        if score > 0.1:
            label = 'positive'
        elif score < -0.1:
            label = 'negative'
        else:
            label = 'neutral'

    # Categorize
    category = 'General'
    market_weight = 1.0
    for cat, info in IMPACT_CATEGORIES.items():
        if any(kw in lower for kw in info['keywords']):
            category = cat
            market_weight = info['market_weight']
            break

    # Severity (1-10)
    high_impact = ['crash', 'crisis', 'war', 'emergency', 'plunge', 'collapse', 'invasion']
    medium_impact = ['decline', 'concern', 'worry', 'fall', 'drop', 'recession']

    base_severity = 5
    if any(w in lower for w in high_impact):
        base_severity = 9
    elif any(w in lower for w in medium_impact):
        base_severity = 7

    severity = min(10, max(1, base_severity + int(abs(score) * 2)))

    # Estimated S&P 500 impact
    estimated_impact = score * market_weight * 0.01  # ~1% per unit sentiment

    return {
        'score': round(score, 3),
        'label': label,
        'category': category,
        'severity': severity,
        'market_weight': market_weight,
        'estimated_sp500_impact': round(estimated_impact * 100, 2),
    }


# ===================================================================================
# SECTOR ANALYSIS (V4)
# ===================================================================================

def analyze_sectors(projections: List[Dict]) -> List[Dict]:
    """
    Aggregate stock projections by sector.

    Args:
        projections: List of project_stock() results

    Returns list of sector summaries with avg return, vol, Sharpe, count.
    """
    sector_data = {}

    for p in projections:
        if p is None:
            continue
        sector = p.get('sector', 'Other')
        if sector not in sector_data:
            sector_data[sector] = {
                'returns': [],
                'vols': [],
                'sharpes': [],
                'tickers': [],
            }

        if '5Y' in p.get('projections', {}):
            sector_data[sector]['returns'].append(p['projections']['5Y']['return_pct'])
        sector_data[sector]['vols'].append(p['historical_vol'])
        sector_data[sector]['sharpes'].append(p['sharpe'])
        sector_data[sector]['tickers'].append(p['ticker'])

    results = []
    for sector, data in sector_data.items():
        if not data['returns']:
            continue
        results.append({
            'sector': sector,
            'avg_5y_return': round(float(np.mean(data['returns'])), 1),
            'median_5y_return': round(float(np.median(data['returns'])), 1),
            'avg_volatility': round(float(np.mean(data['vols'])), 1),
            'avg_sharpe': round(float(np.mean(data['sharpes'])), 2),
            'count': len(data['tickers']),
            'tickers': data['tickers'],
        })

    results.sort(key=lambda x: x['avg_5y_return'], reverse=True)
    return results
