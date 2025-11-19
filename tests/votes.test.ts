import { beforeEach, describe, expect, it } from 'vitest';
import { clearVotes, getIssueState, recordVote, setIssueRevealState } from '../src/api/votes';
import type { Vote } from '../src/types/domain';
import { getForgeTestingApi } from './setup';

const testingApi = getForgeTestingApi();

const buildVote = (overrides: Partial<Vote> = {}): Vote => ({
  sessionId: 'session-1',
  issueKey: 'ISSUE-123',
  accountId: 'user-1',
  value: '5',
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('votes storage', () => {
  beforeEach(() => {
    testingApi.reset();
  });

  it('records votes per participant and prevents updates after reveal', async () => {
    const firstVote = buildVote();
    const initialState = await recordVote(firstVote.sessionId, firstVote);
    expect(initialState.votes[firstVote.accountId]?.value).toEqual('5');
    expect(initialState.isRevealed).toBe(false);

    await setIssueRevealState(firstVote.sessionId, firstVote.issueKey, true);
    await expect(recordVote(firstVote.sessionId, buildVote({ value: '8' }))).rejects.toThrow(
      /already been revealed/
    );
  });

  it('clears votes and resets reveal state', async () => {
    const voteA = buildVote();
    const voteB = buildVote({ accountId: 'user-2', value: '8' });
    await recordVote(voteA.sessionId, voteA);
    await recordVote(voteB.sessionId, voteB);

    const cleared = await clearVotes(voteA.sessionId, voteA.issueKey);
    expect(cleared.votes).toEqual({});
    expect(cleared.isRevealed).toBe(false);

    const stored = await getIssueState(voteA.sessionId, voteA.issueKey);
    expect(stored.votes).toEqual({});
    expect(stored.isRevealed).toBe(false);
  });
});
