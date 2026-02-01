import Resolver from "@forge/resolver";
import type { Vote } from "./types/domain";
import {
  getIssuesForProject,
  getIssue,
  applyEstimate as applyEstimateRequest,
} from "./api/jira";
import {
  createSession,
  getSession as getSessionRecord,
  joinSession,
  leaveSession,
  listSessionsByProject,
  setCurrentIssueKey,
  updateSessionBacklog,
  getUserActiveSession,
  startSession,
  toggleReady,
  pauseSession,
  resumeSession,
  completeSession,
  updateSessionSettings,
} from "./api/sessions";
import {
  recordVote,
  clearVotes,
  setIssueRevealState,
  toIssueVoteSnapshot,
  updateVote,
  retractVote,
  skipIssue,
} from "./api/votes";

import { getProjectConfig, setProjectConfig } from "./api/config";
import {
  generateRelayToken,
  isRelayEnabled,
  publishRelayEvent,
} from "./api/realtime";
import { canEditProjectConfig } from "./services/projectPermissions";
import { logger } from "./utils/logger";
import { ContextService } from "./services/contextService";

const resolver = new Resolver();

resolver.define("healthcheck", async () => ({
  app: "planning-poker",
  status: "ok",
  timestamp: new Date().toISOString(),
}));

resolver.define("getIssuesForProject", async (req) => {
  const ctx = new ContextService(req);
  const { projectKey, jql, maxResults } = req.payload ?? {};
  const resolvedProjectKey = ctx.assertProjectKey(projectKey);
  const config = await getProjectConfig(resolvedProjectKey);
  return getIssuesForProject({
    projectKey: resolvedProjectKey,
    jql,
    maxResults,
    estimateFieldId: config.estimateFieldId,
  });
});

resolver.define("getIssue", async (req) => {
  const { issueKey } = req.payload ?? {};
  if (!issueKey) {
    throw new Error("issueKey is required");
  }
  return getIssue(issueKey);
});

resolver.define("createSession", async (req) => {
  const ctx = new ContextService(req);
  const { projectKey, name, deckType, deckValues, jql } = req.payload ?? {};
  const creatorAccountId = ctx.getAccountId();
  if (!projectKey || !name || !deckType || !deckValues) {
    throw new Error("Missing required fields to create a session");
  }
  const resolvedProjectKey = ctx.assertProjectKey(projectKey);
  const snapshot = await createSession({
    projectKey: resolvedProjectKey,
    name,
    deckType,
    deckValues,
    creatorAccountId,
    jql,
  });
  return snapshot;
});

resolver.define("listSessionsByProject", async (req) => {
  const ctx = new ContextService(req);
  const { projectKey } = req.payload ?? {};
  const resolvedProjectKey = ctx.assertProjectKey(projectKey);
  return listSessionsByProject(resolvedProjectKey);
});

resolver.define("joinSession", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKey } = req.payload ?? {};
  const accountId = ctx.getOptionalAccountId();
  if (!sessionId) {
    throw new Error("sessionId is required");
  }
  const existing = await getSessionRecord(sessionId);
  if (!existing) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(existing.session.projectKey);
  const snapshot = await joinSession(sessionId, issueKey);
  if (accountId) {
    const participant = snapshot.participants.find(
      (p) => p.accountId === accountId
    );
    if (participant) {
      await publishRelayEvent({
        sessionId,
        event: 'participant.joined',
        payload: {
          participantId: participant.accountId,
          displayName: participant.displayName,
        },
      });
    }
  }
  return snapshot;
});

resolver.define("leaveSession", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, accountId: targetAccountId } = req.payload ?? {};
  const callerAccountId = ctx.getAccountId();
  if (!sessionId) {
    throw new Error("sessionId is required");
  }
  const snapshot = await getSessionRecord(sessionId);
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);

  // If targetAccountId is provided, we are removing someone else.
  // We should probably check if the caller is a moderator or if it's a "cleanup" operation.
  // For now, to solve the "zombie" issue, we allow any participant to remove a disconnected user
  // if they received a "participant.left" event (which implies the user is gone).
  // Ideally we would verify the "left" status, but we trust the client for now.
  // If targetAccountId is NOT provided, we remove the caller.
  
  const accountIdToRemove = targetAccountId || callerAccountId;

  await leaveSession(sessionId, accountIdToRemove);
  await publishRelayEvent({
    sessionId,
    event: "participant.left",
    payload: { participantId: accountIdToRemove },
  });
  return { ok: true };
});

