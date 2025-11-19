import { invoke } from '@forge/bridge';
import type {
  DeckType,
  Issue,
  IssueVoteState,
  ProjectConfig,
  RealtimeTokenResponse,
  SessionSummary,
  SessionWithParticipants,
} from '../types/poker';

export interface GetIssuesRequest {
  projectKey: string;
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

export const getProjectConfig = async (projectKey: string): Promise<ProjectConfig> =>
  invoke<ProjectConfig>('getProjectConfig', { projectKey });

export const setProjectConfig = async (config: ProjectConfig): Promise<ProjectConfig> =>
  invoke<ProjectConfig>('setProjectConfig', config);

export const applyEstimate = async (
  sessionId: string,
  issueKey: string,
  value: string
): Promise<{ sessionId: string; issueKey: string; value: string }> =>
  invoke('applyEstimate', { sessionId, issueKey, value });

export const fetchIssuesForProject = async (params: GetIssuesRequest): Promise<Issue[]> => {
  const response = await invoke<Issue[]>('getIssuesForProject', params);
  return response;
};

export const getRealtimeToken = async (sessionId: string): Promise<RealtimeTokenResponse> =>
  invoke<RealtimeTokenResponse>('getRealtimeToken', { sessionId });

export const updateSessionBacklog = async (sessionId: string, issueKeys: string[], jql?: string) =>
  invoke('updateSessionBacklog', { sessionId, issueKeys, jql });
