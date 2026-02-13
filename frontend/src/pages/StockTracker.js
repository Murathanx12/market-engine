import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, Grid, CircularProgress, Alert,
  TextField, Button, Chip,
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { getStockProjection, getStockHistory } from '../services/api';

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

const StockTracker = () => {
  const [ticker, setTicker] = useState('NVDA');
  const [inputTicker, setInputTicker] = useState('NVDA');

  const { data, isLoading, error } = useQuery({
    queryKey: ['stock', ticker],
    queryFn: () => getStockProjection(ticker),
    staleTime: 300000,
  });

  const { data: histData } = useQuery({
    queryKey: ['stock-history', ticker],
    queryFn: () => getStockHistory(ticker, '1y'),
    staleTime: 600000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setTicker(inputTicker.toUpperCase());
  };

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress size={48} sx={{ color: '#ffffff' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.08)', color: colors.bad }}>Error: {error?.message || 'Unknown error'}</Alert>;

  const currentPrice = data?.current_price ?? 0;
  const projections = data?.projections || {};
  const proj1Y = projections['1Y'] || {};
  // const proj5Y = projections['5Y'] || {};
  const change1Y = currentPrice > 0 ? (((proj1Y.mean || currentPrice) - currentPrice) / currentPrice * 100) : 0;

  // Projection chart with confidence bands
  const projChartData = [
    { period: 'Now', mean: currentPrice, p05: currentPrice, p25: currentPrice, p75: currentPrice, p95: currentPrice },
    ...['1M', '6M', '1Y', '5Y'].filter(k => projections[k]).map(k => ({
      period: k,
      mean: projections[k].mean,
      p05: projections[k].p05,
      p25: projections[k].p25,
      p75: projections[k].p75,
      p95: projections[k].p95,
    })),
  ];

  // Historical price chart
  const histChartData = (histData?.prices || []).map(p => ({
    date: p.date,
    close: p.close,
  }));

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>Stock Tracker</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Monte Carlo projections with institutional calibration
        </Typography>
      </Box>

      <Card sx={{ p: 2.5, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box display="flex" gap={2} alignItems="center">
            <TextField placeholder="Enter ticker (e.g., NVDA, AAPL)" value={inputTicker} onChange={(e) => setInputTicker(e.target.value)} size="small" sx={{ width: 260 }} />
            <Button type="submit" variant="contained" sx={{ px: 3 }}>Track Stock</Button>
            {data?.name && <Typography sx={{ ml: 2, color: '#888', fontSize: '0.88rem' }}>{data.name}</Typography>}
          </Box>
        </form>
      </Card>

      <Grid container spacing={3}>
        {/* Metric Cards */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard title="Current Price" value={`$${currentPrice.toFixed(2)}`} subtitle={`${data?.sector || ''} · ${ticker}`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="1Y Projection (Mean)"
            value={`$${(proj1Y.mean || 0).toFixed(2)}`}
            color={change1Y >= 0 ? colors.good : colors.bad}
            subtitle={`${change1Y >= 0 ? '+' : ''}${change1Y.toFixed(1)}% expected`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Analyst Target"
            value={data?.analyst_target ? `$${data.analyst_target.toFixed(2)}` : 'N/A'}
            color={colors.info}
            subtitle={data?.analyst_target ? `${((data.analyst_target / currentPrice - 1) * 100).toFixed(1)}% upside` : ''}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Sharpe Ratio"
            value={data?.sharpe?.toFixed(2) || 'N/A'}
            color={(data?.sharpe || 0) > 0.5 ? colors.good : (data?.sharpe || 0) > 0 ? colors.warning : colors.bad}
            subtitle={`Vol: ${data?.historical_vol || 0}%`}
          />
        </Grid>

        {/* Historical Price Chart */}
        {histChartData.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 3 }}>1-Year Price History</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={histChartData}>
                  <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 10 }} interval={Math.floor(histChartData.length / 8)} />
                  <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }}
                    formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Close']}
                  />
                  <Line type="monotone" dataKey="close" stroke="#64b5f6" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
        )}

        {/* Projection Fan Chart */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>Monte Carlo Projection (Confidence Bands)</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mb: 3 }}>
              Shaded: 90% confidence interval (p05–p95) · Inner: 50% interval (p25–p75) · Line: Mean
            </Typography>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={projChartData}>
                <defs>
                  <linearGradient id="outerBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64b5f6" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#64b5f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="innerBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64b5f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#64b5f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" stroke="#555" />
                <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }}
                  formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name]}
                />
                <Area type="monotone" dataKey="p95" stroke="none" fill="url(#outerBand)" />
                <Area type="monotone" dataKey="p75" stroke="none" fill="url(#innerBand)" />
                <Area type="monotone" dataKey="p25" stroke="none" fill="transparent" />
                <Area type="monotone" dataKey="p05" stroke="none" fill="transparent" />
                <Line type="monotone" dataKey="mean" stroke="#ffffff" strokeWidth={2} dot={{ r: 4, fill: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Projection Details Table */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>Projection Details</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { px: 2, py: 1.5, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)' }, '& th:first-of-type, & td:first-of-type': { textAlign: 'left' } }}>
                <thead>
                  <tr>
                    {['Horizon', 'Mean', 'Median', 'P5 (Bear)', 'P25', 'P75', 'P95 (Bull)', 'Return'].map(h => (
                      <Box component="th" key={h} sx={{ fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>{h}</Box>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['1M', '6M', '1Y', '5Y'].filter(k => projections[k]).map(k => {
                    const p = projections[k];
                    return (
                      <tr key={k}>
                        <Box component="td" sx={{ fontWeight: 600 }}>{k}</Box>
                        <Box component="td">${p.mean?.toFixed(2)}</Box>
                        <Box component="td">${p.median?.toFixed(2)}</Box>
                        <Box component="td" sx={{ color: colors.bad }}>${p.p05?.toFixed(2)}</Box>
                        <Box component="td">${p.p25?.toFixed(2)}</Box>
                        <Box component="td">${p.p75?.toFixed(2)}</Box>
                        <Box component="td" sx={{ color: colors.good }}>${p.p95?.toFixed(2)}</Box>
                        <Box component="td" sx={{ color: (p.return_pct || 0) >= 0 ? colors.good : colors.bad, fontWeight: 600 }}>
                          {(p.return_pct || 0) >= 0 ? '+' : ''}{(p.return_pct || 0).toFixed(1)}%
                        </Box>
                      </tr>
                    );
                  })}
                </tbody>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StockTracker;