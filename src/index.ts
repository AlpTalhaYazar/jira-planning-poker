import Resolver from '@forge/resolver';
import type { Vote } from './types/domain';
import { getIssuesForProject, applyEstimate as applyEstimateRequest } from './api/jira';
import {
  createSession,
  getSession as getSessionRecord,
  joinSession,
  leaveSession,
  listSessionsByProject,
  setCurrentIssueKey,
} from './api/sessions';
import { recordVote, clearVotes, setIssueRevealState } from './api/votes';
import { getProjectConfig, setProjectConfig } from './api/config';
import { generateRelayToken, isRelayEnabled, publishRelayEvent } from './api/realtime';

const resolver = new Resolver();

resolver.define('healthcheck', async () => ({
  app: 'planning-poker',
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

resolver.define('getIssuesForProject', async (req) => {
  const { projectKey, jql, maxResults } = req.payload ?? {};
  return getIssuesForProject({
    projectKey,
    jql,
    maxResults,
  });
});

resolver.define('createSession', async (req) => {
  const { projectKey, name, deckType, deckValues, jql } = req.payload ?? {};
  const creatorAccountId = req.context?.accountId;
  if (!projectKey || !name || !deckType || !deckValues || !creatorAccountId) {
    throw new Error('Missing required fields to create a session');
  }
  const snapshot = await createSession({
    projectKey,
    name,
    deckType,
    deckValues,
    creatorAccountId,
    jql,
  });
  return snapshot;
});

resolver.define('listSessionsByProject', async (req) => {
  const { projectKey } = req.payload ?? {};
  if (!projectKey) {
    throw new Error('projectKey is required');
  }
  return listSessionsByProject(projectKey);
});

resolver.define('joinSession', async (req) => {
  const { sessionId, issueKey } = req.payload ?? {};
  const accountId = req.context?.accountId;
  if (!sessionId) {
    throw new Error('sessionId is required');
  }
  const snapshot = await joinSession(sessionId, issueKey);
  if (accountId) {
    const participant = snapshot.participants.find((p) => p.accountId === accountId);
    if (participant) {
      await publishRelayEvent({
        sessionId,
        event: 'session.joined',
        payload: {
          participantId: participant.accountId,
          displayName: participant.displayName,
        },
      });
    }
  }
  return snapshot;
});

resolver.define('leaveSession', async (req) => {
  const { sessionId } = req.payload ?? {};
  const accountId = req.context?.accountId;
  if (!sessionId || !accountId) {
    throw new Error('sessionId and accountId are required');
  }
  await leaveSession(sessionId, accountId);
  await publishRelayEvent({ sessionId, event: 'participant.left', payload: { participantId: accountId } });
  return { ok: true };
});

resolver.define('getSession', async (req) => {
  const { sessionId, issueKey } = req.payload ?? {};
  if (!sessionId) {
    throw new Error('sessionId is required');
  }
  const session = await getSessionRecord(sessionId, issueKey);
  if (!session) {
    throw new Error('Session not found');
  }
  return session;
});

resolver.define('castVote', async (req) => {
  const { sessionId, issueKey, value } = req.payload ?? {};
  const accountId = req.context?.accountId;
  if (!sessionId || !issueKey || !value || !accountId) {
    throw new Error('sessionId, issueKey, value, and accountId are required');
  }
  const session = await getSessionRecord(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  const isParticipant = session.participants.some((participant) => participant.accountId === accountId);
  if (!isParticipant) {
    throw new Error('You must join the session before voting.');
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
    event: 'vote.cast',
    payload: { issueKey, participantId: accountId, value },
  });
  return state;
});

resolver.define('clearVotes', async (req) => {
  const { sessionId, issueKey } = req.payload ?? {};
  const accountId = req.context?.accountId;
  if (!sessionId || !issueKey || !accountId) {
    throw new Error('sessionId, issueKey, and accountId are required');
  }
  const state = await clearVotes(sessionId, issueKey);
  await publishRelayEvent({ sessionId, event: 'votes.cleared', payload: { issueKey, actorId: accountId } });
  return state;
});

resolver.define('revealIssue', async (req) => {
  const { sessionId, issueKey } = req.payload ?? {};
  const accountId = req.context?.accountId;
  if (!sessionId || !issueKey || !accountId) {
    throw new Error('sessionId, issueKey, and accountId are required');
  }
  const state = await setIssueRevealState(sessionId, issueKey, true);
  await publishRelayEvent({ sessionId, event: 'issue.revealed', payload: { issueKey, actorId: accountId } });
  return state;
});

resolver.define('setCurrentIssue', async (req) => {
  const { sessionId, issueKey } = req.payload ?? {};
  const accountId = req.context?.accountId;
  if (!sessionId || !issueKey || !accountId) {
    throw new Error('sessionId, issueKey, and accountId are required');
  }
  const snapshot = await getSessionRecord(sessionId);
  if (!snapshot) {
    throw new Error('Session not found');
  }
  const participant = snapshot.participants.find((p) => p.accountId === accountId);
  if (!participant || !participant.isModerator) {
    throw new Error('Only moderators can change the current issue.');
  }
  const previousIssue = snapshot.session.currentIssueKey ?? undefined;
  const updatedSnapshot = await setCurrentIssueKey(sessionId, issueKey);
  await publishRelayEvent({
    sessionId,
    event: 'issue.advance',
    payload: {
      fromIssueKey: previousIssue ?? undefined,
      toIssueKey: issueKey,
      actorId: accountId,
    },
  });
  return updatedSnapshot;
});

resolver.define('getProjectConfig', async (req) => {
  const { projectKey } = req.payload ?? {};
  if (!projectKey) {
    throw new Error('projectKey is required');
  }
  return getProjectConfig(projectKey);
});

resolver.define('setProjectConfig', async (req) => {
  const { projectKey, estimateFieldId, deckType, deckValues, defaultJql } = req.payload ?? {};
  if (!projectKey || !deckType) {
    throw new Error('projectKey and deckType are required');
  }
  return setProjectConfig({
    projectKey,
    estimateFieldId,
    deckType,
    deckValues,
    defaultJql,
  });
});

resolver.define('applyEstimate', async (req) => {
  const { sessionId, issueKey, value } = req.payload ?? {};
  const accountId = req.context?.accountId;
  if (!sessionId || !issueKey || !value || !accountId) {
    throw new Error('sessionId, issueKey, value, and accountId are required');
  }
  const snapshot = await getSessionRecord(sessionId);
  if (!snapshot) {
    throw new Error('Session not found');
  }
  const participant = snapshot.participants.find((p) => p.accountId === accountId);
  if (!participant || !participant.isModerator) {
    throw new Error('Only moderators can apply estimates.');
  }
  const config = await getProjectConfig(snapshot.session.projectKey);
  if (!config.estimateFieldId) {
    throw new Error('No estimate field configured for this project.');
  }
  return applyEstimateRequest({ sessionId, issueKey, value }, config.estimateFieldId);
});

resolver.define('getRealtimeToken', async (req) => {
  const { sessionId } = req.payload ?? {};
  const accountId = req.context?.accountId;
  if (!sessionId || !accountId) {
    throw new Error('sessionId and accountId are required');
  }
  if (!isRelayEnabled()) {
    console.log('[Realtime] Relay not configured, returning null token');
    return {
      token: null,
      relayUrl: null,
      expiresAt: null,
    };
  }
  const snapshot = await getSessionRecord(sessionId);
  if (!snapshot) {
    throw new Error('Session not found');
  }
  const isParticipant = snapshot.participants.some((participant) => participant.accountId === accountId);
  if (!isParticipant) {
    throw new Error('You must join the session before requesting a realtime token.');
  }
  const token = generateRelayToken(sessionId, accountId);
  console.log('[Realtime] Issued token', {
    sessionId,
    accountId,
    relayUrl: token.relayUrl,
    expiresAt: token.expiresAt,
  });
  return token;
});

export const handler = resolver.getDefinitions();
