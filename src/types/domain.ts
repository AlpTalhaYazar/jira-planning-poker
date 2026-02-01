export type DeckType = "fibonacci" | "tshirt" | "powers-of-two" | "custom";

export type SessionStatus = "waiting" | "active" | "paused" | "completed" | "archived";

export interface Session {
  id: string;
  name: string;
  projectKey: string;
  creatorAccountId: string;
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
  deckType: DeckType;
  deckValues: string[];
  issueKeys: string[];
  completedIssueKeys: string[];
  currentIssueKey: string | null;
  jql?: string;
  participantsReady?: string[]; // Deprecated: moved to Participant.isReady
  
  // Session settings
  autoReveal: boolean;
  allowChangeVote: boolean;
  timerEnabled: boolean;
  timerSeconds?: number;
  
  // Metadata
  expiresAt?: string;
}

export interface Issue {
  key: string;
  summary: string;
  status: string;
  estimate?: string;
  link?: string;
  type?: string;
  assignee?: string;
  description?: string;
}

export interface Participant {
  accountId: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string;
  lastSeenAt: string;
  isModerator: boolean;
  isObserver: boolean;
  isReady: boolean;
  connectionStatus: "online" | "away" | "offline";
}

export interface Vote {
  sessionId: string;
  issueKey: string;
  accountId: string;
  value: string;
  createdAt: string;
  updatedAt?: string;
  confidence?: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export interface IssueVoteState {
  issueKey: string;
  sessionId: string;
  isRevealed: boolean;
  revealedAt?: string;
  revealedBy?: string;
  consensus?: string;
  consensusReachedAt?: string;
  consensusType?: "unanimous" | "majority" | "moderator-override";
  skipped: boolean;
  votes: Record<string, Vote>;
  
  // Timer state
  timerStartedAt?: string;
  timerEndsAt?: string;
}

export interface PublicVote {
  accountId: string;
  hasVoted: boolean;
  value?: string;
  createdAt?: string;
}

export interface IssueVoteSnapshot {
  issueKey: string;
  isRevealed: boolean;
  votes: Record<string, PublicVote>;
}

export interface SessionSnapshot {
  session: Session;
  participants: Participant[];
  currentIssueState?: IssueVoteSnapshot | null;
}

export interface ProjectConfig {
  projectKey: string;
  estimateFieldId?: string;
  deckType: DeckType;
  deckValues?: string[];
  defaultJql?: string;
  canEdit?: boolean;
  
  // Default session settings
  defaultSessionSettings?: {
    autoReveal: boolean;
    allowChangeVote: boolean;
    timerEnabled: boolean;
    timerSeconds: number;
  };
  
  // Analytics enablement
  enableAnalytics?: boolean;
}

export interface ApplyEstimateInput {
  sessionId: string;
  issueKey: string;
  value: string;
}
