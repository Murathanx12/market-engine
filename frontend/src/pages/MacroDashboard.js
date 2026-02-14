import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Modal,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid2'; // ✅ Grid2 migration
import { useQuery } from '@tanstack/react-query';
import { getMacroIndicatorsValidated, getMacroIndicators } from '../services/api'; // ✅ Using your API
import RegimeBanner from '../components/RegimeBanner';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import CloseIcon from '@mui/icons-material/Close';

const MacroDashboard = () => {
  const [selectedIndicator, setSelectedIndicator] = useState(null);

  // Fetch VALIDATED macro indicators (fixes CPI hallucination)
  const { data: validatedData, isLoading: validatedLoading } = useQuery({
    queryKey: ['macroIndicatorsValidated'],
    queryFn: getMacroIndicatorsValidated,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Fetch legacy dashboard data (for sparklines and trends)
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['macroDashboard'],
    queryFn: getMacroIndicators,
    staleTime: 30 * 60 * 1000,
  });

  const isLoading = validatedLoading || dashboardLoading;

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'rising':
        return <TrendingUpIcon fontSize="small" sx={{ color: '#ff1744' }} />;
      case 'falling':
        return <TrendingDownIcon fontSize="small" sx={{ color: '#00e676' }} />;
      default:
        return <TrendingFlatIcon fontSize="small" sx={{ color: '#888' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'elevated':
        return '#ff1744';
      case 'caution':
        return '#ffc107';
      default:
        return '#00e676';
    }
  };

  const handleIndicatorClick = (indicator) => {
    setSelectedIndicator(indicator);
  };

  const handleCloseModal = () => {
    setSelectedIndicator(null);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff' }}>
      <RegimeBanner />

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          MACRO DASHBOARD
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress sx={{ color: '#00d4ff' }} />
          </Box>
        )}

        {/* Validated FRED Indicators */}
        {validatedData?.data && (
          <>
            <Typography variant="h6" sx={{ mb: 2, color: '#00d4ff' }}>
              ✅ VALIDATED FRED INDICATORS
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {Object.entries(validatedData.data)
                .filter(([key]) => key !== 'note')
                .map(([key, indicator]) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={key}>
                    <Paper
                      sx={{
                        p: 2.5,
                        bgcolor: '#111',
                        border: '1px solid #333',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: '#00d4ff',
                          transform: 'translateY(-4px)',
                        },
                      }}
                      onClick={() => handleIndicatorClick(indicator)}
                    >
                      <Typography variant="overline" color="text.secondary">
                        {indicator.label}
                      </Typography>
                      
                      <Typography
                        variant="h4"
                        sx={{ my: 1.5, fontWeight: 'bold', color: '#00d4ff' }}
                      >
                        {indicator.value}
                        {indicator.unit}
                      </Typography>

                      {indicator.trend && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {getTrendIcon(indicator.trend)}
                          <Typography variant="body2" color="text.secondary">
                            {indicator.change_1m ? `${indicator.change_1m > 0 ? '+' : ''}${indicator.change_1m}${indicator.unit}` : 'N/A'}
                          </Typography>
                        </Box>
                      )}

                      <Typography variant="caption" sx={{ color: '#888' }}>
                        {indicator.interpretation}
                      </Typography>

                      {indicator.date && (
                        <Typography variant="caption" display="block" sx={{ mt: 1, color: '#666' }}>
                          As of {new Date(indicator.date).toLocaleDateString()}
                        </Typography>
                      )}

                      {/* Special handling for yield curve */}
                      {indicator.inverted !== undefined && (
                        <Chip
                          label={indicator.inverted ? 'INVERTED' : 'NORMAL'}
                          size="small"
                          sx={{
                            mt: 1,
                            bgcolor: indicator.inverted ? '#ff1744' : '#00e676',
                            color: '#fff',
                            fontWeight: 'bold',
                          }}
                        />
                      )}
                    </Paper>
                  </Grid>
                ))}
            </Grid>
          </>
        )}

        {/* Dashboard Indicators with Status */}
        {dashboardData && Array.isArray(dashboardData) && (
          <>
            <Typography variant="h6" sx={{ mb: 2, color: '#888' }}>
              DASHBOARD INDICATORS
            </Typography>
            <Grid container spacing={3}>
              {dashboardData.map((indicator, idx) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                  <Paper sx={{ p: 2.5, bgcolor: '#111', border: '1px solid #333' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="overline" color="text.secondary">
                        {indicator.indicator}
                      </Typography>
                      <Chip
                        label={indicator.status.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(indicator.status),
                          color: indicator.status === 'caution' ? '#000' : '#fff',
                          fontWeight: 'bold',
                          fontSize: '0.65rem',
                        }}
                      />
                    </Box>

                    <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                      {indicator.current_value}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getTrendIcon(indicator.trend)}
                      <Typography variant="body2" color="text.secondary">
                        {indicator.change_1m !== null
                          ? `${indicator.change_1m > 0 ? '+' : ''}${indicator.change_1m.toFixed(2)}`
                          : 'N/A'} (1M)
                      </Typography>
                    </Box>

                    {indicator.date && (
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: '#666' }}>
                        {new Date(indicator.date).toLocaleDateString()}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* No Data State */}
        {!isLoading && !validatedData?.data && !dashboardData && (
          <Alert severity="info">
            No macro data available. Scheduler needs to run to populate data.
          </Alert>
        )}
      </Box>

      {/* Indicator Detail Modal */}
      <Modal
        open={!!selectedIndicator}
        onClose={handleCloseModal}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Paper
          sx={{
            width: '90%',
            maxWidth: 800,
            maxHeight: '90vh',
            overflow: 'auto',
            p: 4,
            bgcolor: '#111',
            border: '1px solid #333',
          }}
        >
          {selectedIndicator && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {selectedIndicator.label}
                </Typography>
                <IconButton onClick={handleCloseModal} sx={{ color: '#fff' }}>
                  <CloseIcon />
                </IconButton>
              </Box>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="overline" color="text.secondary">
                    Current Value
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00d4ff', mb: 2 }}>
                    {selectedIndicator.value}
                    {selectedIndicator.unit}
                  </Typography>
                </Grid>

                {selectedIndicator.raw_index && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">
                      Raw Index Value
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#888', mb: 2 }}>
                      {selectedIndicator.raw_index}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              <Box sx={{ mt: 3, p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                <Typography variant="body1" sx={{ color: '#ccc' }}>
                  {selectedIndicator.interpretation}
                </Typography>
              </Box>

              {selectedIndicator.date && (
                <Typography variant="caption" display="block" sx={{ mt: 2, color: '#666' }}>
                  Data as of: {new Date(selectedIndicator.date).toLocaleString()}
                </Typography>
              )}
            </>
          )}
        </Paper>
      </Modal>
    </Box>
  );
};

export default MacroDashboard;