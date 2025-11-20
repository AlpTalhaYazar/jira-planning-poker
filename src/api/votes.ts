import { storage } from '@forge/api';
import { startsWith } from '@forge/storage';
import type { IssueVoteState, Vote, IssueVoteSnapshot } from '../types/domain';

const issueMetaKey = (sessionId: string, issueKey: string) => `session:${sessionId}:issue:${issueKey}:meta`;
const voteKey = (sessionId: string, issueKey: string, accountId: string) =>
  `session:${sessionId}:issue:${issueKey}:vote:${accountId}`;
const votePrefix = (sessionId: string, issueKey: string) => `session:${sessionId}:issue:${issueKey}:vote:`;

interface IssueStateRecord {
  isRevealed: boolean;
}

const defaultState = (issueKey: string): IssueVoteState => ({
  issueKey,
  isRevealed: false,
  votes: {},
});

const listVotes = async (sessionId: string, issueKey: string): Promise<Record<string, Vote>> => {
  const votes: Record<string, Vote> = {};
  const prefix = votePrefix(sessionId, issueKey);
  let cursor: string | undefined;
  do {
    let query = storage.query().where('key', startsWith(prefix)).limit(50);
    if (cursor) {
      query = query.cursor(cursor);
    }
    const { results, nextCursor } = await query.getMany();
    results.forEach(({ key, value }) => {
      const accountId = key.substring(prefix.length);
      votes[accountId] = value as Vote;
    });
    cursor = nextCursor;
  } while (cursor);
  return votes;
};

export const getIssueState = async (sessionId: string, issueKey: string): Promise<IssueVoteState> => {
  const meta = ((await storage.get(issueMetaKey(sessionId, issueKey))) as IssueStateRecord | undefined) ?? {
    isRevealed: false,
  };
  const votes = await listVotes(sessionId, issueKey);
  return {
    issueKey,
    isRevealed: meta.isRevealed,
    votes,
  };
};

const persistMeta = async (sessionId: string, issueKey: string, meta: IssueStateRecord) => {
  await storage.set(issueMetaKey(sessionId, issueKey), meta);
};

export const recordVote = async (sessionId: string, vote: Vote): Promise<IssueVoteState> => {
  const state = await getIssueState(sessionId, vote.issueKey);
  if (state.isRevealed) {
    throw new Error('Votes have already been revealed for this issue.');
  }
  await storage.set(voteKey(sessionId, vote.issueKey, vote.accountId), vote);
  return {
    ...state,
    votes: {
      ...state.votes,
      [vote.accountId]: vote,
    },
  };
};

export const clearVotes = async (sessionId: string, issueKey: string): Promise<IssueVoteState> => {
  const prefix = votePrefix(sessionId, issueKey);
  let cursor: string | undefined;
  do {
    let query = storage.query().where('key', startsWith(prefix)).limit(50);
    if (cursor) {
      query = query.cursor(cursor);
    }
    const { results, nextCursor } = await query.getMany();
    await Promise.all(results.map(({ key }) => storage.delete(key)));
    cursor = nextCursor;
  } while (cursor);
  const next = defaultState(issueKey);
  await persistMeta(sessionId, issueKey, { isRevealed: next.isRevealed });
  return next;
};

export const setIssueRevealState = async (
  sessionId: string,
  issueKey: string,
  isRevealed: boolean
): Promise<IssueVoteState> => {
  await persistMeta(sessionId, issueKey, { isRevealed });
  const votes = await listVotes(sessionId, issueKey);
  return {
    issueKey,
    isRevealed,
    votes,
  };
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
