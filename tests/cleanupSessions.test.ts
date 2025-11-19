import { beforeEach, describe, expect, it } from 'vitest';
import { storage } from '@forge/api';
import { cleanupExpiredSessions } from '../src/tasks/cleanupSessions';
import { createSession } from '../src/api/sessions';
import type { CreateSessionInput } from '../src/api/sessions';
import { getForgeTestingApi } from './setup';

const testingApi = getForgeTestingApi();

describe('cleanupExpiredSessions', () => {
  beforeEach(() => {
    testingApi.reset();
    process.env.SESSION_TTL_DAYS = '1';
  });

  it('removes sessions older than the TTL and cleans up related keys', async () => {
    testingApi.enqueueMyselfResponse({
      accountId: 'cleanup-owner',
      displayName: 'Cleaner',
      avatarUrls: { '48x48': 'cleaner.png' },
    });

    const session = await createSession({
      projectKey: 'CLEAN',
      name: 'Old Session',
      deckType: 'fibonacci',
      deckValues: ['1', '2'],
      creatorAccountId: 'cleanup-owner',
    });

    const sessionId = session.session.id;
    await storage.set(`session:${sessionId}`, { ...session.session, createdAt: '2000-01-01T00:00:00.000Z' });
    const indexKey = `project:${session.session.projectKey}:sessions`;
    const indexEntries = testingApi.getValue(indexKey);
    indexEntries[0].createdAt = '2000-01-01T00:00:00.000Z';
    await storage.set(indexKey, indexEntries);

    await storage.set(`session:${sessionId}:participant:cleanup-owner`, {
      accountId: 'cleanup-owner',
      displayName: 'Cleaner',
      avatarUrl: '',
      joinedAt: '2000-01-01T00:00:00.000Z',
      lastSeenAt: '2000-01-01T00:00:00.000Z',
      isModerator: true,
    });
    await storage.set(`session:${sessionId}:issue:DEMO-1:state`, {
      isRevealed: false,
      votes: {},
    });

    await cleanupExpiredSessions();

    expect(testingApi.getValue(indexKey)).toEqual([]);
    expect(testingApi.getValue(`session:${sessionId}`)).toBeUndefined();
    expect(testingApi.getValue(`session:${sessionId}:participant:cleanup-owner`)).toBeUndefined();
    expect(testingApi.getValue(`session:${sessionId}:issue:DEMO-1:state`)).toBeUndefined();
  });
});
