import { useEffect, useMemo, useState } from 'react';
import Deck from '../voting/Deck';
import IssuePanel from '../../components/IssuePanel';
import ParticipantsList from '../../components/ParticipantsList';
import type { SessionDefinition, Issue } from '../../types/poker';
import { fetchIssuesForProject } from '../../api/sessionsClient';

interface SessionPageProps {
  session: SessionDefinition;
  onBack: () => void;
}

type VotesByIssue = Record<string, Record<string, string | null>>;

const buildInitialVotes = (session: SessionDefinition, issues: Issue[]): VotesByIssue =>
  issues.reduce<VotesByIssue>((acc, issue) => {
    const provided = session.initialVotes?.[issue.key];
    acc[issue.key] = session.participants.reduce<Record<string, string | null>>((voteAcc, participant) => {
      voteAcc[participant.id] = provided?.[participant.id] ?? null;
      return voteAcc;
    }, {});
    return acc;
  }, {});

const numericValue = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const summarizeVotes = (votes: Record<string, string | null>) => {
  const numbers = Object.values(votes)
    .map(numericValue)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (!numbers.length) {
    return {
      average: '—',
      median: '—',
      min: '—',
      max: '—',
    };
  }

  const average = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  const median =
    numbers.length % 2 === 1
      ? numbers[(numbers.length - 1) / 2]
      : (numbers[numbers.length / 2 - 1] + numbers[numbers.length / 2]) / 2;

  return {
    average: average.toFixed(1),
    median: median.toString(),
    min: numbers[0].toString(),
    max: numbers[numbers.length - 1].toString(),
  };
};

