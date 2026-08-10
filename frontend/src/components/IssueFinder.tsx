import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Chip,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  LaunchRounded,
  AutoAwesomeRounded,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { brand } from '../theme/theme';
import { Issue } from '../types';
import IconTile from './common/IconTile';

interface IssueFinderProps {
  onFindIssues: (skills: string) => void | Promise<void>;
  onSelectIssue: (issue: Issue) => void;
  loading: boolean;
  issues: Issue[];
  error: string;
}

const PRESETS = ['Python', 'React', 'TypeScript', 'docs', 'Rust', 'Go', 'design'];

const IssueFinder: React.FC<IssueFinderProps> = ({
  onFindIssues,
  onSelectIssue,
  loading,
  issues,
  error,
}) => {
  const [skills, setSkills] = useState('');

  const handleSearch = () => {
    if (skills.trim()) onFindIssues(skills);
  };

  const addPreset = (preset: string) => {
    setSkills((prev) => {
      const tokens = prev
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tokens.includes(preset)) return prev;
      return [...tokens, preset].join(', ');
    });
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <IconTile color={brand.secondary}>
            <SearchIcon />
          </IconTile>
          <Box>
            <Typography variant="h6" sx={{ color: brand.text, fontWeight: 700 }}>
              Find beginner-friendly issues
            </Typography>
            <Typography variant="body2" sx={{ color: brand.textMuted }}>
              We search GitHub for open issues labeled "good first issue" that match your skills.
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            placeholder="e.g. Python, React, docs"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: brand.textSubtle, fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading || !skills.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            sx={{ minWidth: 160, height: 56 }}
          >
            {loading ? 'Searching…' : 'Search issues'}
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          <Typography variant="caption" sx={{ color: brand.textSubtle, alignSelf: 'center', mr: 0.5 }}>
            Add a skill:
          </Typography>
          {PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={preset}
              size="small"
              onClick={() => addPreset(preset)}
              variant="outlined"
              sx={{ cursor: 'pointer' }}
              disabled={loading}
            />
          ))}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {issues.length > 0 && (
        <Paper sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              px: 3,
              py: 1.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${brand.border}`,
              background: alpha(brand.surfaceMuted, 0.5),
            }}
          >
            <Typography variant="subtitle1" sx={{ color: brand.text, fontWeight: 700 }}>
              {issues.length} matching issues
            </Typography>
            <Chip
              size="small"
              icon={<AutoAwesomeRounded sx={{ fontSize: 14 }} />}
              label="Click an issue to get an AI plan"
              sx={{
                bgcolor: alpha(brand.primary, 0.14),
                color: brand.primary,
                border: `1px solid ${alpha(brand.primary, 0.35)}`,
                '& .MuiChip-icon': { color: brand.primary },
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />
          </Box>
          <Box sx={{ maxHeight: '64vh', overflowY: 'auto' }}>
            {issues.map((issue, idx) => (
              <Box
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                sx={{
                  px: 3,
                  py: 2,
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  borderBottom:
                    idx < issues.length - 1 ? `1px solid ${brand.border}` : 'none',
                  transition: 'background 150ms ease',
                  '&:hover': {
                    background: alpha(brand.primary, 0.07),
                  },
                }}
              >
                <IconTile color={brand.primary} size={36}>
                  <GitHubIcon sx={{ fontSize: 20 }} />
                </IconTile>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      color: brand.text,
                      fontWeight: 600,
                      lineHeight: 1.35,
                    }}
                  >
                    {issue.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: brand.textSubtle, fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {issue.repoName}
                  </Typography>
                  {issue.labels.length > 0 && (
                    <Stack direction="row" spacing={0.75} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                      {issue.labels.slice(0, 6).map((label) => (
                        <Chip
                          key={label}
                          label={label}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.72rem',
                            bgcolor: alpha(brand.secondary, 0.1),
                            color: brand.secondary,
                            border: `1px solid ${alpha(brand.secondary, 0.3)}`,
                          }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
                <IconButton
                  size="small"
                  component="a"
                  href={issue.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LaunchRounded fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Stack>
  );
};

export default IssueFinder;
