import {
  jsx as _jsx,
  Fragment as _Fragment,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Deck from "../voting/Deck";
import IssuePanel from "../../components/IssuePanel";
import ParticipantsList from "../../components/ParticipantsList";
import { useRealtimeSession } from "../../hooks/useRealtimeSession";
import {
  applyEstimate as applyEstimateRequest,
  castVote as castVoteRequest,
  clearVotes as clearVotesRequest,
  fetchIssuesForProject,
  getSession as fetchSessionDetails,
  revealIssue as revealIssueRequest,
  setCurrentIssue as setCurrentIssueRequest,
  updateSessionBacklog as updateSessionBacklogRequest,
} from "../../api/sessionsClient";
import {
  MAX_POLLING_INTERVAL_MS,
  POLLING_INTERVAL_MS,
} from "../../constants/realtime";
const numericValue = (value) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const summarizeVotes = (votes) => {
  const numbers = Object.values(votes)
    .map((vote) => numericValue(vote?.value))
    .filter((value) => value !== null)
    .sort((a, b) => a - b);
  if (!numbers.length) {
    return { average: "—", median: "—", min: "—", max: "—" };
  }
  const average =
    numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
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
const defaultJqlForSession = (session) =>
  session.jql ??
  (session.projectKey
    ? `project = "${session.projectKey}" ORDER BY updated DESC`
    : "");
export default function SessionPage({
  data,
  onBack,
  onSessionData,
  viewerAccountId,
  projectConfig,
  onDebugEvent,
}) {
  const session = data.session;
  const participants = data.participants;
  const viewerParticipant = viewerAccountId
    ? participants.find(
        (participant) => participant.accountId === viewerAccountId
      )
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
  const [pendingVotes, setPendingVotes] = useState({});
  const backlogSyncRef = useRef(null);
  useEffect(() => {
    setJqlDraft(defaultJqlForSession(session));
    setAppliedJql(defaultJqlForSession(session));
    setIssues([]);
    setCurrentIssueIndex(0);
    setActionError(null);
    hasInitialisedIssueRef.current = false;
  }, [session.id]);
  const currentIssue = issues[currentIssueIndex];
  const currentIssueState =
    currentIssue && data.currentIssueState?.issueKey === currentIssue.key
      ? data.currentIssueState
      : null;
  useEffect(() => {
    setPendingVotes({});
  }, [data.currentIssueState?.issueKey, session.id]);
  const refreshSession = useCallback(async () => {
    try {
      const latest = await fetchSessionDetails(session.id);
      onSessionData(latest);
    } catch (err) {
      console.error("Failed to refresh session data", err);
    }
  }, [session.id, onSessionData]);
  useEffect(() => {
    let cancelled = false;
    const loadIssues = async () => {
      if (!session.projectKey) {
        setIssuesError("Missing project key");
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
          } else {
            setIssues([]);
            setIssuesError("No Jira issues matched this query.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch Jira issues", err);
          setIssuesError("Unable to load issues from Jira.");
        }
      } finally {
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
      const idx = issues.findIndex(
        (issue) => issue.key === session.currentIssueKey
      );
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
        logOutgoing("setCurrentIssue", {
          sessionId: session.id,
          issueKey: firstKey,
        });
        setCurrentIssueRequest(session.id, firstKey)
          .then((snapshot) => onSessionData(snapshot))
          .catch((err) => {
            console.error("Failed to sync the current issue", err);
            setActionError("Unable to sync the current issue.");
          });
      }
    }
  }, [
    issues,
    session.currentIssueKey,
    currentIssueIndex,
    viewerIsModerator,
    session.id,
    onSessionData,
  ]);
  useEffect(() => {
    if (!viewerIsModerator || !issues.length) {
      return;
    }
    const issueKeys = issues.map((issue) => issue.key);
    const hash = issueKeys.join("|");
    const normalizedJql = appliedJql || undefined;
    const lastSync = backlogSyncRef.current;
    if (lastSync && lastSync.hash === hash && lastSync.jql === normalizedJql) {
      return;
    }
    backlogSyncRef.current = { hash, jql: normalizedJql };
    let cancelled = false;
    updateSessionBacklogRequest(session.id, issueKeys, normalizedJql)
      .then(() => {
        if (!cancelled) {
          refreshSession();
        }
      })
      .catch((err) => console.error("Failed to sync backlog", err));
    return () => {
      cancelled = true;
    };
  }, [viewerIsModerator, issues, appliedJql, session.id, refreshSession]);
  const handleSessionEvent = useCallback(
    (message) => {
      if (message?.sessionId === session.id) {
        refreshSession();
      }
    },
    [session.id, refreshSession]
  );
  const logDebug = useCallback(
    (direction, eventName, payload) => {
      const sanitizedPayload =
        eventName === "token" && payload && typeof payload === "object"
          ? {
              relayUrl: payload.relayUrl,
              expiresAt: payload.expiresAt,
            }
          : payload;
      onDebugEvent({ direction, event: eventName, payload: sanitizedPayload });
    },
    [onDebugEvent]
  );
  const logOutgoing = useCallback(
    (eventName, payload) => {
      logDebug("outgoing", eventName, payload);
    },
    [logDebug]
  );
  const captureSessionEvent = useCallback(
    (message) => {
      logDebug(
        "incoming",
        message.event ?? "session:event",
        message.payload ?? message
      );
      handleSessionEvent(message);
    },
    [handleSessionEvent, logDebug]
  );
  const { status: realtimeStatus } = useRealtimeSession({
    sessionId: session.id,
    onSessionEvent: captureSessionEvent,
    onSocketEvent: (eventName, payload) =>
      logDebug("incoming", eventName, payload),
    onToken: (tokenResponse) => logDebug("incoming", "token", tokenResponse),
  });
  useEffect(() => {
    if (realtimeStatus !== "disabled" && realtimeStatus !== "error") {
      return;
    }
    let cancelled = false;
    let delay = POLLING_INTERVAL_MS;
    let timeout = null;
    const poll = async () => {
      if (cancelled) {
        return;
      }
      await refreshSession();
      delay = Math.min(delay * 2, MAX_POLLING_INTERVAL_MS);
      timeout = setTimeout(poll, delay);
    };
    timeout = setTimeout(poll, delay);
    return () => {
      cancelled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [realtimeStatus, refreshSession]);
  const localParticipantId =
    (viewerAccountId &&
      participants.some((p) => p.accountId === viewerAccountId) &&
      viewerAccountId) ||
    participants[0]?.accountId ||
    null;
  const currentVotes = currentIssueState?.votes ?? {};
  const optimisticVotes = useMemo(() => {
    const merged = { ...currentVotes };
    Object.entries(pendingVotes).forEach(([accountId, value]) => {
      merged[accountId] = {
        accountId,
        hasVoted: true,
        value,
      };
    });
    return merged;
  }, [currentVotes, pendingVotes]);
  const isRevealed = currentIssueState?.isRevealed ?? false;
  const stats = useMemo(
    () => summarizeVotes(optimisticVotes),
    [optimisticVotes, isRevealed]
  );
  const [applyValue, setApplyValue] = useState("");
  const [applyMessage, setApplyMessage] = useState(null);
  const estimatedSuggestion = useMemo(() => {
    if (stats.median && stats.median !== "—") {
      return stats.median;
    }
    if (stats.average && stats.average !== "—") {
      return stats.average;
    }
    return "";
  }, [stats.median, stats.average]);
  useEffect(() => {
    if (!isRevealed) {
      setApplyValue("");
      setApplyMessage(null);
      return;
    }
    if (!applyValue) {
      setApplyValue(estimatedSuggestion);
    }
  }, [isRevealed, estimatedSuggestion, applyValue]);
  const ensureModerator = useCallback(() => {
    if (!viewerIsModerator) {
      setActionError("Only moderators can control the session.");
      return false;
    }
    return true;
  }, [viewerIsModerator]);
  const runAction = useCallback(
    async (action, errorMessage, requireModerator = true) => {
      if (!currentIssue) {
        return false;
      }
      if (requireModerator && !viewerIsModerator) {
        setActionError("Only moderators can control the session.");
        return false;
      }
      setActionError(null);
      setIsSubmittingAction(true);
      try {
        await action();
        await refreshSession();
        return true;
      } catch (err) {
        console.error(errorMessage, err);
        setActionError(errorMessage);
        return false;
      } finally {
        setIsSubmittingAction(false);
      }
    },
    [currentIssue, refreshSession, viewerIsModerator]
  );
  const handleCardSelect = (value) => {
    if (
      !localParticipantId ||
      !currentIssue ||
      isRevealed ||
      isSubmittingAction
    )
      return;
    logOutgoing("castVote", {
      sessionId: session.id,
      issueKey: currentIssue.key,
      value,
    });
    setPendingVotes((prev) => ({
      ...prev,
      [localParticipantId]: value,
    }));
    void runAction(
      () => castVoteRequest(session.id, currentIssue.key, value),
      "Unable to submit your vote. Please try again.",
      false
    ).then((success) => {
      if (!success) {
        setPendingVotes((prev) => {
          const next = { ...prev };
          delete next[localParticipantId];
          return next;
        });
      }
    });
  };
  const handleReveal = () => {
    if (!currentIssue || isRevealed) return;
    if (!ensureModerator()) return;
    logOutgoing("revealIssue", {
      sessionId: session.id,
      issueKey: currentIssue.key,
    });
    runAction(
      () => revealIssueRequest(session.id, currentIssue.key),
      "Unable to reveal votes right now."
    );
  };
  const handleRevote = () => {
    if (!currentIssue) return;
    if (!ensureModerator()) return;
    logOutgoing("clearVotes", {
      sessionId: session.id,
      issueKey: currentIssue.key,
    });
    runAction(
      () => clearVotesRequest(session.id, currentIssue.key),
      "Unable to reset votes."
    );
    setApplyValue("");
    setApplyMessage(null);
  };
  const changeIssue = (nextIndex) => {
    const targetIssue = issues[nextIndex];
    if (!targetIssue) {
      return;
    }
    if (!viewerIsModerator) {
      setActionError("Only moderators can control the session.");
      return;
    }
    if (nextIndex === currentIssueIndex) {
      return;
    }
    setActionError(null);
    setIsSubmittingAction(true);
    setApplyValue("");
    setApplyMessage(null);
    logOutgoing("setCurrentIssue", {
      sessionId: session.id,
      issueKey: targetIssue.key,
    });
    setCurrentIssueRequest(session.id, targetIssue.key)
      .then((snapshot) => {
        onSessionData(snapshot);
        setCurrentIssueIndex(nextIndex);
      })
      .catch((err) => {
        console.error("Unable to change issue", err);
        setActionError("Unable to change the current issue.");
      })
      .finally(() => setIsSubmittingAction(false));
  };
  const handlePrevIssue = () => changeIssue(Math.max(0, currentIssueIndex - 1));
  const handleNextIssue = () =>
    changeIssue(Math.min(issues.length - 1, currentIssueIndex + 1));
  const handleAdvance = () => {
    if (currentIssueIndex < issues.length - 1) {
      changeIssue(currentIssueIndex + 1);
    }
  };
  const handleApplyJql = () => {
    setAppliedJql(jqlDraft);
  };
  const everyoneHasVoted =
    currentIssue &&
    participants.length > 0 &&
    participants.every((participant) =>
      Boolean(optimisticVotes[participant.accountId])
    );
  return _jsxs("div", {
    className: "session-layout",
    children: [
      _jsxs("div", {
        className: "session-top-bar",
        children: [
          _jsx("button", {
            className: "text-button",
            type: "button",
            onClick: onBack,
            children: "\u2190 Sessions",
          }),
          _jsx("span", { className: "session-name", children: session.name }),
          realtimeStatus !== "connected" &&
            _jsxs(_Fragment, {
              children: [
                _jsx("span", {
                  className: "meta-text",
                  role: "status",
                  children:
                    realtimeStatus === "disabled"
                      ? "Realtime relay unavailable – falling back to polling"
                      : realtimeStatus === "error"
                      ? "Realtime connection lost – retrying"
                      : "Connecting to relay…",
                }),
                (realtimeStatus === "disabled" || realtimeStatus === "error") &&
                  _jsx("button", {
                    type: "button",
                    className: "secondary",
                    onClick: () => refreshSession(),
                    children: "Refresh now",
                  }),
              ],
            }),
        ],
      }),
      _jsxs("div", {
        className: "filters-bar",
        children: [
          _jsx("label", { htmlFor: "jql-input", children: "JQL Filter" }),
          _jsx("input", {
            id: "jql-input",
            type: "text",
            value: jqlDraft,
            onChange: (event) => setJqlDraft(event.target.value),
            placeholder:
              'e.g. project = "SCRUM" AND statusCategory != Done ORDER BY updated DESC',
          }),
          _jsx("button", {
            className: "secondary",
            type: "button",
            onClick: handleApplyJql,
            disabled: isFetchingIssues,
            children: isFetchingIssues ? "Updating…" : "Update list",
          }),
        ],
      }),
      _jsxs("p", {
        className: "meta-text",
        children: [
          "Current query: ",
          appliedJql || "None (default project filter)",
        ],
      }),
      actionError &&
        _jsx("p", { className: "error-text", children: actionError }),
      issuesError &&
        _jsx("p", { className: "error-text", children: issuesError }),
      _jsx(IssuePanel, {
        issue: currentIssue,
        index: currentIssueIndex,
        total: issues.length,
        onPrevious: handlePrevIssue,
        onNext: handleNextIssue,
        onReveal: handleReveal,
        onResetVotes: handleRevote,
        onAdvanceIssue: handleAdvance,
        isRevealed: isRevealed,
        disableReveal: !everyoneHasVoted || isSubmittingAction,
        disableNext: currentIssueIndex === issues.length - 1,
        isLoading: isFetchingIssues,
        canControl: viewerIsModerator,
        isBusy: isSubmittingAction,
      }),
      currentIssue
        ? _jsxs("div", {
            className: "session-grid",
            children: [
              _jsx(ParticipantsList, {
                participants: participants,
                votes: optimisticVotes,
                isRevealed: isRevealed,
              }),
              _jsxs("div", {
                className: "session-side",
                children: [
                  _jsx(Deck, {
                    values: session.deckValues,
                    selectedValue: localParticipantId
                      ? optimisticVotes[localParticipantId]?.value ?? null
                      : null,
                    onSelect: handleCardSelect,
                    disabled: isRevealed || isSubmittingAction,
                    isRevealed: isRevealed,
                  }),
                  isRevealed &&
                    _jsxs("section", {
                      className: "results-panel",
                      children: [
                        _jsxs("header", {
                          className: "panel-heading",
                          children: [
                            _jsx("h3", { children: "Vote results" }),
                            _jsx("span", {
                              className: "meta-text",
                              children: "Visible to everyone",
                            }),
                          ],
                        }),
                        _jsxs("dl", {
                          className: "results-grid",
                          children: [
                            _jsxs("div", {
                              children: [
                                _jsx("dt", { children: "Average" }),
                                _jsx("dd", { children: stats.average }),
                              ],
                            }),
                            _jsxs("div", {
                              children: [
                                _jsx("dt", { children: "Median" }),
                                _jsx("dd", { children: stats.median }),
                              ],
                            }),
                            _jsxs("div", {
                              children: [
                                _jsx("dt", { children: "Min" }),
                                _jsx("dd", { children: stats.min }),
                              ],
                            }),
                            _jsxs("div", {
                              children: [
                                _jsx("dt", { children: "Max" }),
                                _jsx("dd", { children: stats.max }),
                              ],
                            }),
                          ],
                        }),
                        viewerIsModerator &&
                          _jsxs("div", {
                            className: "apply-estimate",
                            children: [
                              _jsxs("header", {
                                children: [
                                  _jsx("h4", {
                                    children: "Apply estimate to Jira",
                                  }),
                                  !projectConfig?.estimateFieldId &&
                                    _jsx("p", {
                                      className: "error-text",
                                      children:
                                        "Configure an estimate field before applying.",
                                    }),
                                ],
                              }),
                              _jsx("div", {
                                className: "apply-estimate__chips",
                                children: (
                                  projectConfig?.deckValues ??
                                  session.deckValues
                                ).map((value) =>
                                  _jsx(
                                    "button",
                                    {
                                      type: "button",
                                      className: `chip ${
                                        applyValue === value
                                          ? "chip--selected"
                                          : ""
                                      }`,
                                      onClick: () => {
                                        setApplyMessage(null);
                                        setApplyValue(value);
                                      },
                                      children: value,
                                    },
                                    value
                                  )
                                ),
                              }),
                              _jsx("label", {
                                htmlFor: "apply-estimate-input",
                                children: "Custom value",
                              }),
                              _jsx("input", {
                                id: "apply-estimate-input",
                                type: "text",
                                value: applyValue,
                                onChange: (event) => {
                                  setApplyMessage(null);
                                  setApplyValue(event.target.value);
                                },
                                placeholder:
                                  estimatedSuggestion || "Enter final value",
                              }),
                              _jsx("button", {
                                type: "button",
                                className: "primary",
                                onClick: () =>
                                  runAction(
                                    async () => {
                                      if (!currentIssue) return;
                                      const valueToApply =
                                        applyValue.trim() ||
                                        estimatedSuggestion;
                                      if (!valueToApply) {
                                        throw new Error("No estimate selected");
                                      }
                                      if (!projectConfig?.estimateFieldId) {
                                        throw new Error(
                                          "No estimate field configured for this project."
                                        );
                                      }
                                      logOutgoing("applyEstimate", {
                                        sessionId: session.id,
                                        issueKey: currentIssue.key,
                                        value: valueToApply,
                                      });
                                      await applyEstimateRequest(
                                        session.id,
                                        currentIssue.key,
                                        valueToApply
                                      );
                                      setApplyMessage(
                                        "Estimate applied to Jira ✔"
                                      );
                                    },
                                    "Unable to apply estimate.",
                                    true
                                  ),
                                disabled:
                                  isSubmittingAction ||
                                  !applyValue ||
                                  !projectConfig?.estimateFieldId,
                                children: "Apply to Jira",
                              }),
                              applyMessage &&
                                _jsx("p", {
                                  className: "success-text",
                                  children: applyMessage,
                                }),
                            ],
                          }),
                      ],
                    }),
                ],
              }),
            ],
          })
        : _jsx("section", {
            className: "empty-panel",
            children: _jsx("p", {
              children: isFetchingIssues
                ? "Loading issues…"
                : "No issues found for this session.",
            }),
          }),
    ],
  });
}
