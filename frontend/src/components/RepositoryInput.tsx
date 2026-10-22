import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Stack,
  Chip,
} from '@mui/material';
import {
  GitHub,
  LinkRounded,
  PlayArrowRounded,
} from '@mui/icons-material';
import { brand } from '../theme';

export interface RepositoryInputProps {
  onRepositorySelect: (repoUrl: string) => Promise<void> | void;
  loading: boolean;
  error?: string;
  defaultValue?: string | null;
  /** Render in a compact mode for embedding inside other surfaces. */
  compact?: boolean;
}

const SUGGESTIONS = [
  'https://github.com/facebook/react',
  'https://github.com/vercel/next.js',
  'https://github.com/microsoft/vscode',
];

const RepositoryInput: React.FC<RepositoryInputProps> = ({
  onRepositorySelect,
  loading,
  error,
  defaultValue,
  compact,
}) => {
  const [repoUrl, setRepoUrl] = useState<string>(defaultValue || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      onRepositorySelect(repoUrl.trim());
    }
  };

  return (
    <Paper sx={{ p: compact ? 2 : 3, borderRadius: 3 }}>
      {!compact && (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(124, 92, 255, 0.16)',
              color: brand.primary,
            }}
          >
            <GitHub />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: brand.text }}>
              Analyze a GitHub repository
            </Typography>
            <Typography variant="body2" sx={{ color: brand.textMuted }}>
              We'll clone it temporarily and give you a navigable file tree.
            </Typography>
          </Box>
        </Stack>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        >
          <TextField
            fullWidth
            placeholder="https://github.com/username/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={loading}
            error={!!error}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkRounded sx={{ color: brand.textSubtle }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !repoUrl.trim()}
            startIcon={
              loading ? <CircularProgress size={18} color="inherit" /> : <PlayArrowRounded />
            }
            sx={{ minWidth: 180, height: 56 }}
          >
            {loading ? 'Analyzing…' : 'Analyze repo'}
          </Button>
        </Stack>
      </Box>

      {!compact && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          <Typography variant="caption" sx={{ color: brand.textSubtle, mr: 0.5, alignSelf: 'center' }}>
            Try:
          </Typography>
          {SUGGESTIONS.map((url) => (
            <Chip
              key={url}
              label={url.replace('https://github.com/', '')}
              size="small"
              onClick={() => setRepoUrl(url)}
              variant="outlined"
              sx={{ cursor: 'pointer' }}
              disabled={loading}
            />
          ))}
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default RepositoryInput;
