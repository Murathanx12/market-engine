"""
V6 Scheduler - runs daily data updates.
Fetches macro data, news, detects regime, runs predictions.
"""

import schedule
import time
import logging
from data_fetchers import run_daily_update

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)


def job():
    logger.info("⏰ Scheduled job starting...")
    try:
        run_daily_update()
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