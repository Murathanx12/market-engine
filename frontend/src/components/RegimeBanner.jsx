import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import useMarketStatus from '../hooks/useMarketStatus';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShowChartIcon from '@mui/icons-material/ShowChart';

const RegimeBanner = () => {
  const { data, isLoading, error } = useMarketStatus();

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          p: 1.5, 
          bgcolor: '#1a1a1a', 
          borderBottom: '1px solid #333',
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Loading market status...
        </Typography>
      </Box>
    );
  }

  if (error || !data?.data) {
    return (
      <Box 
        sx={{ 
          p: 1.5, 
          bgcolor: '#1a1a1a', 
          borderBottom: '1px solid #333',
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="error">
          Unable to fetch market status
        </Typography>
      </Box>
    );
  }

  const { regime, confidence, volatility, last_updated } = data.data;

  const regimeColors = {
    'BULL': { bg: '#00e676', color: '#000' },
    'BEAR': { bg: '#ff1744', color: '#fff' },
    'NEUTRAL': { bg: '#90caf9', color: '#000' },
    'VOLATILE': { bg: '#ffc107', color: '#000' },
  };

  const colors = regimeColors[regime] || { bg: '#666', color: '#fff' };

  const getIcon = () => {
    switch (regime) {
      case 'BULL':
        return <TrendingUpIcon fontSize="small" />;
      case 'BEAR':
        return <TrendingDownIcon fontSize="small" />;
      case 'NEUTRAL':
      default:
        return <ShowChartIcon fontSize="small" />;
    }
  };

  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: '#1a1a1a',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Chip
        icon={getIcon()}
        label={`${regime} MARKET`}
        sx={{
          bgcolor: colors.bg,
          color: colors.color,
          fontWeight: 'bold',
          fontSize: '0.875rem',
        }}
      />
      
      <Typography variant="body2" color="text.secondary">
        Confidence: <strong>{(confidence <= 1 ? confidence * 100 : confidence).toFixed(1)}%</strong>
      </Typography>
      
      <Typography variant="body2" color="text.secondary">
        Volatility: <strong>{(volatility * 100).toFixed(1)}%</strong>
      </Typography>
      
      <Typography variant="caption" color="text.disabled">
        Updated: {new Date(last_updated).toLocaleTimeString()}
      </Typography>
    </Box>
  );
};

export default RegimeBanner;