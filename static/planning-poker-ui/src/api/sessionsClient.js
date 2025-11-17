import { invoke } from '@forge/bridge';
export const listSessions = async ({ projectKey }) => invoke('listSessionsByProject', { projectKey });
export const createSession = async (payload) => invoke('createSession', payload);
export const joinSession = async (sessionId, issueKey) => invoke('joinSession', { sessionId, issueKey });
export const leaveSession = async (sessionId) => {
    await invoke('leaveSession', { sessionId });
};
export const getSession = async (sessionId, issueKey) => invoke('getSession', { sessionId, issueKey });
export const castVote = async (sessionId, issueKey, value) => invoke('castVote', { sessionId, issueKey, value });
export const clearVotes = async (sessionId, issueKey) => invoke('clearVotes', { sessionId, issueKey });
export const revealIssue = async (sessionId, issueKey) => invoke('revealIssue', { sessionId, issueKey });
export const setCurrentIssue = async (sessionId, issueKey) => invoke('setCurrentIssue', { sessionId, issueKey });
export const getProjectConfig = async (projectKey) => invoke('getProjectConfig', { projectKey });
export const setProjectConfig = async (config) => invoke('setProjectConfig', config);
export const applyEstimate = async (sessionId, issueKey, value) => invoke('applyEstimate', { sessionId, issueKey, value });
export const fetchIssuesForProject = async (params) => {
    const response = await invoke('getIssuesForProject', params);
    return response;
};
