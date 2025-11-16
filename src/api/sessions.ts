import api, { route, storage } from '@forge/api';
import { randomUUID } from 'crypto';
import type { Participant, Session, DeckType, SessionSnapshot } from '../types/domain';
import { getIssueState } from './votes';

const sessionKey = (sessionId: string) => `session:${sessionId}`;
const participantsKey = (sessionId: string) => `session:${sessionId}:participants`;
const projectSessionsKey = (projectKey: string) => `project:${projectKey}:sessions`;

export interface CreateSessionInput {
  projectKey: string;
  name: string;
  deckType: DeckType;
  deckValues: string[];
  creatorAccountId: string;
  jql?: string;
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
  const participants: Participant[] = [
    {
      accountId: creatorProfile.accountId,
      displayName: creatorProfile.displayName,
      avatarUrl: creatorProfile.avatarUrl,
      joinedAt: createdAt,
      lastSeenAt: createdAt,
      isModerator: true,
    },
  ];
  await storage.set(participantsKey(id), participants);

  return buildSnapshot(session, participants);
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

export const getSession = async (sessionId: string, issueKeyOverride?: string): Promise<SessionSnapshot | null> => {
  const session = (await storage.get(sessionKey(sessionId))) as Session | undefined;
  if (!session) {
    return null;
  }
  const participants = ((await storage.get(participantsKey(sessionId))) as Participant[]) ?? [];
  return buildSnapshot(session, participants, issueKeyOverride);
};

export const joinSession = async (sessionId: string, issueKeyOverride?: string): Promise<SessionSnapshot> => {
  const existing = await getSession(sessionId, issueKeyOverride);
  if (!existing) {
    throw new Error('Session not found');
  }

  const profile = await fetchCurrentUserProfile();
  const now = new Date().toISOString();
  const participants = [...existing.participants];
  const existingParticipant = participants.find((p) => p.accountId === profile.accountId);

  if (existingParticipant) {
    existingParticipant.lastSeenAt = now;
  } else {
    participants.push({
      accountId: profile.accountId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      joinedAt: now,
      lastSeenAt: now,
      isModerator: false,
    });
  }

  await storage.set(participantsKey(sessionId), participants);

  return buildSnapshot(existing.session, participants, issueKeyOverride);
};

export const leaveSession = async (sessionId: string, accountId: string): Promise<void> => {
  const participants = ((await storage.get(participantsKey(sessionId))) as Participant[]) ?? [];
  const next = participants.filter((participant) => participant.accountId !== accountId);
  await storage.set(participantsKey(sessionId), next);
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
  issueKey: string | null
): Promise<SessionSnapshot> => {
  const session = (await storage.get(sessionKey(sessionId))) as Session | undefined;
  if (!session) {
    throw new Error('Session not found');
  }
  session.currentIssueKey = issueKey;
  await storage.set(sessionKey(sessionId), session);
  const participants = ((await storage.get(participantsKey(sessionId))) as Participant[]) ?? [];
  return buildSnapshot(session, participants, issueKey ?? undefined);
};

const buildSnapshot = async (
  session: Session,
  participants: Participant[],
  issueKeyOverride?: string
): Promise<SessionSnapshot> => {
  const issueKey = issueKeyOverride ?? session.currentIssueKey;
  const currentIssueState = issueKey ? await getIssueState(session.id, issueKey) : null;
  return {
    session,
    participants,
    currentIssueState,
  };
};
