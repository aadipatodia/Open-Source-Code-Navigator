// frontend/src/App.tsx
import React from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Container } from '@mui/material';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import CodebaseAnalysis from './components/CodebaseAnalysis';
import Login from './components/Login';
import { ruruTheme } from './theme/theme';
import './App.css';
import { useSession, useUser, useDescope } from '@descope/react-sdk';
import { User } from './types';

export default function App() {
  const navigate = useNavigate();

  // Auth/session hooks from Descope
  const { isSessionLoading, isAuthenticated } = useSession();
  const { user } = useUser();
  const descope = useDescope();

  if (isSessionLoading) {
    return <div>Loading...</div>;
  }

  const handleLogout = async () => {
    try {
      await descope.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Type-safe fallback for user
  const safeUser: User = user
  ? {
      userId: user.userId,
      name: user.name || '',
      email: user.email || '',
      picture: user.picture || '',
    }
  : { userId: '', name: '', email: '', picture: '' };



  return (
    <ThemeProvider theme={ruruTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${ruruTheme.palette.background.default} 0%, #1A1A2E 50%, #16213E 100%)`,
        }}
      >
        {isAuthenticated && <Navbar user={safeUser} onLogout={handleLogout} />}

        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Routes>
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/" /> : <Login />}
            />
            {isAuthenticated ? (
              <>
                <Route path="/" element={<Dashboard user={safeUser} />} />
                <Route
                  path="/codebase-analysis"
                  element={
                    <CodebaseAnalysis
                      content="Sample code content"
                      language="javascript"
                      user={safeUser}
                    />
                  }
                />
              </>
            ) : (
              <Route path="/*" element={<Navigate to="/login" />} />
            )}
          </Routes>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
