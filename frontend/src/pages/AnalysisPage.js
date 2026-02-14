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
import Grid from '@mui/material/Grid2'; // ✅ Grid2 migration
import { useQuery } from '@tanstack/react-query';
import { getAnalysis } from '../services/api';
import RegimeBanner from '../components/RegimeBanner';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const AnalysisPage = () => {
  const [timeframe, setTimeframe] = useState('week');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis', timeframe],
    queryFn: () => getAnalysis(timeframe),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleTimeframeChange = (event, newTimeframe) => {
    if (newTimeframe !== null) {
      setTimeframe(newTimeframe);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff' }}>
      <RegimeBanner />

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          MARKET ANALYSIS
        </Typography>

        {/* Timeframe Selector */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#111', border: '1px solid #333' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select Analysis Period
          </Typography>
          <ToggleButtonGroup
            value={timeframe}
            exclusive
            onChange={handleTimeframeChange}
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
            <CircularProgress sx={{ color: '#00d4ff' }} />
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
              <Paper sx={{ p: 4, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  S&P 500 Performance
                </Typography>
                <Typography variant="h2" sx={{ my: 2, fontWeight: 'bold', color: '#00d4ff' }}>
                  {data.sp500?.current?.toFixed(2) || '0.00'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  {data.sp500?.return_pct >= 0 ? (
                    <TrendingUpIcon sx={{ color: '#00e676' }} />
                  ) : (
                    <TrendingDownIcon sx={{ color: '#ff1744' }} />
                  )}
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 'bold',
                      color: data.sp500?.return_pct >= 0 ? '#00e676' : '#ff1744',
                    }}
                  >
                    {data.sp500?.return_pct >= 0 ? '+' : ''}
                    {data.sp500?.return_pct?.toFixed(2)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Period: {timeframe.toUpperCase()}
                </Typography>
              </Paper>
            </Grid>

            {/* Market Regime */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Current Regime
                </Typography>
                <Typography variant="h3" sx={{ my: 2, fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {data.regime || 'UNKNOWN'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Based on market conditions and volatility
                </Typography>
              </Paper>
            </Grid>

            {/* Prediction Accuracy */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Model Accuracy
                </Typography>
                <Typography variant="h2" sx={{ my: 2, fontWeight: 'bold', color: '#00e676' }}>
                  {data.prediction_accuracy?.toFixed(1) || '0.0'}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Directional Accuracy
                </Typography>
              </Paper>
            </Grid>

            {/* Summary */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Market Summary
                </Typography>
                <Typography variant="body1" sx={{ color: '#ccc', lineHeight: 1.8 }}>
                  {data.summary || data.explanation || 'No summary available'}
                </Typography>
              </Paper>
            </Grid>

            {/* Top Gainers */}
            {data.top_gainers && data.top_gainers.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333' }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon sx={{ color: '#00e676' }} />
                    Top Gainers
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#888', fontWeight: 'bold' }}>Ticker</TableCell>
                          <TableCell align="right" sx={{ color: '#888', fontWeight: 'bold' }}>Price</TableCell>
                          <TableCell align="right" sx={{ color: '#888', fontWeight: 'bold' }}>Return</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.top_gainers.map((stock, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                              {stock.ticker}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#888' }}>
                              ${stock.current_price?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#00e676', fontWeight: 'bold' }}>
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
                <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333' }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDownIcon sx={{ color: '#ff1744' }} />
                    Top Losers
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#888', fontWeight: 'bold' }}>Ticker</TableCell>
                          <TableCell align="right" sx={{ color: '#888', fontWeight: 'bold' }}>Price</TableCell>
                          <TableCell align="right" sx={{ color: '#888', fontWeight: 'bold' }}>Return</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.top_losers.map((stock, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                              {stock.ticker}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#888' }}>
                              ${stock.current_price?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#ff1744', fontWeight: 'bold' }}>
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