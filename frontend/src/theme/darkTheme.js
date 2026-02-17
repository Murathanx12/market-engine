import { createTheme } from '@mui/material/styles';

// ═══════════════════════════════════════════════════
// MARKET ENGINE — CARBON SLATE DESIGN SYSTEM
// Bloomberg-inspired financial terminal aesthetics
// ═══════════════════════════════════════════════════

export const COLORS = {
  // Backgrounds (darkest to lightest)
  bgVoid:       '#020617',
  bgDeep:       '#0a1628',
  bgCard:       '#0f1f35',
  bgElevated:   '#162844',
  bgHighlight:  '#1e3a5f',

  // Borders
  borderSubtle: 'rgba(99,150,220,0.12)',
  borderActive: 'rgba(99,150,220,0.35)',

  // Text
  textPrimary:   '#e2eaf8',
  textSecondary: '#7b9cc4',
  textMuted:     '#3d5a80',

  // Semantic accents
  emerald:     '#00d9a0',
  emeraldDim:  'rgba(0,217,160,0.12)',
  crimson:     '#ff3d5a',
  crimsonDim:  'rgba(255,61,90,0.10)',
  amber:       '#f59e0b',
  amberDim:    'rgba(245,158,11,0.10)',
  indigo:      '#6366f1',
  indigoDim:   'rgba(99,102,241,0.12)',
};

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: COLORS.bgVoid,
      paper:   COLORS.bgCard,
    },
    primary: {
      main: COLORS.emerald,
      dark: '#00a37a',
    },
    secondary: {
      main: COLORS.indigo,
    },
    error: {
      main: COLORS.crimson,
    },
    warning: {
      main: COLORS.amber,
    },
    success: {
      main: COLORS.emerald,
    },
    info: {
      main: '#6396dc',
    },
    text: {
      primary:   COLORS.textPrimary,
      secondary: COLORS.textSecondary,
      disabled:  COLORS.textMuted,
    },
    divider: COLORS.borderSubtle,
  },
  typography: {
    fontFamily: '"JetBrains Mono", "Roboto Mono", monospace',
    h1: { fontFamily: '"Syne", sans-serif', fontWeight: 800 },
    h2: { fontFamily: '"Syne", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Syne", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Syne", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Syne", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Syne", sans-serif', fontWeight: 600 },
    subtitle1: { fontSize: '0.85rem' },
    subtitle2: { fontSize: '0.75rem' },
    body1: { fontSize: '0.8rem' },
    body2: { fontSize: '0.75rem' },
    caption: { fontSize: '0.65rem', letterSpacing: '0.08em' },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: COLORS.bgVoid,
          backgroundImage: `
            linear-gradient(rgba(99,150,220,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,150,220,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        },
        '::-webkit-scrollbar': { width: '4px', height: '4px' },
        '::-webkit-scrollbar-track': { background: COLORS.bgDeep },
        '::-webkit-scrollbar-thumb': { background: COLORS.bgHighlight, borderRadius: '2px' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.bgCard,
          border: `1px solid ${COLORS.borderSubtle}`,
          boxShadow: 'none',
          backgroundImage: 'none',
          '&:hover': { borderColor: COLORS.borderActive },
          transition: 'border-color 0.2s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.bgCard,
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(2,6,23,0.92)',
          borderBottom: `1px solid ${COLORS.borderSubtle}`,
          backdropFilter: 'blur(12px)',
          boxShadow: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: COLORS.bgDeep,
          color: COLORS.textMuted,
          fontSize: '0.65rem',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          borderBottom: `1px solid ${COLORS.borderSubtle}`,
          padding: '8px 12px',
        },
        body: {
          color: COLORS.textSecondary,
          fontSize: '0.75rem',
          borderBottom: `1px solid rgba(30,58,95,0.4)`,
          padding: '6px 12px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.65rem',
          height: '20px',
          letterSpacing: '0.06em',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: COLORS.bgElevated, borderRadius: '2px' },
        bar:  { borderRadius: '2px' },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: COLORS.emerald,
          color: '#000',
          fontWeight: 600,
          '&:hover': { backgroundColor: '#00a37a' },
        },
        outlined: {
          borderColor: COLORS.borderSubtle,
          color: COLORS.textSecondary,
          '&:hover': { borderColor: COLORS.borderActive },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.borderSubtle },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.borderActive },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.emerald },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.bgElevated,
          border: `1px solid ${COLORS.borderSubtle}`,
          fontSize: '0.7rem',
          color: COLORS.textPrimary,
        },
      },
    },
  },
});

/** Get semantic color for a numeric value */
export const getValueColor = (value, threshold = 0) => {
  if (value > threshold) return COLORS.emerald;
  if (value < threshold) return COLORS.crimson;
  return COLORS.textSecondary;
};

/** Get regime-specific color */
export const getRegimeColor = (regime) => {
  const map = {
    BULL: COLORS.emerald,
    BEAR: COLORS.crimson,
    VOLATILE: COLORS.amber,
    NEUTRAL: COLORS.indigo,
    CRISIS: COLORS.crimson,
  };
  return map[regime?.toUpperCase()] || COLORS.textSecondary;
};

export default darkTheme;
