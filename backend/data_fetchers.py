import yfinance as yf
from fredapi import Fred
from newsapi import NewsApiClient
from transformers import pipeline
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from database import SessionLocal, MacroData, NewsEvent, MarketRegime
import os
from dotenv import load_dotenv
import requests
import json

load_dotenv()

# Initialize APIs
fred = Fred(api_key=os.getenv("FRED_API_KEY"))
newsapi = NewsApiClient(api_key=os.getenv("NEWS_API_KEY"))

# Initialize FinBERT for sentiment
try:
    sentiment_analyzer = pipeline("sentiment-analysis", model="ProsusAI/finbert")
except:
    print("⚠️ FinBERT not available, using basic sentiment")
    sentiment_analyzer = None

class DataFetcher:
    """Fetches all external data sources"""
    
    def __init__(self):
        self.db = SessionLocal()
    
    def fetch_macro_data(self):
        """Fetch macroeconomic indicators from FRED"""
        print("📊 Fetching macro data...")
        
        indicators = {
            'CPIAUCSL': 'CPI',
            'UNRATE': 'Unemployment',
            'FEDFUNDS': 'Fed_Rate',
            'T10Y2Y': 'Yield_Curve',
            'VIXCLS': 'VIX',
            'DEXUSEU': 'USD_EUR',
            'DGS10': 'Treasury_10Y',
            'DGS2': 'Treasury_2Y'
        }
        
        today = datetime.now()
        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
        
        for fred_code, name in indicators.items():
            try:
                data = fred.get_series(fred_code, start_date=start_date)
                
                for date, value in data.items():
                    # Check if already exists
                    exists = self.db.query(MacroData).filter(
                        MacroData.date == date,
                        MacroData.indicator == name
                    ).first()
                    
                    if not exists:
                        macro = MacroData(
                            date=date,
                            indicator=name,
                            value=float(value) if not pd.isna(value) else None
                        )
                        self.db.add(macro)
                
                print(f"✅ Fetched {name}")
            except Exception as e:
                print(f"❌ Error fetching {name}: {e}")
        
        self.db.commit()
        print("✅ Macro data updated!")
    
    def fetch_news(self, days_back=7):
        """Fetch and analyze news"""
        print("📰 Fetching news...")
        
        from_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
        
        queries = [
            'stock market crash',
            'federal reserve interest rates',
            'recession economy',
            'S&P 500',
            'inflation CPI',
            'unemployment jobs report'
        ]
        
        all_articles = []
        
        for query in queries:
            try:
                response = newsapi.get_everything(
                    q=query,
                    from_param=from_date,
                    language='en',
                    sort_by='relevancy',
                    page_size=20
                )
                all_articles.extend(response.get('articles', []))
            except Exception as e:
                print(f"❌ Error fetching news for '{query}': {e}")
        
        # Remove duplicates
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            if article['url'] not in seen_urls:
                seen_urls.add(article['url'])
                unique_articles.append(article)
        
        print(f"📄 Processing {len(unique_articles)} articles...")
        
        for article in unique_articles:
            try:
                headline = article['title']
                
                # Sentiment analysis
                if sentiment_analyzer:
                    sentiment = sentiment_analyzer(headline[:512])[0]
                    label = sentiment['label']
                    score = sentiment['score']
                    
                    # Convert to -1 to 1 scale
                    if label == 'negative':
                        sentiment_score = -score
                    elif label == 'positive':
                        sentiment_score = score
                    else:
                        sentiment_score = 0
                else:
                    # Basic sentiment
                    negative_words = ['crash', 'recession', 'decline', 'fall', 'drop', 'crisis', 'fear']
                    positive_words = ['surge', 'rally', 'gain', 'rise', 'boom', 'growth']
                    
                    headline_lower = headline.lower()
                    neg_count = sum(1 for word in negative_words if word in headline_lower)
                    pos_count = sum(1 for word in positive_words if word in headline_lower)
                    
                    if neg_count > pos_count:
                        sentiment_score = -0.5
                        label = 'negative'
                    elif pos_count > neg_count:
                        sentiment_score = 0.5
                        label = 'positive'
                    else:
                        sentiment_score = 0
                        label = 'neutral'
                
                # Categorize impact
                impact_category = self._categorize_impact(headline)
                severity = self._calculate_severity(headline, sentiment_score)
                
                # Check if exists
                exists = self.db.query(NewsEvent).filter(
                    NewsEvent.url == article['url']
                ).first()
                
                if not exists:
                    news = NewsEvent(
                        date=datetime.strptime(article['publishedAt'], '%Y-%m-%dT%H:%M:%SZ'),
                        headline=headline,
                        source=article['source']['name'],
                        url=article['url'],
                        sentiment_score=sentiment_score,
                        sentiment_label=label,
                        impact_category=impact_category,
                        severity=severity
                    )
                    self.db.add(news)
            
            except Exception as e:
                print(f"❌ Error processing article: {e}")
        
        self.db.commit()
        print("✅ News updated!")
    
    def _categorize_impact(self, headline):
        """Categorize news by market impact"""
        headline_lower = headline.lower()
        
        if any(word in headline_lower for word in ['fed', 'federal reserve', 'interest rate', 'powell', 'fomc']):
            return 'Fed'
        elif any(word in headline_lower for word in ['war', 'military', 'conflict', 'tariff', 'trade']):
            return 'Geopolitical'
        elif any(word in headline_lower for word in ['earnings', 'profit', 'revenue', 'quarter']):
            return 'Earnings'
        elif any(word in headline_lower for word in ['cpi', 'inflation', 'price']):
            return 'Inflation'
        elif any(word in headline_lower for word in ['jobs', 'unemployment', 'employment']):
            return 'Employment'
        else:
            return 'General'
    
    def _calculate_severity(self, headline, sentiment_score):
        """Calculate news severity 1-10"""
        headline_lower = headline.lower()
        
        # High severity keywords
        high_impact = ['crash', 'crisis', 'war', 'emergency', 'plunge', 'collapse']
        medium_impact = ['decline', 'concern', 'worry', 'fall', 'drop']
        
        base_severity = 5
        
        if any(word in headline_lower for word in high_impact):
            base_severity = 9
        elif any(word in headline_lower for word in medium_impact):
            base_severity = 7
        
        # Adjust by sentiment
        severity = base_severity + int(abs(sentiment_score) * 2)
        
        return min(max(severity, 1), 10)
    
    def detect_regime(self):
        """Detect current market regime"""
        print("🎯 Detecting market regime...")
        
        # Get latest macro data
        vix = self._get_latest_indicator('VIX')
        inflation = self._get_latest_indicator('CPI')
        unemployment = self._get_latest_indicator('Unemployment')
        fed_rate = self._get_latest_indicator('Fed_Rate')
        yield_curve = self._get_latest_indicator('Yield_Curve')
        
        # Regime detection logic
        if vix and vix > 35:
            regime = 'crisis'
            confidence = 0.9
        elif vix and vix > 25:
            regime = 'volatile'
            confidence = 0.8
        elif unemployment and unemployment > 6:
            regime = 'bear'
            confidence = 0.7
        elif inflation and inflation > 4:
            regime = 'bear'
            confidence = 0.6
        elif yield_curve and yield_curve < -0.5:
            regime = 'bear'
            confidence = 0.7
        else:
            regime = 'bull'
            confidence = 0.6
        
        # Save to database
        market_regime = MarketRegime(
            date=datetime.now(),
            regime=regime,
            vix=vix,
            inflation=inflation,
            unemployment=unemployment,
            fed_rate=fed_rate,
            yield_curve=yield_curve,
            confidence=confidence
        )
        self.db.add(market_regime)
        self.db.commit()
        
        print(f"✅ Regime: {regime} (confidence: {confidence:.0%})")
        return regime
    
    def _get_latest_indicator(self, name):
        """Get most recent value for an indicator"""
        result = self.db.query(MacroData).filter(
            MacroData.indicator == name
        ).order_by(MacroData.date.desc()).first()
        
        return result.value if result else None
    
    def fetch_stock_data(self, ticker, period='2y'):
        """Fetch stock price data"""
        try:
            stock = yf.Ticker(ticker)
            data = stock.history(period=period)
            return data
        except Exception as e:
            print(f"❌ Error fetching {ticker}: {e}")
            return None
    
    def get_analyst_target(self, ticker):
        """Get analyst price target from Yahoo Finance"""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            return info.get('targetMeanPrice', None)
        except:
            return None

def run_daily_update():
    """Main function to run daily data updates"""
    print("\n" + "="*50)
    print("🚀 Starting Daily Data Update")
    print("="*50 + "\n")
    
    fetcher = DataFetcher()
    
    # Fetch all data
    fetcher.fetch_macro_data()
    fetcher.fetch_news(days_back=7)
    fetcher.detect_regime()
    
    print("\n" + "="*50)
    print("✅ Daily Update Complete!")
    print("="*50 + "\n")

if __name__ == "__main__":
    run_daily_update()