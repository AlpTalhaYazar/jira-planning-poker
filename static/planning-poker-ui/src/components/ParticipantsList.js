import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export function ParticipantsList({ participants, votes, isRevealed }) {
    return (_jsxs("section", { className: "participants-panel", children: [_jsxs("header", { className: "panel-heading", children: [_jsx("h3", { children: "Participants" }), _jsxs("span", { className: "meta-text", children: [participants.length, " people"] })] }), _jsx("ul", { className: "participants-list", children: participants.map((participant) => {
                    const vote = votes[participant.id];
                    const hasVoted = Boolean(vote);
                    return (_jsxs("li", { children: [_jsx("span", { className: "avatar", style: { backgroundColor: participant.avatarColor ?? '#44546F' }, "aria-hidden": true, children: participant.name.charAt(0) }), _jsxs("div", { className: "participant-detail", children: [_jsxs("p", { className: "participant-name", children: [participant.name, ' ', participant.role === 'moderator' && _jsx("span", { className: "role-chip", children: "Moderator" })] }), _jsx("p", { className: "vote-state", children: isRevealed && vote ? (_jsxs(_Fragment, { children: ["Revealed vote: ", _jsx("strong", { children: vote })] })) : hasVoted ? ('Has voted') : ('Waiting for vote') })] })] }, participant.id));
                }) })] }));
}
export default ParticipantsList;
