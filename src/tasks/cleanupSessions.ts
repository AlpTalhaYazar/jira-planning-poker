import { storage } from '@forge/api';
import { startsWith } from '@forge/storage';
import type { DeckType, SessionStatus } from '../types/domain';

interface SessionListEntry {
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

const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 30);
const MS_PER_DAY = 86_400_000;
const SESSION_TTL_MS = SESSION_TTL_DAYS * MS_PER_DAY;

const sessionKey = (sessionId: string) => `session:${sessionId}`;
const participantPrefixKey = (sessionId: string) => `session:${sessionId}:participant:`;
const issuePrefixKey = (sessionId: string) => `session:${sessionId}:issue:`;
const projectSessionsKey = (projectKey: string) => `project:${projectKey}:sessions`;

const isSessionExpired = (createdAt: string, cutoff: number) => {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) {
    return true;
  }
  return timestamp < cutoff;
};

const deleteKeysWithPrefix = async (prefix: string) => {
  let cursor: string | undefined;
  do {
    let query = storage.query().where('key', startsWith(prefix)).limit(50);
    if (cursor) {
      query = query.cursor(cursor);
    }
    const { results, nextCursor } = await query.getMany();
    cursor = nextCursor;
    await Promise.all(results.map(async ({ key }) => storage.delete(key)));
  } while (cursor);
};

const cleanupSession = async (sessionId: string) => {
  await storage.delete(sessionKey(sessionId));
  await deleteKeysWithPrefix(participantPrefixKey(sessionId));
  await deleteKeysWithPrefix(issuePrefixKey(sessionId));
};

export const cleanupExpiredSessions = async () => {
  if (SESSION_TTL_MS <= 0) {
    return;
  }
  const cutoff = Date.now() - SESSION_TTL_MS;

  let cursor: string | undefined;
  do {
    let query = storage.query().where('key', startsWith('project:')).limit(50);
    if (cursor) {
      query = query.cursor(cursor);
    }
    const { results, nextCursor } = await query.getMany();
    cursor = nextCursor;

    for (const { key, value } of results) {
      if (!key.endsWith(':sessions')) {
        continue;
      }
      const match = /^project:(.+):sessions$/.exec(key);
      if (!match) {
        continue;
      }
      const projectKey = match[1];
      const entries = (value as SessionListEntry[]) ?? [];
      const expiredEntries = entries.filter((entry) => isSessionExpired(entry.createdAt, cutoff));
      if (!expiredEntries.length) {
        continue;
      }
      const activeEntries = entries.filter((entry) => !isSessionExpired(entry.createdAt, cutoff));
      for (const entry of expiredEntries) {
        await cleanupSession(entry.id);
      }
      await storage.set(projectSessionsKey(projectKey), activeEntries);
    }
  } while (cursor);
};
