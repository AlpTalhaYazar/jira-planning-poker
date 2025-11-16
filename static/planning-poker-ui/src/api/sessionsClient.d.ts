import type { DeckType, Issue, IssueVoteState, SessionSummary, SessionWithParticipants } from '../types/poker';
export interface GetIssuesRequest {
    projectKey?: string;
    jql?: string;
    maxResults?: number;
}
export interface ListSessionsRequest {
    projectKey: string;
}
export interface CreateSessionRequest {
    projectKey: string;
    name: string;
    deckType: DeckType;
    deckValues: string[];
    jql?: string;
}
export declare const listSessions: ({ projectKey }: ListSessionsRequest) => Promise<SessionSummary[]>;
export declare const createSession: (payload: CreateSessionRequest) => Promise<SessionWithParticipants>;
export declare const joinSession: (sessionId: string, issueKey?: string) => Promise<SessionWithParticipants>;
export declare const leaveSession: (sessionId: string) => Promise<void>;
export declare const getSession: (sessionId: string, issueKey?: string) => Promise<SessionWithParticipants>;
export declare const castVote: (sessionId: string, issueKey: string, value: string) => Promise<IssueVoteState>;
export declare const clearVotes: (sessionId: string, issueKey: string) => Promise<IssueVoteState>;
export declare const revealIssue: (sessionId: string, issueKey: string) => Promise<IssueVoteState>;
export declare const setCurrentIssue: (sessionId: string, issueKey: string) => Promise<SessionWithParticipants>;
export declare const fetchIssuesForProject: (params: GetIssuesRequest) => Promise<Issue[]>;
