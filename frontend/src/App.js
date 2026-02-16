import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
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
  ShowChart as ShowChartIcon,
  AccountBalance as PortfolioIcon,
} from '@mui/icons-material';

// Pages
import CrashMonitor from './pages/CrashMonitor';
import CrashEstimator from './pages/CrashEstimator';
import StockTracker from './pages/StockTracker';
import NewsAnalysis from './pages/NewsAnalysis';
import AnalysisPage from './pages/AnalysisPage';
import SimulationAccuracy from './pages/SimulationAccuracy';
import ScenarioPlanner from './pages/ScenarioPlanner';
import MacroDashboard from './pages/MacroDashboard';
import Portfolio from './pages/Portfolio';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },
    secondary: { main: '#64748b' },
    success: { main: '#4caf50' },
    error: { main: '#ef5350' },
    warning: { main: '#ffa726' },
    info: { main: '#0ea5e9' },
    background: { default: '#f4f7fb', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    divider: 'rgba(15, 23, 42, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontWeight: 700, fontSize: '1.6rem', color: '#0f172a' },
    h6: { fontWeight: 600, color: '#0f172a' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderRadius: 12,
          border: '1px solid rgba(15,23,42,0.08)',
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: '#2563eb',
          color: '#ffffff',
          fontWeight: 600,
          '&:hover': { backgroundColor: '#1d4ed8' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(15,23,42,0.18)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(15,23,42,0.3)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
        },
      },
    },
  },
});

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
        color: active ? '#1e3a8a' : '#475569',
        backgroundColor: active ? 'rgba(37,99,235,0.12)' : 'transparent',
        borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
        transition: 'all 0.2s ease',
        marginBottom: 2,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.06)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <Box sx={{ mr: 2, display: 'flex', opacity: active ? 1 : 0.6 }}>{icon}</Box>
      <Typography sx={{ fontSize: '0.88rem', fontWeight: active ? 600 : 400 }}>{text}</Typography>
    </Link>
  );
}

function SidebarContent({ menuItems, pathname, onClose }) {
  return (
    <Box sx={{ width: sidebarWidth, height: '100%', bgcolor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
            <Typography sx={{ fontSize: '1.2rem', lineHeight: 1 }}>📈</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
              Market Engine
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: '#64748b', letterSpacing: '0.02em' }}>
              AI Crash Detection & Forecasting
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 2, flex: 1, overflowY: 'auto' }}>
        <Typography sx={{ px: 2.5, py: 0.8, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.12em' }}>
          ANALYSIS
        </Typography>
        {menuItems.filter(i => i.group === 'analysis').map((item) => (
          <NavItem key={item.path} to={item.path} icon={item.icon} text={item.text} active={pathname === item.path} onClick={onClose} />
        ))}

        <Typography sx={{ px: 2.5, py: 0.8, mt: 1.5, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.12em' }}>
          TOOLS
        </Typography>
        {menuItems.filter(i => i.group === 'tools').map((item) => (
          <NavItem key={item.path} to={item.path} icon={item.icon} text={item.text} active={pathname === item.path} onClick={onClose} />
        ))}

        <Typography sx={{ px: 2.5, py: 0.8, mt: 1.5, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.12em' }}>
          DATA
        </Typography>
        {menuItems.filter(i => i.group === 'data').map((item) => (
          <NavItem key={item.path} to={item.path} icon={item.icon} text={item.text} active={pathname === item.path} onClick={onClose} />
        ))}
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(15,23,42,0.08)' }}>
        <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>© 2026 Market Engine</Typography>
      </Box>
    </Box>
  );
}

function AppContent() {
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [
    // Analysis group
    { path: '/', icon: <WarningIcon fontSize="small" />, text: 'Crash Monitor', group: 'analysis' },
    { path: '/crash-estimator', icon: <ShowChartIcon fontSize="small" />, text: 'Crisis Timeline', group: 'analysis' },
    { path: '/stock-tracker', icon: <TrendingUpIcon fontSize="small" />, text: 'Stock Tracker', group: 'analysis' },
    { path: '/analysis', icon: <AssessmentIcon fontSize="small" />, text: 'Analysis', group: 'analysis' },
    // Tools group
    { path: '/portfolio', icon: <PortfolioIcon fontSize="small" />, text: 'Portfolio', group: 'tools' },
    { path: '/scenarios', icon: <TimelineIcon fontSize="small" />, text: 'Scenario Planner', group: 'tools' },
    { path: '/accuracy', icon: <SettingsIcon fontSize="small" />, text: 'Model Accuracy', group: 'tools' },
    // Data group
    { path: '/news', icon: <NewsIcon fontSize="small" />, text: 'News Impact', group: 'data' },
    { path: '/macro', icon: <EqualizerIcon fontSize="small" />, text: 'Macro Dashboard', group: 'data' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />

      {isMobile && (
        <IconButton
          onClick={() => setDrawerOpen(true)}
          sx={{ position: 'fixed', top: 12, left: 12, zIndex: 1300, color: '#1e293b' }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{ sx: { bgcolor: '#ffffff', borderRight: '1px solid rgba(15,23,42,0.08)' } }}
        >
          <SidebarContent menuItems={menuItems} pathname={location.pathname} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      ) : (
        <Box sx={{ width: sidebarWidth, bgcolor: '#ffffff', borderRight: '1px solid rgba(15,23,42,0.08)', position: 'fixed', height: '100vh', overflowY: 'auto' }}>
          <SidebarContent menuItems={menuItems} pathname={location.pathname} onClose={() => {}} />
        </Box>
      )}

      <Box sx={{ flexGrow: 1, ml: isMobile ? 0 : `${sidebarWidth}px`, p: { xs: 2, sm: 3, md: 4 }, pt: isMobile ? 7 : 4, minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<CrashMonitor />} />
          <Route path="/crash-estimator" element={<CrashEstimator />} />
          <Route path="/stock-tracker" element={<StockTracker />} />
          <Route path="/news" element={<NewsAnalysis />} />
          <Route path="/macro" element={<MacroDashboard />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/weekly-report" element={<AnalysisPage />} />
          <Route path="/scenarios" element={<ScenarioPlanner />} />
          <Route path="/accuracy" element={<SimulationAccuracy />} />
          <Route path="/portfolio" element={<Portfolio />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
