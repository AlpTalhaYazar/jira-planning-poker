import type { RelayEventName } from "@alptalhayazar/planning-poker-relay-events";
type RealtimeStatus = "idle" | "connecting" | "connected" | "error" | "disabled";
interface UseRealtimeSessionProps {
    sessionId: string;
    onSessionEvent: (message: {
        sessionId: string;
        event: RelayEventName | "connect" | "disconnect" | "session:event" | "participant.left";
        payload: unknown;
    }) => void;
    onSocketEvent?: (eventName: string, payload: unknown) => void;
    onToken?: (tokenResponse: {
        token: string;
        relayUrl: string;
        expiresAt: string | null;
    }) => void;
}
export declare function useRealtimeSession({ sessionId, onSessionEvent, onSocketEvent, onToken, }: UseRealtimeSessionProps): {
    status: RealtimeStatus;
};
export {};
