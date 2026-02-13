import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, Grid, Alert, Button,
} from '@mui/material';
import {
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Area, ComposedChart, BarChart, Bar, Cell,
} from 'recharts';
import { getBacktest, getAccuracyHistory } from '../services/api';

const colors = { good: '#4caf50', bad: '#ef5350', info: '#64b5f6', warning: '#ffa726', muted: '#888', accent: '#fff' };

function MetricCard({ title, value, subtitle, color = colors.accent }) {
  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</Typography>
      <Typography sx={{ fontSize: '2.2rem', fontWeight: 700, color, lineHeight: 1.2 }}>{value}</Typography>
      {subtitle && <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>{subtitle}</Typography>}
    </Card>
  );
}

const SimulationAccuracy = () => {
  const [running, setRunning] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['backtest'],
    queryFn: () => getBacktest(2005),
    staleTime: 3600000, // 1 hour cache
    enabled: false, // Don't auto-run - expensive
  });

  // Also try the lightweight accuracy history
  const { data: histData } = useQuery({
    queryKey: ['accuracy-history'],
    queryFn: getAccuracyHistory,
    staleTime: 300000,
  });

  const handleRunBacktest = async () => {
    setRunning(true);
    try {
      await refetch();
    } finally {
      setRunning(false);
    }
  };

  const metrics = data?.metrics || {};
  const predictions = data?.predictions || [];

  // Format predictions for chart
  const chartData = predictions.map(p => ({
    date: p.date?.slice(0, 7) || '',
    actual: Math.round(p.actual || 0),
    predicted: Math.round(p.predicted_mean || 0),
    p05: Math.round(p.predicted_p05 || 0),
    p95: Math.round(p.predicted_p95 || 0),
  }));

  // Error distribution
  const errorData = predictions.map(p => ({
    date: p.date?.slice(0, 7) || '',
    error: p.error_pct || 0,
    within: p.within_90_band,
  }));

  // Legacy accuracy data fallback
  // Legacy accuracy data available via histData if needed

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>Model Accuracy & Backtest</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
            Walk-forward validation on S&P 500 (2005–present)
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleRunBacktest}
          disabled={isLoading || running}
          sx={{ px: 3 }}
        >
          {isLoading || running ? 'Running Backtest...' : 'Run Backtest'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>Backtest error: {error?.message}</Alert>}

      {/* Metrics */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="MAPE"
            value={metrics.mape ? `${metrics.mape}%` : '—'}
            subtitle="Mean Absolute % Error"
            color={metrics.mape && metrics.mape < 15 ? colors.good : colors.warning}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="90% Coverage"
            value={metrics.coverage_90 ? `${metrics.coverage_90}%` : '—'}
            subtitle="Actual within prediction band"
            color={metrics.coverage_90 && metrics.coverage_90 > 85 ? colors.good : colors.warning}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Predictions"
            value={metrics.n_predictions || '—'}
            color={colors.info}
            subtitle={data?.period || 'Run backtest to see results'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Mean Error"
            value={metrics.mean_error_pct != null ? `${metrics.mean_error_pct}%` : '—'}
            color={colors.muted}
            subtitle={metrics.rmse_pct ? `RMSE: ${metrics.rmse_pct}%` : ''}
          />
        </Grid>

        {/* Actual vs Predicted Chart */}
        {chartData.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>Backtest: Actual vs Predicted S&P 500</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mb: 3 }}>
                Blue shading: 90% prediction interval · White line: Prediction · Cyan: Actual
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64b5f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#64b5f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(chartData.length / 10))} />
                  <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }}
                    formatter={(v, name) => [`$${Number(v).toLocaleString()}`, name]}
                  />
                  <Area type="monotone" dataKey="p95" stroke="none" fill="url(#bandGrad)" />
                  <Area type="monotone" dataKey="p05" stroke="none" fill="transparent" />
                  <Line type="monotone" dataKey="actual" stroke="#26c6da" strokeWidth={2} dot={false} name="Actual" />
                  <Line type="monotone" dataKey="predicted" stroke="#ffffff" strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="Predicted" />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
        )}

        {/* Error Distribution */}
        {errorData.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 3 }}>Prediction Error by Period (%)</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={errorData}>
                  <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(errorData.length / 10))} />
                  <YAxis stroke="#555" unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }}
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Error']}
                  />
                  <Bar dataKey="error" radius={[4, 4, 0, 0]}>
                    {errorData.map((d, i) => (
                      <Cell key={i} fill={Math.abs(d.error) < 10 ? colors.good : Math.abs(d.error) < 20 ? colors.warning : colors.bad} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
        )}

        {/* Prompt to run backtest if no data */}
        {!data && !isLoading && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 500, mb: 1 }}>No backtest results yet</Typography>
              <Typography sx={{ color: 'text.secondary', mb: 3 }}>
                Click "Run Backtest" to validate the prediction engine against 20+ years of S&P 500 data.
                This is computationally intensive and may take 30–60 seconds.
              </Typography>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SimulationAccuracy;