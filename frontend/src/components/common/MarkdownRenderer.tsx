import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Box } from '@mui/material';

interface MarkdownRendererProps {
  content: string;
  /** Optional className to scope styles (defaults to .md-content from App.css). */
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = 'md-content',
}) => {
  return (
    <Box className={className}>
      <ReactMarkdown
        components={{
          // Avoid an extra <pre> wrapper around SyntaxHighlighter (PreTag="motion").
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const raw = String(children ?? '');
            const codeString = raw.replace(/\n$/, '').trim();
            // react-markdown v10 removed the `inline` prop. Fenced blocks carry
            // `language-*` and/or a newline; everything else is inline.
            const isBlock = Boolean(match) || raw.includes('\n');

            if (!isBlock) {
              return (
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              );
            }

            // Models often emit empty fenced blocks between bullets — skip them.
            if (!codeString) {
              return null;
            }

            const language = match ? match[1] : 'text';
            return (
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus as any}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: 12,
                  padding: '14px 16px',
                  fontSize: '0.85rem',
                  background: '#0b1024',
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                }}
                codeTagProps={{
                  style: { fontFamily: '"JetBrains Mono", monospace' },
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default MarkdownRenderer;
