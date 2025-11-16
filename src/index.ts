import Resolver from '@forge/resolver';
import { getIssuesForProject } from './api/jira';
import {
  createSession,
  getSession as getSessionRecord,
  joinSession,
  leaveSession,
  listSessionsByProject,
} from './api/sessions';

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
  const { sessionId } = req.payload ?? {};
  if (!sessionId) {
    throw new Error('sessionId is required');
  }
  return joinSession(sessionId);
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
  const { sessionId } = req.payload ?? {};
  if (!sessionId) {
    throw new Error('sessionId is required');
  }
  const session = await getSessionRecord(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  return session;
});

export const handler = resolver.getDefinitions();
