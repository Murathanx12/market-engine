import React from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { useQuery } from '@tanstack/react-query';
import { getCrashEstimator } from '../services/api';
import { COLORS } from '../theme/darkTheme';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import WarningIcon from '@mui/icons-material/Warning';

const CrashEstimator = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['crashEstimator'],
    queryFn: () => getCrashEstimator(60),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Transform monthly probabilities for chart
  const chartData = React.useMemo(() => {
    if (!data?.monthly_probabilities) return [];

    return data.monthly_probabilities.map((item) => ({
      month: item.month,
      probability: item.probability, // Already in percentage from backend
    }));
  }, [data]);

  // Find peak risk month
  const peakMonth = React.useMemo(() => {
    if (!chartData.length) return null;
    return chartData.reduce((max, curr) =>
      curr.probability > max.probability ? curr : max
    );
  }, [chartData]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.bgVoid, color: COLORS.textPrimary }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: COLORS.textPrimary }}>
          CRASH TIMELINE & ESTIMATOR
        </Typography>

        {/* Loading */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress sx={{ color: COLORS.emerald }} />
          </Box>
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error loading crash estimator: {error.message}
          </Alert>
        )}

        {/* Results */}
        {data && !isLoading && (
          <Grid container spacing={3}>
            {/* Key Metrics */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  1-Year Crash Probability
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    my: 2,
                    fontWeight: 'bold',
                    color: data.total_crash_probability_1y > 0.5 ? COLORS.crimson : data.total_crash_probability_1y > 0.3 ? COLORS.amber : COLORS.emerald,
                  }}
                >
                  {(data.total_crash_probability_1y * 100).toFixed(1)}%
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  5-Year Crash Probability
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    my: 2,
                    fontWeight: 'bold',
                    color: COLORS.amber,
                  }}
                >
                  {(data.total_crash_probability_5y * 100).toFixed(1)}%
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  Peak Risk Month
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    my: 2,
                    fontWeight: 'bold',
                    color: COLORS.crimson,
                  }}
                >
                  {data.peak_risk_month || 'N/A'}
                </Typography>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  Months from now
                </Typography>
              </Paper>
            </Grid>

            {/* Contributing Factors */}
            {data.contributing_factors && data.contributing_factors.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: COLORS.textPrimary }}>
                    <WarningIcon sx={{ color: COLORS.amber }} />
                    Contributing Risk Factors
                  </Typography>
                  <Grid container spacing={2}>
                    {data.contributing_factors.map((factor, idx) => (
                      <Grid size={{ xs: 12, md: 6 }} key={idx}>
                        <Box sx={{ p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: COLORS.textPrimary }}>
                              {factor.factor}
                            </Typography>
                            <Chip
                              label={`${(factor.weight * 100).toFixed(0)}%`}
                              size="small"
                              sx={{
                                bgcolor: factor.weight > 0.3 ? COLORS.crimsonDim : factor.weight > 0.15 ? COLORS.amberDim : COLORS.bgHighlight,
                                color: factor.weight > 0.3 ? COLORS.crimson : factor.weight > 0.15 ? COLORS.amber : COLORS.textSecondary,
                                fontWeight: 'bold',
                              }}
                            />
                          </Box>
                          <Box
                            sx={{
                              width: '100%',
                              height: '8px',
                              bgcolor: COLORS.bgDeep,
                              borderRadius: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                width: `${factor.weight * 100}%`,
                                height: '100%',
                                bgcolor: factor.weight > 0.3 ? COLORS.crimson : factor.weight > 0.15 ? COLORS.amber : COLORS.textMuted,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Timeline Chart */}
            {chartData.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                  <Typography variant="h6" sx={{ mb: 2, color: COLORS.textPrimary }}>
                    Crash Probability Timeline (Next 60 Months)
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCrash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.crimson} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={COLORS.crimson} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderSubtle} vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke={COLORS.textMuted}
                        tick={{ fill: COLORS.textMuted, fontSize: 12 }}
                        label={{ value: 'Months from Now', position: 'insideBottom', offset: -5, fill: COLORS.textSecondary }}
                      />
                      <YAxis
                        stroke={COLORS.textMuted}
                        tick={{ fill: COLORS.textMuted }}
                        domain={[0, 100]}
                        tickFormatter={(val) => `${val}%`}
                        label={{ value: 'Crash Probability', angle: -90, position: 'insideLeft', fill: COLORS.textSecondary }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: COLORS.bgElevated, border: `1px solid ${COLORS.borderSubtle}`, color: COLORS.textPrimary }}
                        formatter={(value) => [`${value.toFixed(1)}%`, 'Crash Probability']}
                        labelFormatter={(label) => `Month ${label}`}
                      />
                      <Legend wrapperStyle={{ color: COLORS.textSecondary }} />
                      <Area
                        type="monotone"
                        dataKey="probability"
                        stroke={COLORS.crimson}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCrash)"
                        name="Crash Probability (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {peakMonth && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                        <strong>Peak Risk:</strong> Month {peakMonth.month} shows the highest crash probability
                        at {peakMonth.probability.toFixed(1)}%. The model estimates elevated risk during this period
                        based on current market conditions and historical patterns.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default CrashEstimator;
