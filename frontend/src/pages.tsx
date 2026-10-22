// Page components — one per route (Home, Explore, Issues, Analyze, Chat, Login, Signup).
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountTreeRounded,
  ArrowForwardRounded,
  AutoAwesomeRounded,
  BiotechRounded,
  ChatBubbleRounded,
  FolderSpecialRounded,
  GitHub,
  HistoryRounded,
  LaunchRounded,
  LoginRounded,
  PersonAddRounded,
  RefreshRounded,
  TravelExploreRounded,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';

import { brand, brandGradient } from './theme';
import { useAppData, CHAT_HISTORY_LIMIT } from './context/AppDataContext';
import { useAuth } from './context/AuthContext';
import { IconTile, SectionHeader } from './ui';
import { FileItem } from './types';
import RepositoryInput from './components/RepositoryInput';
import FileExplorer from './components/FileExplorer';
import CodebaseAnalysis from './components/CodebaseAnalysis';
import CodeInput from './components/CodeInput';
import IssueFinder from './components/IssueFinder';
import ChatComponent from './components/ChatComponent';

const quickActions = [
  { to: '/explore', icon: <AccountTreeRounded />, title: 'Explore a repository', accent: brand.primary },
  { to: '/issues', icon: <TravelExploreRounded />, title: 'Find good-first issues', accent: brand.secondary },
  { to: '/analyze', icon: <BiotechRounded />, title: 'Analyze a snippet', accent: brand.accent },
  { to: '/chat', icon: <ChatBubbleRounded />, title: 'Talk to your AI mentor', accent: '#a78bfa' },
];

const CHAT_SUGGESTIONS = [
  'How do I open my first pull request on GitHub?',
  'Explain how a React useEffect hook works in 3 sentences.',
  "What does 'rebase vs merge' actually mean?",
  'Give me a learning roadmap for contributing to Python libraries.',
];

/** Dashboard with quick-action cards, recent analyses, and welcome banner. */
export function HomePage() {
  const { recentAnalyses } = useAppData();
  const { user } = useAuth();
  const firstName = (user?.name || 'Coder').split(' ')[0];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: `1px solid ${brand.border}` }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: brand.text }}>
          Hey {firstName}, ready to ship your next PR?
        </Typography>
        <Typography sx={{ mt: 1, color: brand.textMuted, maxWidth: 640 }}>
          Explore a repo, find an issue, or ask the AI mentor — pick a path below.
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }} flexWrap="wrap" useFlexGap>
          <Button variant="contained" component={RouterLink} to="/issues" startIcon={<TravelExploreRounded />}>
            Find an issue
          </Button>
          <Button variant="outlined" component={RouterLink} to="/explore" startIcon={<AccountTreeRounded />}>
            Explore a repo
          </Button>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        {quickActions.map((a) => (
          <Paper
            key={a.to}
            component={RouterLink}
            to={a.to}
            sx={{
              p: 2,
              borderRadius: 3,
              textDecoration: 'none',
              color: 'inherit',
              border: `1px solid ${brand.border}`,
              '&:hover': { borderColor: alpha(a.accent, 0.5) },
            }}
          >
            <IconTile color={a.accent} tint={0.15}>
              {a.icon}
            </IconTile>
            <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700, color: brand.text }}>
              {a.title}
            </Typography>
            <ArrowForwardRounded sx={{ fontSize: 18, color: a.accent, mt: 1 }} />
          </Paper>
        ))}
      </Box>

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <HistoryRounded sx={{ color: brand.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: brand.text }}>
            Recent analyses
          </Typography>
        </Stack>
        {recentAnalyses.length === 0 ? (
          <Typography variant="body2" sx={{ color: brand.textMuted }}>
            Analyze a snippet on the Analyze page to see it here.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {recentAnalyses.map((item) => (
              <Typography key={item.id} variant="body2" sx={{ color: brand.text }} noWrap>
                {item.preview || 'Untitled snippet'}
              </Typography>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}

/** Recursively count file nodes in a tree (excludes directories). */
function countFiles(items: FileItem[]): number {
  return items.reduce(
    (total, item) => total + (item.type === 'directory' ? countFiles(item.children || []) : 1),
    0
  );
}

/** Repository explorer — URL input, file tree, and code viewer side-by-side. */
export function ExplorePage() {
  const {
    repoUrl,
    repoStructure,
    repoLoading,
    repoError,
    selectedFile,
    fileContent,
    fileLoading,
    loadRepository,
    selectFile,
    openGuideForRepo,
    guideLoading,
  } = useAppData();

  const repoLabel = repoUrl ? repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '') : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SectionHeader
        icon={<AccountTreeRounded />}
        eyebrow="REPOSITORY EXPLORER"
        title="Open any GitHub project"
        subtitle="Paste a public repo URL to browse files and read code."
      />
      <RepositoryInput
        onRepositorySelect={loadRepository}
        loading={repoLoading}
        error={repoError}
        defaultValue={repoUrl}
      />
      {repoLoading && !repoStructure && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography sx={{ color: brand.textMuted }}>Cloning and indexing…</Typography>
        </Paper>
      )}
      {repoStructure && (
        <>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <IconTile color={brand.primary} size={36}>
              <GitHub />
            </IconTile>
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 700, color: brand.text }} noWrap>
              {repoLabel}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="small"
                onClick={() => repoUrl && openGuideForRepo(repoUrl)}
                startIcon={<AutoAwesomeRounded />}
                disabled={guideLoading}
              >
                How to contribute
              </Button>
              <Button variant="outlined" size="small" href={repoUrl || '#'} target="_blank" rel="noreferrer" startIcon={<LaunchRounded />}>
                GitHub
              </Button>
              <Button variant="text" size="small" onClick={() => repoUrl && loadRepository(repoUrl)} startIcon={<RefreshRounded />} disabled={repoLoading}>
                Refresh
              </Button>
            </Stack>
          </Paper>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
              gap: 2,
              minHeight: 480,
            }}
          >
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <FolderSpecialRounded sx={{ color: brand.secondary }} />
                <Typography sx={{ fontWeight: 700 }}>Files</Typography>
                <Chip size="small" label={`${countFiles(repoStructure)} files`} sx={{ ml: 'auto' }} />
              </Stack>
              <FileExplorer structure={repoStructure} onFileSelect={selectFile} selectedFile={selectedFile} />
            </Paper>
            <Paper sx={{ minHeight: 360, overflow: 'hidden' }}>
              {fileLoading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : selectedFile ? (
                <CodebaseAnalysis
                  content={fileContent}
                  language={selectedFile.name.split('.').pop() || 'plaintext'}
                  fileName={selectedFile.name}
                  filePath={selectedFile.path}
                />
              ) : (
                <Box sx={{ p: 4, textAlign: 'center', color: brand.textMuted }}>
                  Select a file from the tree.
                </Box>
              )}
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
}

