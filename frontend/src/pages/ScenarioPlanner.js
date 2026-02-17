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
import { COLORS } from '../theme/darkTheme';
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
      color: COLORS.crimson,
    },
    fed_pivot: {
      name: 'Fed Pivot',
      description: 'Fed cuts rates aggressively due to recession fears',
      color: COLORS.emerald,
    },
    ai_bubble_burst: {
      name: 'AI Bubble Burst',
      description: 'AI hype collapses, tech sector crashes',
      color: COLORS.amber,
    },
    trade_war: {
      name: 'Trade War Escalation',
      description: 'Escalating US-China tariffs hurt global trade',
      color: COLORS.amber,
    },
    soft_landing: {
      name: 'Soft Landing',
      description: 'Fed engineers soft landing, economy grows steadily',
      color: COLORS.indigo,
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'transparent', color: COLORS.textPrimary }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: COLORS.textPrimary }}>
          SCENARIO PLANNER
        </Typography>

        {/* Controls */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
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
                    color: COLORS.textPrimary,
                    '& fieldset': { borderColor: COLORS.borderSubtle },
                    '&:hover fieldset': { borderColor: COLORS.borderActive },
                    '&.Mui-focused fieldset': { borderColor: COLORS.emerald },
                  },
                  '& .MuiInputLabel-root': { color: COLORS.textSecondary },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: COLORS.textSecondary }}>Scenario</InputLabel>
                <Select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  label="Scenario"
                  sx={{
                    color: COLORS.textPrimary,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.borderSubtle },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.borderActive },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.emerald },
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
                  bgcolor: COLORS.emerald,
                  color: '#000',
                  fontWeight: 'bold',
                  height: '56px',
                  '&:hover': { bgcolor: '#00a37a' },
                }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'RUN SCENARIO'}
              </Button>
            </Grid>
          </Grid>

          {/* Scenario Description */}
          {scenario && scenarios[scenario] && (
            <Box sx={{ mt: 2, p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                <strong>{scenarios[scenario].name}:</strong> {scenarios[scenario].description}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Loading */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress sx={{ color: COLORS.emerald }} />
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
              <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  Current Price
                </Typography>
                <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold', color: COLORS.textPrimary }}>
                  ${data.current_price?.toFixed(2) || '0.00'}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  Expected Price
                </Typography>
                <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold', color: COLORS.emerald }}>
                  ${data.expected_price?.toFixed(2) || '0.00'}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  Expected Return
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    my: 1,
                    fontWeight: 'bold',
                    color: data.expected_return >= 0 ? COLORS.emerald : COLORS.crimson,
                  }}
                >
                  {data.expected_return >= 0 ? '+' : ''}
                  {(data.expected_return * 100).toFixed(1)}%
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  Scenario Probability
                </Typography>
                <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold', color: COLORS.amber }}>
                  {(data.probability * 100).toFixed(0)}%
                </Typography>
              </Paper>
            </Grid>

            {/* Confidence Intervals */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                <Typography variant="h6" sx={{ mb: 2, color: COLORS.textPrimary }}>
                  95% Confidence Interval
                </Typography>
                <Box sx={{ p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1, mb: 1 }}>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Pessimistic (5th percentile)
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.crimson }}>
                    ${data.confidence_95_low?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Optimistic (95th percentile)
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.emerald }}>
                    ${data.confidence_95_high?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                <Typography variant="h6" sx={{ mb: 2, color: COLORS.textPrimary }}>
                  Scenario Details
                </Typography>
                <Box sx={{ p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1, mb: 1 }}>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Duration
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.textPrimary }}>
                    {data.duration_days} days
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Median Outcome
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.emerald }}>
                    ${data.median_price?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Projection Chart */}
            {chartData.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                  <Typography variant="h6" sx={{ mb: 2, color: COLORS.textPrimary }}>
                    Price Projection - {scenarios[scenario]?.name}
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderSubtle} vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke={COLORS.textMuted}
                        tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis
                        stroke={COLORS.textMuted}
                        tick={{ fill: COLORS.textMuted }}
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `$${val.toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: COLORS.bgElevated, border: `1px solid ${COLORS.borderSubtle}`, color: COLORS.textPrimary }}
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
                      <Legend wrapperStyle={{ color: COLORS.textSecondary }} />

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
                        fill={COLORS.bgDeep}
                        fillOpacity={1}
                        name="5th Percentile"
                      />

                      {/* Mean Line */}
                      <Line
                        type="monotone"
                        dataKey="mean"
                        stroke={COLORS.indigo}
                        strokeWidth={3}
                        dot={false}
                        name="Expected Price"
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  <Box sx={{ mt: 2, p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
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
          <Paper sx={{ p: 5, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1, color: COLORS.textSecondary }}>
              Ready to run scenario analysis
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
              Select a ticker and scenario, then click "RUN SCENARIO"
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ScenarioPlanner;
