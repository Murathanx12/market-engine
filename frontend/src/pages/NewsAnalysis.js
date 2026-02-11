import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid as Grid,
  Slider,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import { getNews } from '../services/api';

const colors = {
  good: '#4caf50',
  bad: '#ef5350',
  info: '#64b5f6',
  warning: '#ffa726',
  muted: '#888888',
};

const NewsAnalysis = () => {
  const [minSeverity, setMinSeverity] = useState(5);
  const [days, setDays] = useState(7);

  const { data, isLoading, error } = useQuery({
    queryKey: ['news', days, minSeverity],
    queryFn: () => getNews(days, minSeverity),
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} sx={{ color: '#ffffff' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error loading news: {error?.message || 'Unknown error'}</Alert>;
  }

  const getSentimentColor = (sentiment) => {
    const score = sentiment ?? 0;
    if (score > 0.2) return 'success';
    if (score < -0.2) return 'error';
    return 'default';
  };

  const getSeverityColor = (severity) => {
    const sev = severity ?? 5;
    if (sev >= 8) return 'error';
    if (sev >= 6) return 'warning';
    return 'info';
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Unknown date';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
          News Impact Analysis
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Market-moving news with AI sentiment scoring
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography sx={{ mb: 1, fontSize: '0.88rem', color: 'text.secondary' }}>
                Time Period: Last {days} days
              </Typography>
              <Slider
                value={days}
                onChange={(e, val) => setDays(val)}
                min={1}
                max={30}
                valueLabelDisplay="auto"
                sx={{ color: '#ffffff' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography sx={{ mb: 1, fontSize: '0.88rem', color: 'text.secondary' }}>
                Minimum Severity: {minSeverity}/10
              </Typography>
              <Slider
                value={minSeverity}
                onChange={(e, val) => setMinSeverity(val)}
                min={1}
                max={10}
                valueLabelDisplay="auto"
                sx={{ color: '#ffffff' }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {data && data.length > 0 ? (
          data.map((news, index) => (
            <Grid size={{ xs: 12 }} key={news?.id ?? index}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1} flexWrap="wrap" gap={1}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {formatDate(news?.date)} • {news?.source ?? 'Unknown'}
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Chip
                        label={news?.impact_category ?? 'General'}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'rgba(255,255,255,0.15)', color: colors.info }}
                      />
                      <Chip
                        label={`Severity: ${news?.severity ?? 0}/10`}
                        size="small"
                        color={getSeverityColor(news?.severity)}
                      />
                    </Box>
                  </Box>

                  <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1rem', fontWeight: 500 }}>
                    {news?.headline ?? 'No headline'}
                  </Typography>

                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <Chip
                      label={`Sentiment: ${news?.sentiment_label ?? 'neutral'}`}
                      size="small"
                      color={getSentimentColor(news?.sentiment_score)}
                    />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Score: {(news?.sentiment_score ?? 0).toFixed(2)}
                    </Typography>
                    {news?.url && (
                      <Link
                        href={news.url}
                        target="_blank"
                        rel="noopener"
                        underline="hover"
                        sx={{ color: colors.info, fontSize: '0.82rem' }}
                      >
                        Read Full Article →
                      </Link>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ bgcolor: 'rgba(100,181,246,0.08)', color: colors.info }}>
              No news found for the selected criteria.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default NewsAnalysis;
