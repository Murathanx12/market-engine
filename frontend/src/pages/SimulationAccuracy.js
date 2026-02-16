import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { useQuery } from '@tanstack/react-query';
import { getAccuracyHistory, startBacktest, getBacktestJobStatus } from '../services/api';
import RegimeBanner from '../components/RegimeBanner';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimelineIcon from '@mui/icons-material/Timeline';

const SimulationAccuracy = () => {
  const [view, setView] = useState('monthly'); // 'monthly' or 'backtest'
  const [backtestYear, setBacktestYear] = useState(2010);

  // Fetch monthly accuracy
  const { data: accuracyData, isLoading: accuracyLoading, error: accuracyError } = useQuery({
    queryKey: ['accuracyHistory'],
    queryFn: getAccuracyHistory,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const [backtestData, setBacktestData] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestError, setBacktestError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId;

    const runBacktest = async () => {
      if (view !== 'backtest') return;
      setBacktestLoading(true);
      setBacktestError(null);
      setBacktestData(null);

      try {
        const { job_id } = await startBacktest(backtestYear);
        intervalId = setInterval(async () => {
          try {
            const status = await getBacktestJobStatus(job_id);
            if (status.state === 'SUCCESS') {
              clearInterval(intervalId);
              if (!cancelled) {
                setBacktestData(status.result);
                setBacktestLoading(false);
              }
            }
            if (status.state === 'FAILURE') {
              clearInterval(intervalId);
              if (!cancelled) {
                setBacktestError(new Error(status.error || 'Backtest failed'));
                setBacktestLoading(false);
              }
            }
          } catch (pollErr) {
            clearInterval(intervalId);
            if (!cancelled) {
              setBacktestError(pollErr);
              setBacktestLoading(false);
            }
          }
        }, 2000);
      } catch (err) {
        if (!cancelled) {
          setBacktestError(err);
          setBacktestLoading(false);
        }
      }
    };

    runBacktest();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [view, backtestYear]);

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  // Calculate aggregate stats from accuracy data
  const aggregateStats = React.useMemo(() => {
    if (!accuracyData || !Array.isArray(accuracyData)) return null;

    const totalPredictions = accuracyData.reduce((sum, d) => sum + (d.predictions || 0), 0);
    const avgAccuracy = accuracyData.reduce((sum, d) => sum + (d.accuracy || 0), 0) / accuracyData.length;
    const minAccuracy = Math.min(...accuracyData.map(d => d.accuracy || 0));
    const maxAccuracy = Math.max(...accuracyData.map(d => d.accuracy || 0));

    return {
      totalPredictions,
      avgAccuracy,
      minAccuracy,
      maxAccuracy,
    };
  }, [accuracyData]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff' }}>
      <RegimeBanner />

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          ACCURACY TRACKING
        </Typography>

        {/* View Selector */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#111', border: '1px solid #333' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select View
          </Typography>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={handleViewChange}
            sx={{
              '& .MuiToggleButton-root': {
                color: '#888',
                borderColor: '#444',
                '&.Mui-selected': {
                  bgcolor: '#00d4ff',
                  color: '#000',
                  fontWeight: 'bold',
                  '&:hover': { bgcolor: '#00b8e6' },
                },
              },
            }}
          >
            <ToggleButton value="monthly">
              <CheckCircleIcon sx={{ mr: 1 }} />
              Monthly Accuracy
            </ToggleButton>
            <ToggleButton value="backtest">
              <TimelineIcon sx={{ mr: 1 }} />
              Historical Backtest (2000-Present)
            </ToggleButton>
          </ToggleButtonGroup>

          {view === 'backtest' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Start Year
              </Typography>
              <ToggleButtonGroup
                value={backtestYear}
                exclusive
                onChange={(e, val) => val && setBacktestYear(val)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    color: '#888',
                    borderColor: '#444',
                    fontSize: '0.75rem',
                    '&.Mui-selected': {
                      bgcolor: '#00d4ff',
                      color: '#000',
                      fontWeight: 'bold',
                    },
                  },
                }}
              >
                <ToggleButton value={2000}>2000</ToggleButton>
                <ToggleButton value={2005}>2005</ToggleButton>
                <ToggleButton value={2010}>2010</ToggleButton>
                <ToggleButton value={2015}>2015</ToggleButton>
                <ToggleButton value={2020}>2020</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
        </Paper>

        {/* MONTHLY ACCURACY VIEW */}
        {view === 'monthly' && (
          <>
            {/* Loading */}
            {accuracyLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
                <CircularProgress sx={{ color: '#00d4ff' }} />
              </Box>
            )}

            {/* Error */}
            {accuracyError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Error loading accuracy data: {accuracyError.message}
              </Alert>
            )}

            {/* Stats Cards */}
            {aggregateStats && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                    <Typography variant="overline" color="text.secondary">
                      Average Accuracy
                    </Typography>
                    <Typography variant="h3" sx={{ my: 1, fontWeight: 'bold', color: '#00e676' }}>
                      {aggregateStats.avgAccuracy.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                    <Typography variant="overline" color="text.secondary">
                      Best Month
                    </Typography>
                    <Typography variant="h3" sx={{ my: 1, fontWeight: 'bold', color: '#00d4ff' }}>
                      {aggregateStats.maxAccuracy.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                    <Typography variant="overline" color="text.secondary">
                      Worst Month
                    </Typography>
                    <Typography variant="h3" sx={{ my: 1, fontWeight: 'bold', color: '#ff1744' }}>
                      {aggregateStats.minAccuracy.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                    <Typography variant="overline" color="text.secondary">
                      Total Predictions
                    </Typography>
                    <Typography variant="h3" sx={{ my: 1, fontWeight: 'bold' }}>
                      {aggregateStats.totalPredictions}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Accuracy Chart */}
            {accuracyData && Array.isArray(accuracyData) && (
              <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Monthly Accuracy Trend
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={[...accuracyData].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#666"
                      tick={{ fill: '#666', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      stroke="#666"
                      tick={{ fill: '#666' }}
                      domain={[0, 100]}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                      labelStyle={{ color: '#888' }}
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Accuracy']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#00e676"
                      strokeWidth={3}
                      dot={{ fill: '#00e676', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Accuracy %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            )}
          </>
        )}

        {/* BACKTEST VIEW */}
        {view === 'backtest' && (
          <>
            {/* Loading */}
            {backtestLoading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 10 }}>
                <CircularProgress sx={{ color: '#00d4ff', mb: 2 }} size={60} />
                <Typography variant="body1" color="text.secondary">
                  Running walk-forward backtest...
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  This may take 30-60 seconds
                </Typography>
              </Box>
            )}

            {/* Error */}
            {backtestError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Error running backtest: {backtestError.message}
                <br />
                <Typography variant="caption">
                  This computation is intensive. Try a later start year.
                </Typography>
              </Alert>
            )}

            {/* Backtest Results */}
            {backtestData && !backtestLoading && (
              <>
                {/* Stats */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                      <Typography variant="overline" color="text.secondary">
                        RMSE
                      </Typography>
                      <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold', color: '#00d4ff' }}>
                        {backtestData.rmse?.toFixed(2) || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Root Mean Square Error
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                      <Typography variant="overline" color="text.secondary">
                        Directional Accuracy
                      </Typography>
                      <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold', color: '#00e676' }}>
                        {backtestData.directional_accuracy?.toFixed(1) || 'N/A'}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Predicted direction correctly
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                      <Typography variant="overline" color="text.secondary">
                        MAE
                      </Typography>
                      <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold' }}>
                        {backtestData.mae?.toFixed(2) || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Mean Absolute Error
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                      <Typography variant="overline" color="text.secondary">
                        Data Points
                      </Typography>
                      <Typography variant="h4" sx={{ my: 1, fontWeight: 'bold' }}>
                        {backtestData.data_points || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Predictions evaluated
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* The Big Chart: Predicted vs Actual */}
                {backtestData.backtest_data && Array.isArray(backtestData.backtest_data) && (
                  <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333', mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Model Predictions vs Market Reality ({backtestYear}-Present)
                      </Typography>
                      <Chip
                        label={`${backtestData.backtest_data.length} predictions`}
                        size="small"
                        sx={{ bgcolor: '#1a1a1a', color: '#888' }}
                      />
                    </Box>
                    <ResponsiveContainer width="100%" height={500}>
                      <AreaChart data={backtestData.backtest_data}>
                        <defs>
                          <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#666"
                          tick={{ fill: '#666', fontSize: 11 }}
                          minTickGap={50}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.getFullYear().toString();
                          }}
                        />
                        <YAxis
                          stroke="#666"
                          tick={{ fill: '#666' }}
                          domain={['auto', 'auto']}
                          tickFormatter={(val) => `$${val.toFixed(0)}`}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                          labelStyle={{ color: '#888' }}
                          formatter={(value, name) => [
                            `$${value.toFixed(2)}`,
                            name === 'actual' ? 'Market Reality' : 'Engine Prediction'
                          ]}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          height={36}
                          wrapperStyle={{ color: '#fff' }}
                        />
                        
                        {/* Actual Price - The Truth */}
                        <Area
                          name="Market Reality (S&P 500)"
                          type="monotone"
                          dataKey="actual"
                          stroke="#ffffff"
                          strokeWidth={2}
                          fill="transparent"
                          dot={false}
                        />
                        
                        {/* Predicted Price - Our Model */}
                        <Area
                          name="Engine Prediction"
                          type="monotone"
                          dataKey="predicted"
                          stroke="#00d4ff"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorPredicted)"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>

                    <Box sx={{ mt: 2, p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>How to read this chart:</strong> The white line shows actual S&P 500 prices. 
                        The cyan area shows what our model would have predicted at each point in history using 
                        only data available at that time. Larger gaps indicate periods where the model struggled 
                        (often during major market crashes like 2008 and 2020).
                      </Typography>
                    </Box>
                  </Paper>
                )}

                {/* Error Over Time */}
                {backtestData.backtest_data && Array.isArray(backtestData.backtest_data) && (
                  <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333' }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Prediction Error Over Time
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart 
                        data={backtestData.backtest_data.map(d => ({
                          ...d,
                          error: Math.abs(d.predicted - d.actual)
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#666"
                          tick={{ fill: '#666', fontSize: 11 }}
                          minTickGap={50}
                          tickFormatter={(value) => new Date(value).getFullYear().toString()}
                        />
                        <YAxis
                          stroke="#666"
                          tick={{ fill: '#666' }}
                          tickFormatter={(val) => `$${val.toFixed(0)}`}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                          formatter={(value) => [`$${value.toFixed(2)}`, 'Absolute Error']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Line
                          type="monotone"
                          dataKey="error"
                          stroke="#ff1744"
                          strokeWidth={2}
                          dot={false}
                          name="Prediction Error"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        This shows how far off our predictions were. Spikes indicate major market events 
                        that the model failed to predict accurately (e.g., 2008 financial crisis, 2020 COVID crash).
                      </Typography>
                    </Box>
                  </Paper>
                )}
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default SimulationAccuracy;
