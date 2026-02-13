import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, Grid, CircularProgress, Alert,
  TextField, Button, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Line,
} from 'recharts';
import { runScenario } from '../services/api';

const colors = { good: '#4caf50', bad: '#ef5350', info: '#64b5f6', warning: '#ffa726', muted: '#888', accent: '#fff' };

const SCENARIOS = {
  soft_landing: { label: 'Soft Landing', color: colors.good },
  fed_pivot: { label: 'Fed Pivot', color: colors.info },
  trade_war: { label: 'Trade War', color: colors.warning },
  taiwan_conflict: { label: 'Taiwan Conflict', color: colors.bad },
  ai_bubble_burst: { label: 'AI Bubble Burst', color: '#ab47bc' },
};

function MetricCard({ title, value, subtitle, color = colors.accent }) {
  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</Typography>
      <Typography sx={{ fontSize: '2rem', fontWeight: 700, color, lineHeight: 1.2 }}>{value}</Typography>
      {subtitle && <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>{subtitle}</Typography>}
    </Card>
  );
}

const ScenarioPlanner = () => {
  const [ticker, setTicker] = useState('SPY');
  const [inputTicker, setInputTicker] = useState('SPY');
  const [scenario, setScenario] = useState('soft_landing');

  const { data, isLoading, error } = useQuery({
    queryKey: ['scenario', ticker, scenario],
    queryFn: () => runScenario(ticker, scenario),
    staleTime: 300000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setTicker(inputTicker.toUpperCase());
  };

  // Build projection chart data
  const projData = [];
  if (data?.projection) {
    const proj = data.projection;
    const dates = proj.dates || [];
    const means = proj.mean || [];
    const p05s = proj.p05 || [];
    const p95s = proj.p95 || [];
    for (let i = 0; i < dates.length; i++) {
      projData.push({
        date: dates[i]?.slice(5) || `Day ${i}`,
        mean: means[i] || 0,
        p05: p05s[i] || 0,
        p95: p95s[i] || 0,
      });
    }
  }

  const expectedReturn = data?.expected_return || 0;
  const scenarioColor = SCENARIOS[scenario]?.color || colors.accent;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>Scenario Planner</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Simulate geopolitical and economic scenarios with Monte Carlo
        </Typography>
      </Box>

      {/* Controls */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12 }}>
            <TextField placeholder="Ticker" value={inputTicker} onChange={(e) => setInputTicker(e.target.value)} size="small" sx={{ width: 140 }} />
            <Button type="submit" variant="contained" sx={{ px: 3 }}>Apply</Button>
          </form>
          <ToggleButtonGroup
            value={scenario}
            exclusive
            onChange={(_, val) => val && setScenario(val)}
            size="small"
            sx={{
              flexWrap: 'wrap',
              '& .MuiToggleButton-root': {
                color: '#888', borderColor: 'rgba(255,255,255,0.1)', px: 1.5, fontSize: '0.78rem',
                '&.Mui-selected': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
              },
            }}
          >
            {Object.entries(SCENARIOS).map(([key, { label }]) => (
              <ToggleButton key={key} value={key}>{label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Card>

      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress sx={{ color: '#fff' }} /></Box>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>Error: {error?.message}</Alert>}

      {data && (
        <Grid container spacing={3}>
          {/* Scenario Description */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3, borderLeft: `4px solid ${scenarioColor}` }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 0.5 }}>{SCENARIOS[scenario]?.label || scenario}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem' }}>{data.description}</Typography>
            </Card>
          </Grid>

          {/* Metrics */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard title="Current Price" value={`$${(data.current_price || 0).toFixed(2)}`} subtitle={ticker} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="Expected Price"
              value={`$${(data.expected_price || 0).toFixed(2)}`}
              color={expectedReturn >= 0 ? colors.good : colors.bad}
              subtitle={`${expectedReturn >= 0 ? '+' : ''}${(expectedReturn * 100).toFixed(1)}% return`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="95% Range"
              value={`$${(data.confidence_95_low || 0).toFixed(0)} – $${(data.confidence_95_high || 0).toFixed(0)}`}
              color={colors.info}
              subtitle={`Duration: ${data.duration_days || 0} days`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="Scenario Probability"
              value={`${((data.probability || 0) * 100).toFixed(0)}%`}
              color={colors.warning}
              subtitle="Estimated likelihood"
            />
          </Grid>

          {/* Projection Fan Chart */}
          {projData.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Card sx={{ p: 3 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>Monte Carlo Projection – {SCENARIOS[scenario]?.label}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mb: 3 }}>
                  Shaded: 90% confidence interval · Line: Expected path
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={projData}>
                    <defs>
                      <linearGradient id="scenarioGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={scenarioColor} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={scenarioColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(projData.length / 10))} />
                    <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }}
                      formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === 'mean' ? 'Expected' : name.toUpperCase()]}
                    />
                    <Area type="monotone" dataKey="p95" stroke="none" fill="url(#scenarioGrad)" />
                    <Area type="monotone" dataKey="p05" stroke="none" fill="transparent" />
                    <Line type="monotone" dataKey="mean" stroke={scenarioColor} strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default ScenarioPlanner;