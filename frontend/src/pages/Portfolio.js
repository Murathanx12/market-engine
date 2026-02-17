import React from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPortfolio, removeFromPortfolio } from '../services/api';
import { COLORS } from '../theme/darkTheme';
import DeleteIcon from '@mui/icons-material/Delete';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const Portfolio = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolio,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const deleteMutation = useMutation({
    mutationFn: removeFromPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries(['portfolio']);
    },
  });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to remove this holding?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.bgVoid, color: COLORS.textPrimary }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: COLORS.textPrimary }}>
          PORTFOLIO
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress sx={{ color: COLORS.emerald }} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error loading portfolio: {error.message}
          </Alert>
        )}

        {data && !isLoading && (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                    Total Value
                  </Typography>
                  <Typography variant="h3" sx={{ my: 1, fontWeight: 'bold', color: COLORS.emerald }}>
                    ${data.total_value?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                    Total Cost
                  </Typography>
                  <Typography variant="h3" sx={{ my: 1, fontWeight: 'bold', color: COLORS.textPrimary }}>
                    ${data.total_cost?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                    Total Gain/Loss
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      my: 1,
                      fontWeight: 'bold',
                      color: data.total_gain_loss >= 0 ? COLORS.emerald : COLORS.crimson,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    {data.total_gain_loss >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    {data.total_gain_loss >= 0 ? '+' : ''}
                    ${data.total_gain_loss?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                    Return %
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      my: 1,
                      fontWeight: 'bold',
                      color: data.total_gain_loss_pct >= 0 ? COLORS.emerald : COLORS.crimson,
                    }}
                  >
                    {data.total_gain_loss_pct >= 0 ? '+' : ''}
                    {data.total_gain_loss_pct?.toFixed(1)}%
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Holdings Table */}
            {data.holdings && data.holdings.length > 0 ? (
              <Paper sx={{ bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold' }}>Ticker</TableCell>
                        <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold' }} align="right">Shares</TableCell>
                        <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold' }} align="right">Avg Cost</TableCell>
                        <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold' }} align="right">Current Price</TableCell>
                        <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold' }} align="right">Market Value</TableCell>
                        <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold' }} align="right">Gain/Loss</TableCell>
                        <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold' }} align="right">Return %</TableCell>
                        <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold' }} align="center">Sector</TableCell>
                        <TableCell sx={{ color: COLORS.textMuted, fontWeight: 'bold' }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.holdings.map((holding) => (
                        <TableRow key={holding.id} sx={{ '&:hover': { bgcolor: COLORS.bgElevated } }}>
                          <TableCell sx={{ color: COLORS.textPrimary, fontWeight: 'bold', fontSize: '1rem' }}>
                            {holding.ticker}
                          </TableCell>
                          <TableCell align="right" sx={{ color: COLORS.textPrimary }}>
                            {holding.shares}
                          </TableCell>
                          <TableCell align="right" sx={{ color: COLORS.textSecondary }}>
                            ${holding.purchase_price?.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: COLORS.emerald, fontWeight: 'bold' }}>
                            ${holding.current_price?.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>
                            ${holding.market_value?.toFixed(2)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: holding.gain_loss >= 0 ? COLORS.emerald : COLORS.crimson,
                              fontWeight: 'bold',
                            }}
                          >
                            {holding.gain_loss >= 0 ? '+' : ''}
                            ${holding.gain_loss?.toFixed(2)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: holding.gain_loss_pct >= 0 ? COLORS.emerald : COLORS.crimson,
                              fontWeight: 'bold',
                            }}
                          >
                            {holding.gain_loss_pct >= 0 ? '+' : ''}
                            {holding.gain_loss_pct?.toFixed(1)}%
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={holding.sector}
                              size="small"
                              sx={{
                                bgcolor: COLORS.bgElevated,
                                color: COLORS.textSecondary,
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(holding.id)}
                              disabled={deleteMutation.isLoading}
                              sx={{ color: COLORS.crimson }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ) : (
              <Paper sx={{ p: 5, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ mb: 1, color: COLORS.textSecondary }}>
                  Your portfolio is empty
                </Typography>
                <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
                  Go to Stock Tracker to add holdings
                </Typography>
              </Paper>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default Portfolio;
