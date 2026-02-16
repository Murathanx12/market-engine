import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { useQuery } from '@tanstack/react-query';
import { runScenario } from '../services/api';
import RegimeBanner from '../components/RegimeBanner';
import {
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const ScenarioPlanner = () => {
  const [ticker, setTicker] = useState('SPY');
  const [scenario, setScenario] = useState('taiwan_conflict');
  const [runTrigger, setRunTrigger] = useState(0);

  const scenarios = {
    taiwan_conflict: {
      name: 'Taiwan Conflict',
      description: 'China invades Taiwan, causing global supply chain disruption',
      color: 'error.main',
    },
    fed_pivot: {
      name: 'Fed Pivot',
      description: 'Fed cuts rates aggressively due to recession fears',
      color: 'success.main',
    },
    ai_bubble_burst: {
      name: 'AI Bubble Burst',
      description: 'AI hype collapses, tech sector crashes',
      color: '#ff5722',
    },
    trade_war: {
      name: 'Trade War Escalation',
      description: 'Escalating US-China tariffs hurt global trade',
      color: 'warning.main',
    },
    soft_landing: {
      name: 'Soft Landing',
      description: 'Fed engineers soft landing, economy grows steadily',
      color: 'primary.main',
    },
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['scenario', ticker, scenario, runTrigger],
    queryFn: () => runScenario(ticker, scenario),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: runTrigger > 0, // Only run when triggered
  });

  const handleRun = () => {
    setRunTrigger(prev => prev + 1);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRun();
    }
  };

  // Transform projection data for chart
  const chartData = React.useMemo(() => {
    if (!data?.projection?.dates) return [];
    
    return data.projection.dates.map((date, idx) => ({
      date,
      mean: data.projection.mean[idx],
      p05: data.projection.p05[idx],
      p95: data.projection.p95[idx],
    }));
  }, [data]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'transparent', color: 'text.primary' }}>
      <RegimeBanner />

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          SCENARIO PLANNER
        </Typography>

        {/* Controls */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Ticker Symbol"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="e.g., SPY, AAPL"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'text.secondary' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'text.secondary' }}>Scenario</InputLabel>
                <Select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  label="Scenario"
                  sx={{
                    color: 'text.primary',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'text.secondary' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                  }}
                >
                  {Object.entries(scenarios).map(([key, s]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: s.color,
                          }}
                        />
                        {s.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handleRun}
                disabled={isLoading}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'common.white',
                  fontWeight: 'bold',
                  height: '56px',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'RUN SCENARIO'}
              </Button>
            </Grid>
          </Grid>

          {/* Scenario Description */}
          {scenario && scenarios[scenario] && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                <strong>{scenarios[scenario].name}:</strong> {scenarios[scenario].description}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Loading */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error running scenario: {error.message}
          </Alert>
        )}

        {/* Results */}
        {data && !isLoading && (
          <Grid container spacing={3}>
            {/* Key Metrics */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Current Price
                </Typography>
                <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold', color: 'text.primary' }}>
                  ${data.current_price?.toFixed(2) || '0.00'}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Expected Price
                </Typography>
                <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold', color: 'primary.main' }}>
                  ${data.expected_price?.toFixed(2) || '0.00'}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Expected Return
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    my: 1,
                    fontWeight: 'bold',
                    color: data.expected_return >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {data.expected_return >= 0 ? '+' : ''}
                  {(data.expected_return * 100).toFixed(1)}%
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Scenario Probability
                </Typography>
                <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold', color: 'warning.main' }}>
                  {(data.probability * 100).toFixed(0)}%
                </Typography>
              </Paper>
            </Grid>

            {/* Confidence Intervals */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  95% Confidence Interval
                </Typography>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Pessimistic (5th percentile)
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    ${data.confidence_95_low?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Optimistic (95th percentile)
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    ${data.confidence_95_high?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Scenario Details
                </Typography>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {data.duration_days} days
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Median Outcome
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    ${data.median_price?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Projection Chart */}
            {chartData.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Price Projection - {scenarios[scenario]?.name}
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#64748b' }}
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `$${val.toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                        formatter={(value, name) => {
                          const labels = {
                            mean: 'Expected Price',
                            p05: '5th Percentile',
                            p95: '95th Percentile',
                          };
                          return [`$${value.toFixed(2)}`, labels[name] || name];
                        }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Legend />
                      
                      {/* Confidence Band */}
                      <Area
                        type="monotone"
                        dataKey="p95"
                        stroke="none"
                        fill="url(#colorConfidence)"
                        fillOpacity={1}
                        name="95th Percentile"
                      />
                      <Area
                        type="monotone"
                        dataKey="p05"
                        stroke="none"
                        fill="#f4f7fb"
                        fillOpacity={1}
                        name="5th Percentile"
                      />
                      
                      {/* Mean Line */}
                      <Line
                        type="monotone"
                        dataKey="mean"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={false}
                        name="Expected Price"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      The shaded area represents the 90% confidence interval. 
                      The blue line shows the expected price path if this scenario unfolds.
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}

        {/* Initial State */}
        {!data && !isLoading && runTrigger === 0 && (
          <Paper sx={{ p: 5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              Ready to run scenario analysis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select a ticker and scenario, then click "RUN SCENARIO"
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ScenarioPlanner;
