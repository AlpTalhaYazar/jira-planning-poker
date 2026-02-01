/**
 * API Client for Jira Planning Poker Forge Backend
 * Wraps all resolver invocations with type safety
 */
export interface CreateSessionInput {
    projectKey: string;
    name: string;
    deckType: string;
    deckValues: string[];
    jql?: string;
}
export declare function createSession(input: CreateSessionInput): Promise<unknown>;
export declare function listSessionsByProject(projectKey: string): Promise<unknown>;
export declare function getSession(sessionId: string, issueKey?: string): Promise<unknown>;
export declare function joinSession(sessionId: string, issueKey?: string): Promise<unknown>;
export declare function leaveSession(sessionId: string, accountId?: string): Promise<unknown>;
export declare function startSession(sessionId: string): Promise<unknown>;
export declare function toggleReady(sessionId: string, isReady: boolean): Promise<unknown>;
export declare function pauseSession(sessionId: string): Promise<unknown>;
export declare function resumeSession(sessionId: string): Promise<unknown>;
export declare function completeSession(sessionId: string): Promise<unknown>;
export interface SessionSettings {
    autoReveal?: boolean;
    allowChangeVote?: boolean;
    timerEnabled?: boolean;
    timerSeconds?: number;
}
export declare function updateSessionSettings(sessionId: string, settings: SessionSettings): Promise<unknown>;
export declare function castVote(sessionId: string, issueKey: string, value: string): Promise<unknown>;
export declare function updateVote(sessionId: string, issueKey: string, value: string, options?: {
    confidence?: 1 | 2 | 3 | 4 | 5;
    comment?: string;
}): Promise<unknown>;
export declare function retractVote(sessionId: string, issueKey: string): Promise<unknown>;
export declare function clearVotes(sessionId: string, issueKey: string): Promise<unknown>;
export declare function revealIssue(sessionId: string, issueKey: string): Promise<unknown>;
export declare function setCurrentIssue(sessionId: string, issueKey: string): Promise<unknown>;
export declare function skipIssue(sessionId: string, issueKey: string, reason?: string): Promise<unknown>;
export declare function updateSessionBacklog(sessionId: string, issueKeys: string[], jql?: string): Promise<unknown>;
export declare function applyEstimate(sessionId: string, issueKey: string, value: string): Promise<unknown>;
export declare function getIssuesForProject(projectKey: string, options?: {
    jql?: string;
    maxResults?: number;
}): Promise<unknown>;
export declare function getIssue(issueKey: string): Promise<unknown>;
export declare function getProjectConfig(projectKey: string): Promise<unknown>;
export declare function setProjectConfig(config: {
    projectKey: string;
    estimateFieldId?: string;
    deckType: string;
    deckValues?: string[];
    defaultJql?: string;
}): Promise<unknown>;
export declare function getRealtimeToken(sessionId: string): Promise<unknown>;
export declare function getUserActiveSession(): Promise<unknown>;
