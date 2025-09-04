import React, { useState } from 'react';
import { Box, TextField, IconButton, Paper, Typography, CircularProgress, Chip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface ChatComponentProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  messages: { text: string; sender: 'user' | 'ai' }[];
  placeholder?: string;
}

const ChatComponent: React.FC<ChatComponentProps> = ({
  onSendMessage,
  isLoading,
  messages,
  placeholder = "Ask a question..."
}) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '90%' }}>
      <Paper elevation={3} sx={{ flexGrow: 1, p: 2, mb: 2, overflowY: 'auto', background: '#0A0A1A', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        {messages.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '90%', color: 'rgba(255, 255, 255, 0.5)' }}>
            <SmartToyIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="body2" sx={{ textAlign: 'center' }}>Your AI Assistant is ready!</Typography>
            <Typography variant="caption" sx={{ textAlign: 'center' }}>Ask a question about the code.</Typography>
          </Box>
        ) : (
          messages.map((msg, index) => (
            <Box key={index} sx={{ mb: 1, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
              <Chip
                label={msg.text}
                sx={{
                  bgcolor: msg.sender === 'user' ? '#551a8b' : '#333',
                  color: 'white',
                  wordBreak: 'break-word',
                  height: 'auto',
                  p: '10px 14px', // Add more padding to the chip
                  '& .MuiChip-label': {
                    display: 'block',
                    whiteSpace: 'normal',
                    fontSize: '1rem',      // Increase font size for better readability
                    lineHeight: 1.5,       // Adjust line height
                  },
                }}
              />

            </Box>
          ))
        )}
      </Paper>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              color: 'white',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          sx={{ ml: 1, bgcolor: '#551a8b', '&:hover': { bgcolor: '#6a2cb3' } }}
        >
          {isLoading ? <CircularProgress size={24} /> : <SendIcon sx={{ color: 'white' }} />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default ChatComponent;