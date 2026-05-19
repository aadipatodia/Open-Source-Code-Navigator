import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Chip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ContentCopyRounded,
  CheckRounded,
  DescriptionRounded,
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { alpha } from '@mui/material/styles';

import { brand } from '../theme/theme';

interface User {
  userId: string;
  name?: string;
  username?: string;
}

interface CodebaseAnalysisProps {
  content: string;
  /** File extension or language hint (e.g. "ts", "py"). */
  language: string;
  fileName?: string;
  filePath?: string;
  user: User;
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  swift: 'swift',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  md: 'markdown',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sql: 'sql',
  toml: 'toml',
  xml: 'xml',
};

const resolveLanguage = (raw: string) => {
  if (!raw) return 'text';
  const lower = raw.toLowerCase();
  return LANGUAGE_MAP[lower] || lower;
};

const CodebaseAnalysis: React.FC<CodebaseAnalysisProps> = ({
  content,
  language,
  fileName,
  filePath,
}) => {
  const [copied, setCopied] = useState(false);
  const resolvedLanguage = resolveLanguage(language);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
    } catch {
      // ignore
    }
  };

  const lineCount = content ? content.split('\n').length : 0;

  return (
    <Paper
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${brand.border}`,
          background: alpha(brand.surfaceMuted, 0.5),
        }}
      >
        <DescriptionRounded sx={{ color: brand.textSubtle, fontSize: 18 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            sx={{
              color: brand.text,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.85rem',
            }}
          >
            {filePath || fileName || 'Untitled'}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={resolvedLanguage}
          sx={{
            height: 22,
            fontSize: '0.7rem',
            textTransform: 'lowercase',
            background: alpha(brand.secondary, 0.15),
            color: brand.secondary,
            border: `1px solid ${alpha(brand.secondary, 0.35)}`,
          }}
        />
        <Chip
          size="small"
          variant="outlined"
          label={`${lineCount} lines`}
          sx={{
            height: 22,
            fontSize: '0.7rem',
            color: brand.textMuted,
            borderColor: brand.border,
          }}
        />
        <Tooltip title={copied ? 'Copied!' : 'Copy file contents'} arrow>
          <IconButton onClick={handleCopy} size="small">
            {copied ? (
              <CheckRounded sx={{ fontSize: 18, color: brand.success }} />
            ) : (
              <ContentCopyRounded sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Code body */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          background: '#0b1024',
        }}
      >
        {content ? (
          <SyntaxHighlighter
            language={resolvedLanguage}
            style={vscDarkPlus as any}
            showLineNumbers
            wrapLongLines={false}
            customStyle={{
              margin: 0,
              padding: '16px 18px',
              background: 'transparent',
              fontSize: '0.85rem',
              minHeight: '100%',
            }}
            lineNumberStyle={{
              minWidth: '2.4em',
              paddingRight: '1em',
              color: alpha(brand.text, 0.25),
              userSelect: 'none',
            }}
            codeTagProps={{
              style: { fontFamily: '"JetBrains Mono", monospace' },
            }}
          >
            {content}
          </SyntaxHighlighter>
        ) : (
          <Box
            sx={{
              p: 4,
              color: brand.textMuted,
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            (empty file)
          </Box>
        )}
      </Box>

      <Snackbar
        open={copied}
        autoHideDuration={1600}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          sx={{ width: '100%', bgcolor: brand.success }}
        >
          Copied file contents
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default CodebaseAnalysis;
