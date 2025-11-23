import React, { useState } from "react";
import type { SessionWithParticipants } from "../../types/poker";
import { startSession, toggleReady } from "../../api/sessionsClient";

interface WaitingRoomProps {
  data: SessionWithParticipants;
  viewerAccountId?: string;
  onSessionUpdate: (data: SessionWithParticipants) => void;
}

export default function WaitingRoom({
  data,
  viewerAccountId,
  onSessionUpdate,
}: WaitingRoomProps) {
  const { session, participants } = data;
  const isModerator = participants.find(
    (p) => p.accountId === viewerAccountId
  )?.isModerator;
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady =
    viewerAccountId && session.participantsReady?.includes(viewerAccountId);

  const handleToggleReady = async () => {
    if (!viewerAccountId) return;
    setIsActionLoading(true);
    setError(null);
    try {
      await toggleReady(session.id, !isReady);
      // Optimistic update or wait for refresh?
      // The parent component handles refresh on events, so we might just wait.
      // But for better UX, we can optimistically update local state if we had it.
      // For now, let's rely on the backend response if it returns the updated session.
      // Actually toggleReady returns SessionSummary (from my client definition), but I need SessionWithParticipants to update parent.
      // Wait, toggleReady returns Session (backend) -> SessionSummary (frontend).
      // The parent expects SessionWithParticipants.
      // So I might need to trigger a refresh in the parent or just wait for the socket event.
      // Let's just wait for the socket event which triggers refresh in parent.
    } catch (err) {
      console.error("Failed to toggle ready", err);
      setError("Failed to update status.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartSession = async () => {
    setIsActionLoading(true);
    setError(null);
    try {
      await startSession(session.id);
      // Same here, the parent will refresh on "session.started" event.
    } catch (err) {
      console.error("Failed to start session", err);
      setError("Failed to start session.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="waiting-room">
      <header className="waiting-room-header">
        <h1>{session.name}</h1>
        <p className="subtitle">Waiting for participants to join...</p>
      </header>

      <div className="participants-grid">
        {participants.map((participant) => {
          const isParticipantReady = session.participantsReady?.includes(
            participant.accountId
          );
          return (
            <div key={participant.accountId} className="participant-card">
              <img
                src={participant.avatarUrl}
                alt={participant.displayName}
                className="avatar"
              />
              <span className="display-name">{participant.displayName}</span>
              {isParticipantReady && <span className="ready-badge">Ready</span>}
            </div>
          );
        })}
      </div>

      <div className="actions-bar">
        {error && <p className="error-text">{error}</p>}
        <button
          className={`ready-button ${isReady ? "ready" : ""}`}
          onClick={handleToggleReady}
          disabled={isActionLoading}
        >
          {isReady ? "Not Ready" : "I'm Ready"}
        </button>

        {isModerator && (
          <button
            className="primary start-button"
            onClick={handleStartSession}
            disabled={isActionLoading}
          >
            Start Session
          </button>
        )}
      </div>
    </div>
  );
}
