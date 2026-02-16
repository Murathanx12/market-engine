import unittest

from engine import project_stock, CONFIG
from data_fetchers import DataFetcher
from services.fred_data_service import FREDDataService


class DummyDB:
    def __init__(self):
        self.records = []

    def add(self, obj):
        self.records.append(obj)

    def commit(self):
        return None


class FREDDataServiceStub(FREDDataService):
    def __init__(self):
        # bypass real fred client
        self.thresholds = {
            'CPI_YOY': (-5.0, 20.0),
            'UNRATE': (2.0, 25.0),
            'GDP_GROWTH': (-15.0, 15.0),
            'YIELD_10Y': (0.0, 20.0),
            'YIELD_2Y': (0.0, 20.0),
        }

    def _get_cpi_yoy(self):
        return None

    def _get_unemployment(self):
        return {'value': 4.0, 'unit': '%', 'label': 'Unemployment Rate'}

    def _get_gdp_growth(self):
        return {'value': 2.0, 'unit': '%', 'label': 'GDP Growth'}

    def _get_yield_curve(self):
        return {'yield_10y': 4.0, 'yield_2y': 4.2, 'spread': -0.2, 'unit': '%', 'label': 'Yield Curve'}

    def _get_fed_funds_rate(self):
        return {'value': 5.0, 'unit': '%', 'label': 'Fed Funds'}


class Phase1RegressionTests(unittest.TestCase):
    def test_stock_projection_5y_cap_guardrail(self):
        result = project_stock(
            ticker='TEST',
            current_price=100.0,
            analyst_target=10000.0,
            historical_vol=0.8,
            regime='bull',
            n_sims=300,
        )
        five_year_mean = result['projections']['5Y']['mean']
        hard_cap_price = 100.0 * (1 + CONFIG['max_5y_return'])
        self.assertLessEqual(five_year_mean, hard_cap_price)

    def test_fred_service_explicit_warning_state(self):
        service = FREDDataServiceStub()
        payload = service.get_macro_indicators()
        self.assertIn('warning_state', payload)
        self.assertTrue(payload['warning_state']['has_warnings'])
        self.assertIn('fallback', payload['cpi']['label'].lower())

    def test_datafetcher_regime_uses_unified_state(self):
        fetcher = DataFetcher()
        fetcher.db = DummyDB()
        fetcher._get_latest_indicator = lambda _name: 1.0

        # monkeypatch imported singleton used by detect_and_save_regime
        from data_fetchers import unified_market_state
        original = unified_market_state.get_market_state
        unified_market_state.get_market_state = lambda: {'regime': 'BULL', 'confidence': 0.91}
        try:
            regime, confidence = fetcher.detect_and_save_regime()
        finally:
            unified_market_state.get_market_state = original

        self.assertEqual(regime, 'bull')
        self.assertAlmostEqual(confidence, 0.91, places=2)
        self.assertGreaterEqual(len(fetcher.db.records), 1)


if __name__ == '__main__':
    unittest.main()
