"""
V6 Scheduler - runs daily data updates.
Fetches macro data, news, detects regime, and precomputes cached projections.
"""

import json
import schedule
import time
import logging
from datetime import datetime, timedelta

import data_fetchers as data_fetchers_module

run_daily_update = getattr(data_fetchers_module, 'run_daily_update', None)
from database import SessionLocal, ProjectionCache
from engine import run_multi_scenario_simulation
from services.unified_market_state import unified_market_state

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)


def _upsert_cache(db, cache_key: str, payload: dict, ttl_hours: int = 6):
    expires_at = datetime.now() + timedelta(hours=ttl_hours)
    payload_to_store = dict(payload)
    payload_to_store['cached_at'] = datetime.now().isoformat()

    cache = db.query(ProjectionCache).filter(ProjectionCache.cache_key == cache_key).first()
    if cache:
        cache.payload_json = json.dumps(payload_to_store)
        cache.expires_at = expires_at
    else:
        db.add(ProjectionCache(
            cache_key=cache_key,
            payload_json=json.dumps(payload_to_store),
            expires_at=expires_at,
        ))


def precompute_projection_cache():
    """Precompute heavy Monte Carlo responses used by interactive endpoints."""
    db = SessionLocal()
    try:
        state = unified_market_state.get_market_state()

        current_level = 605.0
        for years in (1, 5):
            result = run_multi_scenario_simulation(
                current_level=current_level,
                regime=str(state.get('regime', 'VOLATILE')).lower(),
                vix_level=float(state.get('vix', 18.0)),
                yield_curve=0.5,
                forecast_years=years,
            )
            result['regime_source'] = 'unified_market_state'
            result['cached'] = True
            _upsert_cache(db, f"sp500_projection:{years}", result, ttl_hours=6)

        db.commit()
        logger.info("✅ Precomputed S&P 500 projection cache (1Y and 5Y)")
    except Exception as exc:
        logger.error("Failed precomputing projection cache: %s", exc, exc_info=True)
        db.rollback()
    finally:
        db.close()


def job():
    logger.info("⏰ Scheduled job starting...")
    try:
        if run_daily_update is None:
            raise RuntimeError("run_daily_update is missing from data_fetchers.py")
        run_daily_update()
        precompute_projection_cache()
    except Exception as e:
        logger.error(f"Scheduled job failed: {e}")


if __name__ == "__main__":
    logger.info("🕐 Market Prediction Engine V6 Scheduler Started")
    logger.info("   Running initial update...")

    # Run immediately on startup
    job()

    # Schedule daily at 6:30 AM UTC (before US market open)
    schedule.every().day.at("06:30").do(job)
    # Also run at market close
    schedule.every().day.at("21:00").do(job)

    logger.info("   Scheduled: 06:30 UTC and 21:00 UTC daily")

    while True:
        schedule.run_pending()
        time.sleep(60)
