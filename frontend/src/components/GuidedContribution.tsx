// Guided contribution modal — shows a step-by-step plan for a repo or issue.
import React from 'react';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
  Button,
} from '@mui/material';
import {
  CloseRounded,
  ExpandMoreRounded,
  AutoAwesomeRounded,
  LaunchRounded,
  GitHub,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

import { brand, brandGradient } from '../theme';
import { MarkdownRenderer } from '../ui';
import { ContributionStep } from '../types';

interface GuidedContributionProps {
  open: boolean;
  onClose: () => void;
  plan: ContributionStep[] | null;
  loading: boolean;
  error: string;
  mode: 'issue' | 'repo' | null;
  issueTitle: string;
  issueUrl?: string;
  repoName?: string;
  repoUrl?: string;
}

/** Full-screen modal with accordion steps — works for both repo and issue guides. */
const GuidedContribution: React.FC<GuidedContributionProps> = ({
  open,
  onClose,
  plan,
  loading,
  error,
  mode,
  issueTitle,
  issueUrl,
  repoName,
  repoUrl,
}) => {
  const isRepoMode = mode === 'repo';
  const chipLabel = isRepoMode ? 'Repo Contribution Guide' : 'AI Contribution Plan';
  const title = isRepoMode
    ? `How to contribute to ${repoName || 'this repo'}`
    : issueTitle || 'Generating plan…';
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="guided-contribution-title"
      sx={{ display: 'grid', placeItems: 'center', p: { xs: 1.5, sm: 3 } }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 900,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: brand.surface,
          borderRadius: 4,
          border: `1px solid ${brand.border}`,
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderBottom: `1px solid ${brand.border}`,
            background: `linear-gradient(135deg, ${alpha(brand.primary, 0.18)} 0%, ${alpha(brand.secondary, 0.1)} 100%)`,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Chip
                icon={<AutoAwesomeRounded sx={{ fontSize: 14 }} />}
                label={chipLabel}
                size="small"
                sx={{
                  bgcolor: alpha(brand.secondary, 0.16),
                  color: brand.secondary,
                  border: `1px solid ${alpha(brand.secondary, 0.4)}`,
                  '& .MuiChip-icon': { color: brand.secondary },
                  mb: 1.5,
                }}
              />
              <Typography
                id="guided-contribution-title"
                variant="h5"
                sx={{
                  fontWeight: 800,
                  color: brand.text,
                  lineHeight: 1.25,
                  pr: 2,
                }}
              >
                {title}
              </Typography>
              {repoName && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <GitHub sx={{ fontSize: 16, color: brand.textSubtle }} />
                  <Typography variant="caption" sx={{ color: brand.textMuted, fontFamily: '"JetBrains Mono", monospace' }}>
                    {repoName}
                  </Typography>
                </Stack>
              )}
            </Box>
            <IconButton onClick={onClose}>
              <CloseRounded />
            </IconButton>
          </Box>

          {(issueUrl || repoUrl) && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {issueUrl && !isRepoMode && (
                <Button
                  size="small"
                  variant="outlined"
                  href={issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  startIcon={<LaunchRounded />}
                >
                  Open issue on GitHub
                </Button>
              )}
              {repoUrl && isRepoMode && (
                <Button
                  size="small"
                  variant="outlined"
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  startIcon={<LaunchRounded />}
                >
                  Open repo on GitHub
                </Button>
              )}
            </Stack>
          )}
        </Box>

        {/* Body */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 2, sm: 3 },
            background: brand.bg,
          }}
        >
          {loading && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                gap: 2,
              }}
            >
              <CircularProgress />
              <Typography sx={{ color: brand.textMuted, textAlign: 'center' }}>
                {isRepoMode
                  ? 'Generating your repo contribution guide…'
                  : 'Generating your personalized contribution plan…'}
              </Typography>
              <Typography variant="caption" sx={{ color: brand.textSubtle, textAlign: 'center' }}>
                {isRepoMode
                  ? 'Analyzing the repo structure and generating onboarding steps.'
                  : 'This involves cloning the repo and asking AI for a step-by-step roadmap.'}
              </Typography>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && plan && plan.length > 0 && (
            <Box>
              {plan.map((step, index) => (
                <Accordion key={step.step ?? index} defaultExpanded={index === 0}>
                  <AccordionSummary
                    expandIcon={<ExpandMoreRounded sx={{ color: brand.textMuted }} />}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                      <Box
                        sx={{
                          minWidth: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: brandGradient,
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        {step.step ?? index + 1}
                      </Box>
                      <Typography sx={{ fontWeight: 700, color: brand.text }}>
                        {step.title}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <MarkdownRenderer content={step.details} />
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {!loading && !error && plan && plan.length === 0 && (
            <Alert severity="info">No plan was returned. Try a different issue.</Alert>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default GuidedContribution;
