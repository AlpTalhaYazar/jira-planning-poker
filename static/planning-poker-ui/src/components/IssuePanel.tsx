import type { Issue } from '../types/poker';

interface IssuePanelProps {
  issue: Issue | undefined;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onReveal: () => void;
  onResetVotes: () => void;
  onAdvanceIssue: () => void;
  isRevealed: boolean;
  disableReveal: boolean;
  disableNext: boolean;
  isLoading?: boolean;
}

export function IssuePanel({
  issue,
  index,
  total,
  onPrevious,
  onNext,
  onReveal,
  onResetVotes,
  onAdvanceIssue,
  isRevealed,
  disableReveal,
  disableNext,
  isLoading,
}: IssuePanelProps) {
  if (!issue) {
    return (
      <section className="issue-panel">
        <p>{isLoading ? 'Loading issues from Jira…' : 'No issue selected.'}</p>
      </section>
    );
  }

  return (
    <section className="issue-panel">
      <header className="issue-panel__header">
        <div>
          <p className="eyebrow">Issue {index + 1} of {total}</p>
          <h2>{issue.key}</h2>
        </div>
        <span className="status-pill">{issue.status}</span>
      </header>
      <p className="issue-panel__summary">{issue.summary}</p>
      <dl className="issue-panel__meta">
        <div>
          <dt>Current estimate</dt>
          <dd>{issue.estimate ?? '—'}</dd>
        </div>
        {issue.link && (
          <div>
            <dt>Link</dt>
            <dd>
              <a href={issue.link} target="_blank" rel="noreferrer">
                Open in Jira ↗
              </a>
            </dd>
          </div>
        )}
      </dl>

      <div className="issue-panel__actions">
        <button type="button" className="secondary" onClick={onPrevious} disabled={index === 0}>
          Previous issue
        </button>
        <button type="button" className="secondary" onClick={onNext} disabled={index === total - 1}>
          Next issue
        </button>
        <span className="flex-spacer" />
        {!isRevealed ? (
          <button type="button" className="primary" onClick={onReveal} disabled={disableReveal}>
            Reveal votes
          </button>
        ) : (
          <>
            <button type="button" className="secondary" onClick={onResetVotes}>
              Revote
            </button>
            <button type="button" className="primary" onClick={onAdvanceIssue} disabled={disableNext}>
              Apply &amp; next issue
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export default IssuePanel;
