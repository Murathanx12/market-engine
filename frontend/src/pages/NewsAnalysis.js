import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, Grid, CircularProgress, Alert,
  Slider, Chip,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { getNews } from '../services/api';

const colors = { good: '#4caf50', bad: '#ef5350', info: '#64b5f6', warning: '#ffa726', muted: '#888', accent: '#fff' };

const sentimentColor = (score) => score > 0.15 ? colors.good : score < -0.15 ? colors.bad : colors.muted;
const impactColor = (impact) => impact > 0 ? colors.good : impact < 0 ? colors.bad : colors.muted;

const NewsAnalysis = () => {
  const [days, setDays] = useState(7);
  const [minSeverity, setMinSeverity] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['news', days, minSeverity],
    queryFn: () => getNews(days, minSeverity),
    staleTime: 300000,
  });

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress sx={{ color: '#fff' }} /></Box>;
  if (error) return <Alert severity="error">Error: {error?.message}</Alert>;

  const news = Array.isArray(data) ? data : [];

  // Category breakdown for chart
  const catMap = {};
  news.forEach(n => {
    const cat = n.impact_category || 'General';
    if (!catMap[cat]) catMap[cat] = { count: 0, avgSentiment: 0, totalImpact: 0 };
    catMap[cat].count++;
    catMap[cat].avgSentiment += n.sentiment_score || 0;
    catMap[cat].totalImpact += n.estimated_impact || 0;
  });
  const catData = Object.entries(catMap).map(([name, d]) => ({
    name,
    count: d.count,
    avgSentiment: d.count > 0 ? d.avgSentiment / d.count : 0,
    totalImpact: d.totalImpact,
  }));

  const avgSentiment = news.length > 0 ? news.reduce((s, n) => s + (n.sentiment_score || 0), 0) / news.length : 0;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>News Impact</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Sentiment analysis and estimated market impact</Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1 }}>Time Range: {days} days</Typography>
            <Slider value={days} onChange={(_, v) => setDays(v)} min={1} max={30} sx={{ color: '#fff' }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1 }}>Min Severity: {minSeverity}</Typography>
            <Slider value={minSeverity} onChange={(_, v) => setMinSeverity(v)} min={1} max={10} sx={{ color: '#fff' }} />
          </Grid>
        </Grid>
      </Card>

      <Grid container spacing={3}>
        {/* Summary metrics */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1, textTransform: 'uppercase' }}>Avg Sentiment</Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: sentimentColor(avgSentiment) }}>
              {avgSentiment >= 0 ? '+' : ''}{avgSentiment.toFixed(2)}
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              {avgSentiment > 0.15 ? 'Positive' : avgSentiment < -0.15 ? 'Negative' : 'Neutral'} · {news.length} articles
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>Articles by Category</Typography>
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={catData} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" stroke="#555" />
                  <YAxis type="category" dataKey="name" stroke="#555" tick={{ fontSize: 11 }} width={75} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8e8' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {catData.map((d, i) => <Cell key={i} fill={sentimentColor(d.avgSentiment)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography sx={{ color: 'text.secondary' }}>No data</Typography>
            )}
          </Card>
        </Grid>

        {/* News List */}
        {news.map((n, idx) => (
          <Grid size={{ xs: 12 }} key={n.id || idx}>
            <Card sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 500, color: '#ddd', mb: 0.5, lineHeight: 1.4 }}>{n.headline}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>{n.source}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#555' }}>·</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>{n.date?.slice(0, 10)}</Typography>
                  <Chip label={n.impact_category || 'General'} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: 'rgba(255,255,255,0.05)', color: '#888' }} />
                  <Chip
                    label={`Severity: ${n.severity || 0}`}
                    size="small"
                    sx={{
                      height: 20, fontSize: '0.68rem',
                      bgcolor: (n.severity || 0) >= 8 ? 'rgba(239,83,80,0.12)' : (n.severity || 0) >= 5 ? 'rgba(255,167,38,0.12)' : 'rgba(76,175,80,0.12)',
                      color: (n.severity || 0) >= 8 ? colors.bad : (n.severity || 0) >= 5 ? colors.warning : colors.good,
                    }}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 180 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.68rem', color: '#555', textTransform: 'uppercase' }}>Sentiment</Typography>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: sentimentColor(n.sentiment_score) }}>
                    {(n.sentiment_score || 0) >= 0 ? '+' : ''}{(n.sentiment_score || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.68rem', color: '#555', textTransform: 'uppercase' }}>S&P Impact</Typography>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: impactColor(n.estimated_impact) }}>
                    {(n.estimated_impact || 0) >= 0 ? '+' : ''}{(n.estimated_impact || 0).toFixed(2)}%
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}

        {news.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: 'text.secondary' }}>No news articles found. Adjust filters or wait for scheduler to fetch data.</Typography>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default NewsAnalysis;