import { invoke } from '@forge/bridge';
export async function createSession(input) {
    return invoke('createSession', input);
}
export async function listSessionsByProject(projectKey) {
    return invoke('listSessionsByProject', { projectKey });
}
export async function getSession(sessionId, issueKey) {
    return invoke('getSession', { sessionId, issueKey });
}
export async function joinSession(sessionId, issueKey) {
    return invoke('joinSession', { sessionId, issueKey });
}
export async function leaveSession(sessionId, accountId) {
    return invoke('leaveSession', { sessionId, accountId });
}
export async function startSession(sessionId) {
    return invoke('startSession', { sessionId });
}
export async function toggleReady(sessionId, isReady) {
    return invoke('toggleReady', { sessionId, isReady });
}
// ============================================================================
// Session Lifecycle (New in Phase 3)
// ============================================================================
export async function pauseSession(sessionId) {
    return invoke('pauseSession', { sessionId });
}
export async function resumeSession(sessionId) {
    return invoke('resumeSession', { sessionId });
}
export async function completeSession(sessionId) {
    return invoke('completeSession', { sessionId });
}
export async function updateSessionSettings(sessionId, settings) {
    return invoke('updateSessionSettings', { sessionId, settings });
}
// ============================================================================
// Voting
// ============================================================================
export async function castVote(sessionId, issueKey, value) {
    return invoke('castVote', { sessionId, issueKey, value });
}
export async function updateVote(sessionId, issueKey, value, options) {
    return invoke('updateVote', {
        sessionId,
        issueKey,
        value,
        ...options,
    });
}
export async function retractVote(sessionId, issueKey) {
    return invoke('retractVote', { sessionId, issueKey });
}
export async function clearVotes(sessionId, issueKey) {
    return invoke('clearVotes', { sessionId, issueKey });
}
export async function revealIssue(sessionId, issueKey) {
    return invoke('revealIssue', { sessionId, issueKey });
}
// ============================================================================
// Issue Management
// ============================================================================
export async function setCurrentIssue(sessionId, issueKey) {
    return invoke('setCurrentIssue', { sessionId, issueKey });
}
export async function skipIssue(sessionId, issueKey, reason) {
    return invoke('skipIssue', { sessionId, issueKey, reason });
}
export async function updateSessionBacklog(sessionId, issueKeys, jql) {
    return invoke('updateSessionBacklog', { sessionId, issueKeys, jql });
}
export async function applyEstimate(sessionId, issueKey, value) {
    return invoke('applyEstimate', { sessionId, issueKey, value });
}
// ============================================================================
// Jira Integration
// ============================================================================
export async function getIssuesForProject(projectKey, options) {
    return invoke('getIssuesForProject', { projectKey, ...options });
}
export async function getIssue(issueKey) {
    return invoke('getIssue', { issueKey });
}
// ============================================================================
// Configuration
// ============================================================================
export async function getProjectConfig(projectKey) {
    return invoke('getProjectConfig', { projectKey });
}
export async function setProjectConfig(config) {
    return invoke('setProjectConfig', config);
}
// ============================================================================
// Real-time
// ============================================================================
export async function getRealtimeToken(sessionId) {
    return invoke('getRealtimeToken', { sessionId });
}
export async function getUserActiveSession() {
    return invoke('getUserActiveSession', {});
}
