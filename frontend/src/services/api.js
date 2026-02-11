import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Crash Prediction
export const getCrashPrediction = async (ticker = 'SPY') => {
  const response = await api.get(`/api/crash/${ticker}`);
  return response.data;
};

// Stock Projections
export const getStockProjection = async (ticker) => {
  const response = await api.get(`/api/stock/${ticker}`);
  return response.data;
};

// News
export const getNews = async (days = 7, minSeverity = 5) => {
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

// Weekly Report
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

// Trigger Data Update
export const triggerDataUpdate = async () => {
  const response = await api.post('/api/update-data');
  return response.data;
};

export default api;