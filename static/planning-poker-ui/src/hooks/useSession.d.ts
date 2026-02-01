export interface SessionData {
    session: {
        id: string;
        name: string;
        projectKey: string;
        status: 'waiting' | 'active' | 'paused' | 'completed' | 'archived';
        deckType: string;
        deckValues: string[];
        issueKeys: string[];
        currentIssueKey: string | null;
        autoReveal: boolean;
        allowChangeVote: boolean;
        timerEnabled: boolean;
        timerSeconds?: number;
        jql?: string;
    };
    participants: Array<{
        accountId: string;
        displayName: string;
        name?: string;
        avatarUrl: string;
        isModerator: boolean;
        isObserver: boolean;
        isReady: boolean;
        connectionStatus: 'online' | 'away' | 'offline';
    }>;
    currentIssue: {
        issueKey: string;
        isRevealed: boolean;
        votes: Record<string, {
            accountId: string;
            hasVoted: boolean;
            value?: string;
        }>;
    } | null;
    currentIssueState?: SessionData['currentIssue'];
}
export declare function useSession(sessionId: string | null): {
    session: SessionData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};
