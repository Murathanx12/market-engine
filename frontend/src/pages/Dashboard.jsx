import React from 'react';
import { Box, Grid, Typography, Chip } from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart,
} from 'recharts';
import { MetricCard } from '../components/MetricCard';
import useMarketStatus from '../hooks/useMarketStatus';
import { useMacroIndicators, useSP500Projection, useCrashEstimator, useNetLiquidity, useNews } from '../hooks/useMarketData';
import { COLORS, getValueColor } from '../theme/darkTheme';

const PANEL_STYLE = {
  bgcolor: COLORS.bgCard,
  border: `1px solid ${COLORS.borderSubtle}`,
  borderRadius: '6px',
  overflow: 'hidden',
  transition: 'border-color 0.2s',
  '&:hover': { borderColor: COLORS.borderActive },
};

const PanelHeader = ({ title, subtitle, children }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center',
    px: 1.75, py: 1.25,
    borderBottom: `1px solid ${COLORS.borderSubtle}`,
    bgcolor: 'rgba(10,22,40,0.8)',
  }}>
    <Typography sx={{
      fontFamily: '"Syne", sans-serif',
      fontSize: '11px', fontWeight: 700,
      letterSpacing: '0.06em', color: COLORS.textPrimary,
    }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography sx={{ fontSize: '9.5px', color: COLORS.textMuted, ml: 1 }}>
        {subtitle}
      </Typography>
    )}
    <Box sx={{ ml: 'auto', display: 'flex', gap: 0.75 }}>
      {children}
    </Box>
  </Box>
);

