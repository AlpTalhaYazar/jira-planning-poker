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
  return createSession({
    projectKey,
    name,
    deckType,
    deckValues,
    creatorAccountId,
    jql,
  });
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
  if (!sessionId) {
    throw new Error('sessionId is required');
  }
  return joinSession(sessionId, issueKey);
});

resolver.define('leaveSession', async (req) => {
  const { sessionId } = req.payload ?? {};
  const accountId = req.context?.accountId;
  if (!sessionId || !accountId) {
    throw new Error('sessionId and accountId are required');
  }
  await leaveSession(sessionId, accountId);
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
  return recordVote(sessionId, vote);
});

resolver.define('clearVotes', async (req) => {
  const { sessionId, issueKey } = req.payload ?? {};
  if (!sessionId || !issueKey) {
    throw new Error('sessionId and issueKey are required');
  }
  return clearVotes(sessionId, issueKey);
});

resolver.define('revealIssue', async (req) => {
  const { sessionId, issueKey } = req.payload ?? {};
  if (!sessionId || !issueKey) {
    throw new Error('sessionId and issueKey are required');
  }
  return setIssueRevealState(sessionId, issueKey, true);
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
  return setCurrentIssueKey(sessionId, issueKey);
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

export const handler = resolver.getDefinitions();
