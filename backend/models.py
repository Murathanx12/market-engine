"""Compatibility model exports.

Some runtime scripts still import SQLAlchemy models from ``models``.
The canonical definitions now live in ``database.py``; this shim keeps those
legacy imports working.
"""

from database import (  # noqa: F401
    SessionLocal,
    Base,
    MacroData,
    NewsEvent,
    CrashPrediction,
    StockPrediction,
    MarketRegime,
    SectorRotation,
    AccuracyLog,
    PortfolioHolding,
    CrashEstimate,
    BacktestResult,
    ProjectionCache,
    init_db,
)

# Legacy aliases expected by old modules
Session = SessionLocal
MarketData = StockPrediction