const Dashboard = () => {
  const { data: marketStatus, isLoading: statusLoading } = useMarketStatus();
  const { data: macroData, isLoading: macroLoading } = useMacroIndicators();
  const { data: sp500Data } = useSP500Projection(5);
  const { data: crashData } = useCrashEstimator(60);
  const { data: netLiqData } = useNetLiquidity();
  const { data: newsData } = useNews(3, 3);

  const isLoading = statusLoading || macroLoading;

  // Extract macro values safely
  const getMacro = (key) => {
    if (!macroData?.data) return null;
    const d = macroData.data;
    return d[key] || d[key.toLowerCase()] || null;
  };

  const cpi = getMacro('cpi')?.value ?? getMacro('CPI')?.current_value;
  const vix = marketStatus?.data?.vix || 18.0;
  const yieldCurve = getMacro('yield_curve')?.value ?? getMacro('Yield_Curve')?.current_value;
  const regime = marketStatus?.data?.regime || 'VOLATILE';
  const spLevel = sp500Data?.current_price || sp500Data?.projections?.current || 6836;

  // Crash probabilities for bars
  const crashBars = [];
  if (crashData?.data) {
    const d = crashData.data;
    const horizons = [
      { label: '3mo', months: 3 },
      { label: '6mo', months: 6 },
      { label: '12mo', months: 12 },
      { label: '24mo', months: 24 },
      { label: '60mo', months: 60 },
    ];
    horizons.forEach(({ label, months }) => {
      const entry = d.monthly_probabilities?.find(m => m.month === months)
        || d.find?.(m => m.month === months);
      const val = entry?.cumulative_crash_prob ?? entry?.crash_prob ?? 0;
      crashBars.push({
        label,
        value: typeof val === 'number' ? (val > 1 ? val : val * 100) : 0,
      });
    });
  }
  if (crashBars.length === 0) {
    [
      { label: '3mo', value: 4.2 },
      { label: '6mo', value: 9.7 },
      { label: '12mo', value: 18.7 },
      { label: '24mo', value: 29.2 },
      { label: '60mo', value: 39.6 },
    ].forEach(b => crashBars.push(b));
  }

  const crashProb1Y = crashBars.find(b => b.label === '12mo')?.value || 18.7;

  // S&P 500 projection chart data
  const chartData = [];
  if (sp500Data?.projections?.sample_paths) {
    const paths = sp500Data.projections.sample_paths;
    const len = paths[0]?.length || 0;
    for (let i = 0; i < len; i++) {
      const values = paths.map(p => p[i]).filter(Boolean);
      if (values.length === 0) continue;
      values.sort((a, b) => a - b);
      chartData.push({
        idx: i,
        p5: values[Math.floor(values.length * 0.05)] || 0,
        p25: values[Math.floor(values.length * 0.25)] || 0,
        median: values[Math.floor(values.length * 0.5)] || 0,
        p75: values[Math.floor(values.length * 0.75)] || 0,
        p95: values[Math.floor(values.length * 0.95)] || 0,
        mean: values.reduce((a, b) => a + b, 0) / values.length,
      });
    }
  }

  // Net liquidity data
  const netLiq = netLiqData?.current || {};

  // News items
  const newsItems = Array.isArray(newsData) ? newsData.slice(0, 3) : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>

      {/* KPI ROW */}
      <Grid container spacing={1.25}>
        {[
          {
            label: 'S&P 500',
            value: typeof spLevel === 'number' ? spLevel.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '6,836',
            variant: 'bull',
            tooltip: 'S&P 500 Index (^GSPC)',
          },
          {
            label: 'VIX Index',
            value: typeof vix === 'number' ? vix.toFixed(1) : '18.4',
            variant: vix > 25 ? 'bear' : vix > 18 ? 'warn' : 'bull',
            tooltip: 'CBOE Volatility Index',
          },
          {
            label: 'CPI YoY',
            value: typeof cpi === 'number' ? cpi.toFixed(1) : '2.9',
            unit: '%',
            variant: cpi > 5 ? 'bear' : cpi < 2 ? 'warn' : 'bull',
            tooltip: 'Consumer Price Index YoY % (FRED: CPIAUCSL)',
          },
          {
            label: 'Yield Curve',
            value: typeof yieldCurve === 'number' ? (yieldCurve >= 0 ? '+' : '') + yieldCurve.toFixed(2) : '+0.15',
            unit: '%',
            variant: yieldCurve < 0 ? 'bear' : yieldCurve < 0.3 ? 'warn' : 'bull',
            tooltip: '10Y-2Y Treasury spread',
          },
          {
            label: 'Crash Prob 1Y',
            value: crashProb1Y.toFixed(1),
            unit: '%',
            variant: crashProb1Y > 30 ? 'bear' : crashProb1Y > 15 ? 'warn' : 'bull',
            tooltip: 'Probability of >=20% drawdown in next 12 months',
          },
        ].map((card, i) => (
          <Grid item xs={12} sm={6} md key={i}>
            <MetricCard {...card} isLoading={isLoading} />
          </Grid>
        ))}
      </Grid>

      {/* MAIN CONTENT GRID */}
      <Grid container spacing={1.75}>

        {/* LEFT: Projection Chart */}
        <Grid item xs={12} md={8}>
          <Box sx={PANEL_STYLE}>
            <PanelHeader title="S&P 500 \u2014 MONTE CARLO PROJECTION" subtitle="GBM simulations with confidence bands" />
            <Box sx={{ p: 2, height: 320 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="confGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.indigo} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={COLORS.indigo} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="idx" stroke={COLORS.textMuted} tick={{ fontSize: 9, fill: COLORS.textMuted }} />
                    <YAxis stroke={COLORS.textMuted} tick={{ fontSize: 9, fill: COLORS.textMuted }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: COLORS.bgElevated,
                        border: `1px solid ${COLORS.borderSubtle}`,
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: COLORS.textPrimary,
                      }}
                      formatter={(val) => ['$' + val.toLocaleString(undefined, { maximumFractionDigits: 0 })]}
                    />
                    <Area type="monotone" dataKey="p95" stroke="transparent" fill="url(#confGradient)" />
                    <Area type="monotone" dataKey="p5" stroke="transparent" fill="transparent" />
                    <Line type="monotone" dataKey="median" stroke={COLORS.indigo} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                    <Line type="monotone" dataKey="mean" stroke={COLORS.emerald} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" color={COLORS.textMuted}>
                    Loading projection data...
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* RIGHT COLUMN */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>

            {/* Crash Probability Bars */}
            <Box sx={PANEL_STYLE}>
              <PanelHeader title="CRASH PROBABILITY" subtitle="\u226520% drawdown">
                <Chip label={`${crashProb1Y.toFixed(1)}% / 1Y`} size="small" sx={{
                  bgcolor: COLORS.amberDim, color: COLORS.amber,
                  fontSize: '9px', height: 18, border: `1px solid ${COLORS.amber}40`
                }} />
              </PanelHeader>
              <Box sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {crashBars.map(({ label, value }) => {
                  const color = value < 10 ? COLORS.emerald : value < 25 ? COLORS.amber : COLORS.crimson;
                  return (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '9px', color: COLORS.textMuted, width: 28 }}>{label}</Typography>
                      <Box sx={{ flex: 1, height: 6, bgcolor: COLORS.bgElevated, borderRadius: '3px', overflow: 'hidden' }}>
                        <Box sx={{
                          height: '100%', width: `${Math.min(value, 100)}%`,
                          bgcolor: color, borderRadius: '3px', transition: 'width 0.6s ease',
                        }} />
                      </Box>
                      <Typography sx={{ fontSize: '9px', color, width: 32, textAlign: 'right' }}>
                        {value.toFixed(1)}%
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Macro Indicators Grid */}
            <Box sx={PANEL_STYLE}>
              <PanelHeader title="MACRO INDICATORS" subtitle="FRED validated" />
              <Grid container spacing={0} sx={{ p: 1.25 }}>
                {[
                  { name: 'CPI YoY', value: cpi != null ? `${cpi.toFixed(1)}%` : '...', color: COLORS.emerald },
                  { name: 'UNRATE', value: getMacro('unemployment')?.value != null ? `${getMacro('unemployment').value.toFixed(1)}%` : '...', color: COLORS.textPrimary },
                  { name: 'FED RATE', value: getMacro('fed_funds_rate')?.value != null ? `${getMacro('fed_funds_rate').value.toFixed(2)}%` : '...', color: COLORS.amber },
                  { name: 'YIELD CURVE', value: yieldCurve != null ? (yieldCurve >= 0 ? '+' : '') + yieldCurve.toFixed(2) : '...', color: COLORS.amber },
                ].map(({ name, value, color }) => (
                  <Grid item xs={6} key={name}>
                    <Box sx={{
                      bgcolor: COLORS.bgElevated,
                      border: `1px solid ${COLORS.borderSubtle}`,
                      borderRadius: '4px', p: '9px 10px', m: 0.5,
                    }}>
                      <Typography sx={{ fontSize: '8px', color: COLORS.textMuted, letterSpacing: '0.1em', mb: 0.5, textTransform: 'uppercase' }}>
                        {name}
                      </Typography>
                      <Typography sx={{ fontSize: '15px', fontFamily: '"Syne", sans-serif', color, lineHeight: 1 }}>
                        {value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* BOTTOM ROW */}
      <Grid container spacing={1.75}>

        {/* Net Liquidity */}
        <Grid item xs={12} md={4}>
          <Box sx={PANEL_STYLE}>
            <PanelHeader title="NET LIQUIDITY INDEX" subtitle="WALCL \u2212 TGA \u2212 RRP" />
            <Box sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: 'Fed Balance Sheet (WALCL)', value: netLiq.walcl, prefix: '$', suffix: 'T', color: COLORS.emerald },
                { label: 'Treasury Acct (TGA)', value: netLiq.tga, prefix: '-$', suffix: 'T', color: COLORS.crimson },
                { label: 'Reverse Repo (RRP)', value: netLiq.rrp, prefix: '-$', suffix: 'T', color: COLORS.crimson },
              ].map(({ label, value, prefix, suffix, color }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '9.5px', color: COLORS.textSecondary }}>{label}</Typography>
                  <Typography sx={{ fontFamily: '"Syne", sans-serif', fontSize: '13px', color }}>
                    {value != null ? `${prefix}${value.toFixed(2)}${suffix}` : '...'}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ borderTop: `1px solid ${COLORS.borderSubtle}`, pt: 1, mt: 0.5 }}>
                <Typography sx={{ fontSize: '8.5px', color: COLORS.textMuted, mb: 0.75 }}>
                  = WALCL - (TGA + RRP) = NET SYSTEM LIQUIDITY
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '9.5px', color: COLORS.textSecondary }}>NET LIQUIDITY</Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontFamily: '"Syne", sans-serif', fontSize: '16px', color: COLORS.emerald }}>
                      {netLiq.net_liquidity != null ? `$${netLiq.net_liquidity.toFixed(2)}T` : '...'}
                    </Typography>
                    {netLiq.signal && (
                      <Typography sx={{ fontSize: '9px', color: netLiq.signal === 'BULLISH' ? COLORS.emerald : netLiq.signal === 'BEARISH' ? COLORS.crimson : COLORS.textMuted }}>
                        {netLiq.wow_change != null && netLiq.wow_change > 0 ? '\u25B2' : '\u25BC'} {netLiq.signal}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* News RAG */}
        <Grid item xs={12} md={8}>
          <Box sx={PANEL_STYLE}>
            <PanelHeader title="NEWS \u2014 SENTIMENT ANALYSIS" subtitle="Recent market-moving events" />
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {newsItems.length > 0 ? newsItems.map((item, i) => (
                <Box key={i} sx={{
                  p: '8px 14px',
                  borderBottom: i < newsItems.length - 1 ? `1px solid ${COLORS.borderSubtle}` : 'none',
                  display: 'flex', gap: 1, alignItems: 'flex-start',
                }}>
                  <Box sx={{
                    width: 3, alignSelf: 'stretch', borderRadius: '2px', mt: 0.25, flexShrink: 0,
                    bgcolor: (item.sentiment_score || 0) > 0 ? COLORS.emerald : (item.sentiment_score || 0) < 0 ? COLORS.crimson : COLORS.amber,
                  }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '10px', color: COLORS.textPrimary, lineHeight: 1.4, mb: 0.5 }}>
                      {item.headline}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, fontSize: '8.5px', color: COLORS.textMuted }}>
                      <span>{item.source}</span>
                      <span>{item.impact_category}</span>
                    </Box>
                  </Box>
                  <Chip
                    label={((item.sentiment_score || 0) >= 0 ? '+' : '') + (item.sentiment_score || 0).toFixed(2)}
                    size="small"
                    sx={{
                      bgcolor: (item.sentiment_score || 0) > 0 ? COLORS.emeraldDim : COLORS.crimsonDim,
                      color: (item.sentiment_score || 0) > 0 ? COLORS.emerald : COLORS.crimson,
                      fontSize: '9px', height: 18, borderRadius: '3px', flexShrink: 0,
                    }}
                  />
                </Box>
              )) : (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color={COLORS.textMuted}>Loading news...</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
