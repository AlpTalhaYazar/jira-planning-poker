import { invoke } from '@forge/bridge';

/**
 * API Client for Jira Planning Poker Forge Backend
 * Wraps all resolver invocations with type safety
 */

// ============================================================================
// Session Management
// ============================================================================

export interface CreateSessionInput {
  projectKey: string;
  name: string;
  deckType: string;
  deckValues: string[];
  jql?: string;
}

export async function createSession(input: CreateSessionInput) {
  return invoke('createSession', input);
}

export async function listSessionsByProject(projectKey: string) {
  return invoke('listSessionsByProject', { projectKey });
}

export async function getSession(sessionId: string, issueKey?: string) {
  return invoke('getSession', { sessionId, issueKey });
}

export async function joinSession(sessionId: string, issueKey?: string) {
  return invoke('joinSession', { sessionId, issueKey });
}

export async function leaveSession(sessionId: string, accountId?: string) {
  return invoke('leaveSession', { sessionId, accountId });
}

export async function startSession(sessionId: string) {
  return invoke('startSession', { sessionId });
}

export async function toggleReady(sessionId: string, isReady: boolean) {
  return invoke('toggleReady', { sessionId, isReady });
}

// ============================================================================
// Session Lifecycle (New in Phase 3)
// ============================================================================

export async function pauseSession(sessionId: string) {
  return invoke('pauseSession', { sessionId });
}

export async function resumeSession(sessionId: string) {
  return invoke('resumeSession', { sessionId });
}

export async function completeSession(sessionId: string) {
  return invoke('completeSession', { sessionId });
}

export interface SessionSettings {
  autoReveal?: boolean;
  allowChangeVote?: boolean;
  timerEnabled?: boolean;
  timerSeconds?: number;
}

export async function updateSessionSettings(
  sessionId: string,
  settings: SessionSettings
) {
  return invoke('updateSessionSettings', { sessionId, settings });
}

// ============================================================================
// Voting
// ============================================================================

export async function castVote(
  sessionId: string,
  issueKey: string,
  value: string
) {
  return invoke('castVote', { sessionId, issueKey, value });
}

export async function updateVote(
  sessionId: string,
  issueKey: string,
  value: string,
  options?: { confidence?: 1 | 2 | 3 | 4 | 5; comment?: string }
) {
  return invoke('updateVote', {
    sessionId,
    issueKey,
    value,
    ...options,
  });
}

export async function retractVote(sessionId: string, issueKey: string) {
  return invoke('retractVote', { sessionId, issueKey });
}

export async function clearVotes(sessionId: string, issueKey: string) {
  return invoke('clearVotes', { sessionId, issueKey });
}

export async function revealIssue(sessionId: string, issueKey: string) {
  return invoke('revealIssue', { sessionId, issueKey });
}

// ============================================================================
// Issue Management
// ============================================================================

export async function setCurrentIssue(sessionId: string, issueKey: string) {
  return invoke('setCurrentIssue', { sessionId, issueKey });
}

export async function skipIssue(
  sessionId: string,
  issueKey: string,
  reason?: string
) {
  return invoke('skipIssue', { sessionId, issueKey, reason });
}

export async function updateSessionBacklog(
  sessionId: string,
  issueKeys: string[],
  jql?: string
) {
  return invoke('updateSessionBacklog', { sessionId, issueKeys, jql });
}

export async function applyEstimate(
  sessionId: string,
  issueKey: string,
  value: string
) {
  return invoke('applyEstimate', { sessionId, issueKey, value });
}

// ============================================================================
// Jira Integration
// ============================================================================

export async function getIssuesForProject(
  projectKey: string,
  options?: {
    jql?: string;
    maxResults?: number;
  }
) {
  return invoke('getIssuesForProject', { projectKey, ...options });
}

export async function getIssue(issueKey: string) {
  return invoke('getIssue', { issueKey });
}

// ============================================================================
// Configuration
// ============================================================================

export async function getProjectConfig(projectKey: string) {
  return invoke('getProjectConfig', { projectKey });
}

export async function setProjectConfig(config: {
  projectKey: string;
  estimateFieldId?: string;
  deckType: string;
  deckValues?: string[];
  defaultJql?: string;
}) {
  return invoke('setProjectConfig', config);
}

// ============================================================================
// Real-time
// ============================================================================

export async function getRealtimeToken(sessionId: string) {
  return invoke('getRealtimeToken', { sessionId });
}

export async function getUserActiveSession() {
  return invoke('getUserActiveSession', {});
}
