import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { getRealtimeToken } from "../api/sessionsClient";
import { TOKEN_REFRESH_BUFFER_MS, CONNECTION_RETRY_DELAY_MS, } from "../constants/realtime";
export function useRealtimeSession({ sessionId, onSessionEvent, onSocketEvent, onToken, }) {
    const [status, setStatus] = useState("idle");
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
            setStatus("connecting");
            try {
                const tokenResponse = await getRealtimeToken(sessionId);
                console.log("[Realtime] token response", tokenResponse);
                onToken?.(tokenResponse);
                if (cancelled) {
                    return;
                }
                if (!tokenResponse?.token || !tokenResponse.relayUrl) {
                    console.log("[Realtime] relay disabled or token missing, falling back to polling");
                    setStatus("disabled");
                    cleanupRealtime();
                    return;
                }
                cleanupRealtime();
                const socket = io(tokenResponse.relayUrl, {
                    transports: ["websocket"],
                    auth: { token: tokenResponse.token },
                    reconnection: true,
                    reconnectionAttempts: Infinity,
                });
                socketRef.current = socket;
                socket.on("connect", () => {
                    console.log("[Realtime] connected to relay");
                    setStatus("connected");
                    // Trigger a refresh on connection to ensure we have latest state
                    onSessionEvent({ sessionId, event: "connect", payload: undefined });
                });
                socket.on("disconnect", () => {
                    console.log("[Realtime] disconnected from relay");
                    setStatus("connecting");
                    onSessionEvent({ sessionId, event: "disconnect", payload: undefined });
                });
                socket.on("connect_error", (err) => {
                    console.error("Realtime connection error", err);
                    setStatus("error");
                });
                // Handle session events and other broadcast events from the relay
                socket.onAny((eventName, payload) => {
                    if (eventName === "connect" ||
                        eventName === "disconnect" ||
                        eventName === "connect_error") {
                        return;
                    }
                    if (eventName === "session:event") {
                        const message = payload ?? { sessionId, event: "session:event" };
                        console.log("[Realtime] session event received", message);
                        onSessionEvent({
                            sessionId: message.sessionId ?? sessionId,
                            event: "session:event",
                            payload: message.payload,
                        });
                    }
                    else {
                        console.log("[Realtime] event received", eventName, payload);
                        // We assume any other event is a RelayEventName
                        onSessionEvent({
                            sessionId,
                            event: eventName,
                            payload: payload,
                        });
                    }
                    onSocketEvent?.(eventName, payload);
                });
                if (tokenResponse.expiresAt) {
                    const refreshDelay = new Date(tokenResponse.expiresAt).getTime() -
                        Date.now() -
                        TOKEN_REFRESH_BUFFER_MS;
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
                    console.error("Failed to initialise realtime connection", err);
                    setStatus("error");
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
