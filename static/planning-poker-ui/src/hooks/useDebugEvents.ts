import { useCallback, useState } from 'react';

export interface DebugEvent {
  id: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
  event: string;
  payload: unknown;
}

const DISPLAY_DURATION_MS = 15000;

export const useDebugEvents = () => {
  const [events, setEvents] = useState<DebugEvent[]>([]);

  const removeEvent = useCallback((id: string) => {
    setEvents((current) => current.filter((event) => event.id !== id));
  }, []);

  const pushEvent = useCallback((event: Omit<DebugEvent, 'id' | 'timestamp'>) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const entry: DebugEvent = {
      ...event,
      id,
      timestamp: new Date().toISOString(),
    };
    setEvents((current) => [entry, ...current]);
    setTimeout(() => removeEvent(id), DISPLAY_DURATION_MS);
  }, [removeEvent]);

  return { events, pushEvent };
};
