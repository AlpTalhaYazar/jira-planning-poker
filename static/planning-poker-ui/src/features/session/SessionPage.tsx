import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Deck from "../voting/Deck";
import WaitingRoom from "./WaitingRoom";
import IssuePanel from "../../components/IssuePanel";
import type {
  Issue,
  ProjectConfig,
  SessionWithParticipants,
  Vote,
} from "../../types/poker";
import ParticipantsList from "../../components/ParticipantsList";
import { useRealtimeSession } from "../../hooks/useRealtimeSession";
import {
  applyEstimate as applyEstimateRequest,
  castVote as castVoteRequest,
  clearVotes as clearVotesRequest,
  fetchIssuesForProject,
  getSession as fetchSessionDetails,
  leaveSession as leaveSessionApi,
  revealIssue as revealIssueRequest,
  setCurrentIssue as setCurrentIssueRequest,
  updateSessionBacklog as updateSessionBacklogRequest,
} from "../../api/sessionsClient";
import {
  MAX_POLLING_INTERVAL_MS,
  POLLING_INTERVAL_MS,
} from "../../constants/realtime";

interface SessionPageProps {
  data: SessionWithParticipants;
  onBack: () => void;
  onSessionData: (data: SessionWithParticipants) => void;
  viewerAccountId?: string;
  projectConfig?: ProjectConfig | null;
  onDebugEvent: (entry: {
    direction: "incoming" | "outgoing";
    event: string;
    payload: unknown;
  }) => void;
}

