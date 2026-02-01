import { storage } from "@forge/api";
import { startsWith } from "@forge/storage";
import { randomUUID } from "crypto";
import type {
  Participant,
  Session,
  DeckType,
  SessionSnapshot,
  SessionStatus,
} from "../types/domain";
import { logger } from "../utils/logger";
import { isParticipant, isSession, isStringArray } from "../utils/type-guards";
import { getIssueState, toIssueVoteSnapshot } from "./votes";
import { fetchCurrentUserProfile, getIssuesForProject } from "./jira";

const sessionKey = (sessionId: string) => `session:${sessionId}`;
const participantPrefixKey = (sessionId: string) =>
  `session:${sessionId}:participant:`;
const participantKey = (sessionId: string, accountId: string) =>
  `${participantPrefixKey(sessionId)}${accountId}`;
const projectSessionsKey = (projectKey: string) =>
  `project:${projectKey.toUpperCase()}:sessions`;
const userActiveSessionKey = (accountId: string) =>
  `user:${accountId}:activeSession`;

export const setUserActiveSession = async (
  accountId: string,
  sessionId: string
): Promise<void> => {
  await storage.set(userActiveSessionKey(accountId), sessionId);
};

export const getUserActiveSession = async (
  accountId: string
): Promise<string | null> => {
  return (await storage.get(userActiveSessionKey(accountId))) || null;
};

export const clearUserActiveSession = async (
  accountId: string
): Promise<void> => {
  await storage.delete(userActiveSessionKey(accountId));
};

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

export const createSession = async (
  input: CreateSessionInput
): Promise<SessionSnapshot> => {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const session: Session = {
    id,
    name: input.name,
    projectKey: input.projectKey,
    creatorAccountId: input.creatorAccountId,
    createdAt,
    updatedAt: createdAt,
    status: "waiting",
    deckType: input.deckType,
    deckValues: input.deckValues,
    issueKeys: [],
    completedIssueKeys: [],
    currentIssueKey: null,
    jql: input.jql,
    autoReveal: false,
    allowChangeVote: true,
    timerEnabled: false,
  };



  if (input.jql) {
      try {
          // Fetch initial issues
          const issues = await getIssuesForProject({
              projectKey: input.projectKey,
              jql: input.jql,
              maxResults: 50
          });
          session.issueKeys = issues.map(i => i.key);
          if (session.issueKeys.length > 0) {
              session.currentIssueKey = session.issueKeys[0];
          }
      } catch (err) {
          console.error("Failed to fetch initial issues for session", err);
          // Continue creating session even if JQL fails, but maybe log it
      }
  }

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
    isObserver: false,
    isReady: false,
    connectionStatus: "online",
  };
  await saveParticipant(id, creatorParticipant);
  await setUserActiveSession(creatorParticipant.accountId, id);

  return buildSnapshot(session, [creatorParticipant], {
    viewerAccountId: creatorParticipant.accountId,
  });
};

export const listSessionsByProject = async (
  projectKey: string
): Promise<SessionListEntry[]> => {
  const { entries, hadLegacyEntries } = await loadProjectSessionEntries(
    projectKey
  );
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

export const joinSession = async (
  sessionId: string,
  issueKeyOverride?: string
): Promise<SessionSnapshot> => {
  const profile = await fetchCurrentUserProfile();
  const viewOptions: SessionViewOptions = {
    issueKeyOverride,
    viewerAccountId: profile.accountId,
  };
  const existing = await getSession(sessionId, viewOptions);
  if (!existing) {
    throw new Error("Session not found");
  }

  const now = new Date().toISOString();
  const participants = [...existing.participants];
  const existingParticipant = participants.find(
    (p) => p.accountId === profile.accountId
  );

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
      isModerator: profile.accountId === existing.session.creatorAccountId,
      isObserver: false,
      isReady: false,
      connectionStatus: "online",
    };
    participants.push(newParticipant);
    await saveParticipant(sessionId, newParticipant);
  }

  await setUserActiveSession(profile.accountId, sessionId);

  const latestParticipants = await listParticipants(sessionId);
  return buildSnapshot(existing.session, latestParticipants, viewOptions);
};

export const leaveSession = async (
  sessionId: string,
  accountId: string
): Promise<void> => {
  await deleteParticipant(sessionId, accountId);
  await clearUserActiveSession(accountId);
};

const addSessionToProjectIndex = async (session: Session): Promise<void> => {
  const { entries } = await loadProjectSessionEntries(session.projectKey);
  const next: SessionListEntry[] = [
    toSessionListEntry(session),
    ...entries.filter((entry) => entry.id !== session.id),
  ];
  await storage.set(projectSessionsKey(session.projectKey), next);
};



