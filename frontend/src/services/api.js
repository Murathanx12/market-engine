import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // 120s timeout for Monte Carlo computations
});

// Crash Monitor
export const getCrashPrediction = async (ticker = 'SPY') => {
  const response = await api.get(`/api/crash/${ticker}`);
  return response.data;
};

// Crash Estimator (NEW)
export const getCrashEstimator = async (months = 60) => {
  const response = await api.get(`/api/crash/estimator?months=${months}`);
  return response.data;
};

// Stock Projections (V6 Monte Carlo)
export const getStockProjection = async (ticker) => {
  const response = await api.get(`/api/stock/${ticker}`);
  return response.data;
};

// Stock History
export const getStockHistory = async (ticker, period = '5y') => {
  const response = await api.get(`/api/stock/${ticker}/history?period=${period}`);
  return response.data;
};

// S&P 500 Projection
export const getSP500Projection = async (years = 5) => {
  const response = await api.get(`/api/sp500/projection?years=${years}`);
  return response.data;
};

// Portfolio (NEW)
export const getPortfolio = async () => {
  const response = await api.get('/api/portfolio');
  return response.data;
};

export const addToPortfolio = async (holding) => {
  const response = await api.post('/api/portfolio', holding);
  return response.data;
};

export const removeFromPortfolio = async (holdingId) => {
  const response = await api.delete(`/api/portfolio/${holdingId}`);
  return response.data;
};

// News
export const getNews = async (days = 7, minSeverity = 1) => {
  const response = await api.get(`/api/news?days=${days}&min_severity=${minSeverity}`);
  return response.data;
};

// Macro Indicators
export const getMacroIndicators = async () => {
  const response = await api.get('/api/macro');
  return response.data;
};

// Market Regime
export const getMarketRegime = async () => {
  const response = await api.get('/api/regime');
  return response.data;
};

// Sector Rotation
export const getSectorRotation = async () => {
  const response = await api.get('/api/sector-rotation');
  return response.data;
};

// Analysis (replaces Weekly Report)
export const getAnalysis = async (timeframe = 'week') => {
  const response = await api.get(`/api/analysis?timeframe=${timeframe}`);
  return response.data;
};

// Legacy compat
export const getWeeklyReport = async () => {
  const response = await api.get('/api/weekly-report');
  return response.data;
};

// Scenario Analysis
export const runScenario = async (ticker, scenario) => {
  const response = await api.get(`/api/scenario/${ticker}?scenario=${scenario}`);
  return response.data;
};

// Accuracy History
export const getAccuracyHistory = async () => {
  const response = await api.get('/api/accuracy-history');
  return response.data;
};

// Backtest (NEW)
export const getBacktest = async (startYear = 2005) => {
  const response = await api.get(`/api/backtest?start_year=${startYear}`);
  return response.data;
};

// Trigger Data Update
export const triggerDataUpdate = async () => {
  const response = await api.post('/api/update-data');
  return response.data;
};

export default api;