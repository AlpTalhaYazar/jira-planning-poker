import { beforeEach, describe, expect, it } from 'vitest';
import type { RequestInit } from '@forge/api';
import { getIssuesForProject } from '../src/api/jira';
import { getForgeTestingApi } from './setup';

const testingApi = getForgeTestingApi();

const buildResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: {
    append() {},
    delete() {},
    get: () => null,
    has: () => false,
    set() {},
    forEach() {},
  },
  json: async () => body,
  text: async () => JSON.stringify(body),
  arrayBuffer: async () => new ArrayBuffer(0),
});

describe('Jira API integration', () => {
  beforeEach(() => {
    testingApi.reset();
  });

  it('calls the correct Jira endpoint when searching issues', async () => {
    let capturedMethod: string | undefined;
    let capturedBody: any;

    testingApi.onAppRequest('/rest/api/3/search', async (_url: string, init?: RequestInit) => {
      capturedMethod = init?.method;
      capturedBody = init?.body ? JSON.parse(init.body as string) : undefined;
      return buildResponse({
        issues: [
          {
            key: 'TEST-1',
            fields: {
              summary: 'My issue',
              status: { name: 'To Do' },
              customfield_10016: 3,
            },
          },
        ],
      });
    });

    const issues = await getIssuesForProject({ projectKey: 'TEST' });

    expect(capturedMethod).toBe('POST');
    expect(capturedBody.jql).toContain('project = "TEST"');
    expect(capturedBody.maxResults).toBeGreaterThan(0);
    expect(issues[0]).toMatchObject({ key: 'TEST-1', summary: 'My issue', estimate: '3' });
  });
});
