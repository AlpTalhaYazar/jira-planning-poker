import { beforeEach, describe, expect, it } from 'vitest';
import { createSession, joinSession, setCurrentIssueKey, updateSessionBacklog } from '../src/api/sessions';
import { recordVote, setIssueRevealState, getIssueState } from '../src/api/votes';
import { setProjectConfig } from '../src/api/config';
import { applyEstimate, getIssuesForProject } from '../src/api/jira';
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

describe('planning poker smoke flow', () => {
  beforeEach(() => {
    testingApi.reset();
  });

  it('creates a session, records votes, and applies an estimate', async () => {
    testingApi.enqueueMyselfResponse({
      accountId: 'creator',
      displayName: 'Creator',
      avatarUrls: { '48x48': 'creator.png' },
    });

    const snapshot = await createSession({
      projectKey: 'E2E',
      name: 'Smoke Session',
      deckType: 'fibonacci',
      deckValues: ['1', '2', '3', '5'],
      creatorAccountId: 'creator',
    });

    await setProjectConfig({
      projectKey: 'E2E',
      deckType: 'fibonacci',
      deckValues: ['1', '2', '3', '5'],
      estimateFieldId: 'customfield_10016',
    });

    testingApi.enqueueMyselfResponse({
      accountId: 'participant',
      displayName: 'Participant',
      avatarUrls: { '48x48': 'participant.png' },
    });

    await joinSession(snapshot.session.id);
    await setCurrentIssueKey(snapshot.session.id, 'E2E-1');
    await updateSessionBacklog(snapshot.session.id, ['E2E-1', 'E2E-2'], 'project = "E2E" ORDER BY updated DESC');

    await recordVote(snapshot.session.id, {
      sessionId: snapshot.session.id,
      issueKey: 'E2E-1',
      accountId: 'creator',
      value: '3',
      createdAt: new Date().toISOString(),
    });
    await recordVote(snapshot.session.id, {
      sessionId: snapshot.session.id,
      issueKey: 'E2E-1',
      accountId: 'participant',
      value: '5',
      createdAt: new Date().toISOString(),
    });

    await setIssueRevealState(snapshot.session.id, 'E2E-1', true);
    const revealed = await getIssueState(snapshot.session.id, 'E2E-1');
    expect(Object.keys(revealed.votes)).toHaveLength(2);
    expect(revealed.isRevealed).toBe(true);

    let capturedIssuePayload: any;
    testingApi.onUserRequest('/rest/api/3/search', async () =>
      buildResponse({
        issues: [
          {
            key: 'E2E-1',
            self: 'https://example.atlassian.net/rest/api/3/issue/1',
            fields: {
              summary: 'Example issue',
              status: { name: 'To Do' },
              customfield_10016: 3,
            },
          },
        ],
      })
    );
    const issues = await getIssuesForProject({ projectKey: 'E2E' });
    expect(issues[0].link).toMatch(/\/browse\/E2E-1$/);

    testingApi.onUserRequest(/\/rest\/api\/3\/issue\//, async (_url: string, init?: RequestInit) => {
      capturedIssuePayload = init?.body ? JSON.parse(init.body as string) : undefined;
      return buildResponse({});
    });
    await applyEstimate({ sessionId: snapshot.session.id, issueKey: 'E2E-1', value: '8' }, 'customfield_10016');
    expect(capturedIssuePayload.fields.customfield_10016).toBe(8);
  });
});
