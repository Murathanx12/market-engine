import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { useQuery } from '@tanstack/react-query';
import { getAnalysis } from '../services/api';
import { COLORS } from '../theme/darkTheme';
import useMarketStatus from '../hooks/useMarketStatus';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const AnalysisPage = () => {
  const [timeframe, setTimeframe] = useState('week');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis', timeframe],
    queryFn: () => getAnalysis(timeframe),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: marketStatusData } = useMarketStatus();

  const handleTimeframeChange = (event, newTimeframe) => {
    if (newTimeframe !== null) {
      setTimeframe(newTimeframe);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.bgVoid, color: COLORS.textPrimary }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: COLORS.textPrimary }}>
          MARKET ANALYSIS
        </Typography>

        {/* Timeframe Selector */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
          <Typography variant="body2" sx={{ mb: 2, color: COLORS.textSecondary }}>
            Select Analysis Period
          </Typography>
          <ToggleButtonGroup
            value={timeframe}
            exclusive
            onChange={handleTimeframeChange}
            sx={{
              '& .MuiToggleButton-root': {
                color: COLORS.textMuted,
                borderColor: COLORS.borderSubtle,
                '&.Mui-selected': {
                  bgcolor: COLORS.emerald,
                  color: '#000',
                  fontWeight: 'bold',
                  '&:hover': { bgcolor: '#00a37a' },
                },
              },
            }}
          >
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="3m">3 Months</ToggleButton>
            <ToggleButton value="6m">6 Months</ToggleButton>
            <ToggleButton value="1y">1 Year</ToggleButton>
            <ToggleButton value="5y">5 Years</ToggleButton>
          </ToggleButtonGroup>
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
            Error loading analysis: {error.message}
          </Alert>
        )}

        {/* Analysis Data */}
        {data && !isLoading && (
          <Grid container spacing={3}>
            {/* S&P 500 Performance */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  S&P 500 Performance
                </Typography>
                <Typography variant="h2" sx={{ my: 2, fontWeight: 'bold', color: COLORS.emerald }}>
                  {data.sp500?.current?.toFixed(2) || '0.00'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  {data.sp500?.return_pct >= 0 ? (
                    <TrendingUpIcon sx={{ color: COLORS.emerald }} />
                  ) : (
                    <TrendingDownIcon sx={{ color: COLORS.crimson }} />
                  )}
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 'bold',
                      color: data.sp500?.return_pct >= 0 ? COLORS.emerald : COLORS.crimson,
                    }}
                  >
                    {data.sp500?.return_pct >= 0 ? '+' : ''}
                    {data.sp500?.return_pct?.toFixed(2)}%
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ mt: 2, display: 'block', color: COLORS.textSecondary }}>
                  Period: {timeframe.toUpperCase()}
                </Typography>
              </Paper>
            </Grid>

            {/* Market Regime */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  Current Regime
                </Typography>
                <Typography variant="h3" sx={{ my: 2, fontWeight: 'bold', textTransform: 'uppercase', color: COLORS.textPrimary }}>
                  {marketStatusData?.data?.regime || 'UNKNOWN'}
                </Typography>
                <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                  Unified regime from /api/market-status
                </Typography>
              </Paper>
            </Grid>

            {/* Prediction Accuracy */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  Model Accuracy
                </Typography>
                <Typography variant="h2" sx={{ my: 2, fontWeight: 'bold', color: COLORS.emerald }}>
                  {data.prediction_accuracy?.toFixed(1) || '0.0'}%
                </Typography>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  Directional Accuracy
                </Typography>
              </Paper>
            </Grid>

            {/* Summary */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                <Typography variant="h6" sx={{ mb: 2, color: COLORS.textPrimary }}>
                  Market Summary
                </Typography>
                <Typography variant="body1" sx={{ color: COLORS.textSecondary, lineHeight: 1.8 }}>
                  {data.summary || data.explanation || 'No summary available'}
                </Typography>
              </Paper>
            </Grid>

            {/* Top Gainers */}
            {data.top_gainers && data.top_gainers.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: COLORS.textPrimary }}>
                    <TrendingUpIcon sx={{ color: COLORS.emerald }} />
                    Top Gainers
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>Ticker</TableCell>
                          <TableCell align="right" sx={{ color: COLORS.textMuted, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>Price</TableCell>
                          <TableCell align="right" sx={{ color: COLORS.textMuted, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>Return</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.top_gainers.map((stock, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ color: COLORS.textPrimary, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                              {stock.ticker}
                            </TableCell>
                            <TableCell align="right" sx={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                              ${stock.current_price?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell align="right" sx={{ color: COLORS.emerald, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                              +{stock.return_pct?.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            )}

            {/* Top Losers */}
            {data.top_losers && data.top_losers.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: COLORS.textPrimary }}>
                    <TrendingDownIcon sx={{ color: COLORS.crimson }} />
                    Top Losers
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>Ticker</TableCell>
                          <TableCell align="right" sx={{ color: COLORS.textMuted, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>Price</TableCell>
                          <TableCell align="right" sx={{ color: COLORS.textMuted, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>Return</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.top_losers.map((stock, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ color: COLORS.textPrimary, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                              {stock.ticker}
                            </TableCell>
                            <TableCell align="right" sx={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                              ${stock.current_price?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell align="right" sx={{ color: COLORS.crimson, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
                              {stock.return_pct?.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default AnalysisPage;
