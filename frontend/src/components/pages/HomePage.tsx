import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Divider,
} from '@mui/material';
import {
  AccountTreeRounded,
  TravelExploreRounded,
  BiotechRounded,
  ChatBubbleRounded,
  ArrowForwardRounded,
  HistoryRounded,
  BookmarkBorderRounded,
  BoltRounded,
  ShieldRounded,
  PublicRounded,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

import { brand, brandGradient } from '../../theme/theme';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import IconTile from '../common/IconTile';

const quickActions = [
  {
    to: '/explore',
    icon: <AccountTreeRounded />,
    title: 'Explore a repository',
    body: 'Paste a GitHub URL — get an interactive file tree and instant code viewer.',
    accent: brand.primary,
  },
  {
    to: '/issues',
    icon: <TravelExploreRounded />,
    title: 'Find good-first issues',
    body: 'Match your skills to beginner-friendly issues across the open-source world.',
    accent: brand.secondary,
  },
  {
    to: '/analyze',
    icon: <BiotechRounded />,
    title: 'Analyze a snippet',
    body: 'Get a step-by-step explanation and a security review of any code.',
    accent: brand.accent,
  },
  {
    to: '/chat',
    icon: <ChatBubbleRounded />,
    title: 'Talk to your AI mentor',
    body: 'Ask anything from "what is a fork?" to "explain this regex".',
    accent: '#a78bfa',
  },
];

const HomePage: React.FC = () => {
  const { recentAnalyses } = useAppData();
  const { user } = useAuth();

  const firstName = (user?.name || 'Coder').split(' ')[0];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Hero */}
      <Paper
        sx={{
          p: { xs: 3, md: 4.5 },
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${brand.border}`,
          background:
            `radial-gradient(800px 320px at 100% 0%, ${alpha(brand.secondary, 0.18)}, transparent 60%),
             radial-gradient(600px 300px at 0% 100%, ${alpha(brand.primary, 0.22)}, transparent 60%),
             linear-gradient(180deg, ${brand.surface} 0%, ${brand.surfaceMuted} 100%)`,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.6rem' },
            color: brand.text,
            lineHeight: 1.1,
          }}
        >
          Hey {firstName}, ready to ship your next PR?
        </Typography>
        <Typography sx={{ mt: 1.5, color: brand.textMuted, maxWidth: 720 }}>
          Pick a starting point below. Code Navigator will help you read the codebase,
          find the right issue, and walk you through your contribution step by step.
        </Typography>

        <Stack direction="row" spacing={1.5} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            component={RouterLink}
            to="/issues"
            startIcon={<TravelExploreRounded />}
            endIcon={<ArrowForwardRounded />}
          >
            Find an issue
          </Button>
          <Button
            variant="outlined"
            component={RouterLink}
            to="/explore"
            startIcon={<AccountTreeRounded />}
          >
            Explore a repo
          </Button>
        </Stack>
      </Paper>

      {/* Highlight row — what makes Code Navigator different */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <HighlightCard
          icon={<BoltRounded />}
          title="No setup required"
          body="No tokens. Just open the app and start exploring."
          accent={brand.primary}
        />
        <HighlightCard
          icon={<PublicRounded />}
          title="Any public repo"
          body="Browse, read, and search across millions of GitHub projects."
          accent={brand.secondary}
        />
        <HighlightCard
          icon={<ShieldRounded />}
          title="AI-powered review"
          body="Get instant explanations and security checks for any snippet."
          accent={brand.accent}
        />
      </Box>

      {/* Quick actions */}
      <Box>
        <Typography variant="overline" sx={{ color: brand.textSubtle, letterSpacing: '0.18em' }}>
          QUICK ACTIONS
        </Typography>
        <Box
          sx={{
            mt: 1,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {quickActions.map((a) => (
            <Paper
              key={a.to}
              component={RouterLink}
              to={a.to}
              sx={{
                p: 2.5,
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                textDecoration: 'none',
                color: 'inherit',
                position: 'relative',
                overflow: 'hidden',
                border: `1px solid ${brand.border}`,
                background: brand.surface,
                transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  borderColor: alpha(a.accent, 0.55),
                  boxShadow: `0 18px 40px ${alpha(a.accent, 0.18)}`,
                },
                '&:before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: `radial-gradient(280px 160px at 100% 0%, ${alpha(a.accent, 0.16)}, transparent 60%)`,
                  pointerEvents: 'none',
                },
              }}
            >
              <Box sx={{ mb: 0.5 }}>
                <IconTile color={a.accent} tint={0.15}>
                  {a.icon}
                </IconTile>
              </Box>
              <Typography variant="h6" sx={{ color: brand.text, fontWeight: 700 }}>
                {a.title}
              </Typography>
              <Typography variant="body2" sx={{ color: brand.textMuted, mb: 0.5 }}>
                {a.body}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.85rem',
                  color: a.accent,
                  fontWeight: 600,
                  mt: 1,
                }}
              >
                Get started <ArrowForwardRounded sx={{ fontSize: 16 }} />
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Two-column: activity + tips */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' },
          gap: 2,
        }}
      >
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
            <HistoryRounded sx={{ color: brand.primary }} />
            <Typography variant="h6" sx={{ color: brand.text, fontWeight: 700 }}>
              Recent activity
            </Typography>
          </Stack>
          {recentAnalyses.length === 0 ? (
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: `1px dashed ${brand.border}`,
                textAlign: 'center',
                color: brand.textMuted,
              }}
            >
              <Typography variant="body2">
                Nothing here yet — analyze a snippet or open a repo to see it appear.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.25}>
              {recentAnalyses.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${brand.border}`,
                    background: alpha(brand.surfaceMuted, 0.6),
                  }}
                >
                  <Typography variant="body2" sx={{ color: brand.text }} noWrap>
                    {item.preview || 'Untitled snippet'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: brand.textSubtle }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(brand.primary, 0.12)}, ${alpha(brand.secondary, 0.06)})`,
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
            <BookmarkBorderRounded sx={{ color: brand.secondary }} />
            <Typography variant="h6" sx={{ color: brand.text, fontWeight: 700 }}>
              Tips for a smooth first PR
            </Typography>
          </Stack>
          <Stack spacing={1.5} sx={{ color: brand.textMuted, fontSize: '0.92rem' }}>
            <Tip number={1} text='Look for the "good first issue" label — maintainers add it on purpose for newcomers.' />
            <Divider sx={{ borderColor: brand.border }} />
            <Tip number={2} text="Read the CONTRIBUTING.md before opening a PR; project conventions vary a lot." />
            <Divider sx={{ borderColor: brand.border }} />
            <Tip number={3} text="Open a draft PR early — it signals you're working on the issue and invites feedback." />
            <Divider sx={{ borderColor: brand.border }} />
            <Tip number={4} text="When stuck, ask in the issue thread with what you tried and where you're blocked." />
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

const HighlightCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
}> = ({ icon, title, body, accent }) => (
  <Paper
    sx={{
      p: 2.5,
      borderRadius: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      position: 'relative',
      overflow: 'hidden',
      '&:before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(260px 140px at 100% 0%, ${alpha(accent, 0.18)}, transparent 60%)`,
        pointerEvents: 'none',
      },
    }}
  >
    <IconTile color={accent}>{icon}</IconTile>
    <Typography variant="h6" sx={{ color: brand.text, fontWeight: 700 }}>
      {title}
    </Typography>
    <Typography variant="body2" sx={{ color: brand.textMuted }}>
      {body}
    </Typography>
  </Paper>
);

const Tip: React.FC<{ number: number; text: string }> = ({ number, text }) => (
  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: brandGradient,
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: 700,
        mt: 0.2,
      }}
    >
      {number}
    </Box>
    <Typography variant="body2" sx={{ color: brand.textMuted }}>
      {text}
    </Typography>
  </Box>
);

export default HomePage;
