import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid as Grid,
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { getStockProjection } from '../services/api';

const colors = {
  good: '#4caf50',
  bad: '#ef5350',
  info: '#64b5f6',
  warning: '#ffa726',
  muted: '#888888',
  accent: '#ffffff',
};

function MetricCard({ title, value, subtitle, color = colors.accent }) {
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
    </Card>
  );
}

const StockTracker = () => {
  const [ticker, setTicker] = useState('NVDA');
  const [inputTicker, setInputTicker] = useState('NVDA');

  const { data, isLoading, error } = useQuery({
    queryKey: ['stock', ticker],
    queryFn: () => getStockProjection(ticker),
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
      <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.08)', color: colors.bad }}>
        Error: {error?.message || 'Unknown error'}
      </Alert>
    );
  }

  const currentPrice = data?.current_price ?? 0;
  const proj1Y = data?.projections?.['365d'] ?? 0;
  const change1Y = currentPrice > 0 ? ((proj1Y - currentPrice) / currentPrice * 100) : 0;

  const chartData = [
    { period: 'Current', price: currentPrice },
    { period: '1M', price: data?.projections?.['30d'] ?? currentPrice },
    { period: '6M', price: data?.projections?.['180d'] ?? currentPrice },
    { period: '1Y', price: data?.projections?.['365d'] ?? currentPrice },
    { period: '5Y', price: data?.projections?.['1825d'] ?? currentPrice },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
          Stock Tracker
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          AI-powered stock price projections
        </Typography>
      </Box>

      <Card sx={{ p: 2.5, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box display="flex" gap={2}>
            <TextField
              placeholder="Enter ticker (e.g., NVDA, AAPL)"
              value={inputTicker}
              onChange={(e) => setInputTicker(e.target.value)}
              size="small"
              sx={{ width: 260 }}
            />
            <Button type="submit" variant="contained" sx={{ px: 3 }}>
              Track Stock
            </Button>
          </Box>
        </form>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Current Price"
            value={`$${currentPrice.toFixed(2)}`}
            subtitle={ticker}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="1Y Projection"
            value={`$${proj1Y.toFixed(2)}`}
            color={change1Y >= 0 ? colors.good : colors.bad}
            subtitle={`${change1Y >= 0 ? '+' : ''}${change1Y.toFixed(1)}% expected`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Analyst Target"
            value={data?.analyst_target ? `$${data.analyst_target.toFixed(2)}` : 'N/A'}
            color={colors.info}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Volatility"
            value={`${((data?.volatility ?? 0) * 100).toFixed(1)}%`}
            color={colors.warning}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 3 }}>
              Price Projections
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" stroke="#555" />
                <YAxis stroke="#555" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#e8e8e8',
                  }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
                />
                <Area type="monotone" dataKey="price" stroke="#ffffff" strokeWidth={2} fill="url(#priceGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StockTracker;
