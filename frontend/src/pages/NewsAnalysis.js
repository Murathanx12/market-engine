import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { useQuery } from '@tanstack/react-query';
import { getNews } from '../services/api';
import RegimeBanner from '../components/RegimeBanner';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const NewsAnalysis = () => {
  const [days, setDays] = useState(7);
  const [minSeverity, setMinSeverity] = useState(1);

  const { data: news, isLoading, error } = useQuery({
    queryKey: ['news', days, minSeverity],
    queryFn: () => getNews(days, minSeverity),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getSentimentIcon = (label) => {
    switch (label) {
      case 'positive':
        return <SentimentSatisfiedIcon sx={{ color: '#00e676' }} />;
      case 'negative':
        return <SentimentVeryDissatisfiedIcon sx={{ color: '#ff1744' }} />;
      default:
        return <SentimentNeutralIcon sx={{ color: '#888' }} />;
    }
  };

  const getSentimentColor = (label) => {
    switch (label) {
      case 'positive':
        return '#00e676';
      case 'negative':
        return '#ff1744';
      default:
        return '#888';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Fed': '#ff1744',
      'Earnings': '#00d4ff',
      'Geopolitical': '#ffc107',
      'Employment': '#00e676',
      'Inflation': '#ff5722',
      'General': '#888',
    };
    return colors[category] || '#888';
  };

  // Calculate aggregate sentiment
  const aggregateSentiment = React.useMemo(() => {
    if (!news || !Array.isArray(news)) return null;
    
    const total = news.length;
    const positive = news.filter(n => n.sentiment_label === 'positive').length;
    const negative = news.filter(n => n.sentiment_label === 'negative').length;
    const neutral = total - positive - negative;
    const avgScore = news.reduce((sum, n) => sum + n.sentiment_score, 0) / total;

    return {
      total,
      positive,
      negative,
      neutral,
      avgScore,
      positivePercent: (positive / total) * 100,
      negativePercent: (negative / total) * 100,
      neutralPercent: (neutral / total) * 100,
    };
  }, [news]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff' }}>
      <RegimeBanner />

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          NEWS IMPACT ANALYSIS
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#111', border: '1px solid #333' }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Time Period: {days} days
              </Typography>
              <Slider
                value={days}
                onChange={(e, value) => setDays(value)}
                min={1}
                max={30}
                marks={[
                  { value: 1, label: '1d' },
                  { value: 7, label: '7d' },
                  { value: 14, label: '14d' },
                  { value: 30, label: '30d' },
                ]}
                sx={{
                  color: '#00d4ff',
                  '& .MuiSlider-markLabel': { color: '#888' },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#888' }}>Min Severity</InputLabel>
                <Select
                  value={minSeverity}
                  onChange={(e) => setMinSeverity(e.target.value)}
                  label="Min Severity"
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4ff' },
                  }}
                >
                  <MenuItem value={1}>All (1+)</MenuItem>
                  <MenuItem value={5}>Moderate (5+)</MenuItem>
                  <MenuItem value={7}>Important (7+)</MenuItem>
                  <MenuItem value={9}>Critical (9+)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress sx={{ color: '#00d4ff' }} />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #ff1744' }}>
            <Typography color="error">
              Error loading news: {error.message}
            </Typography>
          </Paper>
        )}

        {/* Aggregate Sentiment */}
        {aggregateSentiment && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: '#111', border: '1px solid #333' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Aggregate Market Sentiment
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                  <Typography variant="overline" color="text.secondary">
                    Average Score
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 'bold',
                      color: aggregateSentiment.avgScore > 0 ? '#00e676' : aggregateSentiment.avgScore < 0 ? '#ff1744' : '#888'
                    }}
                  >
                    {aggregateSentiment.avgScore.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                  <SentimentSatisfiedIcon sx={{ fontSize: 40, color: '#00e676', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#00e676' }}>
                    {aggregateSentiment.positive}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Positive ({aggregateSentiment.positivePercent.toFixed(0)}%)
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                  <SentimentNeutralIcon sx={{ fontSize: 40, color: '#888', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#888' }}>
                    {aggregateSentiment.neutral}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Neutral ({aggregateSentiment.neutralPercent.toFixed(0)}%)
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                  <SentimentVeryDissatisfiedIcon sx={{ fontSize: 40, color: '#ff1744', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ff1744' }}>
                    {aggregateSentiment.negative}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Negative ({aggregateSentiment.negativePercent.toFixed(0)}%)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* News Items */}
        {news && Array.isArray(news) && (
          <Grid container spacing={2}>
            {news.map((item, idx) => (
              <Grid size={{ xs: 12 }} key={item.id || idx}>
                <Paper
                  sx={{
                    p: 3,
                    bgcolor: '#111',
                    border: '1px solid #333',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#00d4ff',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      {/* Headline */}
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {item.headline}
                      </Typography>

                      {/* Meta Info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {item.source} • {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
                        </Typography>
                        
                        <Chip
                          label={item.impact_category}
                          size="small"
                          sx={{
                            bgcolor: getCategoryColor(item.impact_category),
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '0.65rem',
                          }}
                        />

                        <Chip
                          label={`Severity: ${item.severity}/10`}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: item.severity >= 8 ? '#ff1744' : item.severity >= 6 ? '#ffc107' : '#888',
                            color: item.severity >= 8 ? '#ff1744' : item.severity >= 6 ? '#ffc107' : '#888',
                          }}
                        />
                      </Box>

                      {/* Sentiment Bar */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getSentimentIcon(item.sentiment_label)}
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              height: '8px',
                              bgcolor: '#1a1a1a',
                              borderRadius: 1,
                              overflow: 'hidden',
                              position: 'relative',
                            }}
                          >
                            <Box
                              sx={{
                                position: 'absolute',
                                left: '50%',
                                width: `${Math.abs(item.sentiment_score) * 50}%`,
                                height: '100%',
                                bgcolor: getSentimentColor(item.sentiment_label),
                                transition: 'width 0.3s ease',
                                ...(item.sentiment_score < 0 ? { right: '50%' } : { left: '50%' }),
                              }}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Sentiment Score: {item.sentiment_score.toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Impact Metric */}
                    <Box sx={{ textAlign: 'right', minWidth: '100px' }}>
                      <Typography variant="caption" color="text.secondary">
                        Est. Impact
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 'bold',
                          color: item.estimated_impact > 0 ? '#00e676' : item.estimated_impact < 0 ? '#ff1744' : '#888',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 0.5,
                        }}
                      >
                        {item.estimated_impact > 0 ? <TrendingUpIcon /> : item.estimated_impact < 0 ? <TrendingDownIcon /> : null}
                        {item.estimated_impact > 0 ? '+' : ''}
                        {item.estimated_impact.toFixed(2)}%
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty State */}
        {news && Array.isArray(news) && news.length === 0 && !isLoading && (
          <Paper sx={{ p: 5, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No news found for the selected filters
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try adjusting the time period or severity level
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default NewsAnalysis;
