import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import useMarketStatus from '../hooks/useMarketStatus';
import { COLORS, getRegimeColor } from '../theme/darkTheme';

const RegimeBanner = () => {
  const { data, isLoading, error } = useMarketStatus();

  if (isLoading) {
    return (
      <Box sx={{
        height: 32,
        bgcolor: 'rgba(2,6,23,0.9)',
        borderBottom: `1px solid ${COLORS.borderSubtle}`,
        display: 'flex', alignItems: 'center', px: 2,
      }}>
        <Typography variant="caption" color={COLORS.textMuted}>
          LOADING REGIME DATA...
        </Typography>
      </Box>
    );
  }

  if (error || !data?.data) {
    return (
      <Box sx={{
        height: 32,
        bgcolor: 'rgba(2,6,23,0.9)',
        borderBottom: `1px solid ${COLORS.borderSubtle}`,
        display: 'flex', alignItems: 'center', px: 2,
      }}>
        <Typography variant="caption" color={COLORS.crimson}>
          REGIME DATA UNAVAILABLE
        </Typography>
      </Box>
    );
  }

  const { regime, confidence, volatility, last_updated, probabilities } = data.data;
  const regimeColor = getRegimeColor(regime);
  const confPct = (confidence <= 1 ? confidence * 100 : confidence).toFixed(0);
  const volPct = ((volatility || 0) * 100).toFixed(1);

  // Transition risk: if second-highest probability > 30%, flag it
  let transitionRisk = 0;
  if (probabilities) {
    const probs = Object.values(probabilities).sort((a, b) => b - a);
    if (probs.length >= 2) transitionRisk = probs[1];
  }

  return (
    <Box sx={{
      height: 32,
      bgcolor: 'rgba(2,6,23,0.92)',
      borderBottom: `1px solid ${COLORS.borderSubtle}`,
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', px: 2,
      gap: 2.5,
      fontSize: '10px',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Pulsing regime dot */}
      <Box sx={{
        width: 7, height: 7, borderRadius: '50%',
        bgcolor: regimeColor,
        boxShadow: `0 0 8px ${regimeColor}`,
        flexShrink: 0,
        animation: 'pulse 2s infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
      }} />

      <Typography variant="caption" sx={{
        color: regimeColor, fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap',
      }}>
        GLOBAL REGIME: {regime || 'UNKNOWN'}
      </Typography>

      <Typography variant="caption" color={COLORS.textMuted}>|</Typography>

      <Typography variant="caption" color={COLORS.textSecondary} sx={{ whiteSpace: 'nowrap' }}>
        HMM CONFIDENCE: <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>
          {confPct}%
        </span>
      </Typography>

      <Typography variant="caption" color={COLORS.textMuted}>|</Typography>

      <Typography variant="caption" color={COLORS.textSecondary} sx={{ whiteSpace: 'nowrap' }}>
        REALIZED VOL: <span style={{ color: parseFloat(volPct) > 25 ? COLORS.amber : COLORS.emerald }}>
          {volPct}%
        </span>
      </Typography>

      {transitionRisk > 0.25 && (
        <>
          <Typography variant="caption" color={COLORS.textMuted}>|</Typography>
          <Chip
            label={`TRANSITION RISK: ${(transitionRisk * 100).toFixed(0)}%`}
            size="small"
            sx={{
              bgcolor: COLORS.amberDim,
              color: COLORS.amber,
              fontSize: '9px',
              height: 18,
              borderRadius: '3px',
              border: `1px solid ${COLORS.amber}40`,
            }}
          />
        </>
      )}

      <Typography variant="caption" color={COLORS.textMuted} sx={{ ml: 'auto', whiteSpace: 'nowrap' }}>
        {last_updated
          ? new Date(last_updated).toLocaleTimeString()
          : '--:--:--'
        }
      </Typography>
    </Box>
  );
};

export default RegimeBanner;
