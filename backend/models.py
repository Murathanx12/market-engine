import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
import xgboost as xgb
from datetime import datetime, timedelta
import joblib
import shap
from database import SessionLocal, MacroData, NewsEvent, CrashPrediction, StockPrediction, AccuracyLog, MarketRegime
from data_fetchers import DataFetcher
import json

class CrashPredictor:
    """Predicts market crashes using XGBoost"""
    
    def __init__(self):
        self.model = None
        self.feature_names = None
        self.db = SessionLocal()
        self.fetcher = DataFetcher()
    
    def prepare_features(self, ticker='SPY', days_back=730):
        """Prepare features for crash prediction"""
        print(f"🔧 Preparing features for {ticker}...")
        
        # Get price data
        price_data = self.fetcher.fetch_stock_data(ticker, period='2y')
        if price_data is None or len(price_data) < 100:
            return None, None
        
        df = pd.DataFrame()
        df['date'] = price_data.index
        df['close'] = price_data['Close'].values
        df['volume'] = price_data['Volume'].values
        
        # Technical indicators
        df['returns'] = df['close'].pct_change()
        df['rsi_14'] = self._calculate_rsi(df['close'], 14)
        df['bb_width'] = self._bollinger_bandwidth(df['close'], 20)
        df['volume_spike'] = df['volume'] / df['volume'].rolling(20).mean()
        df['volatility_20d'] = df['returns'].rolling(20).std()
        df['momentum_5d'] = df['close'] - df['close'].shift(5)
        df['ma_50'] = df['close'].rolling(50).mean()
        df['ma_200'] = df['close'].rolling(200).mean()
        df['ma_cross'] = (df['ma_50'] > df['ma_200']).astype(int)
        
        # Macro data
        for indicator in ['VIX', 'CPI', 'Unemployment', 'Fed_Rate', 'Yield_Curve']:
            df[indicator] = self._get_macro_timeseries(indicator, df['date'])
        
        # News sentiment
        df['news_sentiment_7d'] = self._get_news_sentiment(df['date'], window=7)
        df['negative_news_count'] = self._get_negative_news_count(df['date'], window=7)
        
        # Target: Crash in next 20 days (>5% drop)
        df['future_return_20d'] = df['close'].shift(-20) / df['close'] - 1
        df['crash_20d'] = (df['future_return_20d'] < -0.05).astype(int)
        
        # Drop NaN
        df = df.dropna()
        
        # Features
        feature_cols = [
            'rsi_14', 'bb_width', 'volume_spike', 'volatility_20d',
            'momentum_5d', 'ma_cross', 'VIX', 'Yield_Curve',
            'news_sentiment_7d', 'negative_news_count'
        ]
        
        X = df[feature_cols]
        y = df['crash_20d']
        
        self.feature_names = feature_cols
        
        print(f"✅ Prepared {len(X)} samples with {len(feature_cols)} features")
        return X, y
    
    def train(self, ticker='SPY'):
        """Train crash prediction model"""
        print("🧠 Training crash predictor...")
        
        X, y = self.prepare_features(ticker)
        if X is None:
            print("❌ Feature preparation failed")
            return False
        
        # Train/test split (time series)
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # XGBoost model
        self.model = xgb.XGBClassifier(
            objective='binary:logistic',
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        train_acc = self.model.score(X_train, y_train)
        test_acc = self.model.score(X_test, y_test)
        
        print(f"✅ Training accuracy: {train_acc:.2%}")
        print(f"✅ Testing accuracy: {test_acc:.2%}")
        
        # Save model
        joblib.dump(self.model, 'models/crash_predictor.pkl')
        joblib.dump(self.feature_names, 'models/crash_features.pkl')
        
        return True
    
    def predict_crash(self, ticker='SPY'):
        """Predict crash probability for next 20 days"""
        
        # Load model if not in memory
        if self.model is None:
            try:
                self.model = joblib.load('models/crash_predictor.pkl')
                self.feature_names = joblib.load('models/crash_features.pkl')
            except:
                print("❌ Model not found. Training new model...")
                self.train(ticker)
        
        # Get latest features
        X, _ = self.prepare_features(ticker, days_back=100)
        if X is None:
            return None
        
        latest_features = X.iloc[[-1]]
        
        # Predict
        crash_prob = self.model.predict_proba(latest_features)[0][1]
        
        # Explain prediction using SHAP
        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(latest_features)
        
        # Get top contributing factors
        feature_importance = list(zip(
            self.feature_names,
            shap_values[0] if isinstance(shap_values, list) else shap_values
        ))
        feature_importance.sort(key=lambda x: abs(x[1]), reverse=True)
        top_factors = feature_importance[:3]
        
        # Generate explanation
        explanation = self._generate_explanation(crash_prob, top_factors, latest_features)
        
        # Save prediction
        prediction = CrashPrediction(
            prediction_date=datetime.now(),
            ticker=ticker,
            crash_probability=float(crash_prob),
            horizon_days=20,
            target_date=datetime.now() + timedelta(days=20),
            explanation=explanation,
            top_factors=json.dumps([
                {'feature': f, 'impact': float(i)} for f, i in top_factors
            ])
        )
        self.db.add(prediction)
        self.db.commit()
        
        return {
            'crash_probability': float(crash_prob),
            'explanation': explanation,
            'top_factors': [{'feature': f, 'impact': float(i)} for f, i in top_factors],
            'risk_level': 'HIGH' if crash_prob > 0.6 else 'MEDIUM' if crash_prob > 0.3 else 'LOW'
        }
    
    def _generate_explanation(self, prob, factors, features):
        """Generate human-readable explanation"""
        
        risk_level = "HIGH" if prob > 0.6 else "MEDIUM" if prob > 0.3 else "LOW"
        
        explanation = f"Crash Risk: {prob:.1%} ({risk_level})\n\n"
        explanation += "Primary Risk Factors:\n"
        
        for i, (feature, impact) in enumerate(factors, 1):
            value = features[feature].values[0]
            
            if feature == 'VIX':
                explanation += f"{i}. VIX at {value:.1f} - {'HIGH fear' if value > 25 else 'Elevated volatility' if value > 20 else 'Normal'}\n"
            elif feature == 'news_sentiment_7d':
                explanation += f"{i}. News sentiment {value:.2f} - {'Very negative' if value < -0.3 else 'Negative' if value < 0 else 'Neutral/Positive'}\n"
            elif feature == 'Yield_Curve':
                explanation += f"{i}. Yield curve at {value:.2f} - {'Inverted (recession signal)' if value < 0 else 'Normal'}\n"
            elif feature == 'volatility_20d':
                explanation += f"{i}. 20-day volatility {value:.3f} - {'High' if value > 0.02 else 'Moderate' if value > 0.01 else 'Low'}\n"
            else:
                explanation += f"{i}. {feature}: {value:.2f}\n"
        
        return explanation
    
    def _calculate_rsi(self, prices, period=14):
        """Calculate RSI"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def _bollinger_bandwidth(self, prices, period=20):
        """Calculate Bollinger Band width"""
        ma = prices.rolling(period).mean()
        std = prices.rolling(period).std()
        upper = ma + (std * 2)
        lower = ma - (std * 2)
        bandwidth = (upper - lower) / ma
        return bandwidth
    
    def _get_macro_timeseries(self, indicator, dates):
        """Get macro data aligned with dates"""
        values = []
        for date in dates:
            result = self.db.query(MacroData).filter(
                MacroData.indicator == indicator,
                MacroData.date <= date
            ).order_by(MacroData.date.desc()).first()
        
            values.append(result.value if result else None)
    
        # Forward fill NaN - Compatible with pandas 2.0+
        series = pd.Series(values)
        series = series.ffill()
        # Fill any remaining NaN with 0
        series = series.fillna(0)
        return series

    def _get_news_sentiment(self, dates, window=7):
        """Get average news sentiment for date range"""
        sentiments = []
        for date in dates:
            start_date = date - timedelta(days=window)
        
            news = self.db.query(NewsEvent).filter(
                NewsEvent.date >= start_date,
                NewsEvent.date <= date
            ).all()
        
            if news:
                avg_sentiment = np.mean([n.sentiment_score for n in news])
            else:
                avg_sentiment = 0
        
            sentiments.append(avg_sentiment)
    
        return pd.Series(sentiments)

    def _get_negative_news_count(self, dates, window=7):
        """Count negative news articles"""
        counts = []
        for date in dates:
            start_date = date - timedelta(days=window)

            count = self.db.query(NewsEvent).filter(
                NewsEvent.date >= start_date,
                NewsEvent.date <= date,
                NewsEvent.sentiment_score < -0.3
            ).count()
        
            counts.append(count)

        return pd.Series(counts)


class StockProjector:
    """Projects stock prices for multiple time horizons"""
    
    def __init__(self):
        self.model = None
        self.db = SessionLocal()
        self.fetcher = DataFetcher()
    
    def project_stock(self, ticker, horizons=[30, 180, 365, 1825]):
        """
        Project stock price for multiple horizons
        horizons in days: [1m, 6m, 12m, 5y]
        """
        print(f"📈 Projecting {ticker}...")
        
        # Get current price
        data = self.fetcher.fetch_stock_data(ticker, period='1d')
        if data is None or len(data) == 0:
            return None
        
        current_price = float(data['Close'].iloc[-1])
        
        # Get analyst target
        analyst_target = self.fetcher.get_analyst_target(ticker)
        
        # Get historical volatility
        hist_data = self.fetcher.fetch_stock_data(ticker, period='1y')
        returns = hist_data['Close'].pct_change()
        volatility = returns.std() * np.sqrt(252)  # Annualized
        
        # Get regime
        regime_data = self.db.query(MarketRegime).order_by(
            MarketRegime.date.desc()
        ).first()
        
        regime = regime_data.regime if regime_data else 'bull'
        regime_multipliers = {
            'bull': 1.0,
            'bear': 0.6,
            'volatile': 0.8,
            'crisis': 0.5
        }
        
        # Calculate projections
        projections = {}
        
        for days in horizons:
            years = days / 365
            
            if analyst_target and days <= 365:
                # Use analyst target for short term
                base_return = (analyst_target / current_price - 1) * 0.7  # 30% haircut
            else:
                # Use historical average for long term
                base_return = 0.08 * years  # 8% annualized base
            
            # Apply regime adjustment
            adjusted_return = base_return * regime_multipliers[regime]
            
            # Add volatility noise
            noise = np.random.normal(0, volatility * np.sqrt(years))
            final_return = adjusted_return + noise
            
            # Cap extremes
            final_return = max(min(final_return, 3.0), -0.8)  # +300% to -80%
            
            projected_price = current_price * (1 + final_return)
            projections[f'{days}d'] = float(projected_price)
        
        # Save prediction
        prediction = StockPrediction(
            prediction_date=datetime.now(),
            ticker=ticker,
            current_price=current_price,
            predicted_price_1m=projections.get('30d'),
            predicted_price_6m=projections.get('180d'),
            predicted_price_12m=projections.get('365d'),
            predicted_price_5y=projections.get('1825d'),
            analyst_target=analyst_target,
            our_confidence=0.6  # Base confidence
        )
        self.db.add(prediction)
        self.db.commit()
        
        return {
            'ticker': ticker,
            'current_price': current_price,
            'projections': projections,
            'analyst_target': analyst_target,
            'volatility': float(volatility),
            'regime': regime
        }


class SectorRotationEngine:
    """Recommends sector rotations based on regime"""
    
    def __init__(self):
        self.db = SessionLocal()
    
    def get_rotation_signal(self):
        """Generate sector rotation recommendation"""
        
        # Get current regime
        regime_data = self.db.query(MarketRegime).order_by(
            MarketRegime.date.desc()
        ).first()
        
        if not regime_data:
            return None
        
        regime = regime_data.regime
        
        # Rotation strategies
        strategies = {
            'bull': {
                'buy': ['Technology (XLK)', 'Consumer Discretionary (XLY)', 'Communication (XLC)'],
                'sell': ['Utilities (XLU)', 'Consumer Staples (XLP)'],
                'reasoning': 'Bull market favors growth and cyclical sectors. Tech and consumer discretionary lead in expansions.'
            },
            'bear': {
                'buy': ['Utilities (XLU)', 'Consumer Staples (XLP)', 'Healthcare (XLV)'],
                'sell': ['Technology (XLK)', 'Consumer Discretionary (XLY)', 'Financials (XLF)'],
                'reasoning': 'Defensive sectors outperform in downturns. Utilities and staples provide stability.'
            },
            'volatile': {
                'buy': ['Healthcare (XLV)', 'Consumer Staples (XLP)', 'Gold (GLD)'],
                'sell': ['Small Caps (IWM)', 'High Beta Stocks'],
                'reasoning': 'High volatility requires defensive positioning. Focus on low-beta, stable cash flow sectors.'
            },
            'crisis': {
                'buy': ['Treasury Bonds (TLT)', 'Gold (GLD)', 'Cash'],
                'sell': ['Equities', 'High Yield Bonds', 'Commodities'],
                'reasoning': 'Crisis mode: Preserve capital. Flight to safety in government bonds and gold.'
            }
        }
        
        strategy = strategies.get(regime, strategies['bull'])
        
        return {
            'regime': regime,
            'sectors_to_buy': strategy['buy'],
            'sectors_to_sell': strategy['sell'],
            'reasoning': strategy['reasoning'],
            'confidence': regime_data.confidence,
            'expected_duration_days': 90 if regime in ['bull', 'bear'] else 30
        }


# Initialize models on import
def initialize_models():
    """Initialize and train all models"""
    import os
    if not os.path.exists('models'):
        os.makedirs('models')
    
    print("🚀 Initializing models...")
    
    # Train crash predictor
    crash_model = CrashPredictor()
    crash_model.train('SPY')
    
    print("✅ All models initialized!")

if __name__ == "__main__":
    initialize_models()