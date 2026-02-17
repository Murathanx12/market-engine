import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, CircularProgress, Alert,
  TextField, Button, Chip,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getCrashPrediction } from '../services/api';
import { COLORS } from '../theme/darkTheme';
import MetricCard from '../components/MetricCard';

/* ─── helpers ──────────────────────────────────────── */

const riskVariant = (probability) => {
  if (probability > 0.3) return 'bear';
  if (probability > 0.15) return 'warn';
  return 'bull';
};

const barFill = (value) => {
  if (value > 30) return COLORS.crimson;
  if (value > 15) return COLORS.amber;
  return COLORS.emerald;
};

/* ─── custom Recharts dark tooltip ─────────────────── */

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: COLORS.bgElevated,
      border: `1px solid ${COLORS.borderSubtle}`,
      borderRadius: '6px',
      px: 1.5, py: 1,
    }}>
      <Typography sx={{ fontSize: '0.72rem', color: COLORS.textMuted, mb: 0.25 }}>{label}</Typography>
      {payload.map((p, i) => (
        <Typography key={i} sx={{ fontSize: '0.8rem', color: COLORS.textPrimary, fontWeight: 600 }}>
          {Number(p.value).toFixed(1)}%
        </Typography>
      ))}
    </Box>
  );
};

/* ─── page ─────────────────────────────────────────── */

