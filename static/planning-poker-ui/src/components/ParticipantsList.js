import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export function ParticipantsList({ participants, votes, isRevealed, }) {
    return (_jsxs("section", { className: "participants-panel", children: [_jsxs("header", { className: "panel-heading", children: [_jsx("h3", { children: "Participants" }), _jsxs("span", { className: "meta-text", children: [participants.length, " people"] })] }), _jsx("ul", { className: "participants-list", children: participants.map((participant) => {
                    const vote = votes[participant.accountId];
                    const hasVoted = Boolean(vote);
                    return (_jsxs("li", { children: [_jsx("span", { className: "avatar", "aria-hidden": true, children: participant.avatarUrl ? (_jsx("img", { src: participant.avatarUrl, alt: participant.displayName })) : (participant.displayName.charAt(0)) }), _jsxs("div", { className: "participant-detail", children: [_jsxs("p", { className: "participant-name", children: [participant.displayName, " ", participant.isModerator && (_jsx("span", { className: "role-chip", children: "Moderator" }))] }), _jsx("p", { className: "vote-state", children: isRevealed && vote ? (_jsxs(_Fragment, { children: ["Revealed vote: ", _jsx("strong", { children: vote.value })] })) : hasVoted ? ("Has voted") : ("Waiting for vote") })] })] }, participant.accountId));
                }) })] }));
}
export default ParticipantsList;
