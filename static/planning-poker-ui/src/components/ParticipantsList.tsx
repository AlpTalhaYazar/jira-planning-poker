import type { Participant } from '../types/poker';

interface ParticipantsListProps {
  participants: Participant[];
  votes: Record<string, string | null>;
  isRevealed: boolean;
}

export function ParticipantsList({ participants, votes, isRevealed }: ParticipantsListProps) {
  return (
    <section className="participants-panel">
      <header className="panel-heading">
        <h3>Participants</h3>
        <span className="meta-text">{participants.length} people</span>
      </header>
      <ul className="participants-list">
        {participants.map((participant) => {
          const vote = votes[participant.accountId];
          const hasVoted = Boolean(vote);
          return (
            <li key={participant.accountId}>
              <span className="avatar" aria-hidden>
                {participant.avatarUrl ? (
                  <img src={participant.avatarUrl} alt={participant.displayName} />
                ) : (
                  participant.displayName.charAt(0)
                )}
              </span>
              <div className="participant-detail">
                <p className="participant-name">
                  {participant.displayName}{' '}
                  {participant.isModerator && <span className="role-chip">Moderator</span>}
                </p>
                <p className="vote-state">
                  {isRevealed && vote ? (
                    <>
                      Revealed vote: <strong>{vote}</strong>
                    </>
                  ) : hasVoted ? (
                    'Has voted'
                  ) : (
                    'Waiting for vote'
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ParticipantsList;
