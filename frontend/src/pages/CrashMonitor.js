import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, CircularProgress, Alert,
  TextField, Button, Chip,
} from '@mui/material';
import { Grid } from '@mui/material'; // Grid2 migration
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getCrashPrediction } from '../services/api';
import RegimeBanner from '../components/RegimeBanner';

const colors = { good: '#4caf50', warning: '#ffa726', bad: '#ef5350', info: '#64b5f6', muted: '#888', accent: '#fff' };

function MetricCard({ title, value, subtitle, color = colors.accent }) {
  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</Typography>
      <Typography sx={{ fontSize: '2.2rem', fontWeight: 700, color, lineHeight: 1.2 }}>{value}</Typography>
      {subtitle && <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>{subtitle}</Typography>}
    </Card>
  );
}

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

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress size={48} sx={{ color: '#ffffff' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.08)', color: colors.bad, border: '1px solid rgba(239,83,80,0.2)' }}>Error loading crash data: {error?.message || 'Unknown error'}</Alert>;

  const probability = data?.crash_probability ?? 0;
  const riskLevel = data?.risk_level ?? 'UNKNOWN';
  const riskMetrics = data?.risk_metrics || {};
  const crashProbs = data?.crash_probabilities || {};
  const scenarios = data?.scenarios || [];
  const riskColor = probability > 0.3 ? colors.bad : probability > 0.15 ? colors.warning : colors.good;

  // Build horizon bar chart from real crash_probabilities
  const horizonData = Object.entries(crashProbs).map(([label, value]) => ({
    label, value: typeof value === 'number' ? value : 0,
  }));

  // Build scenario breakdown
  const scenarioData = (Array.isArray(scenarios) ? scenarios : []).map(s => ({
    name: s.name || 'Unknown',
    probability: (s.probability || 0) * 100,
    annualReturn: s.annual_return || 0,  // Already in % from backend
    volatility: s.volatility || 0,       // Already in % from backend
  }));

  return (
    <Box>
    < RegimeBanner />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>Crash Monitor</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>AI-powered market crash prediction and risk analysis</Typography>
      </Box>

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
            <Button type="submit" variant="contained" sx={{ px: 3 }}>Analyze</Button>
            {data?.cached && <Chip label="Cached" size="small" sx={{ ml: 1, bgcolor: 'rgba(255,255,255,0.05)', color: '#666', fontSize: '0.7rem' }} />}
          </Box>
        </form>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard title="Crash Probability" value={`${(probability * 100).toFixed(1)}%`} color={riskColor} subtitle="12-month ≥20% drawdown" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard title="Risk Level" value={riskLevel} color={riskColor} subtitle={ticker} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard title="CVaR (95%)" value={`${riskMetrics.cvar_95_pct || 0}%`} color={colors.warning} subtitle="Expected loss in worst 5%" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard title="Max Drawdown" value={`${riskMetrics.max_drawdown_pct || 0}%`} color={colors.info} subtitle="Simulated worst case" />
        </Grid>

        {/* Crash Probability by Horizon */}
        {horizonData.length > 0 && (
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ p: 3 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 3 }}>Crash Probability by Time Horizon</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={horizonData}>
                  <XAxis dataKey="label" stroke="#555" />
                  <YAxis stroke="#555" unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }} formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Crash Prob']} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {horizonData.map((d, i) => <Cell key={i} fill={d.value > 30 ? colors.bad : d.value > 15 ? colors.warning : colors.good} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
        )}

        {/* Risk Factors */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>Top Risk Factors</Typography>
            {(data?.top_factors ?? []).length > 0 ? (
              data.top_factors.slice(0, 5).map((factor, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: idx < (data.top_factors.length - 1) ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <Typography sx={{ fontSize: '0.88rem', color: '#ccc' }}>{factor?.feature ?? 'Unknown'}</Typography>
                  <Typography sx={{ fontSize: '0.88rem', color: colors.info, fontWeight: 600 }}>{((factor?.impact ?? 0) * 100).toFixed(1)}%</Typography>
                </Box>
              ))
            ) : (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem' }}>No risk factors data available</Typography>
            )}
          </Card>
        </Grid>

        {/* Scenario Breakdown Table */}
        {scenarioData.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>Monte Carlo Scenario Breakdown</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { px: 2, py: 1.5, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' } }}>
                  <thead>
                    <tr>
                      {['Scenario', 'Weight', 'Ann. Return', 'Volatility'].map(h => (
                        <Box component="th" key={h} sx={{ fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>{h}</Box>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioData.map((s, i) => (
                      <tr key={i}>
                        <Box component="td" sx={{ fontWeight: 500, color: '#ccc' }}>{s.name}</Box>
                        <Box component="td">{s.probability.toFixed(0)}%</Box>
                        <Box component="td" sx={{ color: s.annualReturn >= 0 ? colors.good : colors.bad, fontWeight: 500 }}>{s.annualReturn >= 0 ? '+' : ''}{s.annualReturn.toFixed(1)}%</Box>
                        <Box component="td" sx={{ color: colors.muted }}>{s.volatility.toFixed(0)}%</Box>
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
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>AI Analysis</Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{data?.explanation || 'Loading analysis...'}</Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CrashMonitor;
