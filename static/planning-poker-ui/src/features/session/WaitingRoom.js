import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { startSession, toggleReady } from "../../api/sessionsClient";
export default function WaitingRoom({ data, viewerAccountId, onSessionUpdate, }) {
    const { session, participants } = data;
    const isModerator = participants.find((p) => p.accountId === viewerAccountId)?.isModerator;
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const isReady = viewerAccountId && session.participantsReady?.includes(viewerAccountId);
    const handleToggleReady = async () => {
        if (!viewerAccountId)
            return;
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
        }
        catch (err) {
            console.error("Failed to toggle ready", err);
            setError("Failed to update status.");
        }
        finally {
            setIsActionLoading(false);
        }
    };
    const handleStartSession = async () => {
        setIsActionLoading(true);
        setError(null);
        try {
            await startSession(session.id);
            // Same here, the parent will refresh on "session.started" event.
        }
        catch (err) {
            console.error("Failed to start session", err);
            setError("Failed to start session.");
        }
        finally {
            setIsActionLoading(false);
        }
    };
    return (_jsxs("div", { className: "waiting-room", children: [_jsxs("header", { className: "waiting-room-header", children: [_jsx("h1", { children: session.name }), _jsx("p", { className: "subtitle", children: "Waiting for participants to join..." })] }), _jsx("div", { className: "participants-grid", children: participants.map((participant) => {
                    const isParticipantReady = session.participantsReady?.includes(participant.accountId);
                    return (_jsxs("div", { className: "participant-card", children: [_jsx("img", { src: participant.avatarUrl, alt: participant.displayName, className: "avatar" }), _jsx("span", { className: "display-name", children: participant.displayName }), isParticipantReady && _jsx("span", { className: "ready-badge", children: "Ready" })] }, participant.accountId));
                }) }), _jsxs("div", { className: "actions-bar", children: [error && _jsx("p", { className: "error-text", children: error }), _jsx("button", { className: `ready-button ${isReady ? "ready" : ""}`, onClick: handleToggleReady, disabled: isActionLoading, children: isReady ? "Not Ready" : "I'm Ready" }), isModerator && (_jsx("button", { className: "primary start-button", onClick: handleStartSession, disabled: isActionLoading, children: "Start Session" }))] })] }));
}
