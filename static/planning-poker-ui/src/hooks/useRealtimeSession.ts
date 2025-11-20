import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getRealtimeToken } from "../api/sessionsClient";
import {
  TOKEN_REFRESH_BUFFER_MS,
  CONNECTION_RETRY_DELAY_MS,
} from "../constants/realtime";

type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "disabled";

interface UseRealtimeSessionProps {
  sessionId: string;
  onSessionEvent: (message: {
    sessionId?: string;
    event?: string;
    payload?: unknown;
  }) => void;
  onSocketEvent?: (eventName: string, payload: unknown) => void;
  onToken?: (tokenResponse: {
    token: string;
    relayUrl: string;
    expiresAt: string | null;
  }) => void;
}

export function useRealtimeSession({
  sessionId,
  onSessionEvent,
  onSocketEvent,
  onToken,
}: UseRealtimeSessionProps) {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const socketRef = useRef<Socket | null>(null);
  const tokenRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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
        onToken?.(
          tokenResponse as {
            token: string;
            relayUrl: string;
            expiresAt: string | null;
          }
        );
        if (cancelled) {
          return;
        }
        if (!tokenResponse?.token || !tokenResponse.relayUrl) {
          console.log(
            "[Realtime] relay disabled or token missing, falling back to polling"
          );
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
          onSessionEvent({ sessionId, event: "connect" });
        });

        socket.on("disconnect", () => {
          console.log("[Realtime] disconnected from relay");
          setStatus("connecting");
        });

        socket.on("connect_error", (err) => {
          console.error("Realtime connection error", err);
          setStatus("error");
        });

        // Handle session events and other broadcast events from the relay
        socket.onAny((eventName, payload) => {
          if (
            eventName === "connect" ||
            eventName === "disconnect" ||
            eventName === "connect_error"
          ) {
            return;
          }
          if (eventName === "session:event") {
            const message = (payload as {
              sessionId?: string;
              event?: string;
              payload?: unknown;
            }) ?? { sessionId, event: "session:event" };
            console.log("[Realtime] session event received", message);
            onSessionEvent(message || { sessionId, event: "session:event" });
          } else {
            console.log("[Realtime] event received", eventName, payload);
            onSessionEvent({ sessionId, event: eventName, payload });
          }
          onSocketEvent?.(eventName, payload);
        });

        if (tokenResponse.expiresAt) {
          const refreshDelay =
            new Date(tokenResponse.expiresAt).getTime() -
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
      } catch (err) {
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
