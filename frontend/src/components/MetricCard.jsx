import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { COLORS } from '../theme/darkTheme';

const accentColors = {
  bull: COLORS.emerald,
  bear: COLORS.crimson,
  warn: COLORS.amber,
  neutral: COLORS.indigo,
};

export const MetricCard = ({
  label,
  value,
  delta,
  deltaLabel,
  unit = '',
  variant = 'neutral',
  tooltip,
  isLoading = false,
}) => {
  const accent = accentColors[variant] || COLORS.indigo;

  return (
    <Tooltip title={tooltip || ''} placement="top">
      <Box sx={{
        bgcolor: COLORS.bgCard,
        border: `1px solid ${COLORS.borderSubtle}`,
        borderRadius: '6px',
        p: '12px 14px',
        position: 'relative',
        overflow: 'hidden',
        cursor: tooltip ? 'help' : 'default',
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: COLORS.borderActive },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '2px',
          bgcolor: accent,
          boxShadow: `0 0 8px ${accent}`,
        },
      }}>
        <Typography sx={{
          fontSize: '8.5px', fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: COLORS.textMuted, mb: 0.75,
        }}>
          {label}
        </Typography>

        {isLoading ? (
          <Box sx={{ height: 28, bgcolor: COLORS.bgElevated, borderRadius: 1, animation: 'pulse 1.5s infinite' }} />
        ) : (
          <Typography sx={{
            fontSize: '22px', fontWeight: 500,
            fontFamily: '"Syne", sans-serif',
            color: variant === 'neutral' ? COLORS.textPrimary : accent,
            lineHeight: 1, mb: 0.5,
          }}>
            {value}{unit}
          </Typography>
        )}

        {delta !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{
              fontSize: '9.5px',
              color: delta >= 0 ? COLORS.emerald : COLORS.crimson,
            }}>
              {delta >= 0 ? '\u25B2' : '\u25BC'} {Math.abs(delta).toFixed(2)}{unit}
            </Typography>
            {deltaLabel && (
              <Typography sx={{ fontSize: '9px', color: COLORS.textMuted }}>
                {deltaLabel}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};

export default MetricCard;