resolver.define("getSession", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKey } = req.payload ?? {};
  const accountId = ctx.getOptionalAccountId();
  if (!sessionId) {
    throw new Error("sessionId is required");
  }
  const session = await getSessionRecord(sessionId, {
    issueKeyOverride: issueKey,
    viewerAccountId: accountId,
  });
  if (!session) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(session.session.projectKey);
  return session;
});

resolver.define("castVote", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKey, value } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId || !issueKey || !value) {
    throw new Error("sessionId, issueKey, value, and accountId are required");
  }
  const session = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!session) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(session.session.projectKey);
  const isParticipant = session.participants.some(
    (participant) => participant.accountId === accountId
  );
  if (!isParticipant) {
    throw new Error("You must join the session before voting.");
  }

  const hasExistingVote =
    session.currentIssueState?.issueKey === issueKey &&
    session.currentIssueState.votes?.[accountId]?.hasVoted;
  if (hasExistingVote && !session.session.allowChangeVote) {
    throw new Error("Vote changes are not allowed for this session.");
  }

  const vote: Vote = {
    sessionId,
    issueKey,
    accountId,
    value,
    createdAt: new Date().toISOString(),
  };
  const state = await recordVote(sessionId, vote);
  await publishRelayEvent({
    sessionId,
    event: "vote.cast",
    payload: { issueKey, participantId: accountId },
  });
  return toIssueVoteSnapshot(state, accountId);
});

resolver.define("clearVotes", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKey } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId || !issueKey) {
    throw new Error("sessionId, issueKey, and accountId are required");
  }
  const session = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!session) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(session.session.projectKey);
  const state = await clearVotes(sessionId, issueKey);
  await publishRelayEvent({
    sessionId,
    event: "votes.cleared",
    payload: { issueKey, actorId: accountId },
  });
  return toIssueVoteSnapshot(state, accountId);
});

resolver.define("revealIssue", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKey } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId || !issueKey) {
    throw new Error("sessionId, issueKey, and accountId are required");
  }
  const session = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!session) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(session.session.projectKey);
  const participant = session.participants.find(
    (p) => p.accountId === accountId
  );
  if (!participant?.isModerator) {
    throw new Error("Only moderators can reveal votes.");
  }
  const state = await setIssueRevealState(sessionId, issueKey, true);
  await publishRelayEvent({
    sessionId,
    event: "issue.revealed",
    payload: { issueKey, actorId: accountId },
  });
  return toIssueVoteSnapshot(state, accountId);
});

resolver.define("setCurrentIssue", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKey } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId || !issueKey) {
    throw new Error("sessionId, issueKey, and accountId are required");
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const participant = snapshot.participants.find(
    (p) => p.accountId === accountId
  );
  if (!participant || !participant.isModerator) {
    throw new Error("Only moderators can change the current issue.");
  }
  const previousIssue = snapshot.session.currentIssueKey ?? undefined;
  const updatedSnapshot = await setCurrentIssueKey(sessionId, issueKey, {
    viewerAccountId: accountId,
  });
  await publishRelayEvent({
    sessionId,
    event: "issue.advance",
    payload: {
      fromIssueKey: previousIssue ?? undefined,
      toIssueKey: issueKey,
      actorId: accountId,
    },
  });
  return updatedSnapshot;
});

resolver.define("updateSessionBacklog", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKeys, jql } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId || !Array.isArray(issueKeys)) {
    throw new Error("sessionId, issueKeys, and accountId are required");
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const participant = snapshot.participants.find(
    (p) => p.accountId === accountId
  );
  if (!participant?.isModerator) {
    throw new Error("Only moderators can update the backlog.");
  }
  const normalizedIssueKeys = (issueKeys as unknown[]).filter(
    (key): key is string => typeof key === "string" && Boolean(key)
  );
  await updateSessionBacklog(sessionId, normalizedIssueKeys, jql);
  await publishRelayEvent({
    sessionId,
    event: "session.backlogUpdated",
    payload: {
      issueCount: normalizedIssueKeys.length,
      actorId: accountId,
    },
  });
  return { ok: true };
});

