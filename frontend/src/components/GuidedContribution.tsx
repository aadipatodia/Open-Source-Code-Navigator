// Guided contribution modal — shows a step-by-step plan for a repo or issue.
import React, { useEffect, useState } from 'react';
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
  Skeleton,
} from '@mui/material';
import {
  CloseRounded,
  ExpandMoreRounded,
  AutoAwesomeRounded,
  LaunchRounded,
  GitHub,
  LightbulbRounded,
  UnfoldMoreRounded,
  UnfoldLessRounded,
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
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  // Open the first step whenever a new plan arrives.
  useEffect(() => {
    setExpanded(new Set([0]));
  }, [plan]);

  const steps = plan ?? [];
  const allOpen = steps.length > 0 && expanded.size === steps.length;
  const toggleStep = (index: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(steps.map((_, i) => i)));

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
            <Box sx={{ py: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <CircularProgress size={22} />
                <Box>
                  <Typography sx={{ color: brand.text, fontWeight: 600 }}>
                    {isRepoMode
                      ? 'Generating your repo contribution guide…'
                      : 'Generating your personalized contribution plan…'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: brand.textSubtle }}>
                    {isRepoMode
                      ? 'Reading the repo structure and writing onboarding steps. This can take a minute.'
                      : 'Cloning the repo and working out a step-by-step roadmap. This can take a minute.'}
                  </Typography>
                </Box>
              </Stack>
              {[0, 1, 2, 3].map((i) => (
                <Stack key={i} direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Skeleton variant="circular" width={32} height={32} sx={{ flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width={`${55 - i * 8}%`} height={28} />
                    <Skeleton variant="rounded" height={i === 0 ? 90 : 44} sx={{ mt: 0.5 }} />
                  </Box>
                </Stack>
              ))}
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && steps.length > 0 && (
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: brand.textMuted }}>
                  {steps.length} {steps.length === 1 ? 'section' : 'sections'}
                </Typography>
                <Button
                  size="small"
                  onClick={toggleAll}
                  startIcon={allOpen ? <UnfoldLessRounded /> : <UnfoldMoreRounded />}
                  sx={{ color: brand.textMuted }}
                >
                  {allOpen ? 'Collapse all' : 'Expand all'}
                </Button>
              </Stack>

              {steps.map((step, index) => {
                const isFinal = step.title.trim().toLowerCase() === 'final advice';
                const isOpen = expanded.has(index);
                const isLast = index === steps.length - 1;
                const accent = isFinal ? brand.warning : brand.primary;
                return (
                  <Box key={`${step.step}-${index}`} sx={{ display: 'flex', gap: { xs: 1.25, sm: 2 }, pb: isLast ? 0 : 1.5 }}>
                    {/* Timeline rail */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1.5 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          background: isFinal ? alpha(brand.warning, 0.9) : brandGradient,
                          boxShadow: isOpen ? `0 0 0 4px ${alpha(accent, 0.18)}` : 'none',
                          transition: 'box-shadow 0.2s',
                        }}
                      >
                        {isFinal ? <LightbulbRounded sx={{ fontSize: 18 }} /> : step.step ?? index + 1}
                      </Box>
                      {!isLast && (
                        <Box sx={{ flex: 1, width: 2, mt: 1, mb: -1.5, minHeight: 16, bgcolor: alpha(brand.primary, 0.22), borderRadius: 1 }} />
                      )}
                    </Box>

                    {/* Step card */}
                    <Accordion
                      expanded={isOpen}
                      onChange={() => toggleStep(index)}
                      TransitionProps={{ unmountOnExit: true }}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        mb: 0,
                        '&.Mui-expanded': { mb: 0 },
                        borderColor: isOpen ? alpha(accent, 0.45) : brand.border,
                        backgroundColor: isFinal ? alpha(brand.warning, 0.05) : undefined,
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreRounded sx={{ color: brand.textMuted }} />}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="overline"
                            sx={{ color: isFinal ? brand.warning : brand.secondary, lineHeight: 1.4, letterSpacing: '0.08em' }}
                          >
                            {isFinal ? 'Wrap-up' : `Step ${step.step ?? index + 1}`}
                          </Typography>
                          <Typography sx={{ fontWeight: 700, color: brand.text, fontSize: '1.02rem', lineHeight: 1.35 }}>
                            {step.title}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 2.5, px: { xs: 2, sm: 3 }, pb: 3 }}>
                        <MarkdownRenderer content={step.details} />
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                );
              })}
            </Box>
          )}

          {!loading && !error && plan && steps.length === 0 && (
            <Alert severity="info">No plan was returned. Try a different issue.</Alert>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default GuidedContribution;
