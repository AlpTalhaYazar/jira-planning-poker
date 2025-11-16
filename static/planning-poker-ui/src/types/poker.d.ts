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
}
export interface SessionWithParticipants {
    session: SessionSummary;
    participants: Participant[];
    currentIssueState?: IssueVoteState | null;
}
