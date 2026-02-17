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
import { COLORS } from '../theme/darkTheme';
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
        return <SentimentSatisfiedIcon sx={{ color: COLORS.emerald }} />;
      case 'negative':
        return <SentimentVeryDissatisfiedIcon sx={{ color: COLORS.crimson }} />;
      default:
        return <SentimentNeutralIcon sx={{ color: COLORS.textMuted }} />;
    }
  };

  const getSentimentColor = (label) => {
    switch (label) {
      case 'positive':
        return COLORS.emerald;
      case 'negative':
        return COLORS.crimson;
      default:
        return COLORS.textMuted;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Fed': COLORS.crimson,
      'Earnings': COLORS.indigo,
      'Geopolitical': COLORS.amber,
      'Employment': COLORS.emerald,
      'Inflation': COLORS.crimson,
      'General': COLORS.textMuted,
    };
    return colors[category] || COLORS.textMuted;
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
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.bgVoid, color: COLORS.textPrimary }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: COLORS.textPrimary }}>
          NEWS IMPACT ANALYSIS
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" sx={{ mb: 1, color: COLORS.textSecondary }}>
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
                  color: COLORS.emerald,
                  '& .MuiSlider-markLabel': { color: COLORS.textMuted },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: COLORS.textMuted }}>Min Severity</InputLabel>
                <Select
                  value={minSeverity}
                  onChange={(e) => setMinSeverity(e.target.value)}
                  label="Min Severity"
                  sx={{
                    color: COLORS.textPrimary,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.borderSubtle },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.borderActive },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.emerald },
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
            <CircularProgress sx={{ color: COLORS.emerald }} />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Paper sx={{ p: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.crimson}` }}>
            <Typography sx={{ color: COLORS.crimson }}>
              Error loading news: {error.message}
            </Typography>
          </Paper>
        )}

        {/* Aggregate Sentiment */}
        {aggregateSentiment && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}` }}>
            <Typography variant="h6" sx={{ mb: 2, color: COLORS.textPrimary }}>
              Aggregate Market Sentiment
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
                  <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                    Average Score
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 'bold',
                      color: aggregateSentiment.avgScore > 0 ? COLORS.emerald : aggregateSentiment.avgScore < 0 ? COLORS.crimson : COLORS.textMuted
                    }}
                  >
                    {aggregateSentiment.avgScore.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
                  <SentimentSatisfiedIcon sx={{ fontSize: 40, color: COLORS.emerald, mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: COLORS.emerald }}>
                    {aggregateSentiment.positive}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Positive ({aggregateSentiment.positivePercent.toFixed(0)}%)
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
                  <SentimentNeutralIcon sx={{ fontSize: 40, color: COLORS.textMuted, mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: COLORS.textMuted }}>
                    {aggregateSentiment.neutral}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Neutral ({aggregateSentiment.neutralPercent.toFixed(0)}%)
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
                  <SentimentVeryDissatisfiedIcon sx={{ fontSize: 40, color: COLORS.crimson, mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: COLORS.crimson }}>
                    {aggregateSentiment.negative}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
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
                    bgcolor: COLORS.bgCard,
                    border: `1px solid ${COLORS.borderSubtle}`,
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: COLORS.borderActive,
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      {/* Headline */}
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', color: COLORS.textPrimary }}>
                        {item.headline}
                      </Typography>

                      {/* Meta Info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                          {item.source} • {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
                        </Typography>

                        <Chip
                          label={item.impact_category}
                          size="small"
                          sx={{
                            bgcolor: getCategoryColor(item.impact_category),
                            color: COLORS.textPrimary,
                            fontWeight: 'bold',
                            fontSize: '0.65rem',
                          }}
                        />

                        <Chip
                          label={`Severity: ${item.severity}/10`}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: item.severity >= 8 ? COLORS.crimson : item.severity >= 6 ? COLORS.amber : COLORS.textMuted,
                            color: item.severity >= 8 ? COLORS.crimson : item.severity >= 6 ? COLORS.amber : COLORS.textMuted,
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
                              bgcolor: COLORS.bgElevated,
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
                          <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: COLORS.textSecondary }}>
                            Sentiment Score: {item.sentiment_score.toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Impact Metric */}
                    <Box sx={{ textAlign: 'right', minWidth: '100px' }}>
                      <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                        Est. Impact
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 'bold',
                          color: item.estimated_impact > 0 ? COLORS.emerald : item.estimated_impact < 0 ? COLORS.crimson : COLORS.textMuted,
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
          <Paper sx={{ p: 5, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.borderSubtle}`, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: COLORS.textSecondary }}>
              No news found for the selected filters
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: COLORS.textSecondary }}>
              Try adjusting the time period or severity level
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default NewsAnalysis;
