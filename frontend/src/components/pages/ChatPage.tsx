import React from 'react';
import { Box } from '@mui/material';
import { ChatBubbleRounded } from '@mui/icons-material';

import SectionHeader from '../common/SectionHeader';
import ChatComponent from '../ChatComponent';
import { CHAT_HISTORY_LIMIT, useAppData } from '../../context/AppDataContext';

const SUGGESTED = [
  'How do I open my first pull request on GitHub?',
  'Explain how a React useEffect hook works in 3 sentences.',
  "What does 'rebase vs merge' actually mean?",
  'Give me a learning roadmap for contributing to Python libraries.',
];

const ChatPage: React.FC = () => {
  const { chatMessages, chatLoading, chatTurns, askQuestion, clearChat } = useAppData();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        height: 'calc(100vh - 160px)',
        minHeight: 540,
      }}
    >
      <SectionHeader
        icon={<ChatBubbleRounded />}
        eyebrow="AI CHAT"
        title="Ask the Code Navigator"
        subtitle="Concepts, commands, error messages — anything about software. Other subjects are out of scope."
      />

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ChatComponent
          onSendMessage={askQuestion}
          isLoading={chatLoading}
          messages={chatMessages}
          suggestedPrompts={SUGGESTED}
          onClear={clearChat}
          historyUsed={chatTurns}
          historyLimit={CHAT_HISTORY_LIMIT}
        />
      </Box>
    </Box>
  );
};

export default ChatPage;
