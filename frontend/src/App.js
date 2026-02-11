import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Typography,
  IconButton,
  Drawer,
  useMediaQuery,
} from '@mui/material';
import {
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Newspaper as NewsIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  Equalizer as EqualizerIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

// Pages
import CrashMonitor from './pages/CrashMonitor';
import StockTracker from './pages/StockTracker';
import NewsAnalysis from './pages/NewsAnalysis';
import WeeklyReport from './pages/WeeklyReport';
import SimulationAccuracy from './pages/SimulationAccuracy';
import ScenarioPlanner from './pages/ScenarioPlanner';
import MacroDashboard from './pages/MacroDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

/* ─── Professional B&W Theme with Semantic Color Coding ──────────── */
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ffffff' },
    secondary: { main: '#a0a0a0' },
    success: { main: '#4caf50' },   // muted green
    error: { main: '#ef5350' },     // muted red
    warning: { main: '#ffa726' },   // muted amber
    info: { main: '#64b5f6' },      // muted blue
    background: {
      default: '#0a0a0a',
      paper: '#141414',
    },
    text: {
      primary: '#e8e8e8',
      secondary: '#888888',
    },
    divider: 'rgba(255,255,255,0.06)',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontWeight: 600, fontSize: '1.5rem', color: '#e8e8e8' },
    h6: { fontWeight: 500, color: '#e8e8e8' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#141414',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: '#ffffff',
          color: '#0a0a0a',
          fontWeight: 600,
          '&:hover': { backgroundColor: '#e0e0e0' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.12)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.25)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ffffff',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});

/* ─── Semantic color helpers (used across all pages) ──────────────── */
// green = good, red = bad, blue/cyan = neutral/info
// exported so pages can import from App if needed, but pages inline them

const sidebarWidth = 260;

function NavItem({ to, icon, text, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '11px 20px',
        color: active ? '#ffffff' : '#888888',
        backgroundColor: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        borderLeft: active ? '3px solid #ffffff' : '3px solid transparent',
        transition: 'all 0.2s ease',
        marginBottom: 2,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Box sx={{ mr: 2, display: 'flex', opacity: active ? 1 : 0.6 }}>{icon}</Box>
      <Typography sx={{ fontSize: '0.88rem', fontWeight: active ? 600 : 400 }}>
        {text}
      </Typography>
    </Link>
  );
}

function SidebarContent({ menuItems, pathname, onClose }) {
  return (
    <Box sx={{ width: sidebarWidth, height: '100%', bgcolor: '#0e0e0e', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 1.5,
              bgcolor: '#ffffff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', mr: 1.5,
            }}
          >
            <Typography sx={{ fontSize: '1.2rem', lineHeight: 1 }}>📈</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#e8e8e8', letterSpacing: '-0.01em' }}>
              Market Prediction
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: '#666', letterSpacing: '0.02em' }}>
              AI Intelligence Engine v5.0
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ mt: 2, flex: 1, overflowY: 'auto' }}>
        <Typography
          sx={{ px: 2.5, py: 0.8, fontSize: '0.65rem', color: '#555', fontWeight: 700, letterSpacing: '0.12em' }}
        >
          NAVIGATION
        </Typography>
        {menuItems.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            icon={item.icon}
            text={item.text}
            active={pathname === item.path}
            onClick={onClose}
          />
        ))}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography sx={{ fontSize: '0.65rem', color: '#444' }}>
          © 2025 Market Prediction Engine
        </Typography>
      </Box>
    </Box>
  );
}

function AppContent() {
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [
    { path: '/', icon: <WarningIcon fontSize="small" />, text: 'Crash Monitor' },
    { path: '/stock-tracker', icon: <TrendingUpIcon fontSize="small" />, text: 'Stock Tracker' },
    { path: '/news', icon: <NewsIcon fontSize="small" />, text: 'News Impact' },
    { path: '/macro', icon: <EqualizerIcon fontSize="small" />, text: 'Macro Dashboard' },
    { path: '/weekly-report', icon: <AssessmentIcon fontSize="small" />, text: 'Weekly Report' },
    { path: '/scenarios', icon: <TimelineIcon fontSize="small" />, text: 'Scenario Planning' },
    { path: '/accuracy', icon: <SettingsIcon fontSize="small" />, text: 'Accuracy Tracking' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />

      {/* Mobile hamburger */}
      {isMobile && (
        <IconButton
          onClick={() => setDrawerOpen(true)}
          sx={{ position: 'fixed', top: 12, left: 12, zIndex: 1300, color: '#e8e8e8' }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Sidebar — fixed on desktop, drawer on mobile */}
      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{ sx: { bgcolor: '#0e0e0e', borderRight: '1px solid rgba(255,255,255,0.06)' } }}
        >
          <SidebarContent menuItems={menuItems} pathname={location.pathname} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      ) : (
        <Box
          sx={{
            width: sidebarWidth, bgcolor: '#0e0e0e',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            position: 'fixed', height: '100vh', overflowY: 'auto',
          }}
        >
          <SidebarContent menuItems={menuItems} pathname={location.pathname} onClose={() => {}} />
        </Box>
      )}

      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          ml: isMobile ? 0 : `${sidebarWidth}px`,
          p: { xs: 2, sm: 3, md: 4 },
          pt: isMobile ? 7 : 4,
          minHeight: '100vh',
        }}
      >
        <Routes>
          <Route path="/" element={<CrashMonitor />} />
          <Route path="/stock-tracker" element={<StockTracker />} />
          <Route path="/news" element={<NewsAnalysis />} />
          <Route path="/macro" element={<MacroDashboard />} />
          <Route path="/weekly-report" element={<WeeklyReport />} />
          <Route path="/scenarios" element={<ScenarioPlanner />} />
          <Route path="/accuracy" element={<SimulationAccuracy />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
