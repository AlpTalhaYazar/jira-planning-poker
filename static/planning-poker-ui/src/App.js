import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import SessionPage from './features/session/SessionPage';
import { mockSessions } from './features/session/mockData';
export default function App() {
    const [context, setContext] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(mockSessions[0] ?? null);
    useEffect(() => {
        let cancelled = false;
        const fetchContext = async () => {
            try {
                const ctx = (await view.getContext());
                if (!cancelled) {
                    setContext(ctx);
                }
            }
            catch (err) {
                if (!cancelled) {
                    console.error('Failed to load Forge context', err);
                    setError('Unable to load project information.');
                }
            }
            finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };
        fetchContext();
        return () => {
            cancelled = true;
        };
    }, []);
    const projectName = context?.extension?.project?.name;
    const projectKey = context?.extension?.project?.key;
    const handleSessionSelect = (session) => {
        setSelectedSession(session);
    };
    const handleBackToList = () => {
        setSelectedSession(null);
    };
    return (_jsxs("div", { className: "app-shell", children: [_jsx("header", { className: "app-header", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Jira Planning Poker" }), _jsx("h1", { children: selectedSession ? selectedSession.name : 'Planning Poker Sessions' })] }) }), _jsxs("main", { className: "app-content", children: [isLoading && _jsx("p", { children: "Loading Jira context\u2026" }), !isLoading && error && _jsx("p", { className: "error-text", children: error }), !isLoading && !error && !selectedSession && (_jsxs("div", { className: "session-list", children: [_jsxs("div", { className: "info-card", children: [_jsx("p", { children: "This mocked list will later be replaced by sessions fetched from Forge storage." }), _jsxs("p", { children: [_jsx("strong", { children: "Project:" }), " ", projectName ?? 'Unknown', " (", projectKey ?? 'n/a', ")"] })] }), _jsx("div", { className: "session-card-grid", children: mockSessions.map((session) => (_jsxs("article", { className: "session-card", children: [_jsxs("header", { children: [_jsxs("p", { className: "eyebrow", children: ["Project ", session.projectKey] }), _jsx("h2", { children: session.name })] }), _jsxs("p", { children: [session.issues.length, " issues \u00B7 ", session.participants.length, " participants"] }), _jsx("button", { type: "button", className: "primary", onClick: () => handleSessionSelect(session), children: "Open session" })] }, session.id))) })] })), !isLoading && !error && selectedSession && (_jsx(SessionPage, { session: selectedSession, onBack: handleBackToList }))] })] }));
}