export const setCurrentIssueKey = async (
  sessionId: string,
  issueKey: string | null,
  options: SessionViewOptions = {}
): Promise<SessionSnapshot> => {
  const session = await readSessionRecord(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  session.currentIssueKey = issueKey;
  await storage.set(sessionKey(sessionId), session);
  await addSessionToProjectIndex(session);
  const participants = await listParticipants(sessionId);
  return buildSnapshot(session, participants, {
    ...options,
    issueKeyOverride: issueKey ?? undefined,
  });
};

const buildSnapshot = async (
  session: Session,
  participants: Participant[],
  options: SessionViewOptions = {}
): Promise<SessionSnapshot> => {
  const issueKey = resolveIssueKey(session, participants, options);
  const currentIssueState = issueKey
    ? await getIssueState(session.id, issueKey)
    : null;
  return {
    session,
    participants,
    currentIssueState: currentIssueState
      ? toIssueVoteSnapshot(
          currentIssueState,
          options.viewerAccountId,
          options.includePrivateVotes
        )
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
      const viewer = participants.find(
        (participant) => participant.accountId === options.viewerAccountId
      );
      if (viewer?.isModerator) {
        return options.issueKeyOverride;
      }
    }
  }
  return session.currentIssueKey;
};

const saveParticipant = async (
  sessionId: string,
  participant: Participant
): Promise<void> => {
  await storage.set(
    participantKey(sessionId, participant.accountId),
    participant
  );
};

const deleteParticipant = async (
  sessionId: string,
  accountId: string
): Promise<void> => {
  await storage.delete(participantKey(sessionId, accountId));
};

