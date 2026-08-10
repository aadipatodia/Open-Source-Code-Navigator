import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Stack,
  Chip,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  PlayArrowRounded,
  ContentCopyRounded,
  AutoAwesomeRounded,
  CheckCircleRounded,
  WarningAmberRounded,
  CodeRounded,
  RestartAltRounded,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { brand } from '../theme/theme';
import { apiClient, getApiError } from '../config/api';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import MarkdownRenderer from './common/MarkdownRenderer';
import IconTile from './common/IconTile';

interface AnalysisResponse {
  is_correct: boolean;
  explanation: string;
  corrected_code?: string | null;
}

interface CodeInputProps {
  /** Optional callback fired with the AI explanation after a successful analysis. */
  onAnalysisComplete?: (preview: string) => void;
}

const SAMPLE_CODE = `def factorial(n)
    if n == 0:
        return 1
    else
        return n * factorial(n-1)`;

const SAMPLE_CONTEXT =
  'A Python function to calculate factorial. I think there might be a syntax error.';

const CodeInput: React.FC<CodeInputProps> = ({ onAnalysisComplete }) => {
  const [code, setCode] = useState('');
  const [context, setContext] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { copy, copiedKey } = useCopyToClipboard();

  const loadSample = () => {
    setCode(SAMPLE_CODE);
    setContext(SAMPLE_CONTEXT);
    setAnalysis(null);
    setError(null);
  };

  const reset = () => {
    setCode('');
    setContext('');
    setAnalysis(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please paste in some code to analyze.');
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const body = new URLSearchParams();
      body.append('code', trimmed);
      body.append('context', context);

      const response = await apiClient.post<AnalysisResponse>('/api/explain/code', body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      setAnalysis(response.data);
      onAnalysisComplete?.(response.data.explanation.slice(0, 120));
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to analyze code.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Input card */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <IconTile color={brand.accent}>
            <CodeRounded />
          </IconTile>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: brand.text, fontWeight: 700 }}>
              Paste code, get an instant review
            </Typography>
            <Typography variant="body2" sx={{ color: brand.textMuted }}>
              Gemini will explain what it does — and flag any security issues it spots.
            </Typography>
          </Box>
        </Stack>

        <TextField
          fullWidth
          label="Context (optional)"
          placeholder="e.g. 'This is a checkout handler called from /api/buy'"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          size="small"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Paste your code here"
          multiline
          minRows={9}
          maxRows={18}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          InputProps={{
            sx: {
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            },
          }}
        />

        <Stack
          direction="row"
          spacing={1.25}
          sx={{ mt: 2 }}
          flexWrap="wrap"
          useFlexGap
        >
          <Button
            variant="contained"
            onClick={handleAnalyze}
            disabled={loading || !code.trim()}
            startIcon={
              loading ? <CircularProgress size={16} color="inherit" /> : <PlayArrowRounded />
            }
          >
            {loading ? 'Analyzing…' : 'Analyze code'}
          </Button>
          <Button
            variant="outlined"
            onClick={loadSample}
            disabled={loading}
            startIcon={<AutoAwesomeRounded />}
          >
            Try sample
          </Button>
          <Button
            variant="text"
            onClick={reset}
            disabled={loading || (!code && !context && !analysis)}
            startIcon={<RestartAltRounded />}
          >
            Reset
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Output card */}
      {analysis && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Chip
              icon={
                analysis.is_correct ? (
                  <CheckCircleRounded sx={{ fontSize: 16 }} />
                ) : (
                  <WarningAmberRounded sx={{ fontSize: 16 }} />
                )
              }
              label={analysis.is_correct ? 'No issues found' : 'Issues detected'}
              sx={{
                bgcolor: analysis.is_correct
                  ? alpha(brand.success, 0.14)
                  : alpha(brand.warning, 0.14),
                color: analysis.is_correct ? '#a7f3d0' : '#fde68a',
                border: `1px solid ${analysis.is_correct ? alpha(brand.success, 0.4) : alpha(brand.warning, 0.4)}`,
                '& .MuiChip-icon': {
                  color: analysis.is_correct ? brand.success : brand.warning,
                },
              }}
            />
            <Box sx={{ flex: 1 }} />
            <Tooltip title={copiedKey === 'explanation' ? 'Copied!' : 'Copy explanation'} arrow>
              <IconButton
                size="small"
                onClick={() => copy(analysis.explanation, 'explanation')}
              >
                <ContentCopyRounded sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>

          <Typography variant="overline" sx={{ color: brand.textSubtle, letterSpacing: '0.14em' }}>
            AI EXPLANATION
          </Typography>
          <Box
            sx={{
              mt: 1,
              p: 2,
              borderRadius: 2,
              border: `1px solid ${brand.border}`,
              background: alpha(brand.surfaceMuted, 0.6),
            }}
          >
            <MarkdownRenderer content={analysis.explanation} />
          </Box>

          {!analysis.is_correct && analysis.corrected_code && (
            <>
              <Divider sx={{ my: 3, borderColor: brand.border }} />
              <Stack direction="row" alignItems="center" sx={{ mb: 1 }} spacing={1}>
                <Typography variant="overline" sx={{ color: brand.textSubtle, letterSpacing: '0.14em' }}>
                  CORRECTED CODE
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Tooltip title={copiedKey === 'corrected' ? 'Copied!' : 'Copy corrected code'} arrow>
                  <IconButton
                    size="small"
                    onClick={() => copy(analysis.corrected_code!, 'corrected')}
                  >
                    <ContentCopyRounded sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: `1px solid ${alpha(brand.success, 0.35)}`,
                  boxShadow: `0 0 0 4px ${alpha(brand.success, 0.06)}`,
                }}
              >
                <SyntaxHighlighter
                  language="auto"
                  style={vscDarkPlus as any}
                  customStyle={{
                    margin: 0,
                    padding: '14px 18px',
                    background: '#0b1024',
                    fontSize: '0.85rem',
                  }}
                  codeTagProps={{
                    style: { fontFamily: '"JetBrains Mono", monospace' },
                  }}
                >
                  {analysis.corrected_code}
                </SyntaxHighlighter>
              </Box>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default CodeInput;
