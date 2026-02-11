import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid as Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { runScenario } from '../services/api';

const colors = {
  good: '#4caf50',
  bad: '#ef5350',
  info: '#64b5f6',
  warning: '#ffa726',
  muted: '#888888',
  accent: '#ffffff',
};

const scenarios = [
  { value: 'taiwan_conflict', label: 'Taiwan Conflict', description: 'China invades Taiwan — global supply chain disruption' },
  { value: 'fed_pivot', label: 'Fed Pivot', description: 'Aggressive rate cuts due to recession fears' },
  { value: 'ai_bubble_burst', label: 'AI Bubble Burst', description: 'AI hype collapses — tech sector crash' },
  { value: 'trade_war', label: 'Trade War', description: 'Escalating US-China tariffs hurt global trade' },
];

const ScenarioPlanner = () => {
  const [ticker, setTicker] = useState('SPY');
  const [scenario, setScenario] = useState('taiwan_conflict');
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['scenario', ticker, scenario],
    queryFn: () => runScenario(ticker, scenario),
    enabled: shouldFetch,
  });

  const handleAnalyze = () => {
    setShouldFetch(true);
  };

  const selectedScenario = scenarios.find((s) => s.value === scenario);

  const chartData = data
    ? [
        { name: 'Current', price: data.current_price ?? 0 },
        {
          name: 'Expected',
          price: data.expected_price ?? 0,
          low95: data.confidence_95_low ?? 0,
          high95: data.confidence_95_high ?? 0,
        },
      ]
    : [];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
          Scenario Planning
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Model the impact of hypothetical events on your portfolio
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Ticker"
                value={ticker}
                onChange={(e) => { setTicker(e.target.value.toUpperCase()); setShouldFetch(false); }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Scenario</InputLabel>
                <Select
                  value={scenario}
                  label="Scenario"
                  onChange={(e) => { setScenario(e.target.value); setShouldFetch(false); }}
                >
                  {scenarios.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleAnalyze}
                sx={{ height: '56px' }}
              >
                Run Analysis
              </Button>
            </Grid>
          </Grid>

          {selectedScenario && (
            <Box sx={{ mt: 2, px: 2, py: 1.2, borderRadius: 1, bgcolor: 'rgba(100,181,246,0.06)', border: '1px solid rgba(100,181,246,0.15)' }}>
              <Typography sx={{ fontSize: '0.88rem', color: colors.info }}>
                <strong>{selectedScenario.label}:</strong> {selectedScenario.description}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress sx={{ color: '#ffffff' }} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {error?.message || 'Unknown error'}
        </Alert>
      )}

      {data && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Probability
                </Typography>
                <Typography sx={{ fontSize: '2.2rem', fontWeight: 700, color: colors.warning }}>
                  {((data.probability ?? 0) * 100).toFixed(0)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Expected Impact
                </Typography>
                <Typography
                  sx={{
                    fontSize: '2.2rem', fontWeight: 700,
                    color: (data.expected_return ?? 0) > 0 ? colors.good : colors.bad,
                  }}
                >
                  {((data.expected_return ?? 0) * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Expected Price
                </Typography>
                <Typography sx={{ fontSize: '2.2rem', fontWeight: 700, color: '#e8e8e8' }}>
                  ${(data.expected_price ?? 0).toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Duration
                </Typography>
                <Typography sx={{ fontSize: '2.2rem', fontWeight: 700, color: colors.info }}>
                  {data.duration_days ?? 0} days
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Chart */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography sx={{ fontWeight: 600, mb: 2 }}>
                  Price Impact Visualization
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" stroke="#555" />
                    <YAxis stroke="#555" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#e8e8e8',
                      }}
                      formatter={(v) => [`$${Number(v).toFixed(2)}`]}
                    />
                    <Legend />
                    <ReferenceLine y={data.current_price ?? 0} stroke={colors.bad} strokeDasharray="3 3" label="Current" />
                    <Bar dataKey="price" fill="#ffffff" name="Expected" />
                    <Bar dataKey="low95" fill={colors.bad} name="95% Low" />
                    <Bar dataKey="high95" fill={colors.good} name="95% High" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Details table */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography sx={{ fontWeight: 600, mb: 2 }}>
                  Detailed Analysis
                </Typography>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.04)' }}>Scenario</TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.04)' }}>{selectedScenario?.label ?? 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.04)' }}>Description</TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.04)' }}>{data.description ?? 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.04)' }}>Current Price</TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.04)' }}>${(data.current_price ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.04)' }}>Expected Price</TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.04)' }}>${(data.expected_price ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.04)' }}>95% Confidence Interval</TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        ${(data.confidence_95_low ?? 0).toFixed(2)} — ${(data.confidence_95_high ?? 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ScenarioPlanner;