const numericValue = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const summarizeVotes = (votes: Record<string, Vote>) => {
  const numbers = Object.values(votes)
    .map((vote) => numericValue(vote?.value))
    .filter((value): value is number => value !== null)
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

const defaultJqlForSession = (session: SessionWithParticipants["session"]) =>
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
}: SessionPageProps) {
  const session = data.session;
  const participants = data.participants;
  const viewerParticipant = viewerAccountId
    ? participants.find(
        (participant) => participant.accountId === viewerAccountId
      )
    : undefined;
  const viewerIsModerator = viewerParticipant?.isModerator ?? false;

  const [issues, setIssues] = useState<Issue[]>([]);
  const [isFetchingIssues, setIsFetchingIssues] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [jqlDraft, setJqlDraft] = useState(defaultJqlForSession(session));
  const [appliedJql, setAppliedJql] = useState(defaultJqlForSession(session));
  const [currentIssueIndex, setCurrentIssueIndex] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const hasInitialisedIssueRef = useRef(false);
  const [pendingVotes, setPendingVotes] = useState<Record<string, string>>({});
  const backlogSyncRef = useRef<{ hash: string; jql?: string } | null>(null);

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

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const latest = await fetchSessionDetails(session.id);
      if (isMountedRef.current) {
        onSessionData(latest);
      }
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
    (message: { sessionId?: string }) => {
      if (message?.sessionId === session.id) {
        refreshSession();
      }
    },
    [session.id, refreshSession]
  );

  const logDebug = useCallback(
    (
      direction: "incoming" | "outgoing",
      eventName: string,
      payload: unknown
    ) => {
      const sanitizedPayload =
        eventName === "token" && payload && typeof payload === "object"
          ? {
              relayUrl: (payload as { relayUrl?: string }).relayUrl,
              expiresAt: (payload as { expiresAt?: string | null }).expiresAt,
            }
          : payload;
      onDebugEvent({ direction, event: eventName, payload: sanitizedPayload });
    },
    [onDebugEvent]
  );

  const logOutgoing = useCallback(
    (eventName: string, payload: unknown) => {
      logDebug("outgoing", eventName, payload);
    },
    [logDebug]
  );

  const captureSessionEvent = useCallback(
    (message: { sessionId?: string; event?: string; payload?: unknown }) => {
      // Log the raw incoming message for debugging
      logDebug(
        "incoming",
        message.event ?? "session:event",
        message.payload ?? message
      );

      // If it's a "session:event" (legacy/wrapper), unwrap it if possible
      // But based on useRealtimeSession, we are now getting specific events like "vote.cast"
      // So we should check if the event matches our session ID
      
      const targetSessionId = message.sessionId;
      if (targetSessionId === session.id) {
        if (message.event === "participant.left") {
          // If a participant left, we should refresh to update the list
          // AND we should ensure they are removed from the backend if they are still there
          // This handles the case where a user disconnected (socket closed) but didn't explicitly leave via API
          const payload = message.payload as { participantId?: string };
          if (payload?.participantId && payload.participantId !== viewerAccountId) {
             // We trigger a cleanup for this user.
             // We only do this if we are the moderator to avoid race conditions/spam,
             // OR if we are just a peer and want to ensure consistency.
             // Let's have the moderator do it if present, otherwise anyone.
             // Actually, to be safe, let's just refresh. The backend *should* have handled it?
             // No, the backend doesn't know about socket disconnects directly.
             // So we MUST trigger the cleanup here.
             // We'll call leaveSession for that user.
             // To avoid 10 people calling it, maybe we check if we are the "leader" (e.g. moderator)?
             if (viewerIsModerator) {
               leaveSessionApi(session.id, payload.participantId).catch(console.error);
             }
          }
          refreshSession();
        } else {
          // For now, we simply refresh the session on ANY relevant event
          refreshSession();
        }
      }
    },
    [session.id, refreshSession, logDebug, viewerAccountId, viewerIsModerator]
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
    let timeout: ReturnType<typeof setTimeout> | null = null;

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
  const [applyValue, setApplyValue] = useState<string>("");
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
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
    async (
      action: () => Promise<unknown>,
      errorMessage: string,
      requireModerator = true
    ): Promise<boolean> => {
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

  const handleCardSelect = (value: string) => {
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

  const changeIssue = (nextIndex: number) => {
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

  if (session.status === "waiting") {
    return (
      <WaitingRoom
        data={data}
        viewerAccountId={viewerAccountId}
        onSessionUpdate={onSessionData}
      />
    );
  }

  return (
    <div className="session-layout">
      <div className="session-top-bar">
        <button className="text-button" type="button" onClick={onBack}>
          ← Sessions
        </button>
        <span className="session-name">{session.name}</span>
        {realtimeStatus !== "connected" && (
          <>
            <span className="meta-text" role="status">
              {realtimeStatus === "disabled"
                ? "Realtime relay unavailable – falling back to polling"
                : realtimeStatus === "error"
                ? "Realtime connection lost – retrying"
                : "Connecting to relay…"}
            </span>
            {(realtimeStatus === "disabled" || realtimeStatus === "error") && (
              <button
                type="button"
                className="secondary"
                onClick={() => refreshSession()}
              >
                Refresh now
              </button>
            )}
          </>
        )}
      </div>
      <div className="filters-bar">
        <label htmlFor="jql-input">JQL Filter</label>
        <input
          id="jql-input"
          type="text"
          value={jqlDraft}
          onChange={(event) => setJqlDraft(event.target.value)}
          placeholder='e.g. project = "SCRUM" AND statusCategory != Done ORDER BY updated DESC'
        />
        <button
          className="secondary"
          type="button"
          onClick={handleApplyJql}
          disabled={isFetchingIssues}
        >
          {isFetchingIssues ? "Updating…" : "Update list"}
        </button>
      </div>
      <p className="meta-text">
        Current query: {appliedJql || "None (default project filter)"}
      </p>
      {actionError && <p className="error-text">{actionError}</p>}
      {issuesError && <p className="error-text">{issuesError}</p>}
      <IssuePanel
        issue={currentIssue}
        index={currentIssueIndex}
        total={issues.length}
        onPrevious={handlePrevIssue}
        onNext={handleNextIssue}
        onReveal={handleReveal}
        onResetVotes={handleRevote}
        onAdvanceIssue={handleAdvance}
        isRevealed={isRevealed}
        disableReveal={!everyoneHasVoted || isSubmittingAction}
        disableNext={currentIssueIndex === issues.length - 1}
        isLoading={isFetchingIssues}
        canControl={viewerIsModerator}
        isBusy={isSubmittingAction}
      />

      {currentIssue ? (
        <div className="session-grid">
          <ParticipantsList
            participants={participants}
            votes={optimisticVotes}
            isRevealed={isRevealed}
          />
          <div className="session-side">
            <Deck
              values={session.deckValues}
              selectedValue={
                localParticipantId
                  ? optimisticVotes[localParticipantId]?.value ?? null
                  : null
              }
              onSelect={handleCardSelect}
              disabled={isRevealed || isSubmittingAction}
              isRevealed={isRevealed}
            />
            {isRevealed && (
              <section className="results-panel">
                <header className="panel-heading">
                  <h3>Vote results</h3>
                  <span className="meta-text">Visible to everyone</span>
                </header>
                <dl className="results-grid">
                  <div>
                    <dt>Average</dt>
                    <dd>{stats.average}</dd>
                  </div>
                  <div>
                    <dt>Median</dt>
                    <dd>{stats.median}</dd>
                  </div>
                  <div>
                    <dt>Min</dt>
                    <dd>{stats.min}</dd>
                  </div>
                  <div>
                    <dt>Max</dt>
                    <dd>{stats.max}</dd>
                  </div>
                </dl>
                {viewerIsModerator && (
                  <div className="apply-estimate">
                    <header>
                      <h4>Apply estimate to Jira</h4>
                      {!projectConfig?.estimateFieldId && (
                        <p className="error-text">
                          Configure an estimate field before applying.
                        </p>
                      )}
                    </header>
                    <div className="apply-estimate__chips">
                      {(projectConfig?.deckValues ?? session.deckValues).map(
                        (value) => (
                          <button
                            key={value}
                            type="button"
                            className={`chip ${
                              applyValue === value ? "chip--selected" : ""
                            }`}
                            onClick={() => {
                              setApplyMessage(null);
                              setApplyValue(value);
                            }}
                          >
                            {value}
                          </button>
                        )
                      )}
                    </div>
                    <label htmlFor="apply-estimate-input">Custom value</label>
                    <input
                      id="apply-estimate-input"
                      type="text"
                      value={applyValue}
                      onChange={(event) => {
                        setApplyMessage(null);
                        setApplyValue(event.target.value);
                      }}
                      placeholder={estimatedSuggestion || "Enter final value"}
                    />
                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        runAction(
                          async () => {
                            if (!currentIssue) return;
                            const valueToApply =
                              applyValue.trim() || estimatedSuggestion;
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
                            setApplyMessage("Estimate applied to Jira ✔");
                          },
                          "Unable to apply estimate.",
                          true
                        )
                      }
                      disabled={
                        isSubmittingAction ||
                        !applyValue ||
                        !projectConfig?.estimateFieldId
                      }
                    >
                      Apply to Jira
                    </button>
                    {applyMessage && (
                      <p className="success-text">{applyMessage}</p>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      ) : (
        <section className="empty-panel">
          <p>
            {isFetchingIssues
              ? "Loading issues…"
              : "No issues found for this session."}
          </p>
        </section>
      )}
    </div>
  );
}
