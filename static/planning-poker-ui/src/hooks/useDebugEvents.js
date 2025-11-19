import { useCallback, useState } from 'react';
const DISPLAY_DURATION_MS = 15000;
export const useDebugEvents = () => {
    const [events, setEvents] = useState([]);
    const removeEvent = useCallback((id) => {
        setEvents((current) => current.filter((event) => event.id !== id));
    }, []);
    const pushEvent = useCallback((event) => {
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        const entry = {
            ...event,
            id,
            timestamp: new Date().toISOString(),
        };
        setEvents((current) => [entry, ...current]);
        setTimeout(() => removeEvent(id), DISPLAY_DURATION_MS);
    }, [removeEvent]);
    return { events, pushEvent };
};
