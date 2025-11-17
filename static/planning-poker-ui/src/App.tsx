import { useCallback, useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import SessionPage from './features/session/SessionPage';
import {
  createSession as createSessionApi,
  joinSession as joinSessionApi,
  leaveSession as leaveSessionApi,
  listSessions,
  getProjectConfig,
  setProjectConfig,
} from './api/sessionsClient';
import type { ProjectConfig, SessionSummary, SessionWithParticipants } from './types/poker';

interface ProjectPageContext {
  accountId?: string;
  extension?: {
    project?: {
      id?: string;
      key?: string;
      name?: string;
    };
  };
}

const DEFAULT_FIBONACCI_DECK = ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'];

export default function App() {
  const [context, setContext] = useState<ProjectPageContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const [activeSession, setActiveSession] = useState<SessionWithParticipants | null>(null);
  const [createSessionName, setCreateSessionName] = useState('');
  const [createSessionJql, setCreateSessionJql] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);
  const [projectConfig, setProjectConfigState] = useState<ProjectConfig | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchContext = async () => {
      try {
        const ctx = (await view.getContext()) as ProjectPageContext;
        if (!cancelled) {
          setContext(ctx);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load Forge context', err);
          setContextError('Unable to load project information.');
        }
      } finally {
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
  const effectiveDeckValues = projectConfig?.deckValues ?? DEFAULT_FIBONACCI_DECK;
  const effectiveDeckType = projectConfig?.deckType ?? 'fibonacci';
  const effectiveDefaultJql =
    createSessionJql || projectConfig?.defaultJql || (projectKey ? `project = "${projectKey}" AND statusCategory != Done` : '');

  const refreshSessions = useCallback(
    async (key: string) => {
      setIsLoadingSessions(true);
      setSessionsError(null);
      try {
        const data = await listSessions({ projectKey: key });
        setSessions(data);
      } catch (err) {
        console.error('Failed to load sessions', err);
        setSessionsError('Unable to load sessions right now.');
      } finally {
        setIsLoadingSessions(false);
      }
    },
    []
  );

  useEffect(() => {
    if (projectKey) {
      refreshSessions(projectKey);
      if (!isConfigLoaded) {
        (async () => {
          try {
            const cfg = await getProjectConfig(projectKey);
            setProjectConfigState(cfg);
          } catch (err) {
            console.error('Failed to load project config', err);
            setConfigError('Unable to load project configuration.');
          } finally {
            setIsConfigLoaded(true);
          }
        })();
      }
    }
  }, [projectKey, refreshSessions, isConfigLoaded]);

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
        deckType: effectiveDeckType,
        deckValues: effectiveDeckValues,
        jql: createSessionJql.trim() || projectConfig?.defaultJql || undefined,
      });
      setSessions((prev) => [newSession.session, ...prev.filter((session) => session.id !== newSession.session.id)]);
      setActiveSession(newSession);
      setCreateSessionName('');
      setCreateSessionJql('');
    } catch (err) {
      console.error('Failed to create session', err);
      setSessionActionError('Could not create session. Please try again.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleOpenSession = async (sessionId: string) => {
    setSessionActionError(null);
    try {
      const joined = await joinSessionApi(sessionId);
      setActiveSession(joined);
    } catch (err) {
      console.error('Failed to join session', err);
      setSessionActionError('Unable to join this session.');
    }
  };

  const handleSessionDataUpdate = useCallback((data: SessionWithParticipants) => {
    setActiveSession(data);
  }, []);

  const handleBackToList = async () => {
    if (activeSession) {
      try {
        await leaveSessionApi(activeSession.session.id);
      } catch (err) {
        console.warn('Failed to leave session gracefully', err);
      }
    }
    setActiveSession(null);
    if (projectKey) {
      refreshSessions(projectKey);
    }
  };

  const pageTitle = activeSession ? activeSession.session.name : 'Planning Poker Sessions';

  const renderSessionList = () => (
    <div className="session-list">
      <div className="info-card">
        <p>Sessions are shared across your Jira site. Create one for each refinement or sprint planning meeting.</p>
        <p>
          <strong>Project:</strong> {projectName ?? 'Unknown'} ({projectKey ?? 'n/a'})
        </p>
        {!projectConfig?.estimateFieldId && (
          <p className="error-text">Estimate field not configured. Apply-to-Jira will be disabled until you set one.</p>
        )}
      </div>
      <div className="session-create-card">
        <div className="session-create-fields">
          <label htmlFor="session-name">Session name</label>
          <input
            id="session-name"
            type="text"
            value={createSessionName}
            onChange={(event) => setCreateSessionName(event.target.value)}
            placeholder="e.g. Sprint 42 Estimation"
          />
        </div>
        <div className="session-create-fields">
          <label htmlFor="session-jql">Default JQL (optional)</label>
          <input
            id="session-jql"
            type="text"
            value={createSessionJql}
            onChange={(event) => setCreateSessionJql(event.target.value)}
            placeholder={`Defaults to project = "${projectKey ?? 'KEY'}"`}
          />
        </div>
        <button type="button" className="primary" onClick={handleCreateSession} disabled={isCreatingSession}>
          {isCreatingSession ? 'Creating…' : 'Create session'}
        </button>
      </div>
      {sessionActionError && <p className="error-text">{sessionActionError}</p>}
      {sessionsError && <p className="error-text">{sessionsError}</p>}
      {isLoadingSessions ? (
        <p>Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <p>No sessions yet. Create one to get started.</p>
      ) : (
        <div className="session-card-grid">
          {sessions.map((session) => (
            <article className="session-card" key={session.id}>
              <header>
                <p className="eyebrow">Project {session.projectKey}</p>
                <h2>{session.name}</h2>
              </header>
              <p>Deck: {session.deckType}</p>
              <p>Created {new Date(session.createdAt).toLocaleString()}</p>
              <button type="button" className="primary" onClick={() => handleOpenSession(session.id)}>
                Open session
              </button>
            </article>
          ))}
        </div>
      )}
      <div className="session-create-card">
        <h3>Project configuration</h3>
        {configError && <p className="error-text">{configError}</p>}
        <div className="session-create-fields">
          <label htmlFor="estimate-field-id">Estimate Field ID</label>
          <input
            id="estimate-field-id"
            type="text"
            value={projectConfig?.estimateFieldId ?? ''}
            onChange={(event) =>
              setProjectConfigState((prev) => ({
                ...(prev ?? { projectKey: projectKey ?? '' }),
                estimateFieldId: event.target.value || undefined,
                deckType: prev?.deckType ?? 'fibonacci',
              }))
            }
            placeholder="customfield_10016"
          />
        </div>
        <div className="session-create-fields">
          <label htmlFor="default-jql">Default JQL</label>
          <input
            id="default-jql"
            type="text"
            value={projectConfig?.defaultJql ?? ''}
            onChange={(event) =>
              setProjectConfigState((prev) => ({
                ...(prev ?? { projectKey: projectKey ?? '' }),
                defaultJql: event.target.value || undefined,
                deckType: prev?.deckType ?? 'fibonacci',
              }))
            }
            placeholder={`project = "${projectKey ?? 'KEY'}" AND statusCategory != Done`}
          />
        </div>
        <button
          type="button"
          className="primary"
          onClick={async () => {
            if (!projectKey || !projectConfig) {
              return;
            }
            setIsSavingConfig(true);
            setConfigError(null);
            try {
              const saved = await setProjectConfig({
                ...projectConfig,
                projectKey,
                deckType: projectConfig.deckType ?? 'fibonacci',
              });
              setProjectConfigState(saved);
            } catch (err) {
              console.error('Failed to save project config', err);
              setConfigError('Unable to save project configuration.');
            } finally {
              setIsSavingConfig(false);
            }
          }}
          disabled={isSavingConfig || !projectKey || !projectConfig}
        >
          {isSavingConfig ? 'Saving…' : 'Save config'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Jira Planning Poker</p>
          <h1>{pageTitle}</h1>
        </div>
      </header>
      <main className="app-content">
        {isLoadingContext && <p>Loading Jira context…</p>}
        {!isLoadingContext && contextError && <p className="error-text">{contextError}</p>}
        {!isLoadingContext && !contextError && !activeSession && renderSessionList()}
        {!isLoadingContext && !contextError && activeSession && (
          <SessionPage
            data={activeSession}
            onBack={handleBackToList}
            onSessionData={handleSessionDataUpdate}
            viewerAccountId={viewerAccountId}
            projectConfig={projectConfig}
          />
        )}
      </main>
    </div>
  );
}