const listParticipants = async (sessionId: string): Promise<Participant[]> => {
  const prefix = participantPrefixKey(sessionId);
  const participants: Participant[] = [];
  let cursor: string | undefined;
  do {
    let query = storage.query().where("key", startsWith(prefix)).limit(50);
    if (cursor) {
      query = query.cursor(cursor);
    }
    const { results, nextCursor } = await query.getMany();
    for (const record of results) {
      if (isParticipant(record.value)) {
        participants.push(record.value);
      } else {
        logger.warn("Skipping malformed participant record", {
          sessionId,
          key: record.key,
        });
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
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Partial<SessionListEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.name === "string" &&
    typeof entry.projectKey === "string" &&
    typeof entry.createdAt === "string" &&
    typeof entry.deckType === "string" &&
    typeof entry.status === "string" &&
    isStringArray(entry.deckValues) &&
    (typeof entry.currentIssueKey === "string" ||
      entry.currentIssueKey === null) &&
    (entry.jql === undefined || typeof entry.jql === "string")
  );
};

const loadProjectSessionEntries = async (
  projectKey: string
): Promise<{ entries: SessionListEntry[]; hadLegacyEntries: boolean }> => {
  const normalizedKey = projectKey.toUpperCase();
  const key = projectSessionsKey(normalizedKey);
  const storedValue = await storage.get(key);
  
  logger.info("Loading sessions", { 
    projectKey, 
    normalizedKey, 
    storageKey: key, 
    found: !!storedValue,
    count: Array.isArray(storedValue) ? storedValue.length : 0 
  });

  const rawEntries = Array.isArray(storedValue) ? storedValue : [];
  if (storedValue && !Array.isArray(storedValue)) {
    logger.warn("Ignoring malformed session index payload", { projectKey });
  }
  let hadLegacyEntries = false;
  const entries: SessionListEntry[] = [];

  for (const entry of rawEntries) {
    if (isSessionListEntry(entry)) {
      // Compare normalized keys to be safe
      if (entry.projectKey.toUpperCase() === normalizedKey) {
        entries.push(entry);
      }
      continue;
    }

    hadLegacyEntries = true;
    if (typeof entry === "string") {
      const session = await readSessionRecord(entry);
      if (session && session.projectKey === projectKey) {
        entries.push(toSessionListEntry(session));
      } else if (!session) {
        logger.warn("Failed to hydrate legacy session entry", {
          sessionId: entry,
          projectKey,
        });
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
    throw new Error("Session not found");
  }
  session.issueKeys = Array.from(new Set(issueKeys));
  if (typeof jql === "string") {
    session.jql = jql;
  }
  await storage.set(sessionKey(sessionId), session);
  await addSessionToProjectIndex(session);
  return session;
};

const readSessionRecord = async (
  sessionId: string
): Promise<Session | null> => {
  const stored = await storage.get(sessionKey(sessionId));
  if (!stored) {
    return null;
  }
  if (!isSession(stored)) {
    logger.warn("Skipping malformed session record", { sessionId });
    return null;
  }
  return stored;
};

export const startSession = async (sessionId: string): Promise<Session> => {
  const session = await readSessionRecord(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  if (session.status !== "waiting") {
    throw new Error("Session is not in waiting state");
  }
  session.status = "active";
  await storage.set(sessionKey(sessionId), session);
  await addSessionToProjectIndex(session);
  return session;
};

export const toggleReady = async (
  sessionId: string,
  accountId: string,
  isReady: boolean
): Promise<Session> => {
  console.log("Time now3", new Date().toISOString());
  const session = await readSessionRecord(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  const currentReady = new Set(session.participantsReady || []);
  if (isReady) {
    currentReady.add(accountId);
  } else {
    currentReady.delete(accountId);
  }
  session.participantsReady = Array.from(currentReady);
  await storage.set(sessionKey(sessionId), session);
  console.log("Time now4", new Date().toISOString());
  
  // Also update participant record
  const participant = await storage.get(participantKey(sessionId, accountId));
  if (participant && isParticipant(participant)) {
    participant.isReady = isReady;
    participant.lastSeenAt = new Date().toISOString();
    await saveParticipant(sessionId, participant);
  }
  
  return session;
};

export const pauseSession = async (sessionId: string): Promise<Session> => {
  const session = await readSessionRecord(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  if (session.status !== "active") {
    throw new Error("Only active sessions can be paused");
  }
  session.status = "paused";
  session.updatedAt = new Date().toISOString();
  await storage.set(sessionKey(sessionId), session);
  await addSessionToProjectIndex(session);
  return session;
};

export const resumeSession = async (sessionId: string): Promise<Session> => {
  const session = await readSessionRecord(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  if (session.status !== "paused") {
    throw new Error("Only paused sessions can be resumed");
  }
  session.status = "active";
  session.updatedAt = new Date().toISOString();
  await storage.set(sessionKey(sessionId), session);
  await addSessionToProjectIndex(session);
  return session;
};

export const completeSession = async (sessionId: string): Promise<Session> => {
  const session = await readSessionRecord(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  if (session.status === "completed" || session.status === "archived") {
    throw new Error("Session is already completed or archived");
  }
  session.status = "completed";
  session.updatedAt = new Date().toISOString();
  await storage.set(sessionKey(sessionId), session);
  await addSessionToProjectIndex(session);
  return session;
};

export interface SessionSettingsInput {
  autoReveal?: boolean;
  allowChangeVote?: boolean;
  timerEnabled?: boolean;
  timerSeconds?: number;
}

export const updateSessionSettings = async (
  sessionId: string,
  settings: SessionSettingsInput
): Promise<Session> => {
  const session = await readSessionRecord(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  
  if (settings.autoReveal !== undefined) {
    session.autoReveal = settings.autoReveal;
  }
  if (settings.allowChangeVote !== undefined) {
    session.allowChangeVote = settings.allowChangeVote;
  }
  if (settings.timerEnabled !== undefined) {
    session.timerEnabled = settings.timerEnabled;
  }
  if (settings.timerSeconds !== undefined) {
    session.timerSeconds = settings.timerSeconds;
  }
  
  session.updatedAt = new Date().toISOString();
  await storage.set(sessionKey(sessionId), session);
  await addSessionToProjectIndex(session);
  return session;
};

export const updateParticipantStatus = async (
  sessionId: string,
  accountId: string,
  status: "online" | "away" | "offline"
): Promise<Participant | null> => {
  const participant = await storage.get(participantKey(sessionId, accountId));
  if (!participant || !isParticipant(participant)) {
    return null;
  }
  
  participant.connectionStatus = status;
  participant.lastSeenAt = new Date().toISOString();
  await saveParticipant(sessionId, participant);
  return participant;
};

export const setParticipantRole = async (
  sessionId: string,
  accountId: string,
  role: { isObserver?: boolean; isModerator?: boolean }
): Promise<Participant | null> => {
  const participant = await storage.get(participantKey(sessionId, accountId));
  if (!participant || !isParticipant(participant)) {
    return null;
  }
  
  if (role.isObserver !== undefined) {
    participant.isObserver = role.isObserver;
  }
  if (role.isModerator !== undefined) {
    participant.isModerator = role.isModerator;
  }
  
  participant.lastSeenAt = new Date().toISOString();
  await saveParticipant(sessionId, participant);
  return participant;
};
