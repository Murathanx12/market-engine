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
import RegimeBanner from '../components/RegimeBanner';
import {
  LineChart,
  Line,
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
      probability: item.probability * 100, // Convert to percentage
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff' }}>
      <RegimeBanner />

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          CRASH TIMELINE & ESTIMATOR
        </Typography>

        {/* Loading */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress sx={{ color: '#00d4ff' }} />
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
              <Paper sx={{ p: 4, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  1-Year Crash Probability
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    my: 2,
                    fontWeight: 'bold',
                    color: data.total_crash_probability_1y > 0.5 ? '#ff1744' : data.total_crash_probability_1y > 0.3 ? '#ffc107' : '#00e676',
                  }}
                >
                  {(data.total_crash_probability_1y * 100).toFixed(1)}%
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  5-Year Crash Probability
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    my: 2,
                    fontWeight: 'bold',
                    color: '#ffc107',
                  }}
                >
                  {(data.total_crash_probability_5y * 100).toFixed(1)}%
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Peak Risk Month
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    my: 2,
                    fontWeight: 'bold',
                    color: '#ff1744',
                  }}
                >
                  {data.peak_risk_month || 'N/A'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Months from now
                </Typography>
              </Paper>
            </Grid>

            {/* Contributing Factors */}
            {data.contributing_factors && data.contributing_factors.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333' }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon sx={{ color: '#ffc107' }} />
                    Contributing Risk Factors
                  </Typography>
                  <Grid container spacing={2}>
                    {data.contributing_factors.map((factor, idx) => (
                      <Grid size={{ xs: 12, md: 6 }} key={idx}>
                        <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              {factor.factor}
                            </Typography>
                            <Chip
                              label={`${(factor.weight * 100).toFixed(0)}%`}
                              size="small"
                              sx={{
                                bgcolor: factor.weight > 0.3 ? '#ff1744' : factor.weight > 0.15 ? '#ffc107' : '#888',
                                color: '#fff',
                                fontWeight: 'bold',
                              }}
                            />
                          </Box>
                          <Box
                            sx={{
                              width: '100%',
                              height: '8px',
                              bgcolor: '#0a0a0a',
                              borderRadius: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                width: `${factor.weight * 100}%`,
                                height: '100%',
                                bgcolor: factor.weight > 0.3 ? '#ff1744' : factor.weight > 0.15 ? '#ffc107' : '#888',
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
                <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Crash Probability Timeline (Next 60 Months)
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCrash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff1744" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ff1744" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke="#666"
                        tick={{ fill: '#666', fontSize: 12 }}
                        label={{ value: 'Months from Now', position: 'insideBottom', offset: -5, fill: '#666' }}
                      />
                      <YAxis
                        stroke="#666"
                        tick={{ fill: '#666' }}
                        domain={[0, 100]}
                        tickFormatter={(val) => `${val}%`}
                        label={{ value: 'Crash Probability', angle: -90, position: 'insideLeft', fill: '#666' }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                        formatter={(value) => [`${value.toFixed(1)}%`, 'Crash Probability']}
                        labelFormatter={(label) => `Month ${label}`}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="probability"
                        stroke="#ff1744"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCrash)"
                        name="Crash Probability (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {peakMonth && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
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
