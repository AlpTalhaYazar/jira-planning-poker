export type DeckType = 'fibonacci' | 'tshirt' | 'powers-of-two' | 'custom';

export type SessionStatus = 'active' | 'closed';

export interface Session {
  id: string;
  name: string;
  projectKey: string;
  creatorAccountId: string;
  createdAt: string;
  status: SessionStatus;
  deckType: DeckType;
  deckValues: string[];
  issueKeys: string[];
  currentIssueKey: string | null;
  jql?: string;
}

export interface Issue {
  key: string;
  summary: string;
  status: string;
  estimate?: string;
  link?: string;
}

export interface Participant {
  accountId: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string;
  lastSeenAt: string;
  isModerator: boolean;
}

export interface Vote {
  sessionId: string;
  issueKey: string;
  accountId: string;
  value: string;
  createdAt: string;
}

export interface IssueVoteState {
  issueKey: string;
  isRevealed: boolean;
  votes: Record<string, Vote>;
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
}

export interface ApplyEstimateInput {
  sessionId: string;
  issueKey: string;
  value: string;
}
