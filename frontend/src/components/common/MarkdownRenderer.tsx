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
          code({ node, inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match ? match[1] : 'text';
            const codeString = String(children).replace(/\n$/, '');

            if (inline) {
              return (
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              );
            }

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
