// Shared UI primitives — useCopyToClipboard hook, IconTile, SectionHeader, MarkdownRenderer.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

import { brand } from './theme';

/** Copy text to clipboard and track which key was last copied (auto-resets). */
export function useCopyToClipboard(resetAfterMs = 1500) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const copy = useCallback(
    async (text: string, key = 'default') => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setCopiedKey(null), resetAfterMs);
      } catch {
        /* clipboard denied */
      }
    },
    [resetAfterMs]
  );

  return { copy, copiedKey };
}

/** Colored square (or circle) icon container used across section headers and cards. */
export const IconTile: React.FC<{
  children: React.ReactNode;
  color: string;
  size?: number;
  circular?: boolean;
  tint?: number;
}> = ({ children, color, size = 40, circular = false, tint = 0.16 }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: circular ? '50%' : 2,
      display: 'grid',
      placeItems: 'center',
      background: alpha(color, tint),
      color,
      flexShrink: 0,
    }}
  >
    {children}
  </Box>
);

/** Page section header with icon tile, eyebrow label, title, subtitle, and optional action. */
export const SectionHeader: React.FC<{
  icon?: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ icon, eyebrow, title, subtitle, action }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: { xs: 'flex-start', sm: 'center' },
      justifyContent: 'space-between',
      gap: 2,
      flexDirection: { xs: 'column', sm: 'row' },
      mb: 2,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      {icon && <IconTile color={brand.primary}>{icon}</IconTile>}
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography
            variant="overline"
            sx={{ color: brand.secondary, letterSpacing: '0.16em', fontWeight: 600 }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h5" sx={{ color: brand.text, fontWeight: 800, lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: brand.textMuted, mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
    {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
  </Box>
);

const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const TABLE_DIVIDER_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/**
 * Clean up the table markdown models tend to produce so remark-gfm can parse it:
 * put a blank line before each table, and drop blank lines that split a table in two.
 * Lines inside fenced code blocks are left alone.
 */
export function normalizeMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) {
      out.push(line);
      continue;
    }

    const startsTable = TABLE_ROW_RE.test(line) && TABLE_DIVIDER_RE.test(lines[i + 1] ?? '');
    const prev = out[out.length - 1];
    if (startsTable && prev !== undefined && prev.trim() !== '' && !TABLE_ROW_RE.test(prev)) {
      out.push('');
    }

    // A blank line between two table rows ends the table early; skip it.
    if (line.trim() === '' && prev !== undefined && TABLE_ROW_RE.test(prev) && TABLE_ROW_RE.test(lines[i + 1] ?? '')) {
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

/** Render markdown (GitHub-flavoured: tables, task lists) with Prism-highlighted code blocks. */
export const MarkdownRenderer: React.FC<{ content: string; className?: string }> = ({
  content,
  className = 'md-content',
}) => (
  <Box className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table({ children }) {
          return (
            <div className="md-table-wrap">
              <table>{children}</table>
            </div>
          );
        },
        a({ children, href }) {
          return (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          );
        },
        pre({ children }) {
          return <>{children}</>;
        },
        code({ className: codeClassName, children, ...props }: any) {
          const match = /language-(\w+)/.exec(codeClassName || '');
          const raw = String(children ?? '');
          const codeString = raw.replace(/\n$/, '').trim();
          const isBlock = Boolean(match) || raw.includes('\n');

          if (!isBlock) {
            return (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            );
          }
          if (!codeString) return null;

          const language = match ? match[1] : 'text';
          return (
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus as any}
              PreTag="div"
              className="md-codeblock"
              customStyle={{
                margin: 0,
                borderRadius: 12,
                padding: '14px 16px',
                fontSize: '0.85rem',
                background: '#0b1024',
                border: '1px solid rgba(148, 163, 184, 0.14)',
              }}
              codeTagProps={{ style: { fontFamily: '"JetBrains Mono", monospace' } }}
            >
              {codeString}
            </SyntaxHighlighter>
          );
        },
      }}
    >
      {normalizeMarkdown(content)}
    </ReactMarkdown>
  </Box>
);
