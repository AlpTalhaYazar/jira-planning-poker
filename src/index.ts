import Resolver from "@forge/resolver";
import type { Vote } from "./types/domain";
import {
  getIssuesForProject,
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
} from "./api/sessions";
import {
  recordVote,
  clearVotes,
  setIssueRevealState,
  toIssueVoteSnapshot,
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
        event: "session.joined",
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
  const { sessionId } = req.payload ?? {};
  const accountId = ctx.getAccountId();
  if (!sessionId) {
    throw new Error("sessionId and accountId are required");
  }
  const snapshot = await getSessionRecord(sessionId);
  if (!snapshot) {
    throw new Error("Session not found");
  }
  ctx.ensureSessionAccess(snapshot.session.projectKey);
  await leaveSession(sessionId, accountId);
  await publishRelayEvent({
    sessionId,
    event: "participant.left",
    payload: { participantId: accountId },
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

export const handler = resolver.getDefinitions();