const CrashMonitor = () => {
  const [ticker, setTicker] = useState('SPY');
  const [inputTicker, setInputTicker] = useState('SPY');

  const { data, isLoading, error } = useQuery({
    queryKey: ['crash', ticker],
    queryFn: () => getCrashPrediction(ticker),
    staleTime: 300000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setTicker(inputTicker.toUpperCase());
  };

  /* ── loading / error states ── */

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} sx={{ color: COLORS.emerald }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{
          bgcolor: COLORS.crimsonDim,
          color: COLORS.crimson,
          border: `1px solid ${COLORS.crimson}`,
          '& .MuiAlert-icon': { color: COLORS.crimson },
        }}
      >
        Error loading crash data: {error?.message || 'Unknown error'}
      </Alert>
    );
  }

  /* ── derived data ── */

  const probability = data?.crash_probability ?? 0;
  const riskLevel = data?.risk_level ?? 'UNKNOWN';
  const riskMetrics = data?.risk_metrics || {};
  const crashProbs = data?.crash_probabilities || {};
  const scenarios = data?.scenarios || [];
  const variant = riskVariant(probability);

  const horizonData = Object.entries(crashProbs).map(([label, value]) => ({
    label,
    value: typeof value === 'number' ? value : 0,
  }));

  const scenarioData = (Array.isArray(scenarios) ? scenarios : []).map((s) => ({
    name: s.name || 'Unknown',
    probability: (s.probability || 0) * 100,
    annualReturn: s.annual_return || 0,
    volatility: s.volatility || 0,
  }));

  /* ── render ── */

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5, color: COLORS.textPrimary }}>
          Crash Monitor
        </Typography>
        <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.9rem' }}>
          AI-powered market crash prediction and risk analysis
        </Typography>
      </Box>

      {/* Ticker input */}
      <Card sx={{ p: 2.5, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
        <form onSubmit={handleSubmit}>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              placeholder="Enter ticker (e.g., SPY, QQQ)"
              variant="outlined"
              value={inputTicker}
              onChange={(e) => setInputTicker(e.target.value)}
              size="small"
              sx={{
                width: 260,
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.bgDeep,
                  color: COLORS.textPrimary,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.borderSubtle },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.borderActive },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.emerald },
                },
                '& .MuiInputBase-input::placeholder': { color: COLORS.textMuted, opacity: 1 },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{
                px: 3,
                bgcolor: COLORS.emerald,
                color: COLORS.bgVoid,
                fontWeight: 600,
                '&:hover': { bgcolor: '#00a37a' },
              }}
            >
              Analyze
            </Button>
            {data?.cached && (
              <Chip
                label="Cached"
                size="small"
                sx={{
                  ml: 1,
                  bgcolor: COLORS.bgElevated,
                  color: COLORS.textMuted,
                  fontSize: '0.7rem',
                  border: `1px solid ${COLORS.borderSubtle}`,
                }}
              />
            )}
          </Box>
        </form>
      </Card>

      <Grid container spacing={3}>
        {/* Top metric cards */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Crash Probability"
            value={(probability * 100).toFixed(1)}
            unit="%"
            variant={variant}
            tooltip="12-month probability of a 20%+ drawdown"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Risk Level"
            value={riskLevel}
            variant={variant}
            tooltip={`Current assessment for ${ticker}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="CVaR (95%)"
            value={riskMetrics.cvar_95_pct || 0}
            unit="%"
            variant="warn"
            tooltip="Expected loss in worst 5% of scenarios"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Max Drawdown"
            value={riskMetrics.max_drawdown_pct || 0}
            unit="%"
            variant="neutral"
            tooltip="Simulated worst-case drawdown"
          />
        </Grid>

        {/* Crash Probability by Horizon */}
        {horizonData.length > 0 && (
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 3, color: COLORS.textPrimary }}>
                Crash Probability by Time Horizon
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={horizonData}>
                  <XAxis
                    dataKey="label"
                    stroke={COLORS.textMuted}
                    tick={{ fill: COLORS.textSecondary, fontSize: 11 }}
                    axisLine={{ stroke: COLORS.borderSubtle }}
                    tickLine={{ stroke: COLORS.borderSubtle }}
                  />
                  <YAxis
                    stroke={COLORS.textMuted}
                    tick={{ fill: COLORS.textSecondary, fontSize: 11 }}
                    unit="%"
                    axisLine={{ stroke: COLORS.borderSubtle }}
                    tickLine={{ stroke: COLORS.borderSubtle }}
                  />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: COLORS.bgHighlight }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {horizonData.map((d, i) => (
                      <Cell key={i} fill={barFill(d.value)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
        )}

        {/* Risk Factors */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, height: '100%', bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2, color: COLORS.textPrimary }}>
              Top Risk Factors
            </Typography>
            {(data?.top_factors ?? []).length > 0 ? (
              data.top_factors.slice(0, 5).map((factor, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 1.5,
                    borderBottom: idx < data.top_factors.length - 1
                      ? `1px solid ${COLORS.borderSubtle}`
                      : 'none',
                  }}
                >
                  <Typography sx={{ fontSize: '0.88rem', color: COLORS.textSecondary }}>
                    {factor?.feature ?? 'Unknown'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.88rem', color: COLORS.indigo, fontWeight: 600 }}>
                    {((factor?.impact ?? 0) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography sx={{ color: COLORS.textMuted, fontSize: '0.88rem' }}>
                No risk factors data available
              </Typography>
            )}
          </Card>
        </Grid>

        {/* Scenario Breakdown Table */}
        {scenarioData.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2, color: COLORS.textPrimary }}>
                Monte Carlo Scenario Breakdown
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': {
                      px: 2,
                      py: 1.5,
                      textAlign: 'left',
                      borderBottom: `1px solid ${COLORS.borderSubtle}`,
                    },
                  }}
                >
                  <thead>
                    <tr>
                      {['Scenario', 'Weight', 'Ann. Return', 'Volatility'].map((h) => (
                        <Box
                          component="th"
                          key={h}
                          sx={{
                            fontSize: '0.75rem',
                            color: COLORS.textMuted,
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                          }}
                        >
                          {h}
                        </Box>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioData.map((s, i) => (
                      <tr key={i}>
                        <Box component="td" sx={{ fontWeight: 500, color: COLORS.textPrimary }}>
                          {s.name}
                        </Box>
                        <Box component="td" sx={{ color: COLORS.textSecondary }}>
                          {s.probability.toFixed(0)}%
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            color: s.annualReturn >= 0 ? COLORS.emerald : COLORS.crimson,
                            fontWeight: 500,
                          }}
                        >
                          {s.annualReturn >= 0 ? '+' : ''}
                          {s.annualReturn.toFixed(1)}%
                        </Box>
                        <Box component="td" sx={{ color: COLORS.textMuted }}>
                          {s.volatility.toFixed(0)}%
                        </Box>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Box>
            </Card>
          </Grid>
        )}

        {/* AI Explanation */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2, color: COLORS.textPrimary }}>
              AI Analysis
            </Typography>
            <Typography sx={{ color: COLORS.textSecondary, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {data?.explanation || 'Loading analysis...'}
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CrashMonitor;