/** Issue finder — search by skills for good-first-issue tickets. */
export function IssuesPage() {
  const { issueGroups, issuesLoading, issuesError, findIssues, openGuideForIssue } = useAppData();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SectionHeader
        icon={<TravelExploreRounded />}
        eyebrow="ISSUE FINDER"
        title="Find a beginner-friendly issue"
        subtitle="Search by skills and open a contribution plan for any issue."
      />
      <IssueFinder
        onFindIssues={findIssues}
        onSelectIssue={openGuideForIssue}
        loading={issuesLoading}
        groups={issueGroups}
        error={issuesError}
      />
    </Box>
  );
}

/** Code analysis — paste a snippet for explanation and security review. */
export function AnalyzePage() {
  const { addAnalysis } = useAppData();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SectionHeader
        icon={<BiotechRounded />}
        eyebrow="CODE ANALYSIS"
        title="Explain and review any code"
        subtitle="Paste a snippet for explanation and security feedback."
      />
      <CodeInput onAnalysisComplete={(preview) => addAnalysis(preview)} />
    </Box>
  );
}

/** AI chat — full-height conversation interface with the programming mentor. */
export function ChatPage() {
  const { chatMessages, chatLoading, chatTurns, askQuestion, clearChat } = useAppData();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: 'calc(100vh - 160px)', minHeight: 540 }}>
      <SectionHeader
        icon={<ChatBubbleRounded />}
        eyebrow="AI CHAT"
        title="Ask the Code Navigator"
        subtitle="Open-source and programming questions only."
      />
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ChatComponent
          onSendMessage={askQuestion}
          isLoading={chatLoading}
          messages={chatMessages}
          suggestedPrompts={CHAT_SUGGESTIONS}
          onClear={clearChat}
          historyUsed={chatTurns}
          historyLimit={CHAT_HISTORY_LIMIT}
        />
      </Box>
    </Box>
  );
}

/** Shared login/signup form — mode prop switches between the two flows. */
function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const navigate = useNavigate();
  const { user, login, signup, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isLogin = mode === 'login';
  const isEmailLikelyValid = useMemo(() => email.trim().includes('@'), [email]);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) await login(email.trim(), password);
      else await signup(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : isLogin ? 'Login failed.' : 'Sign up failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setError('');
    setGoogleSubmitting(true);
    try {
      await googleLogin();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4 }}>
      <Paper sx={{ width: '100%', maxWidth: 480, p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 2, mx: 'auto', mb: 1.5, display: 'grid', placeItems: 'center', background: brandGradient, color: '#fff' }}>
              {isLogin ? <LoginRounded /> : <PersonAddRounded />}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: brand.text }}>
              {isLogin ? 'Welcome back' : 'Create your account'}
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth autoComplete="email" />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <Button type="submit" variant="contained" fullWidth disabled={submitting || !isEmailLikelyValid || !password}>
                {submitting ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : isLogin ? 'Sign in' : 'Create account'}
              </Button>
            </Stack>
          </Box>
          {isLogin && (
            <Button variant="outlined" fullWidth onClick={onGoogle} disabled={googleSubmitting}>
              {googleSubmitting ? <CircularProgress size={22} /> : 'Sign in with Google'}
            </Button>
          )}
          <Typography variant="body2" sx={{ textAlign: 'center', color: brand.textMuted }}>
            {isLogin ? (
              <>
                No account? <Button component={RouterLink} to="/signup" size="small">Sign up</Button>
              </>
            ) : (
              <>
                Have an account? <Button component={RouterLink} to="/login" size="small">Sign in</Button>
              </>
            )}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

export function LoginPage() {
  return <AuthPage mode="login" />;
}

export function SignupPage() {
  return <AuthPage mode="signup" />;
}
