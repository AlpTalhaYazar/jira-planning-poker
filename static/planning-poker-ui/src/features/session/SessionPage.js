import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Deck from '../voting/Deck';
import IssuePanel from '../../components/IssuePanel';
import ParticipantsList from '../../components/ParticipantsList';
import { castVote as castVoteRequest, clearVotes as clearVotesRequest, fetchIssuesForProject, getSession as fetchSessionDetails, revealIssue as revealIssueRequest, setCurrentIssue as setCurrentIssueRequest, } from '../../api/sessionsClient';
const numericValue = (value) => {
    if (!value)
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const summarizeVotes = (votes) => {
    const numbers = Object.values(votes)
        .map((vote) => numericValue(vote?.value))
        .filter((value) => value !== null)
        .sort((a, b) => a - b);
    if (!numbers.length) {
        return { average: '—', median: '—', min: '—', max: '—' };
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
const defaultJqlForSession = (session) => session.jql ?? (session.projectKey ? `project = "${session.projectKey}" ORDER BY updated DESC` : '');
export default function SessionPage({ data, onBack, onSessionData, viewerAccountId }) {
    const session = data.session;
    const participants = data.participants;
    const viewerParticipant = viewerAccountId
        ? participants.find((participant) => participant.accountId === viewerAccountId)
        : undefined;
    const viewerIsModerator = viewerParticipant?.isModerator ?? false;
    const [issues, setIssues] = useState([]);
    const [isFetchingIssues, setIsFetchingIssues] = useState(false);
    const [issuesError, setIssuesError] = useState(null);
    const [jqlDraft, setJqlDraft] = useState(defaultJqlForSession(session));
    const [appliedJql, setAppliedJql] = useState(defaultJqlForSession(session));
    const [currentIssueIndex, setCurrentIssueIndex] = useState(0);
    const [actionError, setActionError] = useState(null);
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);
    const hasInitialisedIssueRef = useRef(false);
    useEffect(() => {
        setJqlDraft(defaultJqlForSession(session));
        setAppliedJql(defaultJqlForSession(session));
        setIssues([]);
        setCurrentIssueIndex(0);
        setActionError(null);
        hasInitialisedIssueRef.current = false;
    }, [session.id]);
    const currentIssue = issues[currentIssueIndex];
    const currentIssueState = currentIssue && data.currentIssueState?.issueKey === currentIssue.key ? data.currentIssueState : null;
    const refreshSession = useCallback(async () => {
        try {
            const latest = await fetchSessionDetails(session.id);
            onSessionData(latest);
        }
        catch (err) {
            console.error('Failed to refresh session data', err);
        }
    }, [session.id, onSessionData]);
    useEffect(() => {
        let cancelled = false;
        const loadIssues = async () => {
            if (!session.projectKey) {
                setIssuesError('Missing project key');
                return;
            }
            setIsFetchingIssues(true);
            setIssuesError(null);
            try {
                const fetched = await fetchIssuesForProject({
                    projectKey: session.projectKey,
                    jql: appliedJql || undefined,
                    maxResults: 20,
                });
                if (!cancelled) {
                    if (fetched.length) {
                        setIssues(fetched);
                    }
                    else {
                        setIssues([]);
                        setIssuesError('No Jira issues matched this query.');
                    }
                }
            }
            catch (err) {
                if (!cancelled) {
                    console.error('Failed to fetch Jira issues', err);
                    setIssuesError('Unable to load issues from Jira.');
                }
            }
            finally {
                if (!cancelled) {
                    setIsFetchingIssues(false);
                }
            }
        };
        loadIssues();
        return () => {
            cancelled = true;
        };
    }, [session.projectKey, session.id, appliedJql]);
    useEffect(() => {
        if (!issues.length) {
            hasInitialisedIssueRef.current = false;
            return;
        }
        if (session.currentIssueKey) {
            const idx = issues.findIndex((issue) => issue.key === session.currentIssueKey);
            if (idx >= 0) {
                hasInitialisedIssueRef.current = true;
                if (idx !== currentIssueIndex) {
                    setCurrentIssueIndex(idx);
                }
                return;
            }
        }
        if (!hasInitialisedIssueRef.current) {
            hasInitialisedIssueRef.current = true;
            setCurrentIssueIndex(0);
            const firstKey = issues[0]?.key;
            if (viewerIsModerator && firstKey) {
                setCurrentIssueRequest(session.id, firstKey)
                    .then((snapshot) => onSessionData(snapshot))
                    .catch((err) => {
                    console.error('Failed to sync the current issue', err);
                    setActionError('Unable to sync the current issue.');
                });
            }
        }
    }, [issues, session.currentIssueKey, currentIssueIndex, viewerIsModerator, session.id, onSessionData]);
    useEffect(() => {
        const interval = setInterval(() => {
            refreshSession();
        }, 4000);
        return () => clearInterval(interval);
    }, [refreshSession]);
    const localParticipantId = (viewerAccountId && participants.some((p) => p.accountId === viewerAccountId) && viewerAccountId) ||
        participants[0]?.accountId ||
        null;
    const currentVotes = currentIssueState?.votes ?? {};
    const isRevealed = currentIssueState?.isRevealed ?? false;
    const stats = useMemo(() => summarizeVotes(currentVotes), [currentVotes, isRevealed]);
    const ensureModerator = useCallback(() => {
        if (!viewerIsModerator) {
            setActionError('Only moderators can control the session.');
            return false;
        }
        return true;
    }, [viewerIsModerator]);
    const runAction = useCallback(async (action, errorMessage, requireModerator = true) => {
        if (!currentIssue) {
            return;
        }
        if (requireModerator && !viewerIsModerator) {
            setActionError('Only moderators can control the session.');
            return;
        }
        setActionError(null);
        setIsSubmittingAction(true);
        try {
            await action();
            await refreshSession();
        }
        catch (err) {
            console.error(errorMessage, err);
            setActionError(errorMessage);
        }
        finally {
            setIsSubmittingAction(false);
        }
    }, [currentIssue, refreshSession, viewerIsModerator]);
    const handleCardSelect = (value) => {
        if (!localParticipantId || !currentIssue || isRevealed || isSubmittingAction)
            return;
        runAction(() => castVoteRequest(session.id, currentIssue.key, value), 'Unable to submit your vote. Please try again.', false);
    };
    const handleReveal = () => {
        if (!currentIssue || isRevealed)
            return;
        if (!ensureModerator())
            return;
        runAction(() => revealIssueRequest(session.id, currentIssue.key), 'Unable to reveal votes right now.');
    };
    const handleRevote = () => {
        if (!currentIssue)
            return;
        if (!ensureModerator())
            return;
        runAction(() => clearVotesRequest(session.id, currentIssue.key), 'Unable to reset votes.');
    };
    const changeIssue = (nextIndex) => {
        const targetIssue = issues[nextIndex];
        if (!targetIssue) {
            return;
        }
        if (!viewerIsModerator) {
            setActionError('Only moderators can control the session.');
            return;
        }
        if (nextIndex === currentIssueIndex) {
            return;
        }
        setActionError(null);
        setIsSubmittingAction(true);
        setCurrentIssueRequest(session.id, targetIssue.key)
            .then((snapshot) => {
            onSessionData(snapshot);
            setCurrentIssueIndex(nextIndex);
        })
            .catch((err) => {
            console.error('Unable to change issue', err);
            setActionError('Unable to change the current issue.');
        })
            .finally(() => setIsSubmittingAction(false));
    };
    const handlePrevIssue = () => changeIssue(Math.max(0, currentIssueIndex - 1));
    const handleNextIssue = () => changeIssue(Math.min(issues.length - 1, currentIssueIndex + 1));
    const handleAdvance = () => {
        if (currentIssueIndex < issues.length - 1) {
            changeIssue(currentIssueIndex + 1);
        }
    };
    const handleApplyJql = () => {
        setAppliedJql(jqlDraft);
    };
    const everyoneHasVoted = currentIssue &&
        participants.length > 0 &&
        participants.every((participant) => Boolean(currentVotes[participant.accountId]));
    return (_jsxs("div", { className: "session-layout", children: [_jsxs("div", { className: "session-top-bar", children: [_jsx("button", { className: "text-button", type: "button", onClick: onBack, children: "\u2190 Sessions" }), _jsx("span", { className: "session-name", children: session.name })] }), _jsxs("div", { className: "filters-bar", children: [_jsx("label", { htmlFor: "jql-input", children: "JQL Filter" }), _jsx("input", { id: "jql-input", type: "text", value: jqlDraft, onChange: (event) => setJqlDraft(event.target.value), placeholder: 'e.g. project = "SCRUM" AND statusCategory != Done ORDER BY updated DESC' }), _jsx("button", { className: "secondary", type: "button", onClick: handleApplyJql, disabled: isFetchingIssues, children: isFetchingIssues ? 'Updating…' : 'Update list' })] }), _jsxs("p", { className: "meta-text", children: ["Current query: ", appliedJql || 'None (default project filter)'] }), actionError && _jsx("p", { className: "error-text", children: actionError }), issuesError && _jsx("p", { className: "error-text", children: issuesError }), _jsx(IssuePanel, { issue: currentIssue, index: currentIssueIndex, total: issues.length, onPrevious: handlePrevIssue, onNext: handleNextIssue, onReveal: handleReveal, onResetVotes: handleRevote, onAdvanceIssue: handleAdvance, isRevealed: isRevealed, disableReveal: !everyoneHasVoted || isSubmittingAction, disableNext: currentIssueIndex === issues.length - 1, isLoading: isFetchingIssues, canControl: viewerIsModerator, isBusy: isSubmittingAction }), currentIssue ? (_jsxs("div", { className: "session-grid", children: [_jsx(ParticipantsList, { participants: participants, votes: currentVotes, isRevealed: isRevealed }), _jsxs("div", { className: "session-side", children: [_jsx(Deck, { values: session.deckValues, selectedValue: localParticipantId ? currentVotes[localParticipantId]?.value ?? null : null, onSelect: handleCardSelect, disabled: isRevealed || isSubmittingAction, isRevealed: isRevealed }), isRevealed && (_jsxs("section", { className: "results-panel", children: [_jsxs("header", { className: "panel-heading", children: [_jsx("h3", { children: "Vote results" }), _jsx("span", { className: "meta-text", children: "Visible to everyone" })] }), _jsxs("dl", { className: "results-grid", children: [_jsxs("div", { children: [_jsx("dt", { children: "Average" }), _jsx("dd", { children: stats.average })] }), _jsxs("div", { children: [_jsx("dt", { children: "Median" }), _jsx("dd", { children: stats.median })] }), _jsxs("div", { children: [_jsx("dt", { children: "Min" }), _jsx("dd", { children: stats.min })] }), _jsxs("div", { children: [_jsx("dt", { children: "Max" }), _jsx("dd", { children: stats.max })] })] })] }))] })] })) : (_jsx("section", { className: "empty-panel", children: _jsx("p", { children: isFetchingIssues ? 'Loading issues…' : 'No issues found for this session.' }) }))] }));
}
