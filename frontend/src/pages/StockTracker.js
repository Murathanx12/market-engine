import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Button,
  Alert,
  Chip,
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
import RegimeBanner from '../components/RegimeBanner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

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
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff' }}>
      <RegimeBanner />

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          STOCK TRACKER
        </Typography>

        {/* Search Box */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#111', border: '1px solid #333' }}>
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
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                  },
                  '& .MuiInputLabel-root': { color: '#888' },
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
                  bgcolor: '#00d4ff',
                  color: '#000',
                  fontWeight: 'bold',
                  height: '56px',
                  '&:hover': { bgcolor: '#00b8e6' },
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
            <CircularProgress sx={{ color: '#00d4ff' }} />
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
              <Paper sx={{ p: 4, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  {searchTicker} - Current Price
                </Typography>
                <Typography
                  variant="h2"
                  sx={{ my: 2, fontWeight: 'bold', color: '#00d4ff' }}
                >
                  ${currentPrice.toFixed(2)}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialogOpen(true)}
                  sx={{
                    borderColor: '#00d4ff',
                    color: '#00d4ff',
                    '&:hover': {
                      borderColor: '#00b8e6',
                      bgcolor: 'rgba(0, 212, 255, 0.1)',
                    },
                  }}
                >
                  Add to Portfolio
                </Button>
                {projection.status === 'no_data' && (
                  <Typography variant="caption" display="block" sx={{ mt: 2, color: '#ffc107' }}>
                    ⚠️ Using dummy data - scheduler hasn't run yet
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Projections */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Price Projections
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        30 Days
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#00d4ff', my: 1 }}>
                        ${projections['30d']?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: projections['30d'] > currentPrice ? '#00e676' : '#ff1744' }}>
                        {projections['30d'] > currentPrice ? '+' : ''}
                        {(((projections['30d'] - currentPrice) / currentPrice) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        6 Months
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#00d4ff', my: 1 }}>
                        ${projections['180d']?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: projections['180d'] > currentPrice ? '#00e676' : '#ff1744' }}>
                        {projections['180d'] > currentPrice ? '+' : ''}
                        {(((projections['180d'] - currentPrice) / currentPrice) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        1 Year
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#00d4ff', my: 1 }}>
                        ${projections['365d']?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: projections['365d'] > currentPrice ? '#00e676' : '#ff1744' }}>
                        {projections['365d'] > currentPrice ? '+' : ''}
                        {(((projections['365d'] - currentPrice) / currentPrice) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        5 Years
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#00d4ff', my: 1 }}>
                        ${projections['1825d']?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: projections['1825d'] > currentPrice ? '#00e676' : '#ff1744' }}>
                        {projections['1825d'] > currentPrice ? '+' : ''}
                        {(((projections['1825d'] - currentPrice) / currentPrice) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2, borderColor: '#333' }} />

                {projection.data.analyst_target && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Analyst Target (1Y)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#888' }}>
                      ${projection.data.analyst_target.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Volatility
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {(projection.data.volatility * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Price History Chart */}
            {history?.prices && history.prices.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #333' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    1-Year Price History
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={history.prices}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#666"
                        tick={{ fill: '#666', fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
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
                        formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke="#00d4ff"
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
                  <CircularProgress sx={{ color: '#00d4ff' }} size={30} />
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
          sx: { bgcolor: '#111', border: '1px solid #333', color: '#fff' }
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
                color: '#fff',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
              },
              '& .MuiInputLabel-root': { color: '#888' },
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
                color: '#fff',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
              },
              '& .MuiInputLabel-root': { color: '#888' },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Leave blank to use current price: ${currentPrice.toFixed(2)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} sx={{ color: '#888' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddToPortfolio}
            variant="contained"
            disabled={addMutation.isLoading}
            sx={{
              bgcolor: '#00d4ff',
              color: '#000',
              '&:hover': { bgcolor: '#00b8e6' },
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
