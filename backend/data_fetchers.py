"""
Data fetchers for Market Prediction Engine V6.
Removed FinBERT dependency - uses lightweight keyword sentiment from engine.py.
Added yfinance fallback for macro data when FRED API key is unavailable.
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from database import (
    SessionLocal, MacroData, NewsEvent, MarketRegime,
    CrashPrediction, StockPrediction, CrashEstimate, BacktestResult
)
from engine import (
    analyze_sentiment, run_multi_scenario_simulation,
    project_stock, estimate_crash_timeline, run_backtest, SECTOR_MAP
)
from services.unified_market_state import unified_market_state
import os
from dotenv import load_dotenv
import requests
import json
import logging

load_dotenv()
logger = logging.getLogger(__name__)


class DataFetcher:
    """Fetches all external data sources."""

    def __init__(self):
        self.db = SessionLocal()
        self.fred_key = os.getenv("FRED_API_KEY")
        self.news_key = os.getenv("NEWS_API_KEY")

    def close(self):
        self.db.close()

    # ─── Stock Data ────────────────────────────────────────────────

    def fetch_stock_data(self, ticker: str, period: str = '2y') -> pd.DataFrame:
        """Fetch stock price data via yfinance."""
        try:
            stock = yf.Ticker(ticker)
            data = stock.history(period=period)
            if data is not None and len(data) > 0:
                return data
        except Exception as e:
            logger.warning(f"Error fetching {ticker}: {e}")
        return None

    def get_analyst_target(self, ticker: str) -> float:
        """Get analyst consensus price target."""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            return info.get('targetMeanPrice', None)
        except Exception:
            return None

    def get_stock_info(self, ticker: str) -> dict:
        """Get comprehensive stock info."""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            return {
                'name': info.get('shortName', ticker),
                'sector': info.get('sector', SECTOR_MAP.get(ticker, 'Other')),
                'market_cap': info.get('marketCap', 0),
                'analyst_target': info.get('targetMeanPrice'),
                'recommendation': info.get('recommendationKey', 'none'),
                'pe_ratio': info.get('trailingPE'),
                'forward_pe': info.get('forwardPE'),
                'dividend_yield': info.get('dividendYield'),
                'beta': info.get('beta'),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh'),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow'),
            }
        except Exception as e:
            logger.warning(f"Error getting info for {ticker}: {e}")
            return {'name': ticker, 'sector': SECTOR_MAP.get(ticker, 'Other')}

    # ─── Macro Data ────────────────────────────────────────────────

    def fetch_macro_data(self):
        """Fetch macro indicators. Tries FRED first, falls back to yfinance proxies."""
        print("📊 Fetching macro data...")

        if self.fred_key:
            self._fetch_macro_from_fred()
        else:
            print("  ⚠️ No FRED_API_KEY, using yfinance proxies")
            self._fetch_macro_from_yfinance()

        print("✅ Macro data updated!")

    def _fetch_macro_from_fred(self):
        """Fetch from FRED API."""
        from fredapi import Fred
        fred = Fred(api_key=self.fred_key)

        indicators = {
            'CPIAUCSL': 'CPI',
            'UNRATE': 'Unemployment',
            'FEDFUNDS': 'Fed_Rate',
            'T10Y2Y': 'Yield_Curve',
            'VIXCLS': 'VIX',
            'DGS10': 'Treasury_10Y',
            'DGS2': 'Treasury_2Y',
        }

        today = datetime.now()
        default_start_date = (today - timedelta(days=60)).strftime('%Y-%m-%d')

        for fred_code, name in indicators.items():
            try:
                start_date = default_start_date
                if fred_code == 'CPIAUCSL':
                    # Need at least 13 months for YoY change.
                    start_date = (today - timedelta(days=450)).strftime('%Y-%m-%d')

                data = fred.get_series(fred_code, start_date=start_date)

                if fred_code == 'CPIAUCSL':
                    data = data.pct_change(12) * 100
                    data = data.dropna()

                for date, value in data.items():
                    if pd.isna(value):
                        continue

                    exists = self.db.query(MacroData).filter(
                        MacroData.date == date,
                        MacroData.indicator == name,
                    ).first()
                    if not exists:
                        self.db.add(MacroData(
                            date=date, indicator=name, value=float(value)
                        ))
                print(f"  ✅ {name}")
            except Exception as e:
                print(f"  ❌ {name}: {e}")

        self.db.commit()

    def _fetch_macro_from_yfinance(self):
        """Fallback: use yfinance ETF proxies for macro indicators."""
        proxies = {
            '^VIX': 'VIX',
            '^TNX': 'Treasury_10Y',   # 10Y yield (×10 to get %)
        }
        now = datetime.now()

        for symbol, name in proxies.items():
            try:
                data = yf.Ticker(symbol).history(period='3mo')
                if data is not None and len(data) > 0:
                    latest = data.iloc[-1]
                    value = float(latest['Close'])
                    if name == 'Treasury_10Y':
                        value = value  # Already in % from ^TNX

                    exists = self.db.query(MacroData).filter(
                        MacroData.date >= now - timedelta(days=1),
                        MacroData.indicator == name,
                    ).first()
                    if not exists:
                        self.db.add(MacroData(
                            date=now, indicator=name, value=value
                        ))
                    print(f"  ✅ {name} = {value:.2f}")
            except Exception as e:
                print(f"  ❌ {name}: {e}")

        # Yield curve proxy (10Y - 2Y)
        try:
            t10 = yf.Ticker('^TNX').history(period='5d')
            t2 = yf.Ticker('2YY=F').history(period='5d')
            if t10 is not None and len(t10) > 0:
                curve_val = float(t10.iloc[-1]['Close'])
                if t2 is not None and len(t2) > 0:
                    curve_val -= float(t2.iloc[-1]['Close'])
                else:
                    curve_val -= 4.0  # Rough estimate

                exists = self.db.query(MacroData).filter(
                    MacroData.date >= now - timedelta(days=1),
                    MacroData.indicator == 'Yield_Curve',
                ).first()
                if not exists:
                    self.db.add(MacroData(
                        date=now, indicator='Yield_Curve', value=curve_val
                    ))
                print(f"  ✅ Yield_Curve = {curve_val:.2f}")
        except Exception as e:
            print(f"  ❌ Yield_Curve: {e}")

        self.db.commit()

    # ─── News Data ─────────────────────────────────────────────────

    def fetch_news(self, days_back: int = 7):
        """Fetch and analyze news using lightweight sentiment."""
        print("📰 Fetching news...")

        if not self.news_key:
            print("  ⚠️ No NEWS_API_KEY, skipping news fetch")
            return

        from newsapi import NewsApiClient
        newsapi = NewsApiClient(api_key=self.news_key)

        from_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')

        queries = [
            'stock market',
            'federal reserve interest rates',
            'S&P 500',
            'inflation economy',
            'technology earnings',
        ]

        all_articles = []
        for query in queries:
            try:
                response = newsapi.get_everything(
                    q=query, from_param=from_date, language='en',
                    sort_by='relevancy', page_size=15,
                )
                all_articles.extend(response.get('articles', []))
            except Exception as e:
                print(f"  ❌ Query '{query}': {e}")

        # Deduplicate
        seen = set()
        unique = []
        for a in all_articles:
            if a.get('url') and a['url'] not in seen:
                seen.add(a['url'])
                unique.append(a)

        print(f"  📄 Processing {len(unique)} articles...")

        for article in unique:
            try:
                headline = article.get('title', '')
                if not headline:
                    continue

                # Lightweight sentiment (from engine.py)
                sentiment = analyze_sentiment(headline)

                exists = self.db.query(NewsEvent).filter(
                    NewsEvent.url == article['url']
                ).first()

                if not exists:
                    pub_date = article.get('publishedAt', '')
                    try:
                        date = datetime.strptime(pub_date, '%Y-%m-%dT%H:%M:%SZ')
                    except (ValueError, TypeError):
                        date = datetime.now()

                    self.db.add(NewsEvent(
                        date=date,
                        headline=headline,
                        source=article.get('source', {}).get('name', 'Unknown'),
                        url=article['url'],
                        sentiment_score=sentiment['score'],
                        sentiment_label=sentiment['label'],
                        impact_category=sentiment['category'],
                        severity=sentiment['severity'],
                        estimated_impact=sentiment['estimated_sp500_impact'],
                    ))
            except Exception as e:
                logger.warning(f"Error processing article: {e}")

        self.db.commit()
        print("✅ News updated!")

    # ─── Regime Detection ──────────────────────────────────────────

    def detect_and_save_regime(self):
        """Detect market regime and save to DB."""
        print("🎯 Detecting market regime...")

        vix = self._get_latest_indicator('VIX')
        inflation = self._get_latest_indicator('CPI')
        unemployment = self._get_latest_indicator('Unemployment')
        fed_rate = self._get_latest_indicator('Fed_Rate')
        yield_curve = self._get_latest_indicator('Yield_Curve')

        state = unified_market_state.get_market_state()
        regime = state.get('regime', 'VOLATILE').lower()
        confidence = float(state.get('confidence', 0.5))

        self.db.add(MarketRegime(
            date=datetime.now(),
            regime=regime,
            vix=vix,
            inflation=inflation,
            unemployment=unemployment,
            fed_rate=fed_rate,
            yield_curve=yield_curve,
            confidence=confidence,
        ))
        self.db.commit()

        print(f"✅ Regime: {regime} (confidence: {confidence:.0%})")
        return regime, confidence

    def _get_latest_indicator(self, name: str):
        """Get most recent value for a macro indicator."""
        result = self.db.query(MacroData).filter(
            MacroData.indicator == name
        ).order_by(MacroData.date.desc()).first()
        return result.value if result else None

    # ─── Run Predictions ───────────────────────────────────────────

    def run_crash_prediction(self, ticker: str = 'SPY'):
        """Run crash prediction for a ticker using the V6 engine."""
        print(f"🔮 Running crash prediction for {ticker}...")

        # Get current data
        data = self.fetch_stock_data(ticker, period='1d')
        if data is None or len(data) == 0:
            print(f"  ❌ No price data for {ticker}")
            return None

        current_price = float(data['Close'].iloc[-1])

        # Get macro state
        vix = self._get_latest_indicator('VIX') or 18.0
        yield_curve = self._get_latest_indicator('Yield_Curve') or 0.5

        regime_data = self.db.query(MarketRegime).order_by(
            MarketRegime.date.desc()
        ).first()
        regime = regime_data.regime if regime_data else 'bull'

        # Run simulation
        result = run_multi_scenario_simulation(
            current_level=current_price,
            regime=regime,
            risk_score=0.0,
            vix_level=vix,
            yield_curve=yield_curve,
            forecast_years=1,
            n_sims=3000,
        )

        crash_prob_1y = result['crash_probabilities'].get('1y', 0) / 100
        risk_level = 'HIGH' if crash_prob_1y > 0.3 else 'MEDIUM' if crash_prob_1y > 0.15 else 'LOW'

        # Top factors
        factors = [
            {'feature': 'VIX', 'impact': round(max(0, (vix - 20) / 100), 3)},
            {'feature': 'Yield Curve', 'impact': round(max(0, -yield_curve * 0.1), 3)},
            {'feature': 'Volatility', 'impact': round(result['risk_metrics']['max_drawdown_pct'] / -100, 3)},
        ]

        explanation = (
            f"Based on {result['total_simulations']:,} Monte Carlo simulations across "
            f"{len(result['scenarios'])} scenarios, the model estimates a "
            f"{crash_prob_1y*100:.1f}% probability of a ≥20% drawdown in the next 12 months. "
            f"Current regime: {regime.title()}. VIX: {vix:.1f}. "
            f"Expected annual return: {result['final_stats']['annual_return_pct']}%."
        )

        # Save
        pred = CrashPrediction(
            prediction_date=datetime.now(),
            ticker=ticker,
            crash_probability=crash_prob_1y,
            horizon_days=252,
            target_date=datetime.now() + timedelta(days=252),
            risk_level=risk_level,
            explanation=explanation,
            top_factors=json.dumps(factors),
        )
        self.db.add(pred)
        self.db.commit()

        print(f"  ✅ {ticker}: {crash_prob_1y*100:.1f}% crash probability ({risk_level})")
        return {
            'crash_probability': crash_prob_1y,
            'risk_level': risk_level,
            'explanation': explanation,
            'top_factors': factors,
        }

    def run_stock_projection(self, ticker: str):
        """Run full stock projection using V6 engine."""
        print(f"📈 Projecting {ticker}...")

        data = self.fetch_stock_data(ticker, period='1y')
        if data is None or len(data) == 0:
            return None

        current_price = float(data['Close'].iloc[-1])
        returns = data['Close'].pct_change().dropna()
        historical_vol = float(returns.std() * np.sqrt(252))
        analyst_target = self.get_analyst_target(ticker)

        regime_data = self.db.query(MarketRegime).order_by(
            MarketRegime.date.desc()
        ).first()
        regime = regime_data.regime if regime_data else 'bull'

        result = project_stock(
            ticker=ticker,
            current_price=current_price,
            analyst_target=analyst_target,
            historical_vol=historical_vol,
            regime=regime,
            n_sims=2000,
        )

        if result is None:
            return None

        # Save to DB
        proj = result['projections']
        pred = StockPrediction(
            prediction_date=datetime.now(),
            ticker=ticker,
            current_price=current_price,
            predicted_price_1m=proj['1M']['mean'],
            predicted_price_6m=proj['6M']['mean'],
            predicted_price_12m=proj['1Y']['mean'],
            predicted_price_5y=proj['5Y']['mean'],
            analyst_target=analyst_target,
            our_confidence=0.7,
            volatility=result['historical_vol'],
            sharpe=result['sharpe'],
            sector=result['sector'],
            projections_json=json.dumps(proj),
        )
        self.db.add(pred)
        self.db.commit()

        print(f"  ✅ {ticker}: ${current_price:.2f} → ${proj['5Y']['mean']:.2f} (5Y)")
        return result


# ===================================================================================
# DAILY UPDATE
# ===================================================================================

def run_daily_update():
    """Main daily data update pipeline."""
    print("\n" + "=" * 60)
    print("🚀 Starting Daily Data Update (V6)")
    print("=" * 60 + "\n")

    fetcher = DataFetcher()

    try:
        # 1. Macro data
        fetcher.fetch_macro_data()

        # 2. News
        fetcher.fetch_news(days_back=3)

        # 3. Regime detection
        fetcher.detect_and_save_regime()

        # 4. Core predictions
        for ticker in ['SPY', 'QQQ']:
            try:
                fetcher.run_crash_prediction(ticker)
            except Exception as e:
                print(f"  ❌ Crash prediction for {ticker}: {e}")

        print("\n" + "=" * 60)
        print("✅ Daily Update Complete!")
        print("=" * 60 + "\n")
    except Exception as e:
        print(f"\n❌ Daily update error: {e}")
    finally:
        fetcher.close()


if __name__ == "__main__":
    run_daily_update()
