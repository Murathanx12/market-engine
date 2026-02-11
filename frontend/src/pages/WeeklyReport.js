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
import { getWeeklyReport } from '../services/api';

const colors = {
  good: '#4caf50',
  bad: '#ef5350',
  info: '#64b5f6',
  muted: '#888888',
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

const WeeklyReport = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['weekly-report'],
    queryFn: getWeeklyReport,
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

  const sp500Change = data?.sp500_change ?? 0;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
          Weekly Report
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Week ending: {data?.week_ending || 'N/A'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="S&P 500 Change"
            value={`${(sp500Change * 100).toFixed(2)}%`}
            color={sp500Change >= 0 ? colors.good : colors.bad}
            subtitle="This week"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Top Gainer"
            value={data?.top_gainer || 'N/A'}
            color={colors.good}
            subtitle={`+${((data?.top_gain ?? 0) * 100).toFixed(2)}%`}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Top Loser"
            value={data?.top_loser || 'N/A'}
            color={colors.bad}
            subtitle={`${((data?.top_loss ?? 0) * 100).toFixed(2)}%`}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Prediction Accuracy"
            value={`${(data?.prediction_accuracy ?? 0).toFixed(1)}%`}
            color={colors.info}
            subtitle="This week"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>
              Market Summary
            </Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
              {data?.explanation || 'Loading analysis...'}
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WeeklyReport;
