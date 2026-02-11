import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  Alert,
  Grid as Grid,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getAccuracyHistory } from '../services/api';

const colors = {
  good: '#4caf50',
  bad: '#ef5350',
  info: '#64b5f6',
  warning: '#ffa726',
  accent: '#ffffff',
};

function MetricCard({ title, value, subtitle, color = colors.accent }) {
  return (
    <Card sx={{ p: 3 }}>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '2.2rem', fontWeight: 700, color, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Card>
  );
}

const SimulationAccuracy = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['accuracy-history'],
    queryFn: getAccuracyHistory,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} sx={{ color: '#ffffff' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.08)', color: colors.bad }}>
        Error: {error?.message || 'Unknown error'}
      </Alert>
    );
  }

  const safeData = Array.isArray(data) ? data : [];

  const overallAccuracy =
    safeData.length > 0
      ? (safeData.reduce((sum, item) => sum + (item?.accuracy ?? 0), 0) / safeData.length).toFixed(1)
      : '0.0';

  const totalPredictions = safeData.reduce((sum, item) => sum + (item?.predictions ?? 0), 0);

  const getBarColor = (accuracy) => {
    if (accuracy >= 75) return colors.good;
    if (accuracy >= 60) return colors.warning;
    return colors.bad;
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
          Accuracy Tracking
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Model performance over time
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            title="Overall Accuracy"
            value={`${overallAccuracy}%`}
            subtitle="Across all predictions"
            color={parseFloat(overallAccuracy) >= 70 ? colors.good : colors.warning}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            title="Total Predictions"
            value={totalPredictions.toLocaleString()}
            color={colors.info}
            subtitle="Historical data points"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            title="Model Status"
            value={parseFloat(overallAccuracy) >= 70 ? 'Good' : 'Calibrating'}
            color={parseFloat(overallAccuracy) >= 70 ? colors.good : colors.warning}
            subtitle={parseFloat(overallAccuracy) >= 70 ? 'Production ready' : 'Gathering more data'}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 3 }}>
              Accuracy by Month
            </Typography>
            {safeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={safeData}>
                  <XAxis dataKey="month" stroke="#555" style={{ fontSize: '0.75rem' }} />
                  <YAxis stroke="#555" domain={[0, 100]} style={{ fontSize: '0.75rem' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#e8e8e8',
                    }}
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Accuracy']}
                  />
                  <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                    {safeData.map((entry, index) => (
                      <Cell key={index} fill={getBarColor(entry?.accuracy ?? 0)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                No accuracy data available yet.
              </Typography>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SimulationAccuracy;
