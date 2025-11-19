import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getRealtimeToken } from '../api/sessionsClient';
import { TOKEN_REFRESH_BUFFER_MS, CONNECTION_RETRY_DELAY_MS } from '../constants/realtime';
export function useRealtimeSession({ sessionId, onSessionEvent, onSocketEvent, onToken }) {
    const [status, setStatus] = useState('idle');
    const socketRef = useRef(null);
    const tokenRefreshTimeoutRef = useRef(null);
    const cleanupRealtime = useCallback(() => {
        if (tokenRefreshTimeoutRef.current) {
            clearTimeout(tokenRefreshTimeoutRef.current);
            tokenRefreshTimeoutRef.current = null;
        }
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);
    useEffect(() => {
        let cancelled = false;
        const connect = async () => {
            if (cancelled) {
                return;
            }
            setStatus('connecting');
            try {
                const tokenResponse = await getRealtimeToken(sessionId);
                console.log('[Realtime] token response', tokenResponse);
                onToken?.(tokenResponse);
                if (cancelled) {
                    return;
                }
                if (!tokenResponse?.token || !tokenResponse.relayUrl) {
                    console.log('[Realtime] relay disabled or token missing, falling back to polling');
                    setStatus('disabled');
                    cleanupRealtime();
                    return;
                }
                cleanupRealtime();
                const socket = io(tokenResponse.relayUrl, {
                    transports: ['websocket'],
                    auth: { token: tokenResponse.token },
                    reconnection: true,
                    reconnectionAttempts: Infinity,
                });
                socketRef.current = socket;
                socket.on('connect', () => {
                    console.log('[Realtime] connected to relay');
                    setStatus('connected');
                    // Trigger a refresh on connection to ensure we have latest state
                    onSessionEvent({ sessionId, event: 'connect' });
                });
                socket.on('disconnect', () => {
                    console.log('[Realtime] disconnected from relay');
                    setStatus('connecting');
                });
                socket.on('connect_error', (err) => {
                    console.error('Realtime connection error', err);
                    setStatus('error');
                });
                // Handle specific session events
                socket.on('session:event', (message) => {
                    console.log('[Realtime] session event received', message);
                    onSessionEvent(message || { sessionId, event: 'session:event' });
                    onSocketEvent?.('session:event', message);
                });
                // Handle any other events (like session.joined, vote.cast) that might be emitted directly
                socket.onAny((eventName, payload) => {
                    if (eventName === 'session:event' || eventName === 'connect' || eventName === 'disconnect') {
                        return;
                    }
                    console.log('[Realtime] event received', eventName, payload);
                    // Always trigger refresh for the current session regardless of payload structure
                    // because the socket is subscribed to this session's room
                    onSessionEvent({ sessionId, event: eventName, payload });
                    onSocketEvent?.(eventName, payload);
                });
                if (tokenResponse.expiresAt) {
                    const refreshDelay = new Date(tokenResponse.expiresAt).getTime() - Date.now() - TOKEN_REFRESH_BUFFER_MS;
                    if (refreshDelay > 0) {
                        tokenRefreshTimeoutRef.current = setTimeout(() => {
                            if (!cancelled) {
                                void connect();
                            }
                        }, refreshDelay);
                    }
                }
            }
            catch (err) {
                if (!cancelled) {
                    console.error('Failed to initialise realtime connection', err);
                    setStatus('error');
                    tokenRefreshTimeoutRef.current = setTimeout(() => {
                        if (!cancelled) {
                            void connect();
                        }
                    }, CONNECTION_RETRY_DELAY_MS);
                }
            }
        };
        void connect();
        return () => {
            cancelled = true;
            cleanupRealtime();
        };
    }, [sessionId, cleanupRealtime, onSessionEvent]);
    return { status };
}
