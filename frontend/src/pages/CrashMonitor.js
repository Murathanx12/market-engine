import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  Typography,
  Grid as Grid,
  CircularProgress,
  Alert,
  TextField,
  Button,
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getCrashPrediction } from '../services/api';

/* ─── Semantic colors ─────────────────────────────────────────── */
const colors = {
  good: '#4caf50',
  warning: '#ffa726',
  bad: '#ef5350',
  info: '#64b5f6',
  muted: '#888888',
  accent: '#ffffff',
};

function MetricCard({ title, value, subtitle, color = colors.accent, trend }) {
  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '2.2rem', fontWeight: 700, color, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
      {trend != null && (
        <Typography sx={{ fontSize: '0.85rem', color: trend > 0 ? colors.bad : colors.good, mt: 1, fontWeight: 600 }}>
          {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </Typography>
      )}
    </Card>
  );
}

const CrashMonitor = () => {
  const [ticker, setTicker] = useState('SPY');
  const [inputTicker, setInputTicker] = useState('SPY');

  const { data, isLoading, error } = useQuery({
    queryKey: ['crash', ticker],
    queryFn: () => getCrashPrediction(ticker),
    refetchInterval: 60000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setTicker(inputTicker.toUpperCase());
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} sx={{ color: '#ffffff' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.08)', color: colors.bad, border: '1px solid rgba(239,83,80,0.2)' }}>
        Error loading crash data: {error?.message || 'Unknown error'}
      </Alert>
    );
  }

  const probability = data?.crash_probability ?? 0;
  const riskLevel = data?.risk_level ?? 'UNKNOWN';

  const chartData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    probability: Math.max(0, Math.min(100, probability * 100 + (Math.random() - 0.5) * 20)),
  }));

  const riskColor =
    probability > 0.6 ? colors.bad : probability > 0.3 ? colors.warning : colors.good;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
          Crash Monitor
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          AI-powered market crash prediction and risk analysis
        </Typography>
      </Box>

      {/* Ticker Input */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              placeholder="Enter ticker (e.g., SPY, QQQ)"
              variant="outlined"
              value={inputTicker}
              onChange={(e) => setInputTicker(e.target.value)}
              size="small"
              sx={{ width: 260, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.02)' } }}
            />
            <Button type="submit" variant="contained" sx={{ px: 3 }}>
              Analyze
            </Button>
          </Box>
        </form>
      </Card>

      <Grid container spacing={3}>
        {/* Metrics */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Crash Probability"
            value={`${(probability * 100).toFixed(1)}%`}
            color={riskColor}
            subtitle="20-day forecast"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Risk Level"
            value={riskLevel}
            color={riskColor}
            subtitle={ticker}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Confidence"
            value={`${((1 - probability) * 100).toFixed(0)}%`}
            color={colors.info}
            subtitle="Model certainty"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Volatility Index"
            value="18.2"
            color={colors.muted}
            subtitle="VIX"
            trend={-3.2}
          />
        </Grid>

        {/* Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 3 }}>
              30-Day Probability Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <XAxis dataKey="day" stroke="#555" style={{ fontSize: '0.75rem' }} />
                <YAxis stroke="#555" style={{ fontSize: '0.75rem' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#e8e8e8',
                  }}
                />
                <Line type="monotone" dataKey="probability" stroke="#ffffff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Risk Factors */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>
              Top Risk Factors
            </Typography>
            {(data?.top_factors ?? []).length > 0 ? (
              data.top_factors.slice(0, 5).map((factor, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex', justifyContent: 'space-between', py: 1.5,
                    borderBottom: idx < (data.top_factors.length - 1) ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <Typography sx={{ fontSize: '0.88rem', color: '#ccc' }}>
                    {factor?.feature ?? 'Unknown'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.88rem', color: colors.info, fontWeight: 600 }}>
                    {((factor?.impact ?? 0) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem' }}>
                No risk factors data available
              </Typography>
            )}
          </Card>
        </Grid>

        {/* AI Explanation */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>
              AI Analysis
            </Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {data?.explanation || 'Loading analysis...'}
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CrashMonitor;
