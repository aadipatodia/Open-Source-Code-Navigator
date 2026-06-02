import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import {
  Box,
  CssBaseline,
  CircularProgress,
  useMediaQuery,
  Theme,
} from '@mui/material';

import { appTheme } from './theme/theme';
import Sidebar, { SIDEBAR_WIDTH } from './components/Sidebar';
import TopBar from './components/TopBar';
import HomePage from './components/pages/HomePage';
import ExplorePage from './components/pages/ExplorePage';
import IssuesPage from './components/pages/IssuesPage';
import AnalyzePage from './components/pages/AnalyzePage';
import ChatPage from './components/pages/ChatPage';
import GuidedContribution from './components/GuidedContribution';
import { AppDataProvider, useAppData } from './context/AppDataContext';
import { User } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/pages/LoginPage';
import SignupPage from './components/pages/SignupPage';

import './App.css';

const DEFAULT_USER: User = {
  userId: 'local-user',
  name: 'Coder',
  email: '',
  picture: '',
};

const LoadingScreen: React.FC = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <CircularProgress />
  </Box>
);

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, authLoading } = useAuth();
  if (authLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

const AuthedShell: React.FC<{ user: User }> = ({ user }) => {
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
          ml: { lg: 0 },
          width: { lg: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        }}
      >
        <TopBar
          user={user}
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
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route
              path="/"
              element={
                <RequireAuth>
                  <HomePage user={user} />
                </RequireAuth>
              }
            />
            <Route
              path="/explore"
              element={
                <RequireAuth>
                  <ExplorePage user={user} />
                </RequireAuth>
              }
            />
            <Route
              path="/issues"
              element={
                <RequireAuth>
                  <IssuesPage />
                </RequireAuth>
              }
            />
            <Route
              path="/analyze"
              element={
                <RequireAuth>
                  <AnalyzePage />
                </RequireAuth>
              }
            />
            <Route
              path="/chat"
              element={
                <RequireAuth>
                  <ChatPage />
                </RequireAuth>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
        repoName={guideMode === 'repo' ? guideRepoLabel : selectedIssueForGuide?.repoName}
        repoUrl={guideMode === 'repo' ? repoUrl || undefined : undefined}
      />
    </Box>
  );
};

const AppWithAuth: React.FC = () => {
  const { user, authLoading } = useAuth();
  if (authLoading) return <LoadingScreen />;
  return <AuthedShell user={user ?? DEFAULT_USER} />;
};

export default function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AuthProvider>
        <AppDataProvider>
          <AppWithAuth />
        </AppDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
