import type { DebugEvent } from "../hooks/useDebugEvents";

interface RealtimeDebugToastsProps {
  events: DebugEvent[];
}

export default function RealtimeDebugToasts({
  events,
}: RealtimeDebugToastsProps) {
  if (!events.length) {
    return null;
  }

  return (
    <div className="realtime-debug-toasts" aria-live="assertive">
      {events.map((debugEvent) => (
        <div
          key={debugEvent.id}
          className={`realtime-debug-toast realtime-debug-toast--${debugEvent.direction}`}
        >
          <header>
            <strong>
              {debugEvent.direction === "incoming"
                ? "⬇ Incoming"
                : "⬆ Outgoing"}
            </strong>
            <span>{new Date(debugEvent.timestamp).toLocaleTimeString()}</span>
          </header>
          <p className="realtime-debug-event">{debugEvent.event}</p>
          <pre>{JSON.stringify(debugEvent.payload, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