resolver.define("getProjectConfig", async (req) => {
  const ctx = new ContextService(req);
  const { projectKey } = req.payload ?? {};
  const resolvedProjectKey = ctx.assertProjectKey(projectKey);
  const config = await getProjectConfig(resolvedProjectKey);
  const canEdit = ctx.getOptionalAccountId()
    ? await canEditProjectConfig(resolvedProjectKey)
    : false;
  return { ...config, canEdit };
});

resolver.define("setProjectConfig", async (req) => {
  const ctx = new ContextService(req);
  const { projectKey, estimateFieldId, deckType, deckValues, defaultJql } =
    req.payload ?? {};
  if (!projectKey || !deckType) {
    throw new Error("projectKey and deckType are required");
  }
  const resolvedProjectKey = ctx.assertProjectKey(projectKey);
  await ctx.requireProjectAdmin(resolvedProjectKey);
  const updated = await setProjectConfig({
    projectKey: resolvedProjectKey,
    estimateFieldId,
    deckType,
    deckValues,
    defaultJql,
  });
  return { ...updated, canEdit: true };
});

resolver.define("applyEstimate", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKey, value } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId || !issueKey || !value) {
    throw new Error("sessionId, issueKey, value, and accountId are required");
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const participant = snapshot.participants.find(
    (p) => p.accountId === accountId
  );
  if (!participant || !participant.isModerator) {
    throw new Error("Only moderators can apply estimates.");
  }
  const config = await getProjectConfig(snapshot.session.projectKey);
  if (!config.estimateFieldId) {
    throw new Error("No estimate field configured for this project.");
  }
  return applyEstimateRequest(
    { sessionId, issueKey, value },
    config.estimateFieldId
  );
});

resolver.define("getRealtimeToken", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId) {
    throw new Error("sessionId and accountId are required");
  }
  if (!isRelayEnabled()) {
    logger.info("[Realtime] Relay not configured, returning null token");
    return {
      token: null,
      relayUrl: null,
      expiresAt: null,
    };
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const isParticipant = snapshot.participants.some(
    (participant) => participant.accountId === accountId
  );
  if (!isParticipant) {
    throw new Error(
      "You must join the session before requesting a realtime token."
    );
  }
  const token = generateRelayToken(sessionId, accountId);
  logger.info("[Realtime] Issued token", {
    sessionId,
    accountId,
    relayUrl: token.relayUrl,
    expiresAt: token.expiresAt,
  });
  return token;
});

resolver.define("getUserActiveSession", async (req) => {
  const ctx = new ContextService(req);
  const accountId = ctx.getAccountId();
  const sessionId = await getUserActiveSession(accountId);
  return { sessionId, accountId };
});

resolver.define("startSession", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId) {
    throw new Error("sessionId is required");
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const participant = snapshot.participants.find(
    (p) => p.accountId === accountId
  );
  if (!participant?.isModerator) {
    throw new Error("Only moderators can start the session.");
  }
  const updatedSession = await startSession(sessionId);
  await publishRelayEvent({
    sessionId,
    event: "session.started",
    payload: { actorId: accountId },
  });
  return updatedSession;
});

resolver.define("toggleReady", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, isReady } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId) {
    throw new Error("sessionId is required");
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const updatedSession = await toggleReady(sessionId, accountId, !!isReady);
  await publishRelayEvent({
    sessionId,
    event: "participant.ready",
    payload: { participantId: accountId, isReady: !!isReady },
  });
  return updatedSession;
});

resolver.define("pauseSession", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId) {
    throw new Error("sessionId is required");
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const participant = snapshot.participants.find(
    (p) => p.accountId === accountId
  );
  if (!participant?.isModerator) {
    throw new Error("Only moderators can pause the session.");
  }
  const updatedSession = await pauseSession(sessionId);
  await publishRelayEvent({
    sessionId,
    event: "session.paused",
    payload: { actorId: accountId },
  });
  return updatedSession;
});

