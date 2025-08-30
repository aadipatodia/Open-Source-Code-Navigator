// src/components/RepositoryInput.tsx

import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { GitHub } from '@mui/icons-material';

// --- PROPS DEFINITION ---
// Now accepts an 'error' prop from the parent component.
export interface RepositoryInputProps {
  onRepositorySelect: (repoUrl: string) => Promise<void>;
  loading: boolean;
  error?: string; // Optional error string to display
}

const RepositoryInput: React.FC<RepositoryInputProps> = ({ onRepositorySelect, loading, error }) => {
  const [repoUrl, setRepoUrl] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      onRepositorySelect(repoUrl.trim());
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Analyze a GitHub Repository
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="GitHub Repository URL"
          variant="outlined"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/username/repo"
          sx={{ mb: 2 }}
          disabled={loading}
          // The 'error' prop will now highlight the text field if an error string is present
          error={!!error}
        />
        <Button
          type="submit"
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GitHub />}
          disabled={loading || !repoUrl}
          sx={{ minWidth: '180px' }}
        >
          {loading ? 'Analyzing...' : 'Analyze Repository'}
        </Button>
      </Box>

      {/* Conditionally render the Alert if the error prop exists */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default RepositoryInput;