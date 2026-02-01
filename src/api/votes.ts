import { storage } from "@forge/api";
import { startsWith } from "@forge/storage";
import type { IssueVoteState, Vote, IssueVoteSnapshot } from "../types/domain";

const issueMetaKey = (sessionId: string, issueKey: string) =>
  `session:${sessionId}:issue:${issueKey}:meta`;
const voteKey = (sessionId: string, issueKey: string, accountId: string) =>
  `session:${sessionId}:issue:${issueKey}:vote:${accountId}`;
const votePrefix = (sessionId: string, issueKey: string) =>
  `session:${sessionId}:issue:${issueKey}:vote:`;

interface IssueStateRecord {
  isRevealed: boolean;
}

const defaultState = (sessionId: string, issueKey: string): IssueVoteState => ({
  sessionId,
  issueKey,
  isRevealed: false,
  skipped: false,
  votes: {},
});

const listVotes = async (
  sessionId: string,
  issueKey: string
): Promise<Record<string, Vote>> => {
  const votes: Record<string, Vote> = {};
  const prefix = votePrefix(sessionId, issueKey);
  let cursor: string | undefined;
  do {
    let query = storage.query().where("key", startsWith(prefix)).limit(50);
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

export const getIssueState = async (
  sessionId: string,
  issueKey: string
): Promise<IssueVoteState> => {
  const meta = ((await storage.get(issueMetaKey(sessionId, issueKey))) as
    | IssueStateRecord
    | undefined) ?? {
    isRevealed: false,
  };
  const votes = await listVotes(sessionId, issueKey);
  return {
    sessionId,
    issueKey,
    isRevealed: meta.isRevealed,
    skipped: false,
    votes,
  };
};

const persistMeta = async (
  sessionId: string,
  issueKey: string,
  meta: IssueStateRecord
) => {
  await storage.set(issueMetaKey(sessionId, issueKey), meta);
};

export const recordVote = async (
  sessionId: string,
  vote: Vote
): Promise<IssueVoteState> => {
  const state = await getIssueState(sessionId, vote.issueKey);
  if (state.isRevealed) {
    throw new Error("Votes have already been revealed for this issue.");
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

export const clearVotes = async (
  sessionId: string,
  issueKey: string
): Promise<IssueVoteState> => {
  const prefix = votePrefix(sessionId, issueKey);
  let cursor: string | undefined;
  do {
    let query = storage.query().where("key", startsWith(prefix)).limit(50);
    if (cursor) {
      query = query.cursor(cursor);
    }
    const { results, nextCursor } = await query.getMany();
    await Promise.all(results.map(({ key }) => storage.delete(key)));
    cursor = nextCursor;
  } while (cursor);
  const next = defaultState(sessionId, issueKey);
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
    sessionId,
    issueKey,
    isRevealed,
    skipped: false,
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

export const updateVote = async (
  sessionId: string,
  vote: Vote
): Promise<IssueVoteState> => {
  const state = await getIssueState(sessionId, vote.issueKey);
  if (state.isRevealed) {
    throw new Error("Cannot update vote after reveal");
  }
  
  const existingVote = state.votes[vote.accountId];
  if (!existingVote) {
    throw new Error("No existing vote to update");
  }
  
  const updatedVote: Vote = {
    ...vote,
    updatedAt: new Date().toISOString(),
  };
  
  await storage.set(voteKey(sessionId, vote.issueKey, vote.accountId), updatedVote);
  return {
    ...state,
    votes: {
      ...state.votes,
      [vote.accountId]: updatedVote,
    },
  };
};

export const retractVote = async (
  sessionId: string,
  issueKey: string,
  accountId: string
): Promise<IssueVoteState> => {
  const state = await getIssueState(sessionId, issueKey);
  if (state.isRevealed) {
    throw new Error("Cannot retract vote after reveal");
  }
  
  await storage.delete(voteKey(sessionId, issueKey, accountId));
  const remainingVotes = { ...state.votes };
  delete remainingVotes[accountId];
  
  return {
    ...state,
    votes: remainingVotes,
  };
};

export const skipIssue = async (
  sessionId: string,
  issueKey: string
): Promise<IssueVoteState> => {
  await persistMeta(sessionId, issueKey, { isRevealed: false });
  const state = await getIssueState(sessionId, issueKey);
  return {
    ...state,
    skipped: true,
  };
};

export interface ConsensusResult {
  hasConsensus: boolean;
  consensusValue?: string;
  consensusType?: "unanimous" | "majority" | "moderator-override";
  voteCounts: Record<string, number>;
}

export const detectConsensus = (votes: Record<string, Vote>): ConsensusResult => {
  const voteCounts: Record<string, number> = {};
  const voteList = Object.values(votes);
  
  if (voteList.length === 0) {
    return { hasConsensus: false, voteCounts };
  }
  
  // Count votes
  for (const vote of voteList) {
    voteCounts[vote.value] = (voteCounts[vote.value] || 0) + 1;
  }
  
  const uniqueValues = Object.keys(voteCounts);
  
  // Unanimous consensus
  if (uniqueValues.length === 1) {
    return {
      hasConsensus: true,
      consensusValue: uniqueValues[0],
      consensusType: "unanimous",
      voteCounts,
    };
  }
  
  // Majority consensus (more than 50%)
  const totalVotes = voteList.length;
  const sortedByCount = uniqueValues.sort((a, b) => voteCounts[b] - voteCounts[a]);
  const topValue = sortedByCount[0];
  const topCount = voteCounts[topValue];
  
  if (topCount > totalVotes / 2) {
    return {
      hasConsensus: true,
      consensusValue: topValue,
      consensusType: "majority",
      voteCounts,
    };
  }
  
  // No consensus
  return {
    hasConsensus: false,
    voteCounts,
  };
};

export const setConsensus = async (
  sessionId: string,
  issueKey: string,
  consensusValue: string,
  consensusType: "unanimous" | "majority" | "moderator-override"
): Promise<IssueVoteState> => {
  const state = await getIssueState(sessionId, issueKey);
  return {
    ...state,
    consensus: consensusValue,
    consensusType,
    consensusReachedAt: new Date().toISOString(),
  };
};
