import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
} from '@mui/material';
import { PlayArrow as RunIcon, Code as CodeIcon, ContentCopy as CopyIcon } from '@mui/icons-material';

interface CodeInputProps {
  onAnalyzeCode: (code: string, context: string) => Promise<string>; // Expecting a Promise<string>
  userToken: string;
}

const CodeInput: React.FC<CodeInputProps> = ({ onAnalyzeCode, userToken }) => {
  const [code, setCode] = useState('');
  const [context, setContext] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Explicitly typed as string or null

  const handleAnalyze = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Please enter some code to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onAnalyzeCode(trimmedCode, context || ''); // Ensure context is a string
      setExplanation(result);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to analyze code';
      setError(errorMessage);
      console.error('Code analysis error:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setContext('');
    setExplanation('');
    setError(null);
  };

  const handleCopyExplanation = () => {
    navigator.clipboard.writeText(explanation);
  };

  const sampleCode = `def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n-1)`;

  const loadSampleCode = () => {
    setCode(sampleCode);
    setContext('Math utility function');
  };

  return (
    <Paper sx={{ p: 3, background: 'linear-gradient(145deg, #1A1A2E 0%, #16213E 100%)' }}>
      <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 2 }}>
        Code Analysis
      </Typography>

      {/* Context Input */}
      <TextField
        fullWidth
        label="Context (optional)"
        placeholder="What does this code do? Where is it from?"
        value={context}
        onChange={(e) => setContext(e.target.value)}
        margin="normal"
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            color: 'white',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
          },
        }}
      />

      {/* Code Input */}
      <TextField
        fullWidth
        label="Paste your code here"
        multiline
        rows={8}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        margin="normal"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
            fontSize: '0.9rem',
            '& textarea': {
              color: '#00CED1', // Teal color for code
            },
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
          },
        }}
      />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={handleAnalyze}
          disabled={loading || !code.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <RunIcon />}
          sx={{
            borderRadius: '8px',
            background: 'linear-gradient(45deg, #8A2BE2, #00CED1)',
            minWidth: '120px',
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze Code'}
        </Button>

        <Button
          variant="outlined"
          onClick={loadSampleCode}
          disabled={loading}
          sx={{
            borderRadius: '8px',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            color: 'white',
          }}
        >
          Load Sample
        </Button>

        <Button
          variant="outlined"
          onClick={handleClear}
          disabled={loading}
          sx={{
            borderRadius: '8px',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            color: 'white',
          }}
        >
          Clear
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {/* Explanation Display */}
      {explanation && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ color: 'white', flexGrow: 1 }}>
              🤖 AI Explanation
            </Typography>
            <IconButton
              onClick={handleCopyExplanation}
              size="small"
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Paper 
            sx={{ 
              p: 2, 
              bgcolor: '#0A0A1A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'white', 
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
              }}
            >
              {explanation}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Tips */}
      {!explanation && !loading && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0, 206, 209, 0.1)', borderRadius: '8px' }}>
          <Typography variant="body2" sx={{ color: '#00CED1', fontSize: '0.8rem' }}>
            💡 Tip: You can analyze functions, classes, or entire code snippets. 
            Add context for better explanations!
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CodeInput;