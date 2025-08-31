import React, { useState } from 'react';
import axios from 'axios';
import {
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { PlayArrow as RunIcon, ContentCopy as CopyIcon } from '@mui/icons-material';

// Define the shape of the API response
interface AnalysisResponse {
  is_correct: boolean;
  explanation: string;
  corrected_code?: string | null;
}

interface CodeInputProps {
  userToken: string;
}

const CodeInput: React.FC<CodeInputProps> = ({ userToken }) => {
  const [code, setCode] = useState('');
  const [context, setContext] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- ADDED BACK ---
  // Function to load sample code into the input fields
  const loadSampleCode = () => {
    const sampleCode = `def factorial(n)
    if n == 0:
        return 1
    else
        return n * factorial(n-1)`;
    
    setCode(sampleCode);
    setContext('A Python function to calculate factorial. I think there might be a syntax error.');
  };
  // --- END ADDED BACK ---

  const handleAnalyze = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Please enter some code to analyze');
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const body = new URLSearchParams();
      body.append('code', trimmedCode);
      body.append('context', context);

      const response = await axios.post<AnalysisResponse>(
        'http://localhost:8000/api/explain/code', 
        body,
        { 
          headers: { 
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          } 
        }
      );
      setAnalysis(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to analyze code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
  };

  return (
    <Paper sx={{ p: 3, background: 'linear-gradient(145deg, #1A1A2E 0%, #16213E 100%)' }}>
      <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 2 }}>
        Code Analysis
      </Typography>

      <TextField
        fullWidth
        label="Context (optional)"
        value={context}
        onChange={(e) => setContext(e.target.value)}
        margin="normal"
        size="small"
        /* --- Styles --- */
      />

      <TextField
        fullWidth
        label="Paste your code here"
        multiline
        rows={8}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        margin="normal"
        /* --- Styles --- */
      />

      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={handleAnalyze}
          disabled={loading || !code.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <RunIcon />}
          /* --- Styles --- */
        >
          {loading ? 'Analyzing...' : 'Analyze Code'}
        </Button>

        {/* --- ADDED BACK --- */}
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
        {/* --- END ADDED BACK --- */}
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {analysis && (
        <Box sx={{ mt: 3 }}>
          {/* Explanation Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ color: 'white', flexGrow: 1 }}>
              🤖 AI Analysis
            </Typography>
            <IconButton onClick={() => handleCopy(analysis.explanation)} size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              <CopyIcon fontSize="small" />
            </IconButton>
          </Box>
          <Paper sx={{ p: 2, bgcolor: '#0A0A1A', border: '1px solid rgba(255, 255, 255, 0.1)', mb: 3 }}>
            <Typography variant="body2" sx={{ color: 'white', whiteSpace: 'pre-wrap' }}>
              {analysis.explanation}
            </Typography>
          </Paper>

          {/* Corrected Code Section (Conditional) */}
          {!analysis.is_correct && analysis.corrected_code && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ color: '#A8FF00', flexGrow: 1 }}>
                  ✅ Corrected Code
                </Typography>
                <IconButton onClick={() => handleCopy(analysis.corrected_code!)} size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Paper sx={{ p: 2, bgcolor: '#0A0A1A', border: '1px solid #A8FF00' }}>
                <Typography component="pre" sx={{ color: '#00CED1', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  <code>{analysis.corrected_code}</code>
                </Typography>
              </Paper>
            </>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default CodeInput;