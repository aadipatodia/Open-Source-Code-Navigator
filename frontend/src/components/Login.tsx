import React from 'react';
import {
  Paper,
  Box,
  Typography,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';

import { Descope } from '@descope/react-sdk';

const Login: React.FC = () => {
  const handleDescopeSuccess = (e: any) => {
    console.log('Successfully authenticated with Descope!', e);
    window.location.href = '/'; 
  };

  const handleDescopeError = (err: any) => {
    console.log('Descope error:', err);
    // Optionally display an error message to the user
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        p: { xs: 1, sm: 2 },
        background: '#181818', // Deep charcoal background
      }}
    >
      <Paper 
        elevation={10}
        sx={{ 
          p: { xs: 3, sm: 4 },
          width: '100%', 
          maxWidth: 450,
          borderRadius: '16px',
          background: '#181818', // Consistent background for the login card
          boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.6)',
          border: '1px solid #2C2C2C', // Subtle dark gray border
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Typography variant="h3" sx={{ color: '#A8FF00', mb: -2.5, fontWeight: 'bold' }}>
          Hey Coder!
        </Typography>
        <Box sx={{ width: '100%' }}>
            <Descope
                flowId="outbound-app-flow" 
                onSuccess={handleDescopeSuccess}
                onError={handleDescopeError}
                theme="dark" // The Descope theme can be configured in the console to match
                // We are keeping this dark to maintain the color scheme and will update
                // the primary button color to match the theme.
            />
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
