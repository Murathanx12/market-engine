import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid as Grid,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import { getMacroIndicators } from '../services/api';

const colors = {
  good: '#4caf50',
  bad: '#ef5350',
  info: '#64b5f6',
  warning: '#ffa726',
  muted: '#888888',
};

const MacroDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['macro'],
    queryFn: getMacroIndicators,
    refetchInterval: 300000,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} sx={{ color: '#ffffff' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error loading macro data: {error?.message || 'Unknown error'}</Alert>;
  }

  const getTrendIcon = (trend) => {
    if (trend === 'rising') return <TrendingUpIcon sx={{ color: colors.bad }} />;
    if (trend === 'falling') return <TrendingDownIcon sx={{ color: colors.good }} />;
    return <TrendingFlatIcon sx={{ color: colors.muted }} />;
  };

  const getIndicatorStatus = (indicator, value) => {
    const val = value ?? 0;
    if (indicator === 'VIX') {
      if (val > 30) return { label: 'Elevated Risk', color: colors.bad };
      if (val > 20) return { label: 'Caution', color: colors.warning };
      return { label: 'Normal', color: colors.good };
    }
    if (indicator === 'CPI') {
      if (val > 4) return { label: 'High Inflation', color: colors.bad };
      if (val > 3) return { label: 'Above Target', color: colors.warning };
      return { label: 'On Target', color: colors.good };
    }
    if (indicator === 'Unemployment') {
      if (val > 6) return { label: 'High', color: colors.bad };
      if (val > 4.5) return { label: 'Elevated', color: colors.warning };
      return { label: 'Healthy', color: colors.good };
    }
    if (indicator === 'Yield_Curve') {
      if (val < -0.5) return { label: 'Inverted — Recession Signal', color: colors.bad };
      if (val < 0) return { label: 'Inverted', color: colors.warning };
      return { label: 'Normal', color: colors.good };
    }
    return { label: 'Stable', color: colors.info };
  };

  const getIndicatorDescription = (indicator) => {
    const map = {
      'VIX': 'Market volatility and fear index',
      'CPI': 'Consumer Price Index — inflation measure',
      'Unemployment': 'Unemployment rate',
      'Fed_Rate': 'Federal Funds Rate',
      'Yield_Curve': '10Y-2Y Treasury spread (recession indicator)',
    };
    return map[indicator] || indicator;
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
          Macro Dashboard
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Real-time economic indicators that drive market movements
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {(data ?? []).map((indicator, idx) => {
          const status = getIndicatorStatus(indicator?.indicator, indicator?.current_value);
          const change = indicator?.change_1m;

          return (
            <Grid size={{ xs: 12, md: 6 }} key={indicator?.indicator ?? idx}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '1.05rem', mb: 0.3 }}>
                        {(indicator?.indicator ?? '').replace('_', ' ')}
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 2 }}>
                        {getIndicatorDescription(indicator?.indicator)}
                      </Typography>
                    </Box>
                    {getTrendIcon(indicator?.trend)}
                  </Box>

                  <Box display="flex" alignItems="baseline" gap={2} mb={2}>
                    <Typography sx={{ fontSize: '2.4rem', fontWeight: 700, color: '#e8e8e8' }}>
                      {(indicator?.current_value ?? 0).toFixed(2)}
                    </Typography>
                    {change != null && (
                      <Chip
                        label={`${change >= 0 ? '+' : ''}${change.toFixed(2)} (1M)`}
                        size="small"
                        sx={{
                          bgcolor: change > 0 ? 'rgba(239,83,80,0.1)' : change < 0 ? 'rgba(76,175,80,0.1)' : 'rgba(255,255,255,0.05)',
                          color: change > 0 ? colors.bad : change < 0 ? colors.good : colors.muted,
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>

                  <Box
                    sx={{
                      px: 2, py: 1, borderRadius: 1,
                      bgcolor: `${status.color}10`,
                      border: `1px solid ${status.color}25`,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.82rem', color: status.color, fontWeight: 500 }}>
                      {status.label}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {(!data || data.length === 0) && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ bgcolor: 'rgba(100,181,246,0.08)', color: colors.info }}>
              No macro data available. The scheduler will fetch data automatically.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default MacroDashboard;
