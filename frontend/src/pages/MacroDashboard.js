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
import Grid from '@mui/material/Unstable_Grid2';
import { useQuery } from '@tanstack/react-query';
import { getMacroIndicatorsValidated } from '../services/api';
import { COLORS } from '../theme/darkTheme';
import CloseIcon from '@mui/icons-material/Close';

const MacroDashboard = () => {
  const [selectedIndicator, setSelectedIndicator] = useState(null);

  const { data: validatedData, isLoading } = useQuery({
    queryKey: ['macroIndicatorsValidated'],
    queryFn: getMacroIndicatorsValidated,
    staleTime: 30 * 60 * 1000,
  });

  const warningState = validatedData?.data?.warning_state;
  const indicators = Object.entries(validatedData?.data || {}).filter(
    ([key]) => !['note', 'warning_state'].includes(key)
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.bgVoid, color: COLORS.textPrimary }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: COLORS.textPrimary }}>
          MACRO DASHBOARD
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress sx={{ color: COLORS.emerald }} />
          </Box>
        )}

        {warningState?.has_warnings && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {warningState.messages?.join(' | ') || 'Some macro values are fallback estimates.'}
          </Alert>
        )}

        {indicators.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mb: 2, color: COLORS.emerald }}>
              CANONICAL VALIDATED MACRO INDICATORS
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {indicators.map(([key, indicator]) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={key}>
                  <Paper
                    sx={{
                      p: 2.5,
                      bgcolor: COLORS.bgCard,
                      border: `1px solid ${COLORS.borderSubtle}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: COLORS.borderActive,
                        transform: 'translateY(-4px)',
                      },
                    }}
                    onClick={() => setSelectedIndicator(indicator)}
                  >
                    <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                      {indicator.label}
                    </Typography>

                    <Typography
                      variant="h4"
                      sx={{ my: 1.5, fontWeight: 'bold', color: COLORS.emerald }}
                    >
                      {indicator.value ?? indicator.spread}
                      {indicator.unit}
                    </Typography>

                    <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                      {indicator.interpretation}
                    </Typography>

                    {indicator.warning && (
                      <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
                        {indicator.warning}
                      </Alert>
                    )}

                    {indicator.date && (
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: COLORS.textMuted }}>
                        As of {new Date(indicator.date).toLocaleDateString()}
                      </Typography>
                    )}

                    {indicator.inverted !== undefined && (
                      <Chip
                        label={indicator.inverted ? 'INVERTED' : 'NORMAL'}
                        size="small"
                        sx={{
                          mt: 1,
                          bgcolor: indicator.inverted ? COLORS.crimson : COLORS.emerald,
                          color: COLORS.textPrimary,
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

        {!isLoading && indicators.length === 0 && (
          <Alert severity="info">
            No canonical macro data available. Verify FRED connectivity and scheduler runs.
          </Alert>
        )}
      </Box>

      <Modal
        open={!!selectedIndicator}
        onClose={() => setSelectedIndicator(null)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Paper
          sx={{
            width: '90%',
            maxWidth: 800,
            maxHeight: '90vh',
            overflow: 'auto',
            p: 4,
            bgcolor: COLORS.bgCard,
            border: `1px solid ${COLORS.borderSubtle}`,
          }}
        >
          {selectedIndicator && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.textPrimary }}>
                  {selectedIndicator.label}
                </Typography>
                <IconButton onClick={() => setSelectedIndicator(null)} sx={{ color: COLORS.textPrimary }}>
                  <CloseIcon />
                </IconButton>
              </Box>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                    Current Value
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: COLORS.emerald, mb: 2 }}>
                    {selectedIndicator.value ?? selectedIndicator.spread}
                    {selectedIndicator.unit}
                  </Typography>
                </Grid>

                {selectedIndicator.raw_index && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" sx={{ color: COLORS.textSecondary }}>
                      Raw Index Value
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', color: COLORS.textMuted, mb: 2 }}>
                      {selectedIndicator.raw_index}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              <Box sx={{ mt: 3, p: 2, bgcolor: COLORS.bgElevated, borderRadius: 1 }}>
                <Typography variant="body1" sx={{ color: COLORS.textSecondary }}>
                  {selectedIndicator.interpretation}
                </Typography>
              </Box>

              {selectedIndicator.warning && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {selectedIndicator.warning}
                </Alert>
              )}
            </>
          )}
        </Paper>
      </Modal>
    </Box>
  );
};

export default MacroDashboard;
