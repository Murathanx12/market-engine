import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Button,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStockProjection,
  getStockHistory,
  addToPortfolio,
} from '../services/api';
import { COLORS } from '../theme/darkTheme';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import AddIcon from '@mui/icons-material/Add';

const StockTracker = () => {
  const [ticker, setTicker] = useState('AAPL');
  const [searchTicker, setSearchTicker] = useState('AAPL');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [shares, setShares] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  const queryClient = useQueryClient();

  // Fetch stock projection
  const { data: projection, isLoading: projectionLoading, error: projectionError } = useQuery({
    queryKey: ['stockProjection', searchTicker],
    queryFn: () => getStockProjection(searchTicker),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!searchTicker,
  });

  // Fetch stock history for chart
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['stockHistory', searchTicker],
    queryFn: () => getStockHistory(searchTicker, '1y'),
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!searchTicker,
  });

  // Add to portfolio mutation
  const addMutation = useMutation({
    mutationFn: addToPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries(['portfolio']);
      setAddDialogOpen(false);
      setShares('');
      setPurchasePrice('');
    },
  });

  const handleSearch = () => {
    if (ticker.trim()) {
      setSearchTicker(ticker.toUpperCase().trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddToPortfolio = () => {
    if (!shares || parseFloat(shares) <= 0) {
      alert('Please enter a valid number of shares');
      return;
    }

    const payload = {
      ticker: searchTicker,
      shares: parseFloat(shares),
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
    };

    addMutation.mutate(payload);
  };

  const currentPrice = projection?.data?.current_price || 0;
  const projections = projection?.data?.projections || {};

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.bgVoid, color: COLORS.textPrimary }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: COLORS.textPrimary }}>
          STOCK TRACKER
        </Typography>

        {/* Search Box */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label="Ticker Symbol"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="e.g., AAPL, MSFT, NVDA"
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
            <Grid size={{ xs: 12, md: 4 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                disabled={projectionLoading}
                sx={{
                  bgcolor: COLORS.emerald,
                  color: '#000',
                  fontWeight: 'bold',
                  height: '56px',
                  '&:hover': { bgcolor: '#00a37a' },
                }}
              >
                {projectionLoading ? <CircularProgress size={24} /> : 'SEARCH'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Loading State */}
        {projectionLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress sx={{ color: COLORS.emerald }} />
          </Box>
        )}

        {/* Error State */}
        {projectionError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error fetching stock data: {projectionError.message}
          </Alert>
        )}

        {/* Stock Data */}
        {projection?.data && !projectionLoading && (
          <Grid container spacing={3}>
            {/* Current Price Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 4, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                  {searchTicker} - Current Price
                </Typography>
                <Typography
                  variant="h2"
                  sx={{ my: 2, fontWeight: 'bold', color: COLORS.emerald }}
                >
                  ${currentPrice.toFixed(2)}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialogOpen(true)}
                  sx={{
                    borderColor: COLORS.emerald,
                    color: COLORS.emerald,
                    '&:hover': {
                      borderColor: '#00a37a',
                      bgcolor: COLORS.emeraldDim,
                    },
                  }}
                >
                  Add to Portfolio
                </Button>
                {projection.status === 'no_data' && (
                  <Typography variant="caption" display="block" sx={{ mt: 2, color: COLORS.amber }}>
                    Using dummy data - scheduler hasn't run yet
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Projections */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                <Typography variant="h6" sx={{ mb: 2, color: COLORS.textPrimary }}>
                  Price Projections
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                        30 Days
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.emerald, my: 1 }}>
                        ${projections['30d']?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: projections['30d'] > currentPrice ? COLORS.emerald : COLORS.crimson }}>
                        {projections['30d'] > currentPrice ? '+' : ''}
                        {(((projections['30d'] - currentPrice) / currentPrice) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                        6 Months
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.emerald, my: 1 }}>
                        ${projections['180d']?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: projections['180d'] > currentPrice ? COLORS.emerald : COLORS.crimson }}>
                        {projections['180d'] > currentPrice ? '+' : ''}
                        {(((projections['180d'] - currentPrice) / currentPrice) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                        1 Year
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.emerald, my: 1 }}>
                        ${projections['365d']?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: projections['365d'] > currentPrice ? COLORS.emerald : COLORS.crimson }}>
                        {projections['365d'] > currentPrice ? '+' : ''}
                        {(((projections['365d'] - currentPrice) / currentPrice) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                        5 Years
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.emerald, my: 1 }}>
                        ${projections['1825d']?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: projections['1825d'] > currentPrice ? COLORS.emerald : COLORS.crimson }}>
                        {projections['1825d'] > currentPrice ? '+' : ''}
                        {(((projections['1825d'] - currentPrice) / currentPrice) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2, borderColor: COLORS.borderSubtle }} />

                {projection.data.analyst_target && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                      Analyst Target (1Y)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: COLORS.textSecondary }}>
                      ${projection.data.analyst_target.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                    Volatility
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: COLORS.textPrimary }}>
                    {(projection.data.volatility * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Price History Chart */}
            {history?.prices && history.prices.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
                  <Typography variant="h6" sx={{ mb: 2, color: COLORS.textPrimary }}>
                    1-Year Price History
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={history.prices}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderSubtle} vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke={COLORS.textMuted}
                        tick={{ fill: COLORS.textMuted, fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                      />
                      <YAxis
                        stroke={COLORS.textMuted}
                        tick={{ fill: COLORS.textMuted }}
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `$${val.toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: COLORS.bgElevated,
                          border: `1px solid ${COLORS.borderSubtle}`,
                          color: COLORS.textPrimary,
                          borderRadius: 6,
                        }}
                        labelStyle={{ color: COLORS.textSecondary }}
                        formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke={COLORS.indigo}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            )}

            {historyLoading && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <CircularProgress sx={{ color: COLORS.emerald }} size={30} />
                </Box>
              </Grid>
            )}
          </Grid>
        )}
      </Box>

      {/* Add to Portfolio Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, color: COLORS.textPrimary }
        }}
      >
        <DialogTitle>Add {searchTicker} to Portfolio</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Number of Shares"
            type="number"
            fullWidth
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                color: COLORS.textPrimary,
                '& fieldset': { borderColor: COLORS.borderSubtle },
                '&:hover fieldset': { borderColor: COLORS.borderActive },
                '&.Mui-focused fieldset': { borderColor: COLORS.emerald },
              },
              '& .MuiInputLabel-root': { color: COLORS.textSecondary },
            }}
          />
          <TextField
            margin="dense"
            label="Purchase Price (optional)"
            type="number"
            fullWidth
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder={`Current: $${currentPrice.toFixed(2)}`}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                color: COLORS.textPrimary,
                '& fieldset': { borderColor: COLORS.borderSubtle },
                '&:hover fieldset': { borderColor: COLORS.borderActive },
                '&.Mui-focused fieldset': { borderColor: COLORS.emerald },
              },
              '& .MuiInputLabel-root': { color: COLORS.textSecondary },
            }}
          />
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: COLORS.textSecondary }}>
            Leave blank to use current price: ${currentPrice.toFixed(2)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} sx={{ color: COLORS.textSecondary }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddToPortfolio}
            variant="contained"
            disabled={addMutation.isLoading}
            sx={{
              bgcolor: COLORS.emerald,
              color: '#000',
              '&:hover': { bgcolor: '#00a37a' },
            }}
          >
            {addMutation.isLoading ? <CircularProgress size={20} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockTracker;
