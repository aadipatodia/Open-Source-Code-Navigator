import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { FileItem } from '../components/FileExplorer';
import { apiClient, getApiError } from '../config/api';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export interface Issue {
  id: number;
  title: string;
  url: string;
  labels: string[];
  repoName: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

export interface ContributionStep {
  step: number;
  title: string;
  details: string;
}

export interface AnalysisHistoryItem {
  id: string;
  preview: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------
interface AppDataContextValue {
  // Repository / explorer
  repoUrl: string | null;
  repoStructure: FileItem[] | null;
  repoLoading: boolean;
  repoError: string;
  selectedFile: FileItem | null;
  fileContent: string;
  fileLoading: boolean;
  loadRepository: (url: string) => Promise<void>;
  selectFile: (file: FileItem) => Promise<void>;

  // Issues
  issues: Issue[];
  issuesLoading: boolean;
  issuesError: string;
  findIssues: (skills: string) => Promise<void>;

  // Contribution guide
  contributionPlan: ContributionStep[] | null;
  guideLoading: boolean;
  guideError: string;
  selectedIssueForGuide: Issue | null;
  isGuideOpen: boolean;
  openGuideForIssue: (issue: Issue) => Promise<void>;
  closeGuide: () => void;

  // Chat
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  askQuestion: (message: string) => Promise<void>;
  clearChat: () => void;

  // Recent analyses (kept locally)
  recentAnalyses: AnalysisHistoryItem[];
  addAnalysis: (preview: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Repo state
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [repoStructure, setRepoStructure] = useState<FileItem[] | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);

  // Issues state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState('');

  // Guided contribution state
  const [contributionPlan, setContributionPlan] = useState<ContributionStep[] | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState('');
  const [selectedIssueForGuide, setSelectedIssueForGuide] = useState<Issue | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Local history (not persisted)
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisHistoryItem[]>([]);

  const loadRepository = useCallback(async (url: string) => {
    setRepoLoading(true);
    setRepoError('');
    setRepoStructure(null);
    setSelectedFile(null);
    setFileContent('');
    try {
      const res = await apiClient.post('/api/analyze/repo', { repoUrl: url });
      setRepoStructure(res.data.structure);
      setRepoUrl(url);
    } catch (err: unknown) {
      setRepoError(getApiError(err, 'Failed to analyze repository.'));
    } finally {
      setRepoLoading(false);
    }
  }, []);

  const selectFile = useCallback(
    async (file: FileItem) => {
      if (file.type === 'directory' || !repoUrl) return;
      setSelectedFile(file);
      setFileLoading(true);
      setFileContent('');
      try {
        const res = await apiClient.get('/api/repo/file_content', {
          params: { repo_url: repoUrl, file_path: file.path },
        });
        setFileContent(res.data.content);
      } catch (err) {
        console.error('Failed to fetch file content', err);
        setFileContent('// Error: Could not load file content.');
      } finally {
        setFileLoading(false);
      }
    },
    [repoUrl]
  );

  const findIssues = useCallback(async (skills: string) => {
    setIssuesLoading(true);
    setIssuesError('');
    try {
      const res = await apiClient.post('/api/issues/find', { skills });
      setIssues(res.data);
    } catch (err: unknown) {
      setIssuesError(getApiError(err, 'Failed to find issues.'));
      setIssues([]);
    } finally {
      setIssuesLoading(false);
    }
  }, []);

  const openGuideForIssue = useCallback(async (issue: Issue) => {
    setSelectedIssueForGuide(issue);
    setIsGuideOpen(true);
    setGuideLoading(true);
    setGuideError('');
    setContributionPlan(null);
    try {
      const repoFullUrl = `https://github.com/${issue.repoName}`;
      const res = await apiClient.post('/api/contribute/guide', {
        repoUrl: repoFullUrl,
        issueUrl: issue.url,
        issueTitle: issue.title,
        issueBody: '',
      });
      setContributionPlan(res.data.plan);
    } catch (err: unknown) {
      setGuideError(getApiError(err, 'Failed to generate contribution guide.'));
    } finally {
      setGuideLoading(false);
    }
  }, []);

  const closeGuide = useCallback(() => {
    setIsGuideOpen(false);
  }, []);

  const askQuestion = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const userMessage: ChatMessage = {
      id: `${Date.now()}-u`,
      text: trimmed,
      sender: 'user',
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatLoading(true);
    try {
      const res = await apiClient.post('/api/chat', { message: trimmed });
      const aiMessage: ChatMessage = {
        id: `${Date.now()}-a`,
        text: res.data.response || '...',
        sender: 'ai',
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const aiMessage: ChatMessage = {
        id: `${Date.now()}-a-err`,
        text: "Sorry — I couldn't get a response. Please try again in a moment.",
        sender: 'ai',
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, aiMessage]);
    } finally {
      setChatLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => setChatMessages([]), []);

  const addAnalysis = useCallback((preview: string) => {
    setRecentAnalyses((prev) =>
      [
        {
          id: `${Date.now()}`,
          preview: preview.slice(0, 90),
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 5)
    );
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      repoUrl,
      repoStructure,
      repoLoading,
      repoError,
      selectedFile,
      fileContent,
      fileLoading,
      loadRepository,
      selectFile,
      issues,
      issuesLoading,
      issuesError,
      findIssues,
      contributionPlan,
      guideLoading,
      guideError,
      selectedIssueForGuide,
      isGuideOpen,
      openGuideForIssue,
      closeGuide,
      chatMessages,
      chatLoading,
      askQuestion,
      clearChat,
      recentAnalyses,
      addAnalysis,
    }),
    [
      repoUrl,
      repoStructure,
      repoLoading,
      repoError,
      selectedFile,
      fileContent,
      fileLoading,
      loadRepository,
      selectFile,
      issues,
      issuesLoading,
      issuesError,
      findIssues,
      contributionPlan,
      guideLoading,
      guideError,
      selectedIssueForGuide,
      isGuideOpen,
      openGuideForIssue,
      closeGuide,
      chatMessages,
      chatLoading,
      askQuestion,
      clearChat,
      recentAnalyses,
      addAnalysis,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = (): AppDataContextValue => {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used within an <AppDataProvider />');
  }
  return ctx;
};

export { API_BASE } from '../config/api';
