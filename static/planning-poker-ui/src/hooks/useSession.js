import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../api/forge';
import { realtimeClient } from '../api/realtime';
const normalizeSessionResponse = (data) => {
    if (!data || typeof data !== 'object' || !data.session) {
        return null;
    }
    const issueState = data.currentIssue ?? data.currentIssueState ?? null;
    const participants = Array.isArray(data.participants)
        ? data.participants.map((p) => ({
            ...p,
            displayName: p.displayName || p.name || 'Unknown teammate',
            name: p.displayName || p.name || 'Unknown teammate',
        }))
        : [];
    return {
        session: data.session,
        participants,
        currentIssue: issueState,
        currentIssueState: issueState,
    };
};
export function useSession(sessionId) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const isConnecting = useRef(false);
    // Fetch session data
    const fetchSession = useCallback(async () => {
        if (!sessionId)
            return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.getSession(sessionId);
            const normalized = normalizeSessionResponse(data);
            if (!normalized) {
                setError('Failed to parse session data');
                return;
            }
            setSession(normalized);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch session');
            console.error('[useSession] Fetch error:', err);
        }
        finally {
            setLoading(false);
        }
    }, [sessionId]);
    // Connect to real-time updates
    const connectRealtime = useCallback(async () => {
        if (!sessionId || isConnecting.current)
            return;
        try {
            isConnecting.current = true;
            console.log('[useSession] Requesting realtime token for session:', sessionId);
            const tokenData = await api.getRealtimeToken(sessionId);
            console.log('[useSession] Token response:', tokenData);
            if (!tokenData.token || !tokenData.relayUrl) {
                console.log('[useSession] Relay not configured, using polling only');
                return;
            }
            console.log('[useSession] Connecting to relay:', tokenData.relayUrl);
            await realtimeClient.connect(sessionId, tokenData.token, tokenData.relayUrl);
            console.log('[useSession] Connected to relay');
            // Event: Session snapshot (full state sync)
            realtimeClient.on('session.snapshot', (payload) => {
                if (payload.snapshot) {
                    const normalized = normalizeSessionResponse(payload.snapshot);
                    if (normalized) {
                        setSession(normalized);
                    }
                }
            });
            // Event: Participant joined
            realtimeClient.on('participant.joined', () => {
                fetchSession(); // Refresh to get new participant
            });
            // Event: Participant left
            realtimeClient.on('participant.left', () => {
                fetchSession();
            });
            // Event: Participant ready status
            realtimeClient.on('participant.ready', (payload) => {
                setSession(prev => {
                    if (!prev)
                        return prev;
                    return {
                        ...prev,
                        participants: prev.participants.map(p => p.accountId === payload.participantId
                            ? { ...p, isReady: payload.isReady }
                            : p),
                    };
                });
            });
            // Event: Session paused
            realtimeClient.on('session.paused', () => {
                setSession(prev => prev ? { ...prev, session: { ...prev.session, status: 'paused' } } : prev);
            });
            // Event: Session started
            realtimeClient.on('session.started', () => {
                setSession(prev => prev ? { ...prev, session: { ...prev.session, status: 'active' } } : prev);
            });
            // Event: Session resumed
            realtimeClient.on('session.resumed', () => {
                setSession(prev => prev ? { ...prev, session: { ...prev.session, status: 'active' } } : prev);
            });
            // Event: Session completed
            realtimeClient.on('session.completed', () => {
                setSession(prev => prev ? { ...prev, session: { ...prev.session, status: 'completed' } } : prev);
            });
            // Event: Session settings updated
            realtimeClient.on('session.settings.updated', (payload) => {
                setSession(prev => {
                    if (!prev)
                        return prev;
                    return {
                        ...prev,
                        session: { ...prev.session, ...payload.settings },
                    };
                });
            });
            // Event: Vote cast
            realtimeClient.on('vote.cast', () => {
                fetchSession(); // Refresh to show new vote
            });
            // Event: Vote updated
            realtimeClient.on('vote.updated', () => {
                fetchSession();
            });
            // Event: Vote retracted
            realtimeClient.on('vote.retracted', () => {
                fetchSession();
            });
            // Event: Votes cleared
            realtimeClient.on('votes.cleared', () => {
                fetchSession();
            });
            // Event: Issue revealed
            realtimeClient.on('issue.revealed', () => {
                setSession(prev => {
                    if (!prev || !prev.currentIssue)
                        return prev;
                    return {
                        ...prev,
                        currentIssue: { ...prev.currentIssue, isRevealed: true },
                    };
                });
                fetchSession(); // Refresh to get actual votes
            });
            // Event: Issue advanced
            realtimeClient.on('issue.advance', () => {
                fetchSession(); // Get new current issue
            });
        }
        catch (err) {
            console.error('[useSession] Realtime connection error:', err);
            // Continue with polling fallback
        }
        finally {
            isConnecting.current = false;
        }
    }, [sessionId, fetchSession]);
    // Initial fetch and realtime setup
    useEffect(() => {
        if (sessionId) {
            fetchSession();
            connectRealtime();
        }
        return () => {
            if (sessionId) {
                realtimeClient.disconnect();
            }
        };
    }, [sessionId, fetchSession, connectRealtime]);
    return {
        session,
        loading,
        error,
        refetch: fetchSession,
    };
}
