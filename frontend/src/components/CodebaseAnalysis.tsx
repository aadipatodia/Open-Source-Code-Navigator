import React from 'react';
import { Box, Typography, IconButton, Tooltip, Paper } from '@mui/material';
import { CopyAll as CopyIcon } from '@mui/icons-material';

// The User type is now defined here to accept the prop from the Dashboard
interface User {
  userId: string;
  name?: string;
  username?: string;
}

interface CodebaseAnalysisProps {
  content: string;
  language: string; // Reverted to 'language' to match the prop being passed from Dashboard
  user: User;
}

const CodebaseAnalysis: React.FC<CodebaseAnalysisProps> = ({ content, language, user }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    // Consider using a snackbar for a less intrusive notification
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1A1A2E', // Unified dark background
        border: '1px solid #16213E', // Border color from theme
        borderRadius: '4px',
        color: '#e0e0e0', // Light text color
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1,
          borderBottom: '1px solid #16213E', // Theme border color
        }}
      >
        {/* Spacer to help center the title */}
        <Box sx={{ width: 40 }} /> 
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'white', 
            fontWeight: 'bold', 
            textAlign: 'center',
            flexGrow: 1,
          }}
        >
          {language.toUpperCase()}
        </Typography>
        <Tooltip title="Copy Code">
          <IconButton onClick={handleCopy} size="small" sx={{ color: '#e0e0e0', width: 40 }}>
            <CopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component="pre"
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          margin: '0 !important',
          padding: '16px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap', // Ensures text wraps
          wordBreak: 'break-word', // Breaks long words
          color: '#e0e0e0' // Light text for code
        }}
      >
        <code>{content}</code>
      </Box>
    </Paper>
  );
};

export default CodebaseAnalysis;