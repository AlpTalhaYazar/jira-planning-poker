import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function RealtimeDebugToasts({ events, }) {
    if (!events.length) {
        return null;
    }
    return (_jsx("div", { className: "realtime-debug-toasts", "aria-live": "assertive", children: events.map((debugEvent) => (_jsxs("div", { className: `realtime-debug-toast realtime-debug-toast--${debugEvent.direction}`, children: [_jsxs("header", { children: [_jsx("strong", { children: debugEvent.direction === "incoming"
                                ? "⬇ Incoming"
                                : "⬆ Outgoing" }), _jsx("span", { children: new Date(debugEvent.timestamp).toLocaleTimeString() })] }), _jsx("p", { className: "realtime-debug-event", children: debugEvent.event }), _jsx("pre", { children: JSON.stringify(debugEvent.payload, null, 2) })] }, debugEvent.id))) }));
}
