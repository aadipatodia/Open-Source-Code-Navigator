import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Stack,
  Chip,
  Avatar,
} from '@mui/material';
import {
  SendRounded,
  SmartToyRounded,
  AutoAwesomeRounded,
  PersonRounded,
  ClearAllRounded,
  HistoryRounded,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

import { brand, brandGradient } from '../theme/theme';
import MarkdownRenderer from './common/MarkdownRenderer';
import IconTile from './common/IconTile';
import { ChatMessage } from '../types';

interface ChatComponentProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  messages: ChatMessage[];
  placeholder?: string;
  suggestedPrompts?: string[];
  onClear?: () => void;
  /** Render in a compact (sidebar-style) layout when true. */
  compact?: boolean;
  /** Messages the model currently remembers, out of `historyLimit`. */
  historyUsed?: number;
  historyLimit?: number;
}

const ChatComponent: React.FC<ChatComponentProps> = ({
  onSendMessage,
  isLoading,
  messages,
  placeholder = 'Ask anything about open source, a repo, or a snippet…',
  suggestedPrompts = [],
  onClear,
  compact = false,
  historyUsed,
  historyLimit,
}) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isLoading) return;
    onSendMessage(value);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <Paper
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          overflow: 'hidden',
          background: alpha(brand.surfaceMuted, 0.7),
        }}
      >
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: compact ? 1.5 : { xs: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {messages.length === 0 && (
            <EmptyState
              suggestedPrompts={suggestedPrompts}
              onSelect={(p) => handleSend(p)}
              compact={compact}
            />
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} compact={compact} />
          ))}

          {isLoading && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
              <Avatar
                sx={{
                  bgcolor: alpha(brand.primary, 0.2),
                  color: brand.primary,
                  width: 32,
                  height: 32,
                }}
              >
                <SmartToyRounded sx={{ fontSize: 18 }} />
              </Avatar>
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  background: alpha(brand.text, 0.04),
                  border: `1px solid ${brand.border}`,
                  display: 'inline-flex',
                  gap: 0.5,
                }}
              >
                {[0, 150, 300].map((delay) => (
                  <Box
                    key={delay}
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: brand.primary,
                      opacity: 0.7,
                      animation: 'cn-bounce 1.2s ease-in-out infinite',
                      animationDelay: `${delay}ms`,
                      '@keyframes cn-bounce': {
                        '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
                        '40%': { transform: 'scale(1)', opacity: 1 },
                      },
                    }}
                  />
                ))}
              </Box>
            </Stack>
          )}

          <div ref={bottomRef} />
        </Box>

        {messages.length > 0 && onClear && !compact && (
          <Box
            sx={{
              px: 2,
              py: 1,
              borderTop: `1px solid ${brand.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            {historyLimit ? (
              <Chip
                icon={<HistoryRounded sx={{ fontSize: 16 }} />}
                label={`Remembering ${historyUsed ?? 0} of ${historyLimit} messages`}
                size="small"
                variant="outlined"
                sx={{ color: brand.textMuted, borderColor: brand.border }}
              />
            ) : (
              <span />
            )}
            <Chip
              icon={<ClearAllRounded sx={{ fontSize: 16 }} />}
              label="Clear conversation"
              variant="outlined"
              size="small"
              onClick={onClear}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        )}
      </Paper>

      <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={6}
          minRows={1}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <IconButton
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          sx={{
            width: 48,
            height: 48,
            background: brandGradient,
            color: '#fff',
            boxShadow: `0 10px 26px ${alpha(brand.primary, 0.35)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${brand.primaryHover}, ${brand.secondary})`,
              color: '#fff',
            },
            '&.Mui-disabled': {
              background: alpha(brand.text, 0.08),
              color: alpha(brand.text, 0.3),
            },
          }}
        >
          {isLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <SendRounded />}
        </IconButton>
      </Box>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
const EmptyState: React.FC<{
  suggestedPrompts: string[];
  onSelect: (prompt: string) => void;
  compact?: boolean;
}> = ({ suggestedPrompts, onSelect, compact }) => {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.5,
        color: brand.textMuted,
        py: compact ? 2 : 4,
      }}
    >
      <IconTile color={brand.primary} size={compact ? 48 : 64} circular>
        <AutoAwesomeRounded sx={{ fontSize: compact ? 24 : 30 }} />
      </IconTile>
      <Typography variant={compact ? 'body2' : 'h6'} sx={{ color: brand.text, fontWeight: 700 }}>
        Your AI mentor is ready
      </Typography>
      {!compact && (
        <Typography variant="body2" sx={{ maxWidth: 380 }}>
          Ask about a codebase, an error message, an OSS concept — anything in software.
        </Typography>
      )}
      {suggestedPrompts.length > 0 && (
        <Stack
          direction={compact ? 'column' : 'row'}
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 1.5, justifyContent: 'center' }}
        >
          {suggestedPrompts.map((p) => (
            <Chip
              key={p}
              label={p}
              onClick={() => onSelect(p)}
              variant="outlined"
              sx={{ cursor: 'pointer', maxWidth: 320, whiteSpace: 'normal', height: 'auto', py: 0.5 }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Single message bubble
// ---------------------------------------------------------------------------
const MessageBubble: React.FC<{ message: ChatMessage; compact?: boolean }> = ({
  message,
  compact,
}) => {
  // Notices come from the app, not the model, so they sit apart from the thread.
  if (message.sender === 'system') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 0.5 }}>
        <Box sx={{ flex: 1, height: '1px', background: brand.border }} />
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            border: `1px solid ${alpha(brand.secondary, 0.3)}`,
            background: alpha(brand.secondary, 0.08),
          }}
        >
          <HistoryRounded sx={{ fontSize: 14, color: brand.secondary }} />
          <Typography variant="caption" sx={{ color: brand.textMuted, textAlign: 'center' }}>
            {message.text}
          </Typography>
        </Stack>
        <Box sx={{ flex: 1, height: '1px', background: brand.border }} />
      </Stack>
    );
  }

  const isUser = message.sender === 'user';
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="flex-start"
      sx={{ flexDirection: isUser ? 'row-reverse' : 'row' }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isUser ? alpha(brand.secondary, 0.18) : alpha(brand.primary, 0.18),
          color: isUser ? brand.secondary : brand.primary,
          border: `1px solid ${isUser ? alpha(brand.secondary, 0.4) : alpha(brand.primary, 0.4)}`,
          flexShrink: 0,
        }}
      >
        {isUser ? <PersonRounded sx={{ fontSize: 18 }} /> : <SmartToyRounded sx={{ fontSize: 18 }} />}
      </Avatar>
      <Box
        sx={{
          maxWidth: compact ? '85%' : '78%',
          px: 1.75,
          py: 1.25,
          borderRadius: 2.5,
          background: isUser
            ? `linear-gradient(135deg, ${alpha(brand.primary, 0.22)}, ${alpha(brand.secondary, 0.18)})`
            : alpha(brand.surface, 0.85),
          border: `1px solid ${isUser ? alpha(brand.primary, 0.35) : brand.border}`,
          color: brand.text,
          fontSize: '0.95rem',
          wordBreak: 'break-word',
        }}
      >
        {isUser ? (
          <Typography sx={{ color: brand.text, whiteSpace: 'pre-wrap' }}>{message.text}</Typography>
        ) : (
          <MarkdownRenderer content={message.text} />
        )}
      </Box>
    </Stack>
  );
};

export default ChatComponent;
