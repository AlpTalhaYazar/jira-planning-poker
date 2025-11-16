export type DeckType = 'fibonacci' | 'tshirt' | 'powers-of-two' | 'custom';

export type SessionStatus = 'active' | 'closed';

export interface Session {
  id: string;
  projectKey: string;
  creatorAccountId: string;
  createdAt: string;
  status: SessionStatus;
  deckType: DeckType;
  deckValues: string[];
  issueKeys: string[];
  currentIssueKey: string | null;
}

export interface Issue {
  key: string;
  summary: string;
  status: string;
  estimate?: string;
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

export interface ProjectConfig {
  projectKey: string;
  estimateFieldId: string;
  deckType: DeckType;
  deckValues?: string[];
  defaultJql?: string;
}
