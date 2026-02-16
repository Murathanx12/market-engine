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
import RegimeBanner from '../components/RegimeBanner';
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <RegimeBanner />

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          PORTFOLIO
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
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
                <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Value
                  </Typography>
                  <Typography variant="h3" sx={{ my: 1, fontWeight: 'bold', color: 'primary.main' }}>
                    ${data.total_value?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Cost
                  </Typography>
                  <Typography variant="h3" sx={{ my: 1, fontWeight: 'bold' }}>
                    ${data.total_cost?.toFixed(2) || '0.00'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Gain/Loss
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      my: 1,
                      fontWeight: 'bold',
                      color: data.total_gain_loss >= 0 ? '#00e676' : '#ff1744',
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
                <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Return %
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      my: 1,
                      fontWeight: 'bold',
                      color: data.total_gain_loss_pct >= 0 ? '#00e676' : '#ff1744',
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
              <Paper sx={{ bgcolor: 'background.paper', border: '1px solid #e2e8f0' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }}>Ticker</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }} align="right">Shares</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }} align="right">Avg Cost</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }} align="right">Current Price</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }} align="right">Market Value</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }} align="right">Gain/Loss</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }} align="right">Return %</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }} align="center">Sector</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.holdings.map((holding) => (
                        <TableRow key={holding.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                          <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '1rem' }}>
                            {holding.ticker}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'text.primary' }}>
                            {holding.shares}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'text.secondary' }}>
                            ${holding.purchase_price?.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                            ${holding.current_price?.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                            ${holding.market_value?.toFixed(2)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: holding.gain_loss >= 0 ? '#00e676' : '#ff1744',
                              fontWeight: 'bold',
                            }}
                          >
                            {holding.gain_loss >= 0 ? '+' : ''}
                            ${holding.gain_loss?.toFixed(2)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: holding.gain_loss_pct >= 0 ? '#00e676' : '#ff1744',
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
                                bgcolor: '#f8fafc',
                                color: 'text.secondary',
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(holding.id)}
                              disabled={deleteMutation.isLoading}
                              sx={{ color: '#ff1744' }}
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
              <Paper sx={{ p: 5, bgcolor: 'background.paper', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  Your portfolio is empty
                </Typography>
                <Typography variant="body2" color="text.secondary">
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
