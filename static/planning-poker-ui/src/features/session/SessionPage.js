import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import Deck from '../voting/Deck';
import IssuePanel from '../../components/IssuePanel';
import ParticipantsList from '../../components/ParticipantsList';
import { fetchIssuesForProject } from '../../api/sessionsClient';
const buildInitialVotes = (session, issues) => issues.reduce((acc, issue) => {
    const provided = session.initialVotes?.[issue.key];
    acc[issue.key] = session.participants.reduce((voteAcc, participant) => {
        voteAcc[participant.id] = provided?.[participant.id] ?? null;
        return voteAcc;
    }, {});
    return acc;
}, {});
const numericValue = (value) => {
    if (!value)
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const summarizeVotes = (votes) => {
    const numbers = Object.values(votes)
        .map(numericValue)
        .filter((value) => value !== null)
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
    const median = numbers.length % 2 === 1
        ? numbers[(numbers.length - 1) / 2]
        : (numbers[numbers.length / 2 - 1] + numbers[numbers.length / 2]) / 2;
    return {
        average: average.toFixed(1),
        median: median.toString(),
        min: numbers[0].toString(),
        max: numbers[numbers.length - 1].toString(),
    };
};
export default function SessionPage({ session, onBack }) {
    const [issues, setIssues] = useState(session.issues);
    const [isFetchingIssues, setIsFetchingIssues] = useState(false);
    const [issuesError, setIssuesError] = useState(null);
    const defaultJql = session.projectKey ? `project = "${session.projectKey}" ORDER BY updated DESC` : '';
    const [jqlDraft, setJqlDraft] = useState(defaultJql);
    const [appliedJql, setAppliedJql] = useState(defaultJql);
    const [currentIssueIndex, setCurrentIssueIndex] = useState(0);
    const [votesByIssue, setVotesByIssue] = useState(() => buildInitialVotes(session, session.issues));
    const [isRevealed, setIsRevealed] = useState(false);
    useEffect(() => {
        let cancelled = false;
        const loadIssues = async (jqlToUse) => {
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
                    }
                    else {
                        setIssues(session.issues);
                        setIssuesError('No Jira issues matched the filter; showing mock defaults.');
                    }
                }
            }
            catch (err) {
                if (!cancelled) {
                    console.error('Failed to fetch Jira issues', err);
                    setIssues(session.issues);
                    setIssuesError('Unable to load issues from Jira (showing mock data).');
                }
            }
            finally {
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
    const updateVotes = (issueKey, mutate) => {
        setVotesByIssue((prev) => ({
            ...prev,
            [issueKey]: mutate(prev[issueKey]),
        }));
    };
    const handleCardSelect = (value) => {
        if (!localParticipantId || isRevealed)
            return;
        updateVotes(currentIssue.key, (existing) => ({
            ...existing,
            [localParticipantId]: existing[localParticipantId] === value ? null : value,
        }));
    };
    const handleReveal = () => setIsRevealed(true);
    const handleRevote = () => {
        if (!currentIssue)
            return;
        updateVotes(currentIssue.key, (existing = {}) => Object.keys(existing).reduce((acc, participantId) => {
            acc[participantId] = null;
            return acc;
        }, {}));
        setIsRevealed(false);
    };
    const moveToIssue = (nextIndex) => {
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
    return (_jsxs("div", { className: "session-layout", children: [_jsxs("div", { className: "session-top-bar", children: [_jsx("button", { className: "text-button", type: "button", onClick: onBack, children: "\u2190 Sessions" }), _jsx("span", { className: "session-name", children: session.name })] }), _jsxs("div", { className: "filters-bar", children: [_jsx("label", { htmlFor: "jql-input", children: "JQL Filter" }), _jsx("input", { id: "jql-input", type: "text", value: jqlDraft, onChange: (event) => setJqlDraft(event.target.value), placeholder: 'e.g. project = "SCRUM" AND statusCategory != Done ORDER BY updated DESC' }), _jsx("button", { className: "secondary", type: "button", onClick: handleApplyJql, disabled: isFetchingIssues, children: isFetchingIssues ? 'Updating…' : 'Update list' })] }), _jsxs("p", { className: "meta-text", children: ["Current query: ", appliedJql || 'None (default project filter)'] }), issuesError && _jsx("p", { className: "error-text", children: issuesError }), _jsx(IssuePanel, { issue: currentIssue, index: currentIssueIndex, total: issues.length, onPrevious: handlePrevIssue, onNext: handleNextIssue, onReveal: handleReveal, onResetVotes: handleRevote, onAdvanceIssue: handleAdvance, isRevealed: isRevealed, disableReveal: !everyoneHasVoted, disableNext: currentIssueIndex === issues.length - 1, isLoading: isFetchingIssues }), currentIssue ? (_jsxs("div", { className: "session-grid", children: [_jsx(ParticipantsList, { participants: session.participants, votes: currentVotes, isRevealed: isRevealed }), _jsxs("div", { className: "session-side", children: [_jsx(Deck, { values: session.deckValues, selectedValue: selectedValue ?? null, onSelect: handleCardSelect, disabled: isRevealed, isRevealed: isRevealed }), isRevealed && (_jsxs("section", { className: "results-panel", children: [_jsxs("header", { className: "panel-heading", children: [_jsx("h3", { children: "Vote results" }), _jsx("span", { className: "meta-text", children: "Visible to everyone" })] }), _jsxs("dl", { className: "results-grid", children: [_jsxs("div", { children: [_jsx("dt", { children: "Average" }), _jsx("dd", { children: stats.average })] }), _jsxs("div", { children: [_jsx("dt", { children: "Median" }), _jsx("dd", { children: stats.median })] }), _jsxs("div", { children: [_jsx("dt", { children: "Min" }), _jsx("dd", { children: stats.min })] }), _jsxs("div", { children: [_jsx("dt", { children: "Max" }), _jsx("dd", { children: stats.max })] })] })] }))] })] })) : (_jsx("section", { className: "empty-panel", children: _jsx("p", { children: isFetchingIssues ? 'Loading issues…' : 'No issues found for this session.' }) }))] }));
}
