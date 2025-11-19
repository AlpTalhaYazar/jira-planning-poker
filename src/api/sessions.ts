import api, { route, storage } from '@forge/api';
import { startsWith } from '@forge/storage';
import { randomUUID } from 'crypto';
import type { Participant, Session, DeckType, SessionSnapshot, SessionStatus } from '../types/domain';
import { logger } from '../utils/logger';
import { isParticipant, isSession, isStringArray } from '../utils/type-guards';
import { getIssueState, toIssueVoteSnapshot } from './votes';

const sessionKey = (sessionId: string) => `session:${sessionId}`;
const participantPrefixKey = (sessionId: string) => `session:${sessionId}:participant:`;
const participantKey = (sessionId: string, accountId: string) => `${participantPrefixKey(sessionId)}${accountId}`;
const projectSessionsKey = (projectKey: string) => `project:${projectKey}:sessions`;

export interface SessionListEntry {
  id: string;
  name: string;
  projectKey: string;
  createdAt: string;
  deckType: DeckType;
  deckValues: string[];
  status: SessionStatus;
  currentIssueKey: string | null;
  jql?: string;
}

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
  await addSessionToProjectIndex(session);

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

export const listSessionsByProject = async (projectKey: string): Promise<SessionListEntry[]> => {
  const { entries, hadLegacyEntries } = await loadProjectSessionEntries(projectKey);
  if (hadLegacyEntries) {
    await storage.set(projectSessionsKey(projectKey), entries);
  }
  return entries;
};

export const getSession = async (
  sessionId: string,
  options: SessionViewOptions = {}
): Promise<SessionSnapshot | null> => {
  const session = await readSessionRecord(sessionId);
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

const addSessionToProjectIndex = async (session: Session): Promise<void> => {
  const { entries } = await loadProjectSessionEntries(session.projectKey);
  const next: SessionListEntry[] = [toSessionListEntry(session), ...entries.filter((entry) => entry.id !== session.id)];
  await storage.set(projectSessionsKey(session.projectKey), next);
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
  const session = await readSessionRecord(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  session.currentIssueKey = issueKey;
  await storage.set(sessionKey(sessionId), session);
  await addSessionToProjectIndex(session);
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
    for (const record of results) {
      if (isParticipant(record.value)) {
        participants.push(record.value);
      } else {
        logger.warn('Skipping malformed participant record', { sessionId, key: record.key });
      }
    }
    cursor = nextCursor;
  } while (cursor);

  return participants.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
};

const toSessionListEntry = (session: Session): SessionListEntry => ({
  id: session.id,
  name: session.name,
  projectKey: session.projectKey,
  createdAt: session.createdAt,
  deckType: session.deckType,
  deckValues: session.deckValues,
  status: session.status,
  currentIssueKey: session.currentIssueKey,
  jql: session.jql,
});

const isSessionListEntry = (value: unknown): value is SessionListEntry => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Partial<SessionListEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.projectKey === 'string' &&
    typeof entry.createdAt === 'string' &&
    typeof entry.deckType === 'string' &&
    typeof entry.status === 'string' &&
    isStringArray(entry.deckValues) &&
    (typeof entry.currentIssueKey === 'string' || entry.currentIssueKey === null) &&
    (entry.jql === undefined || typeof entry.jql === 'string')
  );
};

const loadProjectSessionEntries = async (
  projectKey: string
): Promise<{ entries: SessionListEntry[]; hadLegacyEntries: boolean }> => {
  const key = projectSessionsKey(projectKey);
  const storedValue = await storage.get(key);
  const rawEntries = Array.isArray(storedValue) ? storedValue : [];
  if (storedValue && !Array.isArray(storedValue)) {
    logger.warn('Ignoring malformed session index payload', { projectKey });
  }
  let hadLegacyEntries = false;
  const entries: SessionListEntry[] = [];

  for (const entry of rawEntries) {
    if (isSessionListEntry(entry)) {
      if (entry.projectKey === projectKey) {
        entries.push(entry);
      }
      continue;
    }

    hadLegacyEntries = true;
    if (typeof entry === 'string') {
      const session = await readSessionRecord(entry);
      if (session && session.projectKey === projectKey) {
        entries.push(toSessionListEntry(session));
      } else if (!session) {
        logger.warn('Failed to hydrate legacy session entry', { sessionId: entry, projectKey });
      }
    }
  }

  return { entries, hadLegacyEntries };
};

export const updateSessionBacklog = async (
  sessionId: string,
  issueKeys: string[],
  jql?: string | null
): Promise<Session> => {
  const session = await readSessionRecord(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  session.issueKeys = Array.from(new Set(issueKeys));
  if (typeof jql === 'string') {
    session.jql = jql;
  }
  await storage.set(sessionKey(sessionId), session);
  await addSessionToProjectIndex(session);
  return session;
};

const readSessionRecord = async (sessionId: string): Promise<Session | null> => {
  const stored = await storage.get(sessionKey(sessionId));
  if (!stored) {
    return null;
  }
  if (!isSession(stored)) {
    logger.warn('Skipping malformed session record', { sessionId });
    return null;
  }
  return stored;
};
