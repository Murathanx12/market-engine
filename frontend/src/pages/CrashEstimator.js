import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, Grid, CircularProgress, Alert, Chip,
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { getCrashEstimator } from '../services/api';

const colors = { good: '#4caf50', warning: '#ffa726', bad: '#ef5350', info: '#64b5f6', muted: '#888', accent: '#fff' };

function MetricCard({ title, value, subtitle, color = colors.accent }) {
  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</Typography>
      <Typography sx={{ fontSize: '2rem', fontWeight: 700, color, lineHeight: 1.2 }}>{value}</Typography>
      {subtitle && <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>{subtitle}</Typography>}
    </Card>
  );
}

const CrashEstimator = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['crashEstimator'],
    queryFn: () => getCrashEstimator(60),
    staleTime: 600000,
  });

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress sx={{ color: '#fff' }} /></Box>;
  if (error) return <Alert severity="error">Error loading crash estimator: {error?.message}</Alert>;

  const monthly = data?.monthly_probabilities || [];
  const factors = data?.contributing_factors || [];

  // Prepare chart data - cumulative probability
  const cumulativeData = monthly.map(m => ({
    date: m.date,
    month: m.month,
    probability: m.cumulative,
    marginal: m.probability,
  }));

  // Probability buckets for bar chart
  const buckets = [
    { label: '3mo', value: monthly.find(m => m.month === 3)?.cumulative || 0 },
    { label: '6mo', value: monthly.find(m => m.month === 6)?.cumulative || 0 },
    { label: '1yr', value: monthly.find(m => m.month === 12)?.cumulative || 0 },
    { label: '2yr', value: monthly.find(m => m.month === 24)?.cumulative || 0 },
    { label: '3yr', value: monthly.find(m => m.month === 36)?.cumulative || 0 },
    { label: '5yr', value: monthly.find(m => m.month === 60)?.cumulative || 0 },
  ];

  const barColor = (val) => val > 30 ? colors.bad : val > 15 ? colors.warning : colors.good;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>Crisis Timeline & Crash Probability</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Estimated probability of a ≥20% market drawdown over the next 5 years
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="1-Year Crash Prob"
            value={`${data?.total_crash_probability_1y || 0}%`}
            color={(data?.total_crash_probability_1y || 0) > 25 ? colors.bad : (data?.total_crash_probability_1y || 0) > 15 ? colors.warning : colors.good}
            subtitle="≥20% drawdown"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="5-Year Crash Prob"
            value={`${data?.total_crash_probability_5y || 0}%`}
            color={(data?.total_crash_probability_5y || 0) > 50 ? colors.bad : colors.warning}
            subtitle="Cumulative"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Peak Risk Month"
            value={`Month ${data?.peak_risk_month || '?'}`}
            color={colors.info}
            subtitle={`${data?.peak_risk_probability || 0}% marginal probability`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Regime"
            value={(data?.regime || 'bull').toUpperCase()}
            color={data?.regime === 'bull' ? colors.good : data?.regime === 'bear' ? colors.bad : colors.warning}
            subtitle={`${data?.total_simulations?.toLocaleString() || 0} simulations`}
          />
        </Grid>

        {/* Fan Chart - Cumulative Crash Probability */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 3 }}>Cumulative Crash Probability Over Time</Typography>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="crashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef5350" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef5350" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 11 }} interval={5} />
                <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={[0, 'auto']} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }}
                  formatter={(value, name) => [`${value.toFixed(1)}%`, name === 'probability' ? 'Cumulative' : 'This Month']}
                />
                <Area type="monotone" dataKey="probability" stroke="#ef5350" strokeWidth={2} fill="url(#crashGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Contributing Factors */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>Contributing Factors</Typography>
            {factors.map((f, i) => (
              <Box key={i} sx={{ mb: 2, pb: 2, borderBottom: i < factors.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '0.88rem', fontWeight: 500, color: '#ccc' }}>{f.factor}</Typography>
                  <Chip
                    label={f.severity}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      bgcolor: f.severity === 'HIGH' ? 'rgba(239,83,80,0.15)' : f.severity === 'MEDIUM' ? 'rgba(255,167,38,0.15)' : 'rgba(76,175,80,0.15)',
                      color: f.severity === 'HIGH' ? colors.bad : f.severity === 'MEDIUM' ? colors.warning : colors.good,
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: colors.muted }}>{f.detail}</Typography>
              </Box>
            ))}
          </Card>
        </Grid>

        {/* Crash Probability by Horizon */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 3 }}>Crash Probability by Time Horizon (≥20% Drawdown)</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={buckets}>
                <XAxis dataKey="label" stroke="#555" />
                <YAxis stroke="#555" unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }}
                  formatter={(v) => [`${v.toFixed(1)}%`, 'Probability']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {buckets.map((b, i) => (
                    <Cell key={i} fill={barColor(b.value)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CrashEstimator;