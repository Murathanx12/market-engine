from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./market_engine.db")

# SQLite needs connect_args for thread safety
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ===================================================================================
# MODELS
# ===================================================================================

class MacroData(Base):
    __tablename__ = "macro_data"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, index=True)
    indicator = Column(String, index=True)
    value = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class NewsEvent(Base):
    __tablename__ = "news_events"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, index=True)
    headline = Column(Text)
    source = Column(String)
    url = Column(Text)
    sentiment_score = Column(Float)       # -1 to 1
    sentiment_label = Column(String)      # positive/negative/neutral
    impact_category = Column(String)      # Fed/Geopolitical/Earnings/etc
    severity = Column(Integer)            # 1-10
    estimated_impact = Column(Float, nullable=True)  # estimated S&P impact %
    created_at = Column(DateTime, default=datetime.utcnow)


class CrashPrediction(Base):
    __tablename__ = "crash_predictions"

    id = Column(Integer, primary_key=True, index=True)
    prediction_date = Column(DateTime, index=True)
    ticker = Column(String, index=True)
    crash_probability = Column(Float)
    horizon_days = Column(Integer)
    target_date = Column(DateTime)
    risk_level = Column(String, nullable=True)
    actual_crash = Column(Boolean, nullable=True)
    was_correct = Column(Boolean, nullable=True)
    explanation = Column(Text)
    top_factors = Column(Text)            # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)


class StockPrediction(Base):
    __tablename__ = "stock_predictions"

    id = Column(Integer, primary_key=True, index=True)
    prediction_date = Column(DateTime, index=True)
    ticker = Column(String, index=True)
    current_price = Column(Float)
    predicted_price_1m = Column(Float)
    predicted_price_6m = Column(Float)
    predicted_price_12m = Column(Float)
    predicted_price_5y = Column(Float)
    analyst_target = Column(Float, nullable=True)
    our_confidence = Column(Float)
    volatility = Column(Float, nullable=True)
    sharpe = Column(Float, nullable=True)
    sector = Column(String, nullable=True)
    projections_json = Column(Text, nullable=True)     # full projection detail
    created_at = Column(DateTime, default=datetime.utcnow)


class AccuracyLog(Base):
    __tablename__ = "accuracy_log"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_date = Column(DateTime, index=True)
    model_type = Column(String)
    ticker = Column(String)
    predicted_value = Column(Float)
    actual_value = Column(Float)
    error_percentage = Column(Float)
    was_within_confidence = Column(Boolean)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class MarketRegime(Base):
    __tablename__ = "market_regimes"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, index=True)
    regime = Column(String)
    vix = Column(Float)
    inflation = Column(Float)
    unemployment = Column(Float)
    fed_rate = Column(Float, nullable=True)
    yield_curve = Column(Float)
    confidence = Column(Float)
    risk_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SectorRotation(Base):
    __tablename__ = "sector_rotations"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, index=True)
    regime = Column(String)
    sectors_to_buy = Column(Text)
    sectors_to_sell = Column(Text)
    reasoning = Column(Text)
    expected_duration_days = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)


# ===================================================================================
# V6 NEW TABLES
# ===================================================================================

class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    shares = Column(Float)
    purchase_price = Column(Float)
    purchase_date = Column(DateTime)
    current_price = Column(Float, nullable=True)
    projected_5y_price = Column(Float, nullable=True)
    sector = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CrashEstimate(Base):
    __tablename__ = "crash_estimates"

    id = Column(Integer, primary_key=True, index=True)
    estimation_date = Column(DateTime, index=True)
    regime = Column(String)
    risk_score = Column(Float)
    vix = Column(Float, nullable=True)
    yield_curve = Column(Float, nullable=True)
    crash_prob_1y = Column(Float)
    crash_prob_5y = Column(Float)
    peak_risk_month = Column(Integer)
    data_json = Column(Text)
    factors_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, index=True)
    run_date = Column(DateTime, index=True)
    start_year = Column(Integer)
    n_predictions = Column(Integer)
    mape = Column(Float)
    coverage_90 = Column(Float)
    data_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


# ===================================================================================
# DB INIT
# ===================================================================================

def init_db():
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized with all V6 tables!")


if __name__ == "__main__":
    init_db()