import { io, Socket } from 'socket.io-client';
import type { RelayEventEnvelope } from '@alptalhayazar/planning-poker-relay-events';

export class RealtimeClient {
  private socket: Socket | null = null;
  private sessionId: string | null = null;

  async connect(sessionId: string, token: string, relayUrl: string) {
    if (this.socket?.connected && this.sessionId === sessionId) {
      console.log('[Realtime] Already connected to session', sessionId);
      return;
    }

    // Disconnect existing if different session
    if (this.socket) {
      this.socket.disconnect();
    }

    this.sessionId = sessionId;
    this.socket = io(relayUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[Realtime] Connected to relay');
    });

    this.socket.on('disconnect', () => {
      console.log('[Realtime] Disconnected from relay');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Realtime] Connection error:', error);
    });

    return new Promise<void>((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not initialized'));
      
      this.socket.once('connect', () => resolve());
      this.socket.once('connect_error', reject);
      
      // Timeout after 10s
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.sessionId = null;
    }
  }

  on<T extends RelayEventEnvelope['event']>(
    event: T,
    handler: (payload: Extract<RelayEventEnvelope, { event: T }>['payload']) => void
  ) {
    if (!this.socket) {
      console.warn('[Realtime] Cannot add listener, not connected');
      return;
    }

    // Type assertion needed for socket.io compatibility
    this.socket.on(event, handler as any);
  }

  off<T extends RelayEventEnvelope['event']>(
    event: T,
    handler?: (payload: Extract<RelayEventEnvelope, { event: T }>['payload']) => void
  ) {
    if (!this.socket) return;
    
    if (handler) {
      this.socket.off(event, handler as any);
    } else {
      this.socket.off(event);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getCurrentSessionId(): string | null {
    return this.sessionId;
  }
}

// Singleton instance
export const realtimeClient = new RealtimeClient();
