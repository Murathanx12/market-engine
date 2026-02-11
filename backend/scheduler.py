import schedule
import time
from data_fetchers import run_daily_update
from models import CrashPredictor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def daily_job():
    """Run daily at 6 AM"""
    logger.info("Starting daily update job...")
    try:
        # Fetch new data
        run_daily_update()
        
        # Retrain crash model weekly (on Sundays)
        import datetime
        if datetime.datetime.now().weekday() == 6:  # Sunday
            logger.info("Sunday - Retraining crash model...")
            predictor = CrashPredictor()
            predictor.train('SPY')
        
        logger.info("Daily update complete!")
    except Exception as e:
        logger.error(f"Daily update failed: {e}")

# Schedule the job
schedule.every().day.at("06:00").do(daily_job)

logger.info("Scheduler started. Running daily at 6:00 AM...")

# Run immediately on start
daily_job()

# Keep running
while True:
    schedule.run_pending()
    time.sleep(60)  # Check every minute