import React, { useState, useEffect } from 'react';

import {
  Typography,
  Box,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import { History as HistoryIcon, TrendingUp as StatsIcon } from '@mui/icons-material';
import axios from 'axios';
import { useDescope } from '@descope/react-sdk';

// Assumes these components exist in separate files in your project structure
import CodeInput from './CodeInput';
import RepositoryInput from './RepositoryInput';
import FileExplorer, { FileItem } from './FileExplorer';
import ChatComponent from './ChatComponent';
import IssueFinder from './IssueFinder';
import GuidedContribution from './GuidedContribution';
import CodebaseAnalysis from './CodebaseAnalysis'; // Import the component for viewing file content

// --- Type Definitions ---
// This now matches the expected User type which includes userId
interface User {
  userId: string;
  name?: string;
  username?: string;
}

interface AnalysisHistory {
  id: string;
  codeSnippet: string;
  explanation: string;
  timestamp: Date;
}

interface Issue {
  id: number;
  title: string;
  url: string;
  labels: string[];
  repoName: string;
}

interface UserStats {
  public_repos: number;
  followers: number;
  following: number;
}

export interface ContributionStep {
  step: number;
  title: string;
  details: string;
}

interface DashboardProps {
  user: User;
}

// --- Dashboard Component ---
const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { getSessionToken } = useDescope();
  const sessionToken = getSessionToken();

  // State for various parts of the dashboard
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistory[]>([]);
  const [repoStructure, setRepoStructure] = useState<FileItem[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ text: string; sender: 'user' | 'ai' }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // State for Issue Finder
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState('');

  // State for Guided Contribution
  const [contributionPlan, setContributionPlan] = useState<ContributionStep[] | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState('');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedIssueForGuide, setSelectedIssueForGuide] = useState<Issue | null>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (sessionToken) {
        try {
          const response = await axios.get('http://localhost:8000/api/user/stats', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
          });
          setUserStats(response.data);
        } catch (error) {
          console.error('Failed to fetch user stats', error);
        }
      }
    };
    fetchUserStats();
  }, [sessionToken]);

  const handleFindIssues = async (skills: string): Promise<Issue[]> => {
    setIssuesLoading(true);
    setIssuesError('');
    try {
      const response = await axios.post('http://localhost:8000/api/issues/find', { skills }, {
        headers: { 'Authorization': `Bearer ${sessionToken || ''}` }
      });
      setIssues(response.data);
      return response.data;
    } catch (error: any) {
      setIssuesError(error.response?.data?.detail || 'Failed to find issues.');
      return [];
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleSelectIssue = async (issue: Issue) => {
    setSelectedIssueForGuide(issue);
    setIsGuideModalOpen(true);
    setGuideLoading(true);
    setGuideError('');
    setContributionPlan(null);

    try {
      const fullRepoUrl = `https://github.com/${issue.repoName}`;
      const response = await axios.post('http://localhost:8000/api/contribute/guide', {
        repoUrl: fullRepoUrl,
        issueUrl: issue.url,
        issueTitle: issue.title,
      }, {
        headers: { 'Authorization': `Bearer ${sessionToken || ''}` }
      });
      setContributionPlan(response.data.plan);
    } catch (error: any) {
      setGuideError(error.response?.data?.detail || 'Failed to generate contribution guide.');
    } finally {
      setGuideLoading(false);
    }
  };
  
  const handleAnalyzeCode = async (code: string, context: string): Promise<string> => {
    try {
      const response = await axios.post(
        'http://localhost:8000/api/explain/code',
        new URLSearchParams({ code, context }),
        { headers: { 'Authorization': `Bearer ${sessionToken || ''}` } }
      );
      // Logic to update analysis history can be added here
      return response.data.explanation;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to analyze code');
    }
  };
  
  const handleRepositorySelect = async (url: string) => {
    setRepoLoading(true);
    setRepoError('');
    setRepoStructure(null);
    setSelectedFile(null);
    setFileContent('');

    try {
      const response = await axios.post('http://localhost:8000/api/analyze/repo', 
        { repoUrl: url },
        { headers: { 'Authorization': `Bearer ${sessionToken || ''}` } }
      );
      setRepoStructure(response.data.structure);
      setRepoUrl(url); // Save URL for fetching file content
    } catch (error: any) {
      setRepoError(error.response?.data?.detail || 'Failed to analyze repository.');
    } finally {
      setRepoLoading(false);
    }
  };

  const handleFileSelect = async (file: FileItem) => {
    if (file.type === 'directory') return;
    if (!repoUrl) {
      console.error("Repository URL is not set.");
      return;
    }

    setSelectedFile(file);
    setFileLoading(true);
    setFileContent('');

    try {
      const response = await axios.get('http://localhost:8000/api/repo/file_content', {
        params: {
          repo_url: repoUrl,
          file_path: file.path,
        },
        headers: { 'Authorization': `Bearer ${sessionToken || ''}` }
      });
      setFileContent(response.data.content);
    } catch (error) {
      console.error("Failed to fetch file content", error);
      setFileContent('// Error: Could not load file content.');
    } finally {
      setFileLoading(false);
    }
  };

  const handleAskQuestion = async (question: string) => {
    setChatLoading(true);
    // Add the user's message to the chat
    setChatMessages(prevMessages => [...prevMessages, { text: question, sender: 'user' }]);

    try {
      const response = await axios.post('http://localhost:8000/api/chat', { message: question }, {
        headers: { 'Authorization': `Bearer ${sessionToken || ''}` }
      });
      // Add the AI's response to the chat
      setChatMessages(prevMessages => [...prevMessages, { text: response.data.response, sender: 'ai' }]);
    } catch (error) {
      console.error('Failed to get AI response', error);
      setChatMessages(prevMessages => [...prevMessages, { text: "Sorry, I couldn't get a response. Please try again.", sender: 'ai' }]);
    } finally {
      setChatLoading(false);
    }
  };


  return (
    <Box>
      <GuidedContribution
        open={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        plan={contributionPlan}
        loading={guideLoading}
        error={guideError}
        issueTitle={selectedIssueForGuide?.title || ''}
      />

      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h3" component="h1" gutterBottom={false}>
          Welcome, {user.name || user.username || 'Coder'}!
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 5 }}>
        {/* Main Content Area */}
        <Box sx={{ flex: { xs: 'none', lg: '8' }, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <IssueFinder
            onFindIssues={handleFindIssues}
            onSelectIssue={handleSelectIssue}
            loading={issuesLoading}
            issues={issues}
            error={issuesError}
          />

          <RepositoryInput 
            onRepositorySelect={handleRepositorySelect} 
            loading={repoLoading}
            error={repoError} 
          />

          {repoStructure && (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, height: '70vh' }}>
              <Box sx={{ flex: '10', minWidth: 0 }}>
                <Paper sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
                  <Typography variant="h5">Code Map</Typography>
                  <FileExplorer structure={repoStructure} onFileSelect={handleFileSelect} selectedFile={selectedFile} />
                </Paper>
              </Box>
              <Box sx={{ flex: '10', minWidth: 0, height: '100%' }}>
                 <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {fileLoading ? (
                      <Box sx={{ m: 'auto' }}>
                        <CircularProgress />
                      </Box>
                    ) : selectedFile ? (
                      <CodebaseAnalysis
                        content={fileContent}
                        language={selectedFile.name.split('.').pop() || 'plaintext'}
                        user={user}
                      />
                    ) : (
                      <Box sx={{ m: 'auto', textAlign: 'center', color: 'text.secondary' }}>
                        <Typography>Select a file to view its content</Typography>
                      </Box>
                    )}
                 </Paper>
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            <Box sx={{ flex: { xs: 'none', lg: '8' }, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <CodeInput userToken={sessionToken || ''} />
            </Box>
          </Box>
        </Box>

        {/* Sidebar Area */}
        <Box sx={{ flex: { xs: 'none', lg: '4' }, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper sx={{ p: 3, background: 'linear-gradient(145deg, #1A1A2E 0%, #16213E 100%)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <StatsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ color: 'white' }}>Your GitHub Stats</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`${userStats?.public_repos ?? '...'} Public Repos`} variant="outlined" sx={{ color: '#00CED1', borderColor: '#00CED1' }} />
              <Chip label={`${userStats?.followers ?? '...'} Followers`} variant="outlined" sx={{ color: '#8A2BE2', borderColor: '#8A2BE2' }} />
            </Box>
          </Paper>

          <Paper sx={{ p: 3, background: 'linear-gradient(145deg, #1A1A2E 0%, #16213E 100%)' }}>
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ color: 'white' }}>Recent Analyses</Typography>
             </Box>
             {/* Analysis history would be mapped here */}
          </Paper>

          {/* The ChatComponent is now here in the sidebar */}
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(145deg, #1A1A2E 0%, #16213E 100%)' }}>
            <Typography variant="h6" sx={{ color: 'white' }}>Intelligent Q&A</Typography>
            <ChatComponent onSendMessage={handleAskQuestion} isLoading={chatLoading} messages={chatMessages} />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;