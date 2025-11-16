import Resolver from '@forge/resolver';
import { getIssuesForProject } from './api/jira';

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

export const handler = resolver.getDefinitions();
