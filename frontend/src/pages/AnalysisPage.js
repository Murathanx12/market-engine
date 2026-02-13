import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, Grid, CircularProgress, Alert,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { getAnalysis, getPortfolio } from '../services/api';

const colors = { good: '#4caf50', bad: '#ef5350', info: '#64b5f6', warning: '#ffa726', muted: '#888', accent: '#fff' };

function MetricCard({ title, value, subtitle, color = colors.accent }) {
  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</Typography>
      <Typography sx={{ fontSize: '2rem', fontWeight: 700, color, lineHeight: 1.2 }}>{value}</Typography>
      {subtitle && <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>{subtitle}</Typography>}
    </Card>
  );
}

const AnalysisPage = () => {
  const [timeframe, setTimeframe] = useState('month');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis', timeframe],
    queryFn: () => getAnalysis(timeframe),
    staleTime: 300000,
  });

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolio,
    staleTime: 300000,
  });

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress sx={{ color: '#fff' }} /></Box>;
  if (error) return <Alert severity="error">Error loading analysis: {error?.message}</Alert>;

  const sp500 = data?.sp500 || {};
  const gainers = data?.top_gainers || [];
  const losers = data?.top_losers || [];
  const regime = data?.regime || 'bull';
  const summary = data?.summary || '';

  const tfLabel = { week: 'Week', month: 'Month', '3m': '3 Months', '6m': '6 Months', '1y': '1 Year', '5y': '5 Years' };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>Report & Analysis</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Market performance, top movers, and portfolio snapshot
        </Typography>
      </Box>

      {/* Timeframe Selector */}
      <Card sx={{ p: 2, mb: 3 }}>
        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={(_, val) => val && setTimeframe(val)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: '#888', borderColor: 'rgba(255,255,255,0.1)', px: 2.5, fontSize: '0.82rem',
              '&.Mui-selected': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
            },
          }}
        >
          {Object.entries(tfLabel).map(([key, label]) => (
            <ToggleButton key={key} value={key}>{label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Card>

      {/* S&P 500 Summary */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="S&P 500 Return"
            value={`${sp500.return_pct >= 0 ? '+' : ''}${(sp500.return_pct || 0).toFixed(1)}%`}
            color={(sp500.return_pct || 0) >= 0 ? colors.good : colors.bad}
            subtitle={`${tfLabel[timeframe]} performance`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Current Level"
            value={`$${(sp500.current || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            subtitle="S&P 500"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Regime"
            value={regime.charAt(0).toUpperCase() + regime.slice(1)}
            color={regime === 'bull' ? colors.good : regime === 'bear' ? colors.bad : colors.warning}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {portfolio && portfolio.holdings?.length > 0 ? (
            <MetricCard
              title="Portfolio Value"
              value={`$${(portfolio.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
              color={colors.info}
              subtitle={`${(portfolio.total_gain_loss_pct || 0) >= 0 ? '+' : ''}${(portfolio.total_gain_loss_pct || 0).toFixed(1)}% total return`}
            />
          ) : (
            <MetricCard title="Portfolio" value="—" subtitle="No holdings yet" />
          )}
        </Grid>

        {/* Top Gainers & Losers */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>Top Gainers ({tfLabel[timeframe]})</Typography>
            {gainers.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, gainers.length * 32)}>
                <BarChart data={gainers} layout="vertical" margin={{ left: 50 }}>
                  <XAxis type="number" stroke="#555" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="ticker" stroke="#555" tick={{ fontSize: 12, fontWeight: 600 }} width={55} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }}
                    formatter={(v) => [`${v.toFixed(1)}%`, 'Return']}
                  />
                  <Bar dataKey="return_pct" radius={[0, 6, 6, 0]}>
                    {gainers.map((_, i) => <Cell key={i} fill={colors.good} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>No data available</Typography>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>Top Losers ({tfLabel[timeframe]})</Typography>
            {losers.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, losers.length * 32)}>
                <BarChart data={losers} layout="vertical" margin={{ left: 50 }}>
                  <XAxis type="number" stroke="#555" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="ticker" stroke="#555" tick={{ fontSize: 12, fontWeight: 600 }} width={55} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }}
                    formatter={(v) => [`${v.toFixed(1)}%`, 'Return']}
                  />
                  <Bar dataKey="return_pct" radius={[0, 6, 6, 0]}>
                    {losers.map((_, i) => <Cell key={i} fill={colors.bad} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>No data available</Typography>
            )}
          </Card>
        </Grid>

        {/* Market Summary */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>Market Summary</Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {summary || 'Analysis data is being generated. The scheduler will populate this with the latest market insights.'}
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalysisPage;