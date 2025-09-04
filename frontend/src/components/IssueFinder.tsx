import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
} from '@mui/material';
import { Search as SearchIcon, GitHub as GitHubIcon } from '@mui/icons-material';

interface Issue {
  id: number;
  title: string;
  url: string;
  labels: string[];
  repoName: string;
}

interface IssueFinderProps {
  onFindIssues: (skills: string) => Promise<Issue[]>;
  onSelectIssue: (issue: Issue) => void;
  loading: boolean;
  issues: Issue[];
  error: string;
}

const IssueFinder: React.FC<IssueFinderProps> = ({ onFindIssues, onSelectIssue, loading, issues, error }) => {
  const [skills, setSkills] = useState('');

  const handleSearch = () => {
    if (skills.trim()) {
      onFindIssues(skills);
    }
  };

  return (
    <Paper sx={{ p: 3, background: 'linear-gradient(145deg, #1A1A2E 0%, #16213E 100%)' }}>
      <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 2 }}>

        Open-Source On-Ramp
      </Typography>

      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
        Find your first open-source issue based on your skills.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          label="Your skills (e.g., Python, React, docs)"
          variant="outlined"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              color: 'white',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
            },
          }}
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading || !skills.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
          sx={{
            borderRadius: '8px',
            background: 'linear-gradient(45deg, #8A2BE2, #00CED1)',
            minWidth: '120px',
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {issues.length > 0 && (
        <List
          sx={{
            mt: 2,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            p: 1,
            maxHeight: '400px', // Set a fixed max-height
            overflowY: 'auto'    // Make it scrollable
          }}
        >
          <Typography variant="h6" sx={{ color: 'white', ml: 2, mb: 1 }}>
            Found Issues
          </Typography>
          {issues.map((issue) => (
            <ListItem
              key={issue.id}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                mb: 1,
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                cursor: 'pointer',
              }}
              onClick={() => onSelectIssue(issue)}
            >
              <ListItemText
                primary={issue.title}
                secondary={
                  <Box>
                    <Typography variant="body2" component="span" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      in {issue.repoName}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {issue.labels.map(label => (
                        <Chip key={label} label={label} size="small" sx={{ mr: 0.5, bgcolor: '#551a8b', color: 'white' }} />
                      ))}
                    </Box>
                  </Box>
                }
                primaryTypographyProps={{ color: 'white', fontWeight: 'bold' }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default IssueFinder;