import React from 'react';
import { Box } from '@mui/material';
import { ChatBubbleRounded } from '@mui/icons-material';

import SectionHeader from '../common/SectionHeader';
import ChatComponent from '../ChatComponent';
import { useAppData } from '../../context/AppDataContext';

const SUGGESTED = [
  'How do I open my first pull request on GitHub?',
  'Explain how a React useEffect hook works in 3 sentences.',
  "What does 'rebase vs merge' actually mean?",
  'Give me a learning roadmap for contributing to Python libraries.',
];

const ChatPage: React.FC = () => {
  const { chatMessages, chatLoading, askQuestion, clearChat } = useAppData();

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
        title="Ask the Code Navigator anything"
        subtitle="Concepts, commands, error messages — your AI pair-programmer is one message away."
      />

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ChatComponent
          onSendMessage={askQuestion}
          isLoading={chatLoading}
          messages={chatMessages}
          suggestedPrompts={SUGGESTED}
          onClear={clearChat}
        />
      </Box>
    </Box>
  );
};

export default ChatPage;
