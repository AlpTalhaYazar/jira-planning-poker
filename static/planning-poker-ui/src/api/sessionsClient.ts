import { invoke } from '@forge/bridge';
import type { Issue, SessionSummary, SessionWithParticipants, DeckType } from '../types/poker';

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

export const joinSession = async (sessionId: string): Promise<SessionWithParticipants> =>
  invoke<SessionWithParticipants>('joinSession', { sessionId });

export const leaveSession = async (sessionId: string): Promise<void> => {
  await invoke('leaveSession', { sessionId });
};

export const getSession = async (sessionId: string): Promise<SessionWithParticipants> =>
  invoke<SessionWithParticipants>('getSession', { sessionId });

export const fetchIssuesForProject = async (params: GetIssuesRequest): Promise<Issue[]> => {
  const response = await invoke<Issue[]>('getIssuesForProject', params);
  return response;
};
