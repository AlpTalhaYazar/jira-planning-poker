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
          const vote = votes[participant.id];
          const hasVoted = Boolean(vote);
          return (
            <li key={participant.id}>
              <span
                className="avatar"
                style={{ backgroundColor: participant.avatarColor ?? '#44546F' }}
                aria-hidden
              >
                {participant.name.charAt(0)}
              </span>
              <div className="participant-detail">
                <p className="participant-name">
                  {participant.name}{' '}
                  {participant.role === 'moderator' && <span className="role-chip">Moderator</span>}
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
