export type DeckType = 'fibonacci' | 'tshirt' | 'powers-of-two' | 'custom';

export type SessionStatus = 'active' | 'closed';

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
  accountId: string;
  hasVoted: boolean;
  value?: string;
  createdAt?: string;
}

export interface IssueVoteState {
  issueKey: string;
  isRevealed: boolean;
  votes: Record<string, Vote>;
}

export interface SessionSummary {
  id: string;
  name: string;
  projectKey: string;
  createdAt: string;
  status: SessionStatus;
  deckType: DeckType;
  deckValues: string[];
  currentIssueKey: string | null;
  jql?: string;
  projectConfig?: ProjectConfig;
}

export interface SessionWithParticipants {
  session: SessionSummary;
  participants: Participant[];
  currentIssueState?: IssueVoteState | null;
}

export interface ProjectConfig {
  projectKey: string;
  estimateFieldId?: string;
  deckType: DeckType;
  deckValues?: string[];
  defaultJql?: string;
  canEdit?: boolean;
}

export interface EstimateField {
  id: string;
  name: string;
}

export interface RealtimeTokenResponse {
  token: string | null;
  relayUrl: string | null;
  expiresAt: string | null;
}