resolver.define("resumeSession", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId) {
    throw new Error("sessionId is required");
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const participant = snapshot.participants.find(
    (p) => p.accountId === accountId
  );
  if (!participant?.isModerator) {
    throw new Error("Only moderators can resume the session.");
  }
  const updatedSession = await resumeSession(sessionId);
  await publishRelayEvent({
    sessionId,
    event: "session.resumed",
    payload: { actorId: accountId },
  });
  return updatedSession;
});

resolver.define("completeSession", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId) {
    throw new Error("sessionId is required");
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const participant = snapshot.participants.find(
    (p) => p.accountId === accountId
  );
  if (!participant?.isModerator) {
    throw new Error("Only moderators can complete the session.");
  }
  const updatedSession = await completeSession(sessionId);
  
  // Calculate summary statistics
  const totalIssues = updatedSession.issueKeys.length;
  const estimatedIssues = updatedSession.completedIssueKeys.length;
  const duration = Math.floor(
    (new Date(updatedSession.updatedAt).getTime() -
      new Date(updatedSession.createdAt).getTime()) /
      1000
  );
  
  await publishRelayEvent({
    sessionId,
    event: "session.completed",
    payload: {
      completedAt: updatedSession.updatedAt,
      actorId: accountId,
      summary: {
        totalIssues,
        estimatedIssues,
        skippedIssues: totalIssues - estimatedIssues,
        duration,
      },
    },
  });
  return updatedSession;
});

resolver.define("updateSessionSettings", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, settings } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId || !settings) {
    throw new Error("sessionId and settings are required");
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const participant = snapshot.participants.find(
    (p) => p.accountId === accountId
  );
  if (!participant?.isModerator) {
    throw new Error("Only moderators can update session settings.");
  }
  const updatedSession = await updateSessionSettings(sessionId, settings);
  await publishRelayEvent({
    sessionId,
    event: "session.settings.updated",
    payload: { actorId: accountId, settings },
  });
  return updatedSession;
});

resolver.define("updateVote", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKey, value, confidence, comment } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId || !issueKey || !value) {
    throw new Error("sessionId, issueKey, and value are required");
  }
  const session = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!session) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(session.session.projectKey);
  
  // Check if vote changes are allowed
  if (!session.session.allowChangeVote) {
    throw new Error("Vote changes are not allowed for this session");
  }
  
  const vote: Vote = {
    sessionId,
    issueKey,
    accountId,
    value,
    createdAt: new Date().toISOString(),
    confidence,
    comment,
  };
  const state = await updateVote(sessionId, vote);
  await publishRelayEvent({
    sessionId,
    event: "vote.updated",
    payload: {
      issueKey,
      participantId: accountId,
      newValue: value,
      updatedAt: new Date().toISOString(),
    },
  });
  return toIssueVoteSnapshot(state, accountId);
});

resolver.define("retractVote", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKey } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId || !issueKey) {
    throw new Error("sessionId and issueKey are required");
  }
  const session = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!session) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(session.session.projectKey);
  const state = await retractVote(sessionId, issueKey, accountId);
  await publishRelayEvent({
    sessionId,
    event: "vote.retracted",
    payload: { issueKey, participantId: accountId },
  });
  return toIssueVoteSnapshot(state, accountId);
});

resolver.define("skipIssue", async (req) => {
  const ctx = new ContextService(req);
  const { sessionId, issueKey, reason } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId || !issueKey) {
    throw new Error("sessionId and issueKey are required");
  }
  const snapshot = await getSessionRecord(sessionId, {
    viewerAccountId: accountId,
  });
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  const participant = snapshot.participants.find(
    (p) => p.accountId === accountId
  );
  if (!participant?.isModerator) {
    throw new Error("Only moderators can skip issues.");
  }
  const state = await skipIssue(sessionId, issueKey);
  await publishRelayEvent({
    sessionId,
    event: "issue.skipped",
    payload: { issueKey, actorId: accountId, reason },
  });
  return toIssueVoteSnapshot(state, accountId);
});

export const handler = resolver.getDefinitions();
