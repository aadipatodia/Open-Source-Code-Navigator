import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

import { apiClient, getApiError } from '../config/api';
import {
  AnalysisHistoryItem,
  ChatMessage,
  ContributionStep,
  FileItem,
  Issue,
  RepoIssueGroup,
} from '../types';

type GuideMode = 'issue' | 'repo';

/**
 * How many of the user's messages one context window holds. The model sees this
 * many turns; once the window is full it resets, and the user is warned first.
 */
export const CHAT_HISTORY_LIMIT = 7;

/** One turn as the API wants it — the visible transcript also carries notices. */
type ChatTurn = { role: 'user' | 'ai'; text: string };

interface AppDataContextValue {
  // Repository explorer
  repoUrl: string | null;
  repoStructure: FileItem[] | null;
  repoLoading: boolean;
  repoError: string;
  selectedFile: FileItem | null;
  fileContent: string;
  fileLoading: boolean;
  loadRepository: (url: string) => Promise<void>;
  selectFile: (file: FileItem) => Promise<void>;

  // Issue search
  issueGroups: RepoIssueGroup[];
  issuesLoading: boolean;
  issuesError: string;
  findIssues: (skills: string) => Promise<void>;

  // Contribution guide
  contributionPlan: ContributionStep[] | null;
  guideLoading: boolean;
  guideError: string;
  guideMode: GuideMode | null;
  selectedIssueForGuide: Issue | null;
  guideRepoLabel: string;
  isGuideOpen: boolean;
  openGuideForIssue: (issue: Issue) => Promise<void>;
  openGuideForRepo: (url: string) => Promise<void>;
  closeGuide: () => void;

  // Chat
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  /** How many of the user's messages the model currently remembers. */
  chatTurns: number;
  askQuestion: (message: string) => Promise<void>;
  clearChat: () => void;

  // Recent analyses (in-memory only)
  recentAnalyses: AnalysisHistoryItem[];
  addAnalysis: (preview: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

/** Strip the github.com prefix so we can show `owner/repo`. */
const repoLabelFor = (url: string) => url.replace(/^https?:\/\/(www\.)?github\.com\//, '');

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [repoStructure, setRepoStructure] = useState<FileItem[] | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);

  const [issueGroups, setIssueGroups] = useState<RepoIssueGroup[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState('');

  const [contributionPlan, setContributionPlan] = useState<ContributionStep[] | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState('');
  const [guideMode, setGuideMode] = useState<GuideMode | null>(null);
  const [selectedIssueForGuide, setSelectedIssueForGuide] = useState<Issue | null>(null);
  const [guideRepoLabel, setGuideRepoLabel] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatTurns, setChatTurns] = useState(0);
  // The turns the model is given. The visible transcript outlives this and only
  // resets when the user starts a new conversation.
  const chatContext = useRef<ChatTurn[]>([]);

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
    } catch (err) {
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
      } catch {
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
      setIssueGroups(res.data);
    } catch (err) {
      setIssuesError(getApiError(err, 'Failed to find issues.'));
      setIssueGroups([]);
    } finally {
      setIssuesLoading(false);
    }
  }, []);

  /** Open the guide drawer in a loading state, then run `request` to fill it. */
  const runGuide = useCallback(async (request: () => Promise<ContributionStep[]>) => {
    setIsGuideOpen(true);
    setGuideLoading(true);
    setGuideError('');
    setContributionPlan(null);
    try {
      setContributionPlan(await request());
    } catch (err) {
      setGuideError(getApiError(err, 'Failed to generate contribution guide.'));
    } finally {
      setGuideLoading(false);
    }
  }, []);

  const openGuideForIssue = useCallback(
    async (issue: Issue) => {
      setGuideMode('issue');
      setSelectedIssueForGuide(issue);
      setGuideRepoLabel('');
      await runGuide(async () => {
        const res = await apiClient.post('/api/contribute/guide', {
          repoUrl: `https://github.com/${issue.repoName}`,
          issueUrl: issue.url,
          issueTitle: issue.title,
          issueBody: '',
        });
        return res.data.plan;
      });
    },
    [runGuide]
  );

  const openGuideForRepo = useCallback(
    async (url: string) => {
      setGuideMode('repo');
      setSelectedIssueForGuide(null);
      setGuideRepoLabel(repoLabelFor(url));
      await runGuide(async () => {
        const res = await apiClient.post('/api/contribute/repo-guide', { repoUrl: url });
        return res.data.plan;
      });
    },
    [runGuide]
  );

  const closeGuide = useCallback(() => setIsGuideOpen(false), []);

  const askQuestion = useCallback(async (message: string) => {
    const text = message.trim();
    if (!text) return;

    const append = (sender: ChatMessage['sender'], body: string) =>
      setChatMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-${prev.length}`, text: body, sender, timestamp: Date.now() },
      ]);

    const history = chatContext.current;
    append('user', text);
    setChatLoading(true);
    try {
      const res = await apiClient.post('/api/chat', { message: text, history });
      const reply = res.data.response || '...';
      append('ai', reply);

      const turns = [...history, { role: 'user' as const, text }, { role: 'ai' as const, text: reply }];
      const used = turns.length / 2;

      if (used >= CHAT_HISTORY_LIMIT) {
        chatContext.current = [];
        setChatTurns(0);
        append('system', 'History cleared. The next message starts a fresh conversation.');
      } else {
        chatContext.current = turns;
        setChatTurns(used);
        if (used === CHAT_HISTORY_LIMIT - 1) {
          append(
            'system',
            `This chat remembers your last ${CHAT_HISTORY_LIMIT} messages. History will be cleared after your next message.`
          );
        }
      }
    } catch {
      // A failed turn is not part of the conversation, so the window is untouched.
      append('ai', "Sorry — I couldn't get a response. Please try again in a moment.");
    } finally {
      setChatLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    setChatTurns(0);
    chatContext.current = [];
  }, []);

  const addAnalysis = useCallback((preview: string) => {
    setRecentAnalyses((prev) =>
      [{ id: `${Date.now()}`, preview: preview.slice(0, 90), timestamp: Date.now() }, ...prev].slice(0, 5)
    );
  }, []);

  const value: AppDataContextValue = {
    repoUrl,
    repoStructure,
    repoLoading,
    repoError,
    selectedFile,
    fileContent,
    fileLoading,
    loadRepository,
    selectFile,
    issueGroups,
    issuesLoading,
    issuesError,
    findIssues,
    contributionPlan,
    guideLoading,
    guideError,
    guideMode,
    selectedIssueForGuide,
    guideRepoLabel,
    isGuideOpen,
    openGuideForIssue,
    openGuideForRepo,
    closeGuide,
    chatMessages,
    chatLoading,
    chatTurns,
    askQuestion,
    clearChat,
    recentAnalyses,
    addAnalysis,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = (): AppDataContextValue => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within an <AppDataProvider />');
  return ctx;
};
