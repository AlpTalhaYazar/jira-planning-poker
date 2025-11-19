import api, { route, storage } from '@forge/api';
import { startsWith } from '@forge/storage';
import { randomUUID } from 'crypto';
import type { Participant, Session, DeckType, SessionSnapshot } from '../types/domain';
import { getIssueState, toIssueVoteSnapshot } from './votes';

const sessionKey = (sessionId: string) => `session:${sessionId}`;
const participantPrefixKey = (sessionId: string) => `session:${sessionId}:participant:`;
const participantKey = (sessionId: string, accountId: string) => `${participantPrefixKey(sessionId)}${accountId}`;
const projectSessionsKey = (projectKey: string) => `project:${projectKey}:sessions`;

export interface CreateSessionInput {
  projectKey: string;
  name: string;
  deckType: DeckType;
  deckValues: string[];
  creatorAccountId: string;
  jql?: string;
}

export interface SessionViewOptions {
  issueKeyOverride?: string;
  viewerAccountId?: string | null;
  includePrivateVotes?: boolean;
}

export const createSession = async (input: CreateSessionInput): Promise<SessionSnapshot> => {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const session: Session = {
    id,
    name: input.name,
    projectKey: input.projectKey,
    creatorAccountId: input.creatorAccountId,
    createdAt,
    status: 'active',
    deckType: input.deckType,
    deckValues: input.deckValues,
    issueKeys: [],
    currentIssueKey: null,
    jql: input.jql,
  };

  await storage.set(sessionKey(id), session);
  await addSessionToProjectIndex(session.projectKey, session.id);

  const creatorProfile = await fetchCurrentUserProfile();
  const creatorParticipant: Participant = {
    accountId: creatorProfile.accountId,
    displayName: creatorProfile.displayName,
    avatarUrl: creatorProfile.avatarUrl,
    joinedAt: createdAt,
    lastSeenAt: createdAt,
    isModerator: true,
  };
  await saveParticipant(id, creatorParticipant);

  return buildSnapshot(session, [creatorParticipant], {
    viewerAccountId: creatorParticipant.accountId,
  });
};

export const listSessionsByProject = async (projectKey: string): Promise<Session[]> => {
  const key = projectSessionsKey(projectKey);
  const ids = ((await storage.get(key)) as string[]) ?? [];
  if (!ids.length) {
    return [];
  }

  const sessions = await Promise.all(ids.map(async (sessionId) => storage.get(sessionKey(sessionId)) as Promise<Session | undefined>));
  return sessions
    .filter((session): session is Session => Boolean(session))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getSession = async (
  sessionId: string,
  options: SessionViewOptions = {}
): Promise<SessionSnapshot | null> => {
  const session = (await storage.get(sessionKey(sessionId))) as Session | undefined;
  if (!session) {
    return null;
  }
  const participants = await listParticipants(sessionId);
  return buildSnapshot(session, participants, options);
};

export const joinSession = async (sessionId: string, issueKeyOverride?: string): Promise<SessionSnapshot> => {
  const profile = await fetchCurrentUserProfile();
  const viewOptions: SessionViewOptions = {
    issueKeyOverride,
    viewerAccountId: profile.accountId,
  };
  const existing = await getSession(sessionId, viewOptions);
  if (!existing) {
    throw new Error('Session not found');
  }

  const now = new Date().toISOString();
  const participants = [...existing.participants];
  const existingParticipant = participants.find((p) => p.accountId === profile.accountId);

  if (existingParticipant) {
    existingParticipant.lastSeenAt = now;
    await saveParticipant(sessionId, existingParticipant);
  } else {
    const newParticipant: Participant = {
      accountId: profile.accountId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      joinedAt: now,
      lastSeenAt: now,
      isModerator: false,
    };
    participants.push(newParticipant);
    await saveParticipant(sessionId, newParticipant);
  }

  const latestParticipants = await listParticipants(sessionId);
  return buildSnapshot(existing.session, latestParticipants, viewOptions);
};

export const leaveSession = async (sessionId: string, accountId: string): Promise<void> => {
  await deleteParticipant(sessionId, accountId);
};

const addSessionToProjectIndex = async (projectKey: string, sessionId: string): Promise<void> => {
  const key = projectSessionsKey(projectKey);
  const existing = ((await storage.get(key)) as string[]) ?? [];
  const filtered = existing.filter((id) => id !== sessionId);
  await storage.set(key, [sessionId, ...filtered]);
};

interface JiraUserResponse {
  accountId?: string;
  displayName?: string;
  avatarUrls?: Record<string, string>;
}

const fetchCurrentUserProfile = async (): Promise<{ accountId: string; displayName: string; avatarUrl: string }> => {
  const response = await api.asUser().requestJira(route`/rest/api/3/myself`);
  if (!response.ok) {
    throw new Error(`Failed to resolve current user profile (${response.status})`);
  }
  const data = (await response.json()) as JiraUserResponse;
  if (!data.accountId) {
    throw new Error('Current user profile missing accountId');
  }
  return {
    accountId: data.accountId,
    displayName: data.displayName ?? 'Unknown teammate',
    avatarUrl: data.avatarUrls?.['48x48'] ?? '',
  };
};

export const setCurrentIssueKey = async (
  sessionId: string,
  issueKey: string | null,
  options: SessionViewOptions = {}
): Promise<SessionSnapshot> => {
  const session = (await storage.get(sessionKey(sessionId))) as Session | undefined;
  if (!session) {
    throw new Error('Session not found');
  }
  session.currentIssueKey = issueKey;
  await storage.set(sessionKey(sessionId), session);
  const participants = await listParticipants(sessionId);
  return buildSnapshot(session, participants, { ...options, issueKeyOverride: issueKey ?? undefined });
};

const buildSnapshot = async (
  session: Session,
  participants: Participant[],
  options: SessionViewOptions = {}
): Promise<SessionSnapshot> => {
  const issueKey = resolveIssueKey(session, participants, options);
  const currentIssueState = issueKey ? await getIssueState(session.id, issueKey) : null;
  return {
    session,
    participants,
    currentIssueState: currentIssueState
      ? toIssueVoteSnapshot(currentIssueState, options.viewerAccountId, options.includePrivateVotes)
      : null,
  };
};

const resolveIssueKey = (
  session: Session,
  participants: Participant[],
  options: SessionViewOptions
): string | null => {
  if (options.issueKeyOverride) {
    if (options.includePrivateVotes) {
      return options.issueKeyOverride;
    }
    if (options.viewerAccountId) {
      const viewer = participants.find((participant) => participant.accountId === options.viewerAccountId);
      if (viewer?.isModerator) {
        return options.issueKeyOverride;
      }
    }
  }
  return session.currentIssueKey;
};


const saveParticipant = async (sessionId: string, participant: Participant): Promise<void> => {
  await storage.set(participantKey(sessionId, participant.accountId), participant);
};

const deleteParticipant = async (sessionId: string, accountId: string): Promise<void> => {
  await storage.delete(participantKey(sessionId, accountId));
};

const listParticipants = async (sessionId: string): Promise<Participant[]> => {
  const prefix = participantPrefixKey(sessionId);
  const participants: Participant[] = [];
  let cursor: string | undefined;
  do {
    let query = storage.query().where('key', startsWith(prefix)).limit(50);
    if (cursor) {
      query = query.cursor(cursor);
    }
    const { results, nextCursor } = await query.getMany();
    participants.push(...results.map((record) => record.value as Participant));
    cursor = nextCursor;
  } while (cursor);

  return participants.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
};
