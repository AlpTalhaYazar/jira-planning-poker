import { storage } from '@forge/api';
import type { IssueVoteState, Vote, IssueVoteSnapshot } from '../types/domain';
import { logger } from '../utils/logger';

const issueStateKey = (sessionId: string, issueKey: string) => `session:${sessionId}:issue:${issueKey}:state`;

interface IssueStateRecord {
  isRevealed: boolean;
  votes: Record<string, Vote>;
}

const isIssueStateRecord = (value: unknown): value is IssueStateRecord => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Partial<IssueStateRecord>;
  return typeof record.isRevealed === 'boolean' && typeof record.votes === 'object' && record.votes !== null;
};

const defaultState = (issueKey: string): IssueVoteState => ({
  issueKey,
  isRevealed: false,
  votes: {},
});

export const getIssueState = async (sessionId: string, issueKey: string): Promise<IssueVoteState> => {
  const stored = await storage.get(issueStateKey(sessionId, issueKey));
  if (!stored) {
    return defaultState(issueKey);
  }
  if (!isIssueStateRecord(stored)) {
    logger.warn('Ignoring malformed issue vote state', { sessionId, issueKey });
    return defaultState(issueKey);
  }
  return {
    issueKey,
    isRevealed: stored.isRevealed,
    votes: stored.votes ?? {},
  };
};

const persistIssueState = async (sessionId: string, state: IssueVoteState) => {
  const toStore: IssueStateRecord = {
    isRevealed: state.isRevealed,
    votes: state.votes,
  };
  await storage.set(issueStateKey(sessionId, state.issueKey), toStore);
};

export const recordVote = async (sessionId: string, vote: Vote): Promise<IssueVoteState> => {
  const state = await getIssueState(sessionId, vote.issueKey);
  if (state.isRevealed) {
    throw new Error('Votes have already been revealed for this issue.');
  }
  state.votes[vote.accountId] = vote;
  await persistIssueState(sessionId, state);
  return state;
};

export const clearVotes = async (sessionId: string, issueKey: string): Promise<IssueVoteState> => {
  const next = defaultState(issueKey);
  await persistIssueState(sessionId, next);
  return next;
};

export const setIssueRevealState = async (
  sessionId: string,
  issueKey: string,
  isRevealed: boolean
): Promise<IssueVoteState> => {
  const state = await getIssueState(sessionId, issueKey);
  state.isRevealed = isRevealed;
  await persistIssueState(sessionId, state);
  return state;
};

export const toIssueVoteSnapshot = (
  state: IssueVoteState,
  viewerAccountId?: string | null,
  includePrivateVotes = false
): IssueVoteSnapshot => {
  const shouldRevealValues = includePrivateVotes || state.isRevealed;
  const votes = Object.fromEntries(
    Object.entries(state.votes).map(([accountId, vote]) => {
      const revealValue = shouldRevealValues || accountId === viewerAccountId;
      return [
        accountId,
        {
          accountId,
          hasVoted: true,
          value: revealValue ? vote.value : undefined,
          createdAt: revealValue ? vote.createdAt : undefined,
        },
      ];
    })
  );

  return {
    issueKey: state.issueKey,
    isRevealed: state.isRevealed,
    votes,
  };
};
