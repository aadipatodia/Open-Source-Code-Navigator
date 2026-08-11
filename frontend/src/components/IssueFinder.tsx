import React, { useEffect, useState } from 'react';
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
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  LaunchRounded,
  AutoAwesomeRounded,
  GitHub as GitHubIcon,
  ExpandMoreRounded,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { brand } from '../theme/theme';
import { Issue, RepoIssueGroup } from '../types';
import IconTile from './common/IconTile';

interface IssueFinderProps {
  onFindIssues: (skills: string) => void | Promise<void>;
  onSelectIssue: (issue: Issue) => void;
  loading: boolean;
  groups: RepoIssueGroup[];
  error: string;
}

const PRESETS = ['Python', 'React', 'TypeScript', 'docs', 'Rust', 'Go', 'design'];

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

const IssueFinder: React.FC<IssueFinderProps> = ({
  onFindIssues,
  onSelectIssue,
  loading,
  groups,
  error,
}) => {
  const [skills, setSkills] = useState('');
  const [openRepo, setOpenRepo] = useState<string | null>(null);

  // A new set of results should start collapsed rather than keep a stale repo open.
  useEffect(() => {
    setOpenRepo(groups.length === 1 ? groups[0].repoName : null);
  }, [groups]);

  const totalIssues = groups.reduce((sum, group) => sum + group.issueCount, 0);

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

      {groups.length > 0 && (
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
              {groups.length} {groups.length === 1 ? 'repository' : 'repositories'} ·{' '}
              {plural(totalIssues, 'issue')}
            </Typography>
            <Chip
              size="small"
              icon={<AutoAwesomeRounded sx={{ fontSize: 14 }} />}
              label="Open a repo, then pick an issue"
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
            {groups.map((group, groupIdx) => {
              const isOpen = openRepo === group.repoName;
              const [owner, name] = group.repoName.split('/');

              return (
                <Box
                  key={group.repoName}
                  sx={{
                    borderBottom:
                      groupIdx < groups.length - 1 ? `1px solid ${brand.border}` : 'none',
                  }}
                >
                  <Box
                    onClick={() => setOpenRepo(isOpen ? null : group.repoName)}
                    sx={{
                      px: 3,
                      py: 2,
                      display: 'flex',
                      gap: 2,
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 150ms ease',
                      background: isOpen ? alpha(brand.primary, 0.06) : 'transparent',
                      '&:hover': { background: alpha(brand.primary, 0.09) },
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
                          fontFamily: '"JetBrains Mono", monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Box component="span" sx={{ color: brand.textSubtle }}>
                          {owner}/
                        </Box>
                        {name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: brand.textMuted }}>
                        {plural(group.issueCount, 'beginner-friendly issue')}
                      </Typography>
                    </Box>

                    <Chip
                      label={group.issueCount}
                      size="small"
                      sx={{
                        height: 22,
                        minWidth: 32,
                        fontWeight: 700,
                        bgcolor: alpha(brand.secondary, 0.14),
                        color: brand.secondary,
                        border: `1px solid ${alpha(brand.secondary, 0.32)}`,
                      }}
                    />
                    <IconButton
                      size="small"
                      component="a"
                      href={group.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Open ${group.repoName} on GitHub`}
                    >
                      <LaunchRounded fontSize="small" />
                    </IconButton>
                    <ExpandMoreRounded
                      sx={{
                        color: brand.textSubtle,
                        transition: 'transform 180ms ease',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  </Box>

                  <Collapse in={isOpen} unmountOnExit>
                    <Box sx={{ background: alpha(brand.surfaceMuted, 0.35) }}>
                      {group.issues.map((issue) => (
                        <Box
                          key={issue.id}
                          onClick={() => onSelectIssue(issue)}
                          sx={{
                            pl: 4.5,
                            pr: 3,
                            py: 1.75,
                            ml: 3,
                            display: 'flex',
                            gap: 2,
                            alignItems: 'flex-start',
                            cursor: 'pointer',
                            borderLeft: `2px solid ${alpha(brand.primary, 0.35)}`,
                            transition: 'background 150ms ease',
                            '&:hover': { background: alpha(brand.primary, 0.08) },
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{ color: brand.text, fontWeight: 500, lineHeight: 1.4 }}
                            >
                              {issue.title}
                            </Typography>
                            {issue.labels.length > 0 && (
                              <Stack
                                direction="row"
                                spacing={0.75}
                                sx={{ mt: 1 }}
                                flexWrap="wrap"
                                useFlexGap
                              >
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
                            aria-label="Open issue on GitHub"
                          >
                            <LaunchRounded fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}

                      {group.issueCount > group.issues.length && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', pl: 7.5, py: 1.5, color: brand.textSubtle }}
                        >
                          Showing {group.issues.length} of {group.issueCount}. See the rest on
                          GitHub.
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}
    </Stack>
  );
};

export default IssueFinder;
