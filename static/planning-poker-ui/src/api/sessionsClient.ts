import { invoke } from '@forge/bridge';
import type {
  DeckType,
  Issue,
  IssueVoteState,
  SessionSummary,
  SessionWithParticipants,
} from '../types/poker';

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

export const listSessions = async ({ projectKey }: ListSessionsRequest): Promise<SessionSummary[]> =>
  invoke<SessionSummary[]>('listSessionsByProject', { projectKey });

export const createSession = async (payload: CreateSessionRequest): Promise<SessionWithParticipants> =>
  invoke<SessionWithParticipants>('createSession', payload);

export const joinSession = async (sessionId: string, issueKey?: string): Promise<SessionWithParticipants> =>
  invoke<SessionWithParticipants>('joinSession', { sessionId, issueKey });

export const leaveSession = async (sessionId: string): Promise<void> => {
  await invoke('leaveSession', { sessionId });
};

export const getSession = async (sessionId: string, issueKey?: string): Promise<SessionWithParticipants> =>
  invoke<SessionWithParticipants>('getSession', { sessionId, issueKey });

export const castVote = async (sessionId: string, issueKey: string, value: string): Promise<IssueVoteState> =>
  invoke<IssueVoteState>('castVote', { sessionId, issueKey, value });

export const clearVotes = async (sessionId: string, issueKey: string): Promise<IssueVoteState> =>
  invoke<IssueVoteState>('clearVotes', { sessionId, issueKey });

export const revealIssue = async (sessionId: string, issueKey: string): Promise<IssueVoteState> =>
  invoke<IssueVoteState>('revealIssue', { sessionId, issueKey });

export const setCurrentIssue = async (sessionId: string, issueKey: string): Promise<SessionWithParticipants> =>
  invoke<SessionWithParticipants>('setCurrentIssue', { sessionId, issueKey });

export const fetchIssuesForProject = async (params: GetIssuesRequest): Promise<Issue[]> => {
  const response = await invoke<Issue[]>('getIssuesForProject', params);
  return response;
};
