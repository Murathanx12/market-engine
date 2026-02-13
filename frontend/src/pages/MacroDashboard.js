import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, Grid, CircularProgress, Alert, Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import { getMacroIndicators, getMarketRegime, getSectorRotation } from '../services/api';

const colors = { good: '#4caf50', bad: '#ef5350', info: '#64b5f6', warning: '#ffa726', muted: '#888', accent: '#fff' };

const statusColors = {
  normal: { bg: 'rgba(76,175,80,0.12)', color: colors.good },
  caution: { bg: 'rgba(255,167,38,0.12)', color: colors.warning },
  elevated: { bg: 'rgba(239,83,80,0.12)', color: colors.bad },
};

const trendIcon = (trend) => {
  if (trend === 'rising') return <TrendingUpIcon sx={{ fontSize: 18, color: colors.bad }} />;
  if (trend === 'falling') return <TrendingDownIcon sx={{ fontSize: 18, color: colors.good }} />;
  return <TrendingFlatIcon sx={{ fontSize: 18, color: colors.muted }} />;
};

const INDICATOR_LABELS = {
  VIX: { name: 'VIX (Fear Index)', unit: '', desc: 'Market volatility gauge' },
  CPI: { name: 'CPI (Inflation)', unit: '%', desc: 'Consumer Price Index' },
  Unemployment: { name: 'Unemployment Rate', unit: '%', desc: 'U.S. unemployment' },
  Fed_Rate: { name: 'Fed Funds Rate', unit: '%', desc: 'Federal Reserve target rate' },
  Yield_Curve: { name: 'Yield Curve (10Y-2Y)', unit: '%', desc: 'Treasury spread' },
  Treasury_10Y: { name: '10Y Treasury Yield', unit: '%', desc: '10-Year bond yield' },
  Treasury_2Y: { name: '2Y Treasury Yield', unit: '%', desc: '2-Year bond yield' },
};

const MacroDashboard = () => {
  const { data: indicators, isLoading, error } = useQuery({
    queryKey: ['macro'],
    queryFn: getMacroIndicators,
    staleTime: 300000,
  });

  const { data: regime } = useQuery({
    queryKey: ['regime'],
    queryFn: getMarketRegime,
    staleTime: 300000,
  });

  const { data: rotation } = useQuery({
    queryKey: ['sector-rotation'],
    queryFn: getSectorRotation,
    staleTime: 300000,
  });

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress sx={{ color: '#fff' }} /></Box>;
  if (error) return <Alert severity="error">Error: {error?.message}</Alert>;

  const data = Array.isArray(indicators) ? indicators : [];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>Macro Dashboard</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Key economic indicators and market regime</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Regime Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Market Regime</Typography>
            <Typography sx={{ fontSize: '2.2rem', fontWeight: 700, color: regime?.regime === 'bull' ? colors.good : regime?.regime === 'bear' ? colors.bad : colors.warning, lineHeight: 1.2 }}>
              {(regime?.regime || 'unknown').charAt(0).toUpperCase() + (regime?.regime || 'unknown').slice(1)}
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>
              Confidence: {((regime?.confidence || 0) * 100).toFixed(0)}%
            </Typography>
          </Card>
        </Grid>

        {/* Sector Rotation */}
        {rotation && (
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ p: 3, height: '100%' }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>Sector Rotation Strategy</Typography>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', color: colors.good, textTransform: 'uppercase', fontWeight: 600, mb: 1 }}>Overweight</Typography>
                  {(rotation.sectors_to_buy || []).map((s, i) => (
                    <Chip key={i} label={s} size="small" sx={{ mr: 0.5, mb: 0.5, bgcolor: 'rgba(76,175,80,0.1)', color: colors.good, fontSize: '0.75rem' }} />
                  ))}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', color: colors.bad, textTransform: 'uppercase', fontWeight: 600, mb: 1 }}>Underweight</Typography>
                  {(rotation.sectors_to_sell || []).map((s, i) => (
                    <Chip key={i} label={s} size="small" sx={{ mr: 0.5, mb: 0.5, bgcolor: 'rgba(239,83,80,0.1)', color: colors.bad, fontSize: '0.75rem' }} />
                  ))}
                </Box>
              </Box>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mt: 2 }}>{rotation.reasoning}</Typography>
            </Card>
          </Grid>
        )}

        {/* Indicator Cards */}
        {data.map((ind, idx) => {
          const meta = INDICATOR_LABELS[ind.indicator] || { name: ind.indicator, unit: '', desc: '' };
          const status = statusColors[ind.status] || statusColors.normal;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={ind.indicator || idx}>
              <Card sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontWeight: 500 }}>{meta.name}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#555' }}>{meta.desc}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={ind.status?.toUpperCase() || 'NORMAL'}
                      size="small"
                      sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600, bgcolor: status.bg, color: status.color }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }}>
                    {ind.current_value != null ? ind.current_value : '—'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', color: '#666' }}>{meta.unit}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  {trendIcon(ind.trend)}
                  <Typography sx={{ fontSize: '0.82rem', color: ind.change_1m != null ? (ind.change_1m > 0 ? colors.bad : colors.good) : colors.muted }}>
                    {ind.change_1m != null ? `${ind.change_1m > 0 ? '+' : ''}${ind.change_1m.toFixed(2)} (1M)` : 'No change data'}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          );
        })}

        {data.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: 'text.secondary' }}>
                No macro data available. The scheduler will populate indicators shortly.
              </Typography>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default MacroDashboard;