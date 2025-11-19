import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createForgeApiMock } from './helpers/forge-api-mock';

vi.mock('@forge/api', () => createForgeApiMock());

import api from '@forge/api';
import { createSession, getSession, joinSession } from '../src/api/sessions';
import type { CreateSessionInput } from '../src/api/sessions';

const testingApi = (api as typeof api & { __testing: any }).__testing;

describe('session participants storage', () => {
  beforeEach(() => {
    testingApi.reset();
  });

  const baseInput: CreateSessionInput = {
    projectKey: 'TEST',
    name: 'Demo Session',
    deckType: 'fibonacci',
    deckValues: ['1', '2', '3'],
    creatorAccountId: 'user-creator',
  };

  it('stores each participant under its own storage key to avoid lost joins', async () => {
    testingApi.enqueueMyselfResponse({
      accountId: 'user-creator',
      displayName: 'Creator',
      avatarUrls: { '48x48': 'creator.png' },
    });

    const snapshot = await createSession(baseInput);
    expect(snapshot.participants).toHaveLength(1);
    expect(snapshot.participants[0].accountId).toEqual('user-creator');

    testingApi.enqueueMyselfResponse({
      accountId: 'user-a',
      displayName: 'Teammate A',
      avatarUrls: { '48x48': 'a.png' },
    });

    testingApi.enqueueMyselfResponse({
      accountId: 'user-b',
      displayName: 'Teammate B',
      avatarUrls: { '48x48': 'b.png' },
    });

    await Promise.all([joinSession(snapshot.session.id), joinSession(snapshot.session.id)]);

    const updated = await getSession(snapshot.session.id);
    expect(updated).not.toBeNull();
    expect(updated?.participants).toHaveLength(3);
    expect(updated?.participants.map((p) => p.accountId)).toEqual(
      expect.arrayContaining(['user-creator', 'user-a', 'user-b'])
    );

    const participantKeys = testingApi.listKeys(`session:${snapshot.session.id}:participant:`);
    expect(participantKeys).toHaveLength(3);
  });
});
