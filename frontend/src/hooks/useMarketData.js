import { useQuery } from '@tanstack/react-query';
import {
  getMacroIndicatorsValidated,
  getCrashPrediction,
  getStockProjection,
  getSP500Projection,
  getCrashEstimator,
  getNetLiquidity,
  getNews,
} from '../services/api';

/** Macro indicators — 30min staleTime */
export const useMacroIndicators = () => useQuery({
  queryKey: ['macroIndicators'],
  queryFn: getMacroIndicatorsValidated,
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
});

/** Crash prediction per ticker — 5min staleTime */
export const useCrashPrediction = (ticker = 'SPY') => useQuery({
  queryKey: ['crashPrediction', ticker],
  queryFn: () => getCrashPrediction(ticker),
  staleTime: 5 * 60 * 1000,
  enabled: !!ticker,
});

/** Stock projection per ticker — 5min staleTime */
export const useStockProjection = (ticker) => useQuery({
  queryKey: ['stockProjection', ticker],
  queryFn: () => getStockProjection(ticker),
  staleTime: 5 * 60 * 1000,
  enabled: !!ticker,
});

/** S&P 500 Monte Carlo projection — 30min staleTime */
export const useSP500Projection = (years = 5) => useQuery({
  queryKey: ['sp500Projection', years],
  queryFn: () => getSP500Projection(years),
  staleTime: 30 * 60 * 1000,
});

/** Crash estimator timeline — 1hr staleTime */
export const useCrashEstimator = (months = 60) => useQuery({
  queryKey: ['crashEstimator', months],
  queryFn: () => getCrashEstimator(months),
  staleTime: 60 * 60 * 1000,
});

/** Net Liquidity (WALCL - TGA - RRP) — 1hr staleTime */
export const useNetLiquidity = () => useQuery({
  queryKey: ['netLiquidity'],
  queryFn: getNetLiquidity,
  staleTime: 60 * 60 * 1000,
});

/** News with sentiment — 15min staleTime */
export const useNews = (days = 7, minSeverity = 1) => useQuery({
  queryKey: ['news', days, minSeverity],
  queryFn: () => getNews(days, minSeverity),
  staleTime: 15 * 60 * 1000,
});
