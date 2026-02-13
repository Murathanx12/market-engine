import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, Typography, Grid, CircularProgress, Alert,
  TextField, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getPortfolio, addToPortfolio, removeFromPortfolio } from '../services/api';

const colors = { good: '#4caf50', bad: '#ef5350', info: '#64b5f6', warning: '#ffa726', muted: '#888', accent: '#fff' };
const SECTOR_COLORS = ['#64b5f6', '#4caf50', '#ffa726', '#ef5350', '#ab47bc', '#26c6da', '#8d6e63', '#78909c'];

const Portfolio = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ticker: '', shares: '', purchase_price: '', purchase_date: '', notes: '' });

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolio,
  });

  const addMutation = useMutation({
    mutationFn: addToPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries(['portfolio']);
      setDialogOpen(false);
      setForm({ ticker: '', shares: '', purchase_price: '', purchase_date: '', notes: '' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFromPortfolio,
    onSuccess: () => queryClient.invalidateQueries(['portfolio']),
  });

  const handleAdd = () => {
    if (!form.ticker || !form.shares) return;
    addMutation.mutate({
      ticker: form.ticker.toUpperCase(),
      shares: parseFloat(form.shares),
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      purchase_date: form.purchase_date || null,
      notes: form.notes || null,
    });
  };

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress sx={{ color: '#fff' }} /></Box>;
  if (error) return <Alert severity="error">Error: {error?.message}</Alert>;

  const holdings = data?.holdings || [];
  const totalValue = data?.total_value || 0;
  const totalGain = data?.total_gain_loss || 0;
  const totalGainPct = data?.total_gain_loss_pct || 0;

  // Sector breakdown for pie chart
  const sectorMap = {};
  holdings.forEach(h => {
    const s = h.sector || 'Other';
    sectorMap[s] = (sectorMap[s] || 0) + h.market_value;
  });
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value: Math.round(value) }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>Portfolio</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Track your holdings and projected returns</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Add Stock</Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase' }}>Total Value</Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 700 }}>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>{holdings.length} holdings</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase' }}>Total Gain/Loss</Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: totalGain >= 0 ? colors.good : colors.bad }}>
              {totalGain >= 0 ? '+' : ''}${totalGain.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: totalGainPct >= 0 ? colors.good : colors.bad, mt: 0.5 }}>
              {totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(1)}%
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase' }}>Sector Breakdown</Typography>
            {sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={sectorData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50}>
                    {sectorData.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography sx={{ color: 'text.secondary', mt: 2, fontSize: '0.88rem' }}>No holdings yet</Typography>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Holdings Table */}
      <Card sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { px: 2, py: 1.5, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' } }}>
            <thead>
              <tr>
                {['Ticker', 'Shares', 'Avg Cost', 'Current', 'Value', 'Gain/Loss', '%', ''].map(h => (
                  <Box component="th" key={h} sx={{ fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>{h}</Box>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 ? (
                <tr><Box component="td" colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No holdings. Click "Add Stock" to get started.</Box></tr>
              ) : (
                holdings.map(h => (
                  <tr key={h.id}>
                    <Box component="td" sx={{ fontWeight: 600 }}>{h.ticker}</Box>
                    <Box component="td">{h.shares}</Box>
                    <Box component="td">${h.purchase_price.toFixed(2)}</Box>
                    <Box component="td">${h.current_price.toFixed(2)}</Box>
                    <Box component="td">${h.market_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Box>
                    <Box component="td" sx={{ color: h.gain_loss >= 0 ? colors.good : colors.bad, fontWeight: 500 }}>
                      {h.gain_loss >= 0 ? '+' : ''}${h.gain_loss.toFixed(2)}
                    </Box>
                    <Box component="td" sx={{ color: h.gain_loss_pct >= 0 ? colors.good : colors.bad, fontWeight: 500 }}>
                      {h.gain_loss_pct >= 0 ? '+' : ''}{h.gain_loss_pct.toFixed(1)}%
                    </Box>
                    <Box component="td">
                      <IconButton size="small" onClick={() => removeMutation.mutate(h.id)} sx={{ color: colors.muted, '&:hover': { color: colors.bad } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </tr>
                ))
              )}
            </tbody>
          </Box>
        </Box>
      </Card>

      {/* Add Stock Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} PaperProps={{ sx: { bgcolor: '#1a1a1a', borderRadius: 3, minWidth: 400 } }}>
        <DialogTitle sx={{ color: '#e8e8e8' }}>Add Stock to Portfolio</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Ticker" value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} size="small" required />
            <TextField label="Shares" type="number" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} size="small" required />
            <TextField label="Purchase Price (optional - auto-fetched)" type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} size="small" />
            <TextField label="Purchase Date" type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} size="small" InputLabelProps={{ shrink: true }} />
            <TextField label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} size="small" multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#888' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!form.ticker || !form.shares || addMutation.isLoading}>
            {addMutation.isLoading ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Portfolio;