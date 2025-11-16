import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import SessionPage from './features/session/SessionPage';
import { createSession as createSessionApi, joinSession as joinSessionApi, leaveSession as leaveSessionApi, listSessions, } from './api/sessionsClient';
const DEFAULT_FIBONACCI_DECK = ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'];
export default function App() {
    const [context, setContext] = useState(null);
    const [contextError, setContextError] = useState(null);
    const [isLoadingContext, setIsLoadingContext] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [sessionsError, setSessionsError] = useState(null);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const [createSessionName, setCreateSessionName] = useState('');
    const [createSessionJql, setCreateSessionJql] = useState('');
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [sessionActionError, setSessionActionError] = useState(null);
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
                    setContextError('Unable to load project information.');
                }
            }
            finally {
                if (!cancelled) {
                    setIsLoadingContext(false);
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
    const viewerAccountId = context?.accountId;
    const refreshSessions = useCallback(async (key) => {
        setIsLoadingSessions(true);
        setSessionsError(null);
        try {
            const data = await listSessions({ projectKey: key });
            setSessions(data);
        }
        catch (err) {
            console.error('Failed to load sessions', err);
            setSessionsError('Unable to load sessions right now.');
        }
        finally {
            setIsLoadingSessions(false);
        }
    }, []);
    useEffect(() => {
        if (projectKey) {
            refreshSessions(projectKey);
        }
    }, [projectKey, refreshSessions]);
    const handleCreateSession = async () => {
        if (!projectKey) {
            setSessionActionError('Project key missing from context.');
            return;
        }
        setIsCreatingSession(true);
        setSessionActionError(null);
        try {
            const name = createSessionName.trim() || `Planning Poker – ${new Date().toLocaleDateString()}`;
            const newSession = await createSessionApi({
                projectKey,
                name,
                deckType: 'fibonacci',
                deckValues: DEFAULT_FIBONACCI_DECK,
                jql: createSessionJql.trim() || undefined,
            });
            setSessions((prev) => [newSession.session, ...prev.filter((session) => session.id !== newSession.session.id)]);
            setActiveSession(newSession);
            setCreateSessionName('');
            setCreateSessionJql('');
        }
        catch (err) {
            console.error('Failed to create session', err);
            setSessionActionError('Could not create session. Please try again.');
        }
        finally {
            setIsCreatingSession(false);
        }
    };
    const handleOpenSession = async (sessionId) => {
        setSessionActionError(null);
        try {
            const joined = await joinSessionApi(sessionId);
            setActiveSession(joined);
        }
        catch (err) {
            console.error('Failed to join session', err);
            setSessionActionError('Unable to join this session.');
        }
    };
    const handleSessionDataUpdate = useCallback((data) => {
        setActiveSession(data);
    }, []);
    const handleBackToList = async () => {
        if (activeSession) {
            try {
                await leaveSessionApi(activeSession.session.id);
            }
            catch (err) {
                console.warn('Failed to leave session gracefully', err);
            }
        }
        setActiveSession(null);
        if (projectKey) {
            refreshSessions(projectKey);
        }
    };
    const pageTitle = activeSession ? activeSession.session.name : 'Planning Poker Sessions';
    const renderSessionList = () => (_jsxs("div", { className: "session-list", children: [_jsxs("div", { className: "info-card", children: [_jsx("p", { children: "Sessions are shared across your Jira site. Create one for each refinement or sprint planning meeting." }), _jsxs("p", { children: [_jsx("strong", { children: "Project:" }), " ", projectName ?? 'Unknown', " (", projectKey ?? 'n/a', ")"] })] }), _jsxs("div", { className: "session-create-card", children: [_jsxs("div", { className: "session-create-fields", children: [_jsx("label", { htmlFor: "session-name", children: "Session name" }), _jsx("input", { id: "session-name", type: "text", value: createSessionName, onChange: (event) => setCreateSessionName(event.target.value), placeholder: "e.g. Sprint 42 Estimation" })] }), _jsxs("div", { className: "session-create-fields", children: [_jsx("label", { htmlFor: "session-jql", children: "Default JQL (optional)" }), _jsx("input", { id: "session-jql", type: "text", value: createSessionJql, onChange: (event) => setCreateSessionJql(event.target.value), placeholder: `Defaults to project = "${projectKey ?? 'KEY'}"` })] }), _jsx("button", { type: "button", className: "primary", onClick: handleCreateSession, disabled: isCreatingSession, children: isCreatingSession ? 'Creating…' : 'Create session' })] }), sessionActionError && _jsx("p", { className: "error-text", children: sessionActionError }), sessionsError && _jsx("p", { className: "error-text", children: sessionsError }), isLoadingSessions ? (_jsx("p", { children: "Loading sessions\u2026" })) : sessions.length === 0 ? (_jsx("p", { children: "No sessions yet. Create one to get started." })) : (_jsx("div", { className: "session-card-grid", children: sessions.map((session) => (_jsxs("article", { className: "session-card", children: [_jsxs("header", { children: [_jsxs("p", { className: "eyebrow", children: ["Project ", session.projectKey] }), _jsx("h2", { children: session.name })] }), _jsxs("p", { children: ["Deck: ", session.deckType] }), _jsxs("p", { children: ["Created ", new Date(session.createdAt).toLocaleString()] }), _jsx("button", { type: "button", className: "primary", onClick: () => handleOpenSession(session.id), children: "Open session" })] }, session.id))) }))] }));
    return (_jsxs("div", { className: "app-shell", children: [_jsx("header", { className: "app-header", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Jira Planning Poker" }), _jsx("h1", { children: pageTitle })] }) }), _jsxs("main", { className: "app-content", children: [isLoadingContext && _jsx("p", { children: "Loading Jira context\u2026" }), !isLoadingContext && contextError && _jsx("p", { className: "error-text", children: contextError }), !isLoadingContext && !contextError && !activeSession && renderSessionList(), !isLoadingContext && !contextError && activeSession && (_jsx(SessionPage, { data: activeSession, onBack: handleBackToList, onSessionData: handleSessionDataUpdate, viewerAccountId: viewerAccountId }))] })] }));
}