export default function SessionPage({ session, onBack }: SessionPageProps) {
  const [issues, setIssues] = useState<Issue[]>(session.issues);
  const [isFetchingIssues, setIsFetchingIssues] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const defaultJql = session.projectKey ? `project = "${session.projectKey}" ORDER BY updated DESC` : '';
  const [jqlDraft, setJqlDraft] = useState(defaultJql);
  const [appliedJql, setAppliedJql] = useState(defaultJql);
  const [currentIssueIndex, setCurrentIssueIndex] = useState(0);
  const [votesByIssue, setVotesByIssue] = useState<VotesByIssue>(() => buildInitialVotes(session, session.issues));
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadIssues = async (jqlToUse?: string) => {
      if (!session.projectKey) {
        setIssuesError('Missing project key');
        return;
      }
      setIsFetchingIssues(true);
      setIssuesError(null);
      try {
        const fetched = await fetchIssuesForProject({
          projectKey: session.projectKey,
          jql: jqlToUse || (appliedJql || undefined),
          maxResults: 20,
        });
        if (!cancelled) {
          if (fetched.length) {
            setIssues(fetched);
          } else {
            setIssues(session.issues);
            setIssuesError('No Jira issues matched the filter; showing mock defaults.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch Jira issues', err);
          setIssues(session.issues);
          setIssuesError('Unable to load issues from Jira (showing mock data).');
        }
      } finally {
        if (!cancelled) {
          setIsFetchingIssues(false);
        }
      }
    };

    loadIssues(appliedJql);

    return () => {
      cancelled = true;
    };
  }, [session.id, session.projectKey, appliedJql]);

  useEffect(() => {
    setVotesByIssue(buildInitialVotes(session, issues));
    setCurrentIssueIndex(0);
    setIsRevealed(false);
  }, [issues, session]);

  useEffect(() => {
    const nextDefault = session.projectKey ? `project = "${session.projectKey}" ORDER BY updated DESC` : '';
    setJqlDraft(nextDefault);
    setAppliedJql(nextDefault);
  }, [session.projectKey, session.id]);

  const currentIssue = issues[currentIssueIndex];
  const currentVotes = currentIssue ? votesByIssue[currentIssue.key] : {};
  const localParticipantId = session.participants[0]?.id;
  const selectedValue = localParticipantId ? currentVotes[localParticipantId] : null;
  const everyoneHasVoted = currentIssue ? Object.values(currentVotes ?? {}).every(Boolean) : false;

  const stats = useMemo(() => summarizeVotes(currentVotes), [currentVotes, isRevealed]);

  const updateVotes = (issueKey: string, mutate: (votes: Record<string, string | null>) => Record<string, string | null>) => {
    setVotesByIssue((prev) => ({
      ...prev,
      [issueKey]: mutate(prev[issueKey]),
    }));
  };

  const handleCardSelect = (value: string) => {
    if (!localParticipantId || isRevealed) return;
    updateVotes(currentIssue.key, (existing) => ({
      ...existing,
      [localParticipantId]: existing[localParticipantId] === value ? null : value,
    }));
  };

  const handleReveal = () => setIsRevealed(true);

  const handleRevote = () => {
    if (!currentIssue) return;
    updateVotes(currentIssue.key, (existing = {}) =>
      Object.keys(existing).reduce<Record<string, string | null>>((acc, participantId) => {
        acc[participantId] = null;
        return acc;
      }, {})
    );
    setIsRevealed(false);
  };

  const moveToIssue = (nextIndex: number) => {
    setCurrentIssueIndex(nextIndex);
    setIsRevealed(false);
  };

  const handlePrevIssue = () => moveToIssue(Math.max(0, currentIssueIndex - 1));
  const handleNextIssue = () => moveToIssue(Math.min(issues.length - 1, currentIssueIndex + 1));
  const handleAdvance = () => {
    if (currentIssueIndex < issues.length - 1) {
      moveToIssue(currentIssueIndex + 1);
    }
  };

  const handleApplyJql = () => {
    setAppliedJql(jqlDraft);
  };

  return (
    <div className="session-layout">
      <div className="session-top-bar">
        <button className="text-button" type="button" onClick={onBack}>
          ← Sessions
        </button>
        <span className="session-name">{session.name}</span>
      </div>
      <div className="filters-bar">
        <label htmlFor="jql-input">JQL Filter</label>
        <input
          id="jql-input"
          type="text"
          value={jqlDraft}
          onChange={(event) => setJqlDraft(event.target.value)}
          placeholder='e.g. project = "SCRUM" AND statusCategory != Done ORDER BY updated DESC'
        />
        <button className="secondary" type="button" onClick={handleApplyJql} disabled={isFetchingIssues}>
          {isFetchingIssues ? 'Updating…' : 'Update list'}
        </button>
      </div>
      <p className="meta-text">Current query: {appliedJql || 'None (default project filter)'}</p>

      {issuesError && <p className="error-text">{issuesError}</p>}
      <IssuePanel
        issue={currentIssue}
        index={currentIssueIndex}
        total={issues.length}
        onPrevious={handlePrevIssue}
        onNext={handleNextIssue}
        onReveal={handleReveal}
        onResetVotes={handleRevote}
        onAdvanceIssue={handleAdvance}
        isRevealed={isRevealed}
        disableReveal={!everyoneHasVoted}
        disableNext={currentIssueIndex === issues.length - 1}
        isLoading={isFetchingIssues}
      />

      {currentIssue ? (
        <div className="session-grid">
          <ParticipantsList participants={session.participants} votes={currentVotes} isRevealed={isRevealed} />
          <div className="session-side">
            <Deck
              values={session.deckValues}
              selectedValue={selectedValue ?? null}
              onSelect={handleCardSelect}
              disabled={isRevealed}
              isRevealed={isRevealed}
            />
            {isRevealed && (
              <section className="results-panel">
                <header className="panel-heading">
                  <h3>Vote results</h3>
                  <span className="meta-text">Visible to everyone</span>
                </header>
                <dl className="results-grid">
                  <div>
                    <dt>Average</dt>
                    <dd>{stats.average}</dd>
                  </div>
                  <div>
                    <dt>Median</dt>
                    <dd>{stats.median}</dd>
                  </div>
                  <div>
                    <dt>Min</dt>
                    <dd>{stats.min}</dd>
                  </div>
                  <div>
                    <dt>Max</dt>
                    <dd>{stats.max}</dd>
                  </div>
                </dl>
              </section>
            )}
          </div>
        </div>
      ) : (
        <section className="empty-panel">
          <p>{isFetchingIssues ? 'Loading issues…' : 'No issues found for this session.'}</p>
        </section>
      )}
    </div>
  );
}
