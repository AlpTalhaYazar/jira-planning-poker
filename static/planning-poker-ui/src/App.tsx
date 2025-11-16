import { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import SessionPage from './features/session/SessionPage';
import { mockSessions } from './features/session/mockData';
import type { SessionDefinition } from './types/poker';

interface ProjectPageContext {
  extension?: {
    project?: {
      id?: string;
      key?: string;
      name?: string;
    };
  };
}

export default function App() {
  const [context, setContext] = useState<ProjectPageContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionDefinition | null>(mockSessions[0] ?? null);

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
          setError('Unable to load project information.');
        }
      } finally {
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

  const handleSessionSelect = (session: SessionDefinition) => {
    setSelectedSession(session);
  };

  const handleBackToList = () => {
    setSelectedSession(null);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Jira Planning Poker</p>
          <h1>{selectedSession ? selectedSession.name : 'Planning Poker Sessions'}</h1>
        </div>
      </header>
      <main className="app-content">
        {isLoading && <p>Loading Jira context…</p>}
        {!isLoading && error && <p className="error-text">{error}</p>}
        {!isLoading && !error && !selectedSession && (
          <div className="session-list">
            <div className="info-card">
              <p>This mocked list will later be replaced by sessions fetched from Forge storage.</p>
              <p>
                <strong>Project:</strong> {projectName ?? 'Unknown'} ({projectKey ?? 'n/a'})
              </p>
            </div>
            <div className="session-card-grid">
              {mockSessions.map((session) => (
                <article className="session-card" key={session.id}>
                  <header>
                    <p className="eyebrow">Project {session.projectKey}</p>
                    <h2>{session.name}</h2>
                  </header>
                  <p>{session.issues.length} issues · {session.participants.length} participants</p>
                  <button type="button" className="primary" onClick={() => handleSessionSelect(session)}>
                    Open session
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}
        {!isLoading && !error && selectedSession && (
          <SessionPage session={selectedSession} onBack={handleBackToList} />
        )}
      </main>
    </div>
  );
}
