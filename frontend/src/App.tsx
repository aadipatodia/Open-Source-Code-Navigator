// Root component — theme provider, auth/data contexts, route definitions, and the app shell.
import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box, CssBaseline, CircularProgress, useMediaQuery, Theme } from '@mui/material';

import { appTheme } from './theme';
import Sidebar, { SIDEBAR_WIDTH } from './components/Sidebar';
import TopBar from './components/TopBar';
import {
  HomePage,
  ExplorePage,
  IssuesPage,
  AnalyzePage,
  ChatPage,
  LoginPage,
  SignupPage,
} from './pages';
import GuidedContribution from './components/GuidedContribution';
import { AppDataProvider, useAppData } from './context/AppDataContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import './App.css';

/** Full-screen spinner shown while Firebase auth state resolves. */
const LoadingScreen: React.FC = () => (
  <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress />
  </Box>
);

/** Sidebar + top bar frame around every signed-in page. */
const AppShell: React.FC = () => {
  const { user } = useAuth();
  const isLargeScreen = useMediaQuery((t: Theme) => t.breakpoints.up('lg'));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const {
    isGuideOpen,
    contributionPlan,
    guideLoading,
    guideError,
    guideMode,
    selectedIssueForGuide,
    guideRepoLabel,
    repoUrl,
    closeGuide,
  } = useAppData();

  const isRepoGuide = guideMode === 'repo';

  return (
    <Box className="app-shell" sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        variant={isLargeScreen ? 'permanent' : 'temporary'}
      />

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          width: { lg: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        }}
      >
        <TopBar
          user={user!}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          showMenuButton={!isLargeScreen}
        />

        <Box
          component="main"
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2.5, md: 4 },
            maxWidth: 1400,
            width: '100%',
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      <GuidedContribution
        open={isGuideOpen}
        onClose={closeGuide}
        plan={contributionPlan}
        loading={guideLoading}
        error={guideError}
        mode={guideMode}
        issueTitle={selectedIssueForGuide?.title || ''}
        issueUrl={selectedIssueForGuide?.url}
        repoName={isRepoGuide ? guideRepoLabel : selectedIssueForGuide?.repoName}
        repoUrl={isRepoGuide ? repoUrl || undefined : undefined}
      />
    </Box>
  );
};

/** Top-level router — redirects unauthenticated users to /login. */
const AppRoutes: React.FC = () => {
  const { user, authLoading } = useAuth();
  if (authLoading) return <LoadingScreen />;

  return (
    <Routes>
      <Route
        element={
          <Box className="app-shell">
            <Outlet />
          </Box>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/issues" element={<IssuesPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AuthProvider>
        <AppDataProvider>
          <AppRoutes />
        </AppDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
