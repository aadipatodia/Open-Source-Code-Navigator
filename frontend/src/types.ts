// Shared TypeScript interfaces used across the frontend.

/** Authenticated user profile from Firebase. */
export interface User {
  userId: string;
  name?: string;
  email?: string;
  picture?: string;
}

/** One node in the repository file tree (file or directory). */
export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
}

/** A single GitHub issue returned by the issue search endpoint. */
export interface Issue {
  id: number;
  title: string;
  url: string;
  labels: string[];
  repoName: string;
}

/** Every matching issue from one repository, so search results read as projects. */
export interface RepoIssueGroup {
  repoName: string;
  repoUrl: string;
  /** Total matches, which can exceed `issues.length` when a repo has many. */
  issueCount: number;
  issues: Issue[];
}

/** A single message in the chat transcript (user, AI, or system notice). */
export interface ChatMessage {
  id: string;
  text: string;
  /** `system` is a notice from the app itself, never sent to the model. */
  sender: 'user' | 'ai' | 'system';
  timestamp: number;
}

/** One numbered step in a contribution guide plan. */
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
