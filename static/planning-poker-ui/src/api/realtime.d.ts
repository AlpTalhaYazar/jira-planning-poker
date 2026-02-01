import type { RelayEventEnvelope } from '@alptalhayazar/planning-poker-relay-events';
export declare class RealtimeClient {
    private socket;
    private sessionId;
    connect(sessionId: string, token: string, relayUrl: string): Promise<void>;
    disconnect(): void;
    on<T extends RelayEventEnvelope['event']>(event: T, handler: (payload: Extract<RelayEventEnvelope, {
        event: T;
    }>['payload']) => void): void;
    off<T extends RelayEventEnvelope['event']>(event: T, handler?: (payload: Extract<RelayEventEnvelope, {
        event: T;
    }>['payload']) => void): void;
    isConnected(): boolean;
    getCurrentSessionId(): string | null;
}
export declare const realtimeClient: RealtimeClient;
