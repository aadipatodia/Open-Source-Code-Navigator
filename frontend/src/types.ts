export interface User {
  userId: string;
  name?: string;
  email?: string;
  picture?: string;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
}

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

/** A locally-kept record of a code snippet the user analyzed. */
export interface AnalysisHistoryItem {
  id: string;
  preview: string;
  timestamp: number;
}
