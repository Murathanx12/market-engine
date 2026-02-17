import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  ThemeProvider,
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
  Dashboard as DashboardIcon,
} from '@mui/icons-material';

// Theme
import { darkTheme, COLORS } from './theme/darkTheme';

// Components
import RegimeBanner from './components/RegimeBanner';

// Pages
import Dashboard from './pages/Dashboard';
import CrashMonitor from './pages/CrashMonitor';
import CrashEstimator from './pages/CrashEstimator';
import StockTracker from './pages/StockTracker';
import NewsAnalysis from './pages/NewsAnalysis';
import AnalysisPage from './pages/AnalysisPage';
import SimulationAccuracy from './pages/SimulationAccuracy';
import ScenarioPlanner from './pages/ScenarioPlanner';
import MacroDashboard from './pages/MacroDashboard';
import Portfolio from './pages/Portfolio';

const sidebarWidth = 200;

function NavItem({ to, icon, text, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '7px 14px',
        color: active ? COLORS.emerald : COLORS.textSecondary,
        backgroundColor: active ? 'rgba(0,217,160,0.06)' : 'transparent',
        borderLeft: active ? `2px solid ${COLORS.emerald}` : '2px solid transparent',
        transition: 'all 0.15s',
        marginBottom: 1,
        fontSize: '10.5px',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'rgba(99,150,220,0.05)';
          e.currentTarget.style.color = COLORS.textPrimary;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = COLORS.textSecondary;
        }
      }}
    >
      <Box sx={{ mr: 1.5, display: 'flex', opacity: active ? 1 : 0.6, fontSize: '14px' }}>{icon}</Box>
      <Typography sx={{ fontSize: '10.5px', fontWeight: active ? 600 : 400, letterSpacing: '0.02em' }}>{text}</Typography>
    </Link>
  );
}

function SidebarContent({ menuItems, pathname, onClose }) {
  return (
    <Box sx={{
      width: sidebarWidth, height: '100%',
      bgcolor: COLORS.bgDeep,
      display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${COLORS.borderSubtle}`,
    }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{
            width: 28, height: 28, borderRadius: '5px',
            background: `linear-gradient(135deg, ${COLORS.emerald}, #00a3ff)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5,
          }}>
            <Typography sx={{ fontSize: '9px', fontWeight: 800, color: '#000' }}>ME</Typography>
          </Box>
          <Box>
            <Typography sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700, fontSize: '12px', color: COLORS.textPrimary,
              letterSpacing: '0.05em',
            }}>
              MARKET-ENGINE
            </Typography>
            <Typography sx={{ fontSize: '8px', color: COLORS.textMuted, letterSpacing: '0.04em' }}>
              AI Crash Detection
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 1.5, flex: 1, overflowY: 'auto' }}>
        {['analysis', 'tools', 'data'].map((group) => (
          <Box key={group} sx={{ mb: 1.5 }}>
            <Typography sx={{
              px: 2, py: 0.5, fontSize: '8.5px', color: COLORS.textMuted,
              fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>
              {group}
            </Typography>
            {menuItems.filter(i => i.group === group).map((item) => (
              <NavItem
                key={item.path} to={item.path} icon={item.icon}
                text={item.text} active={pathname === item.path} onClick={onClose}
              />
            ))}
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 1.5, borderTop: `1px solid ${COLORS.borderSubtle}` }}>
        <Typography sx={{ fontSize: '8px', color: COLORS.textMuted }}>
          v7.0 Carbon Slate
        </Typography>
      </Box>
    </Box>
  );
}

function AppContent() {
  const location = useLocation();
  const isMobile = useMediaQuery(darkTheme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [
    // Analysis group
    { path: '/', icon: <DashboardIcon sx={{ fontSize: 14 }} />, text: 'Dashboard', group: 'analysis' },
    { path: '/crash-monitor', icon: <WarningIcon sx={{ fontSize: 14 }} />, text: 'Crash Monitor', group: 'analysis' },
    { path: '/crash-estimator', icon: <ShowChartIcon sx={{ fontSize: 14 }} />, text: 'Crisis Timeline', group: 'analysis' },
    { path: '/stock-tracker', icon: <TrendingUpIcon sx={{ fontSize: 14 }} />, text: 'Stock Tracker', group: 'analysis' },
    { path: '/analysis', icon: <AssessmentIcon sx={{ fontSize: 14 }} />, text: 'Analysis', group: 'analysis' },
    // Tools group
    { path: '/portfolio', icon: <PortfolioIcon sx={{ fontSize: 14 }} />, text: 'Portfolio', group: 'tools' },
    { path: '/scenarios', icon: <TimelineIcon sx={{ fontSize: 14 }} />, text: 'Scenario Planner', group: 'tools' },
    { path: '/accuracy', icon: <SettingsIcon sx={{ fontSize: 14 }} />, text: 'Model Accuracy', group: 'tools' },
    // Data group
    { path: '/news', icon: <NewsIcon sx={{ fontSize: 14 }} />, text: 'News Impact', group: 'data' },
    { path: '/macro', icon: <EqualizerIcon sx={{ fontSize: 14 }} />, text: 'Macro Dashboard', group: 'data' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />

      {isMobile && (
        <IconButton
          onClick={() => setDrawerOpen(true)}
          sx={{ position: 'fixed', top: 8, left: 8, zIndex: 1300, color: COLORS.textSecondary }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{ sx: { bgcolor: COLORS.bgDeep, borderRight: `1px solid ${COLORS.borderSubtle}` } }}
        >
          <SidebarContent menuItems={menuItems} pathname={location.pathname} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      ) : (
        <Box sx={{
          width: sidebarWidth, bgcolor: COLORS.bgDeep,
          borderRight: `1px solid ${COLORS.borderSubtle}`,
          position: 'fixed', height: '100vh', overflowY: 'auto',
        }}>
          <SidebarContent menuItems={menuItems} pathname={location.pathname} onClose={() => {}} />
        </Box>
      )}

      <Box sx={{
        flexGrow: 1,
        ml: isMobile ? 0 : `${sidebarWidth}px`,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <RegimeBanner />
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, pt: isMobile ? 6 : 2.5, flex: 1 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/crash-monitor" element={<CrashMonitor />} />
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
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
